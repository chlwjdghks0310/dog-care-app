import { useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";
import { useSheetSwipe } from "./SwipeBack";
import { OUT_NOTE, STEPS, URGENT } from "../data/puppy100";
import { eligible, state, mark, finishTest, retryWeek, passLine, setHidden } from "../services/puppy100";
import { togetherDays } from "../services/shareCard";
import { trackAct } from "../services/analytics";
import { syncPushAlarms } from "../services/notifications";
import { todayKey, toDateKey, addDays } from "../utils/date";

// 오늘 탭 "오늘의 5분"(퍼피 첫 100일). A안(11/9): 하루 체크 밑에 한 줄 띠만 두고, 누르면 아래에서 창이 올라와 과제가 나온다.
// 왜: 카드 한 장이 450~500px라 강아지가 줄고 입력창이 밀렸음. Zigzag·Pupford·Dogo도 홈엔 한 줄(Today's lessons 0/3·Continue Training·33%)만 둔다.
// 급한 고민(짖음·물기·배변 실수)은 100일 순서와 상관없이 창 아래에서 늘 열 수 있다.
export default function PuppyCard({ dog, onChanged }) {
  const [, refresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const today = todayKey();
  if (!eligible(dog, today)) return notice ? <p className="subtle" role="status" style={{ margin: "0 0 14px" }}>{notice}</p> : null;
  const st = state(dog.id, today);
  const changed = () => (syncPushAlarms(), refresh((n) => n + 1), onChanged?.());
  const label = (s) => (s.kind === "test" ? (s.graduation ? "100일 졸업 테스트" : `${s.week}주차 체크`) : s.t);

  return (
    <>
      <button type="button" className={`pc100-strip${st.finished || st.doneToday ? " done" : ""}`} onClick={() => setOpen(true)} aria-label="퍼피 100일 오늘의 5분 열기">
        <span className="pc100-strip-ico" aria-hidden="true">{st.step?.kind === "test" && !st.doneToday ? "🎖" : <Ico name="paw" size={20} />}</span>
        <span className="pc100-strip-body">
          <span className="pc100-strip-sub">퍼피 100일{st.step ? ` · ${st.step.week}주차` : ""}{st.finished ? "" : ` · 이번 주 ${st.weekPaws.filter(Boolean).length}/6`}</span>
          <span className="pc100-strip-title">
            {st.finished ? "100일 과정을 다 마쳤어요 🎓" : st.doneToday ? (st.againToday ? `내일 한 번 더 · ${label(st.step)}` : `오늘 끝! 내일은 ${label(st.step)}`) : st.step.kind === "test" ? `${label(st.step)} · ${st.step.qs.length}문항` : `오늘의 5분 · ${st.step.t}`}
          </span>
        </span>
        <span className="pc100-strip-go">{st.finished || st.doneToday ? "›" : "시작 ›"}</span>
      </button>
      {open && (
        <PuppySheet
          dog={dog}
          st={st}
          today={today}
          onClose={() => setOpen(false)}
          onChanged={changed}
          onHide={() => (setHidden(dog.id, true), setNotice("퍼피 100일을 숨겼어요. 우리 아이 → ☰ 설정에서 다시 켤 수 있어요."), setOpen(false), changed())}
        />
      )}
    </>
  );
}

// 아래에서 올라오는 창: 과제(또는 주간 체크) → 이번 주 발도장 → 급한 고민 → 숨기기. 🐾·🔁·체크 끝은 창을 닫고 띠에 결과를 보여 준다
function PuppySheet({ dog, st, today, onClose, onChanged, onHide }) {
  const [urgent, setUrgent] = useState(null);
  const [more, setMore] = useState(false); // 오늘 몫을 했어도 다음 과제를 막지 않는다(보강 조사 11/9)
  const swipe = useSheetSwipe(onClose);
  const yesterday = toDateKey(addDays(new Date(`${today}T00:00:00`), -1));
  const days = togetherDays(dog);
  const finish = () => (onChanged(), onClose());
  const stay = () => (setMore(false), onChanged());
  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet pc100-sheet" role="dialog" aria-label="퍼피 100일 오늘의 5분" {...swipe}>
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">퍼피 100일{st.step ? ` · ${st.step.week}주차` : ""}</div>
          <span className="faint" style={{ fontSize: 12.5, minWidth: 36, textAlign: "right" }}>{days > 0 ? `${days}일째` : ""}</span>
        </div>
        <div className="es-scroll pc100">
          {st.finished ? (
            <>
              <div className="pc100-title">100일 과정을 다 마쳤어요 🎓</div>
              <p className="pc100-why">배운 동작은 일주일에 몇 번씩 해 주면 오래 기억해요.</p>
            </>
          ) : st.doneToday && !more ? (
            <>
              <p className="pc100-done">
                {st.againToday ? <>🔁 내일 한 번 더 해요 · <b>{st.step.kind === "test" ? `${st.step.week}주차 체크` : st.step.t}</b></> : <>🐾 오늘의 5분 끝! 내일은 <b>{st.step.kind === "test" ? `${st.step.week}주차 체크` : st.step.t}</b></>}
              </p>
              <button type="button" className="btn-ghost" style={{ marginTop: 10 }} onClick={() => setMore(true)}>{st.againToday ? "지금 한 번 더 하기" : "더 하고 싶으면 지금 하기"}</button>
            </>
          ) : st.step.kind === "test" ? (
            <WeekTest key={st.step.id} dog={dog} step={st.step} onDone={finish} />
          ) : (
            <Task
              step={st.step}
              onDone={() => (mark(dog.id, st.step.id, "done", today), trackAct("task"), finish())}
              onAgain={() => (mark(dog.id, st.step.id, "again", today), finish())}
              onSkip={() => (mark(dog.id, st.step.id, "skip", today), stay())}
              // 놓친 날 나중에 찍기(보강 조사 11/9) — 어제 찍은 게 없을 때만
              onYesterday={st.started && st.idleDays >= 2 && !st.doneToday ? () => (mark(dog.id, st.step.id, "done", yesterday), trackAct("task"), stay()) : null}
            />
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
          <button type="button" className="link-btn pc100-hide" onClick={onHide}>퍼피 100일 숨기기</button>
        </div>
      </div>
      {urgent && <UrgentSheet item={urgent} onClose={() => setUrgent(null)} />}
    </div>,
    document.body
  );
}

function Task({ step, onDone, onAgain, onSkip, onYesterday }) {
  return (
    <>
      <div className="pc100-title">오늘의 5분 · {step.t}</div>
      <p className="pc100-why">{step.why}</p>
      <ol className="pc100-steps">{step.s.map((x) => <li key={x}>{x}</li>)}</ol>
      <div className="pc100-time"><Ico name="timer" size={14} /> 한 번에 1~2분 · 성공하면 바로 끝 · 다 해서 5분이 넘지 않게</div>
      {step.out && <div className="pc100-out"><Ico name="alert" size={14} /> {OUT_NOTE}</div>}
      <div className="dc-btns" style={{ marginTop: 12 }}>
        <button type="button" className="dc-usual" onClick={onDone}>🐾 했어요</button>
        <button type="button" className="dc-diff" onClick={onAgain}>🔁 한 번 더</button>
      </div>
      <div className="pc100-links">
        <button type="button" className="link-btn" style={{ margin: 0 }} onClick={onSkip}>이미 잘해요 → 다음 과제</button>
        {onYesterday && <button type="button" className="link-btn" style={{ margin: 0 }} onClick={onYesterday}>어제 했는데 못 눌렀어요</button>}
      </div>
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
