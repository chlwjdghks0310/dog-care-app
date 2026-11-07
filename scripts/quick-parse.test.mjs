// 기기에서 바로 알아듣는 짧은 말: npm test
import assert from "node:assert/strict";
const { quickParse } = await import("../src/services/quickParse.js");
const t = "2026-11-07";
assert.deepEqual(quickParse("산책 30분 했어", t), [{ type: "add_health_value", metric: "walk", value: 30, date: t }]);
assert.deepEqual(quickParse("오늘 산책 45분 다녀왔어!", t)[0].value, 45);
assert.deepEqual(quickParse("몸무게 3.2kg", t), [{ type: "add_weight_record", weight_kg: 3.2, date: t }]);
assert.equal(quickParse("체중 3.25키로 나왔어", t)[0].weight_kg, 3.25);
assert.equal(quickParse("아침 사료 다 먹었어", t)[0].memo, "아침 사료 다 먹음");
assert.equal(quickParse("저녁 밥 남겼어", t)[0].appetite, "평소보다 적음");
assert.deepEqual(quickParse("토했어", t)[0].symptoms, ["구토"]);
assert.equal(quickParse("변 무르게 쌌어", t)[0].stool, "무름");
// 애매하거나 다른 내용이 섞이면 AI로(null)
assert.equal(quickParse("산책 30분 했는데 다리를 절었어", t), null);
assert.equal(quickParse("어제 산책 30분 했어", t), null);
assert.equal(quickParse("사료 3만 원 샀어", t), null);
assert.equal(quickParse("몸무게 300kg", t), null);
console.log("빠른 말 OK");
