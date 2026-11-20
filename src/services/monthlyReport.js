import { getRecords } from "./records";
import { getWeightRecords } from "./weightLog";
import { getDay } from "./dailyCheck";
import { visitsByDate } from "./vetVisits";
import { todayKey } from "../utils/date";

// 한 달 리포트(멍케어 플러스) — 11/20 2차(사용자 "한 달에만 보이는 것부터"): ① 지난달과 달라진 것 세 줄(규칙, AI 아님) ② 겹쳐 보기(증상 난 날 앞뒤)
// ③ 달력 ④ 체중 흐름(30일 평균·추세) ⑤ 자랑 카드 ⑥ 숫자 칸. 판단·점수 없이 "a → b"와 "n번 중 m번 겹침"까지만 말한다.
const pad = (n) => String(n).padStart(2, "0");
export const monthOf = (day) => day.slice(0, 7);
export const addMonths = (month, n) => { const [y, m] = month.split("-").map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
export const monthLabel = (month) => `${Number(month.slice(5, 7))}월`;
const lastDayOf = (month) => { const [y, m] = month.split("-").map(Number); return new Date(y, m, 0).getDate(); };
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const dow = (d) => DOW[new Date(`${d}T00:00:00`).getDay()];
const shift = (d, n) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };

const WALK = (r) => (r.type === "vital" && r.data?.metric === "walk") || (r.type === "daily" && r.data?.kind === "산책");
const LOOSE = (r) => r.type === "potty" && r.data?.stool && !["정상", "안 봄"].includes(r.data.stool);
const TREAT = (r) => r.type === "daily" && r.data?.kind === "간식";

// 가장 많이 몰린 요일 1~2개("화·토")
export function topWeekdays(dates, max = 2) {
  const c = {};
  for (const d of dates) { const w = dow(d); c[w] = (c[w] || 0) + 1; }
  return Object.entries(c).sort((a, b) => b[1] - a[1] || DOW.indexOf(a[0]) - DOW.indexOf(b[0])).slice(0, max).filter(([, n]) => n >= 2).map(([w]) => w);
}

