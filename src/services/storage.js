// localStorage 래퍼. 나중에 Supabase 등으로 교체할 때 이 파일만 바꾸면 되도록 분리한다.
// 사진은 photoStore(IndexedDB)에 따로 — 여기서 "idb:번호" ↔ 화면용 주소를 바꿔 줘서 화면 코드는 그대로 쓴다(11/8)
import { needsRevive, revive, needsReplace, replace, stashSoon } from "./photoStore";
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return needsRevive(raw) ? JSON.parse(raw, revive) : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// 저장이 바뀌면 알려 준다 — 로그인했을 때 서버로 올리기(src/services/sync)가 이걸 듣는다
const listeners = new Set();
export function onLocalChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let lastStorageError = 0;
function notifyStorageError() {
  if (typeof window === "undefined" || Date.now() - lastStorageError < 30_000) return;
  lastStorageError = Date.now();
  try {
    window.dispatchEvent(new CustomEvent("dogcare-storage-error"));
  } catch {
    /* 알림만 못 띄움 */
  }
}

export function writeJSON(key, value) {
  try {
    const text = needsReplace() ? JSON.stringify(value, replace) : JSON.stringify(value);
    localStorage.setItem(key, text);
    if (text.includes("data:image/")) stashSoon(); // 새 사진은 저장된 뒤 사진 저장소로 옮긴다
  } catch {
    notifyStorageError(); // 11/11 점검 #4: 개인정보 모드·용량 초과로 저장이 안 되면 조용히 묻히지 않게 App이 한 줄 띄운다
    return false;
  }
  listeners.forEach((fn) => fn(key));
  return true;
}
