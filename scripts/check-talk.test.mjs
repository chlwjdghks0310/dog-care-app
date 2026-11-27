// 여름이가 챙겨 주는 하루 체크(11/26): 묻는 말 · 오늘 기록으로 채우기 · 마친 뒤 한마디
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis; globalThis.dispatchEvent = () => {}; globalThis.CustomEvent = class { constructor(t, o) { this.type = t; Object.assign(this, o); } };
const T = "2026-11-26", Y = "2026-11-25";
const { askFor, picksFromRecords, pickRemark, remarkFor } = await import("../src/services/checkTalk.js");
const dc = await import("../src/services/dailyCheck.js");
const { getRecords } = await import("../src/services/records.js");
const rec = (id, type, at, data, memo = "") => ({ id, type, at, data, memo, photos: [] });

// 1) 아무 일 없던 날: 지금 그대로
let a = askFor("d1", T, []);
assert.equal(a.kind, "plain"); assert.equal(a.text, "오늘 나 어땠어?"); assert.equal(a.usual, "평소와 같아요"); assert.equal(a.again, undefined);

// 2) 어제 한 가지가 달랐던 날: 그걸 기억하고 묻는다
dc.saveDiff("d1", Y, { meal: "조금 남김" });
a = askFor("d1", T, []);
assert.equal(a.kind, "yesterday"); assert.equal(a.text, "나 어제 밥을 조금 남겼잖아. 오늘은 어땠어?");
assert.deepEqual([a.usual, a.again.label, a.more.label], ["평소로 돌아왔어", "또 남겼어", "다른 것도 있었어"]);
assert.deepEqual(a.again.picks, { meal: "조금 남김" }); assert.deepEqual(a.more.initial, { meal: "조금 남김" });
dc.saveDiff("d2", Y, { stool: "무름" });
assert.equal(askFor("d2", T, []).text, "나 어제 변이 물렀잖아. 오늘은 어땠어?"); assert.equal(askFor("d2", T, []).again.label, "오늘도 그랬어");

// 3) 어제 여러 가지: 묶어서 묻는다(조사 맞춤). 산책 "못 감"은 이상 신호가 아니라 묻지 않는다
dc.saveDiff("d3", Y, { meal: "안 먹음", stool: "설사", walk: "못 감" });
a = askFor("d3", T, []);
assert.equal(a.text, "어제 밥이랑 변이 달랐잖아. 오늘은 어땠어?"); assert.equal(a.again.label, "아직 그래"); assert.deepEqual(Object.keys(a.again.picks), ["meal", "stool"]);
dc.saveDiff("d4", Y, { walk: "짧게만" });
assert.equal(askFor("d4", T, []).kind, "plain");
dc.saveDiff("d5", Y, { energy: "덜 놂", water: "많이 마심", etc: "긁음·핥음" });
assert.equal(askFor("d5", T, []).text, "어제 여러 가지가 달랐잖아. 오늘은 어땠어?");

// 4) 오늘 직접 적은 기록이 있으면 그게 먼저(어제 기억보다)
const recs = [
  rec("m1", "meal", `${T}T13:00`, { kind: "dry", amount: 30, appetite: "평소보다 적음" }),
  rec("p1", "potty", `${T}T14:10`, { stool: "무름", urine: "정상" }),
  rec("w1", "daily", `${T}T18:00`, { kind: "산책", minutes: 40 }),
  rec("s0", "symptom", `${Y}T09:00`, { kinds: ["구토"] }), // 어제 것은 안 본다
  rec("x1", "meal", `${T}T19:00`, { appetite: "평소보다 적음" }, "하루 체크: 밥 조금 남김"), // 하루 체크가 만든 기록은 뺀다
];
const p = picksFromRecords(recs, T);
assert.deepEqual(p.picks, { meal: "조금 남김", stool: "무름" }); assert.deepEqual(p.from.map((f) => [f.id, f.time]), [["m1", "13:00"], ["p1", "14:10"]]);
a = askFor("d1", T, recs);
assert.equal(a.kind, "records"); assert.equal(a.text, "오늘 적은 걸 보니 밥을 조금 남겼고 변이 물렀네. 이대로 체크해 둘까?");
assert.equal(a.usual, undefined); assert.deepEqual([a.again.label, a.more.label], ["응, 이대로", "더 있어"]); assert.deepEqual(a.again.noRec, ["meal", "stool"]);
assert.deepEqual(picksFromRecords([rec("s1", "symptom", `${T}T08:00`, { kinds: ["구토", "기침"], repeat: "자주" })], T).picks, { vomit: "여러 번 토함" }); // 항목마다 하나
assert.deepEqual(picksFromRecords([rec("n1", "meal", `${T}T08:00`, { appetite: "평소" }), rec("n2", "potty", `${T}T09:00`, { stool: "정상" })], T).picks, {}); // 평소 기록은 다른 점이 아니다

