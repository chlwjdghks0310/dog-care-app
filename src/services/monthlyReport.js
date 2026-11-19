import { getRecords } from "./records";
import { getWeightRecords } from "./weightLog";
import { getDay } from "./dailyCheck";
import { visitsByDate } from "./vetVisits";
import { todayKey } from "../utils/date";

// 한 달 리포트(멍케어 플러스, 11/18): 한 달 치 기록을 달력·곡선·개수로만 보여 준다 — 지난달과 숫자 차이만, 좋다/나쁘다 판단 없음.
// 주간 리포트(weeklyReport.js)와 같은 규칙으로 센다. 달력 칸: 산책(발도장)·증상/무른 변(점)·병원(십자)·하루 체크(옅은 칠).
const pad = (n) => String(n).padStart(2, "0");
export const monthOf = (day) => day.slice(0, 7);
export const addMonths = (month, n) => { const [y, m] = month.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
export const monthLabel = (month) => `${Number(month.slice(5, 7))}월`;
const lastDayOf = (month) => { const [y, m] = month.split("-").map(Number); return new Date(y, m, 0).getDate(); };

const WALK = (r) => (r.type === "vital" && r.data?.metric === "walk") || (r.type === "daily" && r.data?.kind === "산책");
const LOOSE = (r) => r.type === "potty" && r.data?.stool && !["정상", "안 봄"].includes(r.data.stool);

function count(dogId, month, today) {
  const from = `${month}-01`;
  const end = `${month}-${pad(lastDayOf(month))}`;
  const to = end < today ? end : today; // 이번 달이면 오늘까지
  const recs = getRecords(dogId).filter((r) => r.at && r.at.slice(0, 10) >= from && r.at.slice(0, 10) <= to);
  const dayOf = (r) => r.at.slice(0, 10);
  const walkRecs = recs.filter(WALK);
  const walkDates = [...new Set(walkRecs.map(dayOf))].sort();
  const walkMinutes = walkRecs.reduce((s, r) => s + (Number(r.type === "vital" ? r.data.value : r.data.minutes) || 0), 0);
  const meals = recs.filter((r) => r.type === "meal" && r.data?.appetite);
  const meal = { usual: meals.filter((r) => r.data.appetite === "평소").length, less: meals.filter((r) => r.data.appetite === "평소보다 적음").length, more: meals.filter((r) => r.data.appetite === "평소보다 많음").length };
  const looseDays = [...new Set(recs.filter(LOOSE).map(dayOf))].sort();
  const symptoms = recs.filter((r) => r.type === "symptom").map((r) => ({ date: dayOf(r), kinds: r.data?.kinds || [] }));
  const kindCount = {};
  for (const s of symptoms) for (const k of s.kinds) kindCount[k] = (kindCount[k] || 0) + 1;
  const topKinds = Object.entries(kindCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const visits = visitsByDate(dogId, from, to);
  const vetDays = Object.keys(visits).filter((d) => visits[d].records.length || visits[d].events.length).sort();
  const cost = Object.values(visits).reduce((s, v) => s + v.cost, 0);
  const ws = getWeightRecords(dogId).filter((w) => w.measuredAt.slice(0, 10) >= from && w.measuredAt.slice(0, 10) <= to).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const weights = ws.map((w) => ({ date: w.measuredAt.slice(0, 10), kg: w.weightKg }));
  // 하루 체크: 지난 날 중 체크한 날(이번 달이면 오늘까지)
  const elapsed = Number(to.slice(8, 10));
  const checkDays = [];
  for (let i = 1; i <= elapsed; i++) { const d = `${month}-${pad(i)}`; const v = getDay(dogId, d); if (v && v.status !== "unknown") checkDays.push(d); }
  return { from, to, days: lastDayOf(month), elapsed, records: recs.length + ws.length, walk: { dates: walkDates, days: walkDates.length, minutes: walkMinutes }, meal, looseDays, symptoms, topKinds, vetDays, cost, weights, checkDays };
}

export function buildMonthlyReport(dog, month = monthOf(todayKey()), today = todayKey()) {
  const cur = count(dog.id, month, today);
  const prevMonth = addMonths(month, -1);
  const prev = count(dog.id, prevMonth, today);
  // 체중: 이 달 마지막 vs 지난달 마지막(둘 다 있을 때만 차이)
  const lastKg = cur.weights.at(-1)?.kg ?? null;
  const prevKg = prev.weights.at(-1)?.kg ?? null;
  const diff = (a, b) => (a == null || b == null ? null : Math.round((a - b) * 100) / 100);
  const symptomDates = new Set(cur.symptoms.map((s) => s.date));
  const cells = Array.from({ length: cur.days }, (_, i) => {
    const d = `${month}-${pad(i + 1)}`;
    return { date: d, day: i + 1, future: d > today, walk: cur.walk.dates.includes(d), mark: symptomDates.has(d) || cur.looseDays.includes(d), vet: cur.vetDays.includes(d), checked: cur.checkDays.includes(d) };
  });
  const firstDow = (new Date(`${month}-01T00:00:00`).getDay() + 6) % 7; // 월요일 시작
  return {
    month, prevMonth, ...cur, cells, firstDow, isCurrent: month === monthOf(today),
    weight: { last: lastKg, prevLast: prevKg, diff: diff(lastKg, prevKg) },
    compare: { walkDays: cur.walk.days - prev.walk.days, walkMinutes: cur.walk.minutes - prev.walk.minutes, symptoms: cur.symptoms.length - prev.symptoms.length, looseDays: cur.looseDays.length - prev.looseDays.length, cost: cur.cost - prev.cost, vetDays: cur.vetDays.length - prev.vetDays.length },
    prevHasRecords: prev.records > 0,
    prevCheck: prev.checkDays.length,
  };
}

// 플러스 비서에게 줄 한 달 요약(짧은 글, 숫자만) — 답은 화면에 세 줄로
export function monthDigest(dog, r) {
  const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
  return [
    `${dog.name} ${monthLabel(r.month)} 리포트(${r.from}~${r.to}, 기록 ${r.records}개)를 세 줄로 읽어 줘: 잘한 것 / 지켜볼 것 / 다음 달 할 일. 진단 단정·약 용량 없이.`,
    `하루 체크 ${r.checkDays.length}/${r.elapsed}일`, `산책 ${r.walk.days}일 ${r.walk.minutes}분(지난달 대비 ${sign(r.compare.walkDays)}일)`,
    `밥 평소 ${r.meal.usual}·적게 ${r.meal.less}·많이 ${r.meal.more}`, `증상 ${r.symptoms.length}번(${r.topKinds.map(([k, n]) => `${k} ${n}`).join(", ") || "없음"}), 무른 변 ${r.looseDays.length}일`,
    `병원 ${r.vetDays.length}번, 병원비 ${r.cost.toLocaleString()}원(지난달 대비 ${sign(r.compare.cost)})`,
    r.weight.last != null ? `체중 ${r.weight.last}kg${r.weight.diff != null ? `(지난달 대비 ${sign(r.weight.diff)})` : ""}` : "체중 기록 없음",
  ].join(" · ");
}
