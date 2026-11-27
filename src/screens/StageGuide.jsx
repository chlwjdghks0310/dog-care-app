import { useMemo, useState } from "react";
import Empty from "../components/Empty";
import Ico from "../components/Ico";
import { isNative } from "../services/native";
import { GUIDE_AREAS, GUIDE_CARDS, LATER_STAGES } from "../data/stageGuide";
import { STAGES, getStage, getFit, stageRangeLabel } from "../services/stageGuide";
import { formatAge } from "../utils/age";
import { isEmergency } from "../services/infoSearch";
import { trackAct } from "../services/analytics";

// 월령별 가이드(11/15, 사용자: "이 시기에 필요한 것을 자세히, 찾아가지 않아도 보이게"): 지금 시기 → 영역 칩 → 카드(왜·이렇게·피해요·병원에 물어볼 때·출처).
// 강아지 나이·크기·몸무게·중성화로 시기와 맞춤 한 줄을 정한다(services/stageGuide). 카드는 정적 데이터(data/stageGuide), AI 없음.
// 다른 시기도 미리 볼 수 있고, 맨 아래에서 더 궁금한 건 ChatGPT로 넘긴다(멍케어 밖 AI, 이름은 안 넣음).
const CARRY = new Set(["vaccine", "parasite", "treats", "bath"]);
export default function StageGuide({ dog, onBack }) {
  const st = useMemo(() => getStage(dog), [dog]);
  const [view, setView] = useState(st.id); // 보고 있는 시기(기본 = 지금 시기)
  const [area, setArea] = useState("all");
  const [open, setOpen] = useState(null);
  const viewing = STAGES[view - 1];
  const isNow = view === st.id;
  const fit = useMemo(() => (isNow ? getFit(dog, st) : []), [dog, st, isNow]);

  // 지금 시기 + 입양 14일 안이면 "집에 온 첫 2주" 카드도 같이(퍼피일 때만 — 성견 입양은 띠 문구만)
  const cards = useMemo(() => {
    const ids = view === 1 ? [1] : view === st.id && st.settle && st.id <= 3 ? [1, view] : [view];
    const own = GUIDE_CARDS.filter((c) => ids.includes(c.stage));
    if (view < 6) return own;
    // 중년·노령: 성견 때부터 이어 가는 기본(접종·구충·간식·목욕)은 그 시기 카드에 없으면 성견 카드를 이어서 보여 준다 — 8살 아이에게 접종·구충 카드가 하나도 없던 것(11/27 검토)
    const has = new Set(own.map((c) => c.area));
    return [...own, ...GUIDE_CARDS.filter((c) => c.stage === 5 && CARRY.has(c.area) && !has.has(c.area))];
  }, [view, st]);
  const areas = useMemo(() => GUIDE_AREAS.filter((a) => cards.some((c) => c.area === a.id)), [cards]);
  const shown = area === "all" ? cards : cards.filter((c) => c.area === area);
  const areaOf = (id) => GUIDE_AREAS.find((a) => a.id === id) || GUIDE_AREAS[0];
  const later = LATER_STAGES.find((l) => l.stage === view);

  function pickStage(id) { setView(id); setArea("all"); setOpen(null); }

  return (
    <div className="screen mg">
      <div className="pp-head">
        <button className="btn-ghost" onClick={onBack}>← 뒤로</button>
      </div>
      <div className="h1" style={{ marginBottom: 2 }}>월령별 가이드</div>
      <p className="subtle" style={{ margin: "0 0 12px" }}>
        {dog.name} · {formatAge(st.age)} · {st.sizeLabel}{dog.weight ? ` · ${dog.weight}kg` : ""}
      </p>

      {/* 시기 띠: 7시기, 지금 시기 강조. 눌러서 다른 시기 미리 보기 */}
      <div className="mg-stages" role="tablist" aria-label="시기 고르기">
        {STAGES.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={view === s.id} className={`mg-stage${view === s.id ? " on" : ""}${s.id === st.id ? " now" : ""}`} onClick={() => pickStage(s.id)}>
            <Ico name={s.ico} size={22} />
            <span>{s.short}</span>
            {s.id === st.id && <i className="mg-now-dot" aria-hidden="true" />}
          </button>
        ))}
      </div>

      {/* 지금(또는 보고 있는) 시기 카드 */}
      <section key={view} className={`card mg-hero pop-in${isNow ? "" : " peek"}`}>
        <div className="mg-hero-top">
          <span className="mg-hero-ico"><Ico name={viewing.ico} size={30} /></span>
          <div style={{ minWidth: 0 }}>
            <div className="mg-hero-kicker">{isNow ? "지금 시기" : view < st.id ? "지난 시기" : "다음에 올 시기"} · {stageRangeLabel(st.size, view)}{view >= 4 ? `(${st.sizeLabel} 기준)` : ""}</div>
            <div className="mg-hero-title">{viewing.name}</div>
            <p className="mg-hero-tip">{viewing.tip}</p>
          </div>
        </div>
        {isNow && st.weeksToNext !== null && (
          <div className="mg-progress" aria-label={`다음 시기까지 약 ${st.weeksToNext}주`}>
            <div className="mg-bar"><span style={{ width: `${Math.round(st.progress * 100)}%` }} /></div>
            <span className="faint">{st.next ? `${st.next.name}까지 약 ${st.weeksToNext >= 8 ? `${Math.round(st.weeksToNext / 4.345)}개월` : `${st.weeksToNext}주`}` : ""}</span>
          </div>
        )}
        {isNow && st.settle && (
          <p className="mg-settle"><Ico name="house" size={16} /> 집에 온 지 {st.settle}일째예요. 적응기 카드를 함께 보여 드려요.</p>
        )}
        {fit.length > 0 && (
          <div className="mg-fit">
            <div className="mg-fit-title"><Ico name="paw" size={15} sticker={false} /> {dog.name} 맞춤</div>
            <ul>
              {fit.map((f, i) => (
                <li key={i}><Ico name={f.ico} size={18} /><span>{f.text}<small>{f.src}</small></span></li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 영역 칩 */}
      {cards.length > 0 && (
        <div className="mg-areas" role="tablist" aria-label="영역 고르기">
          <button type="button" role="tab" aria-selected={area === "all"} className={`chip mg-chip${area === "all" ? " on" : ""}`} onClick={() => setArea("all")}>전체 {cards.length}</button>
          {areas.map((a) => (
            <button key={a.id} type="button" role="tab" aria-selected={area === a.id} className={`chip mg-chip${area === a.id ? " on" : ""}`} onClick={() => setArea(a.id)}>
              <Ico name={a.ico} size={16} /> {a.label}
            </button>
          ))}
        </div>
      )}

      {/* 카드 목록 */}
      {shown.length > 0 ? (
        <div className="rec-list">
          {shown.map((c) => (
            <GuideCard key={c.id} card={c} area={areaOf(c.area)} open={open === c.id} onToggle={() => { setOpen(open === c.id ? null : c.id); if (open !== c.id) trackAct("guide"); }} />
          ))}
        </div>
      ) : later ? (
        <section className="card">
          <div className="h2" style={{ marginBottom: 6 }}>{later.title} 시기에 챙길 것</div>
          <p className="subtle" style={{ marginBottom: 8 }}>자세한 카드는 준비 중이에요. 이 시기의 핵심 주제예요.</p>
          <ul className="mg-topics">{later.topics.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </section>
      ) : (
        <Empty ico="book" compact>이 시기의 카드는 준비 중이에요.</Empty>
      )}

      <AskMore dog={dog} st={st} />

      <p className="faint mg-foot">카드는 AAHA·WSAVA·AVSAB·Merck 수의학 매뉴얼·AKC 같은 공개 자료를 바탕으로 쓴 일반 참고 정보예요. 상품·브랜드는 추천하지 않고, 진단하지 않아요. 우리 아이 상태에 맞는 판단은 담당 수의사와 해 주세요.</p>
    </div>
  );
}

function GuideCard({ card, area, open, onToggle }) {
  return (
    <article className={`card mg-card${open ? " open" : ""}`}>
      <button type="button" className="mg-card-head" aria-expanded={open} onClick={onToggle}>
        <span className="mg-card-ico"><Ico name={area.ico} size={22} /></span>
        <span className="mg-card-text">
          <span className="mg-card-area">{area.label}</span>
          <span className="mg-card-title">{card.title}</span>
          {!open && card.why?.[0] && <span className="mg-card-why">{card.why[0]}</span>}
        </span>
        <Ico name="arrowDown" size={18} className={`mg-card-arrow${open ? " up" : ""}`} />
      </button>
      {open && (
        <div className="mg-card-body">
          <Block label="지금 왜 중요한가" ico="idea">
            <ul className="mg-ul">{card.why.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </Block>
          <Block label="이렇게 해요" ico="checklist">
            <ol className="mg-ol">{card.how.map((t, i) => <li key={i}>{t}</li>)}</ol>
          </Block>
          {card.avoid?.length > 0 && (
            <Block label="이런 건 피해요" ico="alert" tone="warn">
              <ul className="mg-ul">{card.avoid.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </Block>
          )}
          {card.ask && (
            <Block label="병원에 물어볼 때" ico="stethoscope">
              <p className="mg-ask">{card.ask}</p>
            </Block>
          )}
          {card.sources?.length > 0 && (
            <p className="mg-src">출처 · {card.sources.map((s, i) => (
              <span key={i}>{i > 0 && " · "}{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a> : s.name}</span>
            ))}</p>
          )}
        </div>
      )}
    </article>
  );
}

function Block({ label, ico, tone, children }) {
  return (
    <div className={`mg-block${tone ? ` ${tone}` : ""}`}>
      <div className="mg-block-label"><Ico name={ico} size={16} /> {label}</div>
      {children}
    </div>
  );
}

// 더 궁금한 건 ChatGPT로(비서 탭 AskOutside와 같은 규칙: 이름은 안 넣고 견종·나이·몸무게·크기·시기만, 응급 단어면 병원 안내 먼저)
function AskMore({ dog, st }) {
  const [q, setQ] = useState("");
  if (isNative()) return null; // 스토어 앱에서는 앱 밖으로 내보내는 버튼을 두지 않는다(애플 심사 4.2)
  const text = q.trim();
  const urgent = text ? isEmergency(text) : null;
  const prompt = `강아지 정보: ${[dog.breed, formatAge(st.age), st.sizeLabel, dog.weight ? `${dog.weight}kg` : "", `지금 시기: ${st.name}`, dog.neutered ? "중성화함" : ""].filter(Boolean).join(", ")}\n질문: ${text.split(dog.name).join("우리 강아지")}\n\n이 시기(${st.name}) 강아지에게 맞게, 보호자가 집에서 할 수 있는 것과 병원에 물어볼 것을 나눠서 쉽게 답해 주세요. 약 이름이나 용량은 말하지 마세요.`;
  return (
    <section className="card mg-ask-box">
      <div className="h2" style={{ marginBottom: 4 }}><Ico name="chatHeart" size={20} /> 더 궁금한 게 있나요?</div>
      <p className="subtle" style={{ marginBottom: 8 }}>카드에 없는 건 {dog.name} 정보(견종·나이·크기·몸무게·시기)를 담아 ChatGPT에 물어볼 수 있어요. 멍케어 밖 AI라 답은 참고만 해 주세요.</p>
      <textarea className="mg-ask-input" rows={2} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`예: ${st.id <= 3 ? "이갈이 간식은 하루에 몇 번 줘도 돼요?" : "산책 거리를 얼마나 늘려도 돼요?"}`} maxLength={300} />
      {urgent ? (
        <p className="mg-urgent"><Ico name="siren" size={16} /> 응급일 수 있어요. 지금은 동물병원에 먼저 전화해 주세요. 24시 병원은 병원 탭 → 건강 체크에서 찾을 수 있어요.</p>
      ) : (
        <a className={`btn-primary small mg-ask-go${text ? "" : " off"}`} href={text ? `https://chatgpt.com/?q=${encodeURIComponent(prompt)}` : undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!text} onClick={(e) => { if (!text) e.preventDefault(); else trackAct("guide_ask"); }}>
          <Ico name="chatHeart" size={16} sticker={false} /> ChatGPT에 물어보기
        </a>
      )}
    </section>
  );
}
