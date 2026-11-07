import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";
import { outingState, leaveNow, backNow, durationLabel, backTip, aloneSummary, getRoutine, saveRoutine, DEFAULT_ROUTINE, routineAsked, markRoutineAsked } from "../services/routine";
import { syncPushAlarms } from "../services/notifications";
import { BackCheckSheet } from "./DailyCheck";
import { getDay } from "../services/dailyCheck";
import { addDays, toDateKey, todayKey } from "../utils/date";

// 오늘 탭의 외출 카드: [다녀올게] → "혼자 n시간째" [왔어]. 하루 상태 체크는 위의 하루 체크 카드(DailyCheck)가 맡는다.
export default function OutingCard({ dog, onChecked }) {
  const [, setTick] = useState(0);
  const [sheet, setSheet] = useState(null); // "routine" | "routine-ask" | null
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60 * 1000); // "n시간째"를 1분마다 새로
    return () => clearInterval(id);
  }, []);

  const s = outingState();
  const refresh = () => setTick((n) => n + 1);
  // 처음 [다녀올게]: 평소 외출 시간을 한 번만 물어본다(저녁 체크인 알림·혼자 있는 시간 어림에 필요)
  function leave() {
    leaveNow();
    refresh();
    if (!getRoutine() && !routineAsked()) (markRoutineAsked(), setSheet("routine-ask"));
  }

  let title, sub, action;
  if (s.state === "away") {
    title = `${dog.name} 혼자 ${durationLabel(s.minutes)}째`;
    sub = s.estimated ? `평소 나가는 시각(${s.since}) 기준이에요` : `${s.since}에 나갔어요`;
    action = { label: "왔어", run: () => (backNow(), refresh(), setSheet("back-check")) }; // 들어오면 늘 오늘 하루 체크로(사용자 요청 11/7)
  } else if (s.state === "back") {
    title = `오늘 ${durationLabel(s.minutes)} 혼자 있었어요`;
    sub = backTip(s.minutes);
    action = { label: getDay(dog.id, todayKey()) ? "체크 보기" : "하루 체크", run: () => setSheet("back-check") };
  } else {
    title = "외출할 때 눌러 주세요";
    // 최근 7일(어제까지) 평균 혼자 있던 시간 — 쌓이면 보여 준다(방향 정리 결정 4: 평균 외출 시간 + 귀가 체크)
    const t = todayKey();
    const avg = aloneSummary(toDateKey(addDays(new Date(`${t}T00:00:00`), -7)), toDateKey(addDays(new Date(`${t}T00:00:00`), -1)));
    sub = avg ? `최근 7일 평균 혼자 ${durationLabel(avg.avg)} · ${avg.days}일 기록` : `${dog.name} 혼자 있는 시간을 챙겨 줄게요`;
    action = { label: "다녀올게", run: leave };
  }

  return (
    <>
      <div className="outing-card">
        <span className="outing-ico">
          <Ico name={s.state === "away" ? "timer" : "house"} size={20} />
        </span>
        <div className="outing-text">
          <b>{title}</b>
          <span>{sub}</span>
        </div>
        {action && (
          <button type="button" className="outing-btn" onClick={action.run}>
            {action.label}
          </button>
        )}
        <button type="button" className="outing-gear" aria-label="외출 시간·저녁 알림 설정" onClick={() => setSheet("routine")}>
          <Ico name="settings" size={17} />
        </button>
      </div>
      {sheet === "back-check" && <BackCheckSheet dog={dog} alone={outingState().minutes >= 1 ? durationLabel(outingState().minutes) : ""} onClose={() => (setSheet(null), onChecked?.())} />}
      {(sheet === "routine" || sheet === "routine-ask") && <RoutineSheet ask={sheet === "routine-ask"} onClose={() => setSheet(null)} />}
    </>
  );
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 평소 나가고 들어오는 시각 — 버튼을 깜빡해도 이 시각으로 혼자 있는 시간을 어림하고, 들어오는 시각 30분 뒤에 체크인 알림
function RoutineSheet({ onClose, ask }) {
  // 처음 물어볼 때는 방금 누른 시각(10분 단위)을 나가는 시각으로 채워 둔다
  const [r, setR] = useState(() => {
    if (getRoutine()) return getRoutine();
    const d = new Date();
    const m = Math.floor(d.getMinutes() / 10) * 10;
    return ask ? { ...DEFAULT_ROUTINE, leave: `${String(d.getHours()).padStart(2, "0")}:${String(m).padStart(2, "0")}` } : DEFAULT_ROUTINE;
  });
  const set = (patch) => setR((cur) => ({ ...cur, ...patch }));
  function save() {
    saveRoutine(r);
    syncPushAlarms();
    onClose();
  }
  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label="외출 시간 설정">
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">{ask ? "다녀오세요!" : "평소 외출 시간"}</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll" style={{ padding: "4px 16px 16px" }}>
          <p className="subtle" style={{ margin: 0 }}>
            {ask ? "평소 외출 시간도 정해 둘까요? 들어오는 시각 30분 뒤에 하루 체크 알림을 보내 드리고, 버튼을 깜빡한 날도 혼자 있는 시간을 어림해요." : "[다녀올게]를 깜빡해도 이 시간으로 혼자 있는 시간을 어림해요."}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <label className="field" style={{ flex: 1, margin: 0 }}>
              <span className="xs-label">나가는 시각</span>
              <input type="time" value={r.leave} onChange={(e) => e.target.value && set({ leave: e.target.value })} />
            </label>
            <label className="field" style={{ flex: 1, margin: 0 }}>
              <span className="xs-label">들어오는 시각</span>
              <input type="time" value={r.back} onChange={(e) => e.target.value && set({ back: e.target.value })} />
            </label>
          </div>
          <div className="xs-label">나가는 요일</div>
          <div className="chip-wrap">
            {DAYS.map((d, i) => {
              const on = r.days.includes(i);
              return (
                <button key={d} type="button" className={`seg${on ? " on" : ""}`} aria-pressed={on} onClick={() => set({ days: on ? r.days.filter((x) => x !== i) : [...r.days, i].sort() })}>
                  {d}
                </button>
              );
            })}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
            <input type="checkbox" checked={r.remind} onChange={(e) => set({ remind: e.target.checked })} />
            들어오는 시각 30분 뒤에 하루 체크 알림 받기
          </label>
          <button type="button" className="btn-primary" onClick={save}>저장</button>
          {ask && <button type="button" className="btn-ghost" onClick={onClose}>다음에 할게요</button>}
        </div>
      </div>
    </div>,
    document.body
  );
}
