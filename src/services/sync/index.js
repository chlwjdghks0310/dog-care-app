// 로그인 상태에서 자동으로 서버와 맞추기: 앱을 켤 때, 기록이 바뀌고 2초 뒤, 앱으로 다시 돌아왔을 때.
// 서버에서 받은 게 있으면 "dogcare-synced" 이벤트를 보내 화면이 새로 그리게 한다.
import { supabase } from "../supabase";
import { onLocalChange } from "../storage";
import { syncOnce, resetSyncState, SYNCED_KEYS } from "./engine";
import { supabaseRemote } from "./supabaseRemote";

const WATCHED = new Set([...SYNCED_KEYS, "dogcare-dogs-v1", "dogcare-expense-categories-v1"]);
const listeners = new Set();
let status = { enabled: Boolean(supabase), user: null, syncing: false, lastSyncedAt: null, error: "" };
let running = null;
let again = false;
let timer = null;

function setStatus(patch) {
  status = { ...status, ...patch };
  listeners.forEach((fn) => fn(status));
}
export const getSyncStatus = () => status;
export function onSyncStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function syncNow() {
  if (!supabase || !status.user) return;
  if (running) {
    again = true; // 맞추는 중에 또 바뀌면 끝나고 한 번 더
    return running;
  }
  setStatus({ syncing: true, error: "" });
  running = (async () => {
    try {
      const { pulled } = await syncOnce(supabaseRemote(supabase));
      setStatus({ lastSyncedAt: new Date().toISOString() });
      if (pulled) window.dispatchEvent(new Event("dogcare-synced"));
    } catch (err) {
      // 인터넷이 끊겨도 폰에는 저장돼 있으니 다음에 다시 시도하면 된다
      setStatus({ error: err instanceof TypeError ? "인터넷 연결이 없어 다음에 백업할게요." : err.message || "백업하지 못했어요." });
    } finally {
      running = null;
      setStatus({ syncing: false });
      if (again) {
        again = false;
        syncNow();
      }
    }
  })();
  return running;
}

let started = false;
export function startSync() {
  if (!supabase || started) return;
  started = true;
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    const changed = user?.id !== status.user?.id;
    setStatus({ user });
    if (user && changed) syncNow();
  });
  onLocalChange((key) => {
    if (!status.user || !WATCHED.has(key)) return;
    if (running) return void (again = true);
    clearTimeout(timer);
    timer = setTimeout(syncNow, 2000);
  });
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && syncNow());
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  resetSyncState(); // 폰 기록은 그대로 두고, 서버와 맞춘 기억만 지운다
  setStatus({ user: null, lastSyncedAt: null, error: "" });
}
