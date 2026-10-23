import { readJSON, writeJSON } from "./storage";

const EXPENSES_KEY = "dogcare-expenses-v1";
const CATEGORIES_KEY = "dogcare-expense-categories-v1";

// ico: 화면에 그리는 선 아이콘 이름(components/Ico.jsx). emoji: 글자로만 보여 줄 때(채팅 기록 결과 등)와 예전 버전 앱용
const DEFAULT_CATEGORIES = [
  { id: "medical", name: "의료", emoji: "🏥", ico: "stethoscope" },
  { id: "toy", name: "장난감", emoji: "🧸", ico: "puzzle" },
  { id: "supplies", name: "생활용품", emoji: "🧴", ico: "sprayCan" },
  { id: "snack", name: "간식", emoji: "🦴", ico: "bone" },
  { id: "food", name: "사료", emoji: "🍚", ico: "bowl" },
];

// 삭제된 카테고리를 쓰던 기록은 이걸로 보여준다.
export const UNKNOWN_CATEGORY = { id: "unknown", name: "기타", emoji: "📦", ico: "box" };

// 카테고리 추가 때 고르는 아이콘(+ 같은 뜻의 이모지)
export const CATEGORY_CHOICES = [
  ["stethoscope", "🏥"], ["pill", "💊"], ["syringe", "💉"], ["bowl", "🍚"], ["droplets", "🥫"], ["bone", "🦴"],
  ["puzzle", "🧸"], ["sprayCan", "🧴"], ["bath", "🛁"], ["scissors", "✂️"], ["walk", "🦮"], ["shoppingBag", "👕"],
  ["house", "🏠"], ["car", "🚗"], ["building", "🏨"], ["graduation", "🎓"], ["camera", "📸"], ["umbrella", "🛡️"],
  ["cake", "🎂"], ["gift", "🎀"], ["heartPlain", "❤️"], ["paw", "🐾"], ["box", "📦"], ["wallet", "💰"],
];
// 예전에 이모지로만 저장된 카테고리(직접 넣은 이모지 포함)도 알맞은 아이콘으로
const EMOJI_ICO = {
  "🏥": "stethoscope", "💊": "pill", "💉": "syringe", "🧸": "puzzle", "🎾": "puzzle", "🧴": "sprayCan", "🧻": "sprayCan", "🛁": "bath",
  "✂️": "scissors", "🦴": "bone", "🍖": "bone", "🍚": "bowl", "🥫": "droplets", "🦮": "walk", "🎀": "gift", "👕": "shoppingBag",
  "🏠": "house", "🚗": "car", "🏨": "building", "🎓": "graduation", "📸": "camera", "🛡️": "umbrella", "🎂": "cake", "❤️": "heartPlain", "💰": "wallet", "📦": "box",
};
// 저장된 카테고리에 남아 있는 예전 아이콘 이름 → 지금 이름(아이콘을 바꿔도 이미 저장된 카테고리가 빈칸이 되지 않게)
const RENAMED = { cookie: "bone", utensils: "bowl", shield: "syringe", sparkles: "bath", footprints: "walk", party: "cake", heart: "heartPlain", can: "droplets" };
export const categoryIco = (cat) => (cat?.ico && (RENAMED[cat.ico] || cat.ico)) || EMOJI_ICO[cat?.emoji] || EMOJI_ICO[`${cat?.emoji}\uFE0F`] || "wallet";

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// 카테고리는 모든 강아지가 같이 쓴다. 구조: [{ id, name, emoji, ico? }]
export function getCategories() {
  return readJSON(CATEGORIES_KEY, DEFAULT_CATEGORIES);
}

export function addCategory(name, emoji, ico) {
  const list = [...getCategories(), { id: newId("cat"), name, emoji, ico }];
  writeJSON(CATEGORIES_KEY, list);
  return list;
}

export function deleteCategory(id) {
  const list = getCategories().filter((c) => c.id !== id);
  writeJSON(CATEGORIES_KEY, list);
  return list;
}

// 지출은 강아지별. 구조: { [dogId]: [{ id, title, amount, date: "YYYY-MM-DD", categoryId }] }
export function getExpenses(dogId) {
  return readJSON(EXPENSES_KEY, {})[dogId] || [];
}

export function addExpense(dogId, { title, amount, date, categoryId }) {
  const all = readJSON(EXPENSES_KEY, {});
  all[dogId] = [...(all[dogId] || []), { id: newId("exp"), title, amount, date, categoryId }];
  writeJSON(EXPENSES_KEY, all);
  return all[dogId];
}

export function deleteExpense(dogId, id) {
  const all = readJSON(EXPENSES_KEY, {});
  all[dogId] = (all[dogId] || []).filter((e) => e.id !== id);
  writeJSON(EXPENSES_KEY, all);
  return all[dogId];
}

// 강아지 용돈(그 달에 쓸 예산). 구조: { [dogId]: { "YYYY-MM": amount } }
const ALLOWANCE_KEY = "dogcare-allowance-v1";

export function getAllowance(dogId, month) {
  return readJSON(ALLOWANCE_KEY, {})[dogId]?.[month] ?? null;
}

export function setAllowance(dogId, month, amount) {
  const all = readJSON(ALLOWANCE_KEY, {});
  all[dogId] = { ...(all[dogId] || {}) };
  if (amount) all[dogId][month] = amount;
  else delete all[dogId][month];
  writeJSON(ALLOWANCE_KEY, all);
}

export function updateExpense(dogId, id, patch) {
  const all = readJSON(EXPENSES_KEY, {});
  all[dogId] = (all[dogId] || []).map((e) => (e.id === id ? { ...e, ...patch } : e));
  writeJSON(EXPENSES_KEY, all);
  return all[dogId];
}
