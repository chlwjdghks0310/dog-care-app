import { useEffect, useMemo, useRef, useState } from "react";
import MonthGrid from "./MonthGrid";
import Ico from "./Ico";
import { useHelpTip } from "./HelpTip";
import { DiffSheet } from "./DailyCheck";
import { ITEMS, getDay, saveUsual, saveUnknown, clearDay } from "../services/dailyCheck";
import { syncPushAlarms } from "../services/notifications";
import { trackAct } from "../services/analytics";
import { markCheckedIn } from "../services/routine";
import { TYPES, summarize, foodTotals, foodTotalsText } from "../services/records";
import { VITAL } from "../data/vitals";
import { stampsOn } from "../services/puppy100";
import { isVisitRecord } from "../services/vetVisits";
import { HOLIDAYS } from "../data/holidays";
import { formatKoreanDate, todayKey, toDateKey } from "../utils/date";
import { josa } from "../utils/text";

// 기록 탭 달력: 하루 체크로 "다른 날"만 눈에 띄게. 색만으로 구분하지 않는다(WCAG 1.4.1) — 평소 ●, 다른 날 항목 첫 글자 배지, 병원 ＋.
// 기록 없는 날은 아무 표시도 없다(빨간색 안 씀). 근거: ../자료용/자료/2026-11-07-1단계-남은것-조사.md ①(Daylio·DailyBean·Every Wag·WanStep)
// 배지 글자(11/7: "소"만으론 뭔지 몰라서 두 글자까지)
const SHORT = { vomit: "토", urine: "소변", energy: "기운", etc: "기타" };
const short = (id) => SHORT[id] || ITEMS.find((i) => i.id === id)?.label;

// 날짜를 누르면: 평소였어요/다른 게 있었어요 → 그날 기록 → [＋ 이날 더 적기](컴플레인 11/9: 달라진 것만 적고, 필요하면 더 적기)
export default function RecordCalendar({ dog, items, initialDate, onChanged, onAdd, onShowAll }) {
  const today = todayKey();
  const [monthDate, setMonthDate] = useState(() => (initialDate ? new Date(`${initialDate}T00:00:00`) : new Date()));
  const [selected, setSelected] = useState(initialDate && initialDate <= today ? initialDate : today);
  const [only, setOnly] = useState(""); // 이 항목이 다른 날만
  const [sheet, setSheet] = useState(null);
  const dayRef = useRef(null);
  const [legendTip, legendText] = useHelpTip("빨간 글자(평소와 달랐던 것)", "그날 하루 체크에서 평소와 달랐다고 고른 항목의 이름이에요(밥·변·토·소변·기운·물·기타). 두 개 이상이면 개수가 나와요. 날짜를 누르면 무엇이 달랐는지 아래에 나와요.");
  useEffect(() => { if (initialDate) dayRef.current?.scrollIntoView({ block: "center" }); }, [initialDate]); // 방금 적은 날을 바로 보이게
  const [, refresh] = useState(0);
  const changed = (d) => (trackAct("check"), d === today && (markCheckedIn(dog.id), syncPushAlarms()), refresh((n) => n + 1), onChanged?.());

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
        <p className="faint rc-legend"><span><span className="rc-dot">●</span> 평소</span><span><span className="rc-badge">소변</span> 평소와 달랐던 것{legendTip}</span><span><span className="rc-vet">＋</span> 병원</span></p>
        {legendText}
      </div>

      <div className="card rise-in" style={{ marginBottom: 14 }} ref={dayRef} key={selected}>
        <div className="h2" style={{ marginBottom: 8 }}>{formatKoreanDate(selected)}</div>
        {sel && sel.status !== "unknown" ? (
          <div className="rc-day">
            <span>{sel.status === "usual" ? "평소와 같았어요" : `다른 점: ${Object.entries(sel.picks).map(([id, l]) => `${ITEMS.find((i) => i.id === id).label} ${l}`).join(", ")}`}</span>
          </div>
        ) : null}
        {sel && sel.status !== "unknown" ? (
          /* 11/10: 작은 "고치기" 글자 대신 버튼 — 평소였으면 [다른 게 있었어요], 달랐으면 [평소였어요] [다른 점 고치기] */
          <div className="dc-btns" style={{ marginTop: 8 }}>
            {sel.status === "diff" && <button type="button" className="dc-diff" onClick={() => (clearDay(dog.id, selected), saveUsual(dog.id, selected), changed(selected))}>평소였어요</button>}
            <button type="button" className="dc-diff" onClick={() => setSheet(selected)}>{sel.status === "diff" ? "다른 점 고치기" : "다른 게 있었어요"}</button>{/* 이미 체크한 날의 고치기는 테두리만(11/10: 높이 44px는 두고 무게만 줄임) */}
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
        {foodTotalsText(foodTotals(dog.id, selected)) && <p className="rc-food"><Ico name="bowl" size={14} className="cat-ico tone-rose" /> 이날 먹고 마신 것 · {foodTotalsText(foodTotals(dog.id, selected))}</p>}
        {(selRecords.length > 0 || stampsOn(dog.id, selected).length > 0) && (
          <div className="rc-recs">
            {stampsOn(dog.id, selected).map((t) => (
              <div key={t} className="rc-rec rc-puppy"><Ico name="paw" size={15} className="paw-mark" /><span className="faint">퍼피 100일</span><span style={{ flex: 1, minWidth: 0 }}>{t}</span></div>
            ))}
            {selRecords.map((r) => (
              <div key={`${r.source}-${r.id}`} className="rc-rec">
                <Ico name={(r.type === "vital" && VITAL[r.data?.metric]?.ico) || (TYPES[r.type] || TYPES.daily).ico} size={15} className={`cat-ico tone-${(r.type === "vital" && VITAL[r.data?.metric]?.tone) || (TYPES[r.type] || TYPES.daily).tone}`} />
                <span className="faint">{r.at.slice(11, 16)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{summarize(r)}</span>
              </div>
            ))}
          </div>
        )}
        {selected <= today && onAdd && (
          <button type="button" className="btn-ghost small" style={{ marginTop: 12 }} onClick={() => onAdd(selected)}>＋ 이날 더 적기 <span className="faint">(몸무게·약·병원·사진 등)</span></button>
        )}
      </div>
      {onShowAll && (
        <button type="button" className="btn-ghost" style={{ width: "100%", marginBottom: 14 }} onClick={onShowAll}>
          <Ico name="search" size={16} /> 모든 기록 보기·찾기
        </button>
      )}
      {sheet && <DiffSheet dog={dog} date={sheet} initial={getDay(dog.id, sheet)?.picks} onClose={() => setSheet(null)} onSaved={() => changed(sheet)} />}
    </>
  );
}
