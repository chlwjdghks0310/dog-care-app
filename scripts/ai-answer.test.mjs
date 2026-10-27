// AI 답변 블록·후속 질문 나누기 확인: npm test
import assert from "node:assert/strict";
const { structureAnswer, sanitizeStructured, splitFollowUps } = await import("../src/utils/aiAnswer.js");

const raw = `산책 뒤 발을 핥는 건 자극 때문일 수 있어!

👀 사진에서 본 나
• 발가락 사이가 조금 붉어 보여

🏥 이럴 땐 병원 가줘
• 피가 나거나 절뚝이면 바로 병원

📚 참고: VCA, Merck
[[후속질문]] 알레르기인지 어떻게 구분해? | 집에서 먼저 확인할 것은? | 집에서 먼저 확인할 것은? | 병원에 가야 하는 증상은? | ${"아".repeat(50)}`;

const s = structureAnswer(raw, [{ title: "VCA", url: "https://vcahospitals.com/x" }, { url: "javascript:alert(1)" }, { url: "https://vcahospitals.com/x" }]);
assert.equal(s.summary, "산책 뒤 발을 핥는 건 자극 때문일 수 있어!");
assert.deepEqual(s.sections.map((x) => x.type), ["observation", "caution"]);
assert.equal(s.sections[1].content, "• 피가 나거나 절뚝이면 바로 병원");
// 후속 질문: 중복·너무 긴 것 제거, 표시는 남지 않음
assert.deepEqual(s.followUps, ["알레르기인지 어떻게 구분해?", "집에서 먼저 확인할 것은?", "병원에 가야 하는 증상은?"]);
assert.ok(!s.text.includes("[[후속질문]]") && !s.text.includes("📚"));
// 출처: 진짜 링크만, 중복 없이
assert.deepEqual(s.references, [{ title: "VCA", url: "https://vcahospitals.com/x" }]);

// 형식이 안 지켜진 답(소제목 없음, 후속 질문 없음)도 한 블록으로
const plain = structureAnswer("꼬리 붕붕! 놀자!");
assert.equal(plain.summary, "꼬리 붕붕! 놀자!");
assert.deepEqual(plain.sections, []);
assert.deepEqual(plain.followUps, []);
const chat = structureAnswer("좋아!\n\n오늘은 터그 놀이 하자.\n공도 가져올게.");
assert.deepEqual(chat.sections, [{ type: "answer", title: "", content: "오늘은 터그 놀이 하자.\n공도 가져올게." }]);

// 서버에서 이상한 값이 와도 깨지지 않음
assert.equal(sanitizeStructured(null), null);
assert.equal(sanitizeStructured({ summary: "", sections: "x" }), null);
assert.deepEqual(sanitizeStructured({ summary: "요약", sections: [null, { content: 3 }], references: "x", followUps: [1, "  다음은?  "] }).followUps, ["다음은?"]);
assert.deepEqual(splitFollowUps("답만").followUps, []);

console.log("AI 답변 구조 확인 통과");

// 새 소제목(지금 할 일·보통은·우리 기록·신호·선택지)도 블록으로
const h = structureAnswer("자주 싸는 건 흔할 수 있어!\n\n👉 지금 할 일\n• 오늘 횟수를 적어 줘\n\n📌 보통은 이래\n• 1~3시간마다\n\n⚠️ 이런 신호가 같이 보이면\n• 피가 섞이면\n\n🧭 이렇게 골라 봐\n• ① 지켜보기");
assert.deepEqual(h.sections.map((x) => x.type), ["todo", "basics", "warning", "choice"]);
console.log("ai-answer new sections ok");

