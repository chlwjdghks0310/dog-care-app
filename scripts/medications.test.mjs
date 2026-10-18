// 약 관리 저장 로직 확인: npm test
import assert from "node:assert/strict";

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
const M = await import("../src/services/medications.js");
const { todayKey, toDateKey, addDays } = await import("../src/utils/date.js");

const today = todayKey();
const day = (n) => toDateKey(addDays(new Date(`${today}T00:00:00`), n));
const D = "dog-a";

// 잘못된 입력
assert.match(M.validateMed({ name: "", dose: "1알", times: ["08:00"], startDate: today }), /이름/);
assert.match(M.validateMed({ name: "a", dose: "1알", times: ["08:00", "08:00"], startDate: today }), /두 번/);
assert.match(M.validateMed({ name: "a", dose: "1알", times: ["08:00"], startDate: today, endDate: day(-1) }), /종료일/);
assert.match(M.validateMed({ name: "a", dose: "1알", times: ["08:00"], startDate: today, stock: { base: 10, perDose: 0 } }), /1회에 쓰는/);

// 등록 · 하루 두 번 · 시간순
const med = M.addMed(D, { name: "심장약", dose: "1알", times: ["20:00", "08:00"], startDate: day(-3), stock: M.stockNow(10, 1) });
let doses = M.getDosesForDate(D, today, new Date(`${today}T07:00:00`));
assert.deepEqual(doses.map((d) => [d.time, d.status]), [["08:00", "planned"], ["20:00", "planned"]]);
assert.equal(M.getDosesForDate("dog-b", today).length, 0, "다른 강아지와 안 섞임");

// 시간이 지나도 먹은 걸로 추정하지 않음
assert.equal(M.getDosesForDate(D, today, new Date(`${today}T09:30:00`))[0].status, "check");
assert.equal(M.getDosesForDate(D, day(-1))[0].status, "check");

// 완료 · 중복 탭 · 수량
M.markDoseDone(D, doses[0], `${today}T08:05:00`);
doses = M.getDosesForDate(D, today);
M.markDoseDone(D, doses[0]); // 두 번 눌러도 한 번
assert.equal(doses[0].status, "done");
assert.equal(doses[0].record.doneAt, `${today}T08:05:00`);
assert.equal(M.getStockInfo(D, med).remaining, 9);

// 시각 수정 → 수정 내역, 취소 → 기록 유지 + 수량 복구
M.editDoneTime(D, doses[0], "08:20");
doses = M.getDosesForDate(D, today);
assert.equal(doses[0].record.doneAt, `${today}T08:20:00`);
M.undoDose(D, doses[0]);
doses = M.getDosesForDate(D, today, new Date(`${today}T08:30:00`));
assert.equal(doses[0].status, "planned");
assert.deepEqual(doses[0].record.edits.map((e) => e.note), ["먹인 시각 08:05 → 08:20", "완료 취소"]);
assert.equal(M.getStockInfo(D, med).remaining, 10);

// 건너뜀
M.markDoseSkipped(D, doses[1]);
assert.equal(M.getDosesForDate(D, today)[1].status, "skipped");

// 지난날 기록 후 처방 변경 → 이전 처방 어제로 끝, 지난 기록 그대로, 오늘은 새 처방
M.markDoseDone(D, M.getDosesForDate(D, day(-1))[0]);
const v2 = M.updateMed(D, med.id, { ...med, dose: "반 알", times: ["09:00"] });
assert.notEqual(v2.id, med.id);
assert.equal(M.getMeds(D).find((m) => m.id === med.id).endDate, day(-1));
const y = M.getDosesForDate(D, day(-1));
assert.equal(y.length, 2);
assert.equal(y[0].record.dose, "1알");
assert.deepEqual(M.getDosesForDate(D, today).map((d) => [d.time, d.med.dose]), [["09:00", "반 알"]]);
assert.equal(M.getStockInfo(D, v2).remaining, 9, "같은 처방 묶음이라 수량 이어짐");

// 이름만 바꾸면 그 자리에서 수정
const v2b = M.updateMed(D, v2.id, { ...v2, name: "심장약(피모벤단)" });
assert.equal(v2b.id, v2.id);

// 부족 안내: 하루 1개, 남은 2개 → 부족
M.updateMed(D, v2.id, { ...v2b, stock: M.stockNow(2, 1) });
assert.equal(M.getStockInfo(D, M.getMeds(D).find((m) => m.id === v2.id)).low, true);

// 요일
const weekly = M.addMed(D, { name: "구충제", dose: "1알", times: ["10:00"], startDate: today, days: [new Date(`${day(1)}T00:00:00`).getDay()] });
assert.equal(M.isScheduledOn(weekly, today), false);
assert.equal(M.isScheduledOn(weekly, day(1)), true);

// 중단 → 활성에서 빠지고 기록 유지 · 삭제 → 기록까지
M.stopMed(D, v2.id);
assert.ok(M.isEnded(M.getMeds(D).find((m) => m.id === v2.id), day(1)));
assert.equal(M.getDosesForDate(D, day(-1)).filter((d) => d.med.seriesId === med.seriesId).length, 2);
M.deleteMedSeries(D, med.seriesId);
assert.equal(M.getMeds(D).filter((m) => m.seriesId === med.seriesId).length, 0);
assert.equal(M.getDosesForDate(D, day(-1)).length, 0);

console.log("약 관리 확인 통과");
