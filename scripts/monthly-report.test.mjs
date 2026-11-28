// 한 달 리포트 확인: npm test — 그 달 기록만, 지난달 비교, 달력 칸, 달라진 것 세 줄(규칙), 겹쳐 보기, 체중 흐름, 빽빽한 데이터·빈 데이터에서도 안 터짐
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis;
const dog = { id: "d1", name: "보리", birthDate: "2025-03-01", weight: 3.2 };
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const rec = (id, type, at, data) => ({ id, type, at, data });
set("dogcare-records-v1", { d1: [
  rec("a", "daily", "2026-10-03T08:00", { kind: "산책", minutes: 20 }), rec("b", "vital", "2026-10-20T19:30", { metric: "walk", value: 30 }),
  rec("c", "daily", "2026-09-28T08:00", { kind: "산책", minutes: 40 }), // 지난달
  rec("d", "meal", "2026-10-05T20:00", { appetite: "평소보다 적음" }), rec("e", "meal", "2026-10-06T20:00", { appetite: "평소" }),
  rec("d2", "meal", "2026-10-08T20:00", { appetite: "평소보다 적음" }), // 9일 증상 전날 밥 적게
  rec("f", "potty", "2026-10-07T20:00", { stool: "무름" }),
  rec("g", "symptom", "2026-10-09T07:00", { kinds: ["구토"] }), rec("h", "symptom", "2026-10-09T19:00", { kinds: ["구토", "설사"] }),
  rec("i", "vet", "2026-10-12T11:00", { cost: 35000 }),
  rec("j", "symptom", "2026-11-01T07:00", { kinds: ["기침"] }), // 다음 달 → 안 셈
  rec("k", "daily", "2026-10-06T10:00", { kind: "간식" }), // 7일 무른 변 전날 간식
] });
set("dogcare-weight-log-v1", { d1: [
  { id: "w1", dogId: "d1", weightKg: 3.1, measuredAt: "2026-09-20T09:00:00" },
  { id: "w2", dogId: "d1", weightKg: 3.2, measuredAt: "2026-10-04T09:00:00" },
  { id: "w3", dogId: "d1", weightKg: 3.25, measuredAt: "2026-10-25T09:00:00" },
] });
set("dogcare-daily-check-v1", { d1: { "2026-10-01": { status: "usual" }, "2026-10-02": { status: "usual" }, "2026-10-09": { status: "diff", picks: { stool: "무름" } }, "2026-10-30": { status: "usual" } } });
set("dogcare-expenses-v1", { d1: [{ id: "x1", title: "진료", amount: 35000, date: "2026-10-12", categoryId: "medical" }, { id: "x2", title: "간식", amount: 5000, date: "2026-10-13", categoryId: "food" }] });
const { buildMonthlyReport, monthDigest, addMonths, topWeekdays, diffsOf, overlapsOf, weightTrend } = await import("../src/services/monthlyReport.js");

const r = buildMonthlyReport(dog, "2026-10", "2026-11-18");
assert.equal(r.from, "2026-10-01"); assert.equal(r.to, "2026-10-31"); assert.equal(r.days, 31); assert.equal(r.elapsed, 31);
assert.deepEqual({ days: r.walk.days, minutes: r.walk.minutes }, { days: 2, minutes: 50 }, "그 달 산책만");
assert.deepEqual(r.meal, { usual: 1, less: 2, more: 0 });
assert.deepEqual(r.looseDays, ["2026-10-07"]);
assert.equal(r.symptoms.length, 2, "11/1 증상은 다음 달");
assert.deepEqual(r.topKinds[0], ["구토", 2]);
assert.deepEqual([r.weight.last, r.weight.prevLast, r.weight.diff, r.weight.pct], [3.25, 3.1, 0.15, 5]);
assert.equal(r.weight.avg, 3.23, "30일 평균"); assert.equal(r.weight.dirLabel, "천천히 오르는 중");
assert.equal(r.checkDays.length, 4); assert.equal(r.firstDow, 4, "2026-10-01은 목요일(일요일 시작)");
assert.deepEqual([r.cells[8].day, r.cells[8].mark, r.cells[8].checked, r.cells[8].walk], [9, true, true, false]);
assert.ok(r.cells[11].vet, "10/12 병원");
// 달라진 것: 9월엔 산책 1·체중 3.1뿐 → 산책(1→2는 3일 미만이라 빠짐), 무른 변 0→1, 증상 0→2, 병원 0→1, 체중 +5%
const keys = r.diffs.map((d) => d.key);
assert.equal(r.diffs.length, 3, "세 줄만");
assert.ok(keys.includes("symptom") && keys.includes("loose"), `건강 변화가 앞에: ${keys}`);
assert.ok(!keys.includes("walk"), "산책 1→2는 3일 미만이라 안 뽑힘");
for (const d of r.diffs) { assert.ok(d.title && d.unit && typeof d.a === "number" && typeof d.b === "number", JSON.stringify(d)); assert.ok(!/좋|나쁘|위험/.test(d.title), "판정 말 없음"); }
// 겹쳐 보기: 7일 무른 변(전날 6일 간식), 9일 구토(전날 8일 밥 적게) → 2번 중 2번 겹침, 우연 안내
assert.equal(r.overlaps.n, 2); assert.equal(r.overlaps.best, 1, "가장 자주 겹친 것 하나만(밥 적게 1·간식 1 → 하나)");
assert.match(r.overlaps.line, /우연일 수 있어요/);
assert.equal(r.overlaps.rows[0].date, "2026-10-07"); assert.equal(r.overlaps.rows[0].kind, "무른 변"); assert.ok(r.overlaps.rows[0].cells[0].treat, "전날 간식");
assert.equal(r.overlaps.rows[1].kind, "구토"); assert.ok(r.overlaps.rows[1].cells[0].less, "전날 밥 적게"); assert.ok(r.overlaps.rows[1].cells[1].mark);
assert.ok(!r.overlaps.rows[1].cells[0].noWalk, "산책 습관(8일 이상)이 없는 달엔 '산책 없음'을 안 붙임");
const digest = monthDigest(dog, r);
assert.ok(digest.includes("달라진 것") && digest.includes("겹쳐 보기") && digest.includes("30일 평균 3.23"), digest);

