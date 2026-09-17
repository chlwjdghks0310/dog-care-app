import { getBreedAppearance } from "./breedAppearance";

// 실제 개별 수의사 자문이 아니라, AAHA/WSAVA의 대사에너지요구량(DER) 공식과
// 공개된 반려동물 영양학 자료를 근거로 한 "참고용 계산"이다. 사료 열량은 제품마다
// 크게 달라서(보통 300~450kcal/100g) 사용자가 사료 봉투의 kcal/100g을 입력하면
// 그 값을, 입력하지 않으면 업계 평균 추정치를 사용한다.
const DEFAULT_KCAL_PER_100G = 375; // 건식 사료 평균 추정치 (실제 제품 급여 가이드 확인 권장)
const GRAMS_PER_TABLESPOON = 7; // 사료 1큰술(테이블스푼) 평균 추정치(약 5.6~8g, 알갱이 크기에 따라 다름)

// RER(안정시 에너지 요구량, kcal/day) = 70 * 체중(kg)^0.75 — AAHA/WSAVA 표준 공식
export function calculateRER(weightKg) {
  return 70 * Math.pow(weightKg, 0.75);
}

// 생애주기 계수(Life Stage Factor). 대형견은 성장기가 더 길어서(성견 도달이 늦음)
// 성장기 계수를 더 오래 적용한다 (앱 내 대형견 성장기 기준인 78주와 동일하게 맞춤).
export function getLifeStageFactor(ageInWeeks, neutered, sizeCategory) {
  if (ageInWeeks < 17) return 3.0; // 생후 4개월 미만 성장기 초반
  const growthEndWeek = sizeCategory === "large" ? 78 : 52;
  if (ageInWeeks < growthEndWeek) return 2.0; // 성장기
  return neutered ? 1.6 : 1.8; // 성견, 중성화 여부에 따른 표준 계수(보통 활동량 기준)
}

export function getSoakGuidance(ageInWeeks) {
  if (ageInWeeks < 12) {
    return {
      needed: true,
      label: "불려서 급여하는 걸 권장해요",
      reason: "이유기~이갈이 시작 전이라 딱딱한 사료를 씹기 어려울 수 있어요.",
    };
  }
  if (ageInWeeks < 17) {
    return {
      needed: "optional",
      label: "아이가 잘 씹으면 서서히 건사료로 전환해도 돼요",
      reason: "적응 속도는 개체마다 달라요. 아직 어려워하면 계속 불려주세요.",
    };
  }
  return {
    needed: false,
    label: "보통은 불리지 않아도 괜찮아요",
    reason: "다만 노령이거나 치아가 약하면 계속 불려줘도 좋아요.",
  };
}

export const SOAK_WATER_TEMP = {
  celsius: "38~40°C",
  description: "아기 분유 먹일 때 물 온도와 비슷해요 (손등에 떨어뜨렸을 때 뜨겁지 않고 미지근한 정도)",
};

export const SOAK_DURATION = {
  soft: "5~10분 (표면만 부드럽게)",
  mash: "20~30분 (완전히 죽처럼, 이유기 초반에 추천)",
  safety: "끓는 물은 쓰지 마세요(영양소 손실 위험). 불린 사료를 상온에 오래 두지 말고 바로 급여하세요(세균 번식 위험).",
};

// 배변 상태에 따른 조정은 정밀한 공식이 아니라, "체중/변 상태를 주기적으로 재평가해
// 5~10% 단위로 가감한다"는 일반 수의영양학 원칙을 단순화해 반영한 값이다.
export function getStoolAdjustment(condition) {
  switch (condition) {
    case "loose":
      return { factor: 0.9, note: "최근 변이 무른 편이면 다음 급여량을 10% 정도 줄여보고, 하루 이상 지속되면 병원 상담을 권해요." };
    case "constipated":
      return { factor: 1.0, note: "변이 단단한 편이면 양보다는 물 섭취량을 늘려보세요. 지속되면 병원 상담을 권해요." };
    default:
      return { factor: 1.0, note: null };
  }
}

export function getMealsPerDay(ageInWeeks) {
  if (ageInWeeks < 17) return 4;
  if (ageInWeeks < 26) return 3;
  return 2;
}

// dog: Dog 모델. options: { stoolCondition?: 'normal'|'loose'|'constipated', kcalPer100g?: number }
export function getFeedingPlan(dog, ageInWeeks, options = {}) {
  const weightKg = Number(dog.weight) || 0;
  const appearance = getBreedAppearance(dog.breed);
  const kcalPer100g = options.kcalPer100g || DEFAULT_KCAL_PER_100G;
  const usedDefaultKcal = !options.kcalPer100g;

  const rer = calculateRER(weightKg);
  const lifeStageFactor = getLifeStageFactor(ageInWeeks, dog.neutered, appearance.sizeCategory);
  const adjustment = getStoolAdjustment(options.stoolCondition);

  const dailyKcal = rer * lifeStageFactor * adjustment.factor;
  const dailyGrams = (dailyKcal / kcalPer100g) * 100;
  const mealsPerDay = getMealsPerDay(ageInWeeks);
  const gramsPerMeal = dailyGrams / mealsPerDay;
  const tablespoonsPerMeal = gramsPerMeal / GRAMS_PER_TABLESPOON;

  return {
    dailyKcal: Math.round(dailyKcal),
    dailyGrams: Math.round(dailyGrams),
    mealsPerDay,
    gramsPerMeal: Math.round(gramsPerMeal),
    tablespoonsPerMeal: Math.round(tablespoonsPerMeal * 2) / 2, // 0.5 단위 반올림
    usedDefaultKcal,
    kcalPer100g,
    soak: getSoakGuidance(ageInWeeks),
    adjustmentNote: adjustment.note,
  };
}
