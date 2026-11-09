// 퍼피 첫 100일: 과제표 모양과 진행 규칙(놓친 날 이어 가기·🔁·건너뛰기·주간 체크·숨기기·알림 한 줄)
import assert from "node:assert/strict";
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k), clear: () => store.clear(), key: (i) => [...store.keys()][i], get length() { return store.size; } };

const { WEEKS, STEPS, URGENT, OUT_NOTE } = await import("../src/data/puppy100.js");
const P = await import("../src/services/puppy100.js");

// 과제표: 14주 × (과제 6 + 체크 1) = 98단계, 과제마다 이유 한 줄 + 3단계, 체크는 3문항(졸업 10문항)
assert.equal(WEEKS.length, 14);
assert.equal(STEPS.length, 98);
for (const w of WEEKS) {
  assert.equal(w.tasks.length, 6, w.title);
  for (const t of w.tasks) {
    assert.ok(t.t && t.why && t.why.length < 60, `이유는 한 줄: ${t.t}`);
    assert.equal(t.s.length, 3, `3단계: ${t.t}`);
    assert.ok(t.s.every((x) => x.length <= 45), `단계는 짧게: ${t.t}`);
  }
  assert.equal(w.test.length, w.graduation ? 10 : 3, w.title);
}
assert.equal(new Set(STEPS.map((s) => s.id)).size, 98, "단계 id 겹침 없음");
assert.deepEqual(URGENT.map((u) => u.id), ["bark", "bite", "potty"]);
for (const u of URGENT) assert.ok(u.s.length === 3 && u.no.length && u.vet, `급한 고민 ${u.label}: 3단계·하지 말 것·병원/전문가 기준`);
assert.ok(STEPS.some((s) => s.out) && OUT_NOTE.includes("접종"));

const dog = { id: "p", name: "여름", birthDate: "2026-07-01" };
const day = (n) => new Date(Date.UTC(2026, 10, 1 + n)).toISOString().slice(0, 10);

// 보이는 강아지: 1살 아래 / 생일 모름 / 이미 시작함. 1살 넘고 시작 안 했으면 안 보임
assert.equal(P.eligible(dog, day(0)), true);
assert.equal(P.eligible({ id: "old", birthDate: "2020-01-01" }, day(0)), false);
assert.equal(P.eligible({ id: "nob" }, day(0)), true);

// 첫날: 1주차 첫 과제, 알림 한 줄
let st = P.state("p", day(0));
assert.equal(st.step.id, "w1-1");
assert.equal(st.doneToday, false);
assert.match(P.alarmLine([dog], day(0)), /오늘의 5분: "좋아!" 충전/);

// 🐾 → 오늘은 접힘·알림 없음, 내일은 다음 과제
P.mark("p", "w1-1", "done", day(0));
assert.equal(P.state("p", day(0)).doneToday, true);
assert.equal(P.alarmLine([dog], day(0)), null, "오늘 했으면 알림 줄 없음");
assert.equal(P.state("p", day(1)).step.id, "w1-2");

// 🔁 → 오늘 접힘, 내일 같은 과제
P.mark("p", "w1-2", "again", day(1));
assert.equal(P.state("p", day(1)).againToday, true);
assert.equal(P.state("p", day(2)).step.id, "w1-2");

// 이미 잘해요 → 바로 다음 과제(오늘 몫은 그대로 남음)
P.mark("p", "w1-2", "skip", day(2));
st = P.state("p", day(2));
assert.equal(st.step.id, "w1-3");
assert.equal(st.doneToday, false);

// 놓친 날: 5일 쉬어도 멈춘 자리에서, 알림은 부드러운 문구
assert.equal(P.state("p", day(7)).step.id, "w1-3");
assert.match(P.alarmLine([dog], day(7)), /바쁜 날도 있죠/);

// 주간 체크까지 가기 → 1개만 됐으면 다시 하기 → 그 주 처음부터
for (const id of ["w1-3", "w1-4", "w1-5", "w1-6"]) P.mark("p", id, "done", day(8));
st = P.state("p", day(9));
assert.equal(st.step.kind, "test");
assert.deepEqual(st.weekPaws, [true, true, true, true, true, true]);
assert.match(P.alarmLine([dog], day(9)), /1주차 체크/);
P.retryWeek("p", 1, day(9));
assert.equal(P.state("p", day(10)).step.id, "w1-1", "이번 주 한 번 더");
for (const s of STEPS.filter((x) => x.week === 1 && x.kind === "task")) P.mark("p", s.id, "done", day(10));
P.finishTest("p", "w1-test", 3, day(11));
assert.equal(P.state("p", day(11)).doneToday, true);
assert.equal(P.state("p", day(12)).step.id, "w2-1", "통과 → 2주차");
assert.equal(P.passLine(STEPS.find((s) => s.id === "w14-test")), 8);

// 다 끝나면 finished, 알림 없음
for (const s of STEPS) if (s.kind === "task") P.mark("p", s.id, "skip", day(20)); else P.finishTest("p", s.id, 3, day(20));
assert.equal(P.state("p", day(21)).finished, true);
assert.equal(P.alarmLine([dog], day(21)), null);

// 숨기기·다시 보이기, 시작한 1살 넘은 강아지도 계속 보임
P.setHidden("p", true);
assert.equal(P.eligible(dog, day(0)), false);
P.setHidden("p", false);
assert.equal(P.eligible(dog, day(0)), true);
P.mark("old", "w1-1", "done", day(0));
assert.equal(P.eligible({ id: "old", birthDate: "2020-01-01" }, day(0)), true);

console.log("퍼피 100일 OK");
