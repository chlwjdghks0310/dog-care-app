// 월령별 가이드(11/15): 강아지 나이·크기·몸무게로 "지금 시기"를 정하고, 카드에 붙일 맞춤 한 줄을 만든다.
// 시기 경계 근거: ../자료용/자료/2026-11-15-시기별-가이드-콘텐츠.md 부록 A(AVSAB·Merck·AAHA; 중형 칸은 자료용 판단).
// 데이터(카드)는 src/data/stageGuide.js. AI는 쓰지 않는다.
import { calculateAge } from "../utils/age";
import { getBreedAppearance } from "../data/breedAppearance";
import { getFeedingPlan } from "../data/feedingGuide";
import { todayKey, toDateKey, addDays } from "../utils/date";

// 크기: 견종표(breedAppearance.sizeCategory) 기준. "푸들"만 적힌 건 국내에선 대부분 토이·미니어처라 소형으로 본다(자료용 11/15).
// 1살이 넘고 몸무게가 있으면 몸무게가 우선(10kg 미만 소형, 25kg 미만 중형).
export function sizeOf(dog) {
  const breed = (dog.breed || "").trim();
  let cat = getBreedAppearance(breed).sizeCategory || "small";
  if (breed === "푸들" || (breed.includes("푸들") && !breed.includes("스탠다드"))) cat = "small";
  const w = Number(dog.weight) || 0;
  const { ageInMonths } = calculateAge(dog.birthDate);
  if (w && ageInMonths >= 12) cat = w < 10 ? "small" : w < 25 ? "medium" : "large";
  return cat;
}
export const SIZE_LABEL = { small: "소형견", medium: "중형견", large: "대형견" };

// 시기 경계(주 단위). 사춘기 끝·중년·노령은 크기별.
const WEEK = 1, MONTH = 4.345, YEAR = 52.18;
const BOUND = {
  small: { teen: 12 * MONTH, adult: 7 * YEAR, middle: 10 * YEAR },
  medium: { teen: 15 * MONTH, adult: 7 * YEAR, middle: 9 * YEAR },
  large: { teen: 18 * MONTH, adult: 5 * YEAR, middle: 8 * YEAR },
};
export const STAGES = [
  { id: 1, key: "settle", name: "집에 온 첫 2주", short: "적응기", ico: "house", tip: "새 집에 익숙해지는 시간. 조용히, 원래 먹던 대로." },
  { id: 2, key: "social", name: "사회화기", short: "사회화", ico: "handHeart", tip: "3개월까지 특히 중요하고 4개월까지 꾸준히. 땅 말고 품에서, 병원과 상의해서." },
  { id: 3, key: "teeth", name: "이갈이·탐색기", short: "이갈이", ico: "tooth", tip: "젖니가 빠지고 영구치가 나요(약 7개월까지). 씹을 것을 주고, 첫 땅 산책을 시작해요." },
  { id: 4, key: "teen", name: "사춘기", short: "사춘기", ico: "graduation", tip: "배운 게 잠깐 흐려져요. 산책을 늘리고 중성화를 상담해요." },
  { id: 5, key: "adult", name: "성견", short: "성견", ico: "sun", tip: "체중·치아·연 1회 검진. 습관을 지키는 시기." },
  { id: 6, key: "middle", name: "중년", short: "중년", ico: "heart", tip: "노령을 준비하는 시기. 검진 항목을 늘려요." },
  { id: 7, key: "senior", name: "노령", short: "노령", ico: "moon", tip: "관절·인지·식사를 바꿔요. 작은 변화를 기록해요." },
];

const WEEKS_TXT = (w) => (w >= YEAR ? `${Math.floor(w / YEAR)}세` : `${Math.round(w / MONTH)}개월`);
const rangeOf = (size, id) => {
  const b = BOUND[size];
  const r = { 1: [0, 0], 2: [0, 13], 3: [13, 7 * MONTH], 4: [7 * MONTH, b.teen], 5: [b.teen, b.adult], 6: [b.adult, b.middle], 7: [b.middle, Infinity] }[id];
  return r;
};
export function stageRangeLabel(size, id) {
  const [a, b] = rangeOf(size, id);
  if (id === 1) return "입양 뒤 14일";
  if (id === 2) return "생후 ~3개월";
  if (!isFinite(b)) return `${WEEKS_TXT(a)} 이상`;
  return `${WEEKS_TXT(a)}~${WEEKS_TXT(b)}`;
}

