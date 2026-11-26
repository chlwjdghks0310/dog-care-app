import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Ico from "../components/Ico";
import { useSwipeClose } from "../components/SwipeBack";
import { CATALOG, POLICY, BILLING_OPEN, PAY_OPENS, STAMP_DISCOUNT, quote, won, startCheckout } from "../services/billing";
import { STYLE_LABEL } from "../services/character";
import { rewardsOf } from "../services/stamps";

// 결제 흐름(11/20, 시안 3 https://claude.ai/artifact/9z2DZhuWuWmcpZkRkC92Bb): ① 플러스 고르기 / ② 캐릭터 단품 → ③ 결제 확인 → ④ 완료.
// 법(전자상거래법 21조의2·13조·17조) 때문에 지키는 것: 월·연 카드 같은 크기 · 총금액이 먼저 · 추가 옵션과 동의는 비어 있는 체크 ·
// 금액 한글 병기 · 돌아가기와 결제 버튼 같은 급 · 미성년자 고지 · 캐릭터는 "철회 불가" 표시 + 미리보기.
// 결제가 열리기 전(BILLING_OPEN=false)에는 이 화면으로 들어오는 버튼 자체가 없다(11/25: 코드 입력 삭제). 화면·견적·장부는 열릴 때 그대로 쓴다.
const SAMPLE = { "3d": "/character/sample-3d.jpg", hand: "/character/sample-hand.jpg" };

export default function Checkout({ dog, intent = "plus", plus = false, onClose, onOpenCharacter, onChanged }) {
  const swipe = useSwipeClose(onClose);
  const [step, setStep] = useState(intent === "character" ? "product" : "plan");
  const [plan, setPlan] = useState("plus_year");
  const [tier, setTier] = useState("char_basic");
  const [style, setStyle] = useState("3d");
  const [extraStyle, setExtraStyle] = useState(false); // 미리 체크하지 않는다(법 21조의2①2호)
  const [agree, setAgree] = useState(false);
  const [preview, setPreview] = useState(false);
  const [done, setDone] = useState(null); // { kind:"plus"|"character" }
  const reward = rewardsOf(dog.id);
  const stamp = tier === "char_premium" && Boolean(reward.discount);
  const items = useMemo(() => (intent === "plus" ? [plan] : [tier, ...(extraStyle ? ["char_style"] : [])]), [intent, plan, tier, extraStyle]);
  const q = useMemo(() => quote({ items, plus, stampDiscount: stamp }), [items, plus, stamp]);

  const back = () => (step === "confirm" ? setStep(intent === "plus" ? "plan" : "product") : onClose());
  const finish = (kind) => { setDone({ kind }); setStep("done"); onChanged?.(); };

  return createPortal(
    <div className="settings-sheet co" role="dialog" aria-label="결제" style={{ zIndex: 125 }} {...swipe}>
      <div className="co-top">
        <button type="button" className="icon-btn" onClick={step === "done" ? onClose : back} aria-label={step === "confirm" ? "뒤로" : "닫기"}>{step === "confirm" ? "‹" : "✕"}</button>
        <b>{step === "plan" ? "멍케어 플러스" : step === "product" ? "우리 아이 캐릭터" : step === "confirm" ? "결제 내용을 확인해 주세요" : "완료"}</b>
        <span style={{ width: 36 }} />
      </div>

      {step === "plan" && <PlanStep plan={plan} setPlan={setPlan} onNext={() => setStep("confirm")} />}
      {step === "product" && <ProductStep tier={tier} setTier={setTier} style={style} setStyle={setStyle} extraStyle={extraStyle} setExtraStyle={setExtraStyle} plus={plus} reward={reward} total={q.total} onPreview={() => setPreview(true)} onNext={() => setStep("confirm")} />}
      {step === "confirm" && <ConfirmStep dog={dog} q={q} items={items} plus={plus} stamp={stamp} intent={intent} agree={agree} setAgree={setAgree} onBack={back} onPaid={() => finish(intent)} />}
      {step === "done" && <DoneStep q={q} done={done} onClose={onClose} onOpenCharacter={onOpenCharacter} />}

      {preview && <Preview style={style} onClose={() => setPreview(false)} />}
    </div>,
    document.body
  );
}

