import { useMemo, useState } from "react";
import { calculateAge, formatAge } from "../utils/age";
import { getFeedingPlan, SOAK_WATER_TEMP, SOAK_DURATION } from "../data/feedingGuide";
import { getFeedingSettings, saveFeedingSettings } from "../services/feedingSettings";
import { josa } from "../utils/text";
import { findFoodInfo, readFoodLabel } from "../services/aiClient";
import { resizeImageFile } from "../utils/image";
import Ico from "../components/Ico";
import { openNewBag, stockFromBag, stockLabel } from "../services/foodStock";
import { syncPushAlarms } from "../services/notifications";

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

  // 급여 시각은 [저장하기]로. 처음부터 시각이 하나도 없으면 저장할 게 없어서 막는다(저장해 둔 시각을 모두 지울 때는 눌림)
  const storedTimes = getFeedingSettings(dog.id).times || [];
  const nothingToSave = settings.times.length === 0 && storedTimes.length === 0;
  function handleSave() {
    saveFeedingSettings(dog.id, { ...getFeedingSettings(dog.id), times: settings.times });
    setSaved(true);
  }
  // 배변 상태·사료 열량은 고르는 즉시 저장(멀리 위의 저장 버튼을 안 눌러도 남게)
  function saveNow(patch) {
    setSettings((s) => ({ ...s, ...patch }));
    saveFeedingSettings(dog.id, { ...getFeedingSettings(dog.id), ...patch });
  }

  // 사료 남은 양: 봉투 무게 + 뜯은 날 → 하루 급여량으로 며칠 남았는지 어림(떨어지기 5일 전 점심에 알림)
  const [bagKg, setBagKg] = useState(() => (settings.bag?.grams ? settings.bag.grams / 1000 : ""));
  const stock = stockFromBag(settings.bag, plan.dailyGrams);
  function handleOpenBag() {
    const grams = Math.round(Number(bagKg) * 1000);
    if (!(grams >= 100 && grams <= 50000)) return;
    openNewBag(dog.id, grams);
    setSettings(getFeedingSettings(dog.id));
    syncPushAlarms();
  }

  const soakLabel = plan.soak.needed === true ? "필요" : plan.soak.needed === "optional" ? "선택" : "불필요";

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 체크리스트로
      </button>
      <div className="h1">사료량·급여시간 계산기</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        {josa(dog.name, "은", "는")} 지금 {formatAge(age)}예요. 급여 시각을 정하면, 그 30분 전에 "사료 불리기" 알림을 보내드려요.
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
        <button className="btn-primary" onClick={handleSave} disabled={nothingToSave}>
          {saved ? "저장됨 ✓" : settings.times.length === 0 ? "급여 시각 모두 지우기" : "저장하기"}
        </button>
        {nothingToSave && <p className="faint" style={{ margin: "6px 0 0", textAlign: "center" }}>시각을 하나 이상 추가하면 저장할 수 있어요.</p>}
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
                saveNow({ stoolCondition: opt.value });
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <FoodCard dog={dog} settings={settings} onUse={(patch) => saveNow(patch)} />

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
            saveNow({ kcalPer100g: e.target.value ? Number(e.target.value) : null });
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

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2"><Ico name="bowl" size={18} /> 사료 남은 양</div>
        {stock ? (
          <p style={{ margin: "4px 0 6px", fontSize: 16 }}>
            <b>{stockLabel(stock)}</b> <span className="subtle">({Number(stock.runOut.slice(5, 7))}/{Number(stock.runOut.slice(8, 10))}쯤 · 하루 {stock.dailyGrams}g 기준)</span>
          </p>
        ) : (
          <p className="subtle">새 봉투를 뜯을 때 무게를 알려 주면, 떨어지기 5일 전 점심에 알려 드려요.</p>
        )}
        <div className="chip-wrap" style={{ margin: "6px 0 8px" }}>
          {[1, 2, 3, 6].map((kg) => (
            <button key={kg} type="button" className={`seg${Number(bagKg) === kg ? " on" : ""}`} onClick={() => setBagKg(kg)}>{kg}kg</button>
          ))}
          <input type="number" inputMode="decimal" min="0.1" max="50" step="0.1" value={bagKg} onChange={(e) => setBagKg(e.target.value)} placeholder="직접(kg)" aria-label="봉투 무게(kg)" style={{ width: 96, border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", fontSize: 16 }} />
        </div>
        <button type="button" className="btn-primary" style={{ width: "100%" }} disabled={!(Number(bagKg) >= 0.1 && Number(bagKg) <= 50)} onClick={handleOpenBag}>
          오늘 새 봉투 뜯었어요
        </button>
        <p className="faint" style={{ marginTop: 6 }}>간식·흘린 양은 빼고 계산한 어림이에요. 급여량을 바꾸면 남은 날도 다시 계산돼요.</p>
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

// 사료 이름으로 열량·성분 찾기(서버가 웹 검색). 찾은 열량은 보호자가 [이 열량으로 계산]을 눌러야 쓴다 — 같은 이름도 퍼피·어덜트·국내판마다 달라서
function FoodCard({ dog, settings, onUse }) {
  const [name, setName] = useState(settings.foodName || dog.food || "");
  const [result, setResult] = useState(settings.foodInfo && settings.foodInfo.name === (settings.foodName || dog.food) ? settings.foodInfo : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search(q = name) {
    if (!q.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const { info, sources } = await findFoodInfo(q.trim());
      const next = { name: q.trim(), info, sources, at: new Date().toISOString().slice(0, 10) };
      setResult(next);
      setName(q.trim());
      onUse({ foodName: q.trim(), foodInfo: next }); // 찾은 정보는 저장(다시 찾지 않게). 열량은 아직 안 씀
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // 봉투 뒷면 사진 → 적힌 열량·성분(가장 정확한 출처). 작은 글씨라 긴 변 1800px로 보낸다
  async function readPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setBusy("photo");
    setError("");
    try {
      const dataUrl = await resizeImageFile(file, 1800, 0.85);
      const label = await readFoodLabel(dataUrl.split(",")[1]);
      if (!label.is_label) return setError(label.retake || "사료 봉투 뒷면의 성분·열량 표시가 잘 보이게 다시 찍어 주세요.");
      const q = label.product_name || name.trim() || "사료";
      const next = {
        name: q,
        info: { found: true, product_name: label.product_name, kcal_per_kg: label.kcal_per_kg, kcal_text: label.kcal_text, kcal_source: "봉투 사진", edition: "국내판", life_stage: label.life_stage, main_ingredients: label.main_ingredients, analysis: label.analysis, cautions: "", candidates: [] },
        sources: [],
        at: new Date().toISOString().slice(0, 10),
      };
      setResult(next);
      if (label.product_name && !name.trim()) setName(label.product_name);
      onUse({ foodName: name.trim() || q, foodInfo: next });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const info = result?.info;
  // 일반 건사료 열량 범위를 크게 벗어나면(검색 실수 가능성) 계산 버튼을 주지 않는다 — ponytail: 범위는 넉넉히 2,500~5,500kcal/kg, 습식·동결건조는 따로 다루지 않음
  const per100 = info?.kcal_per_kg >= 2500 && info.kcal_per_kg <= 5500 ? Math.round(info.kcal_per_kg / 10) : 0;
  const official = info?.kcal_source === "제조사 한국 공식" || info?.kcal_source === "봉투 사진";
  const using = per100 && settings.kcalPer100g === per100;
  const rows = info?.found
    ? [["대상", [info.life_stage, info.dog_size].filter(Boolean).join(" · ")], ["주원료", info.main_ingredients], ["등록성분량", info.analysis], ["알아 둘 점", info.cautions]].filter(([, v]) => v)
    : [];

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="h2">먹이는 사료</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="예: 로얄캐닌 미니 인도어 어덜트" maxLength={80} aria-label="사료 이름" style={{ flex: 1, minWidth: 0, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", fontSize: 16 }} />
        <button type="button" className="btn-primary" style={{ width: "auto", padding: "0 14px", whiteSpace: "nowrap" }} disabled={Boolean(busy) || !name.trim()} onClick={() => search()}>
          {busy === true ? "찾는 중…" : "정보 찾기"}
        </button>
      </div>
      <label className={`btn-ghost food-photo${busy ? " disabled" : ""}`}>
        <Ico name="camera" size={17} /> {busy === "photo" ? "사진 읽는 중…" : "봉투 뒷면 사진으로 읽기"}
        <input type="file" accept="image/*" capture="environment" onChange={readPhoto} disabled={Boolean(busy)} hidden />
      </label>
      {busy === true && <p className="faint" style={{ margin: "8px 0 0" }}>제조사·판매처 자료를 찾고 있어요. 20~40초쯤 걸려요.</p>}
      {!info && !busy && <p className="faint" style={{ margin: "8px 0 0" }}>봉투 뒷면의 "대사에너지(kcal)"와 등록성분량이 보이게 찍으면 가장 정확해요.</p>}
      {error && <p className="error-text" role="alert">{error}</p>}

      {info && !busy && (
        <div className="food-info">
          {info.found ? (
            <>
              <div className="food-name">{info.product_name || result.name}{info.brand && <span className="faint"> · {info.brand}</span>}</div>
              <div className="food-kcal">
                {per100 ? (
                  <>
                    <b>{info.kcal_per_kg.toLocaleString("ko-KR")} kcal/kg</b> <span className="faint">(100g당 {per100}kcal · {info.kcal_source}{info.edition === "해외판" ? " · 해외판" : ""} · {result.at} 확인)</span>
                    {!official && <span className="food-ref">참고 값 — 국내 공식 자료로 확인하지 못했어요. 봉투에 적힌 열량이 있으면 그걸 쓰세요.</span>}
                  </>
                ) : (
                  <span className="faint">열량을 kcal/kg로 확인하지 못했어요{info.kcal_text ? ` (적힌 표기: ${info.kcal_text})` : ""}. {info.kcal_source === "봉투 사진" ? "열량 부분이 잘 보이게 다시 찍거나" : "봉투 뒷면 사진으로 읽거나"} 아래 칸에 직접 적어 주세요.</span>
                )}
              </div>
              {rows.map(([k, v]) => (
                <div key={k} className="food-row"><span className="faint">{k}</span><span>{v}</span></div>
              ))}
              {per100 > 0 && (
                <button type="button" className={using ? "btn-ghost" : "btn-primary"} style={{ width: "100%", marginTop: 10 }} disabled={using} onClick={() => onUse({ kcalPer100g: per100 })}>
                  {using ? "✓ 이 열량으로 계산하고 있어요" : official ? "이 열량으로 계산" : "참고 값으로 계산"}
                </button>
              )}
              <p className="faint" style={{ margin: "8px 0 0" }}>
                {info.kcal_source === "봉투 사진" ? "사진에서 AI가 읽은 값이에요. 봉투의 숫자와 같은지 한 번 확인해 주세요." : "AI가 웹에서 찾은 정보라 틀릴 수 있어요. 사료 봉투에 적힌 열량과 같은지 한 번 확인해 주세요."}
              </p>
            </>
          ) : (
            <>
              <p className="subtle" style={{ margin: 0 }}>정확히 같은 제품을 찾지 못했어요. 이름을 더 자세히(나이·크기·라인) 적어 주세요.</p>
              {info.candidates?.length > 0 && (
                <div className="chip-wrap" style={{ marginTop: 8 }}>
                  {info.candidates.map((c) => (
                    <button key={c} type="button" className="chip" style={{ border: "none", cursor: "pointer" }} onClick={() => search(c)}>{c}</button>
                  ))}
                </div>
              )}
            </>
          )}
          {result.sources?.length > 0 && (
            <div className="food-sources">
              <span className="faint">출처</span>
              {result.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer"><Ico name="arrowRight" size={12} /> {s.title || s.url}</a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
