export const CATEGORY_ICONS = {
  산책: "🚶",
  식사: "🍚",
  배변훈련: "🚽",
  사회화: "🧸",
  이갈이: "🦷",
  "목욕/미용": "🛁",
  "행동/훈련": "🎯",
  "건강/응급상황": "🩺",
  예방접종: "💉",
  수면: "😴",
  체중관리: "⚖️",
};

export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || "📌";
}
