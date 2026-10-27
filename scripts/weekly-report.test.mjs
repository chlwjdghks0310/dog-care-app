// 주간 리포트 확인: npm test — 지난 7일 기록만 세는지, 체중 차이·다음 주 일정·체크리스트 비율
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis;
const dog = { id: "d1", name: "보리", birthDate: "2025-03-01", weight: 3.2 };
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
set("dogcare-records-v1", { d1: [
  { id: "a", type: "vital", at: "2026-10-26T19:30", data: { metric: "walk", value: 30 } },
  { id: "b", type: "daily", at: "2026-10-24T08:00", data: { kind: "산책", minutes: "20" } },
  { id: "c", type: "vital", at: "2026-10-19T19:30", data: { metric: "walk", value: 60 } }, // 지난주 → 안 셈
  { id: "d", type: "meal", at: "2026-10-25T20:00", data: { appetite: "평소보다 적음" } },
  { id: "e", type: "meal", at: "2026-10-26T20:00", data: { appetite: "평소" } },
  { id: "f", type: "potty", at: "2026-10-25T20:00", data: { stool: "무름" } },
  { id: "g", type: "potty", at: "2026-10-26T20:00", data: { stool: "정상" } },
  { id: "h", type: "symptom", at: "2026-10-23T07:00", data: { kinds: ["구토"] } },
] });
set("dogcare-weight-log-v1", { d1: [
  { id: "w1", dogId: "d1", weightKg: 3.1, measuredAt: "2026-10-10T09:00:00" },
  { id: "w2", dogId: "d1", weightKg: 3.25, measuredAt: "2026-10-25T09:00:00" },
] });
set("dogcare-calendar-events-v1", { d1: { "2026-10-30": [{ id: "e1", title: "종합백신", kind: "vaccine", time: "10:30" }], "2026-11-10": [{ id: "e2", title: "미용" }] } });
const { buildWeeklyReport } = await import("../src/services/weeklyReport.js");
const r = buildWeeklyReport(dog, "2026-10-27");
assert.equal(r.from, "2026-10-21");
assert.deepEqual(r.walk, { days: 2, minutes: 50 }, "지난주 산책은 빼고");
assert.deepEqual(r.meal, { usual: 1, less: 1, more: 0 });
assert.deepEqual(r.looseDays, ["2026-10-25"]);
assert.deepEqual(r.symptoms, [{ date: "2026-10-23", kinds: ["구토"] }]);
assert.deepEqual(r.weight, { kg: 3.25, diff: 0.15 });
assert.deepEqual(r.next, [{ date: "2026-10-30", title: "종합백신", time: "10:30" }], "7일 안 일정만");
assert.equal(r.records, 8, "이번 주 기록 7개 + 체중 1개");
console.log("weekly-report ok");
