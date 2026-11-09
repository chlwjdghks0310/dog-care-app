import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSheetSwipe } from "./SwipeBack";
import Ico from "./Ico";
import { formatKoreanDate } from "../utils/date";
import { VITAL, fmtValue } from "../data/vitals";
import { TYPES, FILTER_ORDER, summarize, filterTimeline, groupVitalDays, foodTotals, foodTotalsText } from "../services/records";

const PERIODS = [[7, "7일"], [30, "30일"], [90, "90일"], [0, "전체"]];
const FIELD_LABEL = {
  weightKg: "체중(kg)", kinds: "증상", repeat: "빈도", since: "처음 본 날", observed: "보호자가 본 모습",
  kind: "종류", amount: "양", foodType: "먹은 것", grams: "먹은 양(g)", appetite: "식욕", water: "물", food: "사료 이름", treats: "간식", stool: "대변", urine: "소변",
  hospital: "병원", reason: "진료 사유", explanation: "수의사 설명", tests: "검사 결과", prescription: "처방", nextDate: "다음 날짜",
  nextAlarm: "알림", activity: "활동량", sleep: "수면", body: "피부·귀·눈", oral: "구강", minutes: "시간(분)", title: "제목",
  photoNote: "사진 분석(참고)", photoSummary: "사진에 보인 것", photoFlags: "병원에 연락해 보면 좋은 신호",
  name: "약", dose: "용량", status: "상태", time: "예정 시각", doneAt: "먹인 시각", metric: "수치", value: "값",
};
const KIND_LABEL = { dry: "건식", wet: "습식", water: "물" };

