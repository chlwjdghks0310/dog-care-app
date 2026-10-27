import { useState } from "react";
import { renderEmphasized } from "./RichText";
import Ico, { iconFromTitle } from "./Ico";
// AI 답변 블록(src/utils/aiAnswer.js의 structureAnswer 결과)을 그린다:
// 핵심 한 줄 → 지금 할 일(👉) → 나머지 소제목은 "자세히 보기"로 접어 둔다(병원 가야 하는 🏥·🚨는 늘 펼침) → 참고 자료 → 이어서 물어보기.
// 출퇴근길처럼 짧게 볼 때 결론부터 읽히게(소제목이 2개 이하면 접지 않음)
const TONE = {
  caution: { background: "var(--danger-bg)", borderLeft: "3px solid var(--danger)" },
  observation: { background: "var(--accent-soft)" },
  todo: { background: "var(--accent-soft)", borderLeft: "3px solid var(--accent)" },
};
const ALWAYS_OPEN = new Set(["todo", "caution"]);

export default function AiAnswer({ structured, onFollowUp, followUpDisabled }) {
  const { summary, sections, references, followUps } = structured;
  const [open, setOpen] = useState(false);
  const foldable = sections.length > 2 && sections.some((s) => !ALWAYS_OPEN.has(s.type));
  const shown = foldable && !open ? sections.filter((s) => ALWAYS_OPEN.has(s.type)) : sections;
  const hiddenCount = sections.length - shown.length;
  return (
    <>
      {summary && (
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.35, marginBottom: sections.length ? 10 : 0 }}>{renderEmphasized(summary)}</div>
      )}
      {shown.map((s, i) => (
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
      {foldable && (
        <button type="button" className="ai-more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "접기 ▴" : `자세히 보기 ▾ · ${sections.filter((s) => !ALWAYS_OPEN.has(s.type)).map((s) => s.title.replace(/^\S+\s*/u, "").split(" —")[0]).filter(Boolean).slice(0, 3).join(" · ") || `${hiddenCount}개 더`}`}
        </button>
      )}
      {references.length > 0 && (open || !foldable) && (
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
            <button key={q} type="button" className="ai-followup" disabled={followUpDisabled} onClick={() => onFollowUp(q)} style={{ opacity: followUpDisabled ? 0.5 : 1 }}>
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
