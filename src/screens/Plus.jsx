import { useEffect, useState } from "react";
import Ico from "../components/Ico";
import { fetchStatus } from "../services/character";
import Checkout from "./Checkout";
import PlusManage from "./PlusManage";
import { recordBetaPlus, getBilling, PLUS_MONTH, PLUS_YEAR, won, BILLING_OPEN, PAY_OPENS } from "../services/billing";
import OpenNotify from "../components/OpenNotify";
import { webOnly } from "../services/native";
import { isPlus } from "../services/plus";

// 멍케어 플러스(11/17, 사용자 결정): 설정에 따로 있는 칸. 11/25: 코드 입력을 없애고, 결제가 열릴 때까지는 가격 안내 + [열리면 알려 주세요]만.
// 11/18 다시 짬(사용자: 폰에서 잘림·AI티·아이콘 겹침): 스티커 아이콘을 기능마다 다르게(플러스=트로피 win, 비서=chatHeart, 캐릭터=video, 진료 정리=clipboard, 리포트=chart, 코드=lock),
// 세로 한 줄 구성, 무료/플러스 차이는 작은 표로.
export default function Plus({ dog, onOpenCharacter, onOpenMonth }) {
  const [st, setSt] = useState(() => (isPlus(dog.id) ? { offline: true, cached: true, plus: true } : null)); // 서버에 묻는 동안 마지막으로 알던 플러스 상태부터
  const [, setErr] = useState("");
  const [checkout, setCheckout] = useState(false);
  const load = () => fetchStatus(dog.id).then(setSt).catch((e) => (setErr(e.message), setSt({ offline: true })));
  useEffect(() => { load(); }, [dog.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const plus = st?.offline ? isPlus(dog.id) : Boolean(st?.plus); // 서버에 못 닿으면 마지막으로 알던 상태로(오류처럼 보이지 않게)
  useEffect(() => { if (plus && !getBilling(dog.id).plan) recordBetaPlus(dog.id, ""); }, [plus, dog.id]); // 예전에 코드를 쓴 강아지도 장부에
  return (
    <div className="px">
      <header className="px-hero">
        <Ico name="star" size={48} />
        <div>
          <div className="h1" style={{ margin: 0 }}>멍케어 플러스</div>
          <p className="px-lead">{plus ? `${dog.name}는 플러스예요. 고마워요!` : "기록·수첩·가이드·가족 공유는 언제나 무료. 플러스는 세 가지를 더해요 — 플러스 비서, 한 달 리포트, 우리 아이 캐릭터."}</p>
        </div>
      </header>
      {plus ? <PlusManage dog={dog} /> : (
        <div className="px-price">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}><span className="px-dim">가격</span><span className="chip">{PAY_OPENS}에 열려요</span></div>
          <div style={{ width: "100%" }}><b>월 {won(PLUS_MONTH)}</b> <span className="px-dim">또는</span> <b>연 {won(PLUS_YEAR)}</b> <span className="px-dim">(연간엔 기본 캐릭터 1번 포함)</span></div>
          {BILLING_OPEN && <button type="button" className="btn-primary" style={{ width: "100%", marginTop: 4 }} onClick={() => setCheckout(true)}>플러스 시작하기</button>}
        </div>
      )}
      {checkout && <Checkout dog={dog} intent="plus" plus={plus} onClose={() => setCheckout(false)} onChanged={load} onOpenCharacter={() => (setCheckout(false), onOpenCharacter?.())} />}

      <section className="px-card">
        <div className="px-sec">지금 플러스에만</div>
        <Feature ico="chatHeart" title="플러스 비서" on={plus}
          desc="질문하면 체중·접종·약·하루 체크 기록을 근거로 답해요. 빠른 답 아래 [자세히 듣기]를 누르면 결론·확인할 것·이유·병원 신호까지." />
        <table className="px-table"><tbody>
          <tr><th></th><th>무료 비서</th><th>플러스 비서</th></tr>
          <tr><td>답</td><td>두 줄<br /><span className="px-dim">지금 할 일 · 병원에 물어볼 것</span></td><td>두 줄 + [자세히 듣기]<br /><span className="px-dim">결론 · 확인할 것 · 이유 · 병원 신호</span></td></tr>
          <tr><td>하루</td><td>5번</td><td>빠른 답 50번<br /><span className="px-dim">자세히 20번</span></td></tr>
          <tr><td>기록 반영</td><td>✓</td><td>✓</td></tr>
        </tbody></table>
        <p className="px-note">둘 다 진단을 단정하거나 약 용량을 말하지 않아요. 응급 신호면 병원 안내가 먼저.{webOnly(" 평균적인 답이 궁금하면 답 아래 ChatGPT 버튼을 그대로 쓸 수 있어요.")}</p>
        <Feature ico="calendar" title="한 달 리포트" on={plus} tag="지금은 모두 열림" onClick={onOpenMonth}
          desc="지난달과 달라진 점 세 줄, 증상 난 날 앞뒤 겹쳐 보기, 달력 한 장, 체중 흐름, 이 달 자랑 카드. 플러스 비서가 그 달을 한 문단으로 읽어 줘요. 이번 주 리포트는 계속 무료." />
      </section>

      <section className="px-card">
        <div className="px-sec">플러스와 함께</div>
        <Feature ico="video" title="우리 아이 캐릭터" tag={`${PAY_OPENS}에 열려요`} onClick={onOpenCharacter}
          desc="사진으로 만드는 움직이는 우리 아이. 기본(기다리기·고민하기) 4,900원 · 정성(부가 동작 3편) 9,900원. 연간 플러스엔 기본 1번 포함, 정성 올리기·그림체 추가는 플러스 할인." />
        <p className="px-note">그 밖의 것 — 하루 체크, 기록, 병원용 기록, 이상 신호, 알림, 이번 주 리포트, 월령별 가이드, 가족 공유, 여러 마리 — 는 계속 무료예요.</p>
      </section>

      {!plus && !BILLING_OPEN && <OpenNotify dog={dog} waiting={st?.waiting} offline={!st || st.offline} onChange={(w) => setSt((s) => ({ ...s, waiting: w }))} />}
    </div>
  );
}

function Feature({ ico, title, desc, tag, on, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={`px-feat${onClick ? " tap" : ""}`} onClick={onClick}>
      <Ico name={ico} size={38} />
      <div className="px-feat-body">
        <div className="px-feat-title">{title} {on && <Ico name="check" size={16} style={{ color: "var(--accent-strong)", verticalAlign: "-3px" }} />} {tag && <span className="px-tag">{tag}</span>}</div>
        <div className="px-feat-desc">{desc}</div>
      </div>
      {onClick && <span className="chev" aria-hidden="true">›</span>}
    </Tag>
  );
}