// 5) 기록에서 가져온 선택은 기록을 또 만들지 않고, [다시 고르기]가 원래 기록을 지우지 않는다
localStorage.setItem("dogcare-records-v1", JSON.stringify({ d9: [recs[0], recs[1]] }));
dc.saveDiff("d9", T, { meal: "조금 남김", stool: "무름" }, { noRec: { meal: "조금 남김", stool: "무름" } });
assert.equal(getRecords("d9").length, 2); assert.deepEqual(dc.getDay("d9", T).recIds, {});
dc.saveDiff("d9", T, { meal: "조금 남김", stool: "무름", vomit: "토함" }); // [다른 것도 적기]로 하나 더: 그것만 기록이 생긴다
assert.equal(getRecords("d9").length, 3); assert.deepEqual(Object.keys(dc.getDay("d9", T).recIds), ["vomit"]);
dc.saveDiff("d9", T, { meal: "반 이상 남김", stool: "무름", vomit: "토함" }); // 가져온 선택을 바꾸면 평소처럼 기록을 만든다
assert.equal(getRecords("d9").length, 4); assert.deepEqual(Object.keys(dc.getDay("d9", T).recIds).sort(), ["meal", "vomit"]);
dc.clearDay("d9", T);
assert.deepEqual(getRecords("d9").map((r) => r.id).sort(), ["m1", "p1"]); // 보호자의 원래 기록은 남는다
assert.equal(dc.runsOf("d1", Y).length, 0);

// 6) 마친 뒤 한마디: 순서대로 먼저 해당하는 것 하나
const item = (id) => dc.ITEMS.find((i) => i.id === id);
const say = (f, last = {}) => pickRemark({ usualRun: 1, ...f }, last, T).text;
assert.equal(say({ diffToday: { meal: "조금 남김" }, runs: [{ item: item("meal"), days: 2 }] }), "밥은 이틀째 평소랑 달랐네. 내일도 그러면 병원에 말해 줘.");
assert.equal(pickRemark({ diffToday: { stool: "무름" }, runs: [{ item: item("stool"), days: 3 }] }, {}, T).go, "vet");
assert.equal(say({ diffToday: { meal: "조금 남김" }, runs: [{ item: item("meal"), days: 2 }], signalIds: ["meal"] }), "밥은 이틀째 평소랑 달랐네."); // 이상 신호 줄이 병원 안내를 하면 여기선 사실만
assert.equal(say({ diffToday: { stool: "무름" }, runs: [{ item: item("stool"), days: 9 }] }), "변은 9일째 평소랑 달랐네. 내일도 그러면 병원에 말해 줘.");
assert.equal(say({ diffToday: { meal: "조금 남김" } }), "오늘은 밥을 조금 남겼구나. 내일 다시 물어볼게.");
assert.equal(say({ diffToday: { walk: "못 감" } }), "오늘 다른 점을 적어 뒀어. 내일 다시 물어볼게.");
assert.equal(say({ resolved: ["변"] }), "변이 다시 평소로 돌아왔네. 다행이다!");
assert.equal(say({ resolved: ["밥", "변"] }), "어제 달랐던 게 다시 평소로 돌아왔네. 다행이다!");
assert.equal(say({ event: { days: 1, title: "다음 접종" } }), "내일 다음 접종 있어. 잊지 마!");
assert.equal(say({ event: { days: 5, title: "미용" }, medEndsIn: 2 }), "약이 모레면 끝나. 더 받아야 하는지 물어봐 줘.");
assert.equal(say({ foodDays: 5 }), "내 밥이 5일 치 남았어. 주문해 줄래?");
assert.equal(say({ walk: { now: 2, before: 5 } }), "이번 주는 산책을 덜 했네. 주말에 같이 나가자.");
assert.equal(say({ walk: { now: 2, before: 5 }, usualRun: 3 }, { walk: "2026-11-22" }), "좋아! 벌써 사흘째 평소 같았어."); // 같은 말은 7일 안에 다시 안 한다
assert.equal(say({ walk: { now: 0, before: 2 }, weightDays: 31 }), "나 몸무게 잰 지 한 달 됐어. 한번 재 볼까?"); // 원래 산책이 적던 집엔 산책 얘기를 안 한다
assert.equal(say({ stage: { key: "teeth", name: "이갈이·탐색기" }, stageToday: true }), "나 오늘부터 이갈이·탐색기야. 뭐가 달라지는지 봐 줘.");
assert.equal(say({ birthdayIn: 7 }), "다음 주에 내 생일이야!");
assert.equal(say({ together: 100, milestone: true }), "우리 같이 산 지 100일이야.");
assert.equal(say({ stage: { key: "teeth", name: "이갈이·탐색기" } }), "나 요즘 이가 간지러워. 씹을 거 하나 줘.");
assert.equal(say({ stage: { key: "teeth", name: "이갈이·탐색기" } }, { "stage:teeth": "2026-11-10", "stage:teeth:n": "0" }), "빠진 이를 발견해도 놀라지 마. 이갈이 중이야."); // 두 줄을 번갈아
assert.equal(say({ stage: { key: "teeth", name: "이갈이·탐색기" }, usualRun: 5 }, { "stage:teeth": "2026-11-24" }), "좋아! 벌써 닷새째 평소 같았어.");
assert.equal(say({}), "오늘도 평소 같았구나. 좋아!");
for (const f of [{ diffToday: { stool: "피·검은 변" } }, { resolved: ["변"] }, { stage: { key: "senior", name: "노령" } }]) assert.ok(!/염|병\s|증|진단/.test(say(f)), "병 이름·진단 말 없음");

