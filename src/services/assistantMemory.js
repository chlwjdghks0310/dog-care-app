// 여름이가 오래 기억하는 기록(11/26 사용자: "모든 기록이 기억되는 게 중요"). 비서에게 질문할 때만 같이 보낸다.
// 앱 기록 요약(appSnapshot.js)은 최근 30일·25건까지라, 한 달 전 진료나 두 달 전 증상을 비서가 몰랐다. 여기서 넓힌다:
//   · 최근 90일 기록은 전부(건강 수치는 요약에 있어 뺀다)   · 진료·증상·약·접종/질환 기록은 1년   · 체중은 전체 흐름   · 하루 체크의 다른 날은 90일
// 비용: 글자만 조금 더 읽는다(Haiku 5.5 기준 1만 토큰 ≈ ₩1.5). 서버가 16,000자에서 자른다 — 최근 것이 앞에 오게 쌓는다.
import { getRecords, summarize, TYPES } from "./records";
import { getWeightRecords } from "./weightLog";
import { ITEMS, periodSummary } from "./dailyCheck";
import { readJSON } from "./storage";
import { addDays, toDateKey, todayKey } from "../utils/date";

const LONG_TYPES = ["vet", "symptom", "med", "life"]; // 1년까지 기억할 종류(진료·증상·약·접종/질환)
const back = (today, n) => toDateKey(addDays(new Date(`${today}T00:00:00`), -n));
const cut = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
// 한 줄 요약(summarize)은 목록용이라 진료 기록의 검사·처방·수의사 설명과 AI 참고 설명을 뺀다 — 비서의 기억에는 그게 가장 중요해서 여기서 붙인다
function line(r) {
  const d = r.data || {};
  const extra = [
    r.type === "vet" && d.tests && `검사 ${cut(d.tests, 160)}`, r.type === "vet" && d.prescription && `처방 ${cut(d.prescription, 160)}`, r.type === "vet" && d.explanation && `수의사 설명 ${cut(d.explanation, 300)}`,
    d.aiNote && `AI 참고 설명(진단 아님) ${cut(d.aiNote, 220)}`,
  ].filter(Boolean);
  return `- ${r.at.slice(0, 16).replace("T", " ")} ${(TYPES[r.type] || TYPES.daily).label}: ${[summarize(r), ...extra].filter(Boolean).join(" · ")}`;
}

export function buildMemory(dog, today = todayKey()) {
  const d90 = back(today, 90), d365 = back(today, 365);
  const recs = getRecords(dog.id).filter((r) => r.at && r.at.slice(0, 10) <= today).sort((a, b) => b.at.localeCompare(a.at));
  const out = [];
  const vets = recs.filter((r) => r.type === "vet" && r.at.slice(0, 10) >= d365).slice(0, 12);
  if (vets.length) out.push("[진료 기록 — 최근 1년, 병원에서 들은 내용을 보호자가 적은 것]", ...vets.map(line));
  const recent = recs.filter((r) => r.at.slice(0, 10) >= d90 && r.type !== "vital" && r.type !== "vet").slice(0, 150);
  if (recent.length) out.push("", "[기록 — 최근 90일]", ...recent.map(line));
  const older = recs.filter((r) => r.at.slice(0, 10) < d90 && r.at.slice(0, 10) >= d365 && LONG_TYPES.includes(r.type) && r.type !== "vet").slice(0, 60);
  if (older.length) out.push("", "[그 전 기록 — 90일~1년 전, 증상·약·접종/질환만]", ...older.map(line));
  // 하루 체크: 90일 요약 한 줄 + 다른 날 목록
  const days = Object.entries(readJSON("dogcare-daily-check-v1", {})[dog.id] || {}).filter(([d, v]) => d >= d90 && d <= today && v.status === "diff").sort((a, b) => b[0].localeCompare(a[0])).slice(0, 40);
  const sum = periodSummary(dog.id, d90, today);
  if (sum) out.push("", `[하루 체크 — 최근 90일] ${sum}`, ...days.map(([d, v]) => `- ${d} ${Object.entries(v.picks || {}).map(([id, l]) => `${ITEMS.find((i) => i.id === id)?.label || id} ${l}`).join(", ")}`));
  // 체중: 많으면 달마다 하나 + 최근 6개
  const ws = getWeightRecords(dog.id).map((w) => ({ d: w.measuredAt.slice(0, 10), kg: w.weightKg })).sort((a, b) => a.d.localeCompare(b.d));
  if (ws.length > 1) {
    const byMonth = new Map();
    for (const w of ws) byMonth.set(w.d.slice(0, 7), w); // 달의 마지막 값
    const keep = new Map([ws[0], ...byMonth.values(), ...ws.slice(-6)].map((w) => [w.d, w])); // 날짜로 묶어 같은 날이 두 번 나오지 않게
    const list = [...keep.values()].sort((a, b) => a.d.localeCompare(b.d));
    out.push("", `[체중 흐름 — 처음부터] ${list.map((w) => `${w.d} ${Math.round(Number(w.kg) * 100) / 100}kg`).join(", ")}`);
  }
  return out.join("\n").trim();
}
