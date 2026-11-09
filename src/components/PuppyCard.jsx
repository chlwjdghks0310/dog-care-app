import { useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";
import { OUT_NOTE, STEPS, URGENT } from "../data/puppy100";
import { eligible, state, mark, finishTest, retryWeek, passLine, setHidden } from "../services/puppy100";
import { togetherDays } from "../services/shareCard";
import { trackAct } from "../services/analytics";
import { syncPushAlarms } from "../services/notifications";
import { todayKey } from "../utils/date";

// 오늘 탭 "오늘의 5분"(퍼피 첫 100일). 하루 체크 바로 밑에 1장 — 하고 나면 한 줄로 접힌다.
// 급한 고민(짖음·물기·배변 실수)은 100일 순서와 상관없이 늘 열 수 있다.
export default function PuppyCard({ dog, onChanged }) {
  const [, refresh] = useState(0);
  const [urgent, setUrgent] = useState(null);
  const [notice, setNotice] = useState("");
  const today = todayKey();
  if (!eligible(dog, today)) return notice ? <p className="subtle" role="status" style={{ margin: "0 0 14px" }}>{notice}</p> : null;
  const st = state(dog.id, today);
  const changed = () => (syncPushAlarms(), refresh((n) => n + 1), onChanged?.());
  const days = togetherDays(dog);

  return (
    <section className="card pc100" aria-label="퍼피 100일 오늘의 5분">
      <div className="pc100-head">
        <span className="pc100-tag"><Ico name="paw" size={14} /> 퍼피 100일{st.step ? ` · ${st.step.week}주차` : ""}</span>
        {days > 0 && <span className="faint">함께한 지 {days}일</span>}
      </div>

      {st.finished ? (
        <>
          <div className="pc100-title">100일 과정을 다 마쳤어요 🎓</div>
          <p className="subtle" style={{ margin: "4px 0 0" }}>배운 동작은 일주일에 몇 번씩 해 주면 오래 기억해요.</p>
        </>
      ) : st.doneToday ? (
        <p className="pc100-done">
          {st.againToday ? <>🔁 내일 한 번 더 해요 · <b>{st.step.kind === "test" ? `${st.step.week}주차 체크` : st.step.t}</b></> : <>🐾 오늘의 5분 끝! 내일은 <b>{st.step.kind === "test" ? `${st.step.week}주차 체크` : st.step.t}</b></>}
        </p>
      ) : st.step.kind === "test" ? (
        <WeekTest key={st.step.id} dog={dog} step={st.step} onDone={changed} />
      ) : (
        <Task step={st.step} onDone={() => (mark(dog.id, st.step.id, "done", today), trackAct("task"), changed())} onAgain={() => (mark(dog.id, st.step.id, "again", today), changed())} onSkip={() => (mark(dog.id, st.step.id, "skip", today), changed())} />
      )}

      {!st.finished && (
        <div className="pc100-paws" aria-label={`이번 주 ${st.weekPaws.filter(Boolean).length}/6`}>
          {st.weekPaws.map((on, i) => <span key={i} className={on ? "on" : ""} aria-hidden="true">🐾</span>)}
          <span className="faint">이번 주 {st.weekPaws.filter(Boolean).length}/6</span>
        </div>
      )}

      <div className="pc100-urgent">
        <span className="faint">급한 고민</span>
        {URGENT.map((u) => <button key={u.id} type="button" className="seg" onClick={() => setUrgent(u)}>{u.label}</button>)}
      </div>
      <button type="button" className="link-btn pc100-hide" onClick={() => (setHidden(dog.id, true), setNotice("퍼피 100일 카드를 숨겼어요. 우리 아이 → ☰ 설정에서 다시 켤 수 있어요."), changed())}>이 카드 숨기기</button>
      {urgent && <UrgentSheet item={urgent} onClose={() => setUrgent(null)} />}
    </section>
  );
}

function Task({ step, onDone, onAgain, onSkip }) {
  return (
    <>
      <div className="pc100-title">오늘의 5분 · {step.t}</div>
      <p className="pc100-why">{step.why}</p>
      <ol className="pc100-steps">{step.s.map((x) => <li key={x}>{x}</li>)}</ol>
      {step.out && <p className="pc100-out"><Ico name="alert" size={14} /> {OUT_NOTE}</p>}
      <div className="dc-btns" style={{ marginTop: 10 }}>
        <button type="button" className="dc-usual" onClick={onDone}>🐾 했어요</button>
        <button type="button" className="dc-diff" onClick={onAgain}>🔁 한 번 더</button>
      </div>
      <button type="button" className="link-btn" style={{ margin: "8px 0 0" }} onClick={onSkip}>이미 잘해요 → 다음 과제 보기</button>
    </>
  );
}

// 7일째 주간 체크(졸업은 10문항): 되는 것만 누르고 [결과 보기]
function WeekTest({ dog, step, onDone }) {
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
      <div className="pc100-title">{step.graduation ? "100일 졸업 테스트" : `${step.week}주차 체크`} 🎖</div>
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

function UrgentSheet({ item, onClose }) {
  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
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
