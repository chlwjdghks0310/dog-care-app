import { useEffect, useState } from "react";
import Ico from "../components/Ico";
import { getBilling, refundOnCancel, won, POLICY, CATALOG } from "../services/billing";
import { getCharacter } from "../services/character";

// ⑤ 설정 › 플러스 관리(11/20): 해지는 가입과 같은 깊이, [해지하기][계속 쓰기] 같은 크기·같은 색(법 21조의2①3·4호), 환불액을 미리 계산해 보여 준다.
// 베타(코드) 플러스는 결제가 없어 해지할 게 없다 — 그 사실을 그대로 보여 준다. 정식 결제가 열리면 plan.source가 "card"가 되고 같은 화면이 그대로 쓰인다.
export default function PlusManage({ dog }) {
  const [b, setB] = useState(() => getBilling(dog.id));
  const [ask, setAsk] = useState(false);
  useEffect(() => { const on = () => setB(getBilling(dog.id)); window.addEventListener("dogcare-billing-changed", on); return () => window.removeEventListener("dogcare-billing-changed", on); }, [dog.id]);
  const plan = b.plan;
  if (!plan) return null;
  const beta = plan.source === "beta";
  const made = Boolean(getCharacter(dog.id)?.outputs);
  const rf = !beta ? refundOnCancel({ planId: plan.id, startedAt: plan.startedAt, characterMade: made }) : null;
  const d = (iso) => (iso ? String(iso).slice(0, 10) : "—");
  return (
    <>
      <section className="px-card">
        <div className="px-sec">{beta ? "베타 플러스 · 쓰는 중" : `${CATALOG[plan.id]?.title || "플러스"} · 쓰는 중`}</div>
        <div className="co-row"><span>시작</span><span>{d(plan.startedAt)}</span></div>
        <div className="co-row"><span>다음 결제</span><span>{beta ? "없음 (정식 출시 때 미리 알려요)" : `${d(plan.nextAt)} · ${won(CATALOG[plan.id]?.price || 0)}`}</span></div>
        {!beta && <div className="co-row"><span>결제 수단</span><span>카드 끝자리 {plan.last4 || "—"}</span></div>}
        <div className="co-row last"><span>결제 내역</span><span>{b.orders.length}건 · 아래</span></div>
      </section>

      <section className="px-card">
        <div className="px-feat-title">해지하면</div>
        {beta ? (
          <p className="px-feat-desc">베타 플러스는 결제가 없어서 해지할 것도, 돌려드릴 것도 없어요. 정식 출시 뒤에는 여기서 바로 해지할 수 있고, {CATALOG.plus_year.title}은 {POLICY.yearCancel}</p>
        ) : (
          <p className="px-feat-desc">{rf.refund > 0 ? <>지금 해지하면 <b>{won(rf.refund)}</b>을 {POLICY.refundDays}영업일 안에 결제한 카드로 돌려드려요.<br /></> : <>지금 해지하면 <b>{rf.usableUntil}</b> 전날까지 쓰고, 그 뒤로는 결제되지 않아요.<br /></>}<span className="px-dim">{rf.lines.join(" · ")}</span></p>
        )}
        {!ask ? (
          <div className="co-two"><button type="button" className="btn-ghost same" onClick={() => setAsk(true)}>해지하기</button><button type="button" className="btn-ghost same" onClick={() => setAsk(false)}>계속 쓰기</button></div>
        ) : (
          <div className="co-beta" style={{ marginTop: 8 }}><Ico name="alert" size={22} /><span>{beta ? "베타 플러스는 해지할 결제가 없어요. 코드를 돌려놓고 싶으면 설정 › 의견 보내기로 알려 주세요." : "해지는 정식 결제가 열리면 여기서 바로 돼요."}</span></div>
        )}
        <p className="px-note" style={{ marginTop: 8 }}>앱이 안 열리면 meongcare.app@gmail.com으로 "플러스 해지"라고 보내 주세요. 받는 대로 답장해요.</p>
      </section>

      {b.orders.length > 0 && (
        <section className="px-card">
          <div className="px-sec">결제 내역 <span className="px-dim">· 기록은 {POLICY.keepRecordsYears}년 보관</span></div>
          {b.orders.map((o) => (
            <div className="co-row" key={o.id}><span>{d(o.at)} · {o.items.map((i) => i.title).join(", ")}</span><span>{o.total ? won(o.total) : "0원"}</span></div>
          ))}
        </section>
      )}
    </>
  );
}
