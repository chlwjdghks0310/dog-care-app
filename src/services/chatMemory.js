import { readJSON, writeJSON } from "./storage";

// AI가 기억하는 대화(강아지별). 화면의 채팅은 메인으로 가면 지워지지만, 이건 앱을 껐다 켜도 남아서
// 다음 질문 때 AI에게 함께 보낸다 → 전에 나눈 이야기를 이어서 답한다.
// 구조: { [dogId]: [{ role: "user" | "ai", text }] } — 너무 길면 답이 느려지고 비싸져 최근 MAX개만.
const KEY = "dogcare-chat-memory-v1";
const MAX = 20;

export function getChatMemory(dogId) {
  return readJSON(KEY, {})[dogId] || [];
}

export function rememberChat(dogId, question, answer) {
  const all = readJSON(KEY, {});
  all[dogId] = [...(all[dogId] || []), { role: "user", text: question }, { role: "ai", text: answer }].slice(-MAX);
  writeJSON(KEY, all);
}
