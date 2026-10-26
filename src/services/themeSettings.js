// 화면 모드: 기본(밝은 소프트블루) / 다크. 색은 index.css의 :root와 :root[data-theme="dark"].
// index.html이 첫 화면을 그리기 전에 같은 키를 읽어 다크를 먼저 입힌다(밝게 번쩍이지 않게).
const KEY = "dogcare-theme-v1";
const BAR = { light: "#f0f6ff", dark: "#17171c" }; // 아이폰 상태바 색(<meta name="theme-color">)

export function isDark() {
  try {
    return localStorage.getItem(KEY) === "dark"; // 예전 색 테마(forest 등)를 골랐던 사람은 기본(밝은 화면)으로
  } catch {
    return false;
  }
}

export function setDark(on) {
  try {
    if (on) localStorage.setItem(KEY, "dark");
    else localStorage.removeItem(KEY);
  } catch {
    // 저장 못 하는 환경이면 이번에만 적용
  }
  applyTheme(on);
}

export function applyTheme(dark = isDark()) {
  if (dark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? BAR.dark : COLOR_THEMES.find((t) => t.id === getColorTheme().split("-")[0])?.bg || BAR.light);
}


// 배경 테마(설정 → 배경 테마): 색 조합 5개 + 같은 색 발바닥 5개. 색은 index.css :root[data-color] / [data-paw].
// 다크 모드를 켜면 다크 색이 우선이고, 끄면 고른 테마로 돌아온다. index.html도 같은 키를 읽어 첫 화면부터 입힌다.
const COLOR_KEY = "dogcare-color-v1"; // "coral" | "coral-paw" | "softblue-paw" | ... | 없음(기본 소프트 블루)
export const COLOR_THEMES = [
  { id: "", label: "소프트 블루", accent: "#4b90e2", bg: "#f0f6ff" },
  { id: "coral", label: "크림 코랄", accent: "#e0695a", bg: "#fff7f2" },
  { id: "mint", label: "민트 포레스트", accent: "#2f9e84", bg: "#eff8f4" },
  { id: "lavender", label: "라벤더", accent: "#7b61d6", bg: "#f5f2fd" },
  { id: "peach", label: "피치 핑크", accent: "#e06a8c", bg: "#fff4f7" },
  { id: "sage", label: "세이지", accent: "#5f8f5a", bg: "#f3f7f0" },
  { id: "honey", label: "허니 머스터드", accent: "#b8860b", bg: "#fffaf0" },
  { id: "ocean", label: "오션 틸", accent: "#1f8fa3", bg: "#eef8fa" },
  { id: "mocha", label: "모카", accent: "#a0705a", bg: "#faf6f3" },
  { id: "indigo", label: "인디고", accent: "#4f5fc9", bg: "#f2f4fd" },
  { id: "cherry", label: "체리", accent: "#d14b5a", bg: "#fff5f5" },
  { id: "gray", label: "그레이", accent: "#6b7280", bg: "#f4f5f7" },
];
// 테마 id → 화면에 보일 이름("민트 포레스트 발바닥")
export const themeLabel = (id) => {
  const [color, paw] = (id || "").split("-");
  const t = COLOR_THEMES.find((x) => x.id === (color === "softblue" ? "" : color)) || COLOR_THEMES[0];
  return paw ? `${t.label} 발바닥` : t.label;
};

export function getColorTheme() {
  try {
    return localStorage.getItem(COLOR_KEY) || "";
  } catch {
    return "";
  }
}

export function setColorTheme(id) {
  try {
    if (id) localStorage.setItem(COLOR_KEY, id);
    else localStorage.removeItem(COLOR_KEY);
  } catch {
    // 저장 못 하는 환경이면 이번에만 적용
  }
  applyColor(id);
}

export function applyColor(id = getColorTheme()) {
  const [color, paw] = id.split("-");
  const root = document.documentElement;
  if (color) root.setAttribute("data-color", color);
  else root.removeAttribute("data-color");
  if (paw) root.setAttribute("data-paw", "");
  else root.removeAttribute("data-paw");
  if (!isDark()) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLOR_THEMES.find((t) => t.id === color)?.bg || BAR.light);
}
