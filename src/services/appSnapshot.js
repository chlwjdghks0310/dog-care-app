import { getDogs } from "./dogRepository";
import { getTodayChecklist, getThisWeekHighlights, getUpcoming } from "./careEngine";
import { getScheduleForDate } from "./scheduleRepository";
import { getEventsByDog } from "./calendarEvents";
import { getCustomSchedules } from "./customSchedules";
import { getMeds, getDosesForDate, isEnded, getStockInfo } from "./medications";
import { getFeedingSettings } from "./feedingSettings";
import { getWeightRecords } from "./weightLog";
import { getExpenses, getCategories, getAllowance, UNKNOWN_CATEGORY } from "./expenses";
import { toDateKey, todayKey } from "../utils/date";

// AI 채팅에 함께 보내는 "앱 기록 요약" — [id:...]는 AI가 고치기·지우기할 기록을 가리킬 때 쓴다. — 체크리스트·일정표·가계부·알람·체중 등 사용자가 앱에 적은 내용을
// 짧은 글로 정리해서, "이번 달 얼마 썼어?", "다음 일정 뭐야?" 같은 질문에 AI가 실제 기록으로 답하게 한다.
// ponytail: 매번 전체를 요약해서 보냄(기간을 잘라 길이를 제한) — 기록이 아주 많아지면 질문에 맞는 부분만 골라 보내기.
const won = (n) => `${n.toLocaleString("ko-KR")}원`;
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const daysFrom = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateKey(d);
};