// 이번 달(진행 중) + 지난달 없음
const cur = buildMonthlyReport(dog, "2026-11", "2026-11-18");
assert.equal(cur.to, "2026-11-18"); assert.ok(cur.isCurrent); assert.ok(cur.cells[29].future && !cur.cells[17].future);
assert.equal(cur.symptoms.length, 1);
const none = buildMonthlyReport(dog, "2026-08", "2026-11-18");
assert.equal(none.records, 0); assert.equal(none.diffs.length, 0); assert.equal(none.prevHasRecords, false); assert.match(none.overlaps.line, /없었어요/);
assert.deepEqual(weightTrend({ weights: [] }, 3.1).last, null);
assert.equal(addMonths("2026-01", -1), "2025-12"); assert.equal(addMonths("2026-12", 1), "2027-01");
assert.deepEqual(topWeekdays(["2026-10-06", "2026-10-13", "2026-10-20", "2026-10-07"]), ["화"], "2번 이상 몰린 요일만");

// 변화 없음 → 세 줄 없음(quiet)
const same = { walk: { dates: [], days: 5, minutes: 100 }, meal: { usual: 10, less: 1, more: 0 }, lessDates: ["2026-10-01"], treatDates: [], looseDays: [], symptoms: [], topKinds: [], vetDays: [], cost: 0, weights: [{ date: "2026-10-10", kg: 3 }], checkDays: Array.from({ length: 10 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`), streaks: 1, elapsed: 31 };
const prevSame = { ...same, weights: [{ date: "2026-09-10", kg: 3 }] };
assert.deepEqual(diffsOf(same, prevSame, { prevHas: true }), [], "똑같으면 빈 배열(→ '비슷한 한 달')");
assert.equal(overlapsOf(same).n, 0);

// 빽빽한 달: 하루 3기록 × 31일 + 매일 체크 + 체중 10번 — 안 터지고 세 줄·겹침·배지가 나온다
const dense = []; const dc = {}; const ws = [];
for (let d = 1; d <= 31; d++) {
  const day = `2026-07-${String(d).padStart(2, "0")}`;
  dense.push(rec(`m${d}a`, "meal", `${day}T08:00`, { appetite: d % 7 === 0 ? "평소보다 적음" : "평소" }), rec(`m${d}b`, "meal", `${day}T19:00`, { appetite: "평소" }), rec(`w${d}`, "daily", `${day}T19:30`, { kind: "산책", minutes: 30 }));
  if (d % 7 === 1) dense.push(rec(`s${d}`, "symptom", `${day}T07:00`, { kinds: ["구토"] }));
  if (d % 10 === 0) dense.push(rec(`p${d}`, "potty", `${day}T18:00`, { stool: "무름" }));
  dc[day] = { status: "usual" };
  if (d % 3 === 0) ws.push({ id: `wd${d}`, dogId: "d1", weightKg: 3 + d * 0.01, measuredAt: `${day}T09:00:00` });
}
set("dogcare-records-v1", { d1: dense }); set("dogcare-daily-check-v1", { d1: dc }); set("dogcare-weight-log-v1", { d1: ws }); set("dogcare-expenses-v1", { d1: [] });
const t0 = Date.now();
const big = buildMonthlyReport(dog, "2026-07", "2026-11-18");
assert.ok(Date.now() - t0 < 500, "빽빽해도 0.5초 안");
assert.equal(big.walk.days, 31); assert.equal(big.streaks, 4, "31일 연속 → 배지 4"); assert.equal(big.weights.length, 10);
assert.equal(big.diffs.length, 3); assert.ok(big.overlaps.rows.length >= 7); assert.ok(big.overlaps.rows.length <= 8);
assert.ok(big.weight.dirLabel.length > 0); assert.ok(monthDigest(dog, big).length < 1500, "digest 길이");
console.log("monthly-report ok");
