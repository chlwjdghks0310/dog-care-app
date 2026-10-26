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

// 예상 지출: 7일 미만이거나 이번 달 기록 10개 미만이면 없음, 아니면 지금까지 + 안 낸 고정(펫보험) + 변동 속도
assert.equal(B.projectMonth(list, "2026-10-15", fixed), null, "기록 4개면 예상 안 함");
const list10 = [...list, ...["09", 10, 11, 13, 14, 15].map((d) => ex(`2026-10-${d}`, `배변봉투${d}`, 1000, "supplies"))];
assert.equal(B.projectMonth(list10, "2026-10-06", fixed), null, "7일 전엔 예상 안 함");
const p = B.projectMonth(list10, "2026-10-15", fixed);
const variable = 6000 + 4000 + 350000 + 6000;
assert.equal(p, Math.round(407000 + 30000 + (variable / 15) * 16));

// 큰 한 번짜리 지출(수술비)은 속도에서 빠짐
const line = B.bigExpenseThreshold(list);
assert.equal(B.projectMonth(list10, "2026-10-15", fixed, line), Math.round(407000 + 30000 + (16000 / 15) * 16));

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

// 분류 이어받기·이름 찾기·용돈 이어받기·자주 쓰는 내역·검색
{
  const store = {};
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
  const E2 = await import("../src/services/expenses.js?v2");
  store["dogcare-expense-categories-v1"] = JSON.stringify([
    { id: "medical", name: "의료", emoji: "🏥" }, { id: "toy", name: "장난감", emoji: "🧸" }, { id: "snack", name: "우리간식", emoji: "🦴" }, { id: "cat-1", name: "교통", emoji: "🚗" },
  ]);
  const cats = E2.getCategories();
  assert.equal(cats.find((c) => c.id === "medical").name, "병원·치료", "안 고친 예전 이름은 새 이름으로");
  assert.equal(cats.find((c) => c.id === "snack").name, "우리간식", "사용자가 고친 이름은 그대로");
  assert.ok(!cats.some((c) => c.id === "toy"), "장난감은 용품으로 합침");
  assert.equal(E2.resolveCategoryId("toy"), "supplies");
  assert.ok(cats.some((c) => c.name === "미용·위생") && cats.some((c) => c.name === "교통"));
  assert.ok(cats.every((c) => c.color) && new Set(cats.map((c) => c.color)).size === cats.length, "분류마다 다른 색");
  E2.deleteCategory("insurance");
  assert.ok(!E2.getCategories().some((c) => c.id === "insurance"), "지운 기본 분류는 다시 안 생김");
  assert.equal(E2.findCategoryByName("의료")?.id, "medical");
  assert.equal(E2.findCategoryByName("예방")?.id, "prevent");
  assert.equal(E2.findCategoryByName("미용")?.id, "grooming");
  assert.equal(E2.findCategoryByName("자동차"), null, "없으면 null → 물어보기");
  assert.equal(E2.updateCategory("cat-1", { name: "이동" }).find((c) => c.id === "cat-1").name, "이동");

  E2.setAllowance("d", "2026-08", 100000);
  assert.equal(E2.getAllowance("d", "2026-10"), 100000, "빈 달은 이어받기");
  E2.setAllowance("d", "2026-10", 150000);
  assert.equal(E2.getAllowance("d", "2026-09"), 100000);
  E2.setAllowance("d", "2026-11", null);
  assert.equal(E2.getAllowance("d", "2026-12"), null, "지우면 이어받지 않음");

  const xs = [ex("2026-09-01", "로얄캐닌 3kg", 45000), ex("2026-10-01", "로얄캐닌3kg", 47000), ex("2026-10-02", "목욕", 20000, "grooming"), { ...ex("2026-10-03", "검진", 80000, "medical"), memo: "행복동물병원" }];
  assert.deepEqual(E2.quickItems(xs).map((q) => [q.title, q.amount, q.count]), [["로얄캐닌3kg", 47000, 2]]);
  assert.deepEqual(E2.searchExpenses(xs, "행복", () => "").map((e) => e.title), ["검진"]);
  assert.equal(E2.searchExpenses(xs, "사료", (id) => (id === "food" ? "사료" : "")).length, 2, "분류 이름으로도");
  console.log("가계부 분류·용돈·자주 쓰는 내역·검색 통과");
}

// 매달 나가는 돈(직접 등록): 등록일 이후 회차만, 말일 처리, 두 번 돌려도 하나
{
  const E3 = await import("../src/services/expenses.js?v3");
  E3.saveFixedExpense("fx", { title: "펫보험", amount: 32000, categoryId: "insurance", day: 31 }, "2026-08-20");
  E3.saveFixedExpense("fx", { title: "정기 사료", amount: 45000, categoryId: "food", day: 5 }, "2026-09-10");
  assert.equal(E3.applyFixedExpenses("fx", "2026-10-26"), 3, "보험 8·9월(말일), 사료 10월");
  assert.equal(E3.applyFixedExpenses("fx", "2026-10-26"), 0, "두 번 돌려도 그대로");
  assert.deepEqual(E3.getExpenses("fx").map((e) => `${e.date} ${e.title}`).sort(), ["2026-08-31 펫보험", "2026-09-30 펫보험", "2026-10-05 정기 사료"]);
  assert.equal(E3.applyFixedExpenses("fx", "2026-10-31"), 1, "10/31 보험");
  // 저절로 기록된 걸 지우면 그 달은 다시 안 생김
  const oct = E3.getExpenses("fx").find((e) => e.date === "2026-10-31");
  E3.deleteExpense("fx", oct.id);
  assert.equal(E3.applyFixedExpenses("fx", "2026-10-31"), 0, "지운 달은 건너뜀");
  // 등록 전에 같은 달에 직접 적었으면 다시 안 적음
  E3.addExpense("fx2", { title: "정기 사료", amount: 45000, date: "2026-10-03", categoryId: "food" });
  E3.saveFixedExpense("fx2", { title: "정기사료", amount: 45000, categoryId: "food", day: 20 }, "2026-10-10");
  assert.equal(E3.applyFixedExpenses("fx2", "2026-10-26"), 0, "이번 달은 이미 직접 적음");
  console.log("매달 나가는 돈 등록 통과");
}
