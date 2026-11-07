import { useMemo, useState } from "react";
import MonthGrid from "./MonthGrid";
import Ico from "./Ico";
import { DiffSheet } from "./DailyCheck";
import { ITEMS, getDay, saveUsual, saveUnknown, clearDay } from "../services/dailyCheck";
import { syncPushAlarms } from "../services/notifications";
import { markCheckedIn } from "../services/routine";
import { TYPES, summarize } from "../services/records";
import { isVisitRecord } from "../services/vetVisits";
import { HOLIDAYS } from "../data/holidays";
import { formatKoreanDate, todayKey, toDateKey } from "../utils/date";
import { josa } from "../utils/text";

// 기록 탭 달력: 하루 체크로 "다른 날"만 눈에 띄게. 색만으로 구분하지 않는다(WCAG 1.4.1) — 평소 ●, 다른 날 항목 첫 글자 배지, 병원 ＋.
// 기록 없는 날은 아무 표시도 없다(빨간색 안 씀). 근거: ../자료용/자료/2026-11-07-1단계-남은것-조사.md ①(Daylio·DailyBean·Every Wag·WanStep)
const short = (id) => ITEMS.find((i) => i.id === id)?.label.slice(0, 1);

export default function RecordCalendar({ dog, items, onChanged }) {
  const today = todayKey();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selected, setSelected] = useState(today);
  const [only, setOnly] = useState(""); // 이 항목이 다른 날만
  const [sheet, setSheet] = useState(null);
  const [, refresh] = useState(0);
  const changed = (d) => (d === today && (markCheckedIn(dog.id), syncPushAlarms()), refresh((n) => n + 1), onChanged?.());

  const vetDays = useMemo(() => new Set(items.filter(isVisitRecord).map((r) => r.at.slice(0, 10))), [items]);
  const dayOf = (k) => {
    const d = getDay(dog.id, k);
    if (!d || d.status === "unknown") return null;
    if (only) return d.picks?.[only] ? d : null;
    return d;
  };
  const month = toDateKey(monthDate).slice(0, 7);
  const monthKeys = Object.keys(Object.fromEntries([...Array(31)].map((_, i) => [`${month}-${String(i + 1).padStart(2, "0")}`, 1]))).filter((k) => k <= today);
  const diffN = monthKeys.filter((k) => dayOf(k)?.status === "diff").length;
  const usualN = only ? 0 : monthKeys.filter((k) => dayOf(k)?.status === "usual").length;
  const vetN = monthKeys.filter((k) => vetDays.has(k)).length;

  const describe = (k) => {
    const d = dayOf(k);
    const parts = [];
    if (d?.status === "usual") parts.push("평소");
    if (d?.status === "diff") parts.push(`다른 날: ${Object.entries(d.picks).map(([id, l]) => `${ITEMS.find((i) => i.id === id).label} ${l}`).join(", ")}`);
    if (vetDays.has(k)) parts.push("병원");
    return parts.join(", ");
  };
  const sel = getDay(dog.id, selected);
  const selRecords = items.filter((r) => r.at.slice(0, 10) === selected).sort((a, b) => a.at.localeCompare(b.at));

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <p style={{ margin: "0 0 10px", fontWeight: 700 }}>
          이번 달 {only === "etc" ? "그 밖에 다른 날" : only ? `${josa(ITEMS.find((i) => i.id === only).label, "이", "가")} 다른 날` : "다른 날"} {diffN}일{!only && ` · 평소 ${usualN}일`} · 병원 {vetN}번
        </p>
        <div className="chip-wrap" style={{ marginBottom: 10 }} aria-label="항목별로 보기">
          <button type="button" className={`seg${only ? "" : " on"}`} aria-pressed={!only} onClick={() => setOnly("")}>전체</button>
          {ITEMS.filter((i) => i.id !== "walk").map((i) => (
            <button key={i.id} type="button" className={`seg${only === i.id ? " on" : ""}`} aria-pressed={only === i.id} onClick={() => setOnly(only === i.id ? "" : i.id)}>{i.label}</button>
          ))}
        </div>
        <MonthGrid
          monthDate={monthDate}
          onMonthChange={setMonthDate}
          selectedDateKey={selected}
          onSelect={setSelected}
          onToday={() => (setMonthDate(new Date()), setSelected(today))}
          holidays={HOLIDAYS}
          cellClass={(k) => (dayOf(k)?.status === "diff" ? "rc-diff" : undefined)}
          ariaExtra={describe}
          renderMarker={(k) => {
            const d = dayOf(k);
            const picks = d?.status === "diff" ? Object.keys(d.picks) : [];
            return (
              <span className="rc-mark" aria-hidden="true">
                {d?.status === "usual" && <span className="rc-dot">●</span>}
                {picks.length > 0 && <span className="rc-badge">{picks.length > 1 ? picks.length : short(picks[0])}</span>}
                {vetDays.has(k) && <span className="rc-vet">＋</span>}
              </span>
            );
          }}
        />
        <p className="faint rc-legend"><span className="rc-dot">●</span> 평소 · <span className="rc-badge">밥</span> 다른 날(여러 개면 숫자) · <span className="rc-vet">＋</span> 병원</p>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2" style={{ marginBottom: 8 }}>{formatKoreanDate(selected)}</div>
        {sel && sel.status !== "unknown" ? (
          <div className="rc-day">
            <span>{sel.status === "usual" ? "평소와 같았어요" : `다른 점: ${Object.entries(sel.picks).map(([id, l]) => `${ITEMS.find((i) => i.id === id).label} ${l}`).join(", ")}`}</span>
            <span style={{ display: "flex", gap: 12 }}>
              {sel.status === "diff" && <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => (clearDay(dog.id, selected), saveUsual(dog.id, selected), changed(selected))}>평소였어요</button>}
              <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => setSheet(selected)}>고치기</button>
            </span>
          </div>
        ) : selected <= today ? (
          <>
            <p className="subtle" style={{ margin: "0 0 8px" }}>{sel ? "기억 안 나는 날로 남겼어요. 생각나면 고를 수 있어요." : "이날 하루 체크가 없어요."}</p>
            <div className="dc-btns">
              <button type="button" className="dc-usual" onClick={() => (saveUsual(dog.id, selected), changed(selected))}>평소였어요</button>
              <button type="button" className="dc-diff" onClick={() => setSheet(selected)}>다른 게 있었어요</button>
              {!sel && selected < today && <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => (saveUnknown(dog.id, selected), changed(selected))}>기억 안 나요</button>}
            </div>
          </>
        ) : (
          <p className="subtle" style={{ margin: 0 }}>아직 오지 않은 날이에요.</p>
        )}
        {selRecords.length > 0 && (
          <div className="rc-recs">
            {selRecords.map((r) => (
              <div key={`${r.source}-${r.id}`} className="rc-rec">
                <Ico name={TYPES[r.type].ico} size={15} className={`cat-ico tone-${TYPES[r.type].tone}`} />
                <span className="faint">{r.at.slice(11, 16)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{summarize(r)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {sheet && <DiffSheet dog={dog} date={sheet} initial={getDay(dog.id, sheet)?.picks} onClose={() => setSheet(null)} onSaved={() => changed(sheet)} />}
    </>
  );
}
