import { renderEmphasized } from "./RichText";
import Ico, { iconFromTitle } from "./Ico";
// AI 답변 블록(src/utils/aiAnswer.js의 structureAnswer 결과)을 그린다:
// 핵심 한 줄 → 소제목 블록(병원·주의는 눈에 띄게) → 실제로 찾아본 참고 자료 링크 → 이어서 물어보기 버튼.
const TONE = {
  caution: { background: "var(--danger-bg)", borderLeft: "3px solid var(--danger)" },
  observation: { background: "var(--accent-soft)" },
};

export default function AiAnswer({ structured, onFollowUp, followUpDisabled }) {
  const { summary, sections, references, followUps } = structured;
  return (
    <>
      {summary && (
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.35, marginBottom: sections.length ? 10 : 0 }}>{renderEmphasized(summary)}</div>
      )}
      {sections.map((s, i) => (
        <div
          key={i}
          style={{
            marginTop: i ? 8 : 0,
            padding: TONE[s.type] ? "10px 12px" : "2px 0",
            borderRadius: 10,
            ...TONE[s.type],
          }}
        >
          {s.title && <SectionTitle title={s.title} />}
          {s.content && (
            <div style={{ fontSize: 14.5, color: "var(--text-soft)", lineHeight: 1.55, whiteSpace: "pre-line" }}>{renderEmphasized(s.content)}</div>
          )}
        </div>
      ))}
      {references.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}><Ico name="book" size={14} /> 찾아본 자료</div>
          {references.map((r) => (
            <a
              key={r.url}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", fontSize: 13, lineHeight: 1.6, color: "var(--accent-strong)", overflowWrap: "anywhere" }}
            >
              {r.title}
            </a>
          ))}
        </div>
      )}
      {followUps.length > 0 && onFollowUp && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }} aria-label="이어서 물어보기">
          {followUps.map((q) => (
            <button
              key={q}
              type="button"
              disabled={followUpDisabled}
              onClick={() => onFollowUp(q)}
              style={{
                padding: "8px 12px",
                minHeight: 36,
                borderRadius: 999,
                border: "1px solid var(--accent)",
                background: "var(--surface)",
                color: "var(--accent-strong)",
                fontSize: 13.5,
                fontWeight: 600,
                textAlign: "left",
                opacity: followUpDisabled ? 0.5 : 1,
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// AI가 붙인 소제목 이모지("👀 살펴봐 줘")는 앱의 선 아이콘으로 바꿔 보여 준다(모르는 이모지는 그대로)
function SectionTitle({ title }) {
  const icon = iconFromTitle(title);
  return (
    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
      {icon ? (
        <>
          <Ico name={icon.name} size={16} style={{ color: "var(--accent-strong)" }} /> {renderEmphasized(icon.text)}
        </>
      ) : (
        title
      )}
    </div>
  );
}
