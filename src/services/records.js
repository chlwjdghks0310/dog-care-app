import { readJSON, writeJSON } from "./storage";
import { addDays, toDateKey, todayKey, pad2 } from "../utils/date";
import { getWeightRecords } from "./weightLog";
import { getDoseRecords } from "./medications";
import { addEvent, deleteEvent, getEventsForDate } from "./calendarEvents";
import { addCustomSchedule, deleteCustomSchedule } from "./customSchedules";
import { VITAL, fmtValue } from "../data/vitals";

// 통합 기록 — 강아지별 건강·병원·일상·성장 기록. 체중과 복약은 이미 있는 저장소(weightLog, medications)를
// 그대로 쓰고, 타임라인에서만 합쳐 보여 준다(같은 기록을 두 군데 저장하지 않음).
// Record = { id, dogId, type, at(로컬 "YYYY-MM-DDTHH:MM" — 체중 기록처럼 시간대 변환 없이 저장), createdAt, updatedAt,
//            data{종류별 항목}, memo, photos[dataURL], links?{ eventDate, eventId, alarmId } }
const KEY = "dogcare-records-v1";

export const LEVELS = ["평소보다 적음", "평소", "평소보다 많음"];
export const TYPES = {
  weight: { label: "체중", icon: "⚖️", ico: "gauge" },
  symptom: { label: "증상", icon: "🤒", ico: "thermometer" },
  meal: { label: "식사", icon: "🍚", ico: "utensils" },
  potty: { label: "배변·배뇨", icon: "💩", ico: "sprout" },
  med: { label: "복약", icon: "💊", ico: "pill" },
  vet: { label: "병원 진료", icon: "🏥", ico: "stethoscope" },
  condition: { label: "컨디션", icon: "🌙", ico: "moon" },
  daily: { label: "일상", icon: "🦮", ico: "footprints" },
  life: { label: "성장·추억", icon: "🎉", ico: "party" },
  media: { label: "사진", icon: "📷", ico: "camera" },
  vital: { label: "건강 수치", icon: "📈", ico: "chartLine" },
};
// 새 기록 추가에서 고르는 순서
export const ADD_ORDER = ["weight", "symptom", "meal", "potty", "med", "vet", "media", "daily", "condition", "life"];
// 전체 기록 필터에 쓰는 종류(건강 수치는 프로필의 수치 칸에서 적는다)
export const FILTER_ORDER = [...ADD_ORDER, "vital"];

export const SYMPTOM_KINDS = ["구토", "설사", "기침", "식욕 없음", "기운 없음", "절뚝거림", "가려움·긁음", "눈 이상", "귀 이상", "피부 이상", "숨이 가쁨", "떨림", "물 많이 마심", "기타"];
export const REPEAT = ["처음", "가끔", "자주", "계속"];
export const STOOL = ["정상", "무름", "설사", "딱딱함", "피 섞임", "안 봄"];
export const URINE = ["정상", "잦음", "적음", "색 이상", "실수", "안 봄"];
export const DAILY_KINDS = ["산책", "간식", "미용·목욕", "양치", "놀이", "기타"];
export const LIFE_KINDS = ["예방접종", "질환·수술", "기념일", "특별한 일", "추억"];

const newId = () => `rec-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
export const localNow = () => {
  const d = new Date();
  return `${toDateKey(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
export const newRecordId = newId;

function readAll() {
  return readJSON(KEY, {});
}

export function getRecords(dogId) {
  return readAll()[dogId] || [];
}

// 저장 전 검사 — 문구는 화면에 그대로 보여 준다. 문제가 없으면 null.
export function validateRecord(r, now = localNow()) {
  if (!TYPES[r.type] || r.type === "med") return "기록 종류를 골라 주세요.";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.at || "") || Number.isNaN(new Date(r.at).getTime())) return "날짜와 시각을 확인해 주세요.";
  if (r.at > now) return "아직 오지 않은 시각으로는 기록할 수 없어요.";
  const d = r.data || {};
  if (r.type === "weight") {
    const w = Number(d.weightKg);
    if (!(w > 0 && w < 120)) return "체중을 0.1~120kg 사이로 적어 주세요.";
  }
  if (r.type === "vital") {
    const def = VITAL[d.metric];
    const v = Number(d.value);
    if (!def || def.external) return "어떤 수치인지 골라 주세요.";
    if (!(v >= def.min && v <= def.max)) return `${def.label}은 ${def.min}~${def.max}${def.unit} 사이로 적어 주세요.`;
  }
  if (r.type === "symptom" && !d.kinds?.length) return "증상을 하나 이상 골라 주세요.";
  if (r.type === "vet" && !d.reason?.trim()) return "진료 사유를 적어 주세요.";
  if (r.type === "vet" && d.nextDate && !/^\d{4}-\d{2}-\d{2}$/.test(d.nextDate)) return "다음 진료 날짜를 확인해 주세요.";
  if (r.type === "life" && !d.kind) return "어떤 기록인지 골라 주세요.";
  if (r.type === "media" && !r.photos?.length) return "사진을 한 장 이상 넣어 주세요.";
  if (r.type === "daily" && !d.kind && !r.memo?.trim()) return "무엇을 했는지 고르거나 메모를 적어 주세요.";
  const hasAny = Object.values(d).some((v) => (Array.isArray(v) ? v.length : v)) || r.memo?.trim() || r.photos?.length;
  if (!hasAny) return "적은 내용이 없어요.";
  return null;
}

