import { calculateAge } from "../utils/age";
import { todayKey } from "../utils/date";
import { getDailyRules, getWeeklyHighlights, getRulesForAge } from "../data/careRules";
import { createScheduleItem } from "../models/dog";
import { getScheduleForDate, setScheduleForDate } from "./scheduleRepository";

// 강아지 데이터 -> 월령/주령 계산 -> 규칙 조회 -> 오늘 일정 생성 순서로 동작한다.
// 하루가 지나면 새 dateKey로 자동 재생성되므로 어제 완료 상태는 오늘로 이어지지 않는다.
export function getTodayChecklist(dog, dateKey = todayKey()) {
  const existing = getScheduleForDate(dog.id, dateKey);
  if (existing) return existing;

  const age = calculateAge(dog.birthDate, new Date(dateKey));
  const rules = getDailyRules(age.ageInWeeks, dog.breed);
  const items = rules.map((rule) =>
    createScheduleItem({
      dogId: dog.id,
      ruleId: rule.id,
      title: rule.title,
      description: rule.how,
      date: dateKey,
      category: rule.category,
      suggestedTimes: rule.suggestedTimes || [],
    })
  );
  setScheduleForDate(dog.id, dateKey, items);
  return items;
}

export function getThisWeekHighlights(dog) {
  const age = calculateAge(dog.birthDate);
  return getWeeklyHighlights(age.ageInWeeks, dog.breed);
}

// 앞으로 4주 안에 새로 시작되는 관리 항목을 "다가오는 일정"으로 보여준다.
export function getUpcoming(dog) {
  const age = calculateAge(dog.birthDate);
  const currentWeek = age.ageInWeeks;
  const active = new Set(getRulesForAge(currentWeek, dog.breed).map((r) => r.id));
  const allUpcoming = [];
  for (let w = currentWeek + 1; w <= currentWeek + 4; w++) {
    for (const rule of getRulesForAge(w, dog.breed)) {
      if (!active.has(rule.id) && !allUpcoming.find((r) => r.id === rule.id)) {
        allUpcoming.push({ ...rule, startsInWeeks: rule.minWeek - currentWeek });
      }
    }
  }
  return allUpcoming;
}
