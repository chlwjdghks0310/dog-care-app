// 10초 하루 체크: "평소와 같아요" 한 번이면 끝, 다른 날만 고른다(방향 A, 2026-11-07).
// 근거: ../자료용/자료/2026-11-07-10초-하루체크-설계근거.md — 선택지·병원 상담 기준(VCA·PDSA·Merck·Purina), 스트릭 대신 누적 날짜(Silverman·Barasch 2023),
// 놓친 날은 [기억 안 나요]로 가짜 '평소' 기록을 막는다.
// 하루 상태는 이 파일의 저장소에, "다른 것"은 기존 기록(식사·배변·증상·컨디션)으로도 저장해 병원용 기록·기록 탭·주간 리포트에 그대로 이어진다.
import { readJSON, writeJSON } from "./storage";
import { saveRecord, newRecordId, localNow } from "./records";
import { addDays, toDateKey, todayKey } from "../utils/date";

const KEY = "dogcare-daily-check-v1"; // { [dogId]: { [date]: { status: "usual"|"diff"|"unknown", picks?: { [itemId]: option } } } }

// red: 바로 병원에 연락할 신호, warn: 걱정되면 병원에 물어볼 신호. rec: 기존 기록으로 남길 모양
export const ITEMS = [
  { id: "meal", label: "밥", ico: "bowl", options: [
    { label: "조금 남김", rec: ["meal", { appetite: "평소보다 적음" }] },
    { label: "반 이상 남김", rec: ["meal", { appetite: "평소보다 적음" }] },
    { label: "안 먹음", warn: "하루 넘게 안 먹으면 병원에 물어보세요. 아주 작은 퍼피는 한 끼만 걸러도 연락해 보세요.", rec: ["meal", { appetite: "평소보다 적음" }] },
    { label: "많이 먹음", rec: ["meal", { appetite: "평소보다 많음" }] },
  ] },
  { id: "stool", label: "변", ico: "toilet", options: [
    { label: "무름", rec: ["potty", { stool: "무름" }] },
    { label: "설사", warn: "설사가 하루 넘게 가거나 구토와 함께라면 병원에 물어보세요. 접종 전 퍼피는 더 빨리 연락해 보세요.", rec: ["potty", { stool: "설사" }] },
    { label: "딱딱함·안 나옴", rec: ["potty", { stool: "딱딱함" }] },
    { label: "피·검은 변", red: true, rec: ["potty", { stool: "피 섞임" }] },
    { label: "이상한 게 섞임", warn: "삼킨 것이 보이면 병원에 물어보세요.", rec: ["potty", {}] },
  ] },
  { id: "urine", label: "소변", ico: "droplet", options: [
    { label: "자주 조금씩", rec: ["potty", { urine: "잦음" }] },
    { label: "힘줘도 안 나옴", red: true, rec: ["potty", { urine: "적음" }] },
    { label: "피·진한 색", warn: "소변 색이 이상하면 병원에 물어보세요.", rec: ["potty", { urine: "색 이상" }] },
    { label: "실수 늘어남", rec: ["potty", { urine: "실수" }] },
  ] },
  { id: "energy", label: "기운", ico: "smiley", options: [
    { label: "덜 놂", rec: ["condition", { check: { energy: "조금 다름" } }] },
    { label: "많이 잠", rec: ["condition", { check: { energy: "조금 다름" } }] },
    { label: "반응이 느림", warn: "하루 넘게 기운이 없으면 병원에 물어보세요.", rec: ["condition", { check: { energy: "많이 다름" } }] },
    { label: "떨림·비틀거림", red: true, rec: ["symptom", { kinds: ["떨림"] }] },
  ] },
  { id: "water", label: "물", ico: "droplet", options: [
    { label: "많이 마심", warn: "며칠째 물을 많이 마시면 병원에 물어보세요.", rec: ["meal", { water: "평소보다 많음" }] },
    { label: "적게 마심", rec: ["meal", { water: "평소보다 적음" }] },
    { label: "물도 못 마심", red: true, rec: ["meal", { water: "평소보다 적음" }] },
  ] },
  { id: "walk", label: "산책", ico: "walk", options: [
    { label: "못 감" }, // 이상 신호가 아니라 기록만
    { label: "짧게만" },
    { label: "절뚝거림", warn: "절뚝거림이 이어지면 병원에 물어보세요.", rec: ["symptom", { kinds: ["절뚝거림"] }] },
  ] },
  { id: "etc", label: "그 밖에", ico: "alert", options: [
    { label: "토함", warn: "하루에 여러 번 토하거나 기운이 없으면 병원에 물어보세요.", rec: ["symptom", { kinds: ["구토"] }] },
    { label: "기침·재채기", rec: ["symptom", { kinds: ["기침"] }] },
    { label: "긁음·핥음", rec: ["symptom", { kinds: ["가려움·긁음"] }] },
  ] },
];
const option = (itemId, label) => ITEMS.find((i) => i.id === itemId)?.options.find((o) => o.label === label);

