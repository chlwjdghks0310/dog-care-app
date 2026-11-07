// 진료 정리 → 진료 기록 칸 확인: npm test
import assert from "node:assert/strict";
const { docToPrefill, findSameVisit, medDrafts } = await import("../src/services/vetDoc.js");
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
assert.match(docToPrefill({ explanation: "장염", cautions: "하루 굶기기" }, now).data.explanation, /장염\n주의사항: 하루 굶기기/);
const recs = [{ type: "vet", at: "2026-11-05T12:00", data: { hospital: "행복병원", cost: "54000" } }];
assert.ok(findSameVisit(recs, { visit_date: "2026-11-05", hospital: "", total: 54000 }));
assert.equal(findSameVisit(recs, { visit_date: "2026-11-06", hospital: "행복병원", total: 54000 }), null);
const md = medDrafts({ reason: "장염", meds: [{ name: "위장약", dose: "1포", per_day: 2, days: 3, note: "식후" }, { name: "연고", dose: "", per_day: 0, days: 0, note: "" }] }, "2026-11-05");
assert.deepEqual(md[0], { name: "위장약", dose: "1포", times: ["08:00", "20:00"], perDay: 2, courseDays: 3, startDate: "2026-11-05", endDate: "2026-11-07", purpose: "장염 · 식후", remind: true, use: true });
assert.equal(md[1].use, false, "용량을 모르면 기본으로 등록하지 않음");
console.log("진료 정리 OK");