function count(dogId, month, today) {
  const from = `${month}-01`;
  const end = `${month}-${pad(lastDayOf(month))}`;
  const to = end < today ? end : today; // 이번 달이면 오늘까지
  const recs = getRecords(dogId).filter((r) => r.at && r.at.slice(0, 10) >= from && r.at.slice(0, 10) <= to);
  const dayOf = (r) => r.at.slice(0, 10);
  const uniq = (xs) => [...new Set(xs)].sort();
  const walkRecs = recs.filter(WALK);
  const walkDates = uniq(walkRecs.map(dayOf));
  const walkMinutes = walkRecs.reduce((s, r) => s + (Number(r.type === "vital" ? r.data.value : r.data.minutes) || 0), 0);
  const meals = recs.filter((r) => r.type === "meal" && r.data?.appetite);
  const meal = { usual: meals.filter((r) => r.data.appetite === "평소").length, less: meals.filter((r) => r.data.appetite === "평소보다 적음").length, more: meals.filter((r) => r.data.appetite === "평소보다 많음").length };
  const lessDates = uniq(meals.filter((r) => r.data.appetite === "평소보다 적음").map(dayOf));
  const treatDates = uniq(recs.filter(TREAT).map(dayOf));
  const looseDays = uniq(recs.filter(LOOSE).map(dayOf));
  const symptoms = recs.filter((r) => r.type === "symptom").map((r) => ({ date: dayOf(r), kinds: r.data?.kinds || [] }));
  const kindCount = {};
  for (const s of symptoms) for (const k of s.kinds) kindCount[k] = (kindCount[k] || 0) + 1;
  const topKinds = Object.entries(kindCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const visits = visitsByDate(dogId, from, to);
  const vetDays = Object.keys(visits).filter((d) => visits[d].records.length || visits[d].events.length).sort();
  const cost = Object.values(visits).reduce((s, v) => s + v.cost, 0);
  const ws = getWeightRecords(dogId).filter((w) => w.measuredAt.slice(0, 10) >= from && w.measuredAt.slice(0, 10) <= to).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const weights = ws.map((w) => ({ date: w.measuredAt.slice(0, 10), kg: w.weightKg }));
  const elapsed = Number(to.slice(8, 10));
  const checkDays = [];
  for (let i = 1; i <= elapsed; i++) { const d = `${month}-${pad(i)}`; const v = getDay(dogId, d); if (v && v.status !== "unknown") checkDays.push(d); }
  // 7일 연속 몇 번(그 달 안에서)
  let run = 0, streaks = 0;
  for (let i = 1; i <= elapsed; i++) { if (checkDays.includes(`${month}-${pad(i)}`)) { run += 1; if (run % 7 === 0) streaks += 1; } else run = 0; }
  return { from, to, days: lastDayOf(month), elapsed, records: recs.length + ws.length, walk: { dates: walkDates, days: walkDates.length, minutes: walkMinutes }, meal, lessDates, treatDates, looseDays, symptoms, topKinds, vetDays, cost, weights, checkDays, streaks };
}

const dir = (n) => (n > 0 ? "늘었어요" : "줄었어요");
const wd = (dates) => { const w = topWeekdays(dates); return w.length ? `${w.join("·")}요일에 몰려요` : ""; };

// 지난달과 달라진 것 — 후보를 다 만들고 변화가 큰 순서로 셋만(같은 종류는 한 번)
export function diffsOf(cur, prev, { prevHas }) {
  const out = [];
  const rel = (a, b) => Math.abs(b - a) / Math.max(a, b, 1) + Math.min(Math.abs(b - a), 10) / 20; // 비율 + 절대 폭(최대 +0.5)
  if (prevHas && Math.abs(cur.walk.days - prev.walk.days) >= 3) out.push({ key: "walk", ico: "walk", title: `산책이 ${dir(cur.walk.days - prev.walk.days)}`, sub: [wd(cur.walk.dates), cur.walk.minutes ? `모두 ${cur.walk.minutes}분` : ""].filter(Boolean).join(" · "), a: prev.walk.days, b: cur.walk.days, unit: "일", score: rel(prev.walk.days, cur.walk.days) + 0.2 });
  else if (!prevHas && cur.walk.days >= 8) out.push({ key: "walk", ico: "walk", title: `산책 ${cur.walk.days}일`, sub: [wd(cur.walk.dates), `모두 ${cur.walk.minutes}분`].filter(Boolean).join(" · "), a: 0, b: cur.walk.days, unit: "일", score: 0.5 });
  if (prevHas && cur.looseDays.length !== prev.looseDays.length) out.push({ key: "loose", ico: "toilet", title: `무른 변이 ${dir(cur.looseDays.length - prev.looseDays.length)}`, sub: wd(cur.looseDays) || (cur.looseDays.length ? cur.looseDays.map((d) => `${Number(d.slice(8))}일`).join("·") : "이번 달엔 없었어요"), a: prev.looseDays.length, b: cur.looseDays.length, unit: "일", score: rel(prev.looseDays.length, cur.looseDays.length) + 0.4 });
  else if (!prevHas && cur.looseDays.length >= 2) out.push({ key: "loose", ico: "toilet", title: `무른 변 ${cur.looseDays.length}일`, sub: wd(cur.looseDays), a: 0, b: cur.looseDays.length, unit: "일", score: 0.6 });
  if (prevHas && cur.symptoms.length !== prev.symptoms.length) out.push({ key: "symptom", ico: "bandaid", title: `증상 기록이 ${dir(cur.symptoms.length - prev.symptoms.length)}`, sub: cur.topKinds.length ? cur.topKinds.map(([k, n]) => `${k} ${n}`).join(" · ") : "이번 달엔 없었어요", a: prev.symptoms.length, b: cur.symptoms.length, unit: "번", score: rel(prev.symptoms.length, cur.symptoms.length) + 0.4 });
  else if (!prevHas && cur.symptoms.length >= 2) out.push({ key: "symptom", ico: "bandaid", title: `증상 기록 ${cur.symptoms.length}번`, sub: cur.topKinds.map(([k, n]) => `${k} ${n}`).join(" · "), a: 0, b: cur.symptoms.length, unit: "번", score: 0.6 });
  if (cur.lessDates.length >= 3) out.push({ key: "less", ico: "bowl", title: `밥을 적게 먹은 날 ${cur.lessDates.length}일`, sub: wd(cur.lessDates) || `지난달 ${prev.lessDates.length}일`, a: prev.lessDates.length, b: cur.lessDates.length, unit: "일", score: (prevHas ? rel(prev.lessDates.length, cur.lessDates.length) : 0.3) + 0.3 });
  if (prevHas && Math.abs(cur.checkDays.length - prev.checkDays.length) >= 3) out.push({ key: "check", ico: "checklist", title: `하루 체크 ${cur.checkDays.length}일`, sub: cur.streaks ? `7일 연속 ${cur.streaks}번 · 배지 ${cur.streaks}개` : `${cur.elapsed}일 중`, a: prev.checkDays.length, b: cur.checkDays.length, unit: "일", score: rel(prev.checkDays.length, cur.checkDays.length) + 0.1 });
  else if (!prevHas && cur.checkDays.length >= 7) out.push({ key: "check", ico: "checklist", title: `하루 체크 ${cur.checkDays.length}일`, sub: cur.streaks ? `7일 연속 ${cur.streaks}번 · 배지 ${cur.streaks}개` : `${cur.elapsed}일 중`, a: 0, b: cur.checkDays.length, unit: "일", score: 0.4 });
  if (prevHas && (cur.vetDays.length !== prev.vetDays.length || cur.cost !== prev.cost)) out.push({ key: "vet", ico: "stethoscope", title: `병원 ${cur.vetDays.length}번`, sub: cur.cost || prev.cost ? `병원비 ${cur.cost.toLocaleString()}원 · 지난달보다 ${cur.cost - prev.cost >= 0 ? "+" : "−"}${Math.abs(cur.cost - prev.cost).toLocaleString()}원` : `지난달 ${prev.vetDays.length}번`, a: prev.vetDays.length, b: cur.vetDays.length, unit: "번", score: rel(prev.vetDays.length, cur.vetDays.length) + 0.1 });
  else if (!prevHas && cur.vetDays.length >= 1) out.push({ key: "vet", ico: "stethoscope", title: `병원 ${cur.vetDays.length}번`, sub: cur.cost ? `병원비 ${cur.cost.toLocaleString()}원` : "", a: 0, b: cur.vetDays.length, unit: "번", score: 0.3 });
  const lastKg = cur.weights.at(-1)?.kg, prevKg = prev.weights.at(-1)?.kg;
  if (lastKg != null && prevKg != null && prevKg > 0 && Math.abs(lastKg - prevKg) / prevKg >= 0.03) {
    const pct = Math.round(((lastKg - prevKg) / prevKg) * 100);
    out.push({ key: "weight", ico: "scales", title: `체중이 ${prevKg} → ${lastKg}kg`, sub: `${pct > 0 ? "+" : ""}${pct}% · 기록 ${cur.weights.length}번`, a: prevKg, b: lastKg, unit: "kg", score: Math.abs(pct) / 100 + 0.4 });
  }
  out.sort((x, y) => y.score - x.score);
  return out.slice(0, 3);
}

// 겹쳐 보기: 증상·무른 변 난 날의 전날·당일·다음날에 밥 적게/산책 없음/간식이 있었나
export function overlapsOf(cur) {
  const marks = [...new Set([...cur.symptoms.map((s) => s.date), ...cur.looseDays])].sort();
  const walkSet = new Set(cur.walk.dates), lessSet = new Set(cur.lessDates), treatSet = new Set(cur.treatDates);
  const kindOf = (d) => { const s = cur.symptoms.find((x) => x.date === d); return s ? (s.kinds[0] || "증상") : "무른 변"; };
  const hasWalkHabit = cur.walk.days >= 8;
  const cell = (d) => ({ date: d, less: lessSet.has(d), noWalk: hasWalkHabit && !walkSet.has(d), treat: treatSet.has(d) });
  const rows = marks.map((d) => ({ date: d, kind: kindOf(d), cells: [cell(shift(d, -1)), { ...cell(d), mark: true }, cell(shift(d, 1))] }));
  // 가장 자주 겹친 것 하나만 문장으로
  const tally = { less: 0, noWalk: 0, treat: 0 };
  for (const r of rows) for (const k of Object.keys(tally)) if (r.cells[0][k] || r.cells[1][k]) tally[k] += 1;
  const [bestKey, best] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0] || [];
  const label = { less: "밥을 적게 먹은 날", noWalk: "산책을 안 한 날", treat: "간식을 준 날" }[bestKey];
  const n = rows.length;
  let line = "";
  if (!n) line = "이 달엔 증상이나 무른 변 기록이 없었어요.";
  else if (!best) line = `${n}번 모두 전날·당일 밥·산책·간식은 평소와 같았어요.`;
  else line = `${n}번 중 ${best}번, 전날이나 당일이 ${label}이었어요.${n <= 2 || best <= 2 ? " 두 번 안쪽이라 우연일 수 있어요 — 한 번 더 겹치면 기록을 들고 병원에 물어보세요." : " 자주 겹치니 기록을 들고 병원에 물어보세요."}`;
  return { rows, line, n, best: best || 0, bestKey: best ? bestKey : null };
}

