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
    return map;
  }, [activeIds, dog.breed]);

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 홈으로
      </button>
      <div className="h1">강아지 정보</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        {dog.name}에게 지금 중요한 항목이 먼저 보여요.
      </p>

      {[...categories.entries()].map(([category, rules]) => (
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: isActive ? "var(--text)" : "var(--text-faint)" }}>
                      {rule.title}
                    </span>
                    {isActive && <span className="chip">지금 중요해요</span>}
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
      ))}
    </div>
  );
}
