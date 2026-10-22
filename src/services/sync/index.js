// 로그인 상태에서 자동으로 서버와 맞추기: 앱을 켤 때, 기록이 바뀌고 2초 뒤, 앱으로 다시 돌아왔을 때.
// 서버에서 받은 게 있으면 "dogcare-synced" 이벤트를 보내 화면이 새로 그리게 한다.
import { supabase } from "../supabase";
import { onLocalChange } from "../storage";
import { syncOnce, resetSyncState, SYNCED_KEYS } from "./engine";
import { supabaseRemote } from "./supabaseRemote";

const WATCHED = new Set([...SYNCED_KEYS, "dogcare-dogs-v1", "dogcare-expense-categories-v1"]);
const listeners = new Set();
// blocked: 같은 id의 강아지가 다른 계정에 백업돼 있어 이 계정으로 올리지 못한 강아지 id
let status = { enabled: Boolean(supabase), user: null, syncing: false, lastSyncedAt: null, error: "", blocked: [] };
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
      const { changed, blocked } = await syncOnce(supabaseRemote(supabase));
      setStatus({ lastSyncedAt: new Date().toISOString(), blocked });
      if (changed) {
        window.dispatchEvent(new Event("dogcare-synced"));
        // 가족이 바꾼 알람·약·일정을 받았으면 이 기기의 서버 알람 목록도 바로 새로(순환 import를 피해 동적으로)
        import("../notifications").then((m) => m.syncPushAlarms()).catch(() => {});
      }
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
    if (changed) watchRemote(user);
  });
  onLocalChange((key) => {
    if (!status.user || !WATCHED.has(key)) return;
    if (running) return void (again = true);
    clearTimeout(timer);
    timer = setTimeout(syncNow, 2000);
  });
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && syncNow());
}

// 실시간: 가족이 기록을 바꾸면 Supabase가 알려 준다 → 1초 모아서 맞추기. RLS가 적용돼 내 강아지 변경만 온다.
// 끊겨 있던 동안의 변경은 앱으로 돌아올 때(visibilitychange) 맞추기가 받아 온다.
let channel = null;
let liveTimer = null;
function watchRemote(user) {
  if (channel) supabase.removeChannel(channel);
  channel = null;
  if (!user) return;
  channel = supabase
    .channel("pet-items")
    .on("postgres_changes", { event: "*", schema: "public", table: "pet_items" }, () => {
      clearTimeout(liveTimer);
      liveTimer = setTimeout(syncNow, 1000);
    })
    .subscribe();
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  resetSyncState(); // 폰 기록은 그대로 두고, 서버와 맞춘 기억만 지운다
  setStatus({ user: null, lastSyncedAt: null, error: "", blocked: [] });
}

// 계정 삭제(설정 → 백업·로그인). 서버 기록은 supabase/schema.sql의 delete_my_account가 지운다 —
// 가족과 함께 쓰던 강아지는 가족에게 넘어가고, 나만 쓰던 강아지 기록은 서버에서 사라진다. 이 폰의 내 강아지 기록은 남는다.
export async function deleteAccount() {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw new Error(error instanceof TypeError || /fetch|network/i.test(error.message) ? "인터넷 연결을 확인하고 다시 시도해 주세요." : "계정을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요.");
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  resetSyncState({ dropFamily: true });
  setStatus({ user: null, lastSyncedAt: null, error: "", blocked: [] });
  window.dispatchEvent(new Event("dogcare-synced"));
  import("../notifications").then((m) => m.syncPushAlarms()).catch(() => {});
}
