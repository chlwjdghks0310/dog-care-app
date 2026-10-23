// 가계부 분석 확인: npm test
import assert from "node:assert/strict";
const B = await import("../src/services/budgetInsights.js");
const ex = (date, title, amount, categoryId = "food") => ({ id: `${date}-${title}`, date, title, amount, categoryId });

const list = [
  ex("2026-07-05", "사료 구독", 40000), ex("2026-08-05", "사료 구독", 42000), ex("2026-09-06", "사료 구독", 41000),
  ex("2026-08-20", "펫보험", 30000, "medical"), ex("2026-09-20", "펫보험", 30000, "medical"),
  ex("2026-09-03", "간식", 5000, "snack"), ex("2026-09-10", "간식", 5000, "snack"), ex("2026-09-25", "장난감", 12000, "toy"),
  ex("2026-10-02", "간식", 6000, "snack"), ex("2026-10-05", "사료 구독", 41000), ex("2026-10-08", "간식", 4000, "snack"),
  ex("2026-10-12", "중성화 수술", 350000, "medical"), ex("2026-10-25", "미래 지출", 1000, "snack"),
];

// 지난달 이맘때: 10/1~10/15 vs 9/1~9/15
const c = B.compareSameTime(list, "2026-10-15");
assert.equal(c.now, 6000 + 41000 + 4000 + 350000);
assert.equal(c.before, 5000 + 5000 + 41000);
assert.equal(c.hasPrev, true);
// 31일인데 지난달이 30일까지면 말일까지 비교
assert.equal(B.compareSameTime(list, "2026-10-31").before, 5000 + 5000 + 41000 + 30000 + 12000);

// 고정 지출: 3달 중 2달 이상 같은 이름 → 사료 구독(냈음), 펫보험(아직)
const fixed = B.detectFixed(list, "2026-10");
assert.deepEqual(fixed.map((f) => [f.title, f.paidThisMonth]), [["사료 구독", true], ["펫보험", false]]);
assert.equal(fixed[0].avg, 41000);
assert.equal(fixed[1].day, 20);
assert.ok(!fixed.some((f) => f.title === "장난감"), "한 번 산 건 고정 지출 아님");
assert.ok(fixed.some((f) => f.title === "사료 구독"));
// 간식은 9월에 2번이지만 한 달뿐 → 고정 아님
assert.ok(!fixed.some((f) => f.title === "간식"));

// 예상 지출: 3일 미만이면 없음, 아니면 지금까지 + 안 낸 고정(펫보험) + 변동 속도
assert.equal(B.projectMonth(list, "2026-10-02", fixed), null);
const p = B.projectMonth(list, "2026-10-15", fixed);
const variable = 6000 + 4000 + 350000;
assert.equal(p, Math.round(401000 + 30000 + (variable / 15) * 16));

// 큰 한 번짜리 지출(수술비)은 속도에서 빠짐
const line = B.bigExpenseThreshold(list);
assert.equal(B.projectMonth(list, "2026-10-15", fixed, line), Math.round(401000 + 30000 + (10000 / 15) * 16));

// 큰 지출: 기록 5개 미만이면 표시 안 함, 중앙값×3과 3만 원 중 큰 값
assert.equal(B.bigExpenseThreshold(list.slice(0, 4)), Infinity);
assert.equal(B.bigExpenseThreshold(list), Math.max(30000, 30000 * 3));

// 주별: 10월은 5주(29~31일), 미래 지출도 날짜대로 들어감
const w = B.weeklyTotals(list, "2026-10");
assert.equal(w.length, 5);
assert.deepEqual(w.map((x) => x.total), [6000 + 41000, 4000 + 350000, 0, 1000, 0]);
assert.deepEqual([w[4].from, w[4].to], [29, 31]);

// 자주 산 것: 2번 이상만
assert.deepEqual(B.topItems(list.filter((e) => e.date.startsWith("2026-10"))).map((x) => [x.title, x.count]), [["간식", 2]]);

// 카테고리 비교
const cc = B.categoryCompare(list, "2026-10", (id) => id);
assert.deepEqual(cc[0], { id: "medical", total: 350000, prev: 30000 });
assert.equal(cc.find((x) => x.id === "snack").prev, 10000);
// 카테고리 아이콘: 새 카테고리는 ico, 예전에 이모지로만 저장된 것도 알맞은 아이콘, 모르는 이모지는 지갑
globalThis.localStorage ||= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const E = await import("../src/services/expenses.js");
assert.equal(E.categoryIco({ emoji: "🏥" }), "stethoscope");
assert.equal(E.categoryIco({ emoji: "✂" }), "scissors", "변형 선택자 없는 이모지");
assert.equal(E.categoryIco({ emoji: "🦄" }), "wallet");
assert.equal(E.categoryIco({ emoji: "🏥", ico: "pill" }), "pill");
assert.ok(E.CATEGORY_CHOICES.every(([ico, emoji]) => ico && emoji));
assert.equal(E.categoryIco({ emoji: "🦴", ico: "cookie" }), "bone", "예전에 저장된 아이콘 이름");
assert.equal(E.categoryIco({ emoji: "🍚", ico: "utensils" }), "bowl");
console.log("가계부 분석 확인 통과");
