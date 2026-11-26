// "마친 뒤 한마디"(checkTalk.pickRemark)가 볼 사실을 앱 기록에서 모은다. 판단은 하지 않고 숫자와 날짜만 넘긴다.
import { ITEMS, getDay, runsOf } from "./dailyCheck";
import { getRecords } from "./records";
import { getTodaySummary } from "./todaySummary";
import { getMeds } from "./medications";
import { getFoodStock } from "./foodStock";
import { getWeightRecords } from "./weightLog";
import { getStage } from "./stageGuide";
import { getSignals } from "./signals";
import { togetherDays, isMilestone } from "./shareCard";
import { addDays, toDateKey, todayKey } from "../utils/date";

const dayDiff = (a, b) => Math.round((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 86400000);
const back = (date, n) => toDateKey(addDays(new Date(`${date}T00:00:00`), -n));

export function collectFacts(dog, today = todayKey()) {
  const d = getDay(dog.id, today);
  const y = getDay(dog.id, back(today, 1));
  let usualRun = 0;
  for (let k = today; getDay(dog.id, k)?.status === "usual"; k = back(k, 1)) usualRun++;
  const recs = getRecords(dog.id);
  const walkDays = (from, to) => new Set(recs.filter((r) => ((r.type === "vital" && r.data?.metric === "walk") || (r.type === "daily" && r.data?.kind === "산책")) && r.at.slice(0, 10) >= from && r.at.slice(0, 10) <= to).map((r) => r.at.slice(0, 10))).size;
  const lastWeight = getWeightRecords(dog.id).map((w) => w.measuredAt.slice(0, 10)).sort().at(-1);
  const ends = getMeds(dog.id).map((m) => m.endDate).filter((e) => e && e >= today).map((e) => dayDiff(e, today));
  const st = dog.birthDate ? getStage(dog) : null;
  let birthdayIn = null;
  if (dog.birthDate && !dog.ageEstimated) {
    const md = dog.birthDate.slice(5);
    const year = Number(today.slice(0, 4));
    const next = `${year}-${md}` >= today ? `${year}-${md}` : `${year + 1}-${md}`;
    if (next.slice(0, 4) !== dog.birthDate.slice(0, 4)) birthdayIn = dayDiff(next, today); // 태어난 해의 생일(=태어난 날)은 세지 않는다
  }
  const together = togetherDays(dog);
  return {
    diffToday: d?.status === "diff" ? d.picks : null,
    usualRun,
    runs: d?.status === "diff" ? runsOf(dog.id, today) : [],
    signalIds: getSignals(dog).map((s) => s.id),
    resolved: d?.status === "usual" && y?.status === "diff" ? Object.keys(y.picks || {}).map((id) => ITEMS.find((i) => i.id === id)?.label).filter(Boolean) : [],
    event: getTodaySummary(dog).nextEvent,
    medEndsIn: ends.length ? Math.min(...ends) : null,
    foodDays: getFoodStock(dog)?.daysLeft ?? null,
    walk: { now: walkDays(back(today, 6), today), before: walkDays(back(today, 13), back(today, 7)) },
    weightDays: lastWeight ? dayDiff(today, lastWeight) : null,
    stage: st && { key: st.key, name: st.name },
    birthdayIn,
    together,
    milestone: isMilestone(together),
  };
}
