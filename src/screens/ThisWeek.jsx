import { useMemo } from "react";
import { calculateAge, formatAge } from "../utils/age";
import { getThisWeekHighlights, getUpcoming } from "../services/careEngine";

export default function ThisWeek({ dog, onBack, onOpenMain }) {
  const age = useMemo(() => calculateAge(dog.birthDate), [dog.birthDate]);
  const highlights = useMemo(() => getThisWeekHighlights(dog), [dog]);
  const upcoming = useMemo(() => getUpcoming(dog), [dog]);

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 뒤로
      </button>
      <div className="h1">이번 주</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        {dog.name}는 지금 {formatAge(age)}예요. 이 시기에 특히 챙기면 좋은 항목이에요.
      </p>

      {highlights.length === 0 ? (
        <div className="card subtle">이번 주 특별히 강조할 항목이 없어요.</div>
      ) : (
        highlights.map((rule) => (
          <div key={rule.id} className="card" style={{ marginBottom: 12 }}>
            <span className="chip" style={{ marginBottom: 8 }}>{rule.category}</span>
            <div className="h2">{rule.title}</div>
            <p className="subtle"><strong>왜:</strong> {rule.why}</p>
            <p className="subtle"><strong>어떻게:</strong> {rule.how}</p>
            {rule.caution && <p className="error-text">주의: {rule.caution}</p>}
            {rule.source && <p className="faint">출처: {rule.source}</p>}
          </div>
        ))
      )}

      {upcoming.length > 0 && (
        <>
          <div className="h2" style={{ marginTop: 8 }}>다가오는 항목</div>
          {upcoming.map((rule) => (
            <div key={rule.id} className="card" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600 }}>{rule.title}</div>
              <p className="subtle">약 {rule.startsInWeeks}주 후부터 · {rule.why}</p>
            </div>
          ))}
        </>
      )}

      <p
        className="subtle"
        style={{ textAlign: "center", marginTop: 14, marginBottom: 0, cursor: "pointer" }}
        onClick={onOpenMain}
      >
        궁금한 점은 메인에 있는 강아지한테 물어보세요!
      </p>
    </div>
  );
}
