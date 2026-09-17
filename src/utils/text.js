// AI 응답을 "핵심 한 줄(헤드라인) + 부가 설명"으로 나눈다.
// 서버 쪽 프롬프트가 "핵심 문장 \n\n 부가 설명" 형식을 지키도록 지시하지만,
// 혹시 지켜지지 않아도 최대한 자연스럽게 나눠서 보여준다.
export function splitHeadline(text) {
  if (!text) return { headline: "", detail: "" };

  const blankLineParts = text.split(/\n\s*\n/);
  if (blankLineParts.length > 1) {
    return { headline: blankLineParts[0].trim(), detail: blankLineParts.slice(1).join("\n\n").trim() };
  }

  const lines = text.split("\n").filter((l) => l.trim() !== "");
  if (lines.length > 1) {
    return { headline: lines[0].trim(), detail: lines.slice(1).join(" ").trim() };
  }

  const match = text.match(/^(.{1,40}?[.!?])\s*(.*)$/s);
  if (match && match[2]) {
    return { headline: match[1].trim(), detail: match[2].trim() };
  }

  return { headline: text.trim(), detail: "" };
}
