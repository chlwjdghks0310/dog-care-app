// 스탬프 상품 확인: npm test — 7일 연속 = 배지, 끊기면 다시, 14일이면 2개, 배지 5개 = 부가 동작 1편(받기 1번), 10개 = 할인
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis;
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const day = (base, n) => { const d = new Date(`${base}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }; // 현지 날짜(서비스와 같은 기준)
const T = "2026-11-19";
const mk = (offsets) => Object.fromEntries(offsets.map((n) => [day(T, n), { status: "usual" }]));
const { badgesOf, rewardsOf, claimExtra, badgeEarnedToday } = await import("../src/services/stamps.js");

set("dogcare-daily-check-v1", { d1: mk([-6, -5, -4, -3, -2, -1, 0]) });
let b = badgesOf("d1", T);
assert.deepEqual(b, { badges: [T], streak: 7, toNext: 7 }, "7일 연속 → 오늘 배지 1개, 다음은 7일 더");
assert.ok(badgeEarnedToday("d1", T));

set("dogcare-daily-check-v1", { d1: mk([-6, -5, -4, -3, -2, -1]) }); // 오늘 아직 안 찍음
b = badgesOf("d1", T);
assert.deepEqual(b, { badges: [], streak: 6, toNext: 1 }, "어제까지 6일 → 오늘 찍으면 배지");

set("dogcare-daily-check-v1", { d1: mk([-9, -8, -7, -5, -4, -3, -2, -1, 0]) }); // 6일 전 빠짐
b = badgesOf("d1", T);
assert.deepEqual(b, { badges: [], streak: 6, toNext: 1 }, "중간에 빠지면 다시 센다(벌점 없음)");

set("dogcare-daily-check-v1", { d1: mk(Array.from({ length: 15 }, (_, i) => -i)) }); // 15일 연속
b = badgesOf("d1", T);
assert.equal(b.badges.length, 2, "14일 연속이면 배지 2개"); assert.equal(b.streak, 15); assert.equal(b.toNext, 6);

set("dogcare-daily-check-v1", { d1: mk(Array.from({ length: 36 }, (_, i) => -i)) }); // 36일 연속 → 배지 5
let r = rewardsOf("d1", T);
assert.equal(r.badges, 5); assert.equal(r.extrasEarned, 1); assert.equal(r.extrasLeft, 1); assert.equal(r.discount, false); assert.equal(r.toDiscount, 5);
claimExtra("d1");
r = rewardsOf("d1", T);
assert.equal(r.extrasLeft, 0, "받으면 남은 편수 0"); assert.equal(r.extrasEarned, 1);

set("dogcare-daily-check-v1", { d1: mk(Array.from({ length: 70 }, (_, i) => -i)) }); // 70일 → 배지 10
r = rewardsOf("d1", T);
assert.equal(r.badges, 10); assert.equal(r.extrasEarned, 2); assert.equal(r.extrasLeft, 1, "두 번째 편은 아직 안 받음"); assert.equal(r.discount, true);

set("dogcare-daily-check-v1", {});
assert.deepEqual(badgesOf("d1", T), { badges: [], streak: 0, toNext: 7 }, "기록 없음");
console.log("stamps ok");
