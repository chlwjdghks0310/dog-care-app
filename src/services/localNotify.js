// 스토어 앱(Capacitor) 전용: 서버 푸시 대신 휴대폰이 직접 울리는 예약 알림.
// buildPushAlarms()가 만든 목록(웹 푸시로 서버에 보내던 것)을 그대로 받아, 서버 checkPushAlarms와 같은 규칙으로 날짜를 펼쳐 예약한다.
import { isNative } from "./native";

const QUIET_OK = new Set(["med", "custom", "meal"]); // server/index.js와 같은 값
const hm = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function allowedFor(prefs, a) {
  if (!prefs || !a.cat) return true;
  if (prefs[a.cat] === false) return false;
  const q = prefs.quiet;
  if (!q?.on || QUIET_OK.has(a.cat) || !/^\d\d:\d\d$/.test(q.from || "") || !/^\d\d:\d\d$/.test(q.to || "")) return true;
  const t = hm(a.time), f = hm(q.from), e = hm(q.to);
  return !(f <= e ? t >= f && t < e : t >= f || t < e);
}

// 알람 목록 → 앞으로 울릴 [{ at: Date, title, body, url }] (시간순, 지난 시각 제외)
// ponytail: 7일 치·60개까지만 예약(아이폰은 앱당 64개 한도). 앱을 열 때마다 다시 채우므로 7일 넘게 안 열면 알림이 끊긴다 — 서버 푸시(APNs·FCM)를 붙이면 해결
export function expandAlarms(alarms, now = new Date(), days = 7, max = 60) {
  const prefs = alarms.find((a) => a?.prefs)?.prefs;
  const out = [];
  const seen = new Set();
  for (let i = 0; i < days; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const date = dateKey(day);
    for (const a of alarms) {
      if (!a || !/^\d\d:\d\d$/.test(String(a.time)) || !allowedFor(prefs, a)) continue;
      if (a.skipDate === date) continue;
      if (a.onlyDate && a.onlyDate !== date) continue;
      if ((a.from && date < a.from) || (a.until && date > a.until)) continue;
      if (Array.isArray(a.days) && !a.days.includes(day.getDay())) continue;
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(a.time.slice(0, 2)), Number(a.time.slice(3, 5)));
      if (at <= now) continue;
      const key = `${date}|${a.time}|${a.title}|${a.body}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ at, title: a.title || "멍케어", body: a.body || "", url: a.url?.replace("%7Bdate%7D", date).replace("{date}", date) });
    }
  }
  return out.sort((x, y) => x.at - y.at).slice(0, max);
}

let plugin = null;
let perm = "default"; // getPermission()이 바로 답해야 해서 마지막으로 확인한 값을 들고 있는다
const toWeb = (s) => (s === "granted" ? "granted" : s === "denied" ? "denied" : "default");
export const nativePermission = () => perm;

// 앱을 켤 때 한 번: 권한 상태를 읽고, 알림을 눌러 들어오면 그 주소를 연다
export async function initLocalNotify(onOpenUrl) {
  if (!isNative()) return;
  plugin = (await import("@capacitor/local-notifications")).LocalNotifications;
  perm = toWeb((await plugin.checkPermissions()).display);
  plugin.addListener("localNotificationActionPerformed", (e) => {
    const url = e?.notification?.extra?.url;
    if (url) onOpenUrl(url);
  });
}

export async function requestNativePermission() {
  if (!plugin) return "unsupported";
  perm = toWeb((await plugin.requestPermissions()).display);
  return perm;
}

// ponytail: 안드로이드는 "정확한 알람" 권한 없이 예약한다(isExactNotification 기본값 true면 "알람 및 리마인더" 설정 화면으로 튕겨 보냄) — 절전 중엔 몇 분 늦을 수 있다. 약 알림이 늦는다는 말이 나오면 권한 안내를 붙인다
// 예약을 전부 지우고 새 목록으로 다시 건다(목록이 60개 이하라 통째로 바꾸는 게 가장 단순)
export async function scheduleLocal(alarms) {
  if (!plugin || perm !== "granted") return;
  const pending = (await plugin.getPending()).notifications;
  if (pending.length) await plugin.cancel({ notifications: pending.map((n) => ({ id: n.id })) });
  const list = expandAlarms(alarms);
  if (list.length) await plugin.schedule({ notifications: list.map((n, i) => ({ id: i + 1, title: n.title, body: n.body, schedule: { at: n.at }, isExactNotification: false, extra: { url: n.url } })) });
}