const all = () => readJSON(KEY, {});
export const getDay = (dogId, date) => all()[dogId]?.[date] || null;
function setDay(dogId, date, value) {
  const data = all();
  data[dogId] = { ...data[dogId], [date]: value };
  writeJSON(KEY, data);
}

// 기록 시각: 오늘은 지금, 지난날은 그날 저녁 8시
const atFor = (date) => (date === todayKey() ? localNow() : `${date}T20:00`);

export function saveUsual(dogId, date = todayKey()) {
  setDay(dogId, date, { status: "usual" });
}
export function saveUnknown(dogId, date) {
  setDay(dogId, date, { status: "unknown" });
}

// picks: { meal: "반 이상 남김", stool: "무름" } → 하루 상태 + 기존 기록. 같은 날 다시 저장하면 앞서 만든 기록은 덮어쓴다(같은 id).
export function saveDiff(dogId, date, picks) {
  const entries = Object.entries(picks).filter(([id, label]) => option(id, label));
  if (!entries.length) throw new Error("다른 점을 하나 이상 골라 주세요.");
  const prev = getDay(dogId, date);
  const ids = { ...(prev?.recIds || {}) };
  const at = atFor(date);
  for (const [id, label] of entries) {
    const o = option(id, label);
    if (!o.rec) continue;
    const [type, data] = o.rec;
    const item = ITEMS.find((i) => i.id === id);
    ids[id] ||= newRecordId();
    saveRecord(dogId, { id: ids[id], type, at, data, memo: `하루 체크: ${item.label} ${label}`, photos: [] });
  }
  setDay(dogId, date, { status: "diff", picks: Object.fromEntries(entries), recIds: ids });
}

// 고른 것 중 바로 연락할 신호·물어볼 신호
export function signalsOf(picks = {}) {
  const list = Object.entries(picks).map(([id, label]) => ({ item: ITEMS.find((i) => i.id === id), label, ...option(id, label) }));
  return { red: list.filter((x) => x.red), warn: list.filter((x) => x.warn) };
}

// 이번 달 함께 본 날(평소·다름 모두, 기억 안 나요는 빼고)
export function daysThisMonth(dogId, today = todayKey()) {
  const month = today.slice(0, 7);
  return Object.entries(all()[dogId] || {}).filter(([d, v]) => d.startsWith(month) && v.status !== "unknown").length;
}

// 오늘까지 같은 항목이 며칠 연속 "다름"이었는지 — 2일 이상만 [{ item, days }]
export function runsOf(dogId, today = todayKey()) {
  const days = all()[dogId] || {};
  const out = [];
  for (const item of ITEMS) {
    if (item.id === "walk") continue; // 산책을 못 간 건 이상 신호가 아님
    let n = 0;
    for (let d = today; days[d]?.picks?.[item.id] && option(item.id, days[d].picks[item.id])?.rec; d = toDateKey(addDays(new Date(`${d}T00:00:00`), -1))) n++;
    if (n >= 2) out.push({ item, days: n, label: days[today].picks[item.id] });
  }
  return out;
}

// 어제를 놓쳤는지: 전에 한 번이라도 체크한 사람만(처음 쓰는 날엔 묻지 않음)
export function missedYesterday(dogId, today = todayKey()) {
  const days = all()[dogId] || {};
  const y = toDateKey(addDays(new Date(`${today}T00:00:00`), -1));
  return !days[y] && Object.keys(days).some((d) => d < y) ? y : null;
}
