// 폰 달력 파일 확인: npm test
import assert from "node:assert/strict";
const { eventToIcs } = await import("../src/services/ics.js");
const a = eventToIcs({ id: "e1", title: "4차 종합백신, 행복병원", time: "10:30", repeat: "" }, "2026-11-12", "여름이");
assert.match(a, /DTSTART:20261112T103000\r\nDTEND:20261112T113000/);
assert.match(a, /SUMMARY:여름이 4차 종합백신\\, 행복병원/);
assert.match(a, /TRIGGER:-PT1H/);
const b = eventToIcs({ id: "e2", title: "심장사상충", repeat: "monthly" }, "2026-11-30");
assert.match(b, /DTSTART;VALUE=DATE:20261130\r\nDTEND;VALUE=DATE:20261201/);
assert.match(b, /RRULE:FREQ=MONTHLY/);
console.log("폰 달력 OK");