// 같은 id면 덮어쓴다 — 저장 버튼을 두 번 눌러도 기록은 하나. 실패하면 Error(사용자용 문구).
export function saveRecord(dogId, input) {
  const all = readAll();
  const list = all[dogId] || [];
  const idx = list.findIndex((r) => r.id === input.id);
  const nowIso = new Date().toISOString();
  const record = { ...(idx >= 0 ? list[idx] : { createdAt: nowIso }), ...input, dogId, updatedAt: nowIso };
  all[dogId] = idx >= 0 ? list.map((r, i) => (i === idx ? record : r)) : [...list, record];
  if (!writeJSON(KEY, all)) throw new Error("저장 공간이 부족해서 저장하지 못했어요. 사진을 줄이거나 빼고 다시 저장해 주세요.");
  return record;
}

export function deleteRecord(dogId, id) {
  const all = readAll();
  const rec = (all[dogId] || []).find((r) => r.id === id);
  if (!rec) return;
  all[dogId] = all[dogId].filter((r) => r.id !== id);
  if (!writeJSON(KEY, all)) throw new Error("삭제하지 못했어요. 다시 시도해 주세요.");
  unlinkSchedule(dogId, rec);
}

// 다음 진료·접종 날짜가 있는 기록 → 일정표에 일정 하나(+원하면 그날 아침 알람). 기록을 고치면 일정을 옮기고, 지우면 같이 지운다.
// 일정표에서 사용자가 그 일정을 먼저 지웠으면 다시 만들지 않는다(eventId가 사라진 걸로 판단).
export function syncSchedule(dogId, rec, { title, date, alarm }) {
  const old = rec.links || {};
  const sameDate = old.eventDate === date;
  const eventAlive = old.eventId && getEventsForDate(dogId, old.eventDate).some((e) => e.id === old.eventId);
  let links = { ...old };
  if (old.eventId && (!sameDate || !date)) {
    deleteEvent(dogId, old.eventDate, old.eventId);
    links = {};
  }
  if (old.alarmId && (!sameDate || !date || !alarm)) {
    deleteCustomSchedule(dogId, old.alarmId);
    delete links.alarmId;
  }
  if (date && date >= todayKey()) {
    if (!sameDate || !old.eventId) links = { ...links, eventDate: date, eventId: addEvent(dogId, date, title, "#3f8fe0").id };
    else if (!eventAlive) links = { ...links, eventId: null };
    if (alarm && !links.alarmId) links.alarmId = addCustomSchedule(dogId, { title, time: "09:00", date }).id;
  }
  return links;
}

function unlinkSchedule(dogId, rec) {
  if (rec.links?.eventId) deleteEvent(dogId, rec.links.eventDate, rec.links.eventId);
  if (rec.links?.alarmId) deleteCustomSchedule(dogId, rec.links.alarmId);
}

// 기록 한 줄 요약(타임라인·최근 기록·리포트에 같이 쓴다)
export function summarize(rec) {
  const d = rec.data || {};
  const parts = [];
  switch (rec.type) {
    case "weight":
      parts.push(`${d.weightKg}kg`);
      break;
    case "med":
      parts.push(`${d.name} ${d.dose} ${d.status === "done" ? `먹임(${d.doneAt?.slice(11, 16)})` : "건너뜀"}`, `예정 ${d.time}`);
      break;
    case "symptom":
      parts.push(d.kinds.join(", "), d.repeat && d.repeat !== "처음" ? d.repeat : "", d.since ? `${md(d.since)}부터` : "", d.observed);
      break;
    case "meal":
      parts.push(d.appetite && `식욕 ${d.appetite}`, d.water && `물 ${d.water}`, d.food, d.amount);
      break;
    case "potty":
      parts.push(d.stool && `대변 ${d.stool}`, d.urine && `소변 ${d.urine}`, d.photoFlags?.length && `⚠ ${d.photoFlags.join(", ")}`, d.photoNote && "📷 사진 확인");
      break;
    case "vet":
      parts.push(d.hospital, d.reason, d.nextDate && `다음 진료 ${md(d.nextDate)}`);
      break;
    case "condition":
      parts.push(d.activity && `활동 ${d.activity}`, d.sleep && `수면 ${d.sleep}`, d.body, d.oral);
      break;
    case "daily":
      parts.push(d.kind, d.minutes && `${d.minutes}분`, d.activity && `활동 ${d.activity}`);
      break;
    case "life":
      parts.push(d.kind, d.title, d.nextDate && `다음 ${md(d.nextDate)}`);
      break;
    case "media":
      parts.push(`사진 ${rec.photos?.length || 0}장`);
      break;
    case "vital":
      parts.push(`${VITAL[d.metric]?.label} ${fmtValue(d.metric, d.value)}${VITAL[d.metric]?.unit}`);
      break;
  }
  if (rec.memo) parts.push(rec.memo);
  return parts.filter(Boolean).join(" · ");
}

