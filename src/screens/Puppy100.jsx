import { useState } from "react";
import { createPortal } from "react-dom";
import Ico from "../components/Ico";
import { Task, WeekTest, UrgentSheet, stepLabel } from "../components/PuppyCard";
import { WEEKS, URGENT } from "../data/puppy100";
import { state, mark, setHidden, weekStatus, stampLog } from "../services/puppy100";
import { togetherDays } from "../services/shareCard";
import { trackAct } from "../services/analytics";
import { syncPushAlarms } from "../services/notifications";
import { md } from "../services/records";
import { todayKey, toDateKey, addDays } from "../utils/date";

// 퍼피 100일 훈련 화면(계획표 11/9 2장 "품은 앱"): 오늘 과제 → 이번 주 → 14주 지도(잠그지 않음, 미리 보기) → 급한 고민 → 지난 발도장.
// 오늘 탭 띠에서 열리고 오른쪽으로 밀면 오늘로. 데이터는 services/puppy100 그대로라 나중에 앱을 따로 떼도 이 화면이 첫 화면이 된다.
export default function Puppy100({ dog, onBack }) {
  const [, refresh] = useState(0);
  const [more, setMore] = useState(false); // 오늘 몫을 했어도 다음 과제를 막지 않는다(보강 조사 11/9)
  const [urgent, setUrgent] = useState(null);
  const [peek, setPeek] = useState(null); // 14주 지도에서 누른 주(미리 보기)
  const [stamp, setStamp] = useState(false); // 🐾 누른 직후 발도장 찍히는 모션(디자인 규칙 6)
  const today = todayKey();
  const st = state(dog.id, today);
  const changed = () => (setMore(false), syncPushAlarms(), refresh((n) => n + 1));
  const stamped = () => (setStamp(true), setTimeout(() => setStamp(false), 900), changed());
  const yesterday = toDateKey(addDays(new Date(`${today}T00:00:00`), -1));
  const days = togetherDays(dog);
  const week = st.step ? WEEKS[st.step.week - 1] : null;
  const status = weekStatus(dog.id);
  const log = stampLog(dog.id);

  return (
    <div className="screen">
      <div className="pp-head">
        <button className="btn-ghost" onClick={onBack}>← 오늘로</button>
        <button type="button" className="btn-ghost small" onClick={() => (setHidden(dog.id, true), onBack())}>숨기기</button>
      </div>
      <div className="h1" style={{ marginBottom: 2 }}>퍼피 100일</div>
      <p className="subtle" style={{ margin: "0 0 12px" }}>
        {dog.name}{days > 0 ? ` · 함께한 지 ${days}일` : ""}{week ? ` · ${st.step.week}주차 ${week.title}` : ""}
      </p>

      <section className="card pc100" aria-label="오늘의 5분">
        {st.finished ? (
          <>
            <div className="pc100-title"><Ico name="graduation" size={22} className="paw-mark" /> 100일 과정을 다 마쳤어요</div>
            <p className="pc100-why">배운 동작은 일주일에 몇 번씩 해 주면 오래 기억해요. 아래 지도에서 아무 주나 눌러 다시 볼 수 있어요.</p>
          </>
        ) : st.doneToday && !more ? (
          <>
            <p className="pc100-done">
              {st.againToday ? <><Ico name="repeat" size={16} className="paw-mark" /> 내일 한 번 더 해요 · <b>{stepLabel(st.step)}</b></> : <><span className={stamp ? "paw-stamp" : "paw-mark"}><Ico name="paw" size={20} /></span> 오늘의 5분 끝! 내일은 <b>{stepLabel(st.step)}</b></>}
            </p>
            <button type="button" className="btn-ghost" style={{ marginTop: 10 }} onClick={() => setMore(true)}>{st.againToday ? "지금 한 번 더 하기" : "더 하고 싶으면 지금 하기"}</button>
          </>
        ) : st.step.kind === "test" ? (
          <WeekTest key={st.step.id} dog={dog} step={st.step} onDone={changed} />
        ) : (
          <Task
            key={st.step.id}
            step={st.step}
            onDone={() => (mark(dog.id, st.step.id, "done", today), trackAct("task"), stamped())}
            onAgain={() => (mark(dog.id, st.step.id, "again", today), changed())}
            onSkip={() => (mark(dog.id, st.step.id, "skip", today), changed())}
            onYesterday={st.started && st.idleDays >= 2 && !st.doneToday ? () => (mark(dog.id, st.step.id, "done", yesterday), trackAct("task"), changed()) : null}
          />
        )}
      </section>

      {week && (
        <section className="card" style={{ marginBottom: 14 }}>
          <div className="rec-head">
            <div className="h2" style={{ margin: 0 }}>이번 주 · {week.title}</div>
            <span className="faint">{st.weekPaws.filter(Boolean).length}/6</span>
          </div>
          <ol className="pp-week">
            {week.tasks.map((t, i) => {
              const done = st.weekPaws[i];
              const cur = st.step.kind === "task" && st.step.id === `w${st.step.week}-${i + 1}`;
              return (
                <li key={t.t} className={done ? "done" : cur ? "cur" : ""}>
                  <span className="pp-dot" aria-hidden="true">{done ? <Ico name="check" size={14} /> : i + 1}</span>
                  <span>{t.t}</span>
                  {cur && <span className="faint">오늘</span>}
                </li>
              );
            })}
            <li className={st.step.kind === "test" ? "cur" : ""}>
              <span className="pp-dot" aria-hidden="true"><Ico name="sparkles" size={13} /></span>
              <span>7일째 체크 {week.test.length}문항</span>
              {st.step.kind === "test" && <span className="faint">오늘</span>}
            </li>
          </ol>
        </section>
      )}

      <section className="card" style={{ marginBottom: 14 }}>
        <div className="h2">14주 지도</div>
        <div className="pp-map" role="list">
          {WEEKS.map((w, i) => (
            <button key={w.title} type="button" role="listitem" className={`pp-wk ${status[i]}`} aria-label={`${i + 1}주차 ${w.title}${status[i] === "done" ? " 끝남" : status[i] === "cur" ? " 지금" : ""}`} onClick={() => setPeek(i)}>
              {status[i] === "done" ? <Ico name="check" size={14} /> : i + 1}
            </button>
          ))}
        </div>
        <p className="faint" style={{ margin: "8px 0 0", fontSize: 12.5 }}>끝난 주 ✓ · 지금 주는 파란 테두리 · 다음 주도 눌러서 미리 볼 수 있어요</p>
      </section>

      <section className="card" style={{ marginBottom: 14 }}>
        <div className="h2">급한 고민</div>
        <p className="subtle" style={{ margin: "0 0 8px" }}>순서와 상관없이 언제든 봐요.</p>
        <div className="chip-wrap">
          {URGENT.map((u) => <button key={u.id} type="button" className="seg" onClick={() => setUrgent(u)}>{u.label}</button>)}
        </div>
      </section>

      {log.length > 0 && (
        <section className="card" style={{ marginBottom: 14 }}>
          <div className="h2">지난 발도장</div>
          {log.slice(0, 14).map((d) => (
            <div key={d.date} className="pp-log">
              <b>{md(d.date)}</b>
              <span><Ico name="paw" size={13} className="paw-mark" /> {d.items.join(" · ")}</span>
            </div>
          ))}
          {log.length > 14 && <p className="faint" style={{ margin: "6px 0 0" }}>그전 것은 기록 탭 달력에서 날짜를 눌러 봐요.</p>}
        </section>
      )}

      {peek != null && <WeekPeek index={peek} status={status[peek]} onClose={() => setPeek(null)} />}
      {urgent && <UrgentSheet item={urgent} onClose={() => setUrgent(null)} />}
    </div>
  );
}

