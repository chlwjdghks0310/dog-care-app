// 통합 기록 확인: npm test
import assert from "node:assert/strict";

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis;
const R = await import("../src/services/records.js");
const M = await import("../src/services/medications.js");
const { addWeightRecord } = await import("../src/services/weightLog.js");
const { getEventsForDate, getEventsByDog } = await import("../src/services/calendarEvents.js");
const { getCustomSchedules } = await import("../src/services/customSchedules.js");
const V = await import("../src/services/vetSummary.js");
const { todayKey, toDateKey, addDays } = await import("../src/utils/date.js");

const today = todayKey();
const day = (n) => toDateKey(addDays(new Date(`${today}T00:00:00`), n));
const at = (n, t = "09:00") => `${day(n)}T${t}`;

// 검증 — 필수 항목, 미래 시각, 체중 범위
assert.equal(R.validateRecord({ type: "symptom", at: at(0, "00:00"), data: { kinds: [] } }), "증상을 하나 이상 골라 주세요.");
assert.match(R.validateRecord({ type: "weight", at: at(0, "00:00"), data: { weightKg: "0" } }), /0\.1~120kg/);
assert.match(R.validateRecord({ type: "meal", at: at(1), data: { appetite: "평소" } }), /아직 오지 않은/);
assert.match(R.validateRecord({ type: "meal", at: "2026-13-40T99:99", data: { appetite: "평소" } }), /날짜와 시각/);
assert.equal(R.validateRecord({ type: "meal", at: at(0, "00:00"), data: {} }), "적은 내용이 없어요.");
assert.equal(R.validateRecord({ type: "meal", at: at(0, "00:00"), data: { appetite: "평소" } }), null);

// 같은 id로 두 번 저장해도 하나 — 중복 제출 방지
const id = R.newRecordId();
R.saveRecord("a", { id, type: "symptom", at: at(-2), data: { kinds: ["구토"], repeat: "가끔" }, memo: "노란 토", photos: [] });
R.saveRecord("a", { id, type: "symptom", at: at(-2), data: { kinds: ["구토"], repeat: "가끔" }, memo: "노란 토", photos: [] });
assert.equal(R.getRecords("a").length, 1);
const first = R.getRecords("a")[0];
assert.ok(first.createdAt && first.updatedAt);

// 강아지별로 섞이지 않음 — 다른 강아지 기록 수정·삭제가 영향 없음
R.saveRecord("b", { id: "rec-b1", type: "meal", at: at(-1), data: { appetite: "평소보다 적음" }, memo: "", photos: [] });
R.saveRecord("a", { id: "rec-a2", type: "meal", at: at(-10), data: { appetite: "평소보다 적음", water: "평소" }, memo: "", photos: [] });
R.saveRecord("a", { id: "rec-a3", type: "meal", at: at(-1), data: { appetite: "평소" }, memo: "", photos: [] });
R.deleteRecord("b", "rec-a2"); // 다른 강아지의 id로는 지워지지 않는다
assert.equal(R.getRecords("a").length, 3);
R.deleteRecord("b", "rec-b1");
assert.equal(R.getRecords("b").length, 0);
assert.equal(R.getRecords("a").length, 3);

// 타임라인 = 통합 기록 + 체중 + 실제로 누른 복용 기록(기록 없는 복용 건은 안 들어감)
addWeightRecord("a", { weightKg: 3.4, measuredAt: `${day(-20)}T08:00:00` });
addWeightRecord("a", { weightKg: 3.6, measuredAt: `${day(-3)}T08:00:00` });
addWeightRecord("b", { weightKg: 9, measuredAt: `${day(-3)}T08:00:00` });
M.addMed("a", { name: "위장약", dose: "1알", times: ["08:00", "20:00"], startDate: day(-2) });
const doses = M.getDosesForDate("a", day(-1));
M.markDoseDone("a", doses[0], `${day(-1)}T08:10:00`);
const tl = R.getTimeline("a");
assert.equal(tl.filter((r) => r.type === "weight").length, 2);
assert.equal(tl.filter((r) => r.type === "med").length, 1, "누른 복용만");
assert.match(R.summarize(tl.find((r) => r.type === "med")), /위장약 1알 먹임\(08:10\)/);

