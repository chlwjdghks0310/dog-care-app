// 진료 정리 결과(서버 vet_doc) → 진료 기록 새로 쓰기 칸(RecordForm prefill). 보호자가 확인·고친 뒤 기존 저장 길로 간다
// (진료비 → 가계부 병원·치료, 다음 진료일 → 일정·알림). 약은 처방 칸에 적힌 그대로 — 약 관리 등록은 보호자가 직접.
import { VET_ITEMS } from "./expenses";
import { toDateKey } from "../utils/date";
const won = (n) => `${Number(n).toLocaleString("ko-KR")}원`;
const okDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");

export function docToPrefill(doc, now = new Date(), { claim = false } = {}) {
  const today = toDateKey(now); // 한국 날짜(toISOString은 오전 9시 전엔 어제)
  let visit = okDate(doc.visit_date) ? doc.visit_date : "";
  // 연도 없는 영수증을 1~2월에 읽으면 11~12월 진료가 올해로 잡혀 미래가 된다 → 작년으로
  if (visit > today && visit.slice(0, 4) === today.slice(0, 4) && Number(today.slice(5, 7)) <= 2 && Number(visit.slice(5, 7)) >= 11) visit = `${Number(visit.slice(0, 4)) - 1}${visit.slice(4)}`;
  const date = visit && visit <= today ? visit : today;
  const items = (doc.items || []).filter((i) => i.name && i.amount > 0);
  const sum = items.reduce((a, i) => a + i.amount, 0);
  const total = doc.total > 0 ? doc.total : sum;
  return {
    at: `${date}T${date === today ? now.toTimeString().slice(0, 5) : "12:00"}`,
    data: {
      ...(doc.hospital && { hospital: doc.hospital }),
      reason: doc.reason || "진료",
      ...((doc.explanation || doc.cautions) && { explanation: [doc.explanation, doc.cautions && `주의사항: ${doc.cautions}`].filter(Boolean).join("\n") }),
      ...(doc.tests && { tests: doc.tests }),
      ...(doc.prescription && { prescription: doc.prescription }),
      ...(total > 0 && { cost: String(total) }),
      ...(total > 0 && claim && { claimTodo: true }), // 가계부에 "보험 청구 전"으로
      ...(items.length && { costItems: [...new Set(items.map((i) => i.kind).filter((k) => VET_ITEMS.includes(k)))] }), // 가계부 병원비 항목
      ...(okDate(doc.next_date) && doc.next_date > today && { nextDate: doc.next_date, nextAlarm: true }),
    },
    memo: items.length ? `진료비 항목: ${items.map((i) => `${i.name} ${won(i.amount)}`).join(" · ")}${doc.total > 0 && sum && sum !== doc.total ? ` (항목 합 ${won(sum)}, 영수증 합계 ${won(doc.total)})` : ""}` : "",
  };
}

// 이미 정리한 영수증 같은지: 같은 날짜 진료 기록이 있고 병원 이름이나 금액이 같으면
export function findSameVisit(records, doc) {
  const total = doc.total > 0 ? doc.total : (doc.items || []).reduce((a, i) => a + (i.amount || 0), 0);
  return records.find((r) => r.type === "vet" && r.at.slice(0, 10) === doc.visit_date && ((doc.hospital && r.data.hospital === doc.hospital) || (total && Number(r.data.cost) === total))) || null;
}

// 약봉투·처방전 → 약 일정 초안(보호자가 확인·고친 뒤에만 저장). 용량은 적힌 그대로, 시각은 하루 횟수로 기본값만 채운다
export const TIMES_BY_COUNT = { 1: ["08:00"], 2: ["08:00", "20:00"], 3: ["08:00", "14:00", "20:00"], 4: ["08:00", "12:00", "16:00", "20:00"] };
export function medDrafts(doc, startDate) {
  return (doc.meds || []).filter((m) => m.name).map((m) => {
    const days = m.days > 0 ? Math.min(m.days, 90) : 0;
    const end = days ? toDateKey(new Date(new Date(`${startDate}T00:00:00`).getTime() + (days - 1) * 86400000)) : "";
    return { name: m.name, dose: m.dose || "", times: TIMES_BY_COUNT[m.per_day] || TIMES_BY_COUNT[1], perDay: m.per_day || 0, courseDays: days, startDate, endDate: end, purpose: [doc.reason, m.note].filter(Boolean).join(" · "), remind: true, use: Boolean(m.dose) };
  });
}
