import { calculateAge } from "../utils/age";
import { todayKey, toDateKey, addDays } from "../utils/date";
import { getDailyRules, getWeeklyHighlights, getRulesForAge } from "../data/careRules";
import { createScheduleItem } from "../models/dog";
import { getScheduleForDate, setScheduleForDate } from "./scheduleRepository";
import { getHiddenRules } from "./ruleOverrides";
import { getNextDueDateKey } from "./weightSchedule";
import { hasWeightRecordOnDate } from "./weightLog";

// 강아지 데이터 -> 월령/주령 계산 -> 규칙 조회 -> 오늘 일정 생성 순서로 동작한다.
// 하루가 지나면 새 dateKey로 자동 재생성되므로 어제 완료 상태는 오늘로 이어지지 않는다.
// 완료 상태는 생성 당시의 규칙 전체로 저장해두고, 사용자가 "숨기기"한 항목은 읽을 때마다 걸러낸다
// (나중에 숨기기를 해제해도 기존 완료 기록이 살아있도록).
export function getTodayChecklist(dog, dateKey = todayKey()) {
  const hidden = getHiddenRules(dog.id);
  let items = getScheduleForDate(dog.id, dateKey);
  if (!items) {
    const age = calculateAge(dog.birthDate, new Date(dateKey));
    const rules = getDailyRules(age.ageInWeeks, dog.breed);
    items = rules.map((rule) =>
      createScheduleItem({
        // 날짜+규칙으로 정해지는 id — 가족 폰 두 대가 같은 날 각자 목록을 만들어도 같은 항목으로 합쳐진다(중복 표시 방지)
        id: `sch-${dateKey}-${rule.id}`,
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
  }
  return items.filter((it) => !hidden[it.ruleId]);
}

// "체중 측정"은 다른 케어 규칙과 달리 스케줄 저장소에 캐시하지 않는다 — 완료 여부를 매번
// 실제 체중 기록 유무로 그 자리에서 계산해서, 기록을 수정·삭제해도 항상 최신 상태로 보이게 한다.
export function getWeightCheckItem(dog, dateKey = todayKey()) {
  const age = calculateAge(dog.birthDate, new Date(dateKey));
  const completedToday = hasWeightRecordOnDate(dog.id, dateKey);
  const dueDateKey = getNextDueDateKey(dog, age.ageInWeeks, age.ageInMonths);
  // dateKey에 이미 기록이 있으면(오늘 막 쟀으면) 그 기록 때문에 다음 예정일이 벌써 미래로
  // 넘어가 있어도 오늘 항목은 "완료"로 계속 보여준다 — 그래야 체크 직후 항목이 사라지지 않는다.
  if (dateKey < dueDateKey && !completedToday) return null;
  return {
    id: `weight-${dateKey}`,
    ruleId: "weight-check",
    title: "체중 측정",
    description: completedToday ? "오늘 체중을 기록했어요." : dateKey > dueDateKey ? "측정 예정일이 지났어요." : "오늘은 체중을 재는 날이에요.",
    category: "체중관리",
    completed: completedToday,
  };
}

export function getThisWeekHighlights(dog) {
  const hidden = getHiddenRules(dog.id);
  const age = calculateAge(dog.birthDate);
  return getWeeklyHighlights(age.ageInWeeks, dog.breed).filter((r) => !hidden[r.id]);
}

// 앞으로 4주 안에 새로 시작되는 관리 항목을 "다가오는 일정"으로 보여준다.
export function getUpcoming(dog) {
  const hidden = getHiddenRules(dog.id);
  const age = calculateAge(dog.birthDate);
  const currentWeek = age.ageInWeeks;
  const active = new Set(getRulesForAge(currentWeek, dog.breed).map((r) => r.id));
  const allUpcoming = [];
  for (let w = currentWeek + 1; w <= currentWeek + 4; w++) {
    for (const rule of getRulesForAge(w, dog.breed)) {
      if (!active.has(rule.id) && !allUpcoming.find((r) => r.id === rule.id) && !hidden[rule.id]) {
        allUpcoming.push({ ...rule, startsInWeeks: rule.minWeek - currentWeek });
      }
    }
  }
  return allUpcoming;
}

// rule.minWeek 주차가 시작되는 실제 달력 날짜 — 캘린더에 "이 날부터 시작" 마커로 쓴다.
export function getRuleStartDateKey(dog, rule) {
  return toDateKey(addDays(new Date(dog.birthDate), rule.minWeek * 7));
}

// 특정 날짜(dateKey) 기준으로 적용되는 케어 규칙 — 캘린더 월간 마커/일자 상세에 쓴다.
// 숨김 여부는 호출 쪽(캘린더 화면)이 자기 state로 들고 있는 hidden 맵으로 직접 거른다.
export function getRulesForDate(dog, dateKey) {
  const age = calculateAge(dog.birthDate, new Date(dateKey));
  return getRulesForAge(age.ageInWeeks, dog.breed);
}
