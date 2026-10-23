import { useMemo, useState } from "react";
import { calculateAge, formatAge } from "../utils/age";
import { formatKoreanDate, toDateKey, addDays, pad2 } from "../utils/date";
import { getWeightRecords, addWeightRecord, updateWeightRecord, deleteWeightRecord, getWeightChangeAdvice } from "../services/weightLog";
import { getEffectiveCadenceDays, getCustomCadenceDays, setCustomCadenceDays, getNextDueDateKey } from "../services/weightSchedule";
import { saveDog } from "../services/dogRepository";
import { getWeightAssessment, getWeightStatusText, STATUS_COLOR } from "../data/weightGuide";
import WeightChart from "../components/WeightChart";
import InfoAccordionItem from "../components/InfoAccordion";
import Ico from "../components/Ico";
import { VITAL_TIPS } from "../data/vitalTips";

const METHODS = [
  { id: "pet-scale", label: "반려동물용 저울" },
  { id: "carry-diff", label: "안고 측정 후 차감" },
  { id: "vet", label: "동물병원 측정" },
  { id: "other", label: "기타" },
];

const RANGES = [
  { id: "4w", label: "최근 4주", days: 28 },
  { id: "3m", label: "최근 3개월", days: 90 },
  { id: "all", label: "전체", days: null },
];

const CADENCE_OPTIONS = [1, 3, 7, 14, 30];

