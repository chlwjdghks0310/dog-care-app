import { readJSON, writeJSON } from "./storage";

const EXPENSES_KEY = "dogcare-expenses-v1";
const CATEGORIES_KEY = "dogcare-expense-categories-v1";

// ico: 화면에 그리는 선 아이콘 이름(components/Ico.jsx). emoji: 글자로만 보여 줄 때(채팅 기록 결과 등)와 예전 버전 앱용
// 기본 분류 — KB 반려동물 보고서 항목·동물병원 진료비 게시 항목 기준(../자료용/자료/2026-10-23-반려동물-가계부-조사.md). color: 분류마다 고정(하나를 지워도 다른 색이 밀리지 않게)
const DEFAULT_CATEGORIES = [
  { id: "food", name: "사료", emoji: "🍚", ico: "bowl", color: "#e8774a" },
  { id: "snack", name: "간식·영양제", emoji: "🦴", ico: "bone", color: "#f0b429" },
  { id: "medical", name: "병원·치료", emoji: "🏥", ico: "stethoscope", color: "#4a90e2" },
  { id: "prevent", name: "예방(접종·구충)", emoji: "💉", ico: "syringe", color: "#2bb5a5" },
  { id: "grooming", name: "미용·위생", emoji: "✂️", ico: "scissors", color: "#e05a8a" },
  { id: "supplies", name: "용품", emoji: "🧴", ico: "shoppingBag", color: "#5cb85c" },
  { id: "insurance", name: "보험료", emoji: "🛡️", ico: "umbrella", color: "#9b6dd6" },
  { id: "etc", name: "기타", emoji: "📦", ico: "box", color: "#7f8c8d" },
];
export const CATEGORY_COLORS = ["#e8774a", "#4a90e2", "#5cb85c", "#f0b429", "#9b6dd6", "#e05a8a", "#2bb5a5", "#8d6e63", "#7f8c8d", "#c0392b"];

// 예전 기본 분류 → 새 분류. 이름을 안 바꾼 것만 새 이름으로(사용자가 고친 이름은 그대로). 장난감은 용품으로 합친다.
// 가족 공유로 예전 사본이 다시 들어와도 같은 규칙으로 보이게 getCategories에서 매번 적용한다.
const OLD_DEFAULT = { medical: "의료", snack: "간식", supplies: "생활용품" };
const MERGED = { toy: "supplies" }; // 지운 분류 id → 이어받는 분류 id(그 분류로 적은 기록도 따라감)
const CAT_MIGRATED_KEY = "dogcare-expense-cat-v2"; // 새 기본 분류(예방·미용·보험료·기타)를 한 번만 더한다 — 사용자가 지우면 다시 안 생기게

