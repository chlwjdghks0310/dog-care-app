// 알림 종류·조용한 시간 확인: npm test
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
const N = await import("../src/services/notifPrefs.js");
const q = { on: true, from: "22:00", to: "08:00" };
assert.equal(N.inQuiet("23:30", q), true);
assert.equal(N.inQuiet("07:59", q), true);
assert.equal(N.inQuiet("08:00", q), false);
assert.equal(N.inQuiet("12:00", { on: true, from: "12:00", to: "14:00" }), true);
assert.equal(N.inQuiet("23:30", { ...q, on: false }), false);
// 기본: 다 켜짐, 조용한 시간 22~08
assert.equal(N.allowed("care", "09:00"), true);
assert.equal(N.allowed("care", "23:00"), false);
assert.equal(N.allowed("med", "23:00"), true, "약은 조용한 시간에도");
assert.equal(N.allowed("custom", "06:00"), true, "직접 만든 알람은 그대로");
N.saveNotifPrefs({ ...N.getNotifPrefs(), report: false });
assert.equal(N.allowed("report", "21:00"), false);
console.log("알림 설정 OK");
