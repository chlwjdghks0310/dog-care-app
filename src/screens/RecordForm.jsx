import { cloneElement, isValidElement, useId, useMemo, useRef, useState } from "react";
import { useHelpTip } from "../components/HelpTip";
import { todayKey } from "../utils/date";
import { resizeImageFile } from "../utils/image";
import { addWeightRecord, updateWeightRecord } from "../services/weightLog";
import { syncPushAlarms } from "../services/notifications";
import { quickStoolCheck } from "../services/aiClient";
import { normalizeStoolResult } from "../services/photoCheck";
import { VITALS, VITAL } from "../data/vitals";
import { VITAL_TIPS } from "../data/vitalTips";
import Ico from "../components/Ico";
import { linkVetExpense } from "../services/vetVisits";
import { stoolFlags, conditionFlags } from "../services/healthRules";
import { StoolCheck, ConditionCheck } from "../components/HealthChecks";
import {
  TYPES, ADD_ORDER, LEVELS, MEAL_KINDS, MEAL_KIND, SYMPTOM_KINDS, REPEAT, STOOL, URINE, DAILY_KINDS, LIFE_KINDS,
  localNow, newRecordId, validateRecord, saveRecord, syncSchedule, getRecords,
} from "../services/records";

const MAX_PHOTOS = 4;

// 새 기록 추가: 종류를 고르면 그 종류에 필요한 칸만 보여 준다. initial이 있으면 그 기록 고치기.
// prefill: 새 기록에 미리 채울 { at?, data? } (예: 지난 병원 일정에서 "진료 내용 기록하기")
export default function RecordForm({ dog, initial, startType, prefill, onSaved, onCancel, onOpenMeds, onOpenFeeding, onOpenGallery, onPickType }) {
  const [type, setType] = useState(initial?.type || startType || null);
  if (!type) return <TypePicker onPick={(t) => (t === "med" ? onOpenMeds() : t === "media" && onOpenGallery ? onOpenGallery() : onPickType ? onPickType(t) : setType(t))} onCancel={onCancel} />;
  const onSwitch = !initial && (type === "daily" || type === "condition") ? setType : null; // 일상 ↔ 컨디션은 한 타일에서 고른다(11/10, 8개)
  return <Form key={type} dog={dog} type={type} initial={initial} prefill={prefill} onSaved={onSaved} onSwitch={onSwitch} onBack={initial || prefill?.data ? onCancel : onPickType ? null : () => setType(null)} onOpenFeeding={onOpenFeeding} />;
}

