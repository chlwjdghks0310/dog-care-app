import { useEffect, useMemo, useState } from "react";
import { calculateAge, formatAge } from "../utils/age";
import { todayKey, toDateKey, formatKoreanDate, addDays } from "../utils/date";
import { getTodayChecklist, getRulesForDate, getRuleStartDateKey } from "../services/careEngine";
import { toggleScheduleItem } from "../services/scheduleRepository";
import { getEventsByDog, getOccurrences, kindOf, REPEATS, EVENT_COLORS } from "../services/calendarEvents";
import EventSheet, { dateLabel, timeLabel } from "../components/EventSheet";
import { getHiddenRules, setRuleHidden } from "../services/ruleOverrides";
import { getRuleById } from "../data/careRules";
import { getCategoryIco, getCategoryTone } from "../data/categoryIcons";
import Ico from "../components/Ico";
import MonthGrid from "../components/MonthGrid";

const colorOf = (e) => kindOf(e)?.color || e.color || EVENT_COLORS[0];
const dDay = (today, date) => {
  const n = Math.round((new Date(`${date}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
  return n === 0 ? "오늘" : n === 1 ? "내일" : `D-${n}`;
};

export default function Calendar({ dog }) {
  const today = todayKey();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(today);
  const [checklist, setChecklist] = useState([]);
  const [events, setEvents] = useState(() => getEventsByDog(dog.id));
  const [hidden, setHidden] = useState(() => getHiddenRules(dog.id));
  const [sheet, setSheet] = useState(null); // { start, event? } — 일정 추가·고치기 시트

  useEffect(() => {
    setChecklist(getTodayChecklist(dog, selectedDateKey));
  }, [dog, selectedDateKey, hidden]);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 달력 그리드에는 사용자가 직접 기록한 일정만 표시한다(앱 추천 일정은 아래 별도 박스에서만 보여줌).
  // 하루 일정은 점, 며칠 이어지는 일정은 막대(띠)로.
  const monthFrom = toDateKey(new Date(year, month, 1));
  const monthTo = toDateKey(new Date(year, month, daysInMonth));
  const monthOcc = useMemo(() => getOccurrences(dog.id, monthFrom, monthTo), [dog.id, monthFrom, monthTo, events]); // eslint-disable-line react-hooks/exhaustive-deps
  const byDate = useMemo(() => {
    const map = {};
    for (const o of monthOcc) (map[o.date] ||= []).push(o);
    return map;
  }, [monthOcc]);
  const upcoming = useMemo(() => {
    const seen = new Set();
    return getOccurrences(dog.id, today, toDateKey(addDays(new Date(), 90)))
      .filter((o) => o.isStart && !seen.has(o.event.id) && seen.add(o.event.id))
      .slice(0, 3);
  }, [dog.id, today, events]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRules = useMemo(
    () => getRulesForDate(dog, selectedDateKey).filter((r) => !hidden[r.id]),
    [dog, selectedDateKey, hidden]
  );
  const weeklyRules = selectedRules.filter((r) => r.frequency === "weekly");
  const milestones = selectedRules.filter((r) => getRuleStartDateKey(dog, r) === selectedDateKey);
  const selectedOcc = useMemo(() => getOccurrences(dog.id, selectedDateKey, selectedDateKey), [dog.id, selectedDateKey, events]); // eslint-disable-line react-hooks/exhaustive-deps
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

  function handleSheetSaved(start) {
    setEvents(getEventsByDog(dog.id));
    setSheet(null);
    setSelectedDateKey(start);
  }

  return (
    <div className="screen">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="h1" style={{ margin: 0 }}>일정표</div>
        <button type="button" className="btn-primary small" onClick={() => setSheet({ start: selectedDateKey < today ? today : selectedDateKey })}>＋ 일정</button>
      </div>

      <div className="h2" style={{ margin: "0 2px 8px" }}>다가오는 일정</div>
      {upcoming.length === 0 ? (
        <div className="card subtle" style={{ marginBottom: 14 }}>
          앞으로 90일 안에 일정이 없어요. 병원·미용·접종처럼 챙길 날을 넣어 두면 미리 알려 드려요.
        </div>
      ) : (
        <div className="up-list">
          {upcoming.map((o) => {
            const k = kindOf(o.event);
            const nights = o.event.endDate ? Math.round((new Date(`${o.event.endDate}T00:00:00`) - new Date(`${o.date}T00:00:00`)) / 86400000) : 0;
            return (
              <button key={`${o.event.id}-${o.date}`} type="button" className="up-card" onClick={() => setSheet({ start: o.start, event: o.event })}>
                <span className="up-icon" style={{ background: colorOf(o.event) }} aria-hidden="true"><Ico name={k?.ico || "calendar"} size={22} /></span>
                <span className="up-body">
                  <span className="up-title">{o.event.title}</span>
                  <span className="up-when">
                    {dateLabel(o.date)}{nights ? ` ~ ${dateLabel(o.event.endDate)} · ${nights}박` : ` · ${timeLabel(o.event.time)}`}
                    {o.event.repeat ? ` · ${REPEATS.find((r) => r[0] === o.event.repeat)?.[1]}` : ""}
                    {o.event.alarm ? <> · <Ico name="bell" size={13} /></> : ""}
                  </span>
                </span>
                <span className={`up-dday${dDay(today, o.date) === "오늘" ? " today" : ""}`}>{dDay(today, o.date)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <MonthGrid
          monthDate={monthDate}
          onMonthChange={setMonthDate}
          selectedDateKey={selectedDateKey}
          onSelect={setSelectedDateKey}
          renderMarker={(key) => {
            const list = byDate[key] || [];
            const bars = list.filter((o) => o.event.endDate).slice(0, 2);
            const dots = [...new Set(list.filter((o) => !o.event.endDate).map((o) => colorOf(o.event)))].slice(0, 3);
            return (
              <div className="cal-mark">
                {bars.map((o) => (
                  <span key={o.event.id} className={`cal-bar${o.isStart ? " s" : ""}${o.isEnd ? " e" : ""}`} style={{ background: colorOf(o.event) }} />
                ))}
                {dots.length > 0 && (
                  <span style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                    {dots.map((c) => <span key={c} className="cal-dot" style={{ background: c }} />)}
                  </span>
                )}
              </div>
            );
          }}
        />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <div className="h2" style={{ margin: 0 }}>{formatKoreanDate(selectedDateKey)} 내 일정</div>
          <span className="faint">{formatAge(selectedAge)}</span>
        </div>

        {selectedOcc.length === 0 ? (
          <p className="subtle" style={{ marginTop: 0 }}>이 날은 일정이 없어요.</p>
        ) : (
          <div style={{ marginBottom: 10 }}>
            {selectedOcc.map((o) => {
              const k = kindOf(o.event);
              const dayN = o.event.endDate ? Math.round((new Date(`${o.date}T00:00:00`) - new Date(`${o.start}T00:00:00`)) / 86400000) + 1 : 0;
              const total = o.event.endDate ? Math.round((new Date(`${o.event.endDate}T00:00:00`) - new Date(`${o.start}T00:00:00`)) / 86400000) + 1 : 0;
              return (
                <button key={o.event.id} type="button" className="day-ev" onClick={() => setSheet({ start: o.start, event: o.event })}>
                  <span className="day-ev-bar" style={{ background: colorOf(o.event) }} />
                  <span className="day-ev-time">{dayN ? `${dayN}/${total}일째` : timeLabel(o.event.time)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="day-ev-title">{k && <><Ico name={k.ico} size={15} />{" "}</>}{o.event.title}{o.event.repeat && <>{" "}<Ico name="repeat" size={13} /></>}{o.event.alarm && <>{" "}<Ico name="bell" size={13} /></>}</span>
                    {o.event.memo && <span className="faint" style={{ display: "block" }}>{o.event.memo}</span>}
                  </span>
                  <span className="faint">›</span>
                </button>
              );
            })}
          </div>
        )}
        <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={() => setSheet({ start: selectedDateKey })}>
          ＋ 이 날 일정 추가
        </button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2" style={{ marginBottom: 10 }}><Ico name="checklist" size={18} /> 체크리스트</div>

        {milestones.length > 0 && (
          <p style={{ marginBottom: 10 }}>
            {milestones.map((r) => (
              <span key={r.id} className="chip" style={{ marginRight: 6 }}><Ico name="party" size={13} /> 오늘부터: {r.title}</span>
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
                    <Ico name={getCategoryIco(item.category)} size={15} className={`cat-ico tone-${getCategoryTone(item.category)}`} /> {item.title}
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
                <span><Ico name={getCategoryIco(rule.category)} size={15} className={`cat-ico tone-${getCategoryTone(rule.category)}`} /> {rule.title}</span>
                <button className="faint" style={{ background: "none", border: "none" }} onClick={() => handleToggleHide(rule.id, true)}>
                  숨기기
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {sheet && <EventSheet dog={dog} initial={sheet} onClose={() => setSheet(null)} onSaved={handleSheetSaved} />}

      {hiddenRuleList.length > 0 && (
        <div className="card">
          <div className="h2" style={{ fontSize: 14.5, marginBottom: 6 }}>숨긴 추천 항목</div>
          {hiddenRuleList.map((rule) => (
            <div key={rule.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span className="subtle"><Ico name={getCategoryIco(rule.category)} size={15} className={`cat-ico tone-${getCategoryTone(rule.category)}`} /> {rule.title}</span>
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
