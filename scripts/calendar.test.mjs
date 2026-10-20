// 일정(기간·반복·알림) 확인: npm test
import assert from "node:assert/strict";

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
const C = await import("../src/services/calendarEvents.js");
const { getCustomSchedules } = await import("../src/services/customSchedules.js");

// 예전 일정(제목·색만)은 하루짜리로 그대로 보인다
C.addEvent("a", "2026-10-05", "미용");
assert.deepEqual(C.getOccurrences("a", "2026-10-01", "2026-10-31").map((o) => o.date), ["2026-10-05"]);

// 기간 일정: 시작~끝 매일, 처음/끝 표시
const stay = C.saveEvent("a", "2026-10-10", { title: "호텔링", kind: "stay", endDate: "2026-10-12" });
const occ = C.getOccurrences("a", "2026-10-11", "2026-10-31").filter((o) => o.event.id === stay.id);
assert.deepEqual(occ.map((o) => [o.date, o.isStart, o.isEnd]), [["2026-10-11", false, false], ["2026-10-12", false, true]]);

// 반복: 매주 / 매달(31일 없는 달은 건너뜀) / 매년(2월 29일은 윤년만)
C.saveEvent("a", "2026-10-01", { title: "산책 모임", repeat: "weekly" });
assert.equal(C.getOccurrences("a", "2026-10-01", "2026-10-31").filter((o) => o.event.title === "산책 모임").length, 5);
C.saveEvent("a", "2026-01-31", { title: "심장사상충", kind: "med", repeat: "monthly" });
assert.deepEqual(C.getOccurrences("a", "2026-01-01", "2026-05-31").filter((o) => o.event.title === "심장사상충").map((o) => o.date), ["2026-01-31", "2026-03-31", "2026-05-31"]);
C.saveEvent("b", "2024-02-29", { title: "생일", repeat: "yearly" });
assert.deepEqual(C.getOccurrences("b", "2025-01-01", "2028-12-31").map((o) => o.date), ["2028-02-29"]);

// 고치기: 날짜를 옮기면 이전 날짜에서 빠지고 하나만 남는다, 빈 값은 지워진다
const vet = C.saveEvent("a", "2026-10-20", { title: "검진", kind: "vet", time: "15:00", memo: "공복" });
C.saveEvent("a", "2026-10-22", { ...vet, memo: "" });
assert.equal(C.getEventsForDate("a", "2026-10-20").length, 0);
assert.equal(C.getEventsForDate("a", "2026-10-22").length, 1);
assert.equal(C.getEventsForDate("a", "2026-10-22")[0].memo, undefined);

// 알림: 다음 회차에 한 번짜리 알람, 바꾸면 옮기고, 지우면 같이 지운다
const today = "2026-10-20";
const v2 = C.saveEvent("a", "2026-10-22", { ...C.getEventsForDate("a", "2026-10-22")[0], alarm: "eve" });
C.syncEventAlarms("a", today);
let al = getCustomSchedules("a");
assert.deepEqual(al.map((x) => [x.date, x.time]), [["2026-10-21", "20:00"]]);
assert.match(al[0].title, /내일 검진 15:00/);
C.syncEventAlarms("a", today); // 다시 맞춰도 중복 없음
assert.equal(getCustomSchedules("a").length, 1);
C.saveEvent("a", "2026-10-22", { ...C.getEventsForDate("a", "2026-10-22")[0], alarm: "before1h" });
C.syncEventAlarms("a", today);
assert.deepEqual(getCustomSchedules("a").map((x) => [x.date, x.time]), [["2026-10-22", "14:00"]]);
C.removeEvent("a", "2026-10-22", v2.id);
assert.equal(getCustomSchedules("a").length, 0);

// 반복 일정 알림은 지난 회차가 아니라 다음 회차로
const pill = C.getEventsForDate("a", "2026-01-31")[0];
C.saveEvent("a", "2026-01-31", { ...pill, alarm: "morning" });
C.syncEventAlarms("a", today);
assert.deepEqual(getCustomSchedules("a").map((x) => [x.date, x.time]), [["2026-10-31", "09:00"]]);
C.syncEventAlarms("a", "2026-11-01"); // 회차가 지나면 다음 달로 넘어감(12월 31일)
assert.deepEqual(getCustomSchedules("a").map((x) => x.date), ["2026-12-31"]);

// 다른 강아지 일정·알림은 섞이지 않음
assert.equal(getCustomSchedules("b").length, 0);
console.log("일정 확인 통과");
