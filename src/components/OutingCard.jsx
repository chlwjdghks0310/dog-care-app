import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";
import { outingState, leaveNow, backNow, durationLabel, backTip, checkedInToday, getTodayCheckin, markCheckedIn, getRoutine, saveRoutine, DEFAULT_ROUTINE } from "../services/routine";
import { saveRecord, deleteRecord, getRecords, newRecordId, localNow } from "../services/records";
import { syncPushAlarms } from "../services/notifications";

// 비서 첫 화면의 외출 카드: [다녀올게] → "혼자 n시간째" [왔어] → [30초 체크인]. 밖에 오래 있는 보호자가 아침·저녁에 한 번씩만 누르면 되게.
export default function OutingCard({ dog, onAsk, openCheckin, onCheckinClose }) {
  const [, setTick] = useState(0);
  const [sheet, setSheet] = useState(openCheckin ? "checkin" : null); // "checkin" | "routine" | null
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60 * 1000); // "n시간째"를 1분마다 새로
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (openCheckin) setSheet("checkin"); // 저녁 체크인 알림을 눌러 들어온 경우
  }, [openCheckin]);

  const s = outingState();
  const done = checkedInToday(dog.id);
  const evening = new Date().getHours() >= 17;
  const refresh = () => setTick((n) => n + 1);
  const close = () => (setSheet(null), onCheckinClose?.());

  let title, sub, action;
  if (s.state === "away") {
    title = `${dog.name} 혼자 ${durationLabel(s.minutes)}째`;
    sub = s.estimated ? `평소 나가는 시각(${s.since}) 기준이에요` : `${s.since}에 나갔어요`;
    action = { label: "왔어", run: () => (backNow(), refresh()) };
  } else if (s.state === "back" && !done) {
    title = `오늘 ${durationLabel(s.minutes)} 혼자 있었어요`;
    sub = backTip(s.minutes);
    action = { label: "30초 체크인", run: () => setSheet("checkin") };
  } else if (done) {
    // 잘못 눌렀을 수 있으니 오늘 안에는 다시 열어 고칠 수 있다(고른 게 채워져 있고, 저장하면 오늘 체크인 기록을 바꾼다)
    title = "오늘 체크인 완료";
    sub = s.state === "back" ? `혼자 ${durationLabel(s.minutes)} · 고칠 게 있으면 다시 하기` : "고칠 게 있으면 다시 하기";
    action = { label: "다시 하기", run: () => setSheet("checkin") };
  } else if (s.state === "back") {
    title = `오늘 ${durationLabel(s.minutes)} 혼자 있었어요`;
    sub = "내일 아침 나갈 때 또 눌러 주세요";
  } else {
    title = evening ? `${dog.name} 오늘 어땠어요?` : "외출할 때 눌러 주세요";
    sub = evening ? "밥·배변·산책을 30초에 기록해요" : `${dog.name}가 혼자 있는 시간을 챙겨 줄게요`;
    action = evening ? { label: "30초 체크인", run: () => setSheet("checkin") } : { label: "다녀올게", run: () => (leaveNow(), refresh()) };
  }

  return (
    <>
      <div className="outing-card">
        <span className="outing-ico">
          <Ico name={done ? "check" : s.state === "away" ? "timer" : "house"} size={20} />
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
      {sheet === "checkin" && <CheckinSheet dog={dog} onClose={close} onAsk={onAsk} onDone={(result) => (markCheckedIn(dog.id, result), refresh())} />}
      {sheet === "routine" && <RoutineSheet onClose={() => setSheet(null)} />}
    </>
  );
}

const MEAL = { "다 먹었어": "평소", 남겼어: "평소보다 적음", "안 먹었어": "평소보다 적음" };
const STOOL_PICK = ["정상", "무름", "설사", "못 봤어"];
const URINE_PICK = ["정상", "실수했어", "못 봤어"];
const ODD = ["토했어", "기운 없어", "물건 망가뜨림", "많이 짖었대요"];
const WALK = ["못 했어", "10분", "20분", "30분", "1시간"];