// 지도에서 누른 주 미리 보기 — 잠그지 않는다(보강 조사: 잠금·드립 방식 불만). 과제 이름과 체크 문항만 보여 주고, 실제 발도장은 그 주가 되면 찍는다
function WeekPeek({ index, status, onClose }) {
  const w = WEEKS[index];
  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label={`${index + 1}주차 미리 보기`}>
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">{index + 1}주차 · {w.title}</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll" style={{ padding: "4px 16px 20px", display: "block" }}>
          {status === "todo" && <p className="subtle" style={{ margin: "0 0 10px" }}>아직 오지 않은 주예요. 미리 봐 두기만 해도 돼요. 과제는 지금 주를 끝내면 이어져요.</p>}
          <ol className="pp-week">
            {w.tasks.map((t, i) => (
              <li key={t.t}>
                <span className="pp-dot" aria-hidden="true">{i + 1}</span>
                <span><b>{t.t}</b><span className="faint" style={{ display: "block", fontSize: 12.5 }}>{t.why}</span></span>
              </li>
            ))}
          </ol>
          <div className="pc100-sub">{w.graduation ? "졸업 테스트" : "7일째 체크"}</div>
          <ul className="pc100-no">{w.test.map((q) => <li key={q}>{q}</li>)}</ul>
        </div>
      </div>
    </div>,
    document.body
  );
}
