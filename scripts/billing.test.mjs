// 결제 계산 확인: npm test — 견적(플러스 할인·포함 캐릭터·배지 할인), 중도 해지 환불(사용자 11/20 정책), 달 계산, 한글 금액
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o?.detail; } };
const B = await import("../src/services/billing.js");

// 견적
let q = B.quote({ items: ["plus_year"] });
assert.equal(q.total, 38900); assert.ok(q.lines.some((l) => l.included && l.title === "기본 캐릭터 1번"), "연간엔 기본 캐릭터 포함 줄");
assert.equal(q.totalKorean, "삼만팔천구백");
q = B.quote({ items: ["plus_month"] }); assert.equal(q.total, 3900); assert.ok(!q.lines.some((l) => l.included));
q = B.quote({ items: ["char_basic", "char_style"] }); assert.equal(q.total, 4900 + 3900, "단품 + 그림체 추가 정가");
q = B.quote({ items: ["char_basic", "char_style"], plus: true }); assert.equal(q.total, 4900 + 2900, "플러스면 그림체 추가 할인");
q = B.quote({ items: ["char_premium"], stampDiscount: true }); assert.equal(q.total, 9900 - 2000, "배지 할인권은 정성에만");
q = B.quote({ items: ["char_basic"], stampDiscount: true }); assert.equal(q.total, 4900, "기본엔 배지 할인 없음");
q = B.quote({ items: ["nope"] }); assert.equal(q.total, 0);

// 달 계산: 시작한 달은 1, 새 달에 하루라도 들어가면 +1
assert.equal(B.monthsUsed("2026-11-20T10:00:00", new Date("2026-11-20T12:00:00")), 1);
assert.equal(B.monthsUsed("2026-11-20T10:00:00", new Date("2026-12-19T12:00:00")), 1);
assert.equal(B.monthsUsed("2026-11-20T10:00:00", new Date("2026-12-20T12:00:00")), 2);
assert.equal(B.monthsUsed("2026-11-20T10:00:00", new Date("2027-02-10T12:00:00")), 3);
assert.equal(B.monthsUsed("2026-11-20T10:00:00", new Date("2026-11-01T12:00:00")), 1, "시계가 거꾸로 가도 1");
assert.equal(B.addMonthsClamp("2026-01-31T09:00:00", 1).slice(0, 10), new Date(2026, 1, 28, 9).toISOString().slice(0, 10), "1/31 + 1달 = 2/28");
assert.equal(B.addMonthsClamp("2026-11-20T09:00:00", 12).slice(0, 10), new Date(2027, 10, 20, 9).toISOString().slice(0, 10));

// 환불(11/20 정책): 연간 = 38,900 − 쓴 달 × 3,900 − (캐릭터 만들었으면 4,900), 위약금 없음
let r = B.refundOnCancel({ planId: "plus_year", startedAt: "2026-11-20T10:00:00", now: new Date("2027-02-10"), characterMade: true });
assert.deepEqual([r.used, r.refund], [3, 38900 - 3 * 3900 - 4900], "3달 쓰고 캐릭터 만듦 → 22,300");
r = B.refundOnCancel({ planId: "plus_year", startedAt: "2026-11-20T10:00:00", now: new Date("2026-11-25"), characterMade: false });
assert.deepEqual([r.used, r.refund], [1, 38900 - 3900], "첫 달 안 → 35,000");
r = B.refundOnCancel({ planId: "plus_year", startedAt: "2026-11-20T10:00:00", now: new Date("2027-11-10"), characterMade: true });
assert.equal(r.refund, 0, "12달 쓰면 0(음수 아님)");
r = B.refundOnCancel({ planId: "plus_month", startedAt: "2026-11-20T10:00:00", now: new Date("2026-11-25") });
assert.equal(r.refund, 0); assert.equal(r.usableUntil, "2026-12-20");
assert.equal(B.refundOnCancel({ planId: "char_basic", startedAt: "2026-11-20" }), null);

// 한글 금액
assert.equal(B.koreanNumber(3900), "삼천구백"); assert.equal(B.koreanNumber(9900), "구천구백"); assert.equal(B.koreanNumber(10000), "일만"); assert.equal(B.koreanNumber(120500), "십이만오백"); assert.equal(B.koreanNumber(0), "영");

// 베타 장부: 두 번 적어도 한 번
B.recordBetaPlus("d1", "MC-PLUS-A7KQ"); B.recordBetaPlus("d1", "MC-PLUS-A7KQ");
const b = B.getBilling("d1");
assert.equal(b.plan.source, "beta"); assert.equal(b.orders.length, 1); assert.equal(b.orders[0].total, 0);
assert.ok(!b.orders[0].items[0].title.includes("A7KQ"), "코드 전체는 장부에 남기지 않음");
assert.equal(B.BILLING_OPEN, false, "사업자등록 전엔 잠김");
const sc = await B.startCheckout({ dogId: "d1", items: ["plus_year"] }); assert.deepEqual(sc, { open: false });
console.log("billing ok");