function TypePicker({ onPick, onCancel }) {
  return (
    <div className="card">
      <div className="rec-head">
        <div className="h2" style={{ margin: 0 }}>어떤 기록을 남길까요?</div>
        <button type="button" className="btn-ghost small" onClick={onCancel}>닫기</button>
      </div>
      <div className="rec-type-grid">
        {ADD_ORDER.map((t) => (
          <button key={t} type="button" className="quick-tile" onClick={() => onPick(t)}>
            <span className={`quick-tile-icon tone-${TYPES[t].tone}`} aria-hidden="true"><Ico name={TYPES[t].ico} size={24} sticker /></span>
            <span className="quick-tile-label">{TYPES[t].pick || TYPES[t].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// 한 번 더 누르면 선택 해제되는 단일 선택 버튼 묶음
function Pick({ options, value, onChange, multi }) {
  const on = (o) => (multi ? value.includes(o) : value === o);
  const click = (o) => onChange(multi ? (on(o) ? value.filter((x) => x !== o) : [...value, o]) : on(o) ? "" : o);
  return (
    <div className="chip-wrap">
      {options.map((o) => (
        <button key={o} type="button" className={`seg${on(o) ? " on" : ""}`} aria-pressed={on(o)} onClick={() => click(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  const id = useId();
  return (
    // 입력칸이면 칸 이름과 이어 화면 읽기가 읽게 한다(점검 11/7, axe label). 버튼 묶음(Pick)은 그대로
    <div className="field">
      <label htmlFor={isValidElement(children) && ["input", "textarea", "select"].includes(children.type) ? id : undefined}>{label}</label>
      {isValidElement(children) && ["input", "textarea", "select"].includes(children.type) ? cloneElement(children, { id }) : children}
    </div>
  );
}

function Form({ dog, type, initial, prefill, onSaved, onBack, onOpenFeeding, onSwitch }) {
  const [id] = useState(() => initial?.id || newRecordId()); // 같은 id로 저장해 두 번 눌러도 기록은 하나
  const [at, setAt] = useState(initial?.at || prefill?.at || localNow());
  const [data, setData] = useState(() => ({ ...defaults(type, dog), ...prefill?.data, ...initial?.data }));
  const [memo, setMemo] = useState(initial?.memo || prefill?.memo || "");
  const [photos, setPhotos] = useState(initial?.photos || []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savedWeightId = useRef(initial?.source === "weight" ? initial.id : null);
  const set = (k) => (v) => setData((d) => ({ ...d, [k]: v?.target ? v.target.value : v }));
  const input = (k, props = {}) => <input value={data[k] ?? ""} onChange={set(k)} {...props} />;
  const patch = (p) => setData((d) => ({ ...d, ...p }));
  // 규칙 기반 병원 안내(배변·컨디션) — 같은 강아지의 다른 기록과 날짜로 "이틀 이어짐"을 본다
  const others = useMemo(() => (type === "potty" || type === "condition" ? getRecords(dog.id).filter((r) => r.type === type && r.id !== id) : []), [dog.id, type, id]);
  const flags = type === "potty" ? stoolFlags(data, others, at.slice(0, 10)) : type === "condition" ? conditionFlags(data.check, others, at.slice(0, 10)) : null;
  const text = (k, placeholder, rows = 2) => <textarea rows={rows} value={data[k] ?? ""} onChange={set(k)} placeholder={placeholder} maxLength={500} />;

  async function addPhotos(e) {
    const files = [...(e.target.files || [])].slice(0, MAX_PHOTOS - photos.length);
    e.target.value = "";
    try {
      const urls = await Promise.all(files.map((f) => resizeImageFile(f, 720, 0.8)));
      setPhotos((p) => [...p, ...urls].slice(0, MAX_PHOTOS));
    } catch {
      setError("사진을 불러오지 못했어요. 다른 사진으로 해 주세요.");
    }
  }

  function save() {
    if (saving) return;
    setError("");
    const base = flags ? { ...data, flags } : data;
    const rec = { id, type, at, data: type === "vital" ? { ...clean(base), value: Number(base.value) } : clean(base), memo: memo.trim(), photos };
    const problem = validateRecord(rec);
    if (problem) return setError(problem);
    setSaving(true);
    try {
      let saved;
      if (type === "weight") {
        const input = { weightKg: Math.round(Number(data.weightKg) * 100) / 100, measuredAt: `${at}:00`, note: rec.memo };
        // 체중은 기존 체중 기록에 저장(체중 관리·그래프와 같은 기록)
        saved = savedWeightId.current ? updateWeightRecord(dog.id, savedWeightId.current, input) : addWeightRecord(dog.id, input);
        savedWeightId.current = saved.id;
      } else {
        saved = saveRecord(dog.id, { ...rec, links: initial?.links, expenseId: initial?.expenseId });
        // 진료비를 적으면 가계부(병원·치료)에도 같은 지출로 — 고치면 그 지출도 같이 고친다
        if (type === "vet") {
          const expenseId = linkVetExpense(dog.id, saved);
          if (expenseId !== saved.expenseId) saved = saveRecord(dog.id, { ...saved, expenseId });
        }
        const next = type === "vet" ? data.nextDate : type === "life" && data.kind === "예방접종" ? data.nextDate : "";
        if (next || initial?.links) {
          const title = type === "vet" ? `${data.hospital ? `${data.hospital} ` : ""}진료 (${data.reason.trim()})` : `예방접종${data.title ? ` (${data.title.trim()})` : ""}`;
          const links = syncSchedule(dog.id, saved, { title, date: next, alarm: Boolean(data.nextAlarm), kind: type === "vet" ? "vet" : "vaccine" });
          saved = saveRecord(dog.id, { ...saved, links });
          syncPushAlarms(); // 알람이 바뀌었을 수 있다 — 실패해도 기록은 이미 저장됨
        }
      }
      // 저장 버튼을 연타하면 화면이 바뀐 뒤 그 자리의 다른 버튼이 눌리던 것(11/11 점검 #15) → 0.4초 동안 탭을 무시
      document.body.classList.add("tap-shield");
      setTimeout(() => document.body.classList.remove("tap-shield"), 400);
      onSaved(saved);
    } catch (err) {
      setError(err.message || "저장하지 못했어요. 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  return (
    <div className="card" data-editing="">{/* 적는 중 표시 — 가족 공유로 새 기록이 와도 App이 이 화면을 새로 그리지 않는다(폼이 비워지지 않게) */}
      <div className="rec-head">
        <div className="h2" style={{ margin: 0 }}><Ico name={TYPES[type].ico} size={20} style={{ color: "var(--accent-strong)" }} /> {onSwitch ? TYPES.daily.pick : TYPES[type].label} {initial ? "고치기" : "기록"}</div>
        {onBack && <button type="button" className="btn-ghost small" onClick={onBack}>{initial || prefill?.data ? "취소" : "← 종류"}</button>}
      </div>
      {onSwitch && (
        <div className="meal-seg" role="tablist" aria-label="일상 또는 컨디션" style={{ marginBottom: 12, gridTemplateColumns: "1fr 1fr" }}>
          {["daily", "condition"].map((t) => (
            <button key={t} type="button" role="tab" className={`meal-seg-btn${type === t ? " on" : ""}`} aria-selected={type === t} onClick={() => onSwitch(t)}>
              <Ico name={TYPES[t].ico} size={16} /> {TYPES[t].label}
            </button>
          ))}
        </div>
      )}

      <Field label={type === "vet" ? "방문 날짜·시각" : type === "symptom" ? "본 날짜·시각" : "날짜·시각"}>
        <input type="datetime-local" value={at} max={localNow()} onChange={(e) => setAt(e.target.value)} />
      </Field>

      {type === "weight" && <Field label="체중 (kg)">{input("weightKg", { type: "number", inputMode: "decimal", step: "0.1", min: "0.1", placeholder: "예: 3.4", autoFocus: true })}</Field>}

      {type === "vital" && (
        <>
          <Field label="어떤 수치">
            <select value={data.metric || ""} onChange={set("metric")} disabled={Boolean(initial)}>
              <option value="" disabled>골라 주세요</option>
              {VITALS.filter((v) => !v.external && ((!v.old && !v.inMeal) || v.id === initial?.data?.metric)).map((v) => <option key={v.id} value={v.id}>{v.label} ({v.unit})</option>)}
            </select>
          </Field>
          {data.metric && <Field label={`${VITAL[data.metric].label} (${VITAL[data.metric].unit})`}>{input("value", { type: "number", inputMode: "decimal", step: VITAL[data.metric].step })}</Field>}
        </>
      )}

      {type === "symptom" && (
        <>
          <Field label="어떤 증상인가요? (여러 개 가능)"><Pick multi options={SYMPTOM_KINDS} value={data.kinds} onChange={set("kinds")} /></Field>
          <Field label="얼마나 자주">
            <Pick options={REPEAT} value={data.repeat} onChange={set("repeat")} />
          </Field>
          <Field label="처음 본 날 (모르면 비워 두세요)">{input("since", { type: "date", max: todayKey() })}</Field>
          <Field label="보호자가 본 모습">{text("observed", "예: 아침에 노란 거품 토를 1번 했어요. 그 뒤로 밥은 반만 먹었어요.", 3)}</Field>
        </>
      )}

      {type === "meal" && !initial?.data?.foodType && !initial?.data?.grams && (
        /* 밥·물(11/10): 위에서 건식·습식·물 중 하나 → 양은 큰 숫자 + 자주 쓰는 양 버튼 → 느낌 → 짧은 "이렇게 재요". 한 번에 한 종류라 창이 짧다 */
        <MealFields data={data} set={set} patch={patch} input={input} onOpenFeeding={onOpenFeeding} />
      )}
      {type === "meal" && (initial?.data?.foodType || initial?.data?.grams) && (
        /* 11/9 낮에 적은 예전 식사 기록 고치기 — 그때 모양 그대로 */
        <>
          <Field label="먹은 양 (g)">{input("grams", { type: "number", inputMode: "numeric", min: "1", max: "3000" })}</Field>
          <Field label="식욕"><Pick options={LEVELS} value={data.appetite} onChange={set("appetite")} /></Field>
          <Field label="물 마시는 양"><Pick options={LEVELS} value={data.water} onChange={set("water")} /></Field>
          <Field label="사료 이름">{input("food", {})}</Field>
          <Field label="간식">{input("treats", {})}</Field>
        </>
      )}

      {type === "potty" && (
        <>
          <StoolCheck data={data} onChange={patch} flags={flags} />
          <Field label="대변"><Pick options={STOOL} value={data.stool} onChange={set("stool")} /></Field>
          <Field label="소변"><Pick options={URINE} value={data.urine} onChange={set("urine")} /></Field>
        </>
      )}

      {type === "vet" && (
        <>
          <Field label="병원 이름">{input("hospital", { placeholder: "예: 행복동물병원" })}</Field>
          <Field label="진료 사유">{input("reason", { placeholder: "예: 구토, 정기 검진" })}</Field>
          <Field label="수의사 설명">{text("explanation", "들은 내용을 그대로 적어 두세요")}</Field>
          <Field label="검사 결과">{text("tests", "예: 혈액검사 정상, 엑스레이 이상 없음")}</Field>
          <Field label="처방">{text("prescription", "예: 위장약 5일분 (매일 먹일 약은 약 관리에도 등록하면 알림이 와요)")}</Field>
          <Field label="진료비 (선택)">
            <input
              value={data.cost ? Number(data.cost).toLocaleString("ko-KR") : ""}
              onChange={(e) => set("cost")(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="예: 80,000 — 적으면 가계부에도 기록돼요"
            />
          </Field>
          <NextDate data={data} set={set} label="다음 진료일" />
        </>
      )}

      {type === "condition" && (
        <>
          <Field label="활동량"><Pick options={LEVELS} value={data.activity} onChange={set("activity")} /></Field>
          <Field label="수면"><Pick options={LEVELS} value={data.sleep} onChange={set("sleep")} /></Field>
          <div className="h2" style={{ fontSize: 15 }}>컨디션 체크 (평소와 비교)</div>
          <ConditionCheck check={data.check} onChange={set("check")} flags={flags} />
          <label className="rec-check">
            <input type="checkbox" checked={Boolean(data.videoTaken)} onChange={(e) => set("videoTaken")(e.target.checked)} />
            영상 찍어 둠 (휴대폰 앨범에)
          </label>
          <Field label="피부·귀·눈">{input("body", { placeholder: "예: 귀에서 냄새, 눈곱 많음" })}</Field>
          <Field label="구강">{input("oral", { placeholder: "예: 잇몸이 빨개요, 입 냄새" })}</Field>
        </>
      )}

      {type === "daily" && (
        <>
          <Field label="무엇을 했나요?"><Pick options={DAILY_KINDS} value={data.kind} onChange={set("kind")} /></Field>
          {(data.kind === "산책" || data.kind === "놀이") && (
            <>
              <Field label="시간 (분)">{input("minutes", { type: "number", inputMode: "numeric", min: "1", max: "600", placeholder: "예: 30" })}</Field>
              <Field label="활동 정도"><Pick options={LEVELS} value={data.activity} onChange={set("activity")} /></Field>
            </>
          )}
        </>
      )}

      {type === "life" && (
        <>
          <Field label="어떤 기록인가요?"><Pick options={LIFE_KINDS} value={data.kind} onChange={set("kind")} /></Field>
          <Field label="제목">{input("title", { placeholder: data.kind === "예방접종" ? "예: 종합백신 3차" : data.kind === "질환·수술" ? "예: 슬개골 수술" : "예: 처음 바다 간 날" })}</Field>
          {data.kind === "예방접종" && <NextDate data={data} set={set} label="다음 접종일" />}
        </>
      )}

      <Field label="메모">
        <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="선택" maxLength={500} />
      </Field>
      {type !== "weight" && (
        // 메모를 병원에 물어볼 것으로 표시하면 병원용 기록 맨 위 '물어볼 것'에 모인다(제안 분석 11/7)
        <label className="rec-check" style={{ marginTop: -6 }}>
          <input type="checkbox" checked={Boolean(data.ask)} onChange={(e) => set("ask")(e.target.checked)} />
          병원에 물어볼 것으로 표시
        </label>
      )}

      {type !== "weight" && type !== "vital" && (
        <Field label={`사진 (${photos.length}/${MAX_PHOTOS})`}>
          <div className="rec-photos">
            {photos.map((p, i) => (
              <div key={i} className="rec-photo">
                <img src={p} alt={`첨부 사진 ${i + 1}`} />
                <button type="button" aria-label="사진 빼기" onClick={() => setPhotos((list) => list.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="rec-photo add">
                ＋
                <input type="file" accept="image/*" multiple onChange={addPhotos} hidden />
              </label>
            )}
          </div>
        </Field>
      )}

      {type === "potty" && (
        <AiStoolCheck
          dog={dog}
          photo={photos[0]}
          onFilled={(fill) => setData((d) => ({ ...d, ...fill, stoolSigns: [...new Set([...(d.stoolSigns || []), ...fill.stoolSigns])] }))}
        />
      )}

      {error && <p className="error-text" role="alert">{error}</p>}
      <button type="button" className="btn-primary" onClick={save} disabled={saving}>
        {saving ? "저장 중…" : "저장"}
      </button>
    </div>
  );
}

// 선택: 첫 번째 첨부 사진을 AI가 보고 위 칸을 미리 채운다(하루 2번, 참고). 보호자가 확인·고친 뒤 저장한다.
function AiStoolCheck({ dog, photo, onFilled }) {
  const [aiTip, aiHelp] = useHelpTip("AI로 사진 확인", "위 사진 칸에 변 사진을 넣으면 AI가 보이는 모양·색을 정리해 칸을 미리 채워 줄 수 있어요. 사진만으로는 정확하지 않을 수 있어 참고로만 써요.");
  const [state, setState] = useState({ step: "idle" });
  const abortRef = useRef(null);

  async function run() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState({ step: "busy" });
    try {
      const raw = await quickStoolCheck(dog, photo.split(",")[1], ctrl.signal);
      const r = normalizeStoolResult(raw);
      if (!r.ok) return setState({ step: "retake", msg: r.retake });
      onFilled({ ...r.fill, photoSummary: r.obs.summary });
      setState({ step: "done", obs: r.obs });
    } catch (err) {
      if (err.name === "AbortError") return setState({ step: "idle" });
      // 서버의 하루 횟수 제한(429) 문구도 그대로 보여 준다
      setState({ step: "error", msg: err instanceof TypeError ? "AI 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요." : err.message });
    }
  }

  const { step, obs, msg } = state;
  return (
    <div className="pc" aria-live="polite">
      <b>AI로 사진 확인 (선택 · 참고){aiTip}</b>
      {aiHelp}
      {!photo ? null : step === "busy" ? (
        <>
          <p className="subtle" style={{ margin: "10px 0" }}>첫 번째 사진을 살펴보는 중… 보통 5~10초 걸려요.</p>
          <button type="button" className="btn-ghost small" onClick={() => abortRef.current?.abort()}>취소</button>
        </>
      ) : (
        <>
          {step === "done" && (
            <>
              <div className="pc-chips">
                {[["모양", obs.shape], ["색", obs.color], ["피", obs.blood], ["점액", obs.mucus], ["이물질", obs.foreign]].map(([k, v]) => (
                  <span key={k} className={`pc-chip${(k === "피" || k === "점액" || k === "이물질") && v === "보임" ? " warn" : ""}`}>
                    <span className="faint">{k}</span> {v}
                  </span>
                ))}
              </div>
              {obs.flags.length > 0 && (
                <div className="pc-flags">
                  <b>AI가 본 마음 쓰이는 점 (참고)</b>
                  {obs.flags.map((f, i) => <div key={i}>• {f}</div>)}
                </div>
              )}
              {obs.summary && <p className="subtle" style={{ margin: "8px 0 0" }}>{obs.summary}</p>}
              <p className="faint" style={{ margin: "8px 0" }}>위 칸에 채워 뒀어요. 실제와 다르면 고친 뒤 저장해 주세요. 사진만으로는 정확하지 않을 수 있어요.</p>
            </>
          )}
          {(step === "retake" || step === "error") && <p className={step === "error" ? "error-text" : "subtle"} style={{ margin: "10px 0" }}>{msg}</p>}
          <button type="button" className="btn-ghost small" style={{ marginTop: 8 }} onClick={run}>
            {step === "idle" ? "AI로 사진 확인 (하루 2번)" : "다시 확인 (하루 2번)"}
          </button>
        </>
      )}
    </div>
  );
}

function NextDate({ data, set, label }) {
  return (
    <>
      <Field label={`${label} (있으면 일정표에 들어가요)`}>
        <input type="date" value={data.nextDate || ""} min={todayKey()} onChange={set("nextDate")} />
      </Field>
      {data.nextDate && (
        <label className="rec-check">
          <input type="checkbox" checked={Boolean(data.nextAlarm)} onChange={(e) => set("nextAlarm")(e.target.checked)} />
          그날 아침 9시에 알림 받기
        </label>
      )}
    </>
  );
}

function defaults(type, dog) {
  if (type === "symptom") return { kinds: [], repeat: "", since: "", observed: "" };
  if (type === "vet") return { hospital: dog.hospital || "", reason: "" };
  if (type === "meal") return { kind: "dry", food: dog.food || "" };
  return {};
}

// 빈 칸은 저장하지 않는다(요약·리포트에 빈 항목이 안 나오게)
function clean(data) {
  return Object.fromEntries(
    Object.entries(data)
      .map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
      .filter(([, v]) => (Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : v !== "" && v != null && v !== false))
  );
}

// 밥·물 칸: 7살 아이나 어르신도 바로 쓰게 — 큰 글자·큰 버튼·한 번에 한 종류. 자주 쓰는 양은 버튼으로(누르면 채워짐), 더 정확히는 숫자 칸에.
const LEVEL_LABEL = { dry: ["조금 남겼어요", "다 먹었어요", "더 달라고 했어요"], wet: ["조금 남겼어요", "다 먹었어요", "더 달라고 했어요"], water: ["평소보다 적게", "평소만큼", "평소보다 많이"] };
function MealFields({ data, set, patch, input, onOpenFeeding }) {
  const kind = MEAL_KIND[data.kind] ? data.kind : "dry";
  const k = MEAL_KIND[kind];
  const levelKey = kind === "water" ? "water" : "appetite"; // 저장 이름은 예전과 같게(병원용 기록·이상 신호가 읽는다)
  const tips = VITAL_TIPS[kind]?.how?.slice(0, 2) || [];
  return (
    <>
      <div className="field">
        <label>무엇을 적을까요?</label>
        <div className="meal-seg" role="tablist" aria-label="밥·물 종류">
          {MEAL_KINDS.map((m) => (
            <button key={m.id} type="button" role="tab" aria-selected={kind === m.id} className={`meal-seg-btn${kind === m.id ? " on" : ""}`} onClick={() => patch({ kind: m.id, amount: "", [levelKey]: "" })}>
              <Ico name={m.ico} size={20} /> {m.label}
            </button>
          ))}
        </div>
      </div>
      <Field label={`${k.label} 얼마나 ${kind === "water" ? "마셨나요" : "먹었나요"}? (${k.unit})`}>
        {input("amount", { type: "number", inputMode: "numeric", min: "1", max: String(k.max), placeholder: "0", className: "meal-amount", "aria-describedby": "meal-quick" })}
      </Field>
      <div className="meal-quick" id="meal-quick">
        {k.quick.map((q) => (
          <button key={q} type="button" className={`seg${String(data.amount) === String(q) ? " on" : ""}`} onClick={() => set("amount")(String(q))}>{q}{k.unit}</button>
        ))}
      </div>
      <Field label={kind === "water" ? "평소와 비교하면?" : "밥그릇은 어땠나요?"}>
        <div className="chip-wrap">
          {LEVELS.map((l, i) => (
            <button key={l} type="button" className={`seg${data[levelKey] === l ? " on" : ""}`} aria-pressed={data[levelKey] === l} onClick={() => set(levelKey)(data[levelKey] === l ? "" : l)}>
              {LEVEL_LABEL[kind][i]}
            </button>
          ))}
        </div>
      </Field>
      {tips.length > 0 && (
        <div className="meal-tip">
          <b><Ico name="ruler" size={14} /> 이렇게 재요</b>
          <ul>{tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      {kind !== "water" && (
        <>
          <Field label="사료 이름 (선택)">{input("food", { placeholder: "예: 로얄캐닌 미니" })}</Field>
          {onOpenFeeding && (
            <button type="button" className="link-btn" style={{ margin: "-4px 0 12px" }} onClick={onOpenFeeding}>
              <Ico name="bowl" size={15} /> 하루에 얼마나 줘야 할지 사료 계산기로 보기 ›
            </button>
          )}
          <Field label="간식 (선택)">{input("treats", { placeholder: "예: 닭가슴살 육포 2개" })}</Field>
        </>
      )}
    </>
  );
}
