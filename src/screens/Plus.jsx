import { useEffect, useState } from "react";
import Ico from "../components/Ico";
import { fetchStatus, redeem } from "../services/character";

// 멍케어 플러스(11/17, 사용자 결정): 설정에 따로 있는 칸. 지금은 결제 없이 플러스 코드(베타 테스터)로만 열린다.
// 플러스 = 플러스 비서(자세한 답·하루 50번) + 우리 아이 캐릭터 만들기. 무료는 멍케어 비서(두 칸 답·하루 5번)·기록·수첩·가이드 전부.
export default function Plus({ dog, onOpenCharacter }) {
  const [st, setSt] = useState(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => fetchStatus(dog.id).then(setSt).catch((e) => (setErr(e.message), setSt({ offline: true })));
  useEffect(() => { load(); }, [dog.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const useCode = async () => {
    if (!code.trim() || busy) return;
    setBusy(true); setErr("");
    try { await redeem(dog.id, code.trim()); await load(); setCode(""); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  const plus = Boolean(st?.plus);
  return (
    <div style={{ display: "grid", gap: 14, padding: "4px 0 24px" }}>
      <div className="card" style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Ico name="sparkles" size={22} style={{ color: "var(--accent-strong)" }} />
          <b style={{ fontSize: 17 }}>{plus ? `${dog.name}는 멍케어 플러스예요` : "멍케어 플러스"}</b>
          {plus && <span className="chip">베타</span>}
        </div>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
          기록·병원 수첩·월령별 가이드·가족 공유는 언제나 무료예요. 플러스는 그 위에 "우리 아이를 더 깊이 아는" 두 가지를 더해요.
        </p>
      </div>
      {/* 베타 동안 플러스로 막는 건 플러스 비서 하나뿐(사용자 11/17). 나머지는 "들어갈 예정"으로만 적고 지금은 모두 열어 둔다 */}
      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="sg-title" style={{ margin: 0 }}>지금 플러스에만</div>
        <Row ico="chatHeart" title="플러스 비서" sub="질문하면 기록(체중·접종·약·하루 체크)을 근거로 결론·집에서 확인할 것·생각해 볼 이유·병원 신호까지 자세히 답해요. 하루 50번." free="무료 비서: 두 줄 답(지금 할 일 / 병원에 물어볼 것), 하루 5번" on={plus} />
        <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>두 비서 모두 진단을 단정하거나 약 용량을 말하지 않아요. 응급 신호면 병원 안내가 먼저예요. 평균적인 답을 보고 싶을 땐 답 아래 ChatGPT 버튼을 그대로 쓸 수 있어요.</p>
      </div>
      <div className="card" style={{ display: "grid", gap: 12 }}>
        <div className="sg-title" style={{ margin: 0 }}>들어갈 예정 (베타 동안은 모두 열려 있어요)</div>
        <Row ico="sparkles" title="우리 아이 캐릭터" sub="기본(기다리기·고민하기 2편)과 정성(부가 동작 3편 더: 기쁨·졸림·밥·산책)은 단품으로 따로. 플러스 연간에는 기본 1번이 들어가고, 정성 올리기와 다른 그림체 추가는 플러스 할인 예정." free="지금: 곧 출시 · 초대 코드를 쓴 분은 정성까지 무료" action={onOpenCharacter} actionLabel="캐릭터 화면으로" />
        <Row ico="clipboard" title="진료 정리·사진 확인 넉넉히" sub="영수증·처방전 사진을 읽어 진료 기록으로 정리하고, 변·피부 사진을 확인하는 횟수를 늘려요." free="지금: 하루 3번, 모두 무료" />
        <Row ico="chart" title="주간 리포트 해설" sub="이번 주 기록을 비서가 읽고 '잘한 것·지켜볼 것·다음 주 할 일' 세 줄로 적어 줘요." free="지금: 리포트는 무료, 해설은 준비 중" />
      </div>
      {!plus && (
        <div className="card" style={{ display: "grid", gap: 8 }}>
          <b>플러스 코드가 있어요</b>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="char-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="예: MC-PLUS-XXXX" autoCapitalize="characters" autoCorrect="off" spellCheck={false} style={{ flex: 1 }} />
            <button type="button" className="btn-primary" style={{ flex: "0 0 auto", width: "auto", padding: "0 18px" }} onClick={useCode} disabled={busy || !st || st.offline}>쓰기</button>
          </div>
          {err && <p className="error-text" style={{ margin: 0 }}>{err}</p>}
          <span className="muted" style={{ fontSize: 13 }}>베타 기간엔 코드로만 열려요(결제 없음). 정식 가격은 <b>월 3,900원 · 연 29,000원</b>(연간엔 기본 캐릭터 1번 포함) 예정이에요.</span>
        </div>
      )}
    </div>
  );
}

function Row({ ico, title, sub, free, on, action, actionLabel }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <Ico name={ico} size={20} style={{ color: "var(--accent-strong)", marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{title} {on && <Ico name="check" size={16} style={{ color: "var(--accent-strong)", verticalAlign: "-3px" }} />}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{sub}</div>
        <div className="muted" style={{ fontSize: 12.5 }}>{free}</div>
        {on && action && <button type="button" className="link-btn" onClick={action}>{actionLabel}</button>}
      </div>
    </div>
  );
}
