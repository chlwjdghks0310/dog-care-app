// 한 달 리포트 확인: npm test — 그 달 기록만, 지난달 비교, 달력 칸 표식, 체중 마지막 값
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis;
const dog = { id: "d1", name: "보리", birthDate: "2025-03-01", weight: 3.2 };
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
set("dogcare-records-v1", { d1: [
  { id: "a", type: "daily", at: "2026-10-03T08:00", data: { kind: "산책", minutes: 20 } },
  { id: "b", type: "vital", at: "2026-10-20T19:30", data: { metric: "walk", value: 30 } },
  { id: "c", type: "daily", at: "2026-09-28T08:00", data: { kind: "산책", minutes: 40 } }, // 지난달
  { id: "d", type: "meal", at: "2026-10-05T20:00", data: { appetite: "평소보다 적음" } },
  { id: "e", type: "meal", at: "2026-10-06T20:00", data: { appetite: "평소" } },
  { id: "f", type: "potty", at: "2026-10-07T20:00", data: { stool: "무름" } },
  { id: "g", type: "symptom", at: "2026-10-09T07:00", data: { kinds: ["구토"] } },
  { id: "h", type: "symptom", at: "2026-10-09T19:00", data: { kinds: ["구토", "설사"] } },
  { id: "i", type: "vet", at: "2026-10-12T11:00", data: { cost: 35000 } },
  { id: "j", type: "symptom", at: "2026-11-01T07:00", data: { kinds: ["기침"] } }, // 다음 달 → 안 셈
] });
set("dogcare-weight-log-v1", { d1: [
  { id: "w1", dogId: "d1", weightKg: 3.1, measuredAt: "2026-09-20T09:00:00" },
  { id: "w2", dogId: "d1", weightKg: 3.2, measuredAt: "2026-10-04T09:00:00" },
  { id: "w3", dogId: "d1", weightKg: 3.25, measuredAt: "2026-10-25T09:00:00" },
] });
set("dogcare-daily-check-v1", { d1: { "2026-10-01": { status: "usual" }, "2026-10-02": { status: "usual" }, "2026-10-09": { status: "diff", picks: { stool: "무름" } }, "2026-10-30": { status: "usual" } } });
set("dogcare-expenses-v1", { d1: [{ id: "x1", title: "진료", amount: 35000, date: "2026-10-12", categoryId: "medical" }, { id: "x2", title: "간식", amount: 5000, date: "2026-10-13", categoryId: "food" }] });
const { buildMonthlyReport, monthDigest, addMonths } = await import("../src/services/monthlyReport.js");

const r = buildMonthlyReport(dog, "2026-10", "2026-11-18");
assert.equal(r.from, "2026-10-01"); assert.equal(r.to, "2026-10-31"); assert.equal(r.days, 31); assert.equal(r.elapsed, 31);
assert.deepEqual({ days: r.walk.days, minutes: r.walk.minutes }, { days: 2, minutes: 50 }, "그 달 산책만");
assert.equal(r.compare.walkDays, 1, "지난달 1일 → 이번 달 2일");
assert.deepEqual(r.meal, { usual: 1, less: 1, more: 0 });
assert.deepEqual(r.looseDays, ["2026-10-07"]);
assert.equal(r.symptoms.length, 2, "11/1 증상은 다음 달");
assert.deepEqual(r.topKinds[0], ["구토", 2]);
assert.deepEqual(r.weight, { last: 3.25, prevLast: 3.1, diff: 0.15 });
assert.equal(r.checkDays.length, 4);
assert.ok(r.cost >= 35000, "병원비 합계(가계부 병원 항목)");
assert.equal(r.firstDow, 3, "2026-10-01은 목요일 → 월요일 시작 칸 3개 비움");
const c9 = r.cells[8];
assert.deepEqual([c9.day, c9.mark, c9.checked, c9.walk], [9, true, true, false]);
assert.ok(r.cells[2].walk && !r.cells[2].mark, "10/3 산책 발도장");
assert.ok(r.cells[11].vet, "10/12 병원");
assert.ok(!r.cells[30].future, "지난달은 미래 칸 없음");

const cur = buildMonthlyReport(dog, "2026-11", "2026-11-18");
assert.equal(cur.to, "2026-11-18", "이번 달은 오늘까지"); assert.equal(cur.elapsed, 18); assert.ok(cur.isCurrent);
assert.ok(cur.cells[29].future && !cur.cells[17].future, "19일부터 미래 칸");
assert.equal(cur.symptoms.length, 1);

assert.equal(addMonths("2026-01", -1), "2025-12"); assert.equal(addMonths("2026-12", 1), "2027-01");
const digest = monthDigest(dog, r);
assert.ok(digest.includes("산책 2일 50분") && digest.includes("체중 3.25kg") && digest.includes("구토 2"), digest);
console.log("monthly-report ok");