// 입양일로부터 며칠째인지(없으면 null)
function settleDay(dog) {
  if (!dog.adoptionDate) return null;
  const d = Math.floor((new Date(`${todayKey()}T00:00:00`) - new Date(`${dog.adoptionDate}T00:00:00`)) / 86400000);
  return d >= 0 && d < 14 ? d + 1 : null;
}

export function getStage(dog) {
  const age = calculateAge(dog.birthDate);
  const size = sizeOf(dog);
  const w = age.ageInWeeks;
  let id = 2;
  for (const s of [3, 4, 5, 6, 7]) if (w >= rangeOf(size, s)[0]) id = s;
  const [from, to] = rangeOf(size, id);
  const settle = settleDay(dog);
  const next = STAGES.find((s) => s.id === id + 1) || null;
  return {
    ...STAGES[id - 1],
    size, sizeLabel: SIZE_LABEL[size], age,
    rangeLabel: stageRangeLabel(size, id),
    weeksToNext: isFinite(to) ? Math.max(0, Math.round(to - w)) : null,
    progress: isFinite(to) ? Math.min(1, Math.max(0, (w - from) / Math.max(1, to - from))) : 1,
    next,
    settle, // 입양 뒤 14일 안이면 며칠째(1~14), 아니면 null → 시기 1 카드를 함께 보여 준다
  };
}

// 우리 아이 맞춤 한 줄들: 있는 데이터(몸무게·나이·크기·중성화)로만. 숫자는 공개 자료 공식을 환산한 어림이라 "약"을 붙인다.
export function getFit(dog, st) {
  const out = [];
  const w = Number(dog.weight) || 0;
  const m = st.age.ageInMonths;
  const weeks = st.age.ageInWeeks;
  if (w) {
    const plan = getFeedingPlan(dog, weeks);
    out.push({ ico: "bone", text: `간식은 하루 열량(약 ${plan.dailyKcal}kcal)의 10% 안, 약 ${Math.round(plan.dailyKcal * 0.1)}kcal까지`, src: "WSAVA 10% 원칙 · 급여 계산은 RER×단계 계수" });
    out.push({ ico: "droplet", text: `물은 하루 약 ${Math.round(w * 33)}~${Math.round(w * 65)}ml(1kg당 33~65ml)`, src: "AKC 공식 환산" });
  }
  if (st.id <= 4 && m >= 3) out.push({ ico: "walk", text: `산책은 한 번에 약 ${Math.min(60, Math.max(10, m * 5))}분, 하루 2번부터(성장기엔 "개월 수 × 5분" 어림)`, src: "영국 케넬클럽 어림, 기관 기준은 아님" });
  if (st.id === 2) out.push({ ico: "handHeart", text: "접종이 끝나기 전에도 품에 안고 소리·사람·바닥을 경험시켜요. 땅에 내려놓는 건 병원과 상의", src: "AVSAB 입장문" });
  if (st.id === 3) out.push({ ico: "tooth", text: `젖니가 영구치로 바뀌는 중(약 7개월까지). 7개월이 지나도 젖니가 남아 있으면 병원에`, src: "Merck" });
  if (st.id >= 4 && !dog.neutered) out.push({ ico: "stethoscope", text: `${st.sizeLabel}의 중성화 시기는 병원과 상의해요(크기·성별에 따라 권장 시점이 달라요)`, src: "AAHA" });
  if (st.id === 4) out.push({ ico: "scales", text: `${st.sizeLabel}은 보통 ${st.size === "large" ? "10~16개월" : "8~12개월"}에 성장이 끝나요. 몸무게를 2주마다 적어 두면 변화가 보여요`, src: "Merck" });
  if (st.id >= 6) out.push({ ico: "building", text: `${st.sizeLabel}은 이 나이부터 검진을 6개월마다 권해요(혈액·치아·관절)`, src: "AAHA 시니어 가이드" });
  return out;
}

// 다음 시기가 시작되는 날(알림용). 오늘 이후 1년 안이면 { date, name, tip }, 아니면 null
export function nextStageChange(dog) {
  if (!dog.birthDate) return null;
  const st = getStage(dog);
  if (!st.next) return null;
  const [from] = rangeOf(st.size, st.next.id);
  const date = toDateKey(addDays(new Date(`${dog.birthDate}T00:00:00`), Math.round(from * 7)));
  if (date < todayKey() || date > toDateKey(addDays(new Date(), 366))) return null;
  return { date, name: st.next.name, tip: st.next.tip };
}