export function buildAppSnapshot(dog) {
  const today = todayKey();
  const lines = [`오늘: ${today}`];

  const others = getDogs().filter((d) => d.id !== dog.id);
  if (others.length) lines.push(`함께 등록된 다른 강아지: ${others.map((d) => `${d.name}(${d.breed})`).join(", ")}`);

  // 체크리스트
  const checklist = getTodayChecklist(dog);
  if (checklist.length) {
    lines.push("", "[체크리스트 - 오늘 해야 할 일]");
    for (const it of checklist) lines.push(`- ${it.completed ? "완료" : "아직"}: ${it.title}${it.suggestedTimes?.length ? ` (${it.suggestedTimes.join(", ")})` : ""}`);
  }
  const recent = [];
  for (let i = 1; i <= 7; i++) {
    const items = getScheduleForDate(dog.id, daysFrom(-i)) || [];
    if (items.length) recent.push(`${daysFrom(-i)} ${items.filter((x) => x.completed).length}/${items.length}`);
  }
  if (recent.length) lines.push(`지난 7일 체크리스트 완료(완료/전체): ${recent.join(", ")}`);
  const week = getThisWeekHighlights(dog);
  if (week.length) lines.push(`이번 주 핵심: ${week.map((r) => r.title).join(", ")}`);
  const upcoming = getUpcoming(dog);
  if (upcoming.length) lines.push(`다가오는 관리: ${upcoming.map((r) => `${r.title}(${r.startsInWeeks}주 뒤)`).join(", ")}`);

  // 일정표(직접 적은 일정) — 지난 30일 ~ 앞으로 60일
  const events = Object.entries(getEventsByDog(dog.id) || {})
    .filter(([date, list]) => date >= daysFrom(-30) && date <= daysFrom(60) && list.length)
    .sort(([a], [b]) => a.localeCompare(b));
  if (events.length) {
    lines.push("", "[일정표 - 보호자가 적은 일정 (지난 30일~앞으로 60일)]");
    for (const [date, list] of events) lines.push(`- ${date}${date === today ? "(오늘)" : ""}: ${list.map((e) => `${e.title} [id:${e.id}]`).join(", ")}`);
  }

  // 알람·사료
  const alarms = getCustomSchedules(dog.id);
  if (alarms.length) lines.push("", `[알람] ${alarms.map((a) => `${a.date ? `${a.date} 하루만 ` : "매일 "}${a.time} ${a.title}${a.enabled ? "" : "(꺼짐)"} [id:${a.id}]`).join(", ")}`);
  // 약 — AI는 읽기만 한다(용량·횟수 변경이나 복용 기록은 보호자가 약 관리 화면에서)
  const meds = getMeds(dog.id).filter((m) => !isEnded(m, today));
  if (meds.length) {
    const STATUS = { planned: "예정", done: "먹임", skipped: "건너뜀", check: "기록 없음(확인 필요)" };
    lines.push("", "[약 관리 - 처방대로 보호자가 적은 것]");
    for (const m of meds) {
      const stock = getStockInfo(dog.id, m);
      lines.push(`- ${m.name} 1회 ${m.dose}, ${m.days?.length ? `요일 ${m.days.map((d) => "일월화수목금토"[d]).join("")}` : "매일"} ${m.times.join(", ")}, ${m.startDate}~${m.endDate || "계속"}${m.purpose ? `, 메모: ${m.purpose}` : ""}${stock ? `, 남은 수량 ${stock.remaining}개` : ""}`);
    }
    // 어제·오늘 복용 건 — [복용:...]은 AI가 "먹였어" 기록할 때 가리키는 값
    for (const [label, date] of [["어제", daysFrom(-1)], ["오늘", today]]) {
      const doses = getDosesForDate(dog.id, date);
      if (doses.length) lines.push(`${label}(${date}) 복용: ${doses.map((d) => `${d.time} ${d.med.name} ${d.med.dose} ${STATUS[d.status]}${d.status === "done" ? `(${d.record.doneAt.slice(11, 16)}에 먹임)` : ""} [복용:${d.key}]`).join(", ")}`);
    }
  }
  const feeding = getFeedingSettings(dog.id);
  if (feeding.times?.length || feeding.kcalPer100g) {
    lines.push(`[사료 계산기] 급여 시각 ${feeding.times?.join(", ") || "없음"}${feeding.kcalPer100g ? `, 사료 열량 ${feeding.kcalPer100g}kcal/100g` : ""}`);
  }

  // 체중 기록(최근 10개)
  const weights = getWeightRecords(dog.id).slice(-10);
  if (weights.length) lines.push("", `[체중 관리] ${weights.map((r) => `${r.measuredAt.slice(0, 16).replace("T", " ")} ${r.weightKg}kg [id:${r.id}]`).join(", ")}`);

  // 가계부 — 이번 달·지난달 합계, 이번 달 카테고리별, 최근 기록
  const categories = getCategories();
  const catName = (id) => (categories.find((c) => c.id === id) || UNKNOWN_CATEGORY).name;
  const expenses = getExpenses(dog.id);
  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const inMonth = (m) => expenses.filter((e) => e.date.startsWith(m));
  const sum = (list) => list.reduce((s, e) => s + e.amount, 0);
  const allowance = getAllowance(dog.id, thisMonth);
  const spent = sum(inMonth(thisMonth));
  if (expenses.length || allowance) {
    lines.push("", "[가계부]");
    lines.push(`이번 달(${thisMonth}) 지출 ${won(spent)}${allowance ? `, 용돈 ${won(allowance)}, ${allowance - spent >= 0 ? `남은 돈 ${won(allowance - spent)}` : `${won(spent - allowance)} 초과`}` : ", 용돈 미설정"}`);
    lines.push(`지난달(${lastMonth}) 지출 ${won(sum(inMonth(lastMonth)))}`);
    const byCat = {};
    for (const e of inMonth(thisMonth)) byCat[catName(e.categoryId)] = (byCat[catName(e.categoryId)] || 0) + e.amount;
    const catLine = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([n, v]) => `${n} ${won(v)}`).join(", ");
    if (catLine) lines.push(`이번 달 카테고리별: ${catLine}`);
    const latest = [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
    if (latest.length) lines.push(`최근 지출(최대 30건): ${latest.map((e) => `${e.date} ${e.title} ${won(e.amount)}(${catName(e.categoryId)}) [id:${e.id}]`).join("; ")}`);
  }

  return lines.join("\n");
}
