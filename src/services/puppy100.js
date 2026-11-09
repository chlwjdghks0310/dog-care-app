// 퍼피 첫 100일 진행 상태. 과제 내용은 src/data/puppy100.js.
// 규칙(../자료용/자료/2026-11-09-퍼피훈련앱-매일과제-분석.md):
// - 오늘 과제 = 아직 안 끝난 첫 단계. 놓친 날은 멈춘 자리에서 이어 간다(벌점·연속 기록 끊김 없음).
// - 🐾 했어요 → 내일 다음 과제 / 🔁 한 번 더 → 내일 같은 과제 / 이미 잘해요 → 바로 다음 과제(오늘 몫은 그대로)
// - 7일째 주간 체크 3문항: 2개 이상이면 통과, 아니면 "이번 주 한 번 더" 또는 "그래도 다음 주로"
// 저장: { [dogId]: { [stepId]: { s: "done"|"skip"|"pass", d, n? }, today: { d, id, s }, hidden?: true } } — 가족과 같이 보게 서버에도 올린다(sync SYNCED_KEYS)
import { readJSON, writeJSON } from "./storage";
import { STEPS } from "../data/puppy100";
import { calculateAge } from "../utils/age";
import { todayKey } from "../utils/date";

const KEY = "dogcare-puppy100-v1";
const FINISHED = new Set(["done", "skip", "pass"]);

const all = () => readJSON(KEY, {});
export const getProgress = (dogId) => all()[dogId] || {};
function save(dogId, next) {
  writeJSON(KEY, { ...all(), [dogId]: next });
}

// 보여 줄 강아지: 숨기지 않았고, 이미 시작했거나 1살 아래(생일을 모르면 보여 준다)
export function eligible(dog, today = todayKey()) {
  const p = getProgress(dog.id);
  if (p.hidden) return false;
  if (STEPS.some((s) => p[s.id])) return true;
  return !dog.birthDate || calculateAge(dog.birthDate, new Date(`${today}T00:00:00`)).ageInMonths < 12;
}

export function state(dogId, today = todayKey()) {
  const p = getProgress(dogId);
  const index = STEPS.findIndex((s) => !FINISHED.has(p[s.id]?.s));
  const step = index < 0 ? null : STEPS[index];
  const weekSteps = step ? STEPS.filter((s) => s.week === step.week && s.kind === "task") : [];
  const dates = [...STEPS.map((s) => p[s.id]?.d), p.today?.d].filter(Boolean).sort();
  const last = dates.at(-1);
  return {
    step,
    index,
    total: STEPS.length,
    finished: index < 0,
    weekPaws: weekSteps.map((s) => FINISHED.has(p[s.id]?.s)),
    doneToday: p.today?.d === today, // 오늘 몫을 했음(🐾·🔁·주간 체크) → 카드를 접는다
    againToday: p.today?.d === today && p.today.s === "again",
    started: Boolean(last),
    idleDays: last ? Math.round((new Date(`${today}T00:00:00`) - new Date(`${last}T00:00:00`)) / 86400000) : null,
  };
}

// s: "done"(🐾 했어요) | "again"(🔁 한 번 더 — 상태는 그대로, 내일 같은 과제) | "skip"(이미 잘해요 — 오늘 몫은 쓰지 않음)
export function mark(dogId, stepId, s, today = todayKey()) {
  const p = { ...getProgress(dogId) };
  if (s === "done" || s === "skip") p[stepId] = { s, d: today };
  if (s !== "skip") p.today = { d: today, id: stepId, s };
  save(dogId, p);
}

// 주간 체크: n = "됐어요" 개수. 기준(3문항 중 2개, 졸업은 10문항 중 8개) 이상이면 통과
export const passLine = (step) => (step.graduation ? 8 : 2);
export function finishTest(dogId, stepId, n, today = todayKey()) {
  const p = { ...getProgress(dogId), [stepId]: { s: "pass", d: today, n } };
  p.today = { d: today, id: stepId, s: "test" };
  save(dogId, p);
}
// 이번 주 한 번 더: 그 주 과제 기록을 지우고 첫 과제부터(오늘 몫은 한 것으로)
export function retryWeek(dogId, week, today = todayKey()) {
  const p = { ...getProgress(dogId) };
  for (const s of STEPS) if (s.week === week) delete p[s.id];
  p.today = { d: today, id: `w${week}-test`, s: "retry" };
  save(dogId, p);
}

// 그날 찍은 발도장(기록 탭 달력에 보이게 — 보강 조사 11/9: 과제와 기록이 한곳에 있는 게 계속 쓰는 이유)
export function stampsOn(dogId, date) {
  const p = getProgress(dogId);
  return STEPS.filter((s) => p[s.id]?.d === date && FINISHED.has(p[s.id].s) && p[s.id].s !== "skip").map((s) => (s.kind === "test" ? `${s.week}주차 체크 통과` : s.t));
}

export function setHidden(dogId, hidden) {
  const { hidden: _, ...rest } = getProgress(dogId);
  save(dogId, hidden ? { ...rest, hidden: true } : rest);
}

// 저녁 하루 체크 알림에 붙일 한 줄(알림 수는 늘리지 않음). 오늘 몫을 했거나 다 끝났으면 null
export function alarmLine(dogs, today = todayKey()) {
  for (const dog of dogs) {
    if (!eligible(dog, today)) continue;
    const st = state(dog.id, today);
    if (st.finished || st.doneToday) continue;
    if (st.idleDays >= 3) return "바쁜 날도 있죠. 오늘은 과제 하나만 짧게 해 봐요 🐾";
    return st.step.kind === "test" ? `${st.step.week}주차 체크 3문항이 기다려요 🐾` : `오늘의 5분: ${st.step.t} 🐾`;
  }
  return null;
}
