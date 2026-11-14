import { useEffect, useMemo, useState } from "react";
import { calculateAge, formatAge } from "../utils/age";
import { todayKey, toDateKey, formatKoreanDate, addDays } from "../utils/date";
import { getEventsByDog, getOccurrences, kindOf, REPEATS, ALARMS, EVENT_COLORS } from "../services/calendarEvents";
import EventSheet, { dateLabel, timeLabel } from "../components/EventSheet";
import { getRecords, summarize } from "../services/records";
import { isVisitEvent, isVisitRecord } from "../services/vetVisits";
import { HOLIDAYS } from "../data/holidays";
import Ico from "../components/Ico";
import MonthGrid from "../components/MonthGrid";
import VetDocSheet from "../components/VetDocSheet";
import MedicalLedger from "../components/MedicalLedger";
import { getRulesForAge } from "../data/careRules";

const MEDICAL = ["vet", "vaccine", "recheck", "checkup", "scaling", "deworm", "heartworm", "med"];
const colorOf = (e) => kindOf(e)?.color || e.color || EVENT_COLORS[0];
const dDay = (today, date) => {
  const n = Math.round((new Date(`${date}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
  return n === 0 ? "오늘" : n === 1 ? "내일" : `D-${n}`;
};

export default function Calendar({ dog, onRecordVisit, onOpenVet, onOpenBudget, onOpenHealth, vetDocSignal, onVetDocHandled, onQuickAdd }) {
  const today = todayKey();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(today);
  const [events, setEvents] = useState(() => getEventsByDog(dog.id));
  const [sheet, setSheet] = useState(null);
  // 진료 정리(사진·말) — 다녀온 뒤 알림으로 열리면 바로. 화면이 다시 그려져도 열려 있게, 신호는 창을 닫을 때 지운다
  const [docOpen, setDocOpen] = useState(() => Boolean(vetDocSignal));
  useEffect(() => {
    if (vetDocSignal) setDocOpen(true);
  }, [vetDocSignal]);
  const closeDoc = () => (setDocOpen(false), onVetDocHandled?.()); // { start, event?, date? } — 일정 추가·고치기 시트(date = 누른 회차)
  // 지난 병원 진료·접종 기록도 달력에 보여 준다(일정이 아니라 기록 — 빈 동그라미, 날짜를 누르면 아래에 내용)
  // 같은 날 병원 일정이 있으면 그 일정 카드 안에 붙여 하나로 보여 준다
  const vetByDate = useMemo(() => {
    const map = {};
    for (const r of getRecords(dog.id)) if (isVisitRecord(r)) (map[r.at.slice(0, 10)] ||= []).push(r);
    return map;
  }, [dog.id]);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 달력: 직접 넣은 일정(점·기간 막대) + 지난 병원 진료 기록(빈 동그라미). 위에서부터 달력 → 고른 날 → 다가오는 일정
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
      .filter((o) => o.isStart && (isVisitEvent(o.event) || MEDICAL.includes(o.event.kind)) && !seen.has(o.event.id) && seen.add(o.event.id)) // 병원 탭: 병원·접종·약만(나머지는 아래 달력에)
      .slice(0, 3);
  }, [dog.id, today, events]); // eslint-disable-line react-hooks/exhaustive-deps

  // 월령 추천: 지금~8주 안에 시작하는 접종 규칙 + 심장사상충(생후 8주부터 매달) — 같은 종류 일정이 앞으로 60일 안에 있으면 안 보임
  const suggest = useMemo(() => {
    if (!dog.birthDate) return [];
    const weeks = calculateAge(dog.birthDate).ageInWeeks;
    const soon = getOccurrences(dog.id, today, toDateKey(addDays(new Date(), 60)));
    const has = (kind) => soon.some((o) => o.event.kind === kind);
    const all = Object.values(getEventsByDog(dog.id)).flat();
    const out = [];
    const seen = new Set();
    for (let w = weeks; w <= weeks + 8; w++) {
      for (const r of getRulesForAge(w, dog.breed)) {
        if (r.category !== "예방접종" || seen.has(r.id) || has("vaccine")) continue;
        seen.add(r.id);
        const date = w <= weeks ? toDateKey(addDays(new Date(), 7)) : toDateKey(addDays(new Date(`${dog.birthDate}T00:00:00`), r.minWeek * 7));
        out.push({ key: r.id, title: r.title, when: `생후 ${r.minWeek}~${r.maxWeek}주 권장`, date, event: { title: r.title.replace(/\(.*\)/, "").trim(), kind: "vaccine", alarm: "eve" } });
      }
    }
    if (weeks >= 8 && !all.some((e) => e.kind === "heartworm")) out.push({ key: "hw", title: "심장사상충 예방", when: "생후 8주부터 매달", date: toDateKey(addDays(new Date(), 1)), event: { title: "심장사상충 예방", kind: "heartworm", repeat: "monthly", alarm: "morning" } });
    return out.slice(0, 3);
  }, [dog.id, dog.birthDate, dog.breed, today, events]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedOcc = useMemo(() => getOccurrences(dog.id, selectedDateKey, selectedDateKey), [dog.id, selectedDateKey, events]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedAge = calculateAge(dog.birthDate, new Date(selectedDateKey));
  const selectedVet = vetByDate[selectedDateKey] || [];
  // 지난 날: 진료 기록을 그날 첫 병원 일정 카드에 붙인다. 붙일 일정이 없으면 기록만 따로
  const mergeInto = selectedDateKey <= today && selectedVet.length ? selectedOcc.find((o) => isVisitEvent(o.event))?.event.id : null;
  const recLine = (r) => (r.type === "vet" ? summarize(r) : `${r.data.kind}${r.data.title ? ` ${r.data.title}` : ""}`);

  function handleSheetSaved(start) {
    setEvents(getEventsByDog(dog.id));
    setSheet(null);
    setSelectedDateKey(start);
  }

  return (
    <div className="screen">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="h1" style={{ margin: 0 }}>병원</div>
        <button type="button" className="btn-primary small" onClick={() => setSheet({ start: selectedDateKey < today ? today : selectedDateKey })}>＋ 일정</button>
      </div>
      <div className="quick-actions" style={{ marginBottom: 14 }}>{/* 11/14: 색 상자 제거(사용자), 기록 타일과 같은 흰 타일 + 스티커 */}
        <button className="quick-tile" onClick={() => setDocOpen(true)}>
          <span className="quick-tile-icon" aria-hidden="true"><Ico name="camera" size={24} sticker /></span>
          <span className="quick-tile-label">진료 정리</span>
        </button>
        <button className="quick-tile" onClick={onOpenHealth}>
          <span className="quick-tile-icon" aria-hidden="true"><Ico name="scan" size={24} sticker /></span>
          <span className="quick-tile-label">건강 체크</span>
        </button>
        <button className="quick-tile" onClick={onOpenVet}>
          <span className="quick-tile-icon" aria-hidden="true"><Ico name="clipboard" size={24} sticker /></span>
          <span className="quick-tile-label">병원용 기록</span>
        </button>
      </div>

      <div className="h2" style={{ margin: "0 2px 8px" }}>다가오는 병원·접종·약</div>
      {upcoming.length === 0 ? (
        <div className="card subtle" style={{ marginBottom: 14 }}>
          앞으로 90일 안에 병원·접종·약 일정이 없어요. [＋ 일정]으로 넣어 두면 미리 알려 드려요.
        </div>
      ) : (
        <div className="up-list">
          {upcoming.map((o) => {
            const k = kindOf(o.event);
            const nights = o.event.endDate ? Math.round((new Date(`${o.event.endDate}T00:00:00`) - new Date(`${o.date}T00:00:00`)) / 86400000) : 0;
            return (
              <button key={`${o.event.id}-${o.date}`} type="button" className="up-card tinted" style={{ "--ev": colorOf(o.event) }} onClick={() => setSheet({ start: o.start, event: o.event, date: o.date })}>
                <span className="up-icon" style={{ background: colorOf(o.event) }} aria-hidden="true"><Ico name={k?.ico || "calendar"} size={22} /></span>
                <span className="up-body">
                  <span className="up-title">{o.event.title}</span>
                  {/* 날짜·시간 한 줄, 반복·알림은 작은 꼬리표로 — 점(·)이나 종 아이콘이 혼자 다음 줄로 떨어지지 않게(사용자 지적 11/9) */}
                  <span className="up-when">
                    <span>{dateLabel(o.date)}</span>
                    {nights ? <span>~ {dateLabel(o.event.endDate)} ({nights}박)</span> : <span>{timeLabel(o.event.time)}</span>}
                  </span>
                  {(o.event.repeat || o.event.alarm) && (
                    <span className="up-tags">
                      {o.event.repeat && <span className="up-tag"><Ico name="repeat" size={12} /> {REPEATS.find((r) => r[0] === o.event.repeat)?.[1]}</span>}
                      {o.event.alarm && <span className="up-tag"><Ico name="bell" size={12} /> {ALARMS.find((a) => a[0] === o.event.alarm)?.[1]}</span>}
                    </span>
                  )}
                </span>
                <span className={`up-dday${dDay(today, o.date) === "오늘" ? " today" : ""}`}>{dDay(today, o.date)}</span>
              </button>
            );
          })}
        </div>
      )}


      {/* 월령에 맞춘 추천(접종·심장사상충) — 일정이 없을 때만, 눌러서 날짜를 정해 넣는다(제안 분석 11/7) */}
      {suggest.length > 0 && (
        <section className="section sg-card">
          <div className="h2" style={{ margin: "0 0 6px" }}>{dog.name} 나이에 맞춘 추천</div>
          {suggest.map((x) => (
            <div key={x.key} className="sg-row">
              <span style={{ flex: 1, minWidth: 0 }}><b>{x.title}</b><span className="faint" style={{ display: "block", fontSize: 12.5 }}>{x.when}</span></span>
              <button type="button" className="btn-ghost small" onClick={() => setSheet({ start: x.date, event: x.event })}>일정 넣기</button>
            </div>
          ))}
          <p className="faint" style={{ margin: "6px 0 0", fontSize: 12 }}>일반 권장 시기예요. 정확한 날짜는 다니는 병원과 정해 주세요.</p>
        </section>
      )}

      <MedicalLedger dog={dog} onOpenBudget={onOpenBudget} />

      <div className="card" style={{ marginBottom: 14 }}>
        <MonthGrid
          monthDate={monthDate}
          onMonthChange={setMonthDate}
          selectedDateKey={selectedDateKey}
          onSelect={setSelectedDateKey}
          onToday={() => (setMonthDate(new Date()), setSelectedDateKey(today))}
          holidays={HOLIDAYS}
          renderMarker={(key) => {
            const list = byDate[key] || [];
            const rec = Boolean(vetByDate[key]) && !list.some((o) => isVisitEvent(o.event)); // 병원 일정 점이 있으면 기록 동그라미는 생략
            const bars = list.filter((o) => o.event.endDate).slice(0, 2);
            const dots = [...new Set(list.filter((o) => !o.event.endDate).map((o) => colorOf(o.event)))].slice(0, 3);
            return (
              <div className="cal-mark">
                {bars.map((o) => (
                  <span key={o.event.id} className={`cal-bar${o.isStart ? " s" : ""}${o.isEnd ? " e" : ""}`} style={{ background: colorOf(o.event) }} />
                ))}
                {(dots.length > 0 || rec) && (
                  <span style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                    {dots.map((c) => <span key={c} className="cal-dot" style={{ background: c }} />)}
                    {rec && <span className="cal-dot rec" title="병원 진료 기록" />}
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
          <span className="faint">{dog.name} {formatAge(selectedAge)}</span>
        </div>

        {!mergeInto && selectedVet.map((r) => (
          <div key={r.id} className="day-rec">
            <Ico name="stethoscope" size={15} className="cat-ico tone-blue" />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="faint" style={{ fontSize: 12 }}>{r.type === "vet" ? "병원 진료 기록" : "건강 기록"} {r.at.slice(11, 16)}</span>
              <span style={{ display: "block" }}>{recLine(r)}</span>
            </span>
          </div>
        ))}
        {selectedOcc.length === 0 ? (
          selectedVet.length === 0 && <p className="subtle" style={{ marginTop: 0 }}>이 날은 일정이 없어요.</p>
        ) : (
          <div style={{ marginBottom: 10 }}>
            {selectedOcc.map((o) => {
              const k = kindOf(o.event);
              const dayN = o.event.endDate ? Math.round((new Date(`${o.date}T00:00:00`) - new Date(`${o.start}T00:00:00`)) / 86400000) + 1 : 0;
              const total = o.event.endDate ? Math.round((new Date(`${o.event.endDate}T00:00:00`) - new Date(`${o.start}T00:00:00`)) / 86400000) + 1 : 0;
              return (
                <button key={o.event.id} type="button" className="day-ev" onClick={() => setSheet({ start: o.start, event: o.event, date: o.date })}>
                  <span className="day-ev-bar" style={{ background: colorOf(o.event) }} />
                  <span className="day-ev-time">{dayN ? `${dayN}/${total}일째` : timeLabel(o.event.time)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="day-ev-title">{k && <><Ico name={k.ico} size={15} />{" "}</>}{o.event.title}{o.event.repeat && <>{" "}<Ico name="repeat" size={13} /></>}{o.event.alarm && <>{" "}<Ico name="bell" size={13} /></>}</span>
                    {o.event.memo && <span className="faint" style={{ display: "block" }}>{o.event.memo}</span>}
                    {mergeInto === o.event.id &&
                      selectedVet.map((r) => (
                        <span key={r.id} className="day-ev-rec"><Ico name="note" size={13} /> 진료 기록: {recLine(r)}</span>
                      ))}
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


      {docOpen && <VetDocSheet dog={dog} onClose={closeDoc} onUse={(prefill) => (closeDoc(), onRecordVisit?.(prefill))} />}
      {sheet && (
        <EventSheet
          dog={dog}
          initial={sheet}
          onClose={() => setSheet(null)}
          onSaved={handleSheetSaved}
          onOpenDoc={() => (setSheet(null), setDocOpen(true))}
          onRecordVisit={onRecordVisit && sheet.event && !(vetByDate[sheet.date || sheet.start] || []).length ? (prefill) => (setSheet(null), onRecordVisit(prefill)) : null}
        />
      )}

    </div>
  );
}
