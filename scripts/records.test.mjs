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

// 저장 후 강아지 반응 — 걱정되는 기록엔 축하하지 않는다(진단 문구 없음)
const { reactionFor } = await import("../src/data/recordReactions.js");
{
  assert.equal(reactionFor({ type: "symptom", data: { kinds: ["구토"] } }).concern, true);
  assert.equal(reactionFor({ type: "potty", data: { stool: "설사" } }).concern, true);
  assert.equal(reactionFor({ type: "potty", data: { stool: "정상" } }).concern, undefined);
  assert.equal(reactionFor({ type: "meal", data: { appetite: "평소보다 적음" } }).concern, true);
  for (const t of Object.keys(R.TYPES)) assert.ok(reactionFor({ type: t, data: {} }).line, t);
}

// 변 사진 결과 → 배변 기록 칸: 모르는 값은 버리고, 피가 보이면 "피 섞임", 변이 아니면 채우지 않음
const { normalizeStoolResult } = await import("../src/services/photoCheck.js");
assert.equal(normalizeStoolResult({ is_stool: false, retake: "가까이 찍어 주세요" }).ok, false);
assert.equal(normalizeStoolResult(null).ok, false);
const ok = normalizeStoolResult({ is_stool: true, shape: "무름", fecal_score: 5, color: "갈색", blood: "안 보임", mucus: "판단 어려움", foreign: "안 보임", foreign_note: "", flags: [], summary: "부드럽게 쌓인 갈색 변" });
assert.equal(ok.fill.stool, "무름");
assert.match(ok.fill.photoNote, /대변 점수 5\/7 · 색 갈색 · 피 안 보임 · 점액 판단 어려움/);
const bloody = normalizeStoolResult({ is_stool: true, shape: "설사", fecal_score: 6, color: "붉은 갈색", blood: "보임", mucus: "보임", foreign: "안 보임", flags: ["붉은 피가 섞여 보여요"], summary: "" });
assert.equal(bloody.fill.stool, "피 섞임");
assert.deepEqual(bloody.fill.photoFlags, ["붉은 피가 섞여 보여요"]);
const weird = normalizeStoolResult({ is_stool: true, shape: "아주 나쁨", fecal_score: 99, color: 5, blood: "많이", flags: "x" });
assert.equal(weird.fill.stool, undefined, "모르는 모양은 칸에 넣지 않음");
assert.equal(weird.obs.score, null);
assert.equal(weird.obs.blood, "판단 어려움");
assert.deepEqual(weird.obs.flags, []);
assert.equal(reactionFor({ type: "potty", data: { stool: "정상", photoFlags: ["피"] } }).concern, true);
assert.match(R.summarize({ type: "potty", data: { stool: "피 섞임", photoFlags: ["붉은 피"] }, memo: "" }), /⚠ 붉은 피/);

console.log("통합 기록 확인 통과");

