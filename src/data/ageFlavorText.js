// 월령대별로 "지금 이 시기의 강아지가 하고 있을 법한 일"을 강아지 1인칭 말투로 표현한 문구.
// 실제 건강/케어 판단에 쓰이는 데이터가 아니라 메인 화면 분위기용 문구다.
import { nameCall } from "../utils/text";

const STAGES = [
  { maxWeek: 2, phrases: ["새근새근 잠만 자면서 무럭무럭 크고 있어!", "엄마 품에서 온기를 느끼면서 하루 종일 자는 중이야."] },
  { maxWeek: 4, phrases: ["아장아장 첫 걸음마를 연습하고 있어!", "눈이랑 귀가 막 트여서 세상이 다 신기해!"] },
  { maxWeek: 8, phrases: ["형제들이랑 뒹굴면서 노는 법을 한창 배우고 있어!", "이빨이 근질근질해서 뭐든 살짝 깨물어보고 싶어."] },
  { maxWeek: 12, phrases: ["낯선 소리에 깜짝 놀랐다가도 금세 궁금해서 다가가!", "배변 훈련하다 칭찬받으면 세상 뿌듯해!"] },
  { maxWeek: 17, phrases: ["이갈이 때문에 근질거려서 장난감을 열심히 물어뜯고 있어.", "낮잠이랑 놀이를 번갈아 하면서 하루를 꽉 채우고 있어!"] },
  { maxWeek: 26, phrases: ["산책 나가서 냄새 맡느라 정신이 하나도 없어!", "이제 '기다려'도 제법 의젓하게 할 수 있어!"] },
  { maxWeek: 78, phrases: ["에너지가 넘쳐서 하루 종일 뛰어놀고 싶어!", "훈련도 곧잘 따라하는 청소년기를 보내고 있어."] },
  { maxWeek: Infinity, phrases: ["느긋하게 창밖 구경하면서 여유를 즐기고 있어.", "산책 시간만 손꼽아 기다리면서 하루를 보내고 있어!"] },
];

// 월령/할 일과 상관없는 그날그날의 잡담 한 줄. 날짜 시드로 0~2개를 골라
// 말풍선 길이를 매일 2~4줄 사이로 다르게 만드는 데 쓴다.
const CHATTER_LINES = [
  "오늘 날씨 냄새가 좀 다른 것 같아, 킁킁!",
  "꼬리가 저절로 막 흔들려, 기분이 너무 좋아!",
  "창밖에 지나가는 거 구경하느라 넋 놓고 있었어.",
  "장난감 숨겨놓은 자리 다시 찾는 중이야.",
  "낮잠 한 번 자고 왔더니 힘이 다시 쌩쌩해!",
  "간식 생각이 계속 나서 자꾸 밥그릇 쳐다보게 돼.",
  "발바닥이 오늘따라 간질간질한 느낌이야.",
  "산책 나갈 시간만 손꼽아 기다리고 있어.",
  "누가 지나가는 소리만 나도 귀가 쫑긋해져.",
  "오늘은 왠지 애교 부리고 싶은 기분이야!",
];

function hashToIndex(text, length) {
  let sum = 0;
  for (let i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return sum % length;
}

function pick(seed, list) {
  return list[hashToIndex(seed, list.length)];
}

// dateKey를 시드로 써서 하루 동안은 같은 문구가 유지되고, 날짜가 바뀌면 자연스럽게 다른 문구로 바뀐다.
export function getAgeFlavorText(ageInWeeks, dateKey) {
  const stage = STAGES.find((s) => ageInWeeks <= s.maxWeek) || STAGES[STAGES.length - 1];
  return pick(dateKey, stage.phrases);
}

// 오늘 남은 할 일 카테고리를 강아지가 직접 조르는 듯한 한 문장으로 만든다.
function buildTaskLine(remainingCategories, dateKey) {
  if (remainingCategories.length === 0) {
    return pick(`${dateKey}-done`, ["오늘 할 일은 다 끝냈어, 잘했지?", "오늘 챙길 건 다 챙겼어! 최고지 나?"]);
  }
  const list = remainingCategories.slice(0, 2).join(", ");
  return pick(`${dateKey}-todo`, [`오늘은 ${list}도 챙겨줘야 하는 거 알지?`, `${list}은 아직인데... 잊으면 안 돼!`]);
}

// 날짜 시드로 잡담 줄을 0~2개 고른다(중복 없이, 날짜가 바뀌면 다른 조합이 나오게 순환시킨다).
function pickChatterLines(dateKey, count) {
  if (count === 0) return [];
  const offset = hashToIndex(`${dateKey}-chatter`, CHATTER_LINES.length);
  const rotated = [...CHATTER_LINES.slice(offset), ...CHATTER_LINES.slice(0, offset)];
  return rotated.slice(0, count);
}

// dog 1인칭 말투로 인사 + 오늘 남은 할 일을 말해주는 문장을 만든다. 줄 수는 날짜 시드로
// 2~4줄 사이에서 매일 달라진다(1줄짜리로 너무 짧아지거나 5줄 이상으로 길어지지 않게).
export function getDogGreeting(name, ageInWeeks, checklist, dateKey) {
  const flavor = getAgeFlavorText(ageInWeeks, dateKey);
  const remainingCategories = [...new Set((checklist || []).filter((i) => !i.completed).map((i) => i.category))];
  const taskLine = buildTaskLine(remainingCategories, dateKey);
  const extraCount = hashToIndex(`${dateKey}-linecount`, 3); // 0, 1, 2
  const lines = [`나는 ${nameCall(name)}! ${flavor}`, taskLine, ...pickChatterLines(dateKey, extraCount)];
  return lines.join("\n");
}
