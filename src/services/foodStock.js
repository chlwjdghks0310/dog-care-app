import { getFeedingSettings, saveFeedingSettings } from "./feedingSettings";
import { getFeedingPlan } from "../data/feedingGuide";
import { calculateAge } from "../utils/age";
import { todayKey, toDateKey, addDays } from "../utils/date";

// 사료 남은 양 어림: 봉투 무게 ÷ 하루 급여량(사료 계산기) − 뜯은 뒤 지난 날. 간식·흘린 양은 빠져 있어 실제보다 조금 늦게 떨어질 수 있다고 안내.
// 저장: feedingSettings.bag = { grams, openedAt: "YYYY-MM-DD" }
export function openNewBag(dogId, grams, today = todayKey()) {
  saveFeedingSettings(dogId, { bag: { grams, openedAt: today } });
}

export function stockFromBag(bag, dailyGrams, today = todayKey()) {
  if (!bag?.grams || !bag.openedAt || !(dailyGrams > 0)) return null;
  const days = Math.floor(bag.grams / dailyGrams);
  const runOut = toDateKey(addDays(new Date(`${bag.openedAt}T00:00:00`), days));
  const daysLeft = Math.round((new Date(`${runOut}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
  return { daysLeft, runOut, dailyGrams, bagDays: days };
}

export function getFoodStock(dog, today = todayKey()) {
  const s = getFeedingSettings(dog.id);
  if (!s.bag) return null;
  const plan = getFeedingPlan(dog, calculateAge(dog.birthDate).ageInWeeks, { stoolCondition: s.stoolCondition, kcalPer100g: s.kcalPer100g || undefined });
  return stockFromBag(s.bag, plan?.dailyGrams, today);
}

export const stockLabel = (st) =>
  st.daysLeft <= 0 ? "사료가 다 떨어졌을 때예요" : `사료가 약 ${st.daysLeft}일 남았어요`;
