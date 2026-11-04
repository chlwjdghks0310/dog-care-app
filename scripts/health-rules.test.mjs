// 규칙 기반 병원 안내·변 체크·컨디션 체크 기록 확인
import assert from "node:assert/strict";

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis;
const { stoolFlags, conditionFlags, STOOL_MSG, CONDITION_MSG } = await import("../src/services/healthRules.js");
const R = await import("../src/services/records.js");

const day = "2026-11-04";
const yesterday = (data) => ({ at: "2026-11-03T08:00", data });

// 변: 피·검은색·이틀 이어진 설사, 정상은 안내 없음
assert.deepEqual(stoolFlags({ stoolSigns: ["피"] }, [], day), [STOOL_MSG.blood]);
assert.deepEqual(stoolFlags({ stoolColor: "검은색" }, [], day), [STOOL_MSG.black]);
assert.deepEqual(stoolFlags({ stoolScore: 6 }, [], day), [], "하루만 설사면 이어짐 안내 없음");
assert.deepEqual(stoolFlags({ stoolScore: 7 }, [yesterday({ stool: "설사" })], day), [STOOL_MSG.diarrhea]);
assert.deepEqual(stoolFlags({ stoolScore: 6 }, [{ at: "2026-11-01T08:00", data: { stool: "설사" } }], day), [], "바로 전날이 아니면 이어짐 아님");
assert.deepEqual(stoolFlags({ stool: "정상", stoolScore: 2, stoolColor: "갈색", stoolSigns: [] }, [yesterday({ stoolScore: 7 })], day), []);

// 컨디션: 숨쉬기 많이 다름, 걸음걸이 이틀
assert.deepEqual(conditionFlags({ breathing: "많이 다름" }, [], day), [CONDITION_MSG.breathing]);
assert.deepEqual(conditionFlags({ gait: "조금 다름" }, [], day), []);
assert.deepEqual(conditionFlags({ gait: "조금 다름" }, [yesterday({ check: { gait: "많이 다름" } })], day), [CONDITION_MSG.gait]);
const normal = Object.fromEntries(R.CHECK_ITEMS.map((i) => [i.key, "평소 같음"]));
assert.deepEqual(conditionFlags(normal, [yesterday({ check: normal })], day), []);

// 요약: 새 칸
assert.equal(R.summarize({ type: "potty", data: { stoolScore: 5, stoolColor: "노란색", stoolSigns: ["점액"] } }), "점수 5/7 · 노란색 · 점액");
assert.equal(R.summarize({ type: "condition", data: { check: { ...normal, breathing: "많이 다름" }, videoTaken: true } }), "숨쉬기 많이 다름 · 영상 찍어 둠");
assert.equal(R.summarize({ type: "condition", data: { check: normal } }), "체크 6가지 평소 같음");

// 검사: check만 있는 컨디션 기록은 저장 가능, 잘못된 값·빈 체크는 막기
const at = "2026-11-01T09:00";
assert.equal(R.validateRecord({ type: "condition", at, data: { check: { energy: "조금 다름" } } }), null);
assert.equal(R.validateRecord({ type: "potty", at, data: { stoolScore: 3, stoolColor: "갈색", stoolSigns: ["점액"] } }), null);
assert.match(R.validateRecord({ type: "condition", at, data: { check: { energy: "아주 나쁨" } } }), /컨디션 체크/);
assert.match(R.validateRecord({ type: "potty", at, data: { stoolScore: 9 } }), /점수/);
assert.equal(R.validateRecord({ type: "condition", at, data: { check: {}, flags: [] } }), "적은 내용이 없어요.");

console.log("규칙 기반 안내 확인 통과");
