// **강조** → 굵은 강조색, *행동* (수다 모드의 "*꼬리 붕붕*") → 기울임 흐린 글씨
export function renderEmphasized(text) {
  if (!text) return text;
  return text.split(/(\*\*.+?\*\*|\*[^*\n]+?\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} style={{ color: "var(--accent-strong)", fontWeight: 800 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} style={{ color: "var(--text-soft)", fontWeight: 500 }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}
