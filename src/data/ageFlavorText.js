// 월령대별로 "지금 이 시기의 강아지가 하고 있을 법한 일"을 강아지 1인칭 말투로 표현한 문구.
// 실제 건강/케어 판단에 쓰이는 데이터가 아니라 메인 화면 분위기용 문구다.
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

// dog 1인칭 말투로 인사 + 오늘 남은 할 일까지 한 번에 말해주는 문장을 만든다.
export function getDogGreeting(name, ageInWeeks, checklist, dateKey) {
  const flavor = getAgeFlavorText(ageInWeeks, dateKey);
  const remainingCategories = [...new Set((checklist || []).filter((i) => !i.completed).map((i) => i.category))];
  const taskLine = buildTaskLine(remainingCategories, dateKey);
  return `나는 ${name}야! ${flavor} ${taskLine}`;
}
