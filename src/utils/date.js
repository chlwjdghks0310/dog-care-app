export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function formatKoreanDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

export function nowLabel() {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// "HH:MM" 시각에서 n분 전 시각을 "HH:MM"으로 반환 (자정 넘어가는 경우도 처리)
export function minutesBefore(timeLabel, n) {
  const [h, m] = timeLabel.split(":").map(Number);
  const total = (h * 60 + m - n + 24 * 60) % (24 * 60);
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}
