// 비서 첫 화면 말풍선의 "오늘 요약" — 남은 할 일, 다음 약, 가까운 일정(7일 안). 기록된 사실만 모은다(판단·점수 없음).
import { todayKey, toDateKey, addDays } from "../utils/date";
import { getTodayChecklist } from "./careEngine";
import { getDosesForDate } from "./medications";
import { getOccurrences } from "./calendarEvents";

export function getTodaySummary(dog, now = new Date()) {
  const today = todayKey();
  const checklist = getTodayChecklist(dog, today);
  const left = checklist.filter((i) => !i.completed);
  const doses = getDosesForDate(dog.id, today, now);
  const nextDose = doses.find((d) => d.status === "planned") || null;
  const checkDoses = doses.filter((d) => d.status === "check").length;
  const until = toDateKey(addDays(new Date(`${today}T00:00:00`), 7));
  const next = getOccurrences(dog.id, today, until)[0] || null;
  const days = next ? Math.round((new Date(`${next.date}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000) : null;
  return {
    tasksTotal: checklist.length,
    tasksLeft: left.map((i) => i.title),
    nextDose: nextDose && { time: nextDose.time, name: nextDose.med.name, dose: nextDose.med.dose },
    checkDoses,
    nextEvent: next && { title: next.event.title, time: next.event.time || "", days },
  };
}
