// 이름 끝 글자에 받침이 있으면 "~이야", 없으면 "~야"를 붙인다.
// (한글 완성형 글자는 코드값이 0xAC00~0xD7A3이고, 그 안에서 (code - 0xAC00) % 28 이
// 0이면 받침 없는 글자다. 한글이 아닌 이름은 받침이 없다고 보고 "야"를 붙인다.)
export function nameCall(name) {
  return josa(name, "이야", "야");
}

// 받침 있으면 withBatchim, 없으면 without을 붙인다. 예: josa("콩이", "은", "는") → "콩이는"
export function josa(name, withBatchim, without) {
  const code = name.trim().slice(-1).charCodeAt(0);
  const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return `${name}${hasBatchim ? withBatchim : without}`;
}

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
