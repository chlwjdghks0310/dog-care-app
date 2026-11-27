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
assert.deepEqual(b, { badges: [day(T, -2)], streak: 9, toNext: 5 }, "하루 빠진 날은 쉬는 날로 넘어간다 — 배지는 실제 체크 7번째 날");

// 11/27 쉬는 날 규칙
const { streakOf } = await import("../src/services/stamps.js");
const at = (offs) => { set("dogcare-daily-check-v1", { d1: mk(offs) }); return streakOf("d1", T); };
let k = at([-9, -8, -7, -5, -4, -3, -2, -1, 0]);
assert.deepEqual(k.rest, [day(T, -6)], "쉬는 날 하루"); assert.equal(k.best, 9); assert.equal(k.pending, false); assert.equal(k.checkedToday, true);
k = at([-5, -4, -1, 0]); // 이틀 연속 빠짐 → 다시 센다
assert.equal(k.streak, 2, "이틀 빠지면 다시 1일째부터"); assert.deepEqual(k.rest, []); assert.equal(k.best, 2);
k = at([-6, -5, -3, -2, 0]); // 7일 안에 두 번 빠짐 → 두 번째는 못 넘어간다
assert.deepEqual(k.rest, [day(T, -4)], "쉬는 날은 7일 안에 한 번만"); assert.equal(k.streak, 1); assert.equal(k.best, 4);
k = at([-10, -9, -7, -6, -5, -4, -3, -2, 0]); // 쉬는 날 두 번이 7일 넘게 떨어져 있으면 둘 다 된다
assert.deepEqual(k.rest, [day(T, -8), day(T, -1)], "7일 지나면 다시 쉴 수 있다"); assert.equal(k.streak, 9);
k = at([-4, -3, -2]); // 어제 빠졌고 오늘 아직 → 이어질 수 있음
assert.equal(k.streak, 3); assert.equal(k.pending, true, "오늘 체크하면 이어진다"); assert.deepEqual(k.rest, [], "쉬는 날은 지나고 나서만 표시"); assert.equal(k.checkedToday, false);
k = at([-5, -4, -3]); // 이틀 빠지고 오늘 아직 → 끊김, 최고 기록은 남는다
assert.equal(k.streak, 0); assert.equal(k.pending, false); assert.equal(k.best, 3, "끊겨도 최고 기록은 남는다");
k = at([-3, -2, -1]); // 오늘만 아직
assert.equal(k.streak, 3); assert.equal(k.pending, false);
k = at([0]); assert.equal(k.streak, 1); assert.equal(k.best, 1);
k = at([-1, 1]); assert.equal(k.streak, 1, "내일 날짜 기록은 세지 않는다");
// 새 규칙으로 숫자가 줄어드는 일은 없다: 아무 기록이나 30가지를 옛 규칙(빠지면 0)과 견준다
for (let seed = 1; seed <= 30; seed++) { let x = seed * 9973; const offs = []; for (let i = -60; i <= 0; i++) { x = (x * 1103515245 + 12345) % 2147483648; if (x % 10 < 7) offs.push(i); }
  let run = 0, old = 0; for (let i = -60; i <= 0; i++) { if (offs.includes(i)) { run++; if (run % 7 === 0) old++; } else if (i !== 0) run = 0; }
  const n = at(offs); assert.ok(n.badges.length >= old, `seed ${seed}: 배지 ${n.badges.length} < 옛 ${old}`); assert.ok(n.streak >= run, `seed ${seed}: 이어진 날 ${n.streak} < 옛 ${run}`); }


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
{ const { restHint } = await import("../src/services/stamps.js");
  set("dogcare-daily-check-v1", { d1: mk([-4, -3, -2]) }); assert.match(restHint("d1", T), /오늘 체크하면/);
  set("dogcare-daily-check-v1", { d1: mk([-9, -8, -7, -6]) }); assert.match(restHint("d1", T), /가장 길게 이어진 건 4일/);
  set("dogcare-daily-check-v1", { d1: mk([-2, -1, 0]) }); assert.equal(restHint("d1", T), "", "오늘 했으면 없음");
  set("dogcare-daily-check-v1", { d1: mk([-2, -1]) }); assert.equal(restHint("d1", T), "", "이어지는 중이면 없음");
  console.log("stamps 말풍선 한 줄 ok"); }
