import { useEffect, useMemo, useState } from "react";
import { calculateAge, formatAge } from "../utils/age";
import { todayKey, toDateKey, formatKoreanDate } from "../utils/date";
import { getTodayChecklist, getRulesForDate, getRuleStartDateKey } from "../services/careEngine";
import { toggleScheduleItem } from "../services/scheduleRepository";
import { getEventsByDog, addEvent, updateEventColor, deleteEvent, EVENT_COLORS } from "../services/calendarEvents";
import { getHiddenRules, setRuleHidden } from "../services/ruleOverrides";
import { getRuleById } from "../data/careRules";
import { getCategoryIcon } from "../data/categoryIcons";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function Dot({ color }) {
  return <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />;
}

export default function Calendar({ dog }) {
  const today = todayKey();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(today);
  const [checklist, setChecklist] = useState([]);
  const [events, setEvents] = useState(() => getEventsByDog(dog.id));
  const [hidden, setHidden] = useState(() => getHiddenRules(dog.id));
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventColor, setNewEventColor] = useState(EVENT_COLORS[0]);
  const [colorPickerFor, setColorPickerFor] = useState(null);

  useEffect(() => {
    setChecklist(getTodayChecklist(dog, selectedDateKey));
  }, [dog, selectedDateKey, hidden]);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 달력 그리드에는 사용자가 직접 기록한 일정만 표시한다(앱 추천 일정은 아래 별도 박스에서만 보여줌).
  const dayMarkers = useMemo(() => {
    const map = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const key = toDateKey(new Date(year, month, d));
      const dayEvents = events[key] || [];
      map[key] = { colors: [...new Set(dayEvents.map((e) => e.color || EVENT_COLORS[0]))].slice(0, 3) };
    }
    return map;
  }, [year, month, daysInMonth, events]);

  const selectedRules = useMemo(
    () => getRulesForDate(dog, selectedDateKey).filter((r) => !hidden[r.id]),
    [dog, selectedDateKey, hidden]
  );
  const weeklyRules = selectedRules.filter((r) => r.frequency === "weekly");
  const milestones = selectedRules.filter((r) => getRuleStartDateKey(dog, r) === selectedDateKey);
  const selectedEvents = events[selectedDateKey] || [];
  const selectedAge = calculateAge(dog.birthDate, new Date(selectedDateKey));
  const hiddenRuleList = Object.keys(hidden).map(getRuleById).filter(Boolean);

  function handleToggleHide(ruleId, nextHidden) {
    setRuleHidden(dog.id, ruleId, nextHidden);
    setHidden(getHiddenRules(dog.id));
  }

  function handleToggleChecklist(itemId) {
    const next = toggleScheduleItem(dog.id, selectedDateKey, itemId);
    if (next) setChecklist(next.filter((it) => !hidden[it.ruleId]));
  }

  function handleAddEvent(e) {
    e.preventDefault();
    const title = newEventTitle.trim();
    if (!title) return;
    addEvent(dog.id, selectedDateKey, title, newEventColor);
    setEvents(getEventsByDog(dog.id));
    setNewEventTitle("");
  }

  function handlePickEventColor(id, color) {
    updateEventColor(dog.id, selectedDateKey, id, color);
    setEvents(getEventsByDog(dog.id));
    setColorPickerFor(null);
  }

  function handleDeleteEvent(id) {
    deleteEvent(dog.id, selectedDateKey, id);
    setEvents(getEventsByDog(dog.id));
  }

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="screen">
      <div className="h1" style={{ marginBottom: 14 }}>일정표</div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={() => setMonthDate(new Date(year, month - 1, 1))}>
            ‹
          </button>
          <div className="h2" style={{ margin: 0 }}>{year}년 {month + 1}월</div>
          <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={() => setMonthDate(new Date(year, month + 1, 1))}>
            ›
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} className="faint" style={{ textAlign: "center" }}>{w}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={`blank-${i}`} />;
            const key = toDateKey(new Date(year, month, d));
            const marker = dayMarkers[key] || {};
            const isSelected = key === selectedDateKey;
            const isToday = key === today;
            return (
              <button
                key={key}
                onClick={() => setSelectedDateKey(key)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "6px 0",
                  borderRadius: 10,
                  border: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                  background: isToday ? "var(--accent-soft)" : "none",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400 }}>{d}</span>
                <div style={{ display: "flex", gap: 2, height: 5 }}>
                  {(marker.colors || []).map((c) => (
                    <Dot key={c} color={c} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div className="h2" style={{ margin: 0 }}>{formatKoreanDate(selectedDateKey)} 내 일정</div>
          <span className="faint">{formatAge(selectedAge)}</span>
        </div>

        {selectedEvents.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            {selectedEvents.map((e) => (
              <div key={e.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setColorPickerFor((cur) => (cur === e.id ? null : e.id))}
                      title="탭해서 색 바꾸기"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: e.color || EVENT_COLORS[0],
                        border: "none",
                        padding: 0,
                        flexShrink: 0,
                      }}
                    />
                    {e.title}
                  </span>
                  <button className="faint" style={{ background: "none", border: "none" }} onClick={() => handleDeleteEvent(e.id)}>
                    삭제
                  </button>
                </div>
                {colorPickerFor === e.id && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {EVENT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handlePickEventColor(e.id, c)}
                        aria-label="일정 색 선택"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: c,
                          border: (e.color || EVENT_COLORS[0]) === c ? "2px solid var(--text)" : "2px solid transparent",
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {EVENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewEventColor(c)}
              aria-label="일정 색 선택"
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: c,
                border: newEventColor === c ? "2px solid var(--text)" : "2px solid transparent",
                padding: 0,
              }}
            />
          ))}
        </div>
        <form onSubmit={handleAddEvent} style={{ display: "flex", gap: 8 }}>
          <input
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            placeholder="이 날 기록할 일정 입력"
            style={{ flex: 1, height: 40, border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", fontSize: 14 }}
          />
          <button type="submit" className="btn-primary" style={{ width: "auto", padding: "0 16px" }}>
            추가
          </button>
        </form>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2" style={{ marginBottom: 10 }}>🐶 체크리스트</div>

        {milestones.length > 0 && (
          <p style={{ marginBottom: 10 }}>
            {milestones.map((r) => (
              <span key={r.id} className="chip" style={{ marginRight: 6 }}>🎉 오늘부터: {r.title}</span>
            ))}
          </p>
        )}

        <div className="h2" style={{ fontSize: 14.5, marginBottom: 6 }}>이 날 할 일</div>
        {checklist.length === 0 ? (
          <p className="subtle" style={{ marginBottom: 14 }}>등록된 할 일이 없어요.</p>
        ) : (
          <div style={{ marginBottom: 14 }}>
            {checklist.map((item) => (
              <div key={item.id} className={`checklist-item${item.completed ? " completed" : ""}`}>
                <input type="checkbox" checked={item.completed} onChange={() => handleToggleChecklist(item.id)} />
                <div style={{ flex: 1 }}>
                  <div className="checklist-title" style={{ fontWeight: 600 }}>
                    {getCategoryIcon(item.category)} {item.title}
                  </div>
                </div>
                {item.ruleId && (
                  <button className="faint" style={{ background: "none", border: "none" }} onClick={() => handleToggleHide(item.ruleId, true)}>
                    숨기기
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="h2" style={{ fontSize: 14.5, marginBottom: 6 }}>이 시기에 챙기면 좋은 것</div>
        {weeklyRules.length === 0 ? (
          <p className="subtle" style={{ marginBottom: 0 }}>특별히 챙길 항목이 없어요.</p>
        ) : (
          <div>
            {weeklyRules.map((rule) => (
              <div key={rule.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span>{getCategoryIcon(rule.category)} {rule.title}</span>
                <button className="faint" style={{ background: "none", border: "none" }} onClick={() => handleToggleHide(rule.id, true)}>
                  숨기기
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {hiddenRuleList.length > 0 && (
        <div className="card">
          <div className="h2" style={{ fontSize: 14.5, marginBottom: 6 }}>숨긴 추천 항목</div>
          {hiddenRuleList.map((rule) => (
            <div key={rule.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="subtle">{getCategoryIcon(rule.category)} {rule.title}</span>
              <button className="faint" style={{ background: "none", border: "none" }} onClick={() => handleToggleHide(rule.id, false)}>
                다시 보이기
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
