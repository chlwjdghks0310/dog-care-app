import { readJSON, writeJSON } from "./storage";

const SCHEDULES_KEY = "dogcare-schedules-v1";

// 구조: { [dogId]: { [dateKey]: ScheduleItem[] } }
function getAll() {
  return readJSON(SCHEDULES_KEY, {});
}

function saveAll(all) {
  writeJSON(SCHEDULES_KEY, all);
}

export function getScheduleForDate(dogId, dateKey) {
  const all = getAll();
  return all[dogId]?.[dateKey] || null;
}

// ponytail: 90일 지난 날짜의 체크리스트는 지운다(매일 쌓여 폰 저장 공간·가족 동기화가 커지지 않게) — 더 긴 기록이 필요하면 기간을 늘릴 것
const KEEP_DAYS = 90;
export function setScheduleForDate(dogId, dateKey, items) {
  const all = getAll();
  if (!all[dogId]) all[dogId] = {};
  all[dogId][dateKey] = items;
  const cut = new Date(`${dateKey}T00:00:00`);
  cut.setDate(cut.getDate() - KEEP_DAYS);
  const cutKey = `${cut.getFullYear()}-${String(cut.getMonth() + 1).padStart(2, "0")}-${String(cut.getDate()).padStart(2, "0")}`;
  for (const k of Object.keys(all[dogId])) if (k < cutKey) delete all[dogId][k];
  saveAll(all);
}

export function toggleScheduleItem(dogId, dateKey, itemId) {
  const all = getAll();
  const items = all[dogId]?.[dateKey];
  if (!items) return null;
  const next = items.map((it) => (it.id === itemId ? { ...it, completed: !it.completed } : it));
  all[dogId][dateKey] = next;
  saveAll(all);
  // 체크하면 푸시 알람 목록을 바로 다시 보낸다(체크한 일은 오늘 알림이 안 오게). 순환 import를 피해 동적으로.
  import("./notifications").then((m) => m.syncPushAlarms()).catch(() => {});
  return next;
}
