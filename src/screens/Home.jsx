import { useEffect, useMemo, useState } from "react";
import { calculateAge, formatAge } from "../utils/age";
import { todayKey, formatKoreanDate } from "../utils/date";
import { getTodayChecklist, getThisWeekHighlights, getUpcoming } from "../services/careEngine";
import { toggleScheduleItem } from "../services/scheduleRepository";
import { getPermission, isNotificationSupported, requestPermission } from "../services/notifications";
import { getCategoryIcon } from "../data/categoryIcons";
import { resizeImageFile } from "../utils/image";
import { saveDog } from "../services/dogRepository";

export default function Home({ dog, onOpenWeek, onOpenHealth, onOpenFeeding, onOpenAlarms, onOpenInfo, onUpdateDog }) {
  const [dateKey, setDateKey] = useState(todayKey());
  const [checklist, setChecklist] = useState([]);
  const [notifPermission, setNotifPermission] = useState(getPermission());

  // 날짜가 자정을 넘어가면 새로운 오늘 일정을 다시 불러온다.
  useEffect(() => {
    const timer = setInterval(() => {
      const key = todayKey();
      setDateKey((prev) => (prev === key ? prev : key));
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setChecklist(getTodayChecklist(dog, dateKey));
  }, [dog, dateKey]);

  const age = useMemo(() => calculateAge(dog.birthDate, new Date(dateKey)), [dog.birthDate, dateKey]);
  const weekHighlights = useMemo(() => getThisWeekHighlights(dog).slice(0, 2), [dog]);
  const upcoming = useMemo(() => getUpcoming(dog).slice(0, 2), [dog]);

  const groupedChecklist = useMemo(() => {
    const map = new Map();
    for (const item of checklist) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category).push(item);
    }
    return [...map.entries()];
  }, [checklist]);

  function handleToggle(itemId) {
    const next = toggleScheduleItem(dog.id, dateKey, itemId);
    if (next) setChecklist(next);
  }

  const doneCount = checklist.filter((i) => i.completed).length;

  async function handleEnableNotifications() {
    const result = await requestPermission();
    setNotifPermission(result);
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const photo = await resizeImageFile(file);
    const updated = saveDog({ ...dog, photo });
    onUpdateDog?.(updated);
  }

  return (
    <div className="screen">
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <label style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}>
            {dog.photo ? (
              <img
                src={dog.photo}
                alt={`${dog.name} 사진`}
                style={{ width: 84, height: 84, borderRadius: 20, objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 20,
                  background: "var(--accent-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                }}
                aria-hidden="true"
              >
                🐶
              </div>
            )}
            <span
              style={{
                position: "absolute",
                bottom: -4,
                right: -4,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "50%",
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
              }}
            >
              📷
            </span>
            <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
          </label>

          <div style={{ flex: 1 }}>
            <div className="h1" style={{ marginBottom: 4 }}>{dog.name}</div>
            <span className="chip">{formatAge(age)}</span>
            <span className="faint" style={{ marginLeft: 8 }}>{dog.breed}</span>
          </div>

          {isNotificationSupported() && notifPermission !== "granted" && (
            <button className="btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleEnableNotifications}>
              🔔
            </button>
          )}
          {isNotificationSupported() && notifPermission === "granted" && (
            <span className="faint" title="정해진 시간에 케어 알림을 보내드려요">🔔</span>
          )}
        </div>
      </div>

      <div className="quick-actions" style={{ marginBottom: 14 }}>
        <button className="quick-tile" onClick={onOpenHealth}>
          <span className="quick-tile-icon" aria-hidden="true">🩺</span>
          <span className="quick-tile-label">건강 체크</span>
        </button>
        <button className="quick-tile" onClick={onOpenFeeding}>
          <span className="quick-tile-icon" aria-hidden="true">🍚</span>
          <span className="quick-tile-label">사료 계산기</span>
        </button>
        <button className="quick-tile" onClick={onOpenAlarms}>
          <span className="quick-tile-icon" aria-hidden="true">⏰</span>
          <span className="quick-tile-label">알림·알람</span>
        </button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="h2">오늘 해야 할 일</div>
          <span className="faint">{formatKoreanDate(dateKey)}</span>
        </div>
        {checklist.length === 0 ? (
          <p className="subtle">오늘 등록된 필수 일과가 없어요. 이번 주 핵심을 확인해보세요.</p>
        ) : (
          <>
            <p className="faint" style={{ marginBottom: 4 }}>{doneCount}/{checklist.length} 완료</p>
            {groupedChecklist.map(([category, items]) => (
              <div key={category} className="category-group">
                <div className="category-label">
                  <span aria-hidden="true">{getCategoryIcon(category)}</span>
                  <span>{category}</span>
                </div>
                {items.map((item) => (
                  <label key={item.id} className={`checklist-item${item.completed ? " completed" : ""}`}>
                    <input type="checkbox" checked={item.completed} onChange={() => handleToggle(item.id)} />
                    <div>
                      <div className="checklist-title" style={{ fontWeight: 600 }}>{item.title}</div>
                      {item.description && <div className="subtle">{item.description}</div>}
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="h2">이번 주 핵심</div>
          <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12.5 }} onClick={onOpenWeek}>
            더보기
          </button>
        </div>
        {weekHighlights.length === 0 ? (
          <p className="subtle">이번 주 특별히 챙길 항목이 없어요.</p>
        ) : (
          weekHighlights.map((rule) => (
            <div key={rule.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{rule.title}</div>
              <div className="subtle">{rule.why}</div>
            </div>
          ))
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="h2">다가오는 일정</div>
          {upcoming.map((rule) => (
            <div key={rule.id} className="subtle" style={{ marginBottom: 6 }}>
              약 {rule.startsInWeeks}주 후 · {rule.title}
            </div>
          ))}
        </div>
      )}

      <button className="btn-ghost" style={{ width: "100%" }} onClick={onOpenInfo}>
        📖 월령별 케어 정보 더 보기
      </button>
    </div>
  );
}
