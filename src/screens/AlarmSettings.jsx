import { useState } from "react";
import {
  getCustomSchedules,
  addCustomSchedule,
  updateCustomSchedule,
  deleteCustomSchedule,
} from "../services/customSchedules";
import { ALARM_SOUND_LIST, playAlarmSound, resumeAudioContext } from "../services/alarmSounds";
import { isNotificationSupported, getPermission, requestPermission } from "../services/notifications";

const SOUND_GROUPS = [...new Set(ALARM_SOUND_LIST.map((s) => s.group))];

export default function AlarmSettings({ dog, onBack }) {
  const [schedules, setSchedules] = useState(() => getCustomSchedules(dog.id));
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [sound, setSound] = useState(ALARM_SOUND_LIST[0].id);
  const [notifPermission, setNotifPermission] = useState(getPermission());

  function refresh() {
    setSchedules(getCustomSchedules(dog.id));
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    resumeAudioContext();
    addCustomSchedule(dog.id, { title: title.trim(), time, sound });
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

  async function handleEnableNotifications() {
    resumeAudioContext();
    const result = await requestPermission();
    setNotifPermission(result);
  }

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 홈으로
      </button>
      <div className="h1">알림 / 알람</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        원하는 시각에 소리와 함께 알려드려요. 앱(브라우저 탭)이 켜져 있는 동안만 동작해요.
      </p>

      {isNotificationSupported() && notifPermission !== "granted" && (
        <button className="btn-ghost" style={{ width: "100%", marginBottom: 14 }} onClick={handleEnableNotifications}>
          🔔 알림 권한 켜기 (팝업 알림도 함께 받기)
        </button>
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
            <label>알람 소리</label>
            {SOUND_GROUPS.map((group) => (
              <div key={group} style={{ marginBottom: 8 }}>
                <div className="faint" style={{ marginBottom: 4 }}>{group}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ALARM_SOUND_LIST.filter((s) => s.group === group).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="chip"
                      style={{
                        border: "1px solid var(--border)",
                        background: sound === s.id ? "var(--accent-soft)" : "transparent",
                        color: sound === s.id ? "var(--accent-strong)" : "var(--text-soft)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      onClick={() => {
                        setSound(s.id);
                        playAlarmSound(s.id);
                      }}
                    >
                      {s.label} <span aria-hidden="true">▶</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
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
                <div className="faint">{ALARM_SOUND_LIST.find((s) => s.id === alarm.sound)?.label}</div>
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
