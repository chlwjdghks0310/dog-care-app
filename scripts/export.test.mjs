// 기록 내보내기 확인: npm test
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k], key: (i) => Object.keys(store)[i], get length() { return Object.keys(store).length; } };
globalThis.window = globalThis;
const R = await import("../src/services/records.js");
const E = await import("../src/services/exportData.js");
R.saveRecord("a", { type: "symptom", at: "2026-11-01T08:10", data: { kinds: ["구토"] }, memo: '노란 토, "한 번"', photos: ["data:x"] });
store["sb-xyz-auth-token"] = JSON.stringify({ access_token: "secret" });
const backup = JSON.parse(E.backupJson());
assert.ok(backup.data["dogcare-records-v1"], "기록이 들어감");
assert.ok(!JSON.stringify(backup).includes("secret"), "로그인 정보는 빠짐");
const csv = E.recordsCsv("a");
assert.ok(csv.startsWith("﻿날짜,시각,종류,내용,메모,사진"));
assert.ok(csv.includes('2026-11-01,08:10,증상,'));
assert.ok(csv.includes('"노란 토, ""한 번"""'), "쉼표·따옴표 감싸기");
assert.ok(csv.includes("사진 1장") && !csv.includes("data:x"), "사진은 장수만");
console.log("내보내기 OK");
