// 이 달의 상장: npm test — 누구나 받는다, 특별한 달이 먼저, 연달아 같은 상 없음, 문장에 호칭·건강 얘기 없음, 끝난 달은 고정
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis;
const { AWARDS, SEASONAL, FUN, chooseAward, lineOf, awardFor } = await import("../src/services/monthAward.js");

const zero = { m: 11, days: 26, walkDays: 0, walkMin: 0, check: 0, streaks: 0, records: 0, together: 76, ageMonths: 30 };
// ① 아무 기록이 없어도 상을 받는다(열두 달 모두)
for (let m = 1; m <= 12; m++) { const a = chooseAward({ ...zero, m }, [], "d1"); assert.ok(a?.name?.endsWith("상"), `${m}월`); }
// ② 특별한 달이 기록 상보다 먼저
assert.equal(chooseAward({ ...zero, walkDays: 25, birthday: true }).id, "birthday");
assert.equal(chooseAward({ ...zero, walkDays: 25, hundred: 100 }).id, "hundred");
assert.equal(chooseAward({ ...zero, walkDays: 25 }).id, "walk-master");
assert.equal(chooseAward({ ...zero, walkDays: 12 }).id, "walk-hard");
assert.equal(chooseAward({ ...zero, check: 26 }).id, "perfect");
// ③ 최근 받은 상은 건너뛴다 → 다음으로 받을 수 있는 상
assert.equal(chooseAward({ ...zero, walkDays: 25, check: 26 }, ["walk-master"]).id, "walk-hard");
assert.equal(chooseAward({ ...zero, walkDays: 25, check: 26 }, ["walk-master", "walk-hard", "explorer"]).id, "perfect");
// ④ 기록 없는 달이 이어져도 석 달 안에는 같은 상이 안 나온다
{ const got = []; for (let i = 0; i < 12; i++) { const a = chooseAward({ ...zero, m: (i % 12) + 1 }, got.slice().reverse(), "d1"); assert.ok(!got.slice(-3).includes(a.id), `${i}번째 ${a.id}`); got.push(a.id); } }
// ⑤ 모든 문장: 서너 개씩, 숫자가 undefined·NaN이 아니고, 호칭·건강 낱말이 없다
const f = { m: 11, days: 26, walkDays: 18, walkMin: 900, check: 22, streaks: 3, records: 64, together: 176, ageMonths: 5, hundred: 100 };
const all = [...AWARDS, ...Object.values(SEASONAL), ...FUN];
assert.ok(all.length >= 35, `상 ${all.length}개`);
assert.equal(new Set(all.map((a) => a.id)).size, all.length, "id 중복");
assert.equal(new Set(all.map((a) => a.name)).size, all.length, "이름 중복");
for (const a of all) {
  assert.ok(a.lines.length >= 3 && a.lines.length <= 4, `${a.name} 문장 ${a.lines.length}개`);
  for (const fn of a.lines) { const t = fn(f);
    assert.ok(!/undefined|NaN|null/.test(t), `${a.name}: ${t}`);
    assert.ok(!/아빠|엄마|언니|오빠|누나|형아|집사|보호자/.test(t), `호칭: ${t}`);
    assert.ok(!/건강|튼튼|아프|병원|살쪘|살이 |체중|몸무게|kg|먹보/.test(t), `건강 낱말: ${t}`);
    assert.ok((t.match(/\d+/g) || []).length <= 1, `숫자 둘 이상: ${t}`);
    assert.ok(t.length <= 28, `길다(${t.length}): ${t}`); }
}
// ⑥ 끝난 달은 저장해서 고정, 이번 달(keep:false)은 저장하지 않는다
const a1 = awardFor("d1", "2026-10", { ...zero, m: 10, walkDays: 12 });
assert.equal(awardFor("d1", "2026-10", { ...zero, m: 10, walkDays: 0 }).id, a1.id, "끝난 달 고정");
awardFor("d1", "2026-11", { ...zero, walkDays: 12 }, { keep: false });
assert.ok(!JSON.parse(store["dogcare-month-award-v1"]).d1["2026-11"], "이번 달은 저장 안 함");
assert.notEqual(awardFor("d1", "2026-11", { ...zero, walkDays: 12 }, { keep: false }).id, a1.id, "지난달과 다른 상");
assert.equal(lineOf(AWARDS.find((a) => a.id === "walk-hard"), f, "d1"), lineOf(AWARDS.find((a) => a.id === "walk-hard"), f, "d1"), "같은 달엔 같은 문장");
console.log(`month-award ok (상 ${all.length}개)`);
