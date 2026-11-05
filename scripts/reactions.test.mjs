// 기록 반응 문구 확인: node --experimental-loader ./scripts/resolve-extensionless-loader.mjs scripts/reactions.test.mjs
// localStorage 없이 돌린다 — 셔플 백이 메모리로 동작하는지도 함께 본다
import assert from "node:assert/strict";
const { reactionFor, reactionContext, LINES, CALM, TIPS, CALM_TIPS, TIME_LINES, STREAK_LINES, FIRST_LINES } = await import("../src/data/recordReactions.js");

// 문구 수 — 일반 300개 이상, 자주 쓰는 종류 30개, 나머지 15개, 걱정 묶음 12개
const total = Object.values(LINES).reduce((n, l) => n + l.length, 0);
assert.ok(total >= 300, `일반 문구 ${total}개`);
for (const [k, l] of Object.entries(LINES)) assert.ok(l.length >= (["meal", "potty", "daily:산책"].includes(k) ? 30 : 15), `${k} ${l.length}개`);
for (const [k, l] of Object.entries(CALM)) assert.ok(l.length >= 12, `걱정 ${k} ${l.length}개`);
for (const [k, l] of Object.entries(TIPS)) assert.ok(l.length >= (/^(meal|potty|daily:산책)$/.test(k) ? 10 : 6), `팁 ${k} ${l.length}개`);
for (const [k, l] of Object.entries(CALM_TIPS)) {
  assert.ok(l.length >= 6, `걱정 팁 ${k}`);
  for (const t of l) assert.match(t, /병원/, `걱정 팁엔 병원 안내: ${t}`);
}
// 한 줄은 40자 이하, 같은 묶음 안에 중복 없음
const all = [...Object.values(LINES), ...Object.values(CALM), ...Object.values(TIME_LINES), STREAK_LINES, FIRST_LINES];
for (const l of all) {
  assert.equal(new Set(l).size, l.length, `중복 문구: ${l.find((x, i) => l.indexOf(x) !== i)}`);
  for (const s of l) assert.ok([...s.replace(/\{\w+\}/g, "00")].length <= 40, `40자 넘음: ${s}`);
}

// 셔플 백 — 묶음 크기만큼 연속으로 받으면 모두 다르고, 다시 섞은 첫 문구는 직전 것과 다르다(at 없으면 시간대 문구 안 섞임)
const meal = { type: "meal", data: { appetite: "평소" } };
const n = LINES.meal.length;
const got = Array.from({ length: n }, () => reactionFor(meal).line);
assert.equal(new Set(got).size, n);
for (let round = 0; round < 20; round++) {
  const next = Array.from({ length: n }, () => reactionFor(meal).line);
  assert.equal(new Set(next).size, n);
  assert.notEqual(next[0], got.at(-1));
  got.splice(0, n, ...next);
}

// 걱정 기록 — concern:true, 차분한 묶음에서, 팁엔 병원 안내
const cases = [
  [{ type: "symptom", data: { kinds: ["구토"] } }, "symptom"],
  [{ type: "meal", data: { appetite: "평소보다 적음" } }, "meal"],
  [{ type: "potty", data: { stool: "설사" } }, "potty"],
  [{ type: "potty", data: { stool: "정상", stoolSigns: ["점액"] } }, "potty"],
  [{ type: "potty", data: { stool: "정상", stoolColor: "검은색" } }, "potty"],
  [{ type: "potty", data: { stool: "정상", flags: ["무엇"] } }, "potty"],
  [{ type: "condition", data: { check: { energy: "많이 다름" } } }, "condition"],
  [{ type: "condition", data: { activity: "평소", flags: ["x"] } }, "condition"],
];
for (const [rec, k] of cases) {
  for (let i = 0; i < 15; i++) {
    const r = reactionFor({ ...rec, at: "2026-11-07T08:00" }, { streak: 5, first: true, dogName: "초코" });
    assert.equal(r.concern, true);
    assert.ok(CALM[k].includes(r.line), `차분한 문구 아님: ${r.line}`);
    assert.match(r.tip, /병원/);
  }
}
assert.match(reactionFor({ type: "potty", data: { photoFlags: ["피"] } }).tip, /사진/);
// 평범한 기록은 걱정 아님
assert.ok(!reactionFor({ type: "potty", data: { stool: "정상", stoolColor: "갈색", stoolSigns: [] } }).concern);
assert.ok(!reactionFor({ type: "condition", data: { check: { energy: "조금 다름" } } }).concern);

// 연속 기록 — 숫자가 들어간다(무작위를 0으로 고정해 연속 문구가 나오게)
const rnd = Math.random;
Math.random = () => 0;
const s = reactionFor({ type: "daily", at: "2026-11-04T08:00", data: { kind: "산책" } }, { streak: 3 });
assert.match(s.line, /3/);
Math.random = rnd;
// 첫 기록 문구, 이름 넣기
const firstLine = reactionFor({ type: "daily", data: { kind: "산책" } }, { first: true }).line; // 한 번만 뽑는다(some 안에서 부르면 매번 새로 뽑힘)
assert.ok(FIRST_LINES.some((l) => l.replace("{what}", "산책") === firstLine));
const named = Array.from({ length: LINES.meal.length }, () => reactionFor(meal, { dogName: "초코" }).line);
assert.ok(named.includes("초코는 배불러! *배 통통*"));
assert.ok(!named.some((l) => l.includes("{")));

// 상황 계산 — 오늘까지 이어진 날 수, 첫 기록 여부
const walk = (id, at) => ({ id, type: "daily", at, data: { kind: "산책" } });
const list = [walk("a", "2026-11-02T09:00"), walk("b", "2026-11-03T09:00"), walk("c", "2026-11-04T09:00"), walk("d", "2026-11-04T19:00"), { id: "e", type: "meal", at: "2026-11-01T09:00", data: {} }];
assert.deepEqual(reactionContext(list[3], list), { first: false, streak: 3 });
assert.deepEqual(reactionContext(list[4], list), { first: true, streak: 1 });

// 모든 종류가 빈칸 없는 문구와 팁을 돌려준다
const recs = [
  { type: "weight", measuredAt: "2026-11-04T07:00", data: { weightKg: 3 } }, { type: "med", data: {} }, { type: "vet", data: {} },
  { type: "condition", data: { activity: "평소" } }, { type: "media", data: {} }, { type: "vital", data: {} }, { type: "unknown", data: {} },
  ...["산책", "간식", "미용·목욕", "양치", "놀이", "기타", "없는종류"].map((kind) => ({ type: "daily", data: { kind } })),
  ...["예방접종", "질환·수술", "기념일", "특별한 일", "추억"].map((kind) => ({ type: "life", data: { kind } })),
  ...cases.map(([r]) => r),
];
for (const rec of recs) {
  for (const at of [undefined, "2026-11-07T06:00", "2026-11-04T13:00", "2026-11-04T18:00", "2026-11-04T23:30"]) {
    const r = reactionFor({ ...rec, at }, { streak: 4, dogName: "여름" });
    assert.ok(r.line && r.tip, `${rec.type} 빈칸`);
    assert.ok(!r.line.includes("{"), r.line);
  }
}
// 질환·수술은 축하 없이 조용하게
assert.equal(reactionFor({ type: "life", data: { kind: "질환·수술" } }, { first: true }).quiet, true);

console.log(`기록 반응 OK — 일반 ${total}개, 걱정 ${Object.values(CALM).reduce((n, l) => n + l.length, 0)}개`);
