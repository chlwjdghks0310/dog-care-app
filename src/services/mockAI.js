import { calculateAge, formatAge } from "../utils/age";
import { CARE_RULES, getRulesForAge } from "../data/careRules";
import { getThisWeekHighlights } from "./careEngine";

// 실제 AI API가 준비되기 전까지 사용할 규칙 기반 mock 응답.
// 강아지 1인칭 말투로, "핵심 한 줄 → 빈 줄 → 부가 설명" 형식을 지켜 답한다
// (Main 화면이 첫 줄을 큰 글씨 헤드라인으로 보여주기 때문).
// 의료적 확정 진단·약물/용량 제시는 하지 않고 필요 시 수의사 상담을 권한다.
const KEYWORD_MAP = [
  { keywords: ["물어", "물다", "깨물"], category: "사회화" },
  { keywords: ["배변", "화장실", "패드"], category: "배변훈련" },
  { keywords: ["산책"], category: "산책" },
  { keywords: ["밥", "사료", "식사", "먹"], category: "식사" },
  { keywords: ["이갈이", "이빨", "치아"], category: "이갈이" },
  { keywords: ["목욕", "미용", "브러싱", "털"], category: "목욕/미용" },
  { keywords: ["훈련", "명령어", "앉아"], category: "행동/훈련" },
  { keywords: ["백신", "접종", "예방"], category: "예방접종" },
  { keywords: ["사회화", "낯가림", "무서워"], category: "사회화" },
  { keywords: ["잠", "수면", "졸"], category: "수면" },
];

const EMERGENCY_KEYWORDS = ["아파", "토해", "구토", "설사", "피", "쓰러", "경련", "응급"];

function findCategory(question) {
  const found = KEYWORD_MAP.find((entry) => entry.keywords.some((k) => question.includes(k)));
  return found?.category || null;
}

export function answerQuestion(dog, question) {
  const age = calculateAge(dog.birthDate);
  const ageLabel = formatAge(age);

  if (EMERGENCY_KEYWORDS.some((k) => question.includes(k))) {
    return "병원 선생님한테 꼭 데려가 줘!\n\n나 지금 몸 상태는 나도 정확히는 모르겠어... 구토, 설사, 기운 없음 같은 게 계속되거나 갑자기 심해지면 지체하지 말고 병원에 가는 게 안전해.";
  }

  const category = findCategory(question);
  if (category) {
    const rulesNow = getRulesForAge(age.ageInWeeks, dog.breed).filter((r) => r.category === category);
    if (rulesNow.length > 0) {
      const rule = rulesNow[0];
      return (
        `${rule.title}!\n\n` +
        `나 지금 ${ageLabel}이야. ${rule.why} ${rule.how}` +
        (rule.caution ? ` (주의할 점: ${rule.caution})` : "") +
        ` 근데 이건 일반적인 얘기니까, 계속 신경 쓰이면 병원 선생님한테 물어봐 줘!`
      );
    }
    const anyRule = CARE_RULES.find((r) => r.category === category);
    return (
      `"${category}"는 지금은 안 급해!\n\n` +
      `내 나이(${ageLabel})엔 그렇게 급한 건 아니야. ` +
      (anyRule ? `보통은 ${anyRule.why} ` : "") +
      `지금 나한테 필요한 건 홈 화면 "오늘 해야 할 일"이랑 "이번 주 핵심"에서 확인해 줘!`
    );
  }

  const weekly = getThisWeekHighlights(dog);
  if (weekly.length > 0) {
    return (
      `"${weekly[0].title}" 챙겨줄 시간이야!\n\n` +
      `나 지금(${ageLabel}) 이 시기엔 이게 중요해. ${weekly[0].why} 더 궁금한 거 있으면 자세히 물어봐 줘!`
    );
  }

  return `조금만 더 자세히 물어봐 줄래?\n\n나 지금 ${ageLabel}이야! 뭐가 궁금한지 좀 더 구체적으로 말해주면 더 잘 답해줄 수 있어.`;
}
