import { readJSON, writeJSON } from "./storage";
import { calculateAge, formatAge } from "../utils/age";
import { addDays, toDateKey, todayKey } from "../utils/date";
import { getWeightRecords } from "./weightLog";
import { getMeds, getDosesForDate, isEnded, getStockInfo } from "./medications";
import { getOccurrences } from "./calendarEvents";
import { visitsByDate, isVisitEvent, eventTitle } from "./vetVisits";
import { getChatMemory } from "./chatMemory";
import { getRecords, filterTimeline, LEVELS, md as mdKey, getVitalEntries, vitalDaily } from "./records";
import { VITALS, fmtValue, outOfRange } from "../data/vitals";

// 병원용 기록 — 앱에 쌓인 기록 + 보호자가 이번 진료를 위해 적은 메모를 수의사가 한눈에 읽게 정리한다.
// 기록에 있는 사실만 옮기고, 추정·진단 문구는 넣지 않는다(빈 곳은 "기록 없음").
const KEY = "dogcare-vet-note-v1";

export const SYMPTOMS = ["식욕 줄었음", "물 많이 마심", "구토", "설사", "변비", "기침", "숨이 가쁨", "기운 없음", "절뚝거림", "가려움·긁음", "대소변 실수", "체중 변화"];
export const SECTIONS = [
  { key: "note", label: "보호자 메모" },
  { key: "basic", label: "기본 정보" },
  { key: "symptoms", label: "증상 기록" },
  { key: "observe", label: "식사·배변·컨디션" },
  { key: "meds", label: "먹는 약" },
  { key: "weight", label: "체중" },
  { key: "vitals", label: "건강 수치" },
  { key: "visits", label: "최근 병원 기록" },
  { key: "memos", label: "보호자 기록 메모" },
  { key: "chat", label: "최근 상담 질문" },
];
export const PERIODS = [7, 30, 90];

const DEFAULT_NOTE = { symptoms: [], since: "", text: "", questions: "", period: 30, sections: { note: true, basic: true, symptoms: true, observe: true, meds: true, weight: true, vitals: true, visits: true, memos: true, chat: false } };

export function getVetNote(dogId) {
  const saved = readJSON(KEY, {})[dogId] || {};
  return { ...DEFAULT_NOTE, ...saved, sections: { ...DEFAULT_NOTE.sections, ...saved.sections } };
}

export function saveVetNote(dogId, note) {
  const all = readJSON(KEY, {});
  all[dogId] = { ...note, updatedAt: new Date().toISOString() };
  writeJSON(KEY, all);
}

const GENDER = { female: "암컷", male: "수컷" };
const md = (dateKey) => `${Number(dateKey.slice(5, 7))}/${Number(dateKey.slice(8, 10))}`;

