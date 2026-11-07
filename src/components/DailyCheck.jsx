import { useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";
import { ITEMS, getDay, saveUsual, saveUnknown, saveDiff, signalsOf, daysThisMonth, runsOf, missedYesterday } from "../services/dailyCheck";
import { markCheckedIn } from "../services/routine";
import { syncPushAlarms } from "../services/notifications";
import { EMERGENCY } from "../data/emergency";
import { todayKey } from "../utils/date";
import { saveDog } from "../services/dogRepository";

// 오늘 탭 말풍선의 10초 하루 체크: 강아지가 "오늘 어땠어?" 하고 묻는다. [평소와 같아요] 한 번이면 끝, [다른 게 있었어요]면 다른 항목만.
// 어제를 놓쳤으면 어제 것부터([기억 안 나요]는 '평소'로 치지 않음). 판단하지 않고 기록된 사실과 병원 상담 기준만 보여 준다.
// 물어볼 게 없으면(오늘 끝) 아무것도 그리지 않고, 열려 있는 고르기 창만 유지한다 — 오늘 요약은 Main 말풍선이 보여 준다.
export const dailyPending = (dogId, today = todayKey()) => missedYesterday(dogId, today) || (!getDay(dogId, today) && today);

export default function DailyCheck({ dog, onChange }) {
  const today = todayKey();
  const [sheet, setSheet] = useState(null); // 고르는 날짜
  const date = dailyPending(dog.id, today);
  const isYesterday = date && date !== today;
  const mark = (d) => d === today && (markCheckedIn(dog.id), syncPushAlarms()); // 오늘 했으면 오늘 체크 알림은 건너뛰게
  const changed = (d) => (mark(d), onChange?.());
  return (
    <>
      {date && (
        <span className="summary dc-ask">
          <span className="summary-open">
            <span className="summary-role">하루 체크 · {dog.name}</span>
            {isYesterday ? "어제는 기록이 없어! 어제 어땠어?" : "오늘 나 어땠어?"}
          </span>
          <span className="dc-btns">
            <button type="button" className="dc-usual" onClick={() => (saveUsual(dog.id, date), changed(date))}><Ico name="check" size={18} /> {isYesterday ? "평소였어요" : "평소와 같아요"}</button>
            <button type="button" className="dc-diff" onClick={() => setSheet(date)}>다른 게 있었어요</button>
          </span>
          {isYesterday ? (
            <button type="button" className="link-btn summary-more" onClick={() => (saveUnknown(dog.id, date), changed(date))}>기억 안 나요</button>
          ) : (
            <span className="summary-more">평소와 같으면 한 번만 누르면 끝이야</span>
          )}
        </span>
      )}
      {sheet && <DiffSheet dog={dog} date={sheet} initial={getDay(dog.id, sheet)?.picks} onClose={() => (setSheet(null), onChange?.())} onSaved={() => mark(sheet)} />}
    </>
  );
}

// 오늘 요약 말풍선에 붙일 줄: 오늘 체크 결과와 며칠째 다른 항목
export function dailySummaryLines(dogId, today = todayKey()) {
  const d = getDay(dogId, today);
  if (!d) return [];
  const lines = [["check", "teal", d.status === "usual" ? `오늘은 평소와 같았어 · 이번 달 ${daysThisMonth(dogId, today)}일째 함께 봤어` : `오늘 다른 점: ${Object.entries(d.picks).map(([id, l]) => `${ITEMS.find((i) => i.id === id).label} ${l}`).join(", ")}`]];
  for (const r of runsOf(dogId, today)) lines.push(["alert", "rose", `${r.item.label} 평소와 다른 날 ${r.days}일째 · 병원용 기록에 모여 있어`]);
  return lines;
}

function RedBox() {
  return (
    <div className="info-emergency" role="alert" style={{ marginTop: 10 }}>
      <div className="info-emergency-title"><Ico name="alert" size={18} /> 동물병원에 바로 연락해 보세요</div>
      <div>고른 것 중에 바로 물어봐야 하는 모습이 있어요. 언제부터 어떤 모습인지 말하면 와야 할지 안내받을 수 있어요.</div>
      <div className="info-actions">
        {EMERGENCY.actions.map((a) => (
          <a key={a.url} className="btn-primary" href={a.url} target="_blank" rel="noopener">{a.label}</a>
        ))}
      </div>
    </div>
  );
}

// 다른 점 고르기: 항목을 누르면 그 항목의 선택지만 펼친다. 항목마다 하나씩
export function DiffSheet({ dog, date, initial, onClose, onSaved }) {
  initial ||= {};
  const [picks, setPicks] = useState(initial);
  const [open, setOpen] = useState(() => Object.keys(initial));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const toggleItem = (id) => (open.includes(id) ? (setOpen(open.filter((x) => x !== id)), setPicks(({ [id]: _, ...rest }) => rest)) : setOpen([...open, id]));
  const sig = signalsOf(picks);

  function save() {
    try {
      saveDiff(dog.id, date, picks);
    } catch (e) {
      return setError(e.message);
    }
    onSaved();
    if (!sig.red.length && !sig.warn.length) return onClose();
    setSaved(true);
  }

  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label="평소와 다른 점">
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">{date === todayKey() ? "오늘" : `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`} 무엇이 달랐어요?</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll" style={{ padding: "4px 16px 18px" }}>
          {saved ? (
            <>
              <div style={{ fontSize: 17, fontWeight: 800, margin: "6px 0 10px" }}>기록했어요</div>
              {sig.red.length > 0 && <RedBox />}
              {sig.warn.map((w) => (
                <p key={w.label} className="dc-warn"><b>{w.item.label} {w.label}</b> · {w.warn}</p>
              ))}
              <p className="faint" style={{ fontSize: 12.5 }}>멍케어는 진단하지 않아요. 걱정되면 동물병원에 물어보세요.</p>
              <button type="button" className="btn-primary" onClick={onClose}>닫기</button>
            </>
          ) : (
            <>
              <p className="subtle" style={{ margin: "0 0 8px" }}>달랐던 것만 눌러요. 안 누른 건 평소와 같았던 걸로 봐요.</p>
              <UsualNote dog={dog} />
              <div className="chip-wrap" style={{ marginBottom: 6 }}>
                {ITEMS.map((i) => (
                  <button key={i.id} type="button" className={`seg${open.includes(i.id) ? " on" : ""}`} aria-pressed={open.includes(i.id)} onClick={() => toggleItem(i.id)}>
                    <Ico name={i.ico} size={15} /> {i.label}
                  </button>
                ))}
              </div>
              {ITEMS.filter((i) => open.includes(i.id)).map((i) => (
                <div key={i.id} className="ci-q">
                  <div className="xs-label">{i.label}</div>
                  <div className="chip-wrap">
                    {i.options.map((o) => {
                      const on = picks[i.id] === o.label;
                      return (
                        <button key={o.label} type="button" className={`seg${on ? " on" : ""}${o.red ? " red" : ""}`} aria-pressed={on} onClick={() => setPicks((p) => ({ ...p, [i.id]: on ? undefined : o.label }))}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {error && <p className="error-text">{error}</p>}
              <button type="button" className="btn-primary" style={{ marginTop: 8 }} onClick={save}>기록하기</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// 평소 모습: 한 번 적어 두면 "다른 점"을 고를 때 옆에 보이고, 병원용 기록 기본 정보에 들어간다(ZOE의 '평소 나' 방식)
function UsualNote({ dog }) {
  const [text, setText] = useState(dog.usual || "");
  const [editing, setEditing] = useState(false);
  if (!editing)
    return (
      <div className="dc-usual-note">
        {dog.usual ? <span><b>{dog.name} 평소</b> · {text}</span> : <span className="faint">평소 모습을 적어 두면 비교하기 쉬워요</span>}
        <button type="button" className="link-btn" style={{ margin: 0, flexShrink: 0 }} onClick={() => setEditing(true)}>{dog.usual ? "고치기" : "적어 두기"}</button>
      </div>
    );
  return (
    <div className="dc-usual-note col">
      <textarea rows={2} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="예: 하루 두 번 다 먹음, 변은 하루 2번 단단함, 산책 30분" aria-label="평소 모습" />
      <button type="button" className="btn-ghost small" onClick={() => (saveDog({ ...dog, usual: text.trim() }), (dog.usual = text.trim()), setEditing(false))}>저장</button>
    </div>
  );
}
