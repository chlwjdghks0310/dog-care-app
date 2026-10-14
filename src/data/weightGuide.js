// 체중 평가 — AKC/FCI 견종 표준에 공개된 성견 체중 범위와, 수의 영양학에서 널리 쓰이는
// 비만 판정 기준(이상 체중의 +20% 이상 = 비만, WSAVA Global Nutrition Committee 자료 계열)을
// 근거로 "적정/과체중/비만/저체중"을 판단한다. 개체마다 혈통·성별에 따라 범위를 벗어날 수 있는
// 대략적 참고치이며, 수의사의 직접 진료를 대신하지 않는다.
import { getBreedAppearance } from "./breedAppearance";

const BREED_WEIGHT_RANGES = [
  { keys: ["포메라니안"], min: 1.9, max: 3.5 },
  { keys: ["말티즈"], min: 2, max: 4 },
  { keys: ["토이푸들"], min: 2, max: 4.5 },
  { keys: ["미니어처 푸들"], min: 4.5, max: 7 },
  { keys: ["스탠다드 푸들", "스탠다드푸들"], min: 20, max: 32 },
  { keys: ["치와와"], min: 1.5, max: 3 },
  { keys: ["요크셔테리어", "요크셔"], min: 2, max: 3.2 },
  { keys: ["비숑"], min: 3, max: 5.4 },
  { keys: ["시츄"], min: 4, max: 7.2 },
  { keys: ["페키니즈"], min: 3.2, max: 6.4 },
  { keys: ["닥스훈트", "닥스"], min: 7, max: 15 },
  { keys: ["웰시코기", "코기"], min: 10, max: 14 },
  { keys: ["비글"], min: 9, max: 11 },
  { keys: ["진돗개", "진도"], min: 15, max: 23 },
  { keys: ["시바", "시베"], min: 8, max: 11 },
  { keys: ["슈나우저"], min: 5.5, max: 9 },
  { keys: ["프렌치불독"], min: 8, max: 14 },
  { keys: ["불독", "불도그"], min: 18, max: 25 },
  { keys: ["퍼그"], min: 6.3, max: 9.9 },
  { keys: ["보더콜리"], min: 12, max: 20 },
  { keys: ["잭러셀"], min: 5, max: 8 },
  { keys: ["골든", "리트리버"], min: 25, max: 34 },
  { keys: ["래브라도"], min: 25, max: 36 },
  { keys: ["사모예드"], min: 16, max: 30 },
  { keys: ["허스키", "시베리안"], min: 16, max: 27 },
  { keys: ["말라뮤트"], min: 34, max: 43 },
  { keys: ["도베르만"], min: 27, max: 45 },
  { keys: ["로트와일러"], min: 35, max: 60 },
  { keys: ["그레이하운드"], min: 27, max: 40 },
  { keys: ["카발리에"], min: 5.4, max: 8.2 },
  { keys: ["달마시안"], min: 20, max: 32 },
  { keys: ["샤페이"], min: 18, max: 29 },
  { keys: ["웨스트 하이랜드", "웨스트하이랜드"], min: 6, max: 10 },
  { keys: ["그레이트데인"], min: 45, max: 90 },
  { keys: ["세인트버나드"], min: 54, max: 91 },
  { keys: ["와이마라너"], min: 25, max: 40 },
  { keys: ["복서"], min: 25, max: 32 },
  { keys: ["바셋하운드"], min: 20, max: 29 },
];

// 목록에 없는 견종(믹스견 포함)은 몸집 크기대로 대략적인 범위를 쓴다.
const SIZE_FALLBACK_RANGE = {
  small: { min: 1, max: 10 },
  medium: { min: 10, max: 25 },
  large: { min: 25, max: 50 },
};

export function getWeightRange(breed) {
  const name = (breed || "").trim();
  const found = BREED_WEIGHT_RANGES.find((r) => r.keys.some((k) => name.includes(k)));
  if (found) return found;
  const sizeCategory = getBreedAppearance(breed).sizeCategory;
  return SIZE_FALLBACK_RANGE[sizeCategory] || SIZE_FALLBACK_RANGE.medium;
}

