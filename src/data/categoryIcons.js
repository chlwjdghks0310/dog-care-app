// 체크리스트 분류 → 화면용 선 아이콘 이름(components/Ico.jsx)
const CATEGORY_ICOS = {
  산책: "footprints",
  식사: "utensils",
  배변훈련: "droplets",
  사회화: "users",
  이갈이: "sparkles",
  "목욕/미용": "scissors",
  "행동/훈련": "target",
  "건강/응급상황": "stethoscope",
  예방접종: "shield",
  수면: "moon",
  체중관리: "gauge",
  약: "pill",
};
export const getCategoryIco = (category) => CATEGORY_ICOS[category] || "pin";
