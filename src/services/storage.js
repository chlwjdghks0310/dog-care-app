// localStorage 래퍼. 나중에 Supabase 등으로 교체할 때 이 파일만 바꾸면 되도록 분리한다.
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
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

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
  listeners.forEach((fn) => fn(key));
  return true;
}