// 체중 흐름: 그 달 점들 + 30일 평균 + 추세(최소제곱 기울기, 한 달 환산)
export function weightTrend(cur, prevLast) {
  const pts = cur.weights;
  if (!pts.length) return { last: null, prevLast, diff: null, pct: null, avg: null, slope: null, dirLabel: "" };
  const last = pts.at(-1).kg;
  const avg = Math.round((pts.reduce((s, p) => s + p.kg, 0) / pts.length) * 100) / 100;
  const diff = prevLast != null ? Math.round((last - prevLast) * 100) / 100 : null;
  const pct = prevLast ? Math.round(((last - prevLast) / prevLast) * 100) : null;
  let slope = null, dirLabel = "";
  if (pts.length >= 2) {
    const xs = pts.map((p) => Number(p.date.slice(8))), ys = pts.map((p) => p.kg);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    slope = den ? xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den : 0; // kg/일
    const monthPct = (slope * 30) / my;
    dirLabel = monthPct > 0.015 ? "천천히 오르는 중" : monthPct < -0.015 ? "천천히 내려가는 중" : "그대로예요";
  } else dirLabel = "기록 1번";
  return { last, prevLast, diff, pct, avg: Math.round(avg * 100) / 100, slope, dirLabel };
}

export function buildMonthlyReport(dog, month = monthOf(todayKey()), today = todayKey()) {
  const cur = count(dog.id, month, today);
  const prevMonth = addMonths(month, -1);
  const prev = count(dog.id, prevMonth, today);
  const prevHas = prev.records > 0;
  const symptomDates = new Set(cur.symptoms.map((s) => s.date));
  const cells = Array.from({ length: cur.days }, (_, i) => {
    const d = `${month}-${pad(i + 1)}`;
    return { date: d, day: i + 1, future: d > today, walk: cur.walk.dates.includes(d), mark: symptomDates.has(d) || cur.looseDays.includes(d), vet: cur.vetDays.includes(d), checked: cur.checkDays.includes(d) };
  });
  const firstDow = (new Date(`${month}-01T00:00:00`).getDay() + 6) % 7; // 월요일 시작
  const diffs = diffsOf(cur, prev, { prevHas });
  const overlaps = overlapsOf(cur);
  const weight = weightTrend(cur, prev.weights.at(-1)?.kg ?? null);
  return {
    month, prevMonth, ...cur, cells, firstDow, isCurrent: month === monthOf(today), prevHasRecords: prevHas, prevCheck: prev.checkDays.length,
    diffs, overlaps, weight,
    quiet: prevHas && diffs.length === 0, // 달라진 게 없음
    compare: { walkDays: cur.walk.days - prev.walk.days, walkMinutes: cur.walk.minutes - prev.walk.minutes, symptoms: cur.symptoms.length - prev.symptoms.length, looseDays: cur.looseDays.length - prev.looseDays.length, cost: cur.cost - prev.cost, vetDays: cur.vetDays.length - prev.vetDays.length },
  };
}

