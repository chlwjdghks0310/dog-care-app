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

export function setScheduleForDate(dogId, dateKey, items) {
  const all = getAll();
  if (!all[dogId]) all[dogId] = {};
  all[dogId][dateKey] = items;
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
