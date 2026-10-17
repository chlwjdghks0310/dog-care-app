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

// 앱에서 실제로 처리된 결과(기록함·고침·지움·취소)를 AI가 기억하는 마지막 답변에 덧붙인다.
// AI는 자기 말만 기억하면 "아직 안 했다"고 착각하거나 취소한 고치기를 또 제안한다 → 실제 결과를 함께 기억시킨다.
export function noteChatResult(dogId, note) {
  const all = readJSON(KEY, {});
  const list = all[dogId] || [];
  const last = list.findLastIndex((m) => m.role === "ai");
  if (last < 0) return;
  list[last] = { ...list[last], text: `${list[last].text}\n[앱 처리 결과] ${note}` };
  writeJSON(KEY, all);
}