// 소형견은 생후 10~12개월, 중형견은 12개월, 대형/초대형견은 18~24개월까지 성장하는 게
// 일반적이라고 알려져 있다(견종별 성장 속도 차이, 일반 수의 영양학 자료 기반).
function isLikelyAdult(sizeCategory, ageInMonths) {
  if (sizeCategory === "large") return ageInMonths >= 18;
  return ageInMonths >= 12;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// 성장기 보정치 — 실제 견종별 정밀 성장곡선 자료가 아니라 "성견 체중의 약 5%에서 시작해
// 성숙 시점(소/중형 12개월, 대형 18개월)에 100%가 된다"는 단순 선형 근사치다. 실제 성장은
// 품종마다 S자 곡선에 가깝고 이 근사치보다 빠르거나 느릴 수 있다 — 그래서 월령에 따라
// 구간이 유연하게 넓어지도록 쓰되, 정밀한 진단 기준으로는 쓰지 않는다.
function getGrowthFactor(sizeCategory, ageInMonths) {
  const maturityMonths = sizeCategory === "large" ? 18 : 12;
  if (ageInMonths >= maturityMonths) return 1;
  const startFraction = 0.05;
  const t = Math.max(0, ageInMonths) / maturityMonths;
  return startFraction + (1 - startFraction) * t;
}

// 지금 월령 기준으로 기대되는 체중 구간. 성견이면 견종 표준 범위 그대로, 성장기면 위 보정치로
// 비례해 줄인 구간을 돌려준다 — 그래프의 "적정 구간" 띠가 월령에 따라 유연하게 움직이는 데 쓴다.
export function getExpectedWeightRange(breed, ageInMonths) {
  const adultRange = getWeightRange(breed);
  const sizeCategory = getBreedAppearance(breed).sizeCategory;
  if (isLikelyAdult(sizeCategory, ageInMonths)) return adultRange;
  const factor = getGrowthFactor(sizeCategory, ageInMonths);
  return { min: round1(adultRange.min * factor), max: round1(adultRange.max * factor) };
}

// weight(kg), ageInMonths를 받아 체중 상태를 판정한다. 성장기에도 "판단 보류"로 넘기지 않고
// 월령 보정 구간(getExpectedWeightRange) 기준으로 저체중/적정/과체중/비만을 판정하되,
// growing 플래그로 문구를 다르게 써서 "또래 성견"과 "또래 강아지"를 구분해 말해준다.
export function getWeightAssessment(dog, ageInMonths) {
  if (!dog.weight) return { status: "no-data" };

  const sizeCategory = getBreedAppearance(dog.breed).sizeCategory;
  const growing = !isLikelyAdult(sizeCategory, ageInMonths);
  const range = getExpectedWeightRange(dog.breed, ageInMonths);
  const weight = dog.weight;
  const obesityLine = range.max * 1.2; // 이상 체중 대비 +20% 이상 = 비만 (WSAVA 비만 평가 자료 계열)

  if (weight < range.min) return { status: "under", range, growing };
  if (weight <= range.max) return { status: "ideal", range, growing };
  if (weight <= obesityLine) return { status: "over", range, growing };
  return { status: "obese", range, growing };
}

// 구간을 벗어났을 때 "왜 벗어났을 수 있는지 / 무슨 상태인지 / 어떤 문제가 생길 수 있는지"까지
// 담는다. growing이면 "또래 강아지" 기준으로, 아니면 "또래 성견" 기준으로 말투만 바꾼다.
const STATUS_TEXT = {
  "no-data": null,
  under: ({ range, growing }) =>
    growing
      ? `지금 월령 기준 참고 범위(${range.min}~${range.max}kg)보다 가벼워요. 또래보다 적게 먹거나, 소화 흡수가 잘 안 되거나, 기생충·질환이 원인일 수 있어요. 성장이 또래보다 느리지 않은지 다음 접종/검진 때 확인해보세요.`
      : `또래 성견 참고 범위(${range.min}~${range.max}kg)보다 가벼워요. 급여량 부족, 소화 흡수 문제, 또는 다른 질환이 원인일 수 있어요. 저체중이 계속되면 면역력 저하로 이어질 수 있으니 수의사와 확인해보세요.`,
  ideal: ({ range, growing }) =>
    growing
      ? `지금 월령 기준 건강한 범위(${range.min}~${range.max}kg) 안에서 잘 자라고 있어요!`
      : `또래 성견 참고 범위(${range.min}~${range.max}kg) 안에 있어요. 지금처럼 유지해주면 좋아요!`,
  over: ({ range, growing }) =>
    growing
      ? `지금 월령 기준 참고 범위(${range.min}~${range.max}kg)보다 조금 무거워요. 간식이 많지 않았는지, 활동량은 충분한지 확인해보세요.`
      : `또래 성견 참고 범위(${range.min}~${range.max}kg)보다 조금 무거워요. 간식량이 늘었거나 산책·활동량이 줄었을 때 흔히 보여요. 이대로 유지되면 관절·심장에 부담이 늘 수 있어요.`,
  obese: ({ range, growing }) =>
    growing
      ? `지금 월령 기준 참고 범위(${range.min}~${range.max}kg)보다 많이 무거워요(기준치의 +20% 이상). 급여량이 적절한지 수의사와 다시 확인해보는 걸 권해요.`
      : `또래 성견 참고 범위(${range.min}~${range.max}kg)보다 많이 무거워요(기준치의 +20% 이상). 과다 급여나 운동 부족이 흔한 원인이에요. 비만은 관절·심장·대사질환(당뇨 등) 위험을 높일 수 있으니 수의사와 체중 관리 계획을 상담해보세요.`,
};

export function getWeightStatusText(assessment) {
  if (!assessment || assessment.status === "no-data") return null;
  return STATUS_TEXT[assessment.status](assessment);
}

// 체크리스트 카드용 — 한 줄로 가볍게 보여줄 짧은 상태 문구.
const SHORT_STATUS_TEXT = {
  "no-data": null,
  under: "또래보다 가벼워요 — 저체중일 수 있어요.",
  ideal: "적정 체중을 잘 유지하고 있어요!",
  over: "또래보다 조금 무거워요 — 과체중 주의.",
  obese: "또래보다 많이 무거워요 — 비만 위험이 있어요.",
};

export function getWeightStatusShortText(assessment) {
  if (!assessment || assessment.status === "no-data") return null;
  return SHORT_STATUS_TEXT[assessment.status];
}

// 그래프/뱃지 색 — 비만·저체중(위험)은 빨강, 과체중(주의)은 주황, 적정은 초록.
// 기록 없음은 판단할 수 없으니 중립색.
export const STATUS_COLOR = {
  "no-data": "var(--text-faint)",
  under: "var(--danger)",
  obese: "var(--danger)",
  over: "var(--warning)",
  ideal: "var(--success)",
};
