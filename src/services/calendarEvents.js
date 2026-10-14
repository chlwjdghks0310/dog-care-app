import { readJSON, writeJSON } from "./storage";

const KEY = "dogcare-calendar-events-v1";

// 사용자가 일정을 용도별로 색으로 구분해 쓸 수 있도록 미리 준비한 5가지 색.
export const EVENT_COLORS = ["#e05f5f", "#3f8fe0", "#3fa578", "#dba329", "#9350b8"];

function nextId() {
  return `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// 구조: { [dogId]: { [dateKey]: { id, title, color }[] } } — 사용자가 직접 기록하는 날짜별 메모/일정.
function getAll() {
  return readJSON(KEY, {});
}

export function getEventsByDog(dogId) {
  return getAll()[dogId] || {};
}

export function getEventsForDate(dogId, dateKey) {
  return getEventsByDog(dogId)[dateKey] || [];
}

export function addEvent(dogId, dateKey, title, color = EVENT_COLORS[0]) {
  const all = getAll();
  if (!all[dogId]) all[dogId] = {};
  const event = { id: nextId(), title, color };
  all[dogId][dateKey] = [...(all[dogId][dateKey] || []), event];
  writeJSON(KEY, all);
  return event;
}

export function updateEventColor(dogId, dateKey, id, color) {
  const all = getAll();
  const list = all[dogId]?.[dateKey];
  if (!list) return;
  all[dogId][dateKey] = list.map((e) => (e.id === id ? { ...e, color } : e));
  writeJSON(KEY, all);
}

export function deleteEvent(dogId, dateKey, id) {
  const all = getAll();
  const list = all[dogId]?.[dateKey];
  if (!list) return;
  all[dogId][dateKey] = list.filter((e) => e.id !== id);
  writeJSON(KEY, all);
}
