// AI 답변 글 → 화면에 블록으로 그릴 구조. 서버(server/index.js)와 앱(Main.jsx)이 같이 쓴다.
// 서버 프롬프트가 "첫 줄 핵심 → 빈 줄 → 이모지 소제목 + • 항목 → 맨 끝 [[후속질문]] a | b | c" 형식을 시키고,
// 여기서 그걸 { summary, sections, references, followUps }로 나눈다. 형식이 안 지켜져도 깨지지 않게 글 그대로 한 블록으로 둔다.

export const FOLLOWUP_MARK = "[[후속질문]]";

// 소제목 이모지 → 블록 종류(화면 색·순서용). 📚는 AI가 적은 출처 이름이라 확인된 출처가 아니므로 블록으로 만들지 않고 뺀다.
const SECTION_TYPES = {
  "👉": "todo", // 지금 할 일 — 접지 않고 핵심 바로 아래에
  "💬": "answer",
  "📌": "basics",
  "🐾": "records",
  "⚠": "warning", // ⚠️(뒤에 FE0F)도 앞글자로 걸림
  "🧭": "choice",
  "👀": "observation",
  "🔬": "observation",
  "📊": "analysis",
  "🔍": "check",
  "🤔": "possibility",
  "🩺": "possibility",
  "🏠": "homecare",
  "🍚": "homecare",
  "🏥": "caution",
  "🚨": "caution",
  "📷": "limit",
};
const DROP_LINE = /^📚/u;

function headerType(line) {
  for (const [emoji, type] of Object.entries(SECTION_TYPES)) if (line.startsWith(emoji)) return type;
  return null;
}

// 맨 끝 [[후속질문]] 줄을 떼어 낸다. 질문은 2~40자, 겹치지 않게, 최대 5개.
export function splitFollowUps(text) {
  const raw = String(text || "");
  const at = raw.lastIndexOf(FOLLOWUP_MARK);
  if (at < 0) return { text: raw.trim(), followUps: [] };
  const followUps = cleanQuestions(raw.slice(at + FOLLOWUP_MARK.length).split(/[|\n]/));
  return { text: raw.slice(0, at).trim(), followUps };
}

function cleanQuestions(list) {
  const seen = new Set();
  const out = [];
  for (const q of Array.isArray(list) ? list : []) {
    const s = typeof q === "string" ? q.replace(/^\s*(?:[-•*]|\d+[.)])?\s*/, "").replace(/\*\*/g, "").trim() : "";
    if (s.length < 2 || s.length > 40 || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length === 5) break;
  }
  return out;
}

// 출처는 http(s) 링크가 있는 것만(검색 도구가 실제로 가져온 것). 같은 주소는 한 번만, 최대 6개.
function cleanReferences(list) {
  const seen = new Set();
  const out = [];
  for (const r of Array.isArray(list) ? list : []) {
    const url = typeof r?.url === "string" ? r.url.trim() : "";
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    const title = typeof r.title === "string" && r.title.trim() ? r.title.trim().slice(0, 120) : url.replace(/^https?:\/\//i, "").split("/")[0];
    out.push({ title, url });
    if (out.length === 6) break;
  }
  return out;
}

export function structureAnswer(rawText, references = []) {
  const { text, followUps } = splitFollowUps(rawText);
  const blocks = text.split(/\n\s*\n/);
  const summary = (blocks[0] || "").trim();
  const sections = [];
  let current = null;
  let gap = false;
  for (const line of blocks.slice(1).join("\n\n").split("\n")) {
    const t = line.trim();
    if (DROP_LINE.test(t)) continue;
    const type = t && !t.startsWith("•") ? headerType(t) : null;
    // 마지막 소제목 뒤에 빈 줄을 두고 붙은 맺음말("기록해 둘까?" 같은 되묻기)은 접힌 소제목에 묻히지 않게 따로 둔다
    const closing = !type && gap && current?.title && current.type !== "closing" && t && !/^[•①-⑳\d]/.test(t);
    gap = !t;
    if (closing) {
      current = { type: "closing", title: "", content: line };
      sections.push(current);
    } else if (type) {
      current = { type, title: t, content: "" };
      sections.push(current);
    } else if (t || current) {
      if (!current) {
        current = { type: "answer", title: "", content: "" };
        sections.push(current);
      }
      current.content += (current.content ? "\n" : "") + line;
    }
  }
  // 맺음말처럼 보였지만 뒤에 소제목이 또 나오면 그 앞 소제목의 문단으로 되돌린다(맺음말은 맨 끝 것만)
  for (let i = sections.length - 2; i >= 0; i--) {
    if (sections[i].type === "closing" && i > 0) sections[i - 1].content = sections[i - 1].content.trimEnd() + "\n\n" + sections.splice(i, 1)[0].content;
  }
  return sanitizeStructured({
    text: text.split("\n").filter((l) => !DROP_LINE.test(l.trim())).join("\n").trim(),
    summary,
    sections,
    references,
    followUps,
  });
}

// 서버에서 받은 구조를 그리기 전에 한 번 더 걸러서, 빈 값·이상한 값이 와도 화면이 깨지지 않게 한다.
export function sanitizeStructured(s) {
  if (!s || typeof s !== "object") return null;
  const sections = (Array.isArray(s.sections) ? s.sections : [])
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      type: typeof x.type === "string" ? x.type : "answer",
      title: typeof x.title === "string" ? x.title.trim() : "",
      content: typeof x.content === "string" ? x.content.trim() : "",
    }))
    .filter((x) => x.content || x.title);
  const summary = typeof s.summary === "string" ? s.summary.trim() : "";
  if (!summary && !sections.length) return null;
  return {
    text: typeof s.text === "string" ? s.text : "",
    summary,
    sections,
    references: cleanReferences(s.references),
    followUps: cleanQuestions(s.followUps),
  };
}