// ① 플러스 고르기 — 두 카드 같은 크기, 연간 기본 선택, 총액 먼저
function PlanStep({ plan, setPlan, onNext }) {
  const y = CATALOG.plus_year, m = CATALOG.plus_month;
  const save = m.price * 12 - y.price;
  return (
    <div className="co-body">
      <div className="co-three">
        <div><Ico name="chatHeart" size={40} /><b>플러스 비서</b><small>자세한 답 · 하루 20번</small></div>
        <div><Ico name="calendar" size={40} /><b>한 달 리포트</b><small>달라진 점 · 겹쳐 보기</small></div>
        <div><Ico name="video" size={40} /><b>우리 아이 캐릭터</b><small>연간에 기본 1번 포함</small></div>
      </div>
      <div className="co-plans" role="radiogroup" aria-label="기간">
        <button type="button" role="radio" aria-checked={plan === "plus_year"} className={`co-plan${plan === "plus_year" ? " on" : ""}`} onClick={() => setPlan("plus_year")}>
          <span className="co-tag">{Math.round((save / (m.price * 12)) * 100)}% 절약</span>
          <span className="co-nm"><i className="co-radio" />1년</span>
          <span className="co-price">{y.price.toLocaleString()}<small>원</small></span>
          <span className="co-per">1년에 한 번 결제<br />월 {m.price.toLocaleString()} × 12 = {(m.price * 12).toLocaleString()}원보다 {save.toLocaleString()}원 아껴요</span>
          <span className="co-bonus"><Ico name="video" size={22} /><span><b>기본 캐릭터 1번 포함</b>{won(CATALOG.char_basic.price)} 상당</span></span>
        </button>
        <button type="button" role="radio" aria-checked={plan === "plus_month"} className={`co-plan${plan === "plus_month" ? " on" : ""}`} onClick={() => setPlan("plus_month")}>
          <span className="co-nm"><i className="co-radio" />한 달</span>
          <span className="co-price">{m.price.toLocaleString()}<small>원</small></span>
          <span className="co-per">매달 같은 날 결제<br />언제든 해지</span>
          <span className="co-per faint" style={{ marginTop: "auto" }}>캐릭터는 단품으로 따로</span>
        </button>
      </div>
      <table className="co-cmp"><thead><tr><th></th><th>무료</th><th className="pl">플러스</th></tr></thead><tbody>
        <tr><td>하루 체크 · 기록 · 병원용 기록 · 알림 · 가족 공유</td><td className="ok">✓</td><td className="pl ok">✓</td></tr>
        <tr><td>비서에게 묻기</td><td>하루 질문 5개</td><td className="pl ok">하루 질문 50개</td></tr>
        <tr><td>비서 자세히 듣기</td><td className="no">—</td><td className="pl ok">하루 20번</td></tr>
        <tr><td>한 달 리포트</td><td className="no">—</td><td className="pl ok">✓</td></tr>
        <tr><td>우리 아이 캐릭터</td><td>단품 {won(CATALOG.char_basic.price)}~</td><td className="pl ok">연간 1번 포함</td></tr>
      </tbody></table>
      <button type="button" className="btn-primary co-cta" onClick={onNext}>{plan === "plus_year" ? `1년 ${won(y.price)}으로 시작` : `한 달 ${won(m.price)}으로 시작`}</button>
      <p className="co-legal">{plan === "plus_year" ? "1년 뒤" : "매달"} 같은 금액으로 <b>자동 갱신</b> · {POLICY.renewNotice} · <b>설정 › 플러스</b>에서 한 번에 해지 · {plan === "plus_year" ? "연간은 언제든 해지, 쓴 달만 월 요금으로 빼고 돌려드려요" : "해지해도 그달 결제일 전날까지 써요"} · <b>{POLICY.minAge}세 이상</b>만 결제</p>
    </div>
  );
}

