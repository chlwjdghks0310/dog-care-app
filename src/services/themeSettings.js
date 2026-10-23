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
  applyPalette();
  if (dark) document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? BAR.dark : BAR.light);
}

// 보조색 조합(설정 → 색 조합). 대표색 소프트블루는 그대로이고, 아이콘 보조색만 바뀐다 — index.css :root[data-palette]
const PALETTE_KEY = "dogcare-palette-v1";
export const PALETTES = [
  { id: "1", name: "생기 있게", desc: "청록 · 보라 · 장미", swatches: ["var(--c-teal)", "var(--c-violet)", "#d6648f"] },
  { id: "a", name: "차분하게", desc: "청록 · 보라 · 회청색", swatches: ["var(--c-teal)", "var(--c-violet)", "#6b7a90"] },
  { id: "b", name: "단정하게", desc: "청록 · 보라", swatches: ["var(--c-teal)", "var(--c-violet)"] },
];
export function getPalette() {
  try {
    return localStorage.getItem(PALETTE_KEY) || "1";
  } catch {
    return "1";
  }
}
export function setPalette(id) {
  try {
    if (id === "1") localStorage.removeItem(PALETTE_KEY);
    else localStorage.setItem(PALETTE_KEY, id);
  } catch {
    // 저장 못 하면 이번에만
  }
  applyPalette(id);
}
export function applyPalette(id = getPalette()) {
  if (id === "1") document.documentElement.removeAttribute("data-palette");
  else document.documentElement.setAttribute("data-palette", id);
}