// 삭제된 카테고리를 쓰던 기록은 이걸로 보여준다.
export const UNKNOWN_CATEGORY = { id: "unknown", name: "기타", emoji: "📦", ico: "box" };
export const resolveCategoryId = (id) => MERGED[id] || id;

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
  const saved = readJSON(CATEGORIES_KEY, null);
  if (!saved) return DEFAULT_CATEGORIES;
  const def = Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c.id, c]));
  let list = saved
    .filter((c) => !MERGED[c.id])
    .map((c) => (OLD_DEFAULT[c.id] && c.name === OLD_DEFAULT[c.id] ? { ...def[c.id] } : c));
  if (!readJSON(CAT_MIGRATED_KEY, false)) {
    const has = new Set(list.map((c) => c.id));
    // 기본 분류를 기본 순서로 앞에, 직접 만든 분류는 뒤에
    const order = DEFAULT_CATEGORIES.map((c) => c.id);
    const mine = Object.fromEntries(list.map((c) => [c.id, c]));
    list = [...order.map((id) => mine[id] || (has.has(id) ? null : def[id])).filter(Boolean), ...list.filter((c) => !order.includes(c.id))];
    writeJSON(CATEGORIES_KEY, list);
    writeJSON(CAT_MIGRATED_KEY, true);
  }
  // 색이 없는 분류(예전에 만든 것)는 목록 순서로 정해 저장해 둔다
  if (list.some((c) => !c.color)) {
    const used = new Set(list.map((c) => c.color).filter(Boolean));
    const free = CATEGORY_COLORS.filter((x) => !used.has(x));
    list = list.map((c, i) => (c.color ? c : { ...c, color: free.shift() || CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
    writeJSON(CATEGORIES_KEY, list);
  }
  return list;
}

export function addCategory(name, emoji, ico) {
  const cur = getCategories();
  const used = new Set(cur.map((c) => c.color));
  const color = CATEGORY_COLORS.find((x) => !used.has(x)) || CATEGORY_COLORS[cur.length % CATEGORY_COLORS.length];
  const list = [...cur, { id: newId("cat"), name, emoji, ico, color }];
  writeJSON(CATEGORIES_KEY, list);
  return list;
}

// 기본 분류도 이름·아이콘을 고칠 수 있다
export function updateCategory(id, patch) {
  const list = getCategories().map((c) => (c.id === id ? { ...c, ...patch } : c));
  writeJSON(CATEGORIES_KEY, list);
  return list;
}

// 채팅 등에서 받은 분류 이름 → 분류. 정확히 같은 이름, 예전 기본 이름(의료 → 병원·치료), "·"로 나뉜 한 부분(간식 → 간식·영양제) 순으로 찾고 없으면 null
export function findCategoryByName(name) {
  const n = String(name || "").replace(/\s+/g, "");
  if (!n) return null;
  const list = getCategories();
  const old = Object.entries({ ...OLD_DEFAULT, toy: "장난감" }).find(([, v]) => v === n)?.[0];
  return (
    list.find((c) => c.name.replace(/\s+/g, "") === n) ||
    (old && list.find((c) => c.id === resolveCategoryId(old))) ||
    list.find((c) => c.name.split(/[·()]/).some((part) => part && part === n)) ||
    null
  );
}

export function deleteCategory(id) {
  const list = getCategories().filter((c) => c.id !== id);
  writeJSON(CATEGORIES_KEY, list);
  return list;
}

// 지출은 강아지별. 구조: { [dogId]: [{ id, title, amount, date: "YYYY-MM-DD", categoryId, memo?, items?, claim?, claimPaid?, recordId? }] }
// items: 병원비 세부 항목 / claim: 보험 청구 "todo"(청구 전)·"sent"(청구함)·"paid"(받음), claimPaid: 받은 보험금 / recordId: 이어진 병원 진료 기록
export const MEDICAL_IDS = ["medical", "prevent"];
export const isMedical = (categoryId) => MEDICAL_IDS.includes(resolveCategoryId(categoryId));
// 동물병원 진료비 게시 항목(수의사법 시행규칙)을 묶은 것 — ../자료용/자료/2026-10-23-반려동물-가계부-조사.md
export const VET_ITEMS = ["진찰", "검사", "백신", "구충·심장사상충", "처치", "수술", "입원", "약"];
export const CLAIMS = [["", "안 함"], ["todo", "청구 전"], ["sent", "청구함"], ["paid", "받음"]];
const OPTIONAL = ["memo", "items", "claim", "claimPaid", "recordId"];
const pickOptional = (o) => Object.fromEntries(OPTIONAL.filter((k) => o[k] != null && o[k] !== "" && !(Array.isArray(o[k]) && !o[k].length)).map((k) => [k, o[k]]));
export function getExpenses(dogId) {
  return readJSON(EXPENSES_KEY, {})[dogId] || [];
}

export function addExpense(dogId, { title, amount, date, categoryId, ...rest }) {
  const all = readJSON(EXPENSES_KEY, {});
  all[dogId] = [...(all[dogId] || []), { id: newId("exp"), title, amount, date, categoryId, ...pickOptional(rest) }];
  writeJSON(EXPENSES_KEY, all);
  return all[dogId];
}

export function deleteExpense(dogId, id) {
  const all = readJSON(EXPENSES_KEY, {});
  // 저절로 기록된 매달 나가는 돈을 지우면 그 달은 건너뛴 것으로 남긴다(다음에 앱을 열 때 다시 생기지 않게)
  const gone = (all[dogId] || []).find((e) => e.id === id);
  if (gone?.fixedId) {
    const month = gone.id.startsWith(`fix-${gone.fixedId}-`) ? gone.id.slice(-7) : gone.date.slice(0, 7);
    writeFixed(dogId, getFixedExpenses(dogId).map((f) => (f.id === gone.fixedId ? { ...f, skip: [...new Set([...(f.skip || []), month])] } : f)));
  }
  all[dogId] = (all[dogId] || []).filter((e) => e.id !== id);
  writeJSON(EXPENSES_KEY, all);
  return all[dogId];
}

// 강아지 용돈(그 달에 쓸 예산). 구조: { [dogId]: { "YYYY-MM": amount } }
// 비어 있는 달은 그 전 가장 가까운 달 금액을 이어받는다. 지우면 0을 저장해서 그 달부터 이어받지 않게.
const ALLOWANCE_KEY = "dogcare-allowance-v1";

export function getAllowance(dogId, month) {
  const byMonth = readJSON(ALLOWANCE_KEY, {})[dogId] || {};
  const key = Object.keys(byMonth).filter((m) => m <= month).sort().at(-1);
  return key ? byMonth[key] || null : null;
}

export function setAllowance(dogId, month, amount) {
  const all = readJSON(ALLOWANCE_KEY, {});
  all[dogId] = { ...(all[dogId] || {}), [month]: amount || 0 };
  writeJSON(ALLOWANCE_KEY, all);
}

// 자주 쓰는 내역: 같은 내용으로 2번 이상 적은 것, 많이 적은 순(같으면 최근 순). 금액·분류·메모는 마지막에 적은 것
export function quickItems(expenses, limit = 5) {
  const map = new Map();
  for (const e of [...expenses].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = e.title.replace(/\s+/g, "").toLowerCase();
    const cur = map.get(key);
    map.set(key, { title: e.title, amount: e.amount, categoryId: e.categoryId, memo: e.memo || "", date: e.date, count: (cur?.count || 0) + 1 });
  }
  return [...map.values()]
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count || b.date.localeCompare(a.date))
    .slice(0, limit);
}

// 검색: 전체 기간에서 내용·메모·분류 이름(최근 순)
export function searchExpenses(expenses, query, categoryName) {
  const q = query.replace(/\s+/g, "").toLowerCase();
  if (!q) return [];
  return expenses
    .filter((e) => `${e.title}${e.memo || ""}${categoryName(e.categoryId)}`.replace(/\s+/g, "").toLowerCase().includes(q))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function updateExpense(dogId, id, patch) {
  const all = readJSON(EXPENSES_KEY, {});
  // 빈 값으로 고친 선택 항목(메모·세부 항목·청구)은 지운다
  all[dogId] = (all[dogId] || []).map((e) => {
    if (e.id !== id) return e;
    const next = { ...e, ...patch };
    for (const k of OPTIONAL) if (k in patch && (patch[k] == null || patch[k] === "" || (Array.isArray(patch[k]) && !patch[k].length))) delete next[k];
    return next;
  });
  writeJSON(EXPENSES_KEY, all);
  return all[dogId];
}

// CSV 내보내기(엑셀에서 한글이 깨지지 않게 BOM). 열: 날짜, 분류, 내용, 금액, 메모, 병원비 항목, 보험 청구, 받은 보험금
export function expensesToCsv(expenses, categoryName) {
  const cell = (v) => {
    const t = String(v ?? "");
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const claimLabel = Object.fromEntries(CLAIMS);
  const rows = [...expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [e.date, categoryName(e.categoryId), e.title, e.amount, e.memo, e.items?.join("·"), e.claim ? claimLabel[e.claim] : "", e.claimPaid].map(cell).join(","));
  return "\uFEFF" + ["날짜,분류,내용,금액,메모,병원비 항목,보험 청구,받은 보험금", ...rows].join("\n");
}

// 매달 나가는 돈(직접 등록): 보험료·정기 배송 사료처럼 매달 정해진 날 나가는 돈. 구조: { [dogId]: [{ id, title, amount, categoryId, day, memo?, from }] }
// from = 등록한 날("YYYY-MM-DD") — 그날 이후의 회차만 기록. 날이 되면 가계부에 저절로 기록한다(applyFixedExpenses).
// 기록 id를 "fix-<항목id>-<YYYY-MM>"로 정해서, 같은 달은 두 번 안 생기고 가족 폰 두 대가 같이 기록해도 하나로 합쳐진다.
const FIXED_KEY = "dogcare-fixed-expenses-v1";
export const getFixedExpenses = (dogId) => readJSON(FIXED_KEY, {})[dogId] || [];
function writeFixed(dogId, list) {
  const all = readJSON(FIXED_KEY, {});
  all[dogId] = list;
  writeJSON(FIXED_KEY, all);
  return list;
}
export function saveFixedExpense(dogId, item, today) {
  const list = getFixedExpenses(dogId);
  if (item.id) return writeFixed(dogId, list.map((f) => (f.id === item.id ? { ...f, ...item } : f)));
  return writeFixed(dogId, [...list, { ...item, id: newId("fix"), from: today }]);
}
export const deleteFixedExpense = (dogId, id) => writeFixed(dogId, getFixedExpenses(dogId).filter((f) => f.id !== id));
// 그 달의 낼 날(31일로 정했는데 30일까지인 달은 말일)
export function fixedDate(item, month) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(item.day, last)).padStart(2, "0")}`;
}
// 등록한 날부터 오늘까지 지난 회차 중 아직 없는 것을 기록. 반환: 새로 기록한 수
export function applyFixedExpenses(dogId, today) {
  const items = getFixedExpenses(dogId);
  if (!items.length) return 0;
  const all = readJSON(EXPENSES_KEY, {});
  const list = all[dogId] || [];
  const ids = new Set(list.map((e) => e.id));
  // 같은 달에 같은 이름을 이미 직접 적었으면(등록 전에 적은 것 등) 그 달은 다시 안 적는다
  const norm = (t) => t.replace(/\s+/g, "").toLowerCase();
  const manual = new Set(list.filter((e) => !e.fixedId).map((e) => `${norm(e.title)}|${e.date.slice(0, 7)}`));
  const added = [];
  for (const f of items) {
    let [y, m] = f.from.slice(0, 7).split("-").map(Number);
    for (let guard = 0; guard < 24; guard++) {
      const month = `${y}-${String(m).padStart(2, "0")}`;
      if (month > today.slice(0, 7)) break;
      const date = fixedDate(f, month);
      const id = `fix-${f.id}-${month}`;
      if (date >= f.from && date <= today && !ids.has(id) && !(f.skip || []).includes(month) && !manual.has(`${norm(f.title)}|${month}`)) {
        added.push({ id, title: f.title, amount: f.amount, date, categoryId: f.categoryId, fixedId: f.id, ...(f.memo ? { memo: f.memo } : {}) });
        ids.add(id);
      }
      m === 12 ? ((y += 1), (m = 1)) : (m += 1);
    }
  }
  if (added.length) {
    all[dogId] = [...list, ...added];
    writeJSON(EXPENSES_KEY, all);
  }
  return added.length;
}
