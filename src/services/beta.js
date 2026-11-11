// 베타 준비(11/10, 근거 ../자료용/자료/2026-11-10-베타준비-조사.md):
// ① 오류 자동 보고 — 메시지 300자·스택 6줄·버전·화면 경로·기기만. 기록 내용·이름·주소창 쿼리는 안 보낸다. 같은 오류는 한 번, 켜 있는 동안 20건까지
// ② 배포 뒤 옛 파일을 못 불러오면(vite:preloadError) 새로고침
// ③ 앱으로 돌아올 때 /version.json을 보고 새 버전이면 조용히 새로고침 — 적는 중이면 건너뜀(다음에 돌아올 때)
import { visitorId } from "./analytics";

const API = import.meta.env?.VITE_API_BASE || "http://localhost:8787";
export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
const VER_KEY = "mc-ver"; // 마지막으로 연 버전 — 바뀐 점 한 줄을 보여 줄지 판단

// 적는 중인가: 글자 입력 중 · 기록 폼(data-editing) · 시트가 열림. App의 동기화 새로 그리기와 새 버전 새로고침이 같이 쓴다
export const isEditing = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "") || Boolean(document.querySelector("[data-editing], .es-sheet"));

const sent = new Set();
export function reportError(msg, stack) {
  try {
    msg = String(msg || "").slice(0, 300);
    if (!msg || sent.has(msg) || sent.size >= 20 || APP_VERSION === "dev") return;
    sent.add(msg);
    const body = JSON.stringify({ v: visitorId(), ver: APP_VERSION, path: location.pathname, msg, stack: String(stack || "").split("\n").slice(0, 6).join("\n").slice(0, 1200), ua: navigator.userAgent.slice(0, 200) });
    if (!navigator.sendBeacon?.(`${API}/api/err`, body)) fetch(`${API}/api/err`, { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
  } catch {
    /* 보고하다 또 오류 나지 않게 */
  }
}

let checkedAt = 0;
async function checkVersion() {
  if (document.hidden || APP_VERSION === "dev" || Date.now() - checkedAt < 60_000) return;
  checkedAt = Date.now();
  try {
    const { v } = await (await fetch("/version.json", { cache: "no-store" })).json();
    if (v && v !== APP_VERSION && !isEditing()) location.reload();
  } catch {
    /* 인터넷 없음 등 — 다음에 */
  }
}

// 새 버전으로 바뀐 뒤 처음 열었나(처음 설치는 아님) — WhatsNew가 한 번 보여 준다
export function justUpdated() {
  try {
    const last = localStorage.getItem(VER_KEY);
    localStorage.setItem(VER_KEY, APP_VERSION);
    return Boolean(last) && last !== APP_VERSION;
  } catch {
    return false;
  }
}

export function initBeta() {
  if (typeof window === "undefined") return;
  window.addEventListener("error", (e) => reportError(e.message, e.error?.stack));
  window.addEventListener("unhandledrejection", (e) => reportError(e.reason?.message || e.reason, e.reason?.stack));
  // 배포 직후 옛 파일을 못 불러오면 한 번만 새로고침 — 오프라인(저장된 화면으로 연 상태)이거나 방금 새로고침했으면 반복하지 않는다
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    try {
      if (!navigator.onLine || sessionStorage.getItem("mc-rl")) return;
      sessionStorage.setItem("mc-rl", "1");
    } catch {
      return;
    }
    location.reload();
  });
  try {
    setTimeout(() => sessionStorage.removeItem("mc-rl"), 10_000); // 정상적으로 10초 버티면 다음 배포 때 또 한 번 허용
  } catch {
    /* 저장소 없음 */
  }
  document.addEventListener("visibilitychange", checkVersion);
}
