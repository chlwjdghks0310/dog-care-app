// 이용 통계(서버 /api/t → supabase/analytics.sql): 날짜별 횟수와 사람 수만. 기록 내용·이름·이메일은 보내지 않는다.
// 기기 번호는 이 기기에서 만든 무작위 값(mc-vid). 키 이름을 "dogcare-"로 시작하지 않게 한다 — index.html이
// "dogcare- 키가 있으면 기존 사용자"로 보고 소개 페이지 대신 앱을 열기 때문(홈페이지 t.js와 같은 키를 쓴다).
import { readJSON } from "./storage";
import { getSyncStatus } from "./sync/index";
import { supabase } from "./supabase";

const API = import.meta.env?.VITE_API_BASE || "http://localhost:8787";
const VID = "mc-vid";
const SRC = "mc-src"; // 처음 들어온 경로(홈페이지에서 정해 둔 것). 홈 화면 앱(아이폰)은 저장소가 따로라 비어 있을 수 있다
const SEEN = "mc-app"; // 이 기기에서 앱을 연 적 있음
const DAY = "mc-open-day";

const OFF = "mc-off"; // 운영자 기기: 설정 → 이용 통계 행의 "내 사용은 빼기"(11/12)
const off = () => typeof navigator === "undefined" || navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || ls.get(OFF) === "1";
export const isTrackingOff = () => ls.get(OFF) === "1";
export const setTrackingOff = (v) => ls.set(OFF, v ? "1" : "0");
const ls = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* 개인 정보 보호 모드 등 — 통계만 빠진다 */
    }
  },
};

export function visitorId() {
  let v = ls.get(VID);
  if (!v) ls.set(VID, (v = crypto.randomUUID?.() || `${Date.now()}${Math.random()}`.replace(".", "")));
  return v;
}

// 어디서 왔나: ?from= → utm_source → 다른 사이트에서 눌러 왔으면 그 사이트 → 없으면 "" (바로 들어옴)
export function pickSource(search, referrer, host) {
  const q = new URLSearchParams(search);
  const tag = q.get("from") || q.get("utm_source");
  if (tag) return tag.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 40);
  let ref = "";
  try {
    ref = referrer ? new URL(referrer).hostname.replace(/^www\.|^m\./, "") : "";
  } catch {
    /* 이상한 referrer는 무시 */
  }
  if (!ref || ref === host) return "";
  const known = [["naver", "naver"], ["instagram", "instagram"], ["threads", "threads"], ["kakao", "kakao"], ["google", "google"], ["daum", "daum"], ["litt.ly", "littly"], ["facebook", "facebook"], ["youtube", "youtube"]];
  return known.find(([k]) => ref.includes(k))?.[1] || ref.slice(0, 40);
}

const isInstalled = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

function send(body) {
  if (off() || API.includes("localhost")) return; // 개발 중엔 보내지 않는다
  const data = JSON.stringify({ ...body, v: visitorId() });
  if (!navigator.sendBeacon?.(`${API}/api/t`, new Blob([data], { type: "text/plain" }))) {
    fetch(`${API}/api/t`, { method: "POST", headers: { "Content-Type": "text/plain" }, body: data, keepalive: true }).catch(() => {});
  }
}

// AI 요청에 붙이는 머리글 — 서버가 AI 사용 횟수를 로그인/비로그인으로 나눠 센다
export const trackHeaders = () => (off() ? {} : { "X-MC-V": visitorId(), "X-MC-L": getSyncStatus().user ? "1" : "0" });

async function open() {
  ls.set(DAY, new Date().toDateString());
  const session = supabase ? (await supabase.auth.getSession().catch(() => null))?.data?.session : null;
  send({ e: "open", l: Boolean(session), i: isInstalled(), d: (readJSON("dogcare-dogs-v1", []) || []).length > 0 });
}

// 핵심 행동(11/8): 앱을 "열기만" 한 사람과 "쓴" 사람을 나눠 센다. 하루에 행동마다 한 번만 보낸다.
// a: "check"(하루 체크 끝냄) — 퍼피 100일이 생기면 "task"(오늘 과제 끝냄)를 같은 자리에
export function trackAct(a) {
  const k = `mc-act-${a}`;
  const today = new Date().toDateString();
  if (ls.get(k) === today) return;
  ls.set(k, today);
  send({ e: "act", a });
}

// 앱을 켤 때 한 번(main.jsx) + 다음 날 다시 앞으로 가져왔을 때
export function trackAppStart() {
  if (!ls.get(SEEN)) {
    // 통계를 넣기 전부터 쓰던 사람(기록이 이미 있음)은 "처음 연 것"으로 세지 않는다
    let existing = false;
    try {
      existing = Object.keys(localStorage).some((k) => k.startsWith("dogcare-"));
    } catch {
      /* 저장소를 못 읽으면 새 사람으로 센다 */
    }
    const src = ls.get(SRC) || pickSource(location.search, document.referrer, location.hostname);
    if (!existing) send({ e: "first_open", s: src, i: isInstalled() });
    ls.set(SEEN, "1");
  }
  open();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && ls.get(DAY) !== new Date().toDateString()) open();
  });
}
