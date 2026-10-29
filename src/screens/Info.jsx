import { useMemo, useState } from "react";
import { calculateAge } from "../utils/age";
import { CARE_RULES, getRulesForAge } from "../data/careRules";
import { getBreedAppearance } from "../data/breedAppearance";

export default function Info({ dog, onBack }) {
  const [openId, setOpenId] = useState(null);
  const age = useMemo(() => calculateAge(dog.birthDate), [dog.birthDate]);
  const activeIds = useMemo(
    () => new Set(getRulesForAge(age.ageInWeeks, dog.breed).map((r) => r.id)),
    [age, dog.breed]
  );

  const categories = useMemo(() => {
    const appearance = getBreedAppearance(dog.breed);
    const applicableRules = CARE_RULES.filter((r) => !r.appliesTo || r.appliesTo(appearance));
    const map = new Map();
    for (const rule of applicableRules) {
      if (!map.has(rule.category)) map.set(rule.category, []);
      map.get(rule.category).push(rule);
    }
    for (const list of map.values()) {
      list.sort((a, b) => Number(activeIds.has(b.id)) - Number(activeIds.has(a.id)));
    }
    // 지금 해당하는 항목이 있는 분류를 위로, 다른 시기 분류는 아래 접힌 곳으로
    const entries = [...map.entries()];
    return {
      now: entries.filter(([, rules]) => rules.some((r) => activeIds.has(r.id))),
      other: entries.filter(([, rules]) => !rules.some((r) => activeIds.has(r.id))),
    };
  }, [activeIds, dog.breed]);
  const [showOther, setShowOther] = useState(false);

  const renderCategory = ([category, rules]) => (
    <div key={category} className="card" style={{ marginBottom: 12 }}>
      <div className="h2">{category}</div>
      {rules.map((rule) => {
        const isActive = activeIds.has(rule.id);
        const isOpen = openId === rule.id;
        return (
          <div key={rule.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 10 }}>
            <button
              onClick={() => setOpenId(isOpen ? null : rule.id)}
              style={{ background: "none", border: "none", padding: 0, width: "100%", textAlign: "left" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, color: isActive ? "var(--text)" : "var(--text-faint)" }}>
                  {rule.title}
                  <span className="faint" style={{ display: "block", fontWeight: 400, fontSize: 12 }}>{ageRange(rule)}</span>
                </span>
                {isActive && <span className="chip" style={{ flexShrink: 0 }}>지금 중요해요</span>}
              </div>
            </button>
            {isOpen && (
              <div style={{ marginTop: 6 }}>
                <p className="subtle"><strong>왜:</strong> {rule.why}</p>
                <p className="subtle"><strong>어떻게:</strong> {rule.how}</p>
                {rule.caution && <p className="error-text">주의: {rule.caution}</p>}
                {rule.source && <p className="faint">출처: {rule.source}</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 체크리스트로
      </button>
      <div className="h1">강아지 정보</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        {dog.name}에게 지금 중요한 항목이 먼저 보여요.
      </p>

      {categories.now.map(renderCategory)}
      {categories.other.length > 0 && (
        <>
          <button type="button" className="btn-ghost" style={{ width: "100%", marginBottom: 12 }} onClick={() => setShowOther((v) => !v)}>
            {showOther ? "다른 시기 정보 접기" : `다른 시기 정보 보기 (${categories.other.length}개 분류)`}
          </button>
          {showOther && categories.other.map(renderCategory)}
        </>
      )}
      <a href="/intro/resources/?from=app" target="_blank" rel="noopener" className="card" style={{ display: "block", color: "inherit", textDecoration: "none", marginTop: 4 }}>
        <span style={{ fontWeight: 600 }}>더 자세한 내용은 무료 가이드북에서 ›</span>
        <span className="faint" style={{ display: "block", fontSize: 12.5, marginTop: 2 }}>강아지 돌봄 95쪽 PDF · 무료</span>
      </a>
    </div>
  );
}

// 적용 시기: 생후 주 → "생후 6~16주", "생후 6개월부터", "1세부터"
function ageRange({ minWeek, maxWeek }) {
  const fmt = (w) => (w < 17 ? `${w}주` : w < 104 ? `${Math.round(w / 4.345)}개월` : `${Math.round(w / 52)}세`);
  if (maxWeek >= 9999) return minWeek === 0 ? "평생" : `생후 ${fmt(minWeek)}부터`;
  return `생후 ${minWeek === 0 ? "0주" : fmt(minWeek)}~${fmt(maxWeek)}`;
}
