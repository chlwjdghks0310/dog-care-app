import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSheetSwipe } from "../components/SwipeBack";
import { formatKoreanDate } from "../utils/date";
import { deleteWeightRecord, getWeightRecords } from "../services/weightLog";
import { syncPushAlarms } from "../services/notifications";
import WeightChart from "../components/WeightChart";
import RecordForm from "./RecordForm";
import DogReaction from "../components/DogReaction";
import { VITAL, fmtValue } from "../data/vitals";
import Ico from "../components/Ico";
import RecordCalendar from "../components/RecordCalendar";
import QuickAddFab from "../components/QuickAddFab";
import { TYPES, FILTER_ORDER, LEVELS, md, summarize, getTimeline, filterTimeline, groupVitalDays, deleteRecord, levelSeries, dateAt } from "../services/records";

const PERIODS = [[7, "7일"], [30, "30일"], [90, "90일"], [0, "전체"]];
const FIELD_LABEL = {
  weightKg: "체중(kg)", kinds: "증상", repeat: "빈도", since: "처음 본 날", observed: "보호자가 본 모습",
  foodType: "먹은 것", grams: "먹은 양(g)", appetite: "식욕", water: "물", food: "사료 이름", amount: "급여량", treats: "간식", stool: "대변", urine: "소변",
  hospital: "병원", reason: "진료 사유", explanation: "수의사 설명", tests: "검사 결과", prescription: "처방", nextDate: "다음 날짜",
  nextAlarm: "알림", activity: "활동량", sleep: "수면", body: "피부·귀·눈", oral: "구강", kind: "종류", minutes: "시간(분)", title: "제목",
  photoNote: "사진 분석(참고)", photoSummary: "사진에 보인 것", photoFlags: "병원에 연락해 보면 좋은 신호",
  name: "약", dose: "용량", status: "상태", time: "예정 시각", doneAt: "먹인 시각",
};
const TREND_FIELDS = [["appetite", "식욕"], ["water", "물"], ["activity", "활동량"], ["sleep", "수면"]];

