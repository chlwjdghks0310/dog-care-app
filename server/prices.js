// AI 단가($ / 100만 토큰): [입력, 출력, 캐시 읽기, 캐시 쓰기(5분)]
// 출처: https://platform.claude.com/docs/en/about-claude/pricing (2026-11-26 확인). 값이 바뀌면 여기 한 곳만 고친다.
// 11/26 수정: Haiku 5.5를 $1/$5로 10배 높게 적어 통계의 말로 기록·비서 빠른 답 금액이 부풀려져 있었다(실제 $0.10/$0.50). Sonnet 5.5 캐시 읽기도 0.2 → 0.1.
export const PRICES = {
  "claude-opus-5-5": [4, 20, 0.2, 5],
  "claude-sonnet-5-5": [2, 10, 0.1, 2.5],
  "claude-haiku-5-5": [0.1, 0.5, 0.01, 0.125],
};
// Haiku 5.5만: 한 요청의 입력(캐시 읽기·쓰기 포함)이 10만 토큰을 넘으면 그 요청 전체가 이 값
const HAIKU_LONG = [0.5, 2.5, 0.05, 0.625];
const LONG_OVER = 100_000;

// 모르는 모델(Gemini 등)은 null → 통계 화면에 "단가 미확인"
export function usdOf(model, inTok = 0, outTok = 0, cacheRead = 0, cacheWrite = 0) {
  const key = PRICES[model] ? model : Object.keys(PRICES).find((k) => String(model || "").startsWith(k)); // 응답 model엔 날짜가 붙을 수 있다
  if (!key) return null;
  const p = key === "claude-haiku-5-5" && inTok + cacheRead + cacheWrite > LONG_OVER ? HAIKU_LONG : PRICES[key];
  return (inTok * p[0] + outTok * p[1] + cacheRead * p[2] + cacheWrite * p[3]) / 1e6;
}
