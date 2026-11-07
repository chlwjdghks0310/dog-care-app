// 진료 정리 → 진료 기록 칸 확인: npm test
import assert from "node:assert/strict";
const { docToPrefill } = await import("../src/services/vetDoc.js");
const now = new Date("2026-11-07T15:30:00");
const p = docToPrefill({ visit_date: "2026-11-05", hospital: "행복동물병원", reason: "구토", explanation: "", tests: "혈액검사 정상", prescription: "위장약 1일 2회 5일분", items: [{ name: "진찰료", kind: "진찰", amount: 15000 }, { name: "CBC", kind: "검사", amount: 40000 }], total: 55000, next_date: "2026-11-12" }, now);
assert.equal(p.at, "2026-11-05T12:00");
assert.deepEqual(p.data, { hospital: "행복동물병원", reason: "구토", tests: "혈액검사 정상", prescription: "위장약 1일 2회 5일분", cost: "55000", costItems: ["진찰", "검사"], nextDate: "2026-11-12", nextAlarm: true });
assert.equal(p.memo, "진료비 항목: 진찰료 15,000원 · CBC 40,000원");
// 합계가 다르면 둘 다 보여 준다 · 미래 진료일은 오늘로 · 지난 재진일은 버림 · 사유 없으면 "진료"
const q = docToPrefill({ visit_date: "2026-12-01", items: [{ name: "약제비", kind: "약", amount: 9000 }], total: 10000, next_date: "2026-11-01" }, now);
assert.equal(q.at.slice(0, 10), "2026-11-07");
assert.equal(q.data.reason, "진료");
assert.equal(q.data.nextDate, undefined);
assert.match(q.memo, /항목 합 9,000원, 영수증 합계 10,000원/);
assert.equal(docToPrefill({ total: 1000 }, now, { claim: true }).data.claimTodo, true);
assert.equal(docToPrefill({ total: 1000 }, now).data.claimTodo, undefined);
assert.equal(docToPrefill({ visit_date: "2027-12-28" }, new Date("2027-01-03T10:00:00")).at.slice(0, 10), "2026-12-28", "1월에 읽은 12월 영수증은 작년");
console.log("진료 정리 OK");
