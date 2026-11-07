// 폰 기본 달력에 넣기(.ics): 가끔 여는 앱이라 병원 일정을 폰 달력에 두면 다시 열게 하는 장치가 된다(제안 분석 11/7).
// 시각은 기기 현지 시각 그대로(floating time). 반복은 RRULE로, 알림은 일정 1시간 전(시각 없으면 전날 저녁 8시).
const esc = (t = "") => String(t).replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
const d8 = (date) => date.replaceAll("-", "");
const RR = { weekly: "WEEKLY", monthly: "MONTHLY", yearly: "YEARLY" };

export function eventToIcs(ev, date, dogName = "") {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//meongcare//ko", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${ev.id || stamp}@meongcare.kr`, `DTSTAMP:${stamp}`];
  if (ev.time) {
    const [h, m] = ev.time.split(":").map(Number);
    const end = `${String(Math.min(23, h + 1)).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
    lines.push(`DTSTART:${d8(date)}T${ev.time.replace(":", "")}00`, `DTEND:${d8(date)}T${end}`);
  } else {
    const next = new Date(`${date}T00:00:00`);
    next.setDate(next.getDate() + 1);
    const nd = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, "0")}${String(next.getDate()).padStart(2, "0")}`;
    lines.push(`DTSTART;VALUE=DATE:${d8(date)}`, `DTEND;VALUE=DATE:${nd}`);
  }
  if (RR[ev.repeat]) lines.push(`RRULE:FREQ=${RR[ev.repeat]}`);
  lines.push(`SUMMARY:${esc(`${dogName ? `${dogName} ` : ""}${ev.title}`)}`, `DESCRIPTION:${esc("멍케어에서 넣은 일정이에요. 다녀온 뒤 멍케어에서 영수증 사진으로 진료를 정리할 수 있어요.")}`);
  lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(ev.title)}`, `TRIGGER:${ev.time ? "-PT1H" : "-PT4H"}`, "END:VALARM", "END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(ev, date, dogName) {
  const blob = new Blob([eventToIcs(ev, date, dogName)], { type: "text/calendar" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${ev.title || "일정"}.ics` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
