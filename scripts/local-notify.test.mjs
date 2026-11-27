// 스토어 앱 예약 알림: 서버와 같은 규칙으로 날짜가 펼쳐지는지
import assert from "node:assert/strict";
const { expandAlarms } = await import("../src/services/localNotify.js");
const now = new Date(2026, 10, 25, 12, 0); // 11/25(수) 12:00
const k = (n) => `${n.at.getMonth() + 1}/${n.at.getDate()} ${String(n.at.getHours()).padStart(2, "0")}:${String(n.at.getMinutes()).padStart(2, "0")}`;
const ex = (alarms, days = 3) => expandAlarms(alarms, now, days).map(k);

assert.deepEqual(ex([{ time: "08:00", title: "밥", cat: "meal" }]), ["11/26 08:00", "11/27 08:00"]); // 오늘 8시는 지남
assert.deepEqual(ex([{ time: "18:00", title: "밥" }, { time: "18:00", title: "밥" }], 1), ["11/25 18:00"]); // 같은 알림은 한 번
assert.deepEqual(ex([{ time: "18:00", title: "a", skipDate: "2026-11-25" }], 2), ["11/26 18:00"]);
assert.deepEqual(ex([{ time: "18:00", title: "a", onlyDate: "2026-11-26" }]), ["11/26 18:00"]);
assert.deepEqual(ex([{ time: "18:00", title: "a", from: "2026-11-26", until: "2026-11-26" }]), ["11/26 18:00"]);
assert.deepEqual(ex([{ time: "21:00", title: "리포트", days: [0] }], 7), ["11/29 21:00"]); // 일요일만
// 종류를 끄면 안 울리고, 조용한 시간엔 약·알람·밥만 울린다
const prefs = { prefs: { report: false, quiet: { on: true, from: "22:00", to: "08:00" } } };
assert.deepEqual(ex([prefs, { time: "21:00", title: "r", cat: "report" }]), []);
assert.deepEqual(ex([prefs, { time: "23:00", title: "v", cat: "visit" }, { time: "23:00", title: "m", cat: "med" }], 1), ["11/25 23:00"]);
// 주소의 {date}는 울리는 날짜로
assert.equal(expandAlarms([{ time: "18:00", title: "약", url: "/?dose=s%7C%7Bdate%7D%7C18:00" }], now, 1)[0].url, "/?dose=s%7C2026-11-25%7C18:00");
assert.equal(expandAlarms([{ time: "18:00", title: "a" }], now, 30, 60).length, 30);
assert.equal(expandAlarms(Array.from({ length: 30 }, (_, i) => ({ time: "18:00", title: `a${i}` })), now, 7).length, 60); // 아이폰 한도 아래
console.log("local-notify ok");

// 카카오 로그인에서 돌아온 주소 읽기(스토어 앱)
const { parseReturn } = await import("../src/services/nativeAuth.js");
assert.deepEqual(parseReturn("kr.meongcare.app://login#access_token=A&refresh_token=R&token_type=bearer"), { access_token: "A", refresh_token: "R", error: null });
assert.equal(parseReturn("kr.meongcare.app://login?error=access_denied&error_description=User+cancelled#x=1").error, "User cancelled");
assert.deepEqual(parseReturn("kr.meongcare.app://login"), { access_token: null, refresh_token: null, error: null });
console.log("native-auth ok");

// 11/27 하루 체크 알림 문구 돌리기: 날짜마다 다른 말, 16일 안에 같은 말 없음, 숫자·건강 낱말·호칭 없음
{
  const { expandAlarms } = await import("../src/services/localNotify.js");
  const lines = Array.from({ length: 16 }, (_, i) => `문구${i}`);
  const out = expandAlarms([{ time: "20:00", title: "🐾 여름이", body: "옛 문구", rotate: lines }], new Date(2026, 10, 27, 9, 0), 7, 60);
  assert.equal(out.length, 7); assert.equal(new Set(out.map((x) => x.body)).size, 7, "7일 치가 모두 다른 말");
  assert.equal(expandAlarms([{ time: "20:00", title: "t", body: "옛 문구" }], new Date(2026, 10, 27, 9, 0), 2, 60)[0].body, "옛 문구", "rotate가 없으면 예전처럼");
  console.log("local-notify 문구 돌리기 ok");
}
