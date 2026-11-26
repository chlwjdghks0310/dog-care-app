// 비서 빠른 답(여름이 말투, 11/26)의 글 → 화면 칸. server/index.js의 /api/ask가 쓴다.
// 답을 칸으로 나눈다(틀이 어긋나면 전체를 say로 — 화면이 비지 않게)
export function splitDog(text) {
  const grab = (label, next) => text.match(new RegExp(`(?:^|\\n)${label}:[ \\t]*([\\s\\S]*?)(?=\\n(?:${next}):|$)`))?.[1]?.trim() || "";
  const say = grab("말", "병원|다음 질문");
  const vet = grab("병원", "다음 질문").replace(/^(없음|없어|해당 없음|-)\.?$/, ""); // 병원 얘기가 필요 없는 질문
  const next = grab("다음 질문", "말|병원").split("|").map((q) => q.replace(/^["'“”\s]+|["'“”\s]+$/g, "")).filter((q) => q && q.length <= 24).slice(0, 2);
  return say ? { say, vet, next } : { say: text.replace(/^(말|병원|다음 질문):\s*/gm, "").trim(), vet: "", next: [] };
}
// 이어 묻기·지난 대화: 앱이 보낸 [{ q, a }]를 길이만 잘라 쓴다(모양이 이상한 건 버림)
export const turnsOf = (list, max, qLen, aLen) => (Array.isArray(list) ? list : []).filter((t) => t && typeof t.q === "string" && typeof t.a === "string" && t.q.trim() && t.a.trim()).slice(-max).map((t) => ({ q: t.q.trim().slice(0, qLen), a: t.a.trim().slice(0, aLen) }));
