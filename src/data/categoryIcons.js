// 체크리스트 분류 → 화면용 선 아이콘 이름(components/Ico.jsx)
const CATEGORY_ICOS = {
  산책: "walk",
  식사: "bowl",
  배변훈련: "toilet",
  사회화: "handHeart",
  이갈이: "tooth",
  "목욕/미용": "bath",
  "행동/훈련": "target",
  "건강/응급상황": "firstAid",
  예방접종: "syringe",
  수면: "bed",
  체중관리: "scales",
  약: "pill",
};
export const getCategoryIco = (category) => CATEGORY_ICOS[category] || "pin";
// 아이콘 색(index.css .tone-*) — 정해 두지 않은 분류는 대표색(소프트블루)
const CATEGORY_TONES = { 산책: "violet", 사회화: "violet", "행동/훈련": "violet", 식사: "rose", 배변훈련: "teal", 약: "teal", "목욕/미용": "teal" };
export const getCategoryTone = (category) => CATEGORY_TONES[category] || "blue";
