import { useMemo, useState } from "react";
import { calculateAge, formatAge } from "../utils/age";
import { getFeedingPlan, SOAK_WATER_TEMP, SOAK_DURATION } from "../data/feedingGuide";
import { getFeedingSettings, saveFeedingSettings } from "../services/feedingSettings";

const STOOL_OPTIONS = [
  { value: "normal", label: "정상" },
  { value: "loose", label: "무른 편" },
  { value: "constipated", label: "단단한 편" },
];

export default function FeedingPlan({ dog, onBack }) {
  const [settings, setSettings] = useState(() => getFeedingSettings(dog.id));
  const [saved, setSaved] = useState(false);

  const age = useMemo(() => calculateAge(dog.birthDate), [dog.birthDate]);
  const plan = useMemo(
    () =>
      getFeedingPlan(dog, age.ageInWeeks, {
        stoolCondition: settings.stoolCondition,
        kcalPer100g: settings.kcalPer100g || undefined,
      }),
    [dog, age.ageInWeeks, settings.stoolCondition, settings.kcalPer100g]
  );

  function updateTime(index, value) {
    const times = [...settings.times];
    times[index] = value;
    setSettings((s) => ({ ...s, times }));
    setSaved(false);
  }

  function addTime() {
    setSettings((s) => ({ ...s, times: [...s.times, "08:00"] }));
    setSaved(false);
  }

  function removeTime(index) {
    setSettings((s) => ({ ...s, times: s.times.filter((_, i) => i !== index) }));
    setSaved(false);
  }

  function handleSave() {
    saveFeedingSettings(dog.id, settings);
    setSaved(true);
  }

  const soakLabel = plan.soak.needed === true ? "필요" : plan.soak.needed === "optional" ? "선택" : "불필요";

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 체크리스트로
      </button>
      <div className="h1">사료량·급여시간 계산기</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        {dog.name}는 지금 {formatAge(age)}예요. 급여 시각을 정하면, 그 30분 전에 "사료 불리기" 알림을 보내드려요.
      </p>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">급여 시각</div>
        {settings.times.length === 0 && <p className="subtle">아직 설정한 급여 시각이 없어요.</p>}
        {settings.times.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input type="time" value={t} onChange={(e) => updateTime(i, e.target.value)} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 16 }} />
            <button className="btn-ghost" style={{ padding: "6px 10px" }} onClick={() => removeTime(i)}>
              삭제
            </button>
          </div>
        ))}
        <button className="btn-ghost" style={{ width: "100%", marginBottom: 8 }} onClick={addTime}>
          + 급여 시각 추가 (추천 {plan.mealsPerDay}회)
        </button>
        <button className="btn-primary" onClick={handleSave}>
          {saved ? "저장됨 ✓" : "저장하기"}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">배변 상태 (선택)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {STOOL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className="chip"
              style={{
                border: "1px solid var(--border)",
                background: settings.stoolCondition === opt.value ? "var(--accent-soft)" : "transparent",
                color: settings.stoolCondition === opt.value ? "var(--accent-strong)" : "var(--text-soft)",
              }}
              onClick={() => {
                setSettings((s) => ({ ...s, stoolCondition: opt.value }));
                setSaved(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">사료 열량 (선택)</div>
        <p className="faint" style={{ marginBottom: 8 }}>
          사료 봉투에 kcal/100g이 적혀 있으면 입력해 주세요. 안 넣으면 일반적인 평균치(kcal/100g {plan.kcalPer100g})로 계산해요.
        </p>
        <input
          type="number"
          placeholder="예: 380"
          value={settings.kcalPer100g || ""}
          onChange={(e) => {
            setSettings((s) => ({ ...s, kcalPer100g: e.target.value ? Number(e.target.value) : null }));
            setSaved(false);
          }}
          style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 16 }}
        />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">급여 계획</div>
        <p className="subtle">
          하루 총 급여량: <strong>{plan.dailyGrams}g</strong> (약 {plan.dailyKcal}kcal), 하루 {plan.mealsPerDay}끼 기준
        </p>
        <p className="subtle">
          한 끼: <strong>{plan.gramsPerMeal}g</strong> (약 {plan.tablespoonsPerMeal}큰술)
        </p>
        {plan.usedDefaultKcal && (
          <p className="faint">사료 열량을 직접 입력하지 않아 평균치로 계산했어요. 실제 제품 급여 가이드와 비교해보세요.</p>
        )}
        {plan.adjustmentNote && <p className="error-text">{plan.adjustmentNote}</p>}
        <p className="faint">
          숟가락 환산은 사료 알갱이 크기·밀도에 따라 달라질 수 있어요 (1큰술 ≈ 7g 기준 추정치).
        </p>
      </div>

      <div className="card">
        <div className="h2">사료 불리기 — {soakLabel}</div>
        <p className="subtle">{plan.soak.label}</p>
        <p className="faint" style={{ marginBottom: 8 }}>{plan.soak.reason}</p>
        {plan.soak.needed !== false && (
          <>
            <p className="subtle"><strong>물 온도:</strong> {SOAK_WATER_TEMP.celsius} — {SOAK_WATER_TEMP.description}</p>
            <p className="subtle"><strong>불리는 시간:</strong> {SOAK_DURATION.soft} / 완전히 무르게: {SOAK_DURATION.mash}</p>
            <p className="error-text">{SOAK_DURATION.safety}</p>
          </>
        )}
      </div>

      <p className="faint" style={{ marginTop: 12 }}>
        출처: AAHA/WSAVA 대사에너지요구량(DER) 공식, 반려동물 영양학 자료 기반 참고용 계산이며 실제 수의사 개별 진료를 대신하지 않아요.
      </p>
    </div>
  );
}