// 7) 오늘 한마디는 하루 동안 같고, 체크를 고치면 다시 고른다. 시기가 바뀐 걸 처음 본 날만 "오늘부터"
const f1 = { usualRun: 1, stage: { key: "social", name: "사회화기" } };
const first = remarkFor("d1", T, f1);
assert.equal(remarkFor("d1", T, { ...f1, foodDays: 3 }).text, first.text); // 같은 날엔 그대로
assert.equal(remarkFor("d1", T, { ...f1, usualRun: 0, diffToday: { meal: "조금 남김" } }).text, "오늘은 밥을 조금 남겼구나. 내일 다시 물어볼게."); // 체크를 고치면 다시
assert.equal(remarkFor("d1", "2026-11-27", { usualRun: 2, stage: { key: "teeth", name: "이갈이·탐색기" } }).text, "나 오늘부터 이갈이·탐색기야. 뭐가 달라지는지 봐 줘.");
assert.equal(remarkFor("dNew", T, { usualRun: 1, stage: { key: "teeth", name: "이갈이·탐색기" } }).text, "나 요즘 이가 간지러워. 씹을 거 하나 줘."); // 처음 쓰는 날엔 "오늘부터"가 아니다
console.log("check-talk ok");

// 11/27 칭찬 한마디: 하루걸러, 이상 신호가 있는 날엔 안 나온다, 호칭·숫자 없음
{
  const { pickRemark, PRAISE } = await import("../src/services/checkTalk.js");
  const even = "2026-11-28", odd = "2026-11-27"; // 날짜 번호 짝·홀
  const pe = Math.floor(Date.parse(`${even}T00:00:00Z`) / 86400000) % 2 === 0 ? even : odd, po = pe === even ? odd : even;
  const a = pickRemark({ usualRun: 5 }, {}, pe);
  assert.ok(PRAISE.some((p) => a.text.startsWith(p)), a.text); assert.ok(/평소 같았어/.test(a.text));
  assert.ok(!PRAISE.some((p) => pickRemark({ usualRun: 5 }, {}, po).text.startsWith(p)), "하루걸러");
  assert.ok(!PRAISE.some((p) => pickRemark({ usualRun: 5, signalIds: ["meal"] }, {}, pe).text.startsWith(p)), "이상 신호 날엔 칭찬 없음");
  for (const p of PRAISE) { assert.ok(!/아빠|엄마|언니|오빠|누나|집사|보호자/.test(p), p); assert.ok(p.endsWith("."), p); }
  console.log("check-talk 칭찬 ok");
}