// ── 건강 수치 ──
{
  const { VITAL, outOfRange } = await import("../src/data/vitals.js");
  const at2 = (n, t) => `${day(n)}T${t}`;
  assert.match(R.validateRecord({ type: "vital", at: at2(0, "00:00"), data: { metric: "temp", value: 52 } }), /30~45℃/);
  assert.match(R.validateRecord({ type: "vital", at: at2(0, "00:00"), data: { metric: "weight", value: 3 } }), /어떤 수치/);
  assert.equal(R.validateRecord({ type: "vital", at: at2(0, "00:00"), data: { metric: "water", value: 200 } }), null);
  for (const [t, v] of [["08:00", 150], ["13:00", 100]]) R.saveRecord("v", { id: R.newRecordId(), type: "vital", at: at2(-1, t), data: { metric: "water", value: v }, memo: "", photos: [] });
  R.saveRecord("v", { id: R.newRecordId(), type: "vital", at: at2(-3, "09:00"), data: { metric: "water", value: 300 }, memo: "", photos: [] });
  const water = R.vitalDaily(R.getVitalEntries("v", "water"), "sum");
  assert.deepEqual(water.map((d) => [d.date, d.value]), [[day(-3), 300], [day(-1), 250]], "하루 합계, 기록 없는 날은 만들지 않음");
  for (const [n, v] of [[-2, 24], [-1, 42], [-1, 28]]) R.saveRecord("v", { id: R.newRecordId(), type: "vital", at: at2(n, n === -1 && v === 28 ? "23:00" : "22:00"), data: { metric: "resp", value: v }, memo: "", photos: [] });
  assert.deepEqual(R.vitalDaily(R.getVitalEntries("v", "resp"), "point").map((d) => d.value), [24, 28], "잴 때마다 보는 건 그날 마지막 값");
  assert.equal(outOfRange("resp", 42), "above");
  assert.equal(outOfRange("temp", 38.5), null);
  // 산책: 일상 기록의 산책 시간도 합침
  R.saveRecord("v", { id: "rec-walk-daily", type: "daily", at: at2(-1, "18:00"), data: { kind: "산책", minutes: "30" }, memo: "", photos: [] });
  R.saveRecord("v", { id: R.newRecordId(), type: "vital", at: at2(-1, "07:00"), data: { metric: "walk", value: 20 }, memo: "", photos: [] });
  assert.equal(R.vitalDaily(R.getVitalEntries("v", "walk"), "sum").at(-1).value, 50);
  assert.match(R.summarize({ type: "vital", data: { metric: "temp", value: 38.55 }, memo: "" }), /체온 38\.6℃/);
  assert.equal(VITAL.fluid.unit, "ml");
  // 다른 강아지에 안 섞임
  assert.equal(R.getVitalEntries("a", "water").length, 0);
  // 병원용 기록에 건강 수치 요약
  const vs = V.buildVetSummary({ id: "v", name: "콩", breed: "말티즈", gender: "male", birthDate: "2020-01-01" }, V.getVetNote("v"), today);
  const vl = vs.find((x) => x.key === "vitals").lines.join("\n");
  assert.match(vl, /음수량: 기록한 2일 하루 평균 275ml/);
  assert.match(vl, /호흡수: 최근 28회\/분.*3번 잼 24~42, 참고 범위\(15~30\) 밖 1번/);
  assert.doesNotMatch(vl, /체온|심박수/, "기록 없는 수치는 안 나옴");
  console.log("건강 수치 확인 통과");
}

// ── AI 채팅으로 건강 수치 넣기·고치기·지우기 ──
{
  const A = await import("../src/services/appActions.js");
  const dogA = { id: "ai", name: "보리", breed: "푸들", birthDate: "2020-01-01", gender: "female" };
  const r1 = A.applyAppActions(dogA, [{ type: "add_health_value", metric: "water", value: 200, date: day(0), time: "00:00" }]);
  assert.equal(r1.done.length, 1, JSON.stringify(r1));
  assert.match(r1.done[0], /음수량 200ml/);
  const bad = A.applyAppActions(dogA, [
    { type: "add_health_value", metric: "temp", value: 99, date: day(0) },
    { type: "add_health_value", metric: "weight", value: 3, date: day(0) },
    { type: "add_health_value", metric: "nope", value: 3, date: day(0) },
  ]);
  assert.equal(bad.done.length, 0);
  assert.equal(bad.failed, 3, "범위 밖·몸무게·모르는 수치는 저장 안 함");
  const id = R.getRecords("ai")[0].id;
  // 고치기·지우기는 버튼 확인 후 — 먼저 confirm 목록으로
  const c = A.applyAppActions(dogA, [{ type: "update_record", kind: "health_record", id, value: 250, summary: "물 200→250" }]);
  assert.equal(c.confirm.length, 1);
  assert.match(A.applyConfirmedAction(dogA, c.confirm[0]), /음수량 250ml/);
  assert.equal(R.getRecords("ai")[0].data.value, 250);
  assert.equal(A.applyConfirmedAction(dogA, { type: "update_record", kind: "health_record", id, value: 99999, summary: "x" }), null, "범위 밖으로는 못 고침");
  // 다른 강아지 id로는 못 지움
  assert.equal(A.applyAppActions({ ...dogA, id: "other" }, [{ type: "delete_record", kind: "health_record", id, summary: "x" }]).confirm.length, 0);
  assert.match(A.applyConfirmedAction(dogA, { type: "delete_record", kind: "health_record", id, summary: "물 250ml" }), /지웠어요/);
  assert.equal(R.getRecords("ai").length, 0);
  console.log("AI 건강 수치 확인 통과");
}

