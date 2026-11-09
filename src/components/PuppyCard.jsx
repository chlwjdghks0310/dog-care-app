import { useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";
import { OUT_NOTE, STEPS } from "../data/puppy100";
import { eligible, state, finishTest, retryWeek, passLine } from "../services/puppy100";
import { trackAct } from "../services/analytics";
import { todayKey } from "../utils/date";

// 오늘 탭 "오늘의 5분" 띠(퍼피 첫 100일). 홈에는 이 한 줄만 두고, 누르면 훈련 화면(screens/Puppy100)이 열린다(계획표 11/9 2장).
// 왜: 카드 한 장이 450~500px라 강아지가 줄고 입력창이 밀렸음. Zigzag·Pupford·Dogo도 홈엔 한 줄(Today's lessons 0/3·Continue Training·33%)만 둔다.
export default function PuppyCard({ dog, onOpen }) {
  const today = todayKey();
  if (!eligible(dog, today)) return null;
  const st = state(dog.id, today);
  return (
    <button type="button" className={`pc100-strip${st.finished || st.doneToday ? " done" : ""}`} onClick={onOpen} aria-label="퍼피 100일 훈련 화면 열기">
      {/* 띠 아이콘은 우리 강아지 얼굴(사용자 결정 11/9) — 사진이 없으면 발도장 */}
      <span className="pc100-strip-ico" aria-hidden="true">{dog.photo ? <img className="pc100-strip-face" src={dog.photo} alt="" /> : <Ico name="paw" size={20} />}</span>
      <span className="pc100-strip-body">
        <span className="pc100-strip-sub">퍼피 100일{st.step ? ` · ${st.step.week}주차` : ""}{st.finished ? "" : ` · 이번 주 ${st.weekPaws.filter(Boolean).length}/6`}</span>
        <span className="pc100-strip-title pop-in" key={st.finished ? "fin" : st.doneToday ? `done-${st.step.id}` : st.step.id}>
          {st.finished ? <><Ico name="graduation" size={16} className="paw-mark" /> 100일 과정을 다 마쳤어요</> : st.doneToday ? (st.againToday ? `내일 한 번 더 · ${stepLabel(st.step)}` : <><Ico name="paw" size={15} className="paw-mark" /> 오늘 끝! 내일은 {stepLabel(st.step)}</>) : st.step.kind === "test" ? `${stepLabel(st.step)} · ${st.step.qs.length}문항` : `오늘의 5분 · ${st.step.t}`}
        </span>
      </span>
      <span className="pc100-strip-go">{st.finished || st.doneToday ? "›" : "시작 ›"}</span>
    </button>
  );
}

export const stepLabel = (s) => (s.kind === "test" ? (s.graduation ? "100일 졸업 테스트" : `${s.week}주차 체크`) : s.t);

// 오늘 과제 한 장: 제목 → 이유 → 3단계 → 시간 감 → (밖이면 접종 안내) → 🐾/🔁 → 이미 잘해요 · 어제 했어요
export function Task({ step, onDone, onAgain, onSkip, onYesterday }) {
  return (
    <>
      <div className="pc100-title">오늘의 5분 · {step.t}</div>
      <p className="pc100-why">{step.why}</p>
      <ol className="pc100-steps">{step.s.map((x) => <li key={x}>{x}</li>)}</ol>
      <div className="pc100-time"><Ico name="timer" size={14} /> 한 번에 1~2분 · 성공하면 바로 끝 · 다 해서 5분이 넘지 않게</div>
      {step.out && <div className="pc100-out"><Ico name="alert" size={14} /> {OUT_NOTE}</div>}
      <div className="dc-btns" style={{ marginTop: 12 }}>
        <button type="button" className="dc-usual paw" onClick={onDone}><Ico name="paw" size={18} /> 했어요</button>
        <button type="button" className="dc-diff" onClick={onAgain}><Ico name="repeat" size={16} /> 한 번 더</button>
      </div>
      <div className="pc100-links">
        <button type="button" className="link-btn" style={{ margin: 0 }} onClick={onSkip}>이미 잘해요 → 다음 과제</button>
        {onYesterday && <button type="button" className="link-btn" style={{ margin: 0 }} onClick={onYesterday}>어제 했는데 못 눌렀어요</button>}
      </div>
    </>
  );
}

// 7일째 주간 체크(졸업은 10문항): 되는 것만 누르고 [결과 보기]
export function WeekTest({ dog, step, onDone }) {
  const [ok, setOk] = useState([]);
  const [result, setResult] = useState(null);
  const need = passLine(step);
  const toggle = (i) => setOk((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]));
  const next = STEPS.find((s) => s.week === step.week + 1);
  if (result === "low")
    return (
      <>
        <div className="pc100-title">{step.week}주차는 {ok.length}개 됐어요</div>
        <p className="pc100-why">괜찮아요. 한 주 더 연습하면 대부분 좋아져요. 안 된 동작은 한 단계 쉽게 해 보세요.</p>
        <div className="dc-btns">
          <button type="button" className="dc-usual" onClick={() => (retryWeek(dog.id, step.week), onDone())}>이번 주 한 번 더</button>
          <button type="button" className="dc-diff" onClick={() => (finishTest(dog.id, step.id, ok.length), trackAct("task"), onDone())}>그래도 다음 주로</button>
        </div>
      </>
    );
  return (
    <>
      <div className="pc100-title">{step.graduation ? "100일 졸업 테스트" : `${step.week}주차 체크`}</div>
      <p className="pc100-why">이번 주에 되는 것만 눌러요. {step.qs.length}개 중 {need}개면 통과예요.</p>
      <div className="pc100-qs">
        {step.qs.map((q, i) => (
          <button key={q} type="button" className={`pc100-q${ok.includes(i) ? " on" : ""}`} aria-pressed={ok.includes(i)} onClick={() => toggle(i)}>
            <span className="pc100-box" aria-hidden="true">{ok.includes(i) ? "✓" : ""}</span>{q}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn-primary"
        style={{ marginTop: 10 }}
        onClick={() => (ok.length >= need ? (finishTest(dog.id, step.id, ok.length), trackAct("task"), onDone()) : setResult("low"))}
      >
        결과 보기
      </button>
      {ok.length >= need && next && <p className="faint" style={{ margin: "6px 0 0" }}>통과하면 다음은 {next.week}주차예요.</p>}
    </>
  );
}

// 급한 고민 한 장(짖음·물기·배변 실수): 왜 → 오늘부터 → 하지 않아요 → 병원·전문가 기준(늘 보임)
export function UrgentSheet({ item, onClose }) {
  return createPortal(
    <div className="es-backdrop" style={{ zIndex: 130 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label={`급한 고민: ${item.label}`}>
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">급한 고민 · {item.label}</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll" style={{ padding: "4px 16px 20px", display: "block" }}>
          <p className="pc100-why">{item.why}</p>
          <div className="pc100-sub">오늘부터 이렇게</div>
          <ol className="pc100-steps">{item.s.map((x) => <li key={x}>{x}</li>)}</ol>
          <div className="pc100-sub">하지 않아요</div>
          <ul className="pc100-no">{item.no.map((x) => <li key={x}>{x}</li>)}</ul>
          <div className="pc100-vet">
            <b><Ico name="stethoscope" size={16} /> 이럴 땐 병원·전문가에게</b>
            <p style={{ margin: "4px 0 0" }}>{item.vet}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
