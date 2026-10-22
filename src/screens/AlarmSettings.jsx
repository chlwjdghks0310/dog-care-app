import { useEffect, useState } from "react";
import { todayKey } from "../utils/date";
import {
  getCustomSchedules,
  addCustomSchedule,
  updateCustomSchedule,
  deleteCustomSchedule,
} from "../services/customSchedules";
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
        ← 체크리스트로
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
              <p className="subtle" style={{ marginBottom: 10 }}>
                ✅ 알림이 켜져 있어요. {pushOn ? "앱을 꺼 둬도 약·밥·알람 시간에 알려 드려요." : "앱을 열어 둔 동안 알려 드려요."}
              </p>
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
                {pushBusy ? "켜는 중…" : "🔔 알림 켜기"}
              </button>
            </>
          )}
          {pushStatus && <p className="faint" style={{ margin: "8px 0 0" }}>{pushStatus}</p>}
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">새 알람 추가</div>
        <form onSubmit={handleAdd}>
          <div className="field">
            <label>제목</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 아침 훈련 시간" />
          </div>
          <div className="field">
            <label>시각</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
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
              <input type="checkbox" checked={alarm.enabled} onChange={() => toggleEnabled(alarm)} style={{ width: 20, height: 20 }} />
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
