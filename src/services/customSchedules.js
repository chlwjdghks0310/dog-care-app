import { readJSON, writeJSON } from "./storage";

const KEY = "dogcare-custom-schedules-v1";

function nextId() {
  return `alarm-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// 구조: { [dogId]: Alarm[] }, Alarm = { id, title, time: "HH:MM", sound, enabled, date? }
// date("YYYY-MM-DD")가 있으면 그날 하루만 울리는 알람, 없으면 매일
function getAll() {
  return readJSON(KEY, {});
}

export function getCustomSchedules(dogId) {
  return getAll()[dogId] || [];
}

export function addCustomSchedule(dogId, { title, time, sound, date }) {
  const all = getAll();
  const list = all[dogId] || [];
  const alarm = { id: nextId(), title, time, sound, enabled: true, ...(date ? { date } : {}) };
  all[dogId] = [...list, alarm];
  writeJSON(KEY, all);
  return alarm;
}

export function updateCustomSchedule(dogId, id, patch) {
  const all = getAll();
  const list = all[dogId] || [];
  all[dogId] = list.map((a) => (a.id === id ? { ...a, ...patch } : a));
  writeJSON(KEY, all);
}

export function deleteCustomSchedule(dogId, id) {
  const all = getAll();
  const list = all[dogId] || [];
  all[dogId] = list.filter((a) => a.id !== id);
  writeJSON(KEY, all);
}
