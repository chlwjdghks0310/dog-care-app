import { todayKey, toDateKey } from "../utils/date";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 월 달력. renderMarker(dateKey)로 각 날짜 아래에 표시할 내용(점, 금액 등)을 그린다.
// cellClass(dateKey)로 날짜 칸에 클래스를 붙일 수 있다(일정 기간 띠 등).
// onToday: 주면 다른 달을 볼 때 "오늘" 버튼이 생긴다. holidays: { "YYYY-MM-DD": "이름" } — 공휴일·일요일은 빨간 숫자
export default function MonthGrid({ monthDate, onMonthChange, selectedDateKey, onSelect, renderMarker, cellClass, onToday, holidays }) {
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="h2" style={{ margin: 0 }}>{year}년 {month + 1}월</div>
          {onToday && (today.slice(0, 7) !== `${year}-${String(month + 1).padStart(2, "0")}` || selectedDateKey !== today) && (
            <button type="button" className="chip mg-today" onClick={onToday}>오늘</button>
          )}
        </div>
        <button className="btn-ghost" style={{ padding: "4px 10px" }} onClick={() => onMonthChange(new Date(year, month + 1, 1))}>
          ›
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="faint" style={{ textAlign: "center" }}>{w}</div>
        ))}
      </div>

      <div className="mg-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={`blank-${i}`} />;
          const key = toDateKey(new Date(year, month, d));
          const isSelected = key === selectedDateKey;
          const isToday = key === today;
          const holiday = holidays?.[key];
          const red = holiday || new Date(year, month, d).getDay() === 0;
          return (
            <button
              key={key}
              type="button"
              className={cellClass?.(key) || undefined}
              aria-label={`${month + 1}월 ${d}일${holiday ? ` ${holiday}` : ""}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(key)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 0",
                minWidth: 0,
                borderRadius: 0,
                border: isSelected ? "2px solid var(--accent)" : "2px solid transparent",
                ...(isToday && { background: "var(--accent-soft)" }),
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: red ? "var(--danger)" : undefined }}>{d}</span>
              {holiday && <span className="mg-holiday">{holiday.includes("대체공휴일") ? "대체휴일" : holiday.replace("전국동시지방선거", "지방선거")}</span>}
              {renderMarker?.(key)}
            </button>
          );
        })}
      </div>
    </>
  );
}
