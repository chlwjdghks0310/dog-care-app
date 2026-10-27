import { readJSON, writeJSON } from "./storage";
import { todayKey } from "../utils/date";

// 외출·귀가와 저녁 체크인 — 밖에 오래 있는 보호자(출근 등)용. 사람 기준이라 강아지마다 나누지 않는다(체크인 완료만 강아지별).
// routine: 평소 나가고 들어오는 시각·요일(버튼을 안 눌러도 이 시각으로 '혼자 있는 시간'을 어림) / outing: 오늘 실제로 누른 시각
const ROUTINE_KEY = "dogcare-routine-v1"; // { leave: "08:30", back: "19:00", days: [1..5](0=일), remind: true }
const OUTING_KEY = "dogcare-outing-v1"; // { date, leftAt: "HH:MM", backAt: "HH:MM" | null }
const CHECKIN_KEY = "dogcare-checkin-v1"; // { [dogId]: { date, ids, picks } }

export const DEFAULT_ROUTINE = { leave: "08:30", back: "19:00", days: [1, 2, 3, 4, 5], remind: true };
export const getRoutine = () => readJSON(ROUTINE_KEY, null);
export const saveRoutine = (r) => writeJSON(ROUTINE_KEY, r);

const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export function getOuting(today = todayKey()) {
  const o = readJSON(OUTING_KEY, null);
  return o?.date === today ? o : null;
}
export const leaveNow = (now = new Date()) => writeJSON(OUTING_KEY, { date: todayKey(now), leftAt: hhmm(now), backAt: null });
export function backNow(now = new Date()) {
  const o = getOuting(todayKey(now));
  if (o) writeJSON(OUTING_KEY, { ...o, backAt: hhmm(now) });
}
// 값: { date, ids: 오늘 체크인으로 만든 기록 id, picks: 고른 것 } — 다시 하면 고른 걸 채워 보여 주고 그 기록을 바꾼다(예전 값 "YYYY-MM-DD"도 읽음)
const checkinOf = (dogId) => {
  const v = readJSON(CHECKIN_KEY, {})[dogId];
  return typeof v === "string" ? { date: v, ids: [], picks: null } : v || null;
};
export const getTodayCheckin = (dogId, today = todayKey()) => (checkinOf(dogId)?.date === today ? checkinOf(dogId) : null);
export const checkedInToday = (dogId, today = todayKey()) => Boolean(getTodayCheckin(dogId, today));
export const markCheckedIn = (dogId, { ids = [], picks = null } = {}, today = todayKey()) =>
  writeJSON(CHECKIN_KEY, { ...readJSON(CHECKIN_KEY, {}), [dogId]: { date: today, ids, picks } });

// 오늘 상태: home(아직 안 나감) / away(나가 있음, minutes=지금까지) / back(들어옴, minutes=오늘 혼자 있던 시간)
// estimated=true: 버튼을 안 눌러 평소 시각(routine)으로 어림한 것
export function outingState(now = new Date(), outing = getOuting(todayKey(now)), routine = getRoutine()) {
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

