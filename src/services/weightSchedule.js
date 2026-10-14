import { readJSON, writeJSON } from "./storage";
import { toDateKey, addDays } from "../utils/date";
import { getBreedAppearance } from "../data/breedAppearance";
import { getLatestWeightRecord } from "./weightLog";

const KEY = "dogcare-weight-cadence-v1";

// 서비스 초기 기본값일 뿐, 모든 강아지에게 적용되는 의학적 규칙은 아니다.
// 생후 0~2주: 매일 / 2주~1개월: 3일 / 1~6개월: 7일 / 6개월 이후 성장기: 14일 /
// 성견(건강): 30일 / 노령견: 30일(시작점, 사용자가 조정 가능).
// "성장 완료" 여부는 나이만으로 단정하지 않고 견종 크기(sizeCategory)를 같이 참고한다
// (대형견은 더 늦게 성체가 된다고 알려져 있다 — weightGuide.js의 isLikelyAdult와 같은 기준).
function isLikelyAdult(sizeCategory, ageInMonths) {
  return sizeCategory === "large" ? ageInMonths >= 18 : ageInMonths >= 12;
}

// 노령견 진입 시점도 견종 크기에 따라 다르다고 알려져 있어 대략적으로만 나눈다(대형견이 더 이름).
function isLikelySenior(sizeCategory, ageInMonths) {
  return sizeCategory === "large" ? ageInMonths >= 72 : ageInMonths >= 96;
}

export function getDefaultCadenceDays(dog, ageInWeeks, ageInMonths) {
  if (ageInWeeks <= 2) return 1;
  if (ageInWeeks <= 4) return 3;
  if (ageInMonths <= 6) return 7;
  const sizeCategory = getBreedAppearance(dog.breed).sizeCategory;
  if (isLikelySenior(sizeCategory, ageInMonths)) return 30;
  if (!isLikelyAdult(sizeCategory, ageInMonths)) return 14;
  return 30;
}

function getAll() {
  return readJSON(KEY, {});
}

// 사용자가 직접 정한(또는 수의사 지침을 받아 입력한) 측정 주기. 있으면 기본값보다 우선한다.
export function getCustomCadenceDays(dogId) {
  return getAll()[dogId] ?? null;
}

export function setCustomCadenceDays(dogId, days) {
  const all = getAll();
  if (days == null) {
    delete all[dogId];
  } else {
    all[dogId] = days;
  }
  writeJSON(KEY, all);
}

export function getEffectiveCadenceDays(dog, ageInWeeks, ageInMonths) {
  const custom = getCustomCadenceDays(dog.id);
  return custom ?? getDefaultCadenceDays(dog, ageInWeeks, ageInMonths);
}

// 다음 측정 예정일 — 마지막으로 "실제 저장된" 측정 기록 날짜 + 적용 주기로 계산한다.
// 과거 기록을 나중에 추가해도, 그게 가장 최근 기록이 아니면 다음 예정일에 영향을 주지 않는다
// (가장 최근 기록 기준으로만 계산하므로).
export function getNextDueDateKey(dog, ageInWeeks, ageInMonths) {
  const cadence = getEffectiveCadenceDays(dog, ageInWeeks, ageInMonths);
  const latest = getLatestWeightRecord(dog.id);
  if (!latest) return toDateKey(new Date());
  return toDateKey(addDays(new Date(latest.measuredAt), cadence));
}