// 플러스 비서에게 줄 한 달 요약(세 줄·겹침·체중) — 답은 화면에 한 문단으로
export function monthDigest(dog, r) {
  const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
  return [
    `${dog.name} ${monthLabel(r.month)} 리포트(${r.from}~${r.to}, 기록 ${r.records}개)를 한 문단(3~4문장)으로 읽어 줘: 잘한 것 / 지켜볼 것 / 다음 달 할 일. 진단 단정·약 용량 없이.`,
    `달라진 것: ${r.diffs.length ? r.diffs.map((d) => `${d.title}(${d.a}${d.unit} → ${d.b}${d.unit}${d.sub ? `, ${d.sub}` : ""})`).join(" / ") : "지난달과 비슷함"}`,
    `겹쳐 보기: ${r.overlaps.line}`,
    `하루 체크 ${r.checkDays.length}/${r.elapsed}일 · 산책 ${r.walk.days}일 ${r.walk.minutes}분(지난달 대비 ${sign(r.compare.walkDays)}일) · 밥 평소 ${r.meal.usual}·적게 ${r.meal.less}·많이 ${r.meal.more} · 증상 ${r.symptoms.length}번 · 무른 변 ${r.looseDays.length}일 · 병원 ${r.vetDays.length}번 ${r.cost.toLocaleString()}원`,
    r.weight.last != null ? `체중 ${r.weight.last}kg${r.weight.diff != null ? `(지난달 대비 ${sign(r.weight.diff)}, ${sign(r.weight.pct)}%)` : ""} · 30일 평균 ${r.weight.avg} · ${r.weight.dirLabel}` : "체중 기록 없음",
  ].join("\n");
}
