import { readJSON, writeJSON } from "./storage";
import { todayKey, toDateKey, addDays } from "../utils/date";

// 외출·귀가와 저녁 체크인 — 밖에 오래 있는 보호자(출근 등)용. 사람 기준이라 강아지마다 나누지 않는다(체크인 완료만 강아지별).
// routine: 평소 나가고 들어오는 시각·요일(버튼을 안 눌러도 이 시각으로 '혼자 있는 시간'을 어림) / outing: 오늘 실제로 누른 시각
const ROUTINE_KEY = "dogcare-routine-v1"; // { leave: "08:30", back: "19:00", days: [1..5](0=일), remind: true }
const OUTING_KEY = "dogcare-outing-v1"; // (예전) 오늘 하루만 { date, leftAt, backAt } — 읽기만
const OUTINGS_KEY = "dogcare-outings-v1"; // { "YYYY-MM-DD": { leftAt: "HH:MM", backAt: "HH:MM" | null } } 최근 60일 — 주간 리포트의 '혼자 있던 시간'
const ASKED_KEY = "dogcare-routine-asked-v1"; // 처음 [다녀올게]를 누를 때 평소 시간을 한 번만 물었는지
const CHECKIN_KEY = "dogcare-checkin-v1"; // { [dogId]: "YYYY-MM-DD"(마지막 체크인 날) }

export const DEFAULT_ROUTINE = { leave: "08:30", back: "19:00", days: [1, 2, 3, 4, 5], remind: true };
export const getRoutine = () => readJSON(ROUTINE_KEY, null);
export const saveRoutine = (r) => writeJSON(ROUTINE_KEY, r);

const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

function getOutings() {
  const map = readJSON(OUTINGS_KEY, {});
  const old = readJSON(OUTING_KEY, null);
  if (old?.date && !map[old.date]) map[old.date] = { leftAt: old.leftAt, backAt: old.backAt };
  return map;
}
function saveOuting(date, o, now) {
  const keep = toDateKey(addDays(now, -60));
  const map = Object.fromEntries(Object.entries({ ...getOutings(), [date]: o }).filter(([d]) => d >= keep));
  writeJSON(OUTINGS_KEY, map);
}
export function getOuting(today = todayKey()) {
  const o = getOutings()[today];
  return o ? { date: today, ...o } : null;
}
export const leaveNow = (now = new Date()) => saveOuting(toDateKey(now), { leftAt: hhmm(now), backAt: null }, now);
export function backNow(now = new Date()) {
  const o = getOuting(toDateKey(now));
  if (o) saveOuting(o.date, { leftAt: o.leftAt, backAt: hhmm(now) }, now);
}
export const routineAsked = () => readJSON(ASKED_KEY, false);
export const markRoutineAsked = () => writeJSON(ASKED_KEY, true);

// from~to(지난 날만) 혼자 있던 시간: [다녀올게]를 누른 날만 센다. [왔어]를 안 눌렀으면 평소 들어오는 시각으로 어림(없으면 뺌)
export function aloneSummary(from, to, routine = getRoutine()) {
  const list = Object.entries(getOutings())
    .filter(([d]) => d >= from && d <= to)
    .map(([, o]) => {
      const back = o.backAt || routine?.back;
      return back && mins(back) > mins(o.leftAt) ? mins(back) - mins(o.leftAt) : null;
    })
    .filter((m) => m != null);
  return list.length ? { days: list.length, avg: Math.round(list.reduce((a, b) => a + b, 0) / list.length) } : null;
}
export const checkedInToday = (dogId, today = todayKey()) => readJSON(CHECKIN_KEY, {})[dogId] === today;
export const markCheckedIn = (dogId, today = todayKey()) => writeJSON(CHECKIN_KEY, { ...readJSON(CHECKIN_KEY, {}), [dogId]: today });

// 오늘 상태: home(아직 안 나감) / away(나가 있음, minutes=지금까지) / back(들어옴, minutes=오늘 혼자 있던 시간)
// estimated=true: 버튼을 안 눌러 평소 시각(routine)으로 어림한 것
export function outingState(now = new Date(), outing = getOuting(toDateKey(now)), routine = getRoutine()) {
  const t = mins(hhmm(now));
  if (outing) {
    const from = mins(outing.leftAt);
    if (!outing.backAt) return { state: "away", minutes: Math.max(0, t - from), since: outing.leftAt };
    return { state: "back", minutes: Math.max(0, mins(outing.backAt) - from) };
  }
  if (routine?.days?.includes(now.getDay())) {
    const from = mins(routine.leave);
    const to = mins(routine.back);
    if (to > from && t >= from && t < to) return { state: "away", minutes: t - from, since: routine.leave, estimated: true };
    if (to > from && t >= to) return { state: "back", minutes: to - from, estimated: true };
  }
  return { state: "home", minutes: 0 };
}

export const durationLabel = (m) => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ""}` : `${m}분`);

// 들어왔을 때 한 줄 — 혼자 있던 시간에 맞춘 일반적인 돌봄 제안(판단·진단 아님)
export function backTip(minutes) {
  if (minutes >= 8 * 60) return "오래 혼자 있었어요. 15분쯤 놀아 주거나 냄새 맡는 산책을 해 주면 좋아요.";
  if (minutes >= 4 * 60) return "반가워할 거예요. 짧게라도 놀아 주고 물그릇을 확인해 주세요.";
  return "물그릇과 패드만 한 번 확인해 주세요.";
}

// 저녁 체크인 알림 시각: 평소 들어오는 시각 30분 뒤
export function checkinAlarmTime(routine) {
  const m = (mins(routine.back) + 30) % (24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

