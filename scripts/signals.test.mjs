// 이상 신호 확인: npm test
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis;
const R = await import("../src/services/records.js");
const D = await import("../src/services/dailyCheck.js");
const W = await import("../src/services/weightLog.js");
const { getSignals } = await import("../src/services/signals.js");
const { todayKey, toDateKey, addDays } = await import("../src/utils/date.js");
const today = todayKey();
const day = (n) => toDateKey(addDays(new Date(`${today}T00:00:00`), n));
const adult = { id: "a", name: "보리", birthDate: "2022-01-01" };
const ids = (dog) => getSignals(dog, today, new Date(`${today}T23:00:00`)).map((s) => s.id);

assert.deepEqual(ids(adult), []);
// 무른 변: 기록 2일 + 하루 체크 1일 = 3일째(오늘 아직 없음 → 어제까지)
R.saveRecord("a", { id: R.newRecordId(), type: "potty", at: `${day(-3)}T09:00`, data: { stool: "무름" }, memo: "", photos: [] });
R.saveRecord("a", { id: R.newRecordId(), type: "potty", at: `${day(-2)}T09:00`, data: { stoolScore: 5 }, memo: "", photos: [] });
assert.deepEqual(ids(adult), []);
D.saveDiff("a", day(-1), { stool: "무름" });
assert.deepEqual(ids(adult), ["stool"]);
// 식사 적음 2일
D.saveDiff("b", day(-1), { meal: "조금 남김" });
const b = { id: "b", name: "콩", birthDate: "2022-01-01" };
assert.deepEqual(ids(b), []);
D.saveDiff("b", today, { meal: "안 먹음" });
assert.deepEqual(ids(b), ["meal"]);
// 아주 어린 퍼피는 1일부터
const pup = { id: "p", name: "아기", birthDate: day(-70) };
D.saveDiff("p", today, { meal: "반 이상 남김" });
assert.deepEqual(ids(pup), ["meal"]);
// 몸무게: 성견 5% → watch, 10% → vet, 퍼피는 줄면 바로
W.addWeightRecord("c", { weightKg: 4.2, measuredAt: `${day(-30)}T09:00` });
W.addWeightRecord("c", { weightKg: 3.98, measuredAt: `${day(-1)}T09:00` });
const c = { id: "c", name: "솜", birthDate: "2020-01-01" };
assert.deepEqual(getSignals(c, today).map((s) => [s.id, s.level]), [["weight", "watch"]]);
W.addWeightRecord("c", { weightKg: 3.7, measuredAt: `${today}T09:00` });
assert.deepEqual(getSignals(c, today).map((s) => [s.id, s.level]), [["weight", "vet"]]);
W.addWeightRecord("q", { weightKg: 3.0, measuredAt: `${day(-30)}T09:00` });
W.addWeightRecord("q", { weightKg: 2.95, measuredAt: `${today}T09:00` });
assert.deepEqual(getSignals({ id: "q", name: "새끼", birthDate: day(-200) }, today).map((s) => s.id), ["weight"]);
assert.match(getSignals(c, today)[0].text, /4\.2→3\.7kg/);
console.log("이상 신호 OK");
