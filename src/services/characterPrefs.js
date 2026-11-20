import { readJSON, writeJSON } from "./storage";

// 부가 동작 "언제 나오나" 조정(11/20 사용자: 설명이 보이고 사용자가 맞출 수 있게). 폰에만, 강아지별.
//   happy  기쁨      기록을 저장한 직후 sec초
//   meal   밥 기다림  사료 계산기 밥 시간 앞뒤 win분
//   sleepy 졸림      from~to 시각(자정 넘김 허용) 가만히 있을 때
export const EXTRA_KINDS = ["happy", "meal", "sleepy"];
export const EXTRA_META = {
  happy: { label: "기쁨", ico: "party", how: (p) => `기록을 저장하면 ${p.sec}초 동안 몸을 흔들어요` },
  meal: { label: "밥 기다림", ico: "bowl", how: (p) => `사료 계산기 밥 시간 ${p.win}분 전후에 그릇 쪽을 봐요` },
  sleepy: { label: "졸림", ico: "moon", how: (p) => `${p.from}~${p.to}에 가만히 있으면 꾸벅 졸아요` },
};
export const DEFAULT_PREFS = { happy: { on: true, sec: 6 }, meal: { on: true, win: 30 }, sleepy: { on: true, from: "22:00", to: "06:00" } };
const KEY = (dogId) => `dogcare-character-prefs-${dogId}`;

export function getExtraPrefs(dogId) {
  const saved = readJSON(KEY(dogId), null) || {};
  return Object.fromEntries(EXTRA_KINDS.map((k) => [k, { ...DEFAULT_PREFS[k], ...(saved[k] || {}) }]));
}
export function setExtraPref(dogId, kind, patch) {
  const cur = getExtraPrefs(dogId);
  const next = { ...cur, [kind]: { ...cur[kind], ...patch } };
  writeJSON(KEY(dogId), next);
  try { window.dispatchEvent(new CustomEvent("dogcare-character-prefs")); } catch { /* 시험 환경 */ }
  return next;
}

const mins = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
// 지금이 졸림 시간대인가(자정을 넘는 범위도 됨: 22:00~06:00)
export function inSleepyWindow(p, now = new Date()) {
  if (!p.on) return false;
  const t = now.getHours() * 60 + now.getMinutes(), a = mins(p.from), b = mins(p.to);
  return a <= b ? t >= a && t < b : t >= a || t < b;
}
// 밥 시간 앞뒤 win분 안인가
export function inMealWindow(p, times, now = new Date()) {
  if (!p.on) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return (times || []).some((h) => Math.abs(mins(h) - t) <= p.win);
}
