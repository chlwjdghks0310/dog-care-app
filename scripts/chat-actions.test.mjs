// 비서(채팅)로 기록하기 확인: npm test — AI가 보낸 동작이 화면에서 적은 것과 같은 곳에 저장되는지
import assert from "node:assert/strict";

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis;
globalThis.fetch = async () => ({ ok: true, json: async () => ({}) }); // 푸시 알람 서버 동기화는 건너뜀
const A = await import("../src/services/appActions.js");
const E = await import("../src/services/expenses.js");
const R = await import("../src/services/records.js");
const C = await import("../src/services/calendarEvents.js");
const { getFeedingSettings } = await import("../src/services/feedingSettings.js");
const { todayKey, toDateKey, addDays } = await import("../src/utils/date.js");
const today = todayKey();
const day = (n) => toDateKey(addDays(new Date(`${today}T00:00:00`), n));
const dog = { id: "c1", name: "보리", breed: "말티즈" };
const run = (...actions) => A.applyAppActions(dog, actions);

// 지출: 병원비 항목·보험 청구, 병원 분류가 아니면 항목·청구는 안 붙음
let r = run({ type: "add_expense", title: "슬개골 검사", amount: 120000, date: today, category: "병원·치료", items: ["검사", "엉뚱한 값"], claim: "todo" }, { type: "add_expense", title: "간식", amount: 5000, date: today, category: "간식·영양제", claim: "todo" });
assert.equal(r.done.length, 2);
const [vetExp, snackExp] = E.getExpenses(dog.id);
assert.deepEqual([vetExp.items, vetExp.claim, snackExp.claim], [["검사"], "todo", undefined]);
// 보험금 받음으로 고치기(버튼 확인 뒤)
assert.ok(A.applyConfirmedAction(dog, { type: "update_record", kind: "expense", id: vetExp.id, summary: "받음", claim: "paid", claim_paid: 90000 }));
assert.deepEqual([E.getExpenses(dog.id)[0].claim, E.getExpenses(dog.id)[0].claimPaid, E.getExpenses(dog.id)[0].items], ["paid", 90000, ["검사"]]);

// 분류 모름 → 묻기, 고르면 저장(항목·청구 유지)
r = run({ type: "add_expense", title: "중성화 수술", amount: 300000, date: today, category: "모름", items: ["수술"], claim: "sent" });
assert.equal(r.ask.length, 1);
assert.match(A.saveAskedExpense(dog, r.ask[0], "medical"), /중성화 수술/);
assert.deepEqual(E.getExpenses(dog.id).at(-1).items, ["수술"]);

// 매달 나가는 돈 등록 + 분류 만들기
r = run({ type: "add_fixed_expense", title: "펫보험", amount: 32000, day: 25, category: "보험료" }, { type: "add_expense_category", name: "호텔·돌봄" });
assert.equal(r.done.length, 2);
assert.equal(E.getFixedExpenses(dog.id)[0].title, "펫보험");
assert.ok(E.getCategories().some((c) => c.name === "호텔·돌봄"));
const fx = E.getFixedExpenses(dog.id)[0];
assert.ok(A.applyConfirmedAction(dog, { type: "update_record", kind: "fixed_expense", id: fx.id, summary: "28일로", day: 28 }));
assert.equal(E.getFixedExpenses(dog.id)[0].day, 28);
assert.ok(A.applyConfirmedAction(dog, { type: "delete_record", kind: "fixed_expense", id: fx.id, summary: "펫보험" }));
assert.equal(E.getFixedExpenses(dog.id).length, 0);

// 건강 기록: 증상·병원 진료(진료비 → 가계부, 다음 진료 → 일정표)·일상·예방접종 — 어제 날짜(오늘 07:00은 새벽엔 미래라 막힘)
r = run(
  { type: "add_health_record", record_type: "symptom", date: day(-1), time: "07:00", symptoms: ["구토", "없는 증상"], repeat: "처음", observed: "노란 거품" },
  { type: "add_health_record", record_type: "vet", date: day(-1), time: "08:00", hospital: "행복동물병원", reason: "구토", prescription: "위장약 3일", cost: 45000, next_date: day(7) },
  { type: "add_health_record", record_type: "daily", date: day(-1), time: "06:00", daily_kind: "양치" },
  { type: "add_health_record", record_type: "life", date: day(-1), time: "06:30", life_kind: "예방접종", title: "종합백신 3차", next_date: day(21) },
  { type: "add_health_record", record_type: "vet", date: day(-1), hospital: "사유 없음" }
);
assert.equal(r.done.length, 4, "사유 없는 진료 기록은 실패");
assert.equal(r.failed, 1);
const recs = R.getRecords(dog.id);
assert.deepEqual(recs.find((x) => x.type === "symptom").data.kinds, ["구토"]);
const vetRec = recs.find((x) => x.type === "vet");
assert.equal(E.getExpenses(dog.id).find((e) => e.recordId === vetRec.id)?.amount, 45000, "진료비 → 가계부");
assert.ok(C.getEventsByDog(dog.id)[day(7)]?.some((e) => e.kind === "vet"), "다음 진료 → 일정표(병원 종류)");
assert.ok(C.getEventsByDog(dog.id)[day(21)]?.some((e) => e.kind === "vaccine"), "다음 접종 → 일정표(접종 종류)");

// 일정: 반복·기간·메모·알림
r = run({ type: "add_calendar_event", date: day(3), title: "심장사상충약", kind: "med", repeat: "monthly", alarm: "morning", memo: "밥 먹고" }, { type: "add_calendar_event", date: day(5), title: "호텔링", kind: "stay", end_date: day(7), repeat: "weekly" });
assert.equal(r.done.length, 2);
const ev = C.getEventsByDog(dog.id);
assert.deepEqual(["repeat", "alarm", "memo"].map((k) => ev[day(3)][0][k]), ["monthly", "morning", "밥 먹고"]);
assert.deepEqual([ev[day(5)][0].endDate, ev[day(5)][0].repeat], [day(7), undefined], "기간 일정은 반복 안 함");

// 밥 시간
r = run({ type: "set_feeding_times", times: ["18:00", "08:00", "25:00"] });
assert.deepEqual(getFeedingSettings(dog.id).times, ["08:00", "18:00"]);

console.log("비서 기록 동작 확인 통과");
