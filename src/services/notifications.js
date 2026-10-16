// 시간대 맞춤 알림(앱이 켜져 있는 동안)에 더해, 아래쪽엔 브라우저가 꺼져 있어도 뜨는
// 웹 푸시(VAPID) 구독/테스트 함수도 들어있다. 1단계: 실제 기기에서 뜨는지부터 확인하는
// 용도라, 서버는 구독을 메모리에만 들고 있고 "지금 당장 테스트 알림 보내기"만 지원한다.
// 일정 시간에 맞춰 서버가 알아서 쏴주는 건 2단계(서버 스케줄러 + DB)에서 붙인다.
import { minutesBefore, nowLabel as getNowLabel, todayKey } from "../utils/date";
import { playAlarmSound } from "./alarmSounds";
import { API_BASE } from "./aiClient";
import { getDogs } from "./dogRepository";
import { getTodayChecklist } from "./careEngine";
import { getFeedingSettings } from "./feedingSettings";
import { getCustomSchedules } from "./customSchedules";
import { getSoakGuidance } from "../data/feedingGuide";
import { calculateAge } from "../utils/age";

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
  // 서버 푸시가 켜져 있으면 같은 알림을 서버가 보내므로 여기선 띄우지 않는다(중복 방지).
  if (await registration?.pushManager?.getSubscription()) return;
  if (registration) {
    registration.showNotification(title, { body, icon: "/favicon.svg" });
  } else {
    new Notification(title, { body });
  }
}

export const checklistMessage = (dog, item) => ({ title: `🐾 ${dog.name}`, body: `나 이제 ${item.title} 시간이야! 알고 있지?` });
export const customAlarmMessage = (alarm) => ({ title: `⏰ ${alarm.title}`, body: `나 지금 "${alarm.title}" 시간이라고 알려주는 거야, 잊지 마!` });
export const soakMessage = (dog, soakNeeded) => ({
  title: `🐾 ${dog.name}`,
  body: soakNeeded
    ? "나 밥 줄 시간이야 알고있지? (밥은 꼭 불려줘야 돼 ㅠ 미지근한 물, 분유 온도 정도로!)"
    : "나 밥 줄 시간이야 알고있지? 슬슬 준비해줘!",
});

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
        const { title, body } = checklistMessage(dog, item);
        fireNotification(title, body);
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
        const { title, body } = customAlarmMessage(alarm);
        fireNotification(title, body);
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
// 서버에 이 기기의 구독 + 매일 울릴 알람 목록을 보낸다. 서버가 그 시각에 푸시를 쏜다.
// text/plain으로 보내 CORS 사전요청(preflight)을 피한다 — sendBeacon은 text/plain만 교차 출처로 보낼 수 있다.
async function postSubscription(subscription, alarms, { beacon = false } = {}) {
  const body = JSON.stringify({ subscription, alarms, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  const url = `${API_BASE}/api/push/subscribe`;
  // 앱을 닫는 순간엔 일반 fetch가 끊길 수 있어 sendBeacon을 쓴다(사파리는 fetch keepalive가 "Load failed"로 실패).
  if (beacon && navigator.sendBeacon?.(url, new Blob([body], { type: "text/plain" }))) return;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain" }, body });
  if (!res.ok) throw new Error("서버에 구독 정보를 등록하지 못했어요.");
}

// 모든 강아지의 매일 알람(케어 권장 시각 + 사료 불리기 30분 전 + 사용자 알람)을 서버용 목록으로 만든다.
// ponytail: 완료 체크 여부는 무시하고 매일 보낸다 — 서버는 체크 상태를 모른다.
export function buildPushAlarms() {
  const alarms = [];
  for (const dog of getDogs()) {
    for (const item of getTodayChecklist(dog)) {
      // 오늘 이미 체크한 일은 오늘만 건너뛴다(서버는 매일 같은 알람을 보내므로 내일은 다시 울려야 함)
      const skipDate = item.completed ? todayKey() : undefined;
      for (const time of item.suggestedTimes || []) alarms.push({ time, ...checklistMessage(dog, item), skipDate });
    }
    const soakNeeded = getSoakGuidance(calculateAge(dog.birthDate).ageInWeeks).needed === true;
    for (const time of getFeedingSettings(dog.id).times) alarms.push({ time: minutesBefore(time, 30), ...soakMessage(dog, soakNeeded) });
    for (const alarm of getCustomSchedules(dog.id)) {
      if (alarm.enabled) alarms.push({ time: alarm.time, ...customAlarmMessage(alarm) });
    }
  }
  return alarms;
}

// 푸시가 켜진 기기라면 최신 알람 목록을 서버에 다시 보낸다(앱 열 때/닫을 때 호출).
export async function syncPushAlarms({ beacon = false } = {}) {
  const subscription = await getPushSubscription().catch(() => null);
  if (subscription) await postSubscription(subscription, buildPushAlarms(), { beacon }).catch(() => {});
}

// 어느 단계에서 실패했는지 오류 문구에 붙인다.
async function step(label, fn) {
  try {
    return await fn();
  } catch (err) {
    throw new Error(`${label} 실패: ${err.message}`);
  }
}

export async function subscribeToPush() {
  if (!isPushSupported()) throw new Error("이 브라우저는 푸시 알림을 지원하지 않아요.");

  const permission = await requestPermission();
  if (permission !== "granted") throw new Error("알림 권한을 허용해야 켤 수 있어요.");

  // 공개키는 서버에서 받아온다 — 프론트 빌드 환경변수에 따로 넣으면 서버 키와 어긋나기 쉽다.
  const { publicKey } = await step("공개키 받기", () => fetch(`${API_BASE}/api/push/public-key`).then((r) => r.json()));
  if (!publicKey) throw new Error("서버에 VAPID 공개키가 설정되지 않았어요.");

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await step("기기 등록", () =>
      registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
    );
  }

  await step("서버에 알람 등록", () => postSubscription(subscription, buildPushAlarms()));
  return subscription;
}

// 이 기기로 서버가 바로 테스트 알림을 보낸다.
export async function sendTestPush() {
  const subscription = await getPushSubscription();
  if (!subscription) throw new Error("이 기기는 아직 푸시 알림이 꺼져 있어요. 먼저 '푸시 알림 켜기'를 눌러주세요.");
  const res = await fetch(`${API_BASE}/api/push/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription }),
  });
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
      const { title, body } = soakMessage(dog, soakNeeded);
      fireNotification(title, body);
    }
  }
}