// ② 캐릭터 단품 — 그림체 + 미리보기(시험 사용) + 기본/정성 + 추가 옵션(비어 있는 체크) + 철회 불가 상자
function ProductStep({ tier, setTier, style, setStyle, extraStyle, setExtraStyle, plus, reward, total, onPreview, onNext }) {
  const b = CATALOG.char_basic, p = CATALOG.char_premium, s = CATALOG.char_style;
  const sp = plus && s.plusPrice != null ? s.plusPrice : s.price;
  return (
    <div className="co-body">
      <div className="co-styles" role="radiogroup" aria-label="그림체">
        {["3d", "hand"].map((k) => (
          <button type="button" role="radio" aria-checked={style === k} key={k} className={`co-pola${style === k ? " on" : ""}`} onClick={() => setStyle(k)}>
            <img src={SAMPLE[k]} alt="" /><span>{STYLE_LABEL[k]}</span>
          </button>
        ))}
      </div>
      <button type="button" className="co-prev" onClick={onPreview}><Ico name="tap" size={20} /> 완성 모습 미리보기 (견본 강아지)</button>
      <div className="co-tiers" role="radiogroup" aria-label="상품">
        {[b, p].map((t) => (
          <button type="button" role="radio" aria-checked={tier === t.id} key={t.id} className={`co-tier${tier === t.id ? " on" : ""}`} onClick={() => setTier(t.id)}>
            <span><span className="co-nm"><i className="co-radio" />{t.title.replace(" 캐릭터", "")}</span><span className="co-per">{t.desc}</span></span>
            <span className="co-price sm">{t.price.toLocaleString()}<small>원</small></span>
          </button>
        ))}
      </div>
      {tier === "char_premium" && reward.discount && <div className="co-coupon"><Ico name="star" size={26} /><span><b>배지 10개 할인권</b> 정성에서 {won(STAMP_DISCOUNT)} 빼요</span></div>}
      <label className="co-chk"><input type="checkbox" checked={extraStyle} onChange={(e) => setExtraStyle(e.target.checked)} /><span>{s.title} <b>+{won(sp)}</b> <small>({s.desc}{plus ? " · 플러스 할인" : ` · 플러스면 ${won(s.plusPrice)}`})</small></span></label>
      <div className="co-warn"><Ico name="lock" size={26} /><span><b>만든 뒤엔 환불(청약철회)이 안 돼요</b>{POLICY.character.replace("만든 뒤에는 디지털 콘텐츠라 단순 변심 환불(청약철회)이 안 돼요. ", "디지털 콘텐츠라서요(전자상거래법 17조②5호). ")}</span></div>
      <button type="button" className="btn-primary co-cta" onClick={onNext}>{CATALOG[tier].title} {won(total)} · 다음</button>
      <p className="co-legal"><b>{POLICY.minAge}세 이상</b>만 결제 · 사진은 완성되면 지워요 · 결제 전 미리보기로 그림체와 움직임을 확인해 주세요</p>
    </div>
  );
}

