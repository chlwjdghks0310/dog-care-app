// 이상 신호(규칙 기반, 판단 없이): 기록된 사실 + 병원 상담 기준만 말한다. 진단·점수 판정 없음.
// 근거: ../자료용/자료/2026-11-07-2단계-병원루프-조사.md ③
//  - 무른 변 3일(VCA·PetMD: 24시간 넘는 설사는 탈수 위험, 다른 증상 없으면 하루이틀 지켜봄) · 물 같은 설사는 2일
//  - 식사 2일 연속 적음("2일 안에 나아지지 않으면 진료") · 초소형 퍼피(만 4개월 미만)는 1일부터
//  - 몸무게: 한 달 전보다 성견 5% 줄면 "일찍 알림", 10%는 "병원 권장"(임상 기준은 보통 10%) · 퍼피(1살 미만)는 줄면 바로
//  - 약: 어제·오늘 기록 없는 복용이 2번 이상 → "두 번 한꺼번에 주지 말고 병원에 물어보세요"(VCA·FDA 공통 원칙)
// 하루 체크로 고른 밥·변도 같은 날짜로 센다(기록과 합쳐서 중복 없이).
import { getRecords } from "./records";
import { getWeightRecords } from "./weightLog";
import { getDosesForDate } from "./medications";
import { getDay } from "./dailyCheck";
import { calculateAge } from "../utils/age";
import { josa } from "../utils/text";
import { addDays, toDateKey, todayKey } from "../utils/date";

const back = (day, n) => toDateKey(addDays(new Date(`${day}T00:00:00`), -n));
const soft = (d) => ["무름", "설사"].includes(d?.stool) || Number(d?.stoolScore) >= 5;
const watery = (d) => d?.stool === "설사" || Number(d?.stoolScore) >= 7;

// 오늘(또는 어제)까지 며칠 이어졌나 — 오늘 아직 기록이 없으면 어제까지로 센다
function streak(daysSet, today) {
  let d = daysSet.has(today) ? today : back(today, 1);
  let n = 0;
  while (daysSet.has(d)) (n++, (d = back(d, 1)));
  return n;
}

export function getSignals(dog, today = todayKey(), now = new Date()) {
  const recs = getRecords(dog.id);
  const from = back(today, 14);
  const softDays = new Set(), wateryDays = new Set(), lessMealDays = new Set();
  for (const r of recs) {
    const day = r.at.slice(0, 10);
    if (day < from || day > today) continue;
    if (r.type === "potty" && soft(r.data)) softDays.add(day);
    if (r.type === "potty" && watery(r.data)) wateryDays.add(day);
    if (r.type === "meal" && r.data?.appetite === "평소보다 적음") lessMealDays.add(day);
  }
  for (let i = 0; i <= 14; i++) {
    const day = back(today, i);
    const p = getDay(dog.id, day)?.picks || {};
    if (["무름", "설사"].includes(p.stool)) softDays.add(day);
    if (p.stool === "설사") wateryDays.add(day);
    if (["조금 남김", "반 이상 남김", "안 먹음"].includes(p.meal)) lessMealDays.add(day);
  }
  const age = dog.birthDate ? calculateAge(dog.birthDate, new Date(`${today}T00:00:00`)) : null;
  const months = age ? age.ageInWeeks / 4.345 : 99;
  const out = [];

  const w = streak(wateryDays, today);
  const s = streak(softDays, today);
  if (w >= 2) out.push({ id: "stool", level: "vet", text: `물 같은 설사가 ${w}일째예요. 동물병원에 물어보세요.` });
  else if (s >= 3) out.push({ id: "stool", level: "vet", text: `변이 평소보다 무른 날이 ${s}일째예요. 병원에 보여 줄 기록에 모여 있어요.` });

  const m = streak(lessMealDays, today);
  if (m >= 2 || (months < 4 && m >= 1)) out.push({ id: "meal", level: "vet", text: months < 4 && m < 2 ? "밥을 평소보다 적게 먹었어요. 아주 어린 강아지는 한 끼만 걸러도 병원에 물어보세요." : `밥을 평소보다 적게 먹은 날이 ${m}일째예요. 나아지지 않으면 병원에 물어보세요.` });

  // 7일 중 3일 이상 같은 항목이 평소와 달랐으면(이어지지 않아도) — 제안 분석 11/7
  const LABEL = { meal: "밥", stool: "변", vomit: "토·기침", urine: "소변", energy: "기운", water: "물" };
  for (const id of Object.keys(LABEL)) {
    if (out.some((x) => x.id === id)) continue;
    let n = 0;
    for (let i = 0; i < 7; i++) if (getDay(dog.id, back(today, i))?.picks?.[id]) n++;
    if (n >= 3) out.push({ id, level: "watch", text: `최근 7일 중 ${n}일 ${josa(LABEL[id], "이", "가")} 평소와 달랐어요. 병원에 보여 줄 기록에 모여 있어요.` });
  }

  // 몸무게: 가장 최근 값 vs 25~40일 전 값
  const ws = getWeightRecords(dog.id).map((x) => ({ day: x.measuredAt.slice(0, 10), kg: Number(x.weightKg) })).filter((x) => x.kg > 0 && x.day <= today).sort((a, b) => a.day.localeCompare(b.day));
  const last = ws.at(-1);
  if (last && last.day >= back(today, 14)) {
    const base = [...ws].reverse().find((x) => x.day <= back(last.day, 25) && x.day >= back(last.day, 40));
    if (base && last.kg < base.kg) {
      const pct = ((base.kg - last.kg) / base.kg) * 100;
      const line = `한 달 전보다 몸무게가 ${Math.round(pct * 10) / 10}% 줄었어요(${base.kg}→${last.kg}kg).`;
      if (months < 12 && pct >= 1) out.push({ id: "weight", level: "vet", text: `${line} 자라는 시기엔 늘어야 해서 병원에 물어보세요.` });
      else if (pct >= 10) out.push({ id: "weight", level: "vet", text: `${line} 병원에 물어보세요.` });
      else if (pct >= 5) out.push({ id: "weight", level: "watch", text: `${line} 다음 주에 한 번 더 재 보세요.` });
    }
  }

  // 약: 어제·오늘 지난 시각인데 기록이 없는 복용
  const missed = [back(today, 1), today].flatMap((d) => getDosesForDate(dog.id, d, now)).filter((x) => x.status === "check");
  if (missed.length >= 2) out.push({ id: "med", level: "vet", text: `약 기록이 ${missed.length}번 비어 있어요. 두 번 한꺼번에 주지 말고, 어떻게 할지 병원에 물어보세요.` });
  else if (missed.length === 1) out.push({ id: "med", level: "watch", text: "약 기록이 1번 비어 있어요. 먹였으면 [먹였어요]를 눌러 주세요. 놓쳤다면 두 번 한꺼번에 주지 마세요." });
  return out;
}
