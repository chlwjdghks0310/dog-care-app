// 진료 정리 결과(서버 vet_doc) → 진료 기록 새로 쓰기 칸(RecordForm prefill). 보호자가 확인·고친 뒤 기존 저장 길로 간다
// (진료비 → 가계부 병원·치료, 다음 진료일 → 일정·알림). 약은 처방 칸에 적힌 그대로 — 약 관리 등록은 보호자가 직접.
import { VET_ITEMS } from "./expenses";
const won = (n) => `${Number(n).toLocaleString("ko-KR")}원`;
const okDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");

export function docToPrefill(doc, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const date = okDate(doc.visit_date) && doc.visit_date <= today ? doc.visit_date : today;
  const items = (doc.items || []).filter((i) => i.name && i.amount > 0);
  const sum = items.reduce((a, i) => a + i.amount, 0);
  const total = doc.total > 0 ? doc.total : sum;
  return {
    at: `${date}T${date === today ? now.toTimeString().slice(0, 5) : "12:00"}`,
    data: {
      ...(doc.hospital && { hospital: doc.hospital }),
      reason: doc.reason || "진료",
      ...(doc.explanation && { explanation: doc.explanation }),
      ...(doc.tests && { tests: doc.tests }),
      ...(doc.prescription && { prescription: doc.prescription }),
      ...(total > 0 && { cost: String(total) }),
      ...(items.length && { costItems: [...new Set(items.map((i) => i.kind).filter((k) => VET_ITEMS.includes(k)))] }), // 가계부 병원비 항목
      ...(okDate(doc.next_date) && doc.next_date > today && { nextDate: doc.next_date, nextAlarm: true }),
    },
    memo: items.length ? `진료비 항목: ${items.map((i) => `${i.name} ${won(i.amount)}`).join(" · ")}${doc.total > 0 && sum && sum !== doc.total ? ` (항목 합 ${won(sum)}, 영수증 합계 ${won(doc.total)})` : ""}` : "",
  };
}