// 저녁 체크인: 버튼만 눌러 기록 여러 개를 한 번에. 고른 것만 기록하고, 프로필에서 직접 적은 기록과 같은 모양으로 저장한다.
function CheckinSheet({ dog, onClose, onDone, onAsk }) {
  const [prev] = useState(() => getTodayCheckin(dog.id)); // 오늘 이미 했으면 고른 걸 채우고, 저장할 때 그때 만든 기록을 바꾼다
  const p = prev?.picks || {};
  const [meal, setMeal] = useState(p.meal || "");
  const [stool, setStool] = useState(p.stool || "");
  const [urine, setUrine] = useState(p.urine || "");
  const [odd, setOdd] = useState(p.odd || []);
  const [walk, setWalk] = useState(p.walk || "");
  const [saved, setSaved] = useState(null); // 저장한 기록 수
  const [error, setError] = useState("");

  const toggleOdd = (v) => setOdd((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));
  const concern = meal === "안 먹었어" || odd.includes("토했어") || odd.includes("기운 없어") || stool === "설사";

  function save() {
    const at = localNow();
    const rec = (type, data, memo = "") => ({ id: newRecordId(), type, at, data, memo, photos: [] });
    const list = [];
    if (meal) list.push(rec("meal", { appetite: MEAL[meal] }, meal === "안 먹었어" ? "저녁에 보니 거의 안 먹음" : ""));
    const st = STOOL_PICK.includes(stool) && stool !== "못 봤어" ? stool : "";
    const ur = urine === "정상" ? "정상" : urine === "실수했어" ? "실수" : "";
    if (st || ur) list.push(rec("potty", { ...(st && { stool: st }), ...(ur && { urine: ur }) }));
    const kinds = [odd.includes("토했어") && "구토", odd.includes("기운 없어") && "기운 없음"].filter(Boolean);
    if (kinds.length) list.push(rec("symptom", { kinds }, "저녁 체크인에서 기록"));
    const alone = odd.filter((o) => !["토했어", "기운 없어"].includes(o));
    if (alone.length) list.push(rec("condition", {}, `혼자 있을 때: ${alone.join(", ")}`));
    const walkMin = { "10분": 10, "20분": 20, "30분": 30, "1시간": 60 }[walk];
    if (walkMin) list.push(rec("vital", { metric: "walk", value: walkMin }));
    if (!list.length) return setError("하나 이상 골라 주세요.");
    try {
      // 다시 하기: 지난번 체크인 기록(아직 남아 있는 것만)을 지우고 새로 저장 — 같은 날 기록이 두 번 쌓이지 않게
      const alive = new Set(getRecords(dog.id).map((r) => r.id));
      (prev?.ids || []).filter((id) => alive.has(id)).forEach((id) => deleteRecord(dog.id, id));
      list.forEach((r) => saveRecord(dog.id, r));
    } catch (e) {
      return setError(e.message);
    }
    onDone({ ids: list.map((r) => r.id), picks: { meal, stool, urine, odd, walk } });
    syncPushAlarms(); // 산책을 기록했으면 오늘 산책 알람은 건너뛰게
    setSaved(list.length);
  }

  const Pick = ({ label, options, value, onPick, multi }) => (
    <div className="ci-q">
      <div className="xs-label">{label}</div>
      <div className="chip-wrap">
        {options.map((o) => {
          const on = multi ? value.includes(o) : value === o;
          return (
            <button key={o} type="button" className={`seg${on ? " on" : ""}`} aria-pressed={on} onClick={() => onPick(on && !multi ? "" : o)}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );

  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label="저녁 체크인">
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">{dog.name} 오늘 어땠어요?</div>
          <span style={{ width: 36 }} />
        </div>
        {saved ? (
          <div className="es-scroll" style={{ padding: "8px 16px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, margin: "8px 0" }}>{prev ? `기록 ${saved}개로 고쳤어요` : `기록 ${saved}개를 남겼어요`}</div>
            <p className="subtle" style={{ margin: 0 }}>프로필 → 건강 기록에서 보거나 고칠 수 있어요.</p>
            {concern && onAsk && (
              <button type="button" className="btn-ghost" style={{ marginTop: 14 }} onClick={() => (onAsk(`오늘 저녁에 보니 ${[meal === "안 먹었어" && "밥을 거의 안 먹었고", stool === "설사" && "설사를 했고", ...odd.filter((o) => ["토했어", "기운 없어"].includes(o))].filter(Boolean).join(", ")} 어떻게 하면 좋을까?`), onClose())}>
                비서에게 어떻게 할지 물어보기
              </button>
            )}
            <button type="button" className="btn-primary" style={{ marginTop: 10 }} onClick={onClose}>닫기</button>
          </div>
        ) : (
          <div className="es-scroll" style={{ padding: "4px 16px 16px" }}>
            <p className="subtle" style={{ margin: "0 0 4px" }}>{prev ? "오늘 고른 게 채워져 있어요. 고치고 다시 기록하면 바뀌어요." : "본 것만 누르세요. 안 누른 건 기록하지 않아요."}</p>
            <Pick label="밥" options={Object.keys(MEAL)} value={meal} onPick={setMeal} />
            <Pick label="대변 (패드·바닥)" options={STOOL_PICK} value={stool} onPick={setStool} />
            <Pick label="소변" options={URINE_PICK} value={urine} onPick={setUrine} />
            <Pick label="이상한 점 (여러 개 가능)" options={ODD} value={odd} onPick={toggleOdd} multi />
            <Pick label="산책" options={WALK} value={walk} onPick={setWalk} />
            {error && <p className="error-text">{error}</p>}
            <button type="button" className="btn-primary" onClick={save}>기록하기</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 평소 나가고 들어오는 시각 — 버튼을 깜빡해도 이 시각으로 혼자 있는 시간을 어림하고, 들어오는 시각 30분 뒤에 체크인 알림
function RoutineSheet({ onClose }) {
  const [r, setR] = useState(() => getRoutine() || DEFAULT_ROUTINE);
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
          <div className="es-title">평소 외출 시간</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll" style={{ padding: "4px 16px 16px" }}>
          <p className="subtle" style={{ margin: 0 }}>[다녀올게]를 깜빡해도 이 시간으로 혼자 있는 시간을 어림해요.</p>
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
            들어오는 시각 30분 뒤에 저녁 체크인 알림 받기
          </label>
          <button type="button" className="btn-primary" onClick={save}>저장</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
