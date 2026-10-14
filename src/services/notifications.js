// 시간대 맞춤 알림(앱이 켜져 있는 동안)에 더해, 아래쪽엔 브라우저가 꺼져 있어도 뜨는
// 웹 푸시(VAPID) 구독/테스트 함수도 들어있다. 1단계: 실제 기기에서 뜨는지부터 확인하는
// 용도라, 서버는 구독을 메모리에만 들고 있고 "지금 당장 테스트 알림 보내기"만 지원한다.
// 일정 시간에 맞춰 서버가 알아서 쏴주는 건 2단계(서버 스케줄러 + DB)에서 붙인다.
import { minutesBefore, nowLabel as getNowLabel } from "../utils/date";
import { playAlarmSound } from "./alarmSounds";
import { API_BASE } from "./aiClient";

const NOTIFIED_KEY_PREFIX = "dogcare-notified-";

export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission() {
  return isNotificationSupported() ? Notification.permission : "unsupported";
}

export async function requestPermission() {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.requestPermission();
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

function readNotifiedSet(dateKey) {
  try {
    return JSON.parse(localStorage.getItem(`${NOTIFIED_KEY_PREFIX}${dateKey}`) || "[]");
  } catch {
    return [];
  }
}

function markNotified(dateKey, itemId, time) {
  const set = readNotifiedSet(dateKey);
  set.push(`${itemId}-${time}`);
  localStorage.setItem(`${NOTIFIED_KEY_PREFIX}${dateKey}`, JSON.stringify(set));
}

async function fireNotification(title, body) {
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
  if (registration) {
    registration.showNotification(title, { body, icon: "/favicon.svg" });
  } else {
    new Notification(title, { body });
  }
}

// checklist: careEngine.getTodayChecklist() 결과. 각 항목의 suggestedTimes와 현재 시각(분 단위)이
// 일치하고, 아직 완료·알림 발송 전이면 알림을 띄운다.
export function checkAndNotify(dog, checklist, dateKey) {
  if (getPermission() !== "granted") return;
  const nowLabel = getNowLabel();
  const notified = readNotifiedSet(dateKey);

  for (const item of checklist) {
    if (item.completed) continue;
    for (const time of item.suggestedTimes || []) {
      if (time === nowLabel && !notified.includes(`${item.id}-${time}`)) {
        markNotified(dateKey, item.id, time);
        fireNotification(`🐾 ${dog.name}`, `나 이제 ${item.title} 시간이야! 알고 있지?`);
      }
    }
  }
}

// 사용자가 등록한 커스텀 일정(알람)의 시각이 되면 알림 + 소리를 함께 울린다.
// 알림 권한이 없어도(브라우저 알림을 안 켠 경우) 소리는 낼 수 있으므로 소리는 항상 재생한다.
export function checkCustomAlarms(schedules, dateKey) {
  const nowLabel = getNowLabel();
  const notified = readNotifiedSet(dateKey);

  for (const alarm of schedules || []) {
    if (!alarm.enabled) continue;
    const id = `alarm-${alarm.id}`;
    if (alarm.time === nowLabel && !notified.includes(`${id}-${alarm.time}`)) {
      markNotified(dateKey, id, alarm.time);
      playAlarmSound(alarm.sound);
      if (getPermission() === "granted") {
        fireNotification(`⏰ ${alarm.title}`, `나 지금 "${alarm.title}" 시간이라고 알려주는 거야, 잊지 마!`);
      }
    }
  }
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getPushSubscription() {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// 브라우저가 꺼져 있어도 울리는 알림을 받으려면: 알림 권한 허용 + 이 구독 과정을 거쳐야 한다.
// 구독 정보를 서버에 보내두면, 서버가 그 기기로 직접 푸시를 보낼 수 있게 된다.
export async function subscribeToPush() {
  if (!isPushSupported()) throw new Error("이 브라우저는 푸시 알림을 지원하지 않아요.");

  const permission = await requestPermission();
  if (permission !== "granted") throw new Error("알림 권한을 허용해야 켤 수 있어요.");

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("서버에 VAPID 공개키가 설정되지 않았어요.");

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const res = await fetch(`${API_BASE}/api/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription }),
  });
  if (!res.ok) throw new Error("서버에 구독 정보를 등록하지 못했어요.");
  return subscription;
}

// 1단계 동작 확인용 — 지금까지 구독된 모든 기기로 서버가 바로 테스트 알림을 보낸다.
export async function sendTestPush() {
  const res = await fetch(`${API_BASE}/api/push/test`, { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "테스트 알림 전송에 실패했어요.");
  return data;
}

// 사용자가 정한 급여 시각 30분 전에 "사료 불리기" 알림을 보낸다.
export function checkFeedingSoakReminders(dog, feedingTimes, soakNeeded, dateKey) {
  if (getPermission() !== "granted") return;
  const nowLabel = getNowLabel();
  const notified = readNotifiedSet(dateKey);

  for (const time of feedingTimes || []) {
    const soakAt = minutesBefore(time, 30);
    const id = `feed-soak-${time}`;
    if (soakAt === nowLabel && !notified.includes(`${id}-${soakAt}`)) {
      markNotified(dateKey, id, soakAt);
      const body = soakNeeded
        ? "나 밥 줄 시간이야 알고있지? (밥은 꼭 불려줘야 돼 ㅠ 미지근한 물, 분유 온도 정도로!)"
        : "나 밥 줄 시간이야 알고있지? 슬슬 준비해줘!";
      fireNotification(`🐾 ${dog.name}`, body);
    }
  }
}