// ③ 결제 확인 — 영수증, 한글 금액, 해지 방법, 비어 있는 필수 동의, 미성년자 고지, 돌아가기 = 결제 버튼 같은 급
function ConfirmStep({ dog, q, items, plus, stamp, agree, setAgree, onBack, onPaid }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pay = async () => {
    if (busy) return; setBusy(true); setErr("");
    try {
      const r = await startCheckout({ dogId: dog.id, items, plus, stampDiscount: stamp, total: q.total }); // 서버가 같은 식으로 다시 계산해 total과 다르면 거절
      if (!r.open) { setErr(`결제는 ${PAY_OPENS}에 열려요.`); return; }
      if (r.url) { location.href = r.url; return; } // 토스페이먼츠 결제창으로(정식 때)
      onPaid();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="co-body">
      <div className="co-recv">
        <div className="co-rt">{q.plan ? q.plan.title : "우리 아이 캐릭터"}</div>
        {q.lines.map((l) => <div className="co-r" key={l.id}><span>{l.title}{q.plan && l.id === q.plan.id ? ` (${q.startedAt} ~)` : ""}{l.note && !l.included ? <small> · {l.note}</small> : ""}</span><span className={l.included ? "ok" : ""}>{l.included ? "포함" : l.price < 0 ? `−${won(-l.price)}` : won(l.price)}</span></div>)}
        <div className="co-r tot"><span>오늘 결제</span><span>{won(q.total)}</span></div>
        <div className="co-sub">{q.totalKorean} 원{q.plan ? ` · 다음 결제 ${q.nextAt} 같은 금액` : " · 한 번만 결제"}</div>
      </div>
      {q.plan && <div className="co-row"><span>해지</span><span>설정 › 플러스 › 해지하기 (다음 결제일 전까지 언제든)</span></div>}
      {!q.plan && <div className="co-row"><span>환불</span><span>후보가 하나도 안 닮으면 그 자리에서 전액 · 만든 뒤엔 철회 불가</span></div>}
      <label className={`co-chk req${agree ? " on" : ""}`}><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>[필수] 이용약관 · 결제·환불 안내{q.plan ? " · 자동 갱신" : " · 철회 제한"}을 확인했어요 <a className="link-btn" href="/?terms" target="_blank" rel="noreferrer" style={{ padding: "0 8px", minWidth: 44, justifyContent: "center" }}>보기</a></span></label>
      <p className="co-legal left">만 {POLICY.minAge}세 미만이라면 보호자(법정대리인)의 동의를 받고 결제해 주세요. 동의 없이 결제했다면 본인이나 보호자가 계약을 취소할 수 있어요.</p>
      {err && <p className="error-text" role="alert" style={{ margin: 0 }}>{err}</p>}
      <div className="co-two">
        <button type="button" className="btn-ghost same" onClick={onBack}>돌아가기</button>
        <button type="button" className="btn-primary" disabled={!BILLING_OPEN || !agree || busy} onClick={pay}>{BILLING_OPEN ? `${won(q.total)} 결제하기` : `${PAY_OPENS}에 열려요`}</button>
      </div>
      {BILLING_OPEN && <p className="co-legal">결제창은 토스페이먼츠가 열어요 · 카드 정보는 멍케어에 남지 않아요 · 결제 처리 위탁: 토스페이먼츠(주)</p>}
    </div>
  );
}

// ④ 완료 — 켜진 것 3개, 다음 결제일, 이메일 안내, 바로 써 보기
function DoneStep({ q, done, onClose, onOpenCharacter }) {
  const plusDone = done?.kind === "plus";
  return (
    <div className="co-body">
      <div className="co-done"><Ico name="party" size={56} /><div className="h1" style={{ margin: 0 }}>{plusDone ? "플러스가 켜졌어요" : "캐릭터를 만들 수 있어요"}</div><div className="co-sub">{`${won(q.total)} · ${q.startedAt}`}</div></div>
      {plusDone ? (
        <div className="co-on3"><div><Ico name="chatHeart" size={30} />비서 자세히</div><div><Ico name="calendar" size={30} />한 달 리포트</div><div><Ico name="video" size={30} />캐릭터 1번</div></div>
      ) : (
        <div className="co-on3"><div><Ico name="image" size={30} />사진 2~4장</div><div><Ico name="tap" size={30} />후보 고르기</div><div><Ico name="house" size={30} />홈에서 움직여요</div></div>
      )}
      {q.plan && <div className="co-row"><span>다음 결제</span><span>{q.nextAt} · {won(q.total)}</span></div>}
      <div className="co-row"><span>영수증 · 계약 내용</span><span>이메일로 보냈어요</span></div>
      <div className="co-row"><span>결제 내역</span><span>설정 › 멍케어 플러스 아래</span></div>
      {plusDone ? (
        <>
          <button type="button" className="btn-primary co-cta" onClick={onClose}>비서에게 바로 물어보기</button>
          {onOpenCharacter && <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={onOpenCharacter}>캐릭터 만들러 가기</button>}
        </>
      ) : (
        <button type="button" className="btn-primary co-cta" onClick={onOpenCharacter || onClose}>사진 올리러 가기</button>
      )}
    </div>
  );
}

// 미리보기(시험 사용, 전자상거래법 17조⑥): 견본 강아지 그림 크게 + 어떻게 움직이는지
function Preview({ style, onClose }) {
  return (
    <div className="co-preview" role="dialog" aria-label="미리보기" onClick={onClose}>
      <div className="co-preview-card" onClick={(e) => e.stopPropagation()}>
        <img src={SAMPLE[style]} alt={`${STYLE_LABEL[style]} 견본`} />
        <div><b>{STYLE_LABEL[style]}</b> 견본 강아지예요. 완성되면 홈 화면에서 꼬리 흔들며 기다리고, 물어볼 땐 엎드려서 고민해요(5초 영상 2편). 정성은 기쁨·밥 기다림·졸림 세 편을 더해요.</div>
        <div className="co-sub">후보 4장을 먼저 보고 고르니, 결제 뒤에도 "하나도 안 닮았어요"면 그 자리에서 전액 환불돼요.</div>
        <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