// 기록 탭: 달력(첫 화면) · 변화 보기 두 칸, 모든 기록(검색·종류별)은 달력 아래 버튼으로. startNew면 열자마자 새 기록 추가.
// 컴플레인 11/9: 전체 기록이 먼저 나오니 "다 채워야 하나" 싶어 같은 걸 매일 반복해 적음 → 달력에서 평소/다른 것만, 필요하면 [＋ 이날 더 적기]
export default function Records({ dog, startNew, startType, prefill, initialTypes, onBack, backLabel = "← 기록으로", onOpenMeds, onOpenVital, onNew, onOpenFeeding, onQuickAdd, onOpenGallery, onPickType }) {
  const [view, setView] = useState(initialTypes?.length ? "list" : "cal");
  const [calDate, setCalDate] = useState(null); // 방금 적은 기록의 날짜를 달력에서 보여 주기
  const [allOpen, setAllOpen] = useState(false); // 모든 기록 보기·찾기 = 아래에서 올라오는 창(사용자 요청 11/9)
  const topRef = useRef(null);
  const [form, setForm] = useState(startNew ? { initial: null, type: startType } : null);
  useEffect(() => { if (form?.initial) topRef.current?.scrollIntoView({ block: "start" }); }, [form]); // 고치기는 맨 위부터
  const [items, setItems] = useState(() => getTimeline(dog.id));
  const [types, setTypes] = useState(initialTypes || []);
  const [days, setDays] = useState(0);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("new");
  const [showFilters, setShowFilters] = useState(Boolean(initialTypes?.length)); // 종류·기간 버튼은 접어 두고 검색창만
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState("");
  const [reaction, setReaction] = useState(null); // 방금 저장한 기록 — 강아지 반응 카드
  const reload = () => setItems(getTimeline(dog.id));

  function handleSaved(rec) {
    setForm(null);
    reload();
    setView("cal");
    setAllOpen(false);
    setCalDate((rec.at || rec.measuredAt || "").slice(0, 10) || null);
    setOpenId(rec.id);
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
      setOpenId(null);
      setNotice("지웠어요.");
    } catch (err) {
      setNotice(err.message);
    }
  }

  const shown = groupVitalDays(filterTimeline(items, { types, days, q, order }), types);
  const filtered = types.length || days || q.trim();

  const listBody = (
    <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="rec-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색 (예: 구토)" aria-label="기록 검색" style={{ flex: 1, minWidth: 0 }} />
              <button type="button" className={`seg${showFilters || types.length || days ? " on" : ""}`} aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)} style={{ flexShrink: 0 }}>
                필터{types.length + (days ? 1 : 0) ? ` ${types.length + (days ? 1 : 0)}` : ""} {showFilters ? "▴" : "▾"}
              </button>
            </div>
            {showFilters && (
            <>
            <div className="chip-wrap" style={{ margin: "10px 0" }}>
              {FILTER_ORDER.map((t) => (
                <button key={t} type="button" className={`seg${types.includes(t) ? " on" : ""}`} aria-pressed={types.includes(t)} onClick={() => setTypes((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]))}>
                  <Ico name={TYPES[t].ico} size={15} /> {TYPES[t].label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {PERIODS.map(([d, label]) => (
                <button key={d} type="button" className={`seg${days === d ? " on" : ""}`} onClick={() => setDays(d)}>{label}</button>
              ))}
              <button type="button" className="seg" onClick={() => setOrder((o) => (o === "new" ? "old" : "new"))} aria-label="정렬 바꾸기">
                {order === "new" ? "최신순" : "과거순"}
              </button>
            </div>
            </>
            )}
            {filtered && (
              <button type="button" className="link-btn" onClick={() => (setTypes([]), setDays(0), setQ(""))}>필터 지우기</button>
            )}
          </div>

          {shown.length === 0 ? (
            <div className="card subtle" style={{ textAlign: "center" }}>
              {items.length === 0 ? "아직 기록이 없습니다. [＋ 새 기록]으로 첫 기록을 남겨 보세요." : "조건에 맞는 기록이 없어요."}
            </div>
          ) : (
            <div className="rec-list">
              {shown.map((r, i) => (
                <div key={`${r.source}-${r.id}`}>
                  {(i === 0 || shown[i - 1].at.slice(0, 10) !== r.at.slice(0, 10)) && <div className="rec-date">{formatKoreanDate(r.at.slice(0, 10))}</div>}
                  <RecordItem
                    rec={r}
                    open={openId === r.id}
                    onToggle={() => setOpenId(openId === r.id ? null : r.id)}
                    onEdit={() => (r.source === "med" ? onOpenMeds() : r.source === "vday" ? onOpenVital?.(r.data.parts[0].metric) : (history.state?.allRecords && history.back(), setNotice(""), setReaction(null), setForm({ initial: r })))}
                    onDelete={() => handleDelete(r)}
                  />
                </div>
              ))}
            </div>
          )}
    </>
  );

  return (
    <div className="screen">
      {onBack && <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>{backLabel}</button>}
      <div className="h1" ref={topRef}>{dog.name}의 기록</div>
      {/* 새 기록·고치기 중엔 보기 바꾸기를 숨긴다(사용자 요청 11/7) */}
      {!form && <div style={{ display: "flex", gap: 6, margin: "10px 0 14px" }}>
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

      {!form && view === "list" && (
        <>
          <div className="h2" style={{ marginBottom: 8 }}>모든 기록</div>
          {listBody}
        </>
      )}
      {!form && view === "cal" && allOpen && <AllRecordsSheet onClose={() => setAllOpen(false)}>{listBody}</AllRecordsSheet>}

      {!form && view === "cal" && <RecordCalendar key={calDate || ""} dog={dog} items={items} initialDate={calDate} onChanged={reload} onAdd={(date) => (onNew ? onNew(date) : setForm({ initial: null, prefill: { at: dateAt(date) } }))} onShowAll={() => setAllOpen(true)} />}
      {!form && view === "trend" && <Trends dog={dog} items={items} onPick={(t, d) => (setTypes([t]), setDays(d), setShowFilters(true), setView("list"))} onAdd={() => (onNew ? onNew() : setForm({ initial: null }))} />}
      {!form && !startNew && <QuickAddFab onPick={onQuickAdd} />}
    </div>
  );
}

function RecordItem({ rec, open, onToggle, onEdit, onDelete }) {
  if (rec.source === "vday") return <VitalDayItem rec={rec} open={open} onToggle={onToggle} onEdit={onEdit} />;
  return (
    <div className="card rec-item">
      <button type="button" className="rec-item-row" onClick={onToggle} aria-expanded={open}>
        <span className={`rec-icon tone-${(rec.type === "vital" && VITAL[rec.data?.metric]?.tone) || TYPES[rec.type].tone}`} aria-hidden="true"><Ico name={(rec.type === "vital" && VITAL[rec.data?.metric]?.ico) || TYPES[rec.type].ico} size={19} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="rec-item-title">{(rec.type === "vital" && VITAL[rec.data?.metric]?.label) || TYPES[rec.type].label} <span className="faint">{rec.at.slice(11, 16)}</span></span>
          <span className="rec-item-text">{summarize(rec) || "내용 없음"}</span>
        </span>
        {rec.photos?.length > 0 && <span className="faint"><Ico name="clip" size={14} />{rec.photos.length}</span>}
      </button>
      {open && (
        <div className="rec-detail">
          {Object.entries(rec.data || {}).filter(([k]) => FIELD_LABEL[k] && k !== "nextAlarm").map(([k, v]) => (
            <div key={k} className="vet-line"><span className="faint">{FIELD_LABEL[k]}</span> {k === "status" ? (v === "done" ? "먹임" : "건너뜀") : k === "doneAt" ? v?.slice(11, 16) : Array.isArray(v) ? v.join(", ") : String(v)}</div>
          ))}
          {rec.data?.nextAlarm && <div className="vet-line"><span className="faint">알림</span> 그날 아침 9시</div>}
          {rec.memo && <div className="vet-line"><span className="faint">메모</span> {rec.memo}</div>}
          {rec.photos?.map((p, i) => <img key={i} src={p} alt={`첨부 사진 ${i + 1}`} className="rec-detail-photo" />)}
          {rec.createdAt && <div className="faint" style={{ marginTop: 6 }}>작성 {rec.createdAt.slice(0, 10)}{rec.updatedAt && rec.updatedAt !== rec.createdAt ? ` · 수정 ${rec.updatedAt.slice(0, 10)}` : ""}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn-ghost small" onClick={onEdit}>{rec.source === "med" ? "약 관리에서 고치기" : "고치기"}</button>
            {rec.source !== "med" && <button type="button" className="btn-ghost small" style={{ color: "var(--danger)" }} onClick={onDelete}>삭제</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// 식사·산책 목록의 하루 합계 한 줄(건강 수치 칸에서 적은 먹은 양·산책) — 펼치면 끼니별 시각·양, 고치기는 건강 수치 화면에서
function VitalDayItem({ rec, open, onToggle, onEdit }) {
  const meal = rec.data.group === "meal";
  return (
    <div className="card rec-item">
      <button type="button" className="rec-item-row" onClick={onToggle} aria-expanded={open}>
        <span className={`rec-icon tone-${meal ? "rose" : "violet"}`} aria-hidden="true"><Ico name={meal ? "bowl" : "walk"} size={19} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="rec-item-title">{meal ? "먹은 양" : "산책"} <span className="faint">하루 합계</span></span>
          <span className="rec-item-text">{summarize(rec).replace(/^먹은 양 · /, "")}</span>
        </span>
      </button>
      {open && (
        <div className="rec-detail">
          {rec.data.entries.map((e, i) => (
            <div key={i} className="vet-line"><span className="faint">{e.at.slice(11, 16)}</span> {VITAL[e.metric]?.label} {fmtValue(e.metric, e.value)}{VITAL[e.metric]?.unit}</div>
          ))}
          <div className="faint" style={{ marginTop: 6 }}>예전에 건강 수치 칸에서 적은 기록이에요. 지금은 식사 기록에서 한 번에 적어요.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn-ghost small" onClick={onEdit}>건강 수치에서 고치기</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 변화 보기 — 실제로 저장된 값만 쓴다. 기록 없는 날은 채우지 않고, 비교할 값이 없으면 그렇다고 말한다.
function Trends({ dog, items, onAdd, onPick }) {
  const [days, setDays] = useState(30);
  const [field, setField] = useState("appetite");
  const inPeriod = filterTimeline(items, { days, order: "old" });
  const weights = getWeightRecords(dog.id);
  const periodWeights = weights.filter((w) => inPeriod.some((r) => r.source === "weight" && r.id === w.id));
  const latest = weights.at(-1);
  const prev = weights.at(-2);
  const series = levelSeries(dog.id, field, days);
  const symptoms = inPeriod.filter((r) => r.type === "symptom");
  const kindCount = {};
  for (const s of symptoms) for (const k of s.data.kinds) (kindCount[k] ||= []).push(md(s.at.slice(0, 10)));
  const observed = inPeriod.filter((r) => r.source === "record").length;

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {PERIODS.slice(0, 3).map(([d, label]) => (
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
              최근 {latest.weightKg}kg ({md(latest.measuredAt.slice(0, 10))})
              {prev ? ` · 이전 ${prev.weightKg}kg (${md(prev.measuredAt.slice(0, 10))}) 대비 ${fmtDiff(latest.weightKg - prev.weightKg)}kg` : " · 비교할 이전 측정값이 없어요"}
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

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2"><Ico name="note" size={18} /> 보호자 관찰 추세</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {TREND_FIELDS.map(([k, label]) => (
            <button key={k} type="button" className={`seg${field === k ? " on" : ""}`} onClick={() => setField(k)}>{label}</button>
          ))}
        </div>
        {series.length === 0 ? (
          <Empty text={`최근 ${days}일 ${TREND_FIELDS.find(([k]) => k === field)[1]} 기록이 없습니다.`} onAdd={onAdd} />
        ) : (
          <>
            <p className="subtle" style={{ marginTop: 0 }}>
              기록 {series.length}번 · {LEVELS.map((l) => `${l.replace("평소보다 ", "")} ${series.filter((s) => s.value === l).length}`).join(" · ")}
            </p>
            <div className="chip-wrap">
              {series.map((s, i) => (
                <span key={i} className={`rec-level lv${LEVELS.indexOf(s.value)}`}>{md(s.at.slice(0, 10))} {s.value.replace("평소보다 ", "")}</span>
              ))}
            </div>
            {series.length < 3 && <p className="faint">기록이 {series.length}번뿐이라 추세라고 보긴 어려워요.</p>}
          </>
        )}
      </div>

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
        {observed > 0 && observed < 5 && <p className="faint">관찰 기록이 적어요. 식사·배변·컨디션을 며칠 더 남기면 변화가 더 잘 보여요.</p>}
        <p className="faint" style={{ marginBottom: 0 }}>보호자가 남긴 기록을 모아 보여 줄 뿐, 건강 상태를 판정하지 않아요. 걱정되는 변화가 있으면 수의사와 상담해 주세요.</p>
      </section>
    </>
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

// 모든 기록: 달력 위로 아래에서 올라오는 창. 닫기 = [← 달력으로]·바깥 누르기·오른쪽으로 밀기(다른 화면 뒤로가기와 같게)·폰 뒤로 버튼
function AllRecordsSheet({ onClose, children }) {
  // 폰 뒤로 버튼도 창만 닫게 기록을 하나 쌓고, 닫을 땐 그 기록을 되돌려(popstate) 닫는다
  const close = () => (history.state?.allRecords ? history.back() : onClose());
  const swipe = useSheetSwipe(close);
  useEffect(() => {
    if (!history.state?.allRecords) history.pushState({ allRecords: 1 }, "");
    addEventListener("popstate", onClose);
    return () => removeEventListener("popstate", onClose);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="es-sheet all-sheet" role="dialog" aria-label="모든 기록" {...swipe}>
        <div className="es-top">
          <button type="button" className="btn-ghost small" onClick={close}>← 달력으로</button>
          <div className="es-title">모든 기록</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll">{children}</div>
      </div>
    </div>,
    document.body
  );
}
