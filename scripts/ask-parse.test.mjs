// 비서 빠른 답 나누기: 말 / 병원 / 다음 질문
import assert from "node:assert/strict";
import { splitDog, turnsOf } from "../server/askParse.js";
let r = splitDog("말: 나 11/24에 사료 바꾸고 이틀째 남겼잖아. 예전 사료를 조금 섞어 줘.\n병원: 몸무게는 그대로야. 이틀 더 이러면 병원에 말해 줘.\n다음 질문: 변은 괜찮아? | 병원 가야 해?");
assert.equal(r.say, "나 11/24에 사료 바꾸고 이틀째 남겼잖아. 예전 사료를 조금 섞어 줘.");
assert.equal(r.vet, "몸무게는 그대로야. 이틀 더 이러면 병원에 말해 줘.");
assert.deepEqual(r.next, ["변은 괜찮아?", "병원 가야 해?"]);
r = splitDog('말: 지금 바로 동물병원에 데려가 줘. 밤이면 24시 병원으로.\n병원: 뭘 얼마나 먹었는지 말해 줘.\n다음 질문: "뭘 챙겨 가?" | 토하게 해도 돼? | 세 번째는 버린다');
assert.deepEqual(r.next, ["뭘 챙겨 가?", "토하게 해도 돼?"]); // 따옴표 떼고 두 개까지
assert.equal(splitDog("말: 그건 내가 잘 몰라. 나에 대한 건 뭐든 물어봐.\n병원:\n다음 질문:").vet, "");
assert.deepEqual(splitDog("말: 괜찮아.\n병원: 지켜봐도 돼.\n다음 질문: 이건 스무 글자를 훌쩍 넘어가는 아주 아주 긴 질문이라서 단추로 못 쓴다 | 왜 그래?").next, ["왜 그래?"]);
r = splitDog("틀을 안 지킨 답이야. 그냥 한 문단."); // 틀이 깨져도 화면이 비지 않게
assert.equal(r.say, "틀을 안 지킨 답이야. 그냥 한 문단."); assert.deepEqual(r.next, []);
assert.equal(splitDog("병원: 머리말이 하나만 있는 답").say, "머리말이 하나만 있는 답");
// 이어 묻기·지난 대화: 모양이 이상한 건 버리고 길이를 자른다
assert.deepEqual(turnsOf([{ q: " a ", a: "b" }, { q: "", a: "x" }, null, { q: 1, a: "y" }, { q: "c".repeat(700), a: "d" }], 2, 600, 600).map((t) => [t.q.length, t.a]), [[1, "b"], [600, "d"]]);
assert.deepEqual(turnsOf("nope", 2, 10, 10), []);
assert.equal(turnsOf([{ q: "1", a: "1" }, { q: "2", a: "2" }, { q: "3", a: "3" }], 2, 9, 9)[0].q, "2"); // 최근 것부터 max개
assert.equal(splitDog("말: 오래 두지 말아 줘.\n병원: 없음\n다음 질문: 산책은?").vet, ""); // "없음"은 빈칸으로
console.log("ask-parse ok");

// 11/27 다음 질문은 보호자가 묻는 말만, 기록에 없는 숫자 찾기
{
  const { ownerAsks, strayNumbers, splitDog } = await import("../server/askParse.js");
  for (const q of ["산책은 해도 돼?", "언제까지 지켜봐?", "왜 그러는 걸까?", "귀 세정은 어떻게 해?", "지난번 병원에서 뭐랬지?", "병원 가야 해?".replace("가야 해", "가야 돼"), "다음 접종 언제야?"]) assert.ok(ownerAsks(q), q);
  for (const q of ["귀 냄새 나?", "토했어?", "먹였어?", "귀가 빨개?", "목욕했어?"]) assert.ok(!ownerAsks(q), q);
  assert.deepEqual(splitDog("말: 응.\n병원:\n다음 질문: 귀 냄새 나? | 산책은 해도 돼?").next, ["산책은 해도 돼?"]);
  assert.deepEqual(strayNumbers("7일에 걸쳐 25%씩 바꿔 줘. 24시 병원", "11/24 사료 바꿈 2.4kg"), ["7", "25"]);
  assert.deepEqual(strayNumbers("나 11/24에 바꿨잖아. 2.4kg이야", "11/24 사료 바꿈 2.4kg"), []);
  console.log("ask-parse 11/27 ok");
}
{
  const { strayDates } = await import("../server/askParse.js");
  assert.deepEqual(strayDates("나 11/24에 사료 바꿨잖아", "오늘 2026-11-27, 말티즈 2살"), ["11/24"]);
  assert.deepEqual(strayDates("나 11월 6일에 병원 갔잖아. 11/24엔 사료 바꿨고", "- 2026-11-06 병원 진료\n- 11/24 식사"), []);
  console.log("ask-parse dates ok");
}
{ const { ownerAsks } = await import("../server/askParse.js"); for (const q of ["언제부터 그랬어?", "병원 어디서 했어?", "언제부터 짖어?"]) assert.ok(!ownerAsks(q), q); assert.ok(ownerAsks("지난번 병원에서 뭐랬지?")); }
{ const { ownerAsks, fillNext } = await import("../server/askParse.js");
  for (const q of ["또 다른 건 먹은 건 없어?", "다른 증상은 없어?", "피는 안 났어?", "기운은 있어?", "많이 먹었어?"]) assert.ok(!ownerAsks(q), q);
  assert.deepEqual(fillNext([], { question: "초콜릿 먹었어 어떡해", say: "지금 바로 동물병원에 데려가 줘." }), ["가는 동안 뭘 해 줄까?", "병원에 뭘 챙겨 가?"]);
  assert.deepEqual(fillNext(["산책은 해도 돼?"], { question: "밥을 남겨" }), ["산책은 해도 돼?", "집에서 뭘 해 줄까?"]);
  assert.deepEqual(fillNext([], { question: "병원 가야 해?" }), ["집에서 뭘 해 줄까?", "언제까지 지켜봐?"]);
  console.log("ask-parse 단추 채우기 ok"); }