// 반환: [{ key, title, lines: [string] }] — 화면·공유·읽어주기가 같은 내용을 쓴다
export function buildVetSummary(dog, note, today = todayKey()) {
  const from = toDateKey(addDays(new Date(`${today}T00:00:00`), -note.period));
  const sections = [];
  const add = (key, title, lines) => note.sections[key] && sections.push({ key, title, lines: lines.length ? lines : ["기록 없음"] });

  const noteLines = [];
  if (note.symptoms.length) noteLines.push(`지금 보이는 증상: ${note.symptoms.join(", ")}`);
  if (note.since) noteLines.push(`시작: ${md(note.since)}부터 (${Math.max(0, Math.round((new Date(today) - new Date(note.since)) / 86400000))}일째)`);
  if (note.text.trim()) noteLines.push(`상태 설명: ${note.text.trim()}`);
  if (note.questions.trim()) noteLines.push(`여쭤보고 싶은 것: ${note.questions.trim()}`);
  add("note", "보호자 메모", noteLines);

  const age = dog.birthDate ? formatAge(calculateAge(dog.birthDate, new Date(today))) : "";
  add("basic", "기본 정보", [
    `${dog.name} · ${dog.breed} · ${GENDER[dog.gender] || "성별 미입력"}${dog.neutered ? "(중성화)" : ""} · ${age}${dog.birthDate ? ` (${dog.birthDate} 생)` : ""}`,
    ...(dog.food ? [`사료: ${dog.food}`] : []),
    `알레르기: ${dog.allergies || "기록 없음"}`,
    ...(dog.illnesses ? [`과거 질환·수술: ${dog.illnesses}`] : []),
    ...(dog.vaccines ? [`예방접종·건강 정보: ${dog.vaccines}`] : []),
    ...(dog.hospital ? [`다니는 병원: ${dog.hospital}`] : []),
    ...(dog.notes ? [`특이사항: ${dog.notes}`] : []),
  ]);

  // 보호자가 남긴 기록(통합 기록) — 기간 안 것만, 적힌 그대로
  const recs = filterTimeline(getRecords(dog.id), { days: note.period, order: "old" }, today);
  add(
    "symptoms",
    `증상 기록 (최근 ${note.period}일)`,
    recs.filter((r) => r.type === "symptom").map((r) => `${mdKey(r.at.slice(0, 10))} ${r.at.slice(11, 16)} ${r.data.kinds.join(", ")}${r.data.repeat ? ` (${r.data.repeat})` : ""}${r.data.since ? ` · ${mdKey(r.data.since)}부터` : ""}${r.data.observed ? ` — ${r.data.observed}` : ""}${r.memo ? ` · 메모: ${r.memo}` : ""}`)
  );
  const observeLines = [];
  for (const [type, field, label, options] of [["meal", "appetite", "식욕", LEVELS], ["meal", "water", "물", LEVELS], ["potty", "stool", "대변"], ["potty", "urine", "소변"], ["condition", "activity", "활동량", LEVELS], ["condition", "sleep", "수면", LEVELS]]) {
    const vals = recs.filter((r) => r.type === type && r.data[field]);
    if (!vals.length) continue;
    const counts = {};
    for (const r of vals) (counts[r.data[field]] ||= []).push(mdKey(r.at.slice(0, 10)));
    const keys = options ? options.filter((o) => counts[o]) : Object.keys(counts);
    observeLines.push(`${label}: ${keys.map((k) => `${k} ${counts[k].length}번${k !== "평소" && k !== "정상" ? `(${counts[k].slice(-4).join(", ")})` : ""}`).join(", ")}`);
  }
  for (const r of recs.filter((r) => r.type === "potty" && r.data.photoNote)) observeLines.push(`  ${mdKey(r.at.slice(0, 10))} 변 사진(참고): ${r.data.photoNote}${r.data.photoFlags?.length ? ` / ⚠ ${r.data.photoFlags.join(", ")}` : ""}`);
  for (const r of recs.filter((r) => r.type === "condition" && (r.data.body || r.data.oral))) observeLines.push(`  ${mdKey(r.at.slice(0, 10))} ${[r.data.body, r.data.oral].filter(Boolean).join(" / ")}`);
  add("observe", `식사·배변·컨디션 (보호자 관찰, 최근 ${note.period}일)`, observeLines);

  // 약: 지금 먹는 약 + 기간 안에 끝난 약, 기간 동안 기록한 대로의 복용 현황
  const medLines = [];
  const meds = getMeds(dog.id).filter((m) => !isEnded(m, today) || m.endDate >= from);
  const bySeries = new Map();
  for (const m of meds) bySeries.set(m.seriesId, [...(bySeries.get(m.seriesId) || []), m]);
  const tally = {};
  for (let d = from; d <= today; d = toDateKey(addDays(new Date(`${d}T00:00:00`), 1))) {
    for (const dose of getDosesForDate(dog.id, d)) {
      if (d === today && dose.status === "planned") continue; // 아직 시간이 안 된 오늘 약은 빼고 센다
      const t = (tally[dose.med.seriesId] ||= { done: 0, total: 0, skipped: 0, missing: [] });
      t.total += 1;
      if (dose.status === "done") t.done += 1;
      if (dose.status === "skipped") t.skipped += 1;
      if (dose.status === "check") t.missing.push(`${md(d)} ${dose.time}`);
    }
  }
  for (const [seriesId, versions] of bySeries) {
    const cur = versions.sort((a, b) => a.startDate.localeCompare(b.startDate)).at(-1);
    const ended = isEnded(cur, today);
    const days = cur.days?.length ? `${cur.days.map((d) => "일월화수목금토"[d]).join("")}요일` : "매일";
    medLines.push(`${ended ? "[끝난 약] " : ""}${cur.name} 1회 ${cur.dose}, ${days} ${cur.times.join("·")} (하루 ${cur.times.length}번)`);
    medLines.push(`  ${md(versions[0].startDate)}부터${cur.endDate ? ` ${md(cur.endDate)}까지` : ""}${cur.purpose ? ` · ${cur.purpose}` : ""}`);
    for (const v of versions.slice(0, -1)) medLines.push(`  처방 변경 전: ${md(v.startDate)}~${md(v.endDate)} 1회 ${v.dose}, ${v.times.join("·")}`);
    const t = tally[seriesId];
    if (t?.total) {
      medLines.push(`  최근 ${note.period}일 복용 기록: ${t.total}번 중 ${t.done}번 먹임${t.skipped ? `, ${t.skipped}번 건너뜀` : ""}${t.missing.length ? `, ${t.missing.length}번 기록 없음` : ""}`);
      if (t.missing.length) medLines.push(`  기록 없는 때: ${t.missing.slice(-5).join(", ")}${t.missing.length > 5 ? " 등" : ""}`);
    }
    const stock = !ended && getStockInfo(dog.id, cur);
    if (stock) medLines.push(`  남은 약: ${stock.remaining}개 (기록 기준)`);
  }
  add("meds", "먹는 약", medLines);

  // 체중: 최근 값, 기간 처음 대비 변화, 기간 안 기록
  const weights = getWeightRecords(dog.id);
  const inPeriod = weights.filter((r) => r.measuredAt.slice(0, 10) >= from);
  const weightLines = [];
  const latest = weights.at(-1);
  if (latest) {
    weightLines.push(`최근: ${latest.weightKg}kg (${md(latest.measuredAt.slice(0, 10))})`);
    const base = [...weights].reverse().find((r) => r.measuredAt.slice(0, 10) <= from) || inPeriod[0];
    if (base && base !== latest) {
      const diff = latest.weightKg - base.weightKg;
      weightLines.push(`변화: ${md(base.measuredAt.slice(0, 10))} ${base.weightKg}kg → ${latest.weightKg}kg (${diff >= 0 ? "+" : ""}${Math.round(diff * 100) / 100}kg, ${diff >= 0 ? "+" : ""}${Math.round((diff / base.weightKg) * 1000) / 10}%)`);
    }
    if (inPeriod.length > 1) weightLines.push(`최근 ${note.period}일 기록: ${inPeriod.slice(-8).map((r) => `${md(r.measuredAt.slice(0, 10))} ${r.weightKg}`).join(", ")}`);
  } else if (dog.weight) {
    weightLines.push(`프로필 체중: ${dog.weight}kg (측정 기록 없음)`);
  }
  add("weight", "체중", weightLines);

  // 건강 수치(보호자가 잰 값) — 잴 때마다 보는 건 범위·참고 범위 밖 횟수, 하루 합계로 보는 건 기록한 날 평균
  const vitalLines = [];
  for (const v of VITALS.filter((x) => !x.external)) {
    const entries = getVitalEntries(dog.id, v.id).filter((e) => e.at.slice(0, 10) >= from && e.at.slice(0, 10) <= today);
    if (!entries.length) continue;
    const last = entries.at(-1);
    if (v.kind === "point") {
      const vals = entries.map((e) => e.value);
      const out = entries.filter((e) => outOfRange(v.id, e.value)).length;
      vitalLines.push(`${v.label}: 최근 ${fmtValue(v.id, last.value)}${v.unit}(${mdKey(last.at.slice(0, 10))})${entries.length > 1 ? `, ${entries.length}번 잼 ${fmtValue(v.id, Math.min(...vals))}~${fmtValue(v.id, Math.max(...vals))}` : ""}${out ? `, 참고 범위(${v.range.join("~")}) 밖 ${out}번` : ""}`);
    } else {
      const daily = vitalDaily(entries, "sum");
      const avg = daily.reduce((t, d) => t + d.value, 0) / daily.length;
      vitalLines.push(`${v.label}: 기록한 ${daily.length}일 하루 평균 ${fmtValue(v.id, avg)}${v.unit}, 최근 ${mdKey(daily.at(-1).date)} ${fmtValue(v.id, daily.at(-1).value)}${v.unit}`);
    }
  }
  add("vitals", `건강 수치 (보호자 측정, 최근 ${note.period}일)`, vitalLines);

  // 최근 병원 기록(90일): 하루 한 묶음 — 진료 기록이 있으면 그것만(내용까지), 없으면 그날 병원 일정·지출 제목. 진료비는 그날 병원·예방 지출 합계
  const visitFrom = toDateKey(addDays(new Date(`${today}T00:00:00`), -90));
  const byDay = visitsByDate(dog.id, visitFrom, today);
  const visitLines = [];
  for (const date of Object.keys(byDay).sort().reverse().slice(0, 8)) {
    const { records, events, expenses, cost } = byDay[date];
    const costText = cost ? ` (진료비 ${cost.toLocaleString("ko-KR")}원)` : "";
    if (records.length) {
      records.forEach((r, k) => {
        const d = r.data;
        const text = r.type === "vet" ? [d.hospital, d.reason].filter(Boolean).join(" · ") : `${d.kind}${d.title ? ` ${d.title}` : ""}`;
        visitLines.push(`${md(date)} ${text}${k === 0 ? costText : ""}`);
        if (r.type === "vet") for (const x of [d.explanation && `설명: ${d.explanation}`, d.tests && `검사: ${d.tests}`, d.prescription && `처방: ${d.prescription}`, d.nextDate && `다음 진료: ${mdKey(d.nextDate)}`].filter(Boolean)) visitLines.push(`  ${x}`);
      });
    } else {
      const titles = [...new Set([...events.map((o) => eventTitle(o.event)), ...expenses.map((e) => e.title)])];
      visitLines.push(`${md(date)} ${titles.join(", ")}${costText}`);
    }
  }
  // 앞으로 잡힌 병원 예약(180일 안, 최대 2개)
  const ahead = getOccurrences(dog.id, toDateKey(addDays(new Date(`${today}T00:00:00`), 1)), toDateKey(addDays(new Date(`${today}T00:00:00`), 180)))
    .filter((o) => o.isStart && isVisitEvent(o.event))
    .slice(0, 2);
  if (ahead.length) visitLines.push(`다음 예약: ${ahead.map((o) => `${md(o.date)} ${eventTitle(o.event)}`).join(", ")}`);
  add("visits", "최근 병원 기록 (90일)", visitLines);

  // 그 밖의 기록에 남긴 메모(최근 6개)
  add(
    "memos",
    `보호자 기록 메모 (최근 ${note.period}일)`,
    recs.filter((r) => r.memo && r.type !== "vet" && r.type !== "symptom").slice(-6).map((r) => `${mdKey(r.at.slice(0, 10))} ${r.memo}`)
  );

  // 최근 AI 상담에서 보호자가 직접 한 말(원문 그대로, 최근 5개)
  const asked = getChatMemory(dog.id).filter((m) => m.role === "user").slice(-5).map((m) => `"${m.text.slice(0, 80)}${m.text.length > 80 ? "…" : ""}"`);
  add("chat", "최근 상담 질문 (보호자 원문)", asked);

  return sections;
}

export function summaryToText(dog, sections, today = todayKey()) {
  return [`[${dog.name} 병원용 기록] ${today}`, ...sections.flatMap((s) => ["", `■ ${s.title}`, ...s.lines])].join("\n");
}