// 필터 조합(종류 AND 기간 AND 키워드) + 정렬
assert.deepEqual(R.filterTimeline(tl, { types: ["meal"], days: 7 }).map((r) => r.id), ["rec-a3"]);
assert.deepEqual(R.filterTimeline(tl, { types: ["meal", "symptom"], days: 7, q: "구토" }).map((r) => r.id), [id]);
assert.equal(R.filterTimeline(tl, { types: ["weight"], days: 7 }).length, 1);
assert.equal(R.filterTimeline(tl, { q: "없는말" }).length, 0);
const newest = R.filterTimeline(tl);
assert.ok(newest[0].at >= newest.at(-1).at);
assert.ok(R.filterTimeline(tl, { order: "old" })[0].at <= newest[0].at);

// 추세는 기록한 날만 — 빈 날을 채우지 않는다
assert.deepEqual(R.levelSeries("a", "appetite", 30).map((s) => s.value), ["평소보다 적음", "평소"]);
assert.deepEqual(R.levelSeries("a", "appetite", 7).map((s) => s.value), ["평소"]);
assert.equal(R.levelSeries("a", "sleep", 30).length, 0);

// 다음 진료일 → 일정표 + 알람, 날짜 바꾸면 옮기고, 지우면 같이 지움(중복 생성 없음)
let vet = R.saveRecord("a", { id: "rec-v", type: "vet", at: at(-1), data: { hospital: "행복병원", reason: "구토", nextDate: day(5), nextAlarm: true }, memo: "", photos: [] });
vet = R.saveRecord("a", { ...vet, links: R.syncSchedule("a", vet, { title: "🏥 행복병원 진료", date: day(5), alarm: true }) });
assert.equal(getEventsForDate("a", day(5)).length, 1);
assert.equal(getCustomSchedules("a").filter((x) => x.date === day(5)).length, 1);
vet = R.saveRecord("a", { ...vet, links: R.syncSchedule("a", vet, { title: "🏥 행복병원 진료", date: day(5), alarm: true }) }); // 그대로 다시 저장
assert.equal(getEventsForDate("a", day(5)).length, 1, "다시 저장해도 일정 하나");
vet = R.saveRecord("a", { ...vet, links: R.syncSchedule("a", vet, { title: "🏥 행복병원 진료", date: day(7), alarm: false }) });
assert.equal(getEventsForDate("a", day(5)).length, 0);
assert.equal(getEventsForDate("a", day(7)).length, 1);
assert.equal(getCustomSchedules("a").length, 0, "알림 끄면 알람도 지움");
R.deleteRecord("a", "rec-v");
assert.equal(Object.values(getEventsByDog("a")).flat().length, 0);
assert.equal(Object.values(getEventsByDog("b")).flat().length, 0);

assert.equal(R.filterTimeline(R.getTimeline("a"), { q: "혈액검사" }).length, 0);
R.saveRecord("a", { id: "rec-t", type: "vet", at: at(-1), data: { reason: "검진", tests: "혈액검사 정상" }, memo: "", photos: [] });
assert.deepEqual(R.filterTimeline(R.getTimeline("a"), { types: ["vet"], q: "혈액검사" }).map((r) => r.id), ["rec-t"], "요약에 없는 칸도 검색");
R.deleteRecord("a", "rec-t");

// 병원용 리포트에 실제 기록만 들어간다
R.saveRecord("a", { id: "rec-v2", type: "vet", at: at(-4), data: { hospital: "행복병원", reason: "구토", tests: "혈액검사 정상" }, memo: "", photos: [] });
R.saveRecord("a", { id: "rec-p", type: "potty", at: at(-2), data: { stool: "무름" }, memo: "산책 후", photos: [] });
const dog = { id: "a", name: "콩이", breed: "말티즈", gender: "female", birthDate: "2020-01-01", illnesses: "슬개골 수술" };
const s = V.buildVetSummary(dog, V.getVetNote("a"), today);
const get = (k) => s.find((x) => x.key === k)?.lines.join("\n") || "";
assert.match(get("basic"), /과거 질환·수술: 슬개골 수술/);
assert.match(get("symptoms"), /구토 \(가끔\) · 메모: 노란 토/);
assert.match(get("observe"), /식욕: 평소보다 적음 1번\(.+\), 평소 1번/);
assert.match(get("observe"), /대변: 무름 1번/);
assert.doesNotMatch(get("observe"), /수면|활동량/, "기록 없는 항목은 만들지 않음");
assert.match(get("visits"), /행복병원 구토[\s\S]*검사: 혈액검사 정상/);
assert.match(get("memos"), /산책 후/);

console.log("통합 기록 확인 통과");
