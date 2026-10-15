import { todayKey, toDateKey } from "../utils/date";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 월 달력. renderMarker(dateKey)로 각 날짜 아래에 표시할 내용(점, 금액 등)을 그린다.
export default function MonthGrid({ monthDate, onMonthChange, selectedDateKey, onSelect, renderMarker }) {
  const today = todayKey();
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={() => onMonthChange(new Date(year, month - 1, 1))}>
          ‹
        </button>
        <div className="h2" style={{ margin: 0 }}>{year}년 {month + 1}월</div>
        <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={() => onMonthChange(new Date(year, month + 1, 1))}>
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
          const isSelected = key === selectedDateKey;
          const isToday = key === today;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 0",
                minWidth: 0,
                borderRadius: 10,
                border: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                background: isToday ? "var(--accent-soft)" : "none",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400 }}>{d}</span>
              {renderMarker(key)}
            </button>
          );
        })}
      </div>
    </>
  );
}
