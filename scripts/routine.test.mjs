// 외출·귀가 계산 확인: npm test — 혼자 있는 시간, 버튼을 안 눌렀을 때 평소 시각으로 어림, 체크인 알림 시각
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
const R = await import("../src/services/routine.js");
const at = (s) => new Date(`2026-10-27T${s}:00`); // 화요일
const routine = { leave: "08:30", back: "19:00", days: [1, 2, 3, 4, 5], remind: true };

assert.deepEqual(R.outingState(at("07:50"), null, routine), { state: "home", minutes: 0 });
assert.deepEqual(R.outingState(at("13:30"), null, routine), { state: "away", minutes: 300, since: "08:30", estimated: true });
assert.deepEqual(R.outingState(at("20:00"), null, routine), { state: "back", minutes: 630, estimated: true });
assert.equal(R.outingState(new Date("2026-10-25T13:00:00"), null, routine).state, "home", "일요일은 평소 시각으로 어림하지 않음");
// 버튼을 누르면 누른 시각이 우선
assert.deepEqual(R.outingState(at("12:00"), { date: "2026-10-27", leftAt: "09:10", backAt: null }, routine), { state: "away", minutes: 170, since: "09:10" });
assert.deepEqual(R.outingState(at("22:00"), { date: "2026-10-27", leftAt: "09:10", backAt: "18:40" }, routine), { state: "back", minutes: 570 });
assert.equal(R.durationLabel(570), "9시간 30분");
assert.equal(R.durationLabel(45), "45분");
assert.equal(R.checkinAlarmTime(routine), "19:30");
assert.equal(R.checkinAlarmTime({ back: "23:50" }), "00:20");
// 저장: 나감 → 들어옴, 체크인은 강아지별
R.leaveNow(at("08:40"));
assert.equal(R.getOuting("2026-10-27").leftAt, "08:40");
R.backNow(at("19:05"));
assert.equal(R.getOuting("2026-10-27").backAt, "19:05");
R.markCheckedIn("d1", { ids: ["r1"], picks: { meal: "남겼어" } }, "2026-10-27");
assert.deepEqual(R.getTodayCheckin("d1", "2026-10-27").picks, { meal: "남겼어" }, "다시 열면 고른 것 채움");
assert.equal(R.getTodayCheckin("d1", "2026-10-28"), null);
assert.ok(R.checkedInToday("d1", "2026-10-27") && !R.checkedInToday("d2", "2026-10-27"));
console.log("routine ok");
// 사료 남은 양: 2kg 봉투, 하루 50g → 40일. 10/1에 뜯었으면 11/10에 떨어짐
const F = await import("../src/services/foodStock.js");
assert.deepEqual(F.stockFromBag({ grams: 2000, openedAt: "2026-10-01" }, 50, "2026-11-05"), { daysLeft: 5, runOut: "2026-11-10", dailyGrams: 50, bagDays: 40 });
assert.equal(F.stockFromBag({ grams: 2000, openedAt: "2026-10-01" }, 0, "2026-11-05"), null, "급여량 모르면 어림 안 함");
assert.equal(F.stockLabel({ daysLeft: 0 }), "사료가 다 떨어졌을 때예요");
console.log("routine+food ok");
