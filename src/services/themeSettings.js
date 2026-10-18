const KEY = "dogcare-theme-v1";
const DEFAULT = "softblue"; // 아이콘 소프트블루 — 다른 테마를 직접 고른 적 없는 사람은 모두 이 색

// 색깔 테마들. 각각 "~-paw" id로 같은 색의 발자국 패턴 버전이 자동으로 생성된다(아래 THEMES 참고).
const COLOR_THEMES = [
  { id: "softblue", label: "소프트블루", swatch: "#4b90e2" },
  { id: "forest", label: "포레스트", swatch: "#4a7c59" },
  { id: "warm", label: "오렌지", swatch: "#e07a3f" },
  { id: "mint", label: "민트", swatch: "#2bd1b8" },
  { id: "green", label: "초록", swatch: "#3fa578" },
  { id: "lavender", label: "라벤더", swatch: "#8b6fd1" },
  { id: "peach", label: "피치", swatch: "#e0697f" },
  { id: "sky", label: "스카이", swatch: "#3f8fe0" },
  { id: "lemon", label: "레몬", swatch: "#e0c200" },
  { id: "coral", label: "코랄", swatch: "#e8785a" },
  { id: "rose", label: "로즈", swatch: "#d9527d" },
  { id: "sage", label: "세이지", swatch: "#6a9955" },
  { id: "grape", label: "그레이프", swatch: "#9350b8" },
  { id: "turquoise", label: "터쿼이즈", swatch: "#2aa89c" },
  { id: "lime", label: "라임", swatch: "#92b23d" },
  { id: "beige", label: "베이지", swatch: "#a9895e" },
  { id: "ice", label: "아이스블루", swatch: "#4fa8d1" },
  { id: "plum", label: "플럼", swatch: "#a85680" },
  { id: "white", label: "화이트", swatch: "#ffffff" },
  { id: "gray", label: "그레이", swatch: "#6b6b6b" },
];

export const THEMES = [
  ...COLOR_THEMES.map((t) => ({ ...t, category: "plain" })),
  ...COLOR_THEMES.map((t) => ({ id: `${t.id}-paw`, label: `${t.label} 발자국`, swatch: t.swatch, category: "paw" })),
];

export function getTheme() {
  try {
    // 기본이 오렌지였던 때 저장된 "warm"은 한 번만 새 기본(녹색)으로 옮긴다 — 그 뒤에 다시 오렌지를 고르면 그대로 둔다
    if (!localStorage.getItem(`${KEY}-forest`)) {
      localStorage.setItem(`${KEY}-forest`, "1");
      if (localStorage.getItem(KEY) === "warm") localStorage.removeItem(KEY);
    }
    return localStorage.getItem(KEY) || DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setTheme(themeId) {
  try {
    localStorage.setItem(KEY, themeId);
  } catch {
    // localStorage 사용 불가 환경에서는 조용히 무시 (이번 세션만 적용됨)
  }
  applyTheme(themeId);
}

export function applyTheme(themeId) {
  if (themeId === DEFAULT) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", themeId);
  }

  // 모바일 브라우저 상/하단 바(status bar/address bar) 색은 CSS가 아니라
  // <meta name="theme-color">를 읽으므로 테마를 바꿀 때 같이 갱신해줘야 한다.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const swatch = THEMES.find((t) => t.id === themeId)?.swatch || THEMES[0].swatch;
    meta.setAttribute("content", swatch);
  }
}
