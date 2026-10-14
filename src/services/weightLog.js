import { readJSON, writeJSON } from "./storage";
import { toDateKey } from "../utils/date";

const KEY = "dogcare-weight-log-v1";

function nextId() {
  return `wt-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// 구조: { [dogId]: WeightRecord[] }
// WeightRecord = { id, dogId, weightKg, measuredAt(로컬 "YYYY-MM-DDTHH:MM:00" 문자열),
//                  measurementMethod, note, createdAt, updatedAt }
// measuredAt은 UTC로 변환하지 않고 입력받은 로컬 시각 그대로 문자열로 저장한다 — 자정 근처
// 기록이 타임존 변환 때문에 하루 밀리는 걸 막기 위해서다. 같은 dateKey 판정은 항상
// new Date(measuredAt)을 utils/date.js의 toDateKey()(로컬 getter 기반)로 변환해서 쓴다.
function getAll() {
  return readJSON(KEY, {});
}

export function getWeightRecords(dogId) {
  const list = getAll()[dogId] || [];
  return [...list].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

export function getLatestWeightRecord(dogId) {
  const list = getWeightRecords(dogId);
  return list.length ? list[list.length - 1] : null;
}

export function hasWeightRecordOnDate(dogId, dateKey) {
  return getWeightRecords(dogId).some((r) => toDateKey(new Date(r.measuredAt)) === dateKey);
}

export function addWeightRecord(dogId, { weightKg, measuredAt, measurementMethod, note }) {
  const all = getAll();
  const now = new Date().toISOString();
  const record = {
    id: nextId(),
    dogId,
    weightKg,
    measuredAt,
    measurementMethod: measurementMethod || "",
    note: note || "",
    createdAt: now,
    updatedAt: now,
  };
  all[dogId] = [...(all[dogId] || []), record];
  writeJSON(KEY, all);
  return record;
}

export function updateWeightRecord(dogId, id, patch) {
  const all = getAll();
  const list = all[dogId] || [];
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const updated = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  all[dogId] = list;
  writeJSON(KEY, all);
  return updated;
}

export function deleteWeightRecord(dogId, id) {
  const all = getAll();
  const list = all[dogId] || [];
  all[dogId] = list.filter((r) => r.id !== id);
  writeJSON(KEY, all);
}

// 직전 기록 대비 변화량/변화율. 이전 기록이 없으면 null을 돌려주고(화면에서 표시 생략),
// 변화율 = (현재 - 이전) / 이전 * 100.
export function getWeightChangeSummary(dogId) {
  const records = getWeightRecords(dogId);
  if (records.length === 0) return null;
  const latest = records[records.length - 1];
  const previous = records.length > 1 ? records[records.length - 2] : null;
  if (!previous) return { latest, previous: null, deltaKg: null, deltaPercent: null };
  const deltaKg = latest.weightKg - previous.weightKg;
  const deltaPercent = (deltaKg / previous.weightKg) * 100;
  return { latest, previous, deltaKg, deltaPercent };
}

// 증가/감소 자체만으로 건강 여부를 판단하지 않는, 중립적인 안내 문구.
export function getWeightChangeAdvice(deltaPercent) {
  if (deltaPercent == null) return null;
  if (deltaPercent <= -5) {
    return "이전 기록보다 체중이 줄었어요. 최근 식욕과 활동성에도 변화가 있는지 확인해 주세요. 변화가 크거나 다른 증상이 같이 보이면 수의사에게 문의해보세요.";
  }
  if (deltaPercent >= 5) {
    return "이전 기록보다 체중이 늘었어요. 최근 급여량·간식·활동량에 변화가 있었는지 확인해보세요.";
  }
  return "이전 기록과 비슷한 수준으로 유지되고 있어요.";
}
