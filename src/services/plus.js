import { getCharacter } from "./character";

// 멍케어 플러스(11/18 사용자 확정): 플러스 = 플러스 비서 + 한 달 리포트 + 캐릭터(연간 포함·할인). 그 밖은 전부 무료.
// 플러스 여부는 서버가 알려 준 값(fetchStatus → plus)을 폰에 적어 두고 읽는다(코드 쓴 강아지 = 플러스).
import { PLUS_MONTH, PLUS_YEAR } from "./billingCatalog";
export const PLUS_PRICE = { month: PLUS_MONTH, year: PLUS_YEAR }; // 값은 billingCatalog.js 한 곳(11/20)
// 베타 동안은 한 달 리포트를 모두에게 연다(테스터 의견을 받으려고). 결제가 열리면 true로 — 이 한 곳만 바꾼다.
export const MONTH_REPORT_GATED = false;

export const isPlus = (dogId) => Boolean(getCharacter(dogId)?.plus);
export const canSeeMonthReport = (dogId) => !MONTH_REPORT_GATED || isPlus(dogId);