function emptyForm() {
  const d = new Date();
  return { weightKg: "", date: toDateKey(d), time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`, method: "", note: "" };
}

function recordDateTime(record) {
  const d = new Date(record.measuredAt);
  return `${formatKoreanDate(toDateKey(d))} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// 핵심 한 문장만 먼저 보여주고, 누르면 자세한 내용이 펼쳐지는 아코디언 한 칸.
export default function WeightTracker({ dog, onUpdateDog, onBack }) {
  const [records, setRecords] = useState(() => getWeightRecords(dog.id));
  const [range, setRange] = useState("4w");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cadenceDraft, setCadenceDraft] = useState(() => getCustomCadenceDays(dog.id));
  const [showRecordList, setShowRecordList] = useState(false);

  const age = calculateAge(dog.birthDate);
  const latest = records.length ? records[records.length - 1] : null;
  const changeSummary = useMemo(() => {
    if (records.length === 0) return null;
    const previous = records.length > 1 ? records[records.length - 2] : null;
    if (!previous) return { deltaKg: null, deltaPercent: null };
    const deltaKg = latest.weightKg - previous.weightKg;
    return { deltaKg, deltaPercent: (deltaKg / previous.weightKg) * 100 };
  }, [records, latest]);
  const nextDueDateKey = getNextDueDateKey(dog, age.ageInWeeks, age.ageInMonths);
  const effectiveCadence = getEffectiveCadenceDays(dog, age.ageInWeeks, age.ageInMonths);
  const currentAssessment = latest ? getWeightAssessment({ ...dog, weight: latest.weightKg }, age.ageInMonths) : null;

  // 기록을 저장/수정/삭제한 뒤 항상 이 함수로 다시 읽어온다 — 화면 state와 실제 저장된 값이
  // 어긋나지 않도록(새로고침 없이도 그래프·요약·목록이 같은 데이터를 보도록) 하기 위해서다.
  function refresh() {
    const list = getWeightRecords(dog.id);
    setRecords(list);
    const newest = list.length ? list[list.length - 1] : null;
    if (newest && newest.weightKg !== dog.weight) {
      const updated = saveDog({ ...dog, weight: newest.weightKg });
      onUpdateDog?.(updated);
    }
  }

  const rangeMeta = RANGES.find((r) => r.id === range);
  const filteredRecords = useMemo(() => {
    if (!rangeMeta.days) return records;
    const cutoff = addDays(new Date(), -rangeMeta.days);
    return records.filter((r) => new Date(r.measuredAt) >= cutoff);
  }, [records, rangeMeta]);

  // 그래프 점 색·적정 구간·상태 설명은 "지금" 체중이 아니라 그 기록을 쟀던 시점의 월령
  // 기준으로 계산한다 — 과거 기록을 오늘 나이 기준으로 평가하면 성장기 강아지는 전부
  // 왜곡되게 보인다. 적정 구간도 월령에 비례해 유연하게 넓어지는 값을 그대로 쓴다.
  const coloredRecords = useMemo(
    () =>
      filteredRecords.map((r) => {
        const ageAtRecord = calculateAge(dog.birthDate, new Date(r.measuredAt));
        const assessment = getWeightAssessment({ ...dog, weight: r.weightKg }, ageAtRecord.ageInMonths);
        return {
          ...r,
          color: STATUS_COLOR[assessment.status],
          status: assessment.status,
          bandMin: assessment.range.min,
          bandMax: assessment.range.max,
          statusText: getWeightStatusText(assessment),
        };
      }),
    [filteredRecords, dog]
  );

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setFormOpen(true);
  }

  function openEditForm(record) {
    const d = new Date(record.measuredAt);
    setEditingId(record.id);
    setForm({
      weightKg: String(record.weightKg),
      date: toDateKey(d),
      time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
      method: record.measurementMethod,
      note: record.note,
    });
    setError("");
    setFormOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    const weightKg = Number(form.weightKg);
    if (!form.weightKg || Number.isNaN(weightKg) || weightKg <= 0) {
      setError("체중은 0보다 큰 숫자로 입력해 주세요.");
      return;
    }
    if (!form.date || !form.time) {
      setError("측정 날짜와 시각을 입력해 주세요.");
      return;
    }
    if (latest && !editingId) {
      const diffRatio = Math.abs(weightKg - latest.weightKg) / latest.weightKg;
      if (diffRatio >= 0.3) {
        const ok = window.confirm(
          `이전 기록(${latest.weightKg}kg)과 차이가 많이 나요(${Math.round(diffRatio * 100)}% 차이). kg 단위로 정확히 입력했는지 확인해 주세요. 그래도 저장할까요?`
        );
        if (!ok) return;
      }
    }

    setSaving(true);
    setError("");
    try {
      const measuredAt = `${form.date}T${form.time}:00`;
      const payload = { weightKg, measuredAt, measurementMethod: form.method, note: form.note.trim() };
      if (editingId) {
        updateWeightRecord(dog.id, editingId, payload);
      } else {
        addWeightRecord(dog.id, payload);
      }
      refresh();
      setFormOpen(false);
    } catch {
      setError("저장에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id) {
    if (!window.confirm("이 체중 기록을 삭제할까요?")) return;
    deleteWeightRecord(dog.id, id);
    refresh();
  }

  function handleCadenceChange(e) {
    const value = e.target.value;
    const days = value === "auto" ? null : Number(value);
    setCustomCadenceDays(dog.id, days);
    setCadenceDraft(days);
  }

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 프로필로
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        {dog.photo ? (
          <img src={dog.photo} alt={`${dog.name} 사진`} style={{ width: 48, height: 48, borderRadius: 14, objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "var(--accent-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              color: "var(--accent-strong)",
            }}
          >
            <Ico name="dog" size={26} />
          </div>
        )}
        <div>
          <div className="h1" style={{ marginBottom: 2 }}>체중 관리</div>
          <span className="faint">{dog.name} · {formatAge(age)}</span>
        </div>
      </div>

      <div className="vd-how">
        <div className="vd-how-title"><Ico name="ruler" size={15} /> 이렇게 재요</div>
        <ul>
          {VITAL_TIPS.weight.how.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        {!latest ? (
          <>
            <p className="subtle" style={{ marginBottom: 12 }}>아직 체중 기록이 없어요. 첫 체중을 기록해 보세요.</p>
            <button className="btn-primary" onClick={openAddForm}>체중 기록하기</button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 800 }}>{latest.weightKg}kg</span>
              {changeSummary?.deltaKg != null && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text-soft)", // 늘거나 줄었다는 것만으로 좋고 나쁨을 정하지 않는다
                  }}
                >
                  {changeSummary.deltaKg > 0 ? "▲" : changeSummary.deltaKg < 0 ? "▼" : "-"} {+Math.abs(changeSummary.deltaKg).toFixed(2)}kg (
                  {changeSummary.deltaPercent > 0 ? "+" : ""}
                  {changeSummary.deltaPercent.toFixed(1)}%)
                </span>
              )}
            </div>
            <p className="faint" style={{ marginBottom: 10 }}>
              최근 측정: {recordDateTime(latest)} · 다음 측정 예정일: {formatKoreanDate(nextDueDateKey)}
            </p>
            {changeSummary?.deltaPercent != null && (
              <p className="subtle" style={{ marginBottom: 12 }}>{getWeightChangeAdvice(changeSummary.deltaPercent)}</p>
            )}
            <button className="btn-primary" onClick={openAddForm}>체중 기록하기</button>
          </>
        )}
      </div>

      {formOpen && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="h2">{editingId ? "기록 수정" : "체중 기록 입력"}</div>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>체중 (kg) *</label>
              <input
                type="number"
                step="0.1"
                value={form.weightKg}
                onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
                placeholder="예: 3.2"
              />
            </div>
            <div className="field">
              <label>측정 날짜 *</label>
              <input
                type="date"
                value={form.date}
                max={toDateKey(new Date())}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>측정 시각 *</label>
              <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
            </div>
            <div className="field">
              <label>측정 방법</label>
              <select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
                <option value="">선택 안 함</option>
                {METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="faint" style={{ marginTop: 4 }}>
                사람 체중계로 재면 오차가 있을 수 있어요. 가능하면 반려동물용 저울을 써보세요.
              </p>
            </div>
            <div className="field">
              <label>메모</label>
              <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="선택 입력" />
            </div>
            {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setFormOpen(false)}>
                취소
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </form>
        </div>
      )}

      {records.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  className="chip"
                  style={{
                    border: "1px solid var(--border)",
                    background: range === r.id ? "var(--accent-soft)" : "transparent",
                    color: range === r.id ? "var(--accent-strong)" : "var(--text-soft)",
                  }}
                  onClick={() => setRange(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12.5 }} onClick={() => setShowRecordList((v) => !v)}>
              수정
            </button>
          </div>
          {filteredRecords.length === 0 ? (
            <p className="subtle">이 기간엔 기록이 없어요.</p>
          ) : (
            <WeightChart key={range} records={coloredRecords} />
          )}

          {showRecordList && (
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              {[...records].reverse().map((r) => (
                <div
                  key={r.id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.weightKg}kg</div>
                    <div className="faint">
                      {recordDateTime(r)}
                      {r.measurementMethod && ` · ${METHODS.find((m) => m.id === r.measurementMethod)?.label || r.measurementMethod}`}
                    </div>
                    {r.note && <div className="faint">{r.note}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={() => openEditForm(r)}>
                      수정
                    </button>
                    <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={() => handleDelete(r.id)}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {currentAssessment && currentAssessment.status !== "no-data" && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span
              aria-hidden="true"
              style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLOR[currentAssessment.status], flexShrink: 0 }}
            />
            <div className="h2" style={{ margin: 0 }}>현재 체중 정보</div>
          </div>
          <p className="subtle" style={{ margin: 0 }}>{getWeightStatusText(currentAssessment)}</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">측정 주기</div>
        <p className="subtle" style={{ marginBottom: 8 }}>
          기본값은 나이에 따라 자동으로 정해져요(지금은 {effectiveCadence}일 간격). 수의사가 다른 주기를 알려줬다면 아래에서 바꿀 수 있어요.
        </p>
        <select value={cadenceDraft ?? "auto"} onChange={handleCadenceChange}>
          <option value="auto">자동(나이 기준)</option>
          {CADENCE_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}일마다
            </option>
          ))}
        </select>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="h2" style={{ marginBottom: 6 }}>체중 관리, 왜 중요할까요?</div>

        <InfoAccordionItem
          headline="체중은 집에서 가장 쉽게 확인할 수 있는 건강 지표예요."
          detail="식욕·소화·활동량 같은 변화가 눈에 띄기 전에, 체중 변화로 먼저 드러나는 경우가 많아요. 그래서 정기적으로 재고 기록해두면 작은 이상도 빨리 알아챌 수 있어요."
        />
        <InfoAccordionItem
          headline="숫자만큼 '만졌을 때 느낌'도 중요해요 — 집에서 체형을 확인해보세요."
          detail='갈비뼈가 쉽게 만져지고 위에서 봤을 때 허리라인이 잘록하게 보이면 좋은 신호예요(신체충실지수 기준). 갈비뼈가 전혀 안 만져지면 과체중, 뼈가 도드라져 보이면 저체중 쪽일 수 있어요.'
        />
        <InfoAccordionItem
          headline="강아지 체중 재는 팁"
          detail="소형견은 베이킹용/아기용 저울에 바로 올려서 재면 편해요. 중·대형견은 보호자가 먼저 체중계에 올라가 몸무게를 잰 다음, 강아지를 안고 다시 올라가 나온 값에서 보호자 체중을 빼면 돼요. 가능하면 매번 같은 저울, 비슷한 시간대(예: 아침 식전)에 재야 변화를 정확히 비교할 수 있고, 사람 체중계로 안고 재는 방식은 오차가 더 클 수 있어서 가능하면 반려동물용 저울을 권해요."
        />

        <p className="faint" style={{ marginTop: 10, marginBottom: 0 }}>
          참고: WSAVA·코넬대 수의대 신체충실지수(Body Condition Score) 자료 기반 — 진단을
          대신하지 않아요. 체중이 급격히 변하거나 식욕 저하·구토·설사 등이 함께 보이면 수의사
          진료를 받아보세요.
        </p>
      </div>
    </div>
  );
}
