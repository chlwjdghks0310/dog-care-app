// 시간대 맞춤 알림. 브라우저/앱이 열려 있는 동안(포그라운드 또는 백그라운드 탭)에는 동작하지만,
// 앱을 완전히 종료한 상태에서도 알림을 받으려면 실제 푸시 인프라(서버 스케줄러 + VAPID 구독)가
// 별도로 필요하다 — 이 버전은 그 전 단계인 "앱이 켜져 있는 동안의 로컬 알림"까지만 지원한다.
import { minutesBefore, nowLabel as getNowLabel } from "../utils/date";
import { playAlarmSound } from "./alarmSounds";

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
