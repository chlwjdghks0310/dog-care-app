import { useState } from "react";
import { formatKoreanDate } from "../utils/date";
import { deleteWeightRecord, getWeightRecords } from "../services/weightLog";
import { syncPushAlarms } from "../services/notifications";
import WeightChart from "../components/WeightChart";
import RecordForm from "./RecordForm";
import DogReaction from "../components/DogReaction";
import { VITAL } from "../data/vitals";
import { TYPES, FILTER_ORDER, LEVELS, md, summarize, getTimeline, filterTimeline, deleteRecord, levelSeries } from "../services/records";

const PERIODS = [[7, "7일"], [30, "30일"], [90, "90일"], [0, "전체"]];
const FIELD_LABEL = {
  weightKg: "체중(kg)", kinds: "증상", repeat: "빈도", since: "처음 본 날", observed: "보호자가 본 모습",
  appetite: "식욕", water: "물", food: "사료", amount: "급여량", treats: "간식", stool: "대변", urine: "소변",
  hospital: "병원", reason: "진료 사유", explanation: "수의사 설명", tests: "검사 결과", prescription: "처방", nextDate: "다음 날짜",
  nextAlarm: "알림", activity: "활동량", sleep: "수면", body: "피부·귀·눈", oral: "구강", kind: "종류", minutes: "시간(분)", title: "제목",
  photoNote: "사진 분석(참고)", photoSummary: "사진에 보인 것", photoFlags: "병원에 연락해 보면 좋은 신호",
  name: "약", dose: "용량", status: "상태", time: "예정 시각", doneAt: "먹인 시각",
};
const TREND_FIELDS = [["appetite", "식욕"], ["water", "물"], ["activity", "활동량"], ["sleep", "수면"]];

// 전체 기록(타임라인) + 변화 보기. startNew면 열자마자 새 기록 추가.
export default function Records({ dog, startNew, startType, initialTypes, onBack, onOpenMeds }) {
  const [view, setView] = useState("list");
  const [form, setForm] = useState(startNew ? { initial: null, type: startType } : null);
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
    setView("list");
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

  const shown = filterTimeline(items, { types, days, q, order });
  const filtered = types.length || days || q.trim();

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>← 프로필로</button>
      <div className="h1">{dog.name}의 기록</div>
      <div style={{ display: "flex", gap: 6, margin: "10px 0 14px" }}>
        <button type="button" className={`seg${view === "list" ? " on" : ""}`} onClick={() => setView("list")}>전체 기록</button>
        <button type="button" className={`seg${view === "trend" ? " on" : ""}`} onClick={() => setView("trend")}>변화 보기</button>
      </div>

      {form ? (
        <RecordForm dog={dog} initial={form.initial} startType={form.type} onSaved={handleSaved} onCancel={() => setForm(null)} onOpenMeds={onOpenMeds} />
      ) : (
        <button type="button" className="btn-primary" style={{ marginBottom: 14 }} onClick={() => (setNotice(""), setReaction(null), setForm({ initial: null }))}>
          ＋ 새 기록
        </button>
      )}
      {reaction && !form && <DogReaction dog={dog} rec={reaction} onClose={() => setReaction(null)} />}
      {notice && !form && <p className="subtle" role="status" style={{ margin: "0 0 10px" }}>{notice}</p>}

      {!form && view === "list" && (
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
                  {TYPES[t].icon} {TYPES[t].label}
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
                    onEdit={() => (r.source === "med" ? onOpenMeds() : (setNotice(""), setReaction(null), setForm({ initial: r })))}
                    onDelete={() => handleDelete(r)}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!form && view === "trend" && <Trends dog={dog} items={items} onAdd={() => setForm({ initial: null })} />}
    </div>
  );
}

function RecordItem({ rec, open, onToggle, onEdit, onDelete }) {
  return (
    <div className="card rec-item">
      <button type="button" className="rec-item-row" onClick={onToggle} aria-expanded={open}>
        <span className="rec-icon" aria-hidden="true">{TYPES[rec.type].icon}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="rec-item-title">{(rec.type === "vital" && VITAL[rec.data?.metric]?.label) || TYPES[rec.type].label} <span className="faint">{rec.at.slice(11, 16)}</span></span>
          <span className="rec-item-text">{summarize(rec) || "내용 없음"}</span>
        </span>
        {rec.photos?.length > 0 && <span className="faint">📎{rec.photos.length}</span>}
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

// 변화 보기 — 실제로 저장된 값만 쓴다. 기록 없는 날은 채우지 않고, 비교할 값이 없으면 그렇다고 말한다.
function Trends({ dog, items, onAdd }) {
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
        <div className="h2">⚖️ 체중 <span className="faint">측정값</span></div>
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
        <div className="h2">📝 보호자 관찰 추세</div>
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

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">🤒 이 기간 증상</div>
        {symptoms.length === 0 ? (
          <p className="subtle" style={{ margin: 0 }}>최근 {days}일 기록된 증상이 없습니다.</p>
        ) : (
          Object.entries(kindCount).map(([k, dates]) => (
            <div key={k} className="vet-line">{k} {dates.length}번 <span className="faint">({dates.join(", ")})</span></div>
          ))
        )}
      </div>

      <div className="card">
        <div className="h2">📊 이 기간 기록</div>
        {inPeriod.length === 0 ? (
          <Empty text={`최근 ${days}일 기록이 없습니다.`} onAdd={onAdd} />
        ) : (
          <div className="vet-line">
            {Object.entries(TYPES).map(([t, v]) => [v, inPeriod.filter((r) => r.type === t).length]).filter(([, n]) => n).map(([v, n]) => `${v.icon} ${v.label} ${n}`).join(" · ")}
          </div>
        )}
        {observed > 0 && observed < 5 && <p className="faint">관찰 기록이 적어요. 식사·배변·컨디션을 며칠 더 남기면 변화가 더 잘 보여요.</p>}
        <p className="faint" style={{ marginBottom: 0 }}>보호자가 남긴 기록을 모아 보여 줄 뿐, 건강 상태를 판정하지 않아요. 걱정되는 변화가 있으면 수의사와 상담해 주세요.</p>
      </div>
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