// 채팅 일정: 종류·시각을 받아 저장하고, 고치기로 종류만 바꿀 수 있다
{
  const A = await import("../src/services/appActions.js");
  const { getEventsForDate } = await import("../src/services/calendarEvents.js");
  const dogC = { id: "cal", name: "콩이", breed: "말티즈", birthDate: "2022-01-01", gender: "male" };
  const d = day(3);
  const res = A.applyAppActions(dogC, [{ type: "add_calendar_event", date: d, title: "미용 예약", kind: "grooming", time: "14:00" }]);
  assert.equal(res.done.length, 1);
  assert.match(res.done[0], /14:00 미용 예약 \(✂️ 미용\)/);
  const ev = getEventsForDate("cal", d)[0];
  assert.equal(ev.kind, "grooming");
  assert.equal(ev.time, "14:00");
  A.applyAppActions(dogC, [{ type: "add_calendar_event", date: d, title: "뭔가", kind: "없는종류" }]);
  assert.equal(getEventsForDate("cal", d)[1].kind, "etc", "모르는 종류는 기타");
  const conf = A.applyAppActions(dogC, [{ type: "update_record", kind: "calendar_event", id: ev.id, summary: "미용 → 병원", event_kind: "vet" }]).confirm;
  assert.equal(conf.length, 1);
  assert.ok(A.applyConfirmedAction(dogC, conf[0]));
  const changed = getEventsForDate("cal", d).find((e) => e.id === ev.id);
  assert.equal(changed.kind, "vet");
  assert.equal(changed.time, "14:00", "종류만 바꾸면 시각은 그대로");
  console.log("채팅 일정 종류 확인 통과");
}

// 산책을 기록하면 체크리스트의 산책 할 일이 완료로 보이고, 급여 시각은 밥 주기 할 일이 된다
{
  const { getTodayChecklist } = await import("../src/services/careEngine.js");
  const { saveFeedingSettings } = await import("../src/services/feedingSettings.js");
  const dogW = { id: "walk", name: "두부", breed: "말티즈", birthDate: "2022-01-01", gender: "male" };
  const today = day(0);
  const walkItem = () => getTodayChecklist(dogW, today).find((i) => i.category === "산책");
  assert.ok(walkItem() && !walkItem().completed);
  R.saveRecord("walk", { id: "w1", type: "vital", at: `${today}T00:00`, data: { metric: "walk", value: 30 }, memo: "", photos: [] });
  assert.equal(walkItem().completed, true);
  saveFeedingSettings("walk", { times: ["08:00", "18:30"] });
  const meals = getTodayChecklist(dogW, today).filter((i) => i.category === "식사");
  assert.deepEqual(meals.map((m) => m.title), ["아침 밥 주기", "저녁 밥 주기"]);
  assert.deepEqual(meals[1].suggestedTimes, ["18:30"]);
  saveFeedingSettings("walk", { times: ["09:00"] });
  assert.deepEqual(getTodayChecklist(dogW, today).filter((i) => i.category === "식사").map((m) => m.description.slice(0, 5)), ["09:00"], "시각을 바꾸면 안 끝낸 밥 항목도 바뀜");
  console.log("체크리스트 산책·밥 확인 통과");
}

// 비서 첫 화면 오늘 요약: 남은 할 일, 다음 약(아직 안 먹인 것), 7일 안 일정
{
  const { getTodaySummary } = await import("../src/services/todaySummary.js");
  const { addMed } = await import("../src/services/medications.js");
  const { saveEvent } = await import("../src/services/calendarEvents.js");
  const dogS = { id: "sum", name: "콩", breed: "말티즈", birthDate: "2022-01-01", gender: "male" };
  const late = new Date(`${day(0)}T00:01:00`);
  addMed("sum", { name: "관절약", dose: "1알", times: ["23:30"], startDate: day(-3) });
  saveEvent("sum", day(3), { title: "미용", kind: "grooming" });
  saveEvent("sum", day(20), { title: "먼 일정" });
  const t = getTodaySummary(dogS, late);
  assert.ok(t.tasksTotal >= 1 && t.tasksLeft.length === t.tasksTotal, "아무것도 안 했으면 전부 남음");
  assert.deepEqual(t.nextDose, { time: "23:30", name: "관절약", dose: "1알" });
  assert.equal(t.checkDoses, 0);
  assert.deepEqual(t.nextEvent, { title: "미용", time: "", days: 3 }, "7일 안 가장 가까운 일정만");
  console.log("오늘 요약 확인 통과");
}
