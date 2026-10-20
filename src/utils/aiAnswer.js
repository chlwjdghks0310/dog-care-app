// AI 답변 글 → 화면에 블록으로 그릴 구조. 서버(server/index.js)와 앱(Main.jsx)이 같이 쓴다.
// 서버 프롬프트가 "첫 줄 핵심 → 빈 줄 → 이모지 소제목 + • 항목 → 맨 끝 [[후속질문]] a | b | c" 형식을 시키고,
// 여기서 그걸 { summary, sections, references, followUps }로 나눈다. 형식이 안 지켜져도 깨지지 않게 글 그대로 한 블록으로 둔다.

export const FOLLOWUP_MARK = "[[후속질문]]";

// 소제목 이모지 → 블록 종류(화면 색·순서용). 📚는 AI가 적은 출처 이름이라 확인된 출처가 아니므로 블록으로 만들지 않고 뺀다.
const SECTION_TYPES = {
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
    const s = typeof q === "string" ? q.replace(/^[\s\-•*\d.)]+/, "").replace(/\*\*/g, "").trim() : "";
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
  for (const line of blocks.slice(1).join("\n\n").split("\n")) {
    const t = line.trim();
    if (DROP_LINE.test(t)) continue;
    const type = t && !t.startsWith("•") ? headerType(t) : null;
    if (type) {
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
