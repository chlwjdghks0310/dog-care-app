// 여름이가 오래 기억하는 기록: 90일 전부 · 진료/증상/약은 1년 · 체중 전체
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis; globalThis.dispatchEvent = () => {}; globalThis.CustomEvent = class { constructor(t) { this.type = t; } };
const T = "2026-11-26";
const day = (n) => { const d = new Date(`${T}T00:00:00`); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const rec = (id, type, ago, data, memo = "") => ({ id, type, at: `${day(ago)}T10:00`, data, memo, photos: [] });
localStorage.setItem("dogcare-records-v1", JSON.stringify({ d1: [
  rec("v1", "vet", 200, { hospital: "행복동물병원", reason: "설사", prescription: "유산균", explanation: "장이 예민하다고 함" }),
  rec("v0", "vet", 400, { reason: "아주 오래된 진료" }),
  rec("m1", "meal", 100, { kind: "dry", amount: 30, appetite: "평소" }),
  rec("m2", "meal", 3, { kind: "dry", amount: 30, appetite: "평소보다 적음" }),
  rec("s1", "symptom", 120, { kinds: ["구토"] }),
  rec("s2", "symptom", 10, { kinds: ["기침"] }, "밤에 두 번"),
  rec("x1", "vital", 2, { metric: "temp", value: 38.5 }),
  rec("f1", "meal", -2, { kind: "dry", amount: 30 }), // 미래 날짜로 잘못 적힌 기록은 뺀다
] }));
localStorage.setItem("dogcare-weight-log-v1", JSON.stringify({ d1: Array.from({ length: 30 }, (_, i) => ({ id: `w${i}`, dogId: "d1", weightKg: 1 + i * 0.1, measuredAt: `${day(300 - i * 10)}T09:00:00` })) }));
const dc = await import("../src/services/dailyCheck.js");
dc.saveDiff("d1", day(5), { meal: "조금 남김" }); dc.saveUsual("d1", day(4)); dc.saveDiff("d1", day(100), { stool: "무름" });
const { buildMemory } = await import("../src/services/assistantMemory.js");
const m = buildMemory({ id: "d1", name: "여름이" }, T);
assert.ok(m.includes("장이 예민하다고 함"), "200일 전 진료 기록을 기억한다");
assert.ok(!m.includes("아주 오래된 진료"), "1년 넘은 진료는 뺀다");
assert.ok(m.includes("기침") && m.includes("밤에 두 번"), "최근 90일 기록과 메모");
assert.ok(m.includes("처방 유산균") && m.includes("수의사 설명 장이 예민하다고 함"), "진료 기록은 처방·설명까지");
assert.equal((m.match(/밤에 두 번/g) || []).length, 1, "메모가 두 번 들어가지 않는다");
assert.ok(m.includes("구토"), "90일~1년 전 증상은 기억한다");
assert.ok(!m.split("\n").some((l) => l.includes(`${day(100)} 10:00`) && l.includes("밥·물")), "100일 전 평범한 식사 기록은 뺀다");
assert.ok(!m.includes(day(-2)), "미래 기록 제외");
assert.ok(!/38\.5/.test(m), "건강 수치는 요약 쪽에 있어 여기선 뺀다");
assert.ok(m.includes("[하루 체크 — 최근 90일]") && m.includes(`${day(5)} 밥 조금 남김`) && !m.includes(`${day(100)} 변 무름`), "하루 체크의 다른 날은 90일만");
const w = m.split("\n").find((l) => l.startsWith("[체중 흐름"));
assert.ok(w.includes(`${day(300)} 1kg`) && w.includes("3.9kg"), "체중은 처음과 최근을 모두");
assert.ok(w.split(",").length <= 20, "체중이 많으면 달마다 하나로 줄인다");
assert.ok(m.indexOf("[진료 기록") < m.indexOf("[기록 — 최근 90일]"), "잘릴 때를 대비해 진료 기록이 맨 앞");
assert.equal(buildMemory({ id: "none" }, T), "");
console.log("assistant-memory ok");
