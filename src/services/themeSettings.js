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
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? BAR.dark : BAR.light);
}
