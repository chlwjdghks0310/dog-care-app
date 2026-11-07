// 10초 하루 체크 확인: npm test
import assert from "node:assert/strict";

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis;
const D = await import("../src/services/dailyCheck.js");
const R = await import("../src/services/records.js");
const { todayKey, toDateKey, addDays } = await import("../src/utils/date.js");
const today = todayKey();
const day = (n) => toDateKey(addDays(new Date(`${today}T00:00:00`), n));

// 모든 선택지의 기록 모양이 기록 검사를 통과한다
for (const item of D.ITEMS) for (const o of item.options) if (o.rec) {
  const err = R.validateRecord({ type: o.rec[0], at: `${day(-1)}T20:00`, data: o.rec[1], memo: `하루 체크: ${item.label} ${o.label}`, photos: [] });
  assert.equal(err, null, `${item.label} ${o.label}: ${err}`);
}

// 처음 쓰는 날엔 어제를 묻지 않는다
assert.equal(D.missedYesterday("a", today), null);
D.saveUsual("a", day(-3));
assert.equal(D.missedYesterday("a", today), day(-1)); // 전에 쓴 적 있고 어제 비었으면 묻는다
D.saveUnknown("a", day(-1));
assert.equal(D.missedYesterday("a", today), null);

// 다른 점 → 기존 기록으로, 같은 날 다시 저장하면 덮어쓰기(기록이 늘지 않음)
D.saveDiff("a", day(-2), { meal: "반 이상 남김" });
D.saveDiff("a", today, { meal: "조금 남김", stool: "피·검은 변" });
const n = R.getRecords("a").length;
D.saveDiff("a", today, { meal: "안 먹음", stool: "피·검은 변" });
assert.equal(R.getRecords("a").length, n);
assert.ok(R.getRecords("a").some((r) => r.memo === "하루 체크: 밥 안 먹음"));
assert.throws(() => D.saveDiff("a", today, {}), /하나 이상/);

// 신호: 피·검은 변은 바로 연락, 안 먹음은 물어볼 신호
const sig = D.signalsOf(D.getDay("a", today).picks);
assert.deepEqual(sig.red.map((x) => x.label), ["피·검은 변"]);
assert.deepEqual(sig.warn.map((x) => x.label), ["안 먹음"]);

// 연속: 어제가 '기억 안 나요'라 밥 연속은 오늘 하루뿐 → 2일 미만이면 안 보임
assert.equal(D.runsOf("a", today).length, 0);
D.saveDiff("a", day(-1), { meal: "조금 남김" });
assert.deepEqual(D.runsOf("a", today).map((r) => [r.item.id, r.days]), [["meal", 3]]);
// 산책 못 감은 연속으로 세지 않는다
D.saveDiff("b", day(-1), { walk: "못 감" });
D.saveDiff("b", today, { walk: "못 감" });
assert.equal(D.runsOf("b", today).length, 0);

// 이번 달 함께 본 날: '기억 안 나요'는 빼고
assert.equal(D.daysThisMonth("b", today), [day(-1), today].filter((d) => d.slice(0, 7) === today.slice(0, 7)).length);
// 병원용 기록 한 줄
assert.match(D.periodSummary("a", day(-30), today), /^하루 체크 \d+일 — 평소 \d+일 · 다른 날 \d+일\(밥 \d+, 변 1\)$/);
assert.equal(D.periodSummary("zz", day(-30), today), null);
// 다시 고르기: 체크와 체크로 만든 기록이 함께 지워진다
const before = R.getRecords("a").length;
D.clearDay("a", today);
assert.equal(D.getDay("a", today), null);
assert.equal(R.getRecords("a").length, before - 2);
console.log("하루 체크 OK");
