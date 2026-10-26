// 병원 다녀온 날을 하루 한 묶음으로: 진료 기록 + 그날 병원 일정 + 그날 진료비(가계부).
// 병원용 기록·일정표가 같이 써서, 같은 방문이 일정·기록·지출로 세 번 나오지 않게 한다.
import { getRecords } from "./records";
import { getOccurrences } from "./calendarEvents";
import { getExpenses, resolveCategoryId, addExpense, updateExpense } from "./expenses";

const VISIT_WORDS = /병원|진료|검진|검사|접종|수술|처방|입원|재진/; // 종류가 없는 예전 일정만 제목으로 판단("약"은 약 일정과 헷갈려 뺌)
export const isVisitEvent = (e) => (e.kind ? e.kind === "vet" || e.kind === "vaccine" : VISIT_WORDS.test(e.title || ""));
const MEDICAL = new Set(["medical", "prevent"]); // 가계부 병원·치료, 예방(접종·구충)
export const isVisitRecord = (r) => r.type === "vet" || (r.type === "life" && ["예방접종", "질환·수술"].includes(r.data?.kind));

// 반환: { [date]: { records: [기록], events: [일정 회차], expenses: [지출], cost } } (from~to)
export function visitsByDate(dogId, from, to) {
  const map = {};
  const day = (d) => (map[d] ||= { records: [], events: [], expenses: [], cost: 0 });
  for (const r of getRecords(dogId)) {
    const d = r.at.slice(0, 10);
    if (d >= from && d <= to && isVisitRecord(r)) day(d).records.push(r);
  }
  for (const o of getOccurrences(dogId, from, to)) if (o.isStart && isVisitEvent(o.event)) day(o.date).events.push(o);
  for (const e of getExpenses(dogId)) {
    if (e.date < from || e.date > to || !MEDICAL.has(resolveCategoryId(e.categoryId))) continue;
    day(e.date).expenses.push(e);
    day(e.date).cost += e.amount;
  }
  return map;
}

export const eventTitle = (e) => e.title.replace(/^\p{Extended_Pictographic}️?\s*/u, "");

// 병원 진료 기록의 진료비 → 가계부 지출(병원·치료). 이미 이어진 지출이 있으면 고치고, 없으면 새로. 반환: 이어진 지출 id
// 진료비 칸을 비워도 이미 적힌 지출은 지우지 않는다(돈 쓴 기록은 가계부에서 직접 지우게)
export function linkVetExpense(dogId, rec) {
  const amount = Number(rec.data?.cost) || 0;
  const linked = rec.expenseId && getExpenses(dogId).find((e) => e.id === rec.expenseId);
  if (!amount) return linked ? rec.expenseId : undefined;
  const d = rec.data;
  const fields = { title: [d.hospital, d.reason].filter(Boolean).join(" ") || "병원 진료", amount, date: rec.at.slice(0, 10), recordId: rec.id };
  if (linked) {
    updateExpense(dogId, linked.id, fields);
    return linked.id;
  }
  return addExpense(dogId, { ...fields, categoryId: "medical", items: ["진찰"] }).at(-1).id;
}