export const md = (dateKey) => `${Number(dateKey.slice(5, 7))}/${Number(dateKey.slice(8, 10))}`;

// 타임라인 — 통합 기록 + 체중 기록 + 실제로 먹임/건너뜀을 누른 복용 기록. 각각 원래 저장소의 id를 그대로 쓴다.
export function getTimeline(dogId) {
  const weights = getWeightRecords(dogId).map((w) => ({
    id: w.id,
    type: "weight",
    source: "weight",
    at: w.measuredAt.slice(0, 16),
    data: { weightKg: w.weightKg },
    memo: w.note || "",
    photos: [],
  }));
  const doses = getDoseRecords(dogId).map((r) => ({
    id: r.key,
    type: "med",
    source: "med",
    at: r.status === "done" && r.doneAt ? r.doneAt.slice(0, 16) : `${r.date}T${r.time}`,
    data: { name: r.name, dose: r.dose, status: r.status, doneAt: r.doneAt, time: r.time },
    memo: "",
    photos: [],
  }));
  return [...getRecords(dogId).map((r) => ({ ...r, source: "record" })), ...weights, ...doses];
}

// 검색 대상: 종류 이름 + 요약 + 모든 입력 칸(검사 결과·수의사 설명처럼 요약에 안 나오는 칸까지)
const searchText = (r) => `${TYPES[r.type].label} ${summarize(r)} ${Object.values(r.data || {}).flat().join(" ")}`.toLowerCase();

// 필터: types(빈 배열=전체), days(0=전체), q(키워드), order("new"|"old") — 조건은 모두 AND로 묶는다.
export function filterTimeline(items, { types = [], days = 0, q = "", order = "new" } = {}, today = todayKey()) {
  const from = days ? toDateKey(addDays(new Date(`${today}T00:00:00`), -(days - 1))) : "";
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = items.filter(
    (r) =>
      (!types.length || types.includes(r.type)) &&
      (!from || r.at.slice(0, 10) >= from) &&
      words.every((w) => searchText(r).includes(w))
  );
  return list.sort((a, b) => (order === "old" ? a.at.localeCompare(b.at) : b.at.localeCompare(a.at)));
}

// 기간 안 단계형 기록(식욕·물·활동·수면)을 날짜순으로 — 기록이 없는 날은 만들지 않는다.
export function levelSeries(dogId, field, days, today = todayKey()) {
  const type = field === "appetite" || field === "water" ? "meal" : "condition";
  return filterTimeline(getRecords(dogId).filter((r) => r.data?.[field]), { types: [type], days, order: "old" }, today).map((r) => ({ at: r.at, value: r.data[field] }));
}

// 건강 수치 기록(종류별). 산책은 일상 기록의 산책 시간도 합친다(같은 걸 두 번 적지 않게).
// 반환: [{ id, at, value, memo, source }] 시간순
export function getVitalEntries(dogId, metric) {
  const recs = getRecords(dogId);
  const out = recs.filter((r) => r.type === "vital" && r.data?.metric === metric).map((r) => ({ id: r.id, at: r.at, value: Number(r.data.value), memo: r.memo || "", source: "vital" }));
  if (metric === "walk")
    for (const r of recs) if (r.type === "daily" && r.data?.kind === "산책" && Number(r.data.minutes) > 0) out.push({ id: r.id, at: r.at, value: Number(r.data.minutes), memo: r.memo || "", source: "daily" });
  if (metric === "weight")
    for (const w of getWeightRecords(dogId)) out.push({ id: w.id, at: w.measuredAt.slice(0, 16), value: w.weightKg, memo: w.note || "", source: "weight" });
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

// 날짜별로 묶기: sum 수치는 하루 합계, point 수치는 그날 마지막 값. 기록 없는 날은 만들지 않는다.
export function vitalDaily(entries, kind) {
  const map = new Map();
  for (const e of entries) {
    const d = e.at.slice(0, 10);
    const cur = map.get(d);
    map.set(d, kind === "sum" ? { date: d, value: (cur?.value || 0) + e.value, count: (cur?.count || 0) + 1 } : { date: d, value: e.value, count: (cur?.count || 0) + 1 });
  }
  return [...map.values()];
}