// 모든 기록 창: 아래에서 올라오는 창에 검색·종류·기간 거르기 + 날짜별 목록(날짜 제목에 그날 밥·물 합계).
// 기록 탭에서는 고치기·삭제가 되고, 우리 아이 탭에서는 보기만(readOnly, 11/10: 기록은 기록 창에서만).
// 닫기 = 왼쪽 위 버튼·바깥 누르기·오른쪽으로 밀기·폰 뒤로 버튼
export default function RecordsBrowser({ dog, items, initialTypes = [], initialDays = 0, title = "모든 기록", backLabel = "← 닫기", readOnly = false, onClose, onEdit, onDelete, onOpenMeds, onOpenVital }) {
  const [types, setTypes] = useState(initialTypes);
  const [days, setDays] = useState(initialDays);
  const [q, setQ] = useState("");
  const [order, setOrder] = useState("new");
  const [showFilters, setShowFilters] = useState(Boolean(initialTypes.length || initialDays));
  const [openId, setOpenId] = useState(null);
  const close = () => (history.state?.allRecords ? history.back() : onClose());
  const swipe = useSheetSwipe(close);
  useEffect(() => {
    if (!history.state?.allRecords) history.pushState({ allRecords: 1 }, "");
    addEventListener("popstate", onClose);
    return () => removeEventListener("popstate", onClose);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = groupVitalDays(filterTimeline(items, { types, days, q, order }), types);
  const filtered = types.length || days || q.trim();
  const dayTotals = (date) => {
    const t = foodTotalsText(foodTotals(dog.id, date));
    return t ? <span className="faint rec-date-sum"> · {t}</span> : null;
  };

  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="es-sheet all-sheet" role="dialog" aria-label={title} {...swipe}>
        <div className="es-top">
          <button type="button" className="btn-ghost small" onClick={close}>{backLabel}</button>
          <div className="es-title">{title}</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll">
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
            {filtered && <button type="button" className="link-btn" onClick={() => (setTypes([]), setDays(0), setQ(""))}>필터 지우기</button>}
          </div>

          {shown.length === 0 ? (
            <div className="card subtle" style={{ textAlign: "center" }}>
              {items.length === 0 ? "아직 기록이 없어요. 기록 탭 [＋ 새 기록]으로 첫 기록을 남겨 보세요." : "조건에 맞는 기록이 없어요."}
            </div>
          ) : (
            <div className="rec-list">
              {shown.map((r, i) => (
                <div key={`${r.source}-${r.id}`}>
                  {(i === 0 || shown[i - 1].at.slice(0, 10) !== r.at.slice(0, 10)) && <div className="rec-date">{formatKoreanDate(r.at.slice(0, 10))}{dayTotals(r.at.slice(0, 10))}</div>}
                  <RecordItem
                    rec={r}
                    open={openId === r.id}
                    onToggle={() => setOpenId(openId === r.id ? null : r.id)}
                    readOnly={readOnly}
                    onEdit={() => (r.source === "med" ? onOpenMeds?.() : r.source === "vday" ? onOpenVital?.(r.data.parts[0].metric) : (close(), onEdit?.(r)))}
                    onDelete={() => onDelete?.(r)}
                  />
                </div>
              ))}
            </div>
          )}
          {readOnly && items.length > 0 && <p className="faint" style={{ margin: "10px 2px 0", textAlign: "center" }}>고치거나 지우는 건 기록 탭에서 해요.</p>}
        </div>
      </div>
    </div>,
    document.body
  );
}

function RecordItem({ rec, open, onToggle, onEdit, onDelete, readOnly }) {
  if (rec.source === "vday") return <VitalDayItem rec={rec} open={open} onToggle={onToggle} onEdit={onEdit} readOnly={readOnly} />;
  const vitalDef = rec.type === "vital" && VITAL[rec.data?.metric];
  const mealKind = rec.type === "meal" && rec.data?.kind;
  const mealVital = vitalDef && vitalDef.inMeal; // 예전 건강 수치 칸에서 적은 건식·습식·물 → "종류 건식 · 양 30g"처럼 밥·물 기록과 같은 말로
  const label = (k) => (mealVital && k === "metric" ? "종류" : mealVital && k === "value" ? "양" : FIELD_LABEL[k]);
  const fmt = (k, v) => (mealVital && k === "metric" ? KIND_LABEL[v] || VITAL[v]?.label : mealVital && k === "value" ? `${v}${vitalDef.unit}` : k === "status" ? (v === "done" ? "먹임" : "건너뜀") : k === "doneAt" ? v?.slice(11, 16) : k === "kind" && KIND_LABEL[v] ? KIND_LABEL[v] : k === "amount" && mealKind ? `${v}${mealKind === "water" ? "ml" : "g"}` : k === "metric" && VITAL[v] ? VITAL[v].label : Array.isArray(v) ? v.join(", ") : String(v));
  return (
    <div className="card rec-item">
      <button type="button" className="rec-item-row" onClick={onToggle} aria-expanded={open}>
        <span className={`rec-icon tone-${(vitalDef && vitalDef.tone) || TYPES[rec.type].tone}`} aria-hidden="true"><Ico name={(vitalDef && vitalDef.ico) || (mealKind === "water" ? "droplet" : TYPES[rec.type].ico)} size={19} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="rec-item-title">{vitalDef ? (vitalDef.inMeal ? TYPES.meal.label : vitalDef.label) : TYPES[rec.type].label} <span className="faint">{rec.at.slice(11, 16)}</span></span>
          <span className="rec-item-text">{summarize(rec) || "내용 없음"}</span>
        </span>
        {rec.photos?.length > 0 && <span className="faint"><Ico name="clip" size={14} />{rec.photos.length}</span>}
      </button>
      {open && (
        <div className="rec-detail">
          {Object.entries(rec.data || {}).filter(([k, v]) => FIELD_LABEL[k] && k !== "nextAlarm" && v !== "" && v != null && !(Array.isArray(v) && !v.length)).map(([k, v]) => (
            <div key={k} className="vet-line"><span className="faint">{label(k)}</span> {fmt(k, v)}</div>
          ))}
          {rec.data?.nextAlarm && <div className="vet-line"><span className="faint">알림</span> 그날 아침 9시</div>}
          {rec.memo && <div className="vet-line"><span className="faint">메모</span> {rec.memo}</div>}
          {rec.photos?.map((p, i) => <img key={i} src={p} alt={`첨부 사진 ${i + 1}`} className="rec-detail-photo" />)}
          {rec.createdAt && <div className="faint" style={{ marginTop: 6 }}>작성 {rec.createdAt.slice(0, 10)}{rec.updatedAt && rec.updatedAt !== rec.createdAt ? ` · 수정 ${rec.updatedAt.slice(0, 10)}` : ""}</div>}
          {!readOnly && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" className="btn-ghost small" onClick={onEdit}>{rec.source === "med" ? "약 관리에서 고치기" : "고치기"}</button>
              {rec.source !== "med" && <button type="button" className="btn-ghost small" style={{ color: "var(--danger)" }} onClick={onDelete}>삭제</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 예전 건강 수치 칸에서 적은 건식·습식·물·산책의 하루 합계 한 줄(제목은 지금 쓰는 "밥·물", 11/10) — 펼치면 끼니별 시각·양
function VitalDayItem({ rec, open, onToggle, onEdit, readOnly }) {
  const meal = rec.data.group === "meal";
  return (
    <div className="card rec-item">
      <button type="button" className="rec-item-row" onClick={onToggle} aria-expanded={open}>
        <span className={`rec-icon tone-${meal ? "rose" : "violet"}`} aria-hidden="true"><Ico name={meal ? "bowl" : "walk"} size={19} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="rec-item-title">{meal ? TYPES.meal.label : "산책"} <span className="faint">하루 합계</span></span>
          <span className="rec-item-text">{summarize(rec)}</span>
        </span>
      </button>
      {open && (
        <div className="rec-detail">
          {rec.data.entries.map((e, i) => (
            <div key={i} className="vet-line"><span className="faint">{e.at.slice(11, 16)}</span> {VITAL[e.metric]?.label} {fmtValue(e.metric, e.value)}{VITAL[e.metric]?.unit}</div>
          ))}
          <div className="faint" style={{ marginTop: 6 }}>예전에 건강 수치 칸에서 적은 기록이에요. 지금은 기록 탭 밥·물에서 적어요.</div>
          {!readOnly && <div style={{ display: "flex", gap: 8, marginTop: 10 }}><button type="button" className="btn-ghost small" onClick={onEdit}>건강 수치에서 보기</button></div>}
        </div>
      )}
    </div>
  );
}
