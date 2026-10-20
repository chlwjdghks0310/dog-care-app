import { useState } from "react";
import { createPortal } from "react-dom";
import MonthGrid from "./MonthGrid";
import { EVENT_KINDS, REPEATS, ALARMS, kindOf, saveEvent, removeEvent } from "../services/calendarEvents";
import { syncPushAlarms } from "../services/notifications";

const WEEK = "일월화수목금토";
export const dateLabel = (key) => {
  const d = new Date(`${key}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEK[d.getDay()]})`;
};
export const timeLabel = (t) => {
  if (!t) return "종일";
  const [h, m] = t.split(":").map(Number);
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(m).padStart(2, "0")}`;
};

// 일정 추가·고치기 시트 — 무엇을 → 언제 → 알림 카드를 쌓아 두고 한 번에 하나만 펼친다. 접힌 카드엔 고른 내용 요약.
// initial: { start, event? } (event가 있으면 고치기)
export default function EventSheet({ dog, initial, onClose, onSaved }) {
  const ev = initial.event || {};
  const [open, setOpen] = useState(ev.id ? "" : "what");
  const [kind, setKind] = useState(ev.kind || "");
  const [title, setTitle] = useState(ev.title || "");
  const [memo, setMemo] = useState(ev.memo || "");
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(ev.endDate || "");
  const [time, setTime] = useState(ev.time || "");
  const [repeat, setRepeat] = useState(ev.repeat || "");
  const [alarm, setAlarm] = useState(ev.alarm || "");
  const [month, setMonth] = useState(() => new Date(`${initial.start}T00:00:00`));
  const [error, setError] = useState("");

  const k = kindOf({ kind });
  // 하루: 누른 날이 그 날. 며칠: 첫 탭 = 시작, 다음 탭(시작 이후) = 끝, 그다음 탭은 새로 시작.
  const [multi, setMulti] = useState(Boolean(ev.endDate));
  const [awaitEnd, setAwaitEnd] = useState(false); // 며칠: 시작일을 누른 뒤 끝나는 날을 기다리는 중
  function pickDate(key) {
    if (multi && awaitEnd && key > start) {
      setEnd(key);
      return setAwaitEnd(false);
    }
    setStart(key);
    setEnd("");
    setAwaitEnd(multi);
  }
  const inRange = (key) => (end && key >= start && key <= end ? (key === start ? "mg-range start" : key === end ? "mg-range end" : "mg-range mid") : "");
  const nights = end ? Math.round((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000) : 0;

  const whenSummary = `${dateLabel(start)}${end ? ` ~ ${dateLabel(end)} (${nights}박)` : ""} · ${timeLabel(time)}${repeat ? ` · ${REPEATS.find((r) => r[0] === repeat)[1]}` : ""}`;
  const alarmSummary = ALARMS.find((a) => a[0] === alarm)[1];

  function save() {
    const t = title.trim() || k?.label || "";
    if (!t) {
      setOpen("what");
      return setError("무슨 일정인지 골라 주거나 적어 주세요.");
    }
    if (multi && !end) {
      setOpen("when");
      return setError("끝나는 날도 눌러 주세요.");
    }
    if (alarm === "before1h" && !time) {
      setOpen("alarm");
      return setError("'1시간 전' 알림은 시간을 정해야 쓸 수 있어요.");
    }
    try {
      saveEvent(dog.id, start, { id: ev.id, title: t, kind, color: k?.color || ev.color, time, endDate: multi ? end : "", repeat: multi ? "" : repeat, memo: memo.trim(), alarm });
      syncPushAlarms();
      onSaved(start);
    } catch (err) {
      setError(err.message);
    }
  }

  function remove() {
    if (!confirm(ev.repeat ? "반복 일정 전체를 지울까요?" : "이 일정을 지울까요?")) return;
    removeEvent(dog.id, initial.start, ev.id);
    syncPushAlarms();
    onSaved(initial.start);
  }

  // 컴포넌트가 아니라 그리는 함수 — 안에 있는 입력칸이 글자마다 새로 만들어져 포커스를 잃지 않게
  const section = (id, label, summary, children) => (
    <div className={`es-card${open === id ? " open" : ""}`}>
      <button type="button" className="es-card-head" aria-expanded={open === id} onClick={() => setOpen(open === id ? "" : id)}>
        <span className="es-card-label">{label}</span>
        {open !== id && <span className="es-card-sum">{summary}</span>}
      </button>
      {open === id && <div className="es-card-body">{children}</div>}
    </div>
  );

  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label={ev.id ? "일정 고치기" : "일정 추가"}>
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">{ev.id ? "일정 고치기" : "일정 추가"}</div>
          <span style={{ width: 36 }} />
        </div>

        <div className="es-scroll">
          {section("what", "무엇을", `${k?.icon || "📝"} ${title.trim() || k?.label || "골라 주세요"}`, <>
            <div className="es-big">어떤 일정인가요?</div>
            <div className="es-kinds">
              {EVENT_KINDS.map((x) => (
                <button key={x.id} type="button" className={`es-kind${kind === x.id ? " on" : ""}`} aria-pressed={kind === x.id} onClick={() => {
                    setKind(x.id);
                    if (!title.trim() || EVENT_KINDS.some((y) => y.label === title)) setTitle(x.label);
                    if (x.id === "stay" && !ev.id) (setMulti(true), setAwaitEnd(true));
                  }}>
                  <span aria-hidden="true">{x.icon}</span>
                  {x.label}
                </button>
              ))}
            </div>
            <input className="es-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목 (예: 행복동물병원 재진)" maxLength={60} aria-label="일정 제목" />
            <textarea className="es-input" rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (예: 12시간 금식, 진료 수첩 챙기기)" maxLength={300} aria-label="메모" />
            <button type="button" className="btn-primary" onClick={() => setOpen("when")}>다음</button>
          </>)}

          {section("when", "언제", whenSummary, <>
            <div className="es-big">날짜를 골라 주세요</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button type="button" className={`seg${!multi ? " on" : ""}`} onClick={() => (setMulti(false), setEnd(""), setAwaitEnd(false))}>하루</button>
              <button type="button" className={`seg${multi ? " on" : ""}`} onClick={() => (setMulti(true), setRepeat(""), setAwaitEnd(!end))}>며칠 (호텔링·입원 등)</button>
            </div>
            {multi && <p className="faint" style={{ marginTop: 0 }}>{end ? "다시 누르면 새로 고를 수 있어요." : awaitEnd ? `${dateLabel(start)}부터 — 끝나는 날을 누르세요.` : "시작일을 누르고, 끝나는 날을 누르세요."}</p>}
            <MonthGrid monthDate={month} onMonthChange={setMonth} selectedDateKey={start} onSelect={pickDate} cellClass={inRange} />
            <div className="es-row">
              <span className="es-row-label">시간</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button type="button" className={`seg${!time ? " on" : ""}`} style={{ flex: "0 0 auto", padding: "8px 12px" }} onClick={() => setTime("")}>종일</button>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="시간" className="es-time" />
              </div>
            </div>
            {!multi && (
              <div className="es-row">
                <span className="es-row-label">반복</span>
                <div className="chip-wrap">
                  {REPEATS.map(([id, label]) => (
                    <button key={id} type="button" className={`seg${repeat === id ? " on" : ""}`} onClick={() => setRepeat(id)}>{label}</button>
                  ))}
                </div>
              </div>
            )}
            <button type="button" className="btn-primary" onClick={() => setOpen("alarm")}>다음</button>
          </>)}

          {section("alarm", "알림", alarmSummary, <>
            <div className="es-big">미리 알려 드릴까요?</div>
            <div className="es-list">
              {ALARMS.map(([id, label]) => (
                <button key={id} type="button" className={`es-option${alarm === id ? " on" : ""}`} aria-pressed={alarm === id} disabled={id === "before1h" && !time} onClick={() => setAlarm(id)}>
                  {label}
                  {id === "before1h" && !time && <span className="faint"> (시간을 정하면 쓸 수 있어요)</span>}
                  {alarm === id && <span aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
            <p className="faint">{repeat ? "반복 일정은 매번 다음 회차에 맞춰 알려 드려요. " : ""}알림 권한이 꺼져 있어도 일정은 저장돼요.</p>
          </>)}
          {error && <p className="error-text" role="alert" style={{ padding: "0 4px" }}>{error}</p>}
        </div>

        <div className="es-foot">
          {ev.id ? (
            <button type="button" className="link-btn" style={{ color: "var(--danger)", margin: 0 }} onClick={remove}>삭제</button>
          ) : (
            <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => (setKind(""), setTitle(""), setMemo(""), setEnd(""), setMulti(false), setTime(""), setRepeat(""), setAlarm(""), setOpen("what"))}>전체 지우기</button>
          )}
          <button type="button" className="btn-primary es-save" onClick={save}>저장</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
