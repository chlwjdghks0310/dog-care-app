import { useEffect, useState } from "react";
import { todayKey } from "../utils/date";
import {
  getCustomSchedules,
  addCustomSchedule,
  updateCustomSchedule,
  deleteCustomSchedule,
} from "../services/customSchedules";
import Ico from "../components/Ico";
import { checkAlarmPlan, saveCheckAlarm } from "../services/routine";
import { CATS, getNotifPrefs, saveNotifPrefs } from "../services/notifPrefs";
import {
  isNotificationSupported,
  getPermission,
  requestPermission,
  syncPushAlarms,
  isPushSupported,
  getPushSubscription,
  subscribeToPush,
  sendTestPush,
} from "../services/notifications";

export default function AlarmSettings({ dog, onBack }) {
  const [schedules, setSchedules] = useState(() => getCustomSchedules(dog.id));
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [repeat, setRepeat] = useState("daily"); // daily | once
  const [date, setDate] = useState(todayKey);
  const [notifPermission, setNotifPermission] = useState(getPermission());
  const [pushStatus, setPushStatus] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  useEffect(() => {
    if (isPushSupported() && getPermission() === "granted") getPushSubscription().then((sub) => setPushOn(Boolean(sub))).catch(() => {});
  }, []);

  function refresh() {
    setSchedules(getCustomSchedules(dog.id));
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    addCustomSchedule(dog.id, { title: title.trim(), time, date: repeat === "once" ? date : undefined });
    setTitle("");
    refresh();
  }

  function toggleEnabled(alarm) {
    updateCustomSchedule(dog.id, alarm.id, { enabled: !alarm.enabled });
    refresh();
  }

  function handleDelete(id) {
    deleteCustomSchedule(dog.id, id);
    refresh();
  }

  // 알림 켜기 하나로: 푸시가 되는 기기는 앱이 꺼져도 오는 푸시까지, 아니면 앱을 켜 둔 동안 뜨는 알림만
  async function handleEnable() {
    setPushBusy(true);
    setPushStatus("");
    try {
      if (isPushSupported()) {
        await subscribeToPush();
        setPushOn(true);
      } else {
        const result = await requestPermission();
        if (result !== "granted") throw new Error("알림 권한을 허용해야 켤 수 있어요.");
      }
      setNotifPermission(getPermission());
      syncPushAlarms();
    } catch (err) {
      setPushStatus(err.message);
    } finally {
      setPushBusy(false);
    }
  }

  async function handleTestPush() {
    setPushBusy(true);
    setPushStatus("");
    try {
      const { sent, total } = await sendTestPush();
      setPushStatus(sent > 0 ? `${total}개 기기로 보냈어요. 잠시 후 알림이 뜨는지 확인해보세요.` : "보낼 수 있는 기기가 없어요.");
    } catch (err) {
      setPushStatus(err.message);
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 오늘 할 일로
      </button>
      <div className="h1">알림·알람</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        원하는 시각에 알림으로 알려드려요. 알림 소리는 휴대폰 알림음 설정을 따라요.
      </p>

      {isNotificationSupported() && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="h2">알림 받기</div>
          {notifPermission === "granted" && (pushOn || !isPushSupported()) ? (
            <>
              <div className="subtle" style={{ marginBottom: 10 }}>
                <Ico name="check" size={16} style={{ color: "var(--success)" }} /> 알림이 켜져 있어요. {pushOn ? "앱을 꺼 둬도 약·밥·알람 시간에 알려 드려요." : "앱을 열어 둔 동안 알려 드려요."}
              </div>
              {pushOn && (
                <button className="btn-ghost small" onClick={handleTestPush} disabled={pushBusy}>
                  {pushBusy ? "보내는 중…" : "알림 확인하기"}
                </button>
              )}
            </>
          ) : (
            <>
              <p className="subtle" style={{ marginBottom: 10 }}>
                앱을 꺼 둬도 약·밥·알람 시간에 알림이 와요. 아이폰은 사파리 공유 버튼 → "홈 화면에 추가"로 설치한 앱에서만 켤 수 있어요.
              </p>
              <button className="btn-primary" onClick={handleEnable} disabled={pushBusy}>
                {pushBusy ? "켜는 중…" : <><Ico name="bell" size={18} /> 알림 켜기</>}
              </button>
            </>
          )}
          {pushStatus && <p className="faint" style={{ margin: "8px 0 0" }}>{pushStatus}</p>}
        </div>
      )}

      <CheckAlarmCard />
      <NotifKindsCard />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">새 알람 추가</div>
        <form onSubmit={handleAdd}>
          <div className="field">
            <label>제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 아침 훈련 시간" />
          </div>
          <div className="field">
            <label>시각</label>
            <input type="time" value={time} aria-label="알람 시각" onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="field">
            <label>반복</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[["daily", "매일"], ["once", "하루만"]].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="chip"
                  style={{
                    flex: 1,
                    border: "1px solid var(--border)",
                    background: repeat === key ? "var(--accent-soft)" : "transparent",
                    color: repeat === key ? "var(--accent-strong)" : "var(--text-soft)",
                  }}
                  onClick={() => setRepeat(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {repeat === "once" && (
              <input type="date" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} style={{ marginTop: 8 }} />
            )}
          </div>
          <button type="submit" className="btn-primary">알람 추가</button>
        </form>
      </div>

      <div className="card">
        <div className="h2">등록된 알람</div>
        {schedules.length === 0 ? (
          <p className="subtle">아직 등록된 알람이 없어요.</p>
        ) : (
          schedules.map((alarm) => (
            <div
              key={alarm.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{alarm.time} · {alarm.title}</div>
                <div className="faint">
                  {alarm.date ? `${alarm.date.slice(5).replace("-", "/")} 하루만${alarm.date < todayKey() ? " (지남)" : ""}` : "매일"}
                </div>
              </div>
              <input type="checkbox" checked={alarm.enabled} onChange={() => toggleEnabled(alarm)} aria-label={`${alarm.title} 알람 켜기`} style={{ width: 24, height: 24 }} />
              <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={() => handleDelete(alarm.id)}>
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 하루 체크("오늘 어땠어요?") 알림: 하루 한 번, 시각은 보호자가 고른다. 체크한 날은 오지 않는다
function CheckAlarmCard() {
  const [plan, setPlan] = useState(() => checkAlarmPlan());
  const [time, setTime] = useState(plan?.time || "20:00");
  function save(on, t = time) {
    saveCheckAlarm({ on, time: t });
    setPlan(checkAlarmPlan());
    syncPushAlarms();
  }
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="h2">하루 체크 알림</div>
      <p className="subtle" style={{ margin: "0 0 10px" }}>“오늘 어땠어요?” 알림을 하루 한 번 보내요. 이미 체크한 날은 오지 않아요.</p>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, flex: 1 }}>
          <input type="checkbox" checked={Boolean(plan)} onChange={(e) => save(e.target.checked)} />
          받기
        </label>
        <input type="time" value={time} disabled={!plan} aria-label="하루 체크 알림 시각" onChange={(e) => e.target.value && (setTime(e.target.value), save(true, e.target.value))} />
      </div>
      {plan?.days && <p className="faint" style={{ margin: "8px 0 0" }}>지금은 외출 시간에 맞춰 나가는 요일에만 와요. 시각을 고르면 매일 그 시각에 와요.</p>}
    </div>
  );
}

// 알림 종류별 켜고 끄기 + 조용한 시간(약·직접 만든 알람은 조용한 시간에도 울림)
function NotifKindsCard() {
  const [prefs, setPrefs] = useState(getNotifPrefs);
  function set(patch) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveNotifPrefs(next);
    syncPushAlarms();
  }
  const q = prefs.quiet;
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="h2">받을 알림</div>
      {CATS.map((c) => (
        <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, padding: "6px 0" }}>
          <input type="checkbox" checked={prefs[c.id] !== false} onChange={(e) => set({ [c.id]: e.target.checked })} />
          {c.label}
        </label>
      ))}
      <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 10 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
          <input type="checkbox" checked={q.on} onChange={(e) => set({ quiet: { ...q, on: e.target.checked } })} />
          조용한 시간
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 0 26px" }}>
          <input type="time" value={q.from} disabled={!q.on} aria-label="조용한 시간 시작" onChange={(e) => e.target.value && set({ quiet: { ...q, from: e.target.value } })} />
          <span className="faint">~</span>
          <input type="time" value={q.to} disabled={!q.on} aria-label="조용한 시간 끝" onChange={(e) => e.target.value && set({ quiet: { ...q, to: e.target.value } })} />
        </div>
        <p className="faint" style={{ margin: "8px 0 0" }}>이 시간엔 추천 알림(할 일·사료 예고·리포트)을 보내지 않아요. 약·밥 시간·직접 만든 알람은 그대로 울려요.</p>
      </div>
    </div>
  );
}
