import { readJSON, writeJSON } from "./storage";
import { addCustomSchedule, deleteCustomSchedule, getCustomSchedules } from "./customSchedules";
import { addDays, toDateKey, todayKey, minutesBefore } from "../utils/date";

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

// ── 일정 종류·시간·기간·반복·알림 (기존 일정 { id, title, color }은 그대로 "하루, 종일, 반복 없음"으로 읽힌다) ──
// Event += { kind?, time?("HH:MM"), endDate?(기간 끝, 포함), repeat?("weekly"|"monthly"|"yearly"), memo?, alarm?("morning"|"before1h"|"eve"), alarmId?, alarmAt? }
export const EVENT_KINDS = [
  { id: "vet", label: "병원", icon: "🏥", ico: "stethoscope", color: "#e05f5f" },
  { id: "vaccine", label: "접종", icon: "💉", ico: "shield", color: "#9350b8" },
  { id: "grooming", label: "미용", icon: "✂️", ico: "scissors", color: "#3fa578" },
  { id: "med", label: "약", icon: "💊", ico: "pill", color: "#dba329" },
  { id: "stay", label: "호텔·돌봄", icon: "🏨", ico: "building", color: "#3f8fe0" },
  { id: "day", label: "기념일", icon: "🎂", ico: "gift", color: "#e98aa8" },
  { id: "etc", label: "기타", icon: "📝", ico: "note", color: "#7a6f63" },
];
export const kindOf = (e) => EVENT_KINDS.find((k) => k.id === e.kind) || null;
export const REPEATS = [["", "한 번"], ["weekly", "매주"], ["monthly", "매달"], ["yearly", "매년"]];
export const ALARMS = [["", "안 받기"], ["morning", "당일 아침 9시"], ["before1h", "1시간 전"], ["eve", "전날 저녁 8시"]];

const keyAdd = (key, n) => toDateKey(addDays(new Date(`${key}T00:00:00`), n));

// 시작일 기준 반복 날짜(from~to 안). 매달 31일처럼 없는 날은 건너뛴다.
function repeatDates(start, repeat, from, to) {
  const out = [];
  if (!repeat) return start >= from && start <= to ? [start] : [];
  const [y, m, d] = start.split("-").map(Number);
  for (let i = 0; i < 1200; i++) {
    let key;
    if (repeat === "weekly") key = keyAdd(start, i * 7);
    else {
      const dt = repeat === "monthly" ? new Date(y, m - 1 + i, d) : new Date(y + i, m - 1, d);
      if (dt.getDate() !== d) continue; // 그 달엔 그 날짜가 없음
      key = toDateKey(dt);
    }
    if (key > to) break;
    if (key >= from) out.push(key);
  }
  return out;
}

// from~to 사이에 보이는 모든 일정(기간 일정은 매일, 반복 일정은 해당 날마다). [{ date, event, start, isStart, isEnd }]
export function getOccurrences(dogId, from, to) {
  const out = [];
  for (const [start, list] of Object.entries(getEventsByDog(dogId))) {
    for (const event of list) {
      if (event.endDate && event.endDate > start) {
        for (let d = start; d <= event.endDate; d = keyAdd(d, 1)) {
          if (d >= from && d <= to) out.push({ date: d, event, start, isStart: d === start, isEnd: d === event.endDate });
        }
      } else {
        for (const d of repeatDates(start, event.repeat, from, to)) out.push({ date: d, event, start, isStart: true, isEnd: true });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.event.time || "").localeCompare(b.event.time || ""));
}

// 저장(새로 만들기·고치기). 날짜가 바뀌면 옮긴다. 알림은 syncEventAlarms가 맞춘다.
export function saveEvent(dogId, start, input) {
  const all = getAll();
  if (!all[dogId]) all[dogId] = {};
  let prev = null;
  for (const [d, list] of Object.entries(all[dogId])) {
    if (input.id && list.some((e) => e.id === input.id)) {
      prev = list.find((e) => e.id === input.id);
      all[dogId][d] = list.filter((e) => e.id !== input.id);
    }
  }
  const event = { ...prev, ...input, id: input.id || nextId() };
  for (const k of ["kind", "time", "endDate", "repeat", "memo", "alarm"]) if (!event[k]) delete event[k];
  all[dogId][start] = [...(all[dogId][start] || []), event];
  if (!writeJSON(KEY, all)) throw new Error("저장 공간이 부족해서 일정을 저장하지 못했어요.");
  syncEventAlarms(dogId);
  return event;
}

export function removeEvent(dogId, start, id) {
  const ev = getEventsForDate(dogId, start).find((e) => e.id === id);
  if (ev?.alarmId) deleteCustomSchedule(dogId, ev.alarmId);
  deleteEvent(dogId, start, id);
}

// 알림을 켠 일정마다 "다음에 울릴 한 번"짜리 알람을 맞춰 둔다(반복 일정은 앱을 열 때마다 다음 회차로 넘어감).
export function syncEventAlarms(dogId, today = todayKey()) {
  const all = getAll();
  const alarms = getCustomSchedules(dogId);
  let changed = false;
  for (const [start, list] of Object.entries(all[dogId] || {})) {
    for (const e of list) {
      const want = e.alarm ? nextAlarm(start, e, today) : null;
      const alive = e.alarmId && alarms.some((a) => a.id === e.alarmId);
      if (!want && !e.alarmId) continue;
      if (alive && want && e.alarmAt === `${want.date} ${want.time}`) continue;
      if (e.alarmId) deleteCustomSchedule(dogId, e.alarmId);
      delete e.alarmId;
      delete e.alarmAt;
      if (want) {
        e.alarmId = addCustomSchedule(dogId, { title: want.title, time: want.time, date: want.date }).id;
        e.alarmAt = `${want.date} ${want.time}`;
      }
      changed = true;
    }
  }
  if (changed) writeJSON(KEY, all);
  return changed;
}

function nextAlarm(start, e, today) {
  const icon = kindOf(e)?.icon || "🗓️";
  const time = e.alarm === "morning" ? "09:00" : e.alarm === "eve" ? "20:00" : e.time ? minutesBefore(e.time, 60) : "09:00";
  for (const d of repeatDates(start, e.repeat, keyAdd(today, -1), keyAdd(today, 800))) {
    const date = e.alarm === "eve" || (e.alarm === "before1h" && e.time && e.time < "01:00") ? keyAdd(d, -1) : d;
    if (date >= today) return { date, time, title: `${icon} ${e.alarm === "eve" ? "내일 " : ""}${e.title}${e.time ? ` ${e.time}` : ""}` };
  }
  return null;
}
