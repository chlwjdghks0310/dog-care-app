import { getRecords } from "./records";
import { getWeightRecords } from "./weightLog";
import { getScheduleForDate } from "./scheduleRepository";
import { getOccurrences } from "./calendarEvents";
import { getFoodStock } from "./foodStock";
import { aloneSummary } from "./routine";
import { todayKey, toDateKey, addDays } from "../utils/date";

// 주간 리포트: 지난 7일(오늘 포함) 기록을 모아 숫자로만 보여 준다 — 판단·점수 없이, 기록된 사실과 다음 주 일정만.
const key = (base, n) => toDateKey(addDays(new Date(`${base}T00:00:00`), n));

export function buildWeeklyReport(dog, today = todayKey()) {
  const from = key(today, -6);
  const inWeek = (at) => at && at.slice(0, 10) >= from && at.slice(0, 10) <= today;
  const recs = getRecords(dog.id).filter((r) => inWeek(r.at));
  const dayOf = (r) => r.at.slice(0, 10);

  const walkRecs = recs.filter((r) => (r.type === "vital" && r.data?.metric === "walk") || (r.type === "daily" && r.data?.kind === "산책"));
  const walk = {
    days: new Set(walkRecs.map(dayOf)).size,
    minutes: walkRecs.reduce((s, r) => s + (Number(r.type === "vital" ? r.data.value : r.data.minutes) || 0), 0),
  };
  const meals = recs.filter((r) => r.type === "meal" && r.data?.appetite);
  const meal = { usual: meals.filter((r) => r.data.appetite === "평소").length, less: meals.filter((r) => r.data.appetite === "평소보다 적음").length, more: meals.filter((r) => r.data.appetite === "평소보다 많음").length };
  // 배변: '정상'이 아닌 대변이 기록된 날(무름·설사·딱딱함·피 섞임)
  const looseDays = [...new Set(recs.filter((r) => r.type === "potty" && r.data?.stool && !["정상", "안 봄"].includes(r.data.stool)).map(dayOf))].sort();
  const symptoms = recs.filter((r) => r.type === "symptom").map((r) => ({ date: dayOf(r), kinds: r.data?.kinds || [] })).sort((a, b) => a.date.localeCompare(b.date));

  // 체중: 이번 주 마지막 기록과 그 전 마지막 기록(숫자 차이만)
  const ws = getWeightRecords(dog.id);
  const thisW = [...ws].reverse().find((w) => inWeek(w.measuredAt));
  const prevW = [...ws].reverse().find((w) => w.measuredAt.slice(0, 10) < from);
  const weight = thisW ? { kg: thisW.weightKg, diff: prevW ? Math.round((thisW.weightKg - prevW.weightKg) * 100) / 100 : null } : null;

  // 체크리스트: 목록이 만들어진 날만 센다(앱을 안 연 날은 목록 자체가 없음)
  let done = 0, total = 0;
  for (let i = 0; i < 7; i++) {
    const items = getScheduleForDate(dog.id, key(from, i)) || [];
    total += items.length;
    done += items.filter((it) => it.completed).length;
  }

  const next = getOccurrences(dog.id, key(today, 1), key(today, 7)).filter((o) => o.isStart).map((o) => ({ date: o.date, title: o.event.title, time: o.event.time }));
  const records = recs.length + ws.filter((w) => inWeek(w.measuredAt)).length;
  return { from, to: today, records, walk, meal, looseDays, symptoms, weight, checklist: { done, total }, next, food: getFoodStock(dog, today), alone: aloneSummary(from, key(today, -1)) }; // 혼자 있던 시간은 끝난 날(어제까지)만
}

// 일요일 밤 리포트 알림 시각(고정) — 바꾸려면 여기만
export const REPORT_DAY = 0;
export const REPORT_TIME = "20:00";
