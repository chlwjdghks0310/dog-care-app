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
assert.deepEqual(splitDog("말: 괜찮아.\n병원: 지켜봐도 돼.\n다음 질문: 이건 스무 글자를 훌쩍 넘어가는 아주 아주 긴 질문이라서 단추로 못 쓴다 | 짧은 것").next, ["짧은 것"]);
r = splitDog("틀을 안 지킨 답이야. 그냥 한 문단."); // 틀이 깨져도 화면이 비지 않게
assert.equal(r.say, "틀을 안 지킨 답이야. 그냥 한 문단."); assert.deepEqual(r.next, []);
assert.equal(splitDog("병원: 머리말이 하나만 있는 답").say, "머리말이 하나만 있는 답");
// 이어 묻기·지난 대화: 모양이 이상한 건 버리고 길이를 자른다
assert.deepEqual(turnsOf([{ q: " a ", a: "b" }, { q: "", a: "x" }, null, { q: 1, a: "y" }, { q: "c".repeat(700), a: "d" }], 2, 600, 600).map((t) => [t.q.length, t.a]), [[1, "b"], [600, "d"]]);
assert.deepEqual(turnsOf("nope", 2, 10, 10), []);
assert.equal(turnsOf([{ q: "1", a: "1" }, { q: "2", a: "2" }, { q: "3", a: "3" }], 2, 9, 9)[0].q, "2"); // 최근 것부터 max개
assert.equal(splitDog("말: 오래 두지 말아 줘.\n병원: 없음\n다음 질문: 산책은?").vet, ""); // "없음"은 빈칸으로
console.log("ask-parse ok");
