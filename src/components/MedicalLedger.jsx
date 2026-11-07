import { useMemo } from "react";
import Ico from "./Ico";
import { getExpenses, isMedical } from "../services/expenses";
import { todayKey } from "../utils/date";

// 병원 탭에서 한눈에: 올해·이번 달 병원비(병원·치료 + 예방), 보험 청구 대기·받은 보험금, 최근 병원비 3건. 누르면 가계부 전체.
// 사용자 요청(11/7) "가계부를 따로 들어가기보단 한눈에" + 자료용 ④(펫수첩: 받은 보험금·실제로 낸 돈·청구 예정 n건)
const won = (n) => `${Number(n || 0).toLocaleString("ko-KR")}원`;

export default function MedicalLedger({ dog, onOpenBudget }) {
  const today = todayKey();
  const { month, year, paid, waiting, recent } = useMemo(() => {
    const list = getExpenses(dog.id).filter((e) => isMedical(e.categoryId));
    const sum = (l) => l.reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const y = list.filter((e) => e.date.startsWith(today.slice(0, 4)));
    return {
      month: sum(list.filter((e) => e.date.startsWith(today.slice(0, 7)))),
      year: sum(y),
      paid: y.reduce((a, e) => a + (e.claim === "paid" ? Number(e.claimPaid) || 0 : 0), 0),
      waiting: list.filter((e) => e.claim === "todo" || e.claim === "sent").length,
      recent: [...list].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
    };
  }, [dog.id, today]);

  return (
    <button type="button" className="card ml-card" onClick={onOpenBudget} aria-label="병원비 — 눌러서 가계부 전체 보기">
      <div className="ml-head">
        <span className="h2" style={{ margin: 0 }}><Ico name="wallet" size={18} /> 병원비</span>
        <span className="ml-more">가계부 전체 ›</span>
      </div>
      <div className="ml-nums">
        <span><b>{won(month)}</b><small>이번 달</small></span>
        <span><b>{won(year)}</b><small>올해</small></span>
        <span><b>{waiting}건</b><small>보험 청구 대기</small></span>
      </div>
      {paid > 0 && <div className="faint" style={{ fontSize: 13, marginTop: 6 }}>올해 받은 보험금 {won(paid)} · 실제로 낸 돈 {won(year - paid)}</div>}
      {recent.length > 0 ? (
        <div className="ml-list">
          {recent.map((e) => (
            <div key={e.id} className="ml-row">
              <span className="faint">{Number(e.date.slice(5, 7))}/{Number(e.date.slice(8))}</span>
              <span style={{ flex: 1, minWidth: 0 }}>{e.title}</span>
              {e.claim && e.claim !== "paid" && <span className="ml-claim">{e.claim === "todo" ? "청구 전" : "청구함"}</span>}
              <b>{won(e.amount)}</b>
            </div>
          ))}
        </div>
      ) : (
        <p className="subtle" style={{ margin: "8px 0 0" }}>아직 병원비 기록이 없어요. 진료 정리로 영수증을 찍으면 여기에 모여요.</p>
      )}
    </button>
  );
}
