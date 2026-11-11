import { useEffect, useRef, useState } from "react";
import { deleteWeightRecord, getWeightRecords } from "../services/weightLog";
import { syncPushAlarms } from "../services/notifications";
import WeightChart from "../components/WeightChart";
import RecordForm from "./RecordForm";
import DogReaction from "../components/DogReaction";
import Ico from "../components/Ico";
import RecordCalendar from "../components/RecordCalendar";
import RecordsBrowser from "../components/RecordsBrowser";
import { TYPES, MEAL_KINDS, md, getTimeline, filterTimeline, deleteRecord, dateAt, foodTotals } from "../services/records";
import { todayKey, toDateKey, addDays } from "../utils/date";

const PERIODS = [[7, "7일"], [30, "30일"], [90, "90일"]];

// 기록 탭: 달력(첫 화면) · 변화 보기 두 칸, 모든 기록(검색·종류별)은 달력 아래 버튼으로 창을 연다. startNew면 열자마자 새 기록 추가.
// 컴플레인 11/9: 전체 기록이 먼저 나오니 "다 채워야 하나" 싶어 같은 걸 매일 반복해 적음 → 달력에서 평소/다른 것만, 필요하면 [＋ 이날 더 적기]
export default function Records({ dog, startNew, startType, prefill, onBack, backLabel = "← 기록으로", onOpenMeds, onOpenVital, onNew, onOpenFeeding, onQuickAdd, onOpenGallery, onPickType }) {
  const [view, setView] = useState("cal");
  const [calDate, setCalDate] = useState(null); // 방금 적은 기록의 날짜를 달력에서 보여 주기
  const [browse, setBrowse] = useState(null); // 모든 기록 창 { types, days } (사용자 요청 11/9)
  const topRef = useRef(null);
  const [form, setForm] = useState(startNew ? { initial: null, type: startType } : null);
  useEffect(() => { if (form?.initial) topRef.current?.scrollIntoView({ block: "start" }); }, [form]); // 고치기는 맨 위부터
  const [items, setItems] = useState(() => getTimeline(dog.id));
  const [notice, setNotice] = useState("");
  const [reaction, setReaction] = useState(null); // 방금 저장한 기록 — 강아지 반응 카드
  const reload = () => setItems(getTimeline(dog.id));

  function handleSaved(rec) {
    setForm(null);
    reload();
    setView("cal");
    setBrowse(null);
    setCalDate((rec.at || rec.measuredAt || "").slice(0, 10) || null);
    setNotice("");
    setReaction(rec.type ? rec : { ...rec, type: "weight", data: { weightKg: rec.weightKg } }); // 체중은 체중 기록 형태로 돌아온다
  }

  function handleDelete(rec) {
    const linked = rec.links?.eventId || rec.links?.alarmId;
    if (!confirm(`이 기록을 지울까요?${linked ? "\n이 기록으로 만든 일정·알림도 같이 지워져요." : ""}`)) return;
    try {
      if (rec.source === "weight") deleteWeightRecord(dog.id, rec.id);
      else deleteRecord(dog.id, rec.id);
      if (rec.links?.alarmId) syncPushAlarms();
      reload();
      setNotice("지웠어요.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  return (
    <div className="screen">
      {onBack && <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>{backLabel}</button>}
      <div className="h1" ref={topRef}>{dog.name}의 기록</div>
      {/* 새 기록·고치기 중엔 보기 바꾸기를 숨긴다(사용자 요청 11/7) */}
      {!form && <div className="view-tabs">
        <button type="button" className={`seg${view === "cal" ? " on" : ""}`} onClick={() => setView("cal")}>달력</button>
        <button type="button" className={`seg${view === "trend" ? " on" : ""}`} onClick={() => setView("trend")}>변화 보기</button>
      </div>}

      {form ? (
        <RecordForm dog={dog} initial={form.initial} startType={form.type} prefill={startNew ? prefill : form.prefill} onSaved={handleSaved} onCancel={startNew && onBack ? onBack : () => setForm(null)} onOpenMeds={onOpenMeds} onOpenFeeding={onOpenFeeding} onOpenGallery={onOpenGallery} onPickType={onPickType} />
      ) : (
        <button type="button" className="btn-primary" style={{ marginBottom: 14 }} onClick={() => (onNew ? onNew() : (setNotice(""), setReaction(null), setForm({ initial: null })))}>
          ＋ 새 기록
        </button>
      )}
      {reaction && !form && <DogReaction dog={dog} rec={reaction} onClose={() => setReaction(null)} />}
      {notice && !form && <p className="subtle" role="status" style={{ margin: "0 0 10px" }}>{notice}</p>}

      {!form && browse && (
        <RecordsBrowser
          dog={dog}
          items={items}
          initialTypes={browse.types || []}
          initialDays={browse.days || 0}
          backLabel={view === "cal" ? "← 달력으로" : "← 변화 보기로"}
          onClose={() => setBrowse(null)}
          onOpenMeds={onOpenMeds}
          onOpenVital={onOpenVital}
          onEdit={(r) => (setNotice(""), setReaction(null), setForm({ initial: r }))}
          onDelete={handleDelete}
        />
      )}

      {!form && view === "cal" && <RecordCalendar key={calDate || ""} dog={dog} items={items} initialDate={calDate} onChanged={reload} onAdd={(date) => (onNew ? onNew(date) : setForm({ initial: null, prefill: { at: dateAt(date) } }))} onShowAll={() => setBrowse({})} />}
      {!form && view === "trend" && <Trends dog={dog} items={items} onPick={(t, d) => setBrowse({ types: [t], days: d })} onAdd={() => (onNew ? onNew() : setForm({ initial: null }))} />}
    </div>
  );
}

// 변화 보기 — 실제로 저장된 값만 쓴다. 기록 없는 날은 채우지 않고, 비교할 값이 없으면 그렇다고 말한다.
// 11/10: "보호자 관찰 추세" 대신 밥·물 하루 합계 막대(건식·습식·물을 한 그래프에, 통계로 합쳐 보기)
function Trends({ dog, items, onAdd, onPick }) {
  const [days, setDays] = useState(30);
  const inPeriod = filterTimeline(items, { days, order: "old" });
  const weights = getWeightRecords(dog.id);
  const periodWeights = weights.filter((w) => inPeriod.some((r) => r.source === "weight" && r.id === w.id));
  const latest = weights.at(-1);
  const prev = weights.at(-2);
  const symptoms = inPeriod.filter((r) => r.type === "symptom");
  const kindCount = {};
  for (const s of symptoms) for (const k of s.data?.kinds || []) (kindCount[k] ||= []).push(md(s.at.slice(0, 10)));
  const observed = inPeriod.filter((r) => r.source === "record").length;

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {PERIODS.map(([d, label]) => (
          <button key={d} type="button" className={`seg${days === d ? " on" : ""}`} onClick={() => setDays(d)}>최근 {label}</button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2"><Ico name="scales" size={18} /> 체중 <span className="faint">측정값</span></div>
        {!latest ? (
          <Empty text="아직 체중 기록이 없습니다." onAdd={onAdd} />
        ) : (
          <>
            <p className="subtle" style={{ marginTop: 0 }}>
              최근 {Math.round(latest.weightKg * 100) / 100}kg ({md(latest.measuredAt.slice(0, 10))})
              {prev ? ` · 이전 ${Math.round(prev.weightKg * 100) / 100}kg (${md(prev.measuredAt.slice(0, 10))}) 대비 ${fmtDiff(latest.weightKg - prev.weightKg)}kg` : " · 비교할 이전 측정값이 없어요"}
            </p>
            {periodWeights.length > 0 ? (
              <WeightChart key={days} records={periodWeights} />
            ) : (
              <p className="faint">최근 {days}일 안에 잰 기록이 없어요.</p>
            )}
            {periodWeights.length === 1 && <p className="faint">이 기간 측정값이 1개라 변화를 말하기엔 부족해요.</p>}
          </>
        )}
      </div>

      <FoodChart dog={dog} days={days} onPick={() => onPick("meal", days)} onAdd={onAdd} />

      <section className="section">
        <div className="h2"><Ico name="bandaid" size={18} /> 이 기간 증상</div>
        {symptoms.length === 0 ? (
          <p className="subtle" style={{ margin: 0 }}>최근 {days}일 기록된 증상이 없습니다.</p>
        ) : (
          Object.entries(kindCount).map(([k, dates]) => (
            <div key={k} className="vet-line">{k} {dates.length}번 <span className="faint">({dates.join(", ")})</span></div>
          ))
        )}
      </section>

      <section className="section">
        <div className="h2"><Ico name="chart" size={18} /> 이 기간 기록</div>
        {inPeriod.length === 0 ? (
          <Empty text={`최근 ${days}일 기록이 없습니다.`} onAdd={onAdd} />
        ) : (
          <div className="chip-wrap">
            {Object.entries(TYPES).map(([t, v]) => [t, v, inPeriod.filter((r) => r.type === t).length]).filter(([, , n]) => n).map(([t, v, n]) => (
              <button key={t} type="button" className="seg" onClick={() => onPick(t, days)} aria-label={`${v.label} ${n}개 보기`}><Ico name={v.ico} size={14} /> {v.label} <b>{n}</b> ›</button>
            ))}
          </div>
        )}
        {observed > 0 && observed < 5 && <p className="faint">관찰 기록이 적어요. 밥·물·배변·컨디션을 며칠 더 남기면 변화가 더 잘 보여요.</p>}
        <p className="faint" style={{ marginBottom: 0 }}>보호자가 남긴 기록을 모아 보여 줄 뿐, 건강 상태를 판정하지 않아요. 걱정되는 변화가 있으면 수의사와 상담해 주세요.</p>
      </section>
    </>
  );
}

// 밥·물 하루 합계 막대: 날마다 건식·습식(g)·물(ml)을 한 줄에. 기록 없는 날은 빈 칸(0이 아님). 누르면 그 기간 밥·물 기록 목록
function FoodChart({ dog, days, onPick, onAdd }) {
  const today = todayKey();
  const dates = Array.from({ length: days }, (_, i) => toDateKey(addDays(new Date(`${today}T00:00:00`), i - days + 1)));
  const rows = dates.map((d) => ({ date: d, ...foodTotals(dog.id, d) }));
  const has = rows.filter((r) => r.dry || r.wet || r.water);
  const maxFood = Math.max(1, ...rows.map((r) => r.dry + r.wet));
  const maxWater = Math.max(1, ...rows.map((r) => r.water));
  const avg = (k) => (has.length ? Math.round(has.reduce((s, r) => s + r[k], 0) / has.filter((r) => r[k]).length || 0) : 0);
  const tick = days <= 7 ? 1 : days <= 30 ? 5 : 15;
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="rec-head">
        <div className="h2" style={{ margin: 0 }}><Ico name="bowl" size={18} /> 밥·물 <span className="faint">하루 합계</span></div>
        {has.length > 0 && <button type="button" className="link-btn" style={{ margin: 0 }} onClick={onPick}>기록 보기 ›</button>}
      </div>
      {has.length === 0 ? (
        <Empty text={`최근 ${days}일 밥·물 기록이 없어요. 새 기록 → 밥·물에서 건식·습식·물을 적어요.`} onAdd={onAdd} />
      ) : (
        <>
          <p className="subtle" style={{ margin: "0 0 8px" }}>
            기록한 {has.length}일 · 평균 {MEAL_KINDS.filter((k) => has.some((r) => r[k.id])).map((k) => `${k.label} ${avg(k.id)}${k.unit}`).join(" · ")}
          </p>
          <div className="fc" role="img" aria-label={`최근 ${days}일 밥·물 하루 합계`}>
            {rows.map((r, i) => (
              <div key={r.date} className="fc-col" title={`${md(r.date)} ${[r.dry && `건식 ${r.dry}g`, r.wet && `습식 ${r.wet}g`, r.water && `물 ${r.water}ml`].filter(Boolean).join(" · ") || "기록 없음"}`}>
                <div className="fc-bars">
                  <div className="fc-bar food" style={{ height: `${Math.round(((r.dry + r.wet) / maxFood) * 100)}%` }}>
                    {r.wet > 0 && <div className="fc-wet" style={{ height: `${Math.round((r.wet / (r.dry + r.wet)) * 100)}%` }} />}
                  </div>
                  <div className="fc-bar water" style={{ height: `${Math.round((r.water / maxWater) * 100)}%` }} />
                </div>
                {(i % tick === tick - 1 || i === rows.length - 1) && <span className="fc-x">{md(r.date)}</span>}
              </div>
            ))}
          </div>
          <div className="fc-legend"><span><i className="food" /> 건식</span><span><i className="wet" /> 습식</span><span><i className="water" /> 물</span></div>
        </>
      )}
    </div>
  );
}

const fmtDiff = (n) => `${n > 0 ? "+" : ""}${Math.round(n * 100) / 100}`;

function Empty({ text, onAdd }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p className="subtle">{text}</p>
      <button type="button" className="btn-ghost small" onClick={onAdd}>기록하기</button>
    </div>
  );
}
