// 비서 빠른 답(여름이 말투, 11/26)의 글 → 화면 칸. server/index.js의 /api/ask가 쓴다.
// 다음 질문 단추: 보호자가 비서(강아지)에게 물을 말만 남긴다. "귀 냄새 나?", "토했어?"처럼 강아지가 보호자에게 묻는 말은
// 눌러도 말이 안 돼서 버린다 — 보호자가 궁금해할 때 쓰는 낱말(왜·언제·어떻게·해도 돼 등)이 있어야 통과(11/27)
export const ownerAsks = (q) => !/언제부터|(랬|했|났|였|줬|봤|갔)어\?$/.test(q) && /왜|언제|어떻게|어떡|얼마|어디|뭐|뭘|무엇|무슨|누구|어느|어떤|몇|해도|야 해|야 돼|가야|돼\?|될까|되나|해야|괜찮|줄까|갈까|할까|바꿀까|맞아\?|기록|지난|다음/.test(q);
// 답 속 숫자 가운데 근거(강아지 정보·질문·앞 대화)에 없는 것. 24(24시 병원)는 봐준다 — 기록에 없는 기준 숫자를 지어내는지 보는 용도
export function strayNumbers(text, source) {
  const have = new Set(String(source).match(/\d+(?:\.\d+)?/g) || []);
  return [...new Set(String(text).match(/\d+(?:\.\d+)?/g) || [])].filter((n) => n !== "24" && !have.has(n));
}
// 답 속 날짜("11/24", "11월 24일") 가운데 근거에 그 날짜가 없는 것 — 기록에 없는 지난 일을 지어냈다는 신호(11/27)
export function strayDates(text, source) {
  const norm = (t) => new Set([...String(t).replace(/\d{4}[-.](\d{1,2})[-.](\d{1,2})/g, " $1/$2 ").matchAll(/(?<!\d)(\d{1,2})\s*(?:\/|월\s*)(\d{1,2})(?!\d)/g)].map((m) => `${Number(m[1])}/${Number(m[2])}`));
  const have = norm(source);
  return [...norm(text)].filter((d) => !have.has(d));
}
// 답을 칸으로 나눈다(틀이 어긋나면 전체를 say로 — 화면이 비지 않게)
export function splitDog(text) {
  const grab = (label, next) => text.match(new RegExp(`(?:^|\\n)${label}:[ \\t]*([\\s\\S]*?)(?=\\n(?:${next}):|$)`))?.[1]?.trim() || "";
  const say = grab("말", "병원|다음 질문");
  const vet = grab("병원", "다음 질문").replace(/^(없음|없어|해당 없음|-)\.?$/, ""); // 병원 얘기가 필요 없는 질문
  const next = grab("다음 질문", "말|병원").split("|").map((q) => q.replace(/^["'“”\s]+|["'“”\s]+$/g, "")).filter((q) => q && q.length <= 24 && ownerAsks(q)).slice(0, 2);
  return say ? { say, vet, next } : { say: text.replace(/^(말|병원|다음 질문):\s*/gm, "").trim(), vet: "", next: [] };
}
// 이어 묻기·지난 대화: 앱이 보낸 [{ q, a }]를 길이만 잘라 쓴다(모양이 이상한 건 버림)
export const turnsOf = (list, max, qLen, aLen) => (Array.isArray(list) ? list : []).filter((t) => t && typeof t.q === "string" && typeof t.a === "string" && t.q.trim() && t.a.trim()).slice(-max).map((t) => ({ q: t.q.trim().slice(0, qLen), a: t.a.trim().slice(0, aLen) }));
