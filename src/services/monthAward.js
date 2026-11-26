// 이 달의 상장(자랑 카드, 11/27): 누구나 하나씩 받는다. 순위·비교·건강 판정 없음 — 근거 ../자료용/자료/2026-11-27-자랑카드-공유요소.md
// (듀오링고: 모두가 받는 칭호를 넣자 공유가 늘었다. 적게 한 달에도 받을 상이 있어야 한다)
// 문장은 강아지 1인칭 반말, 보호자 호칭 없음, 숫자는 하나까지. 건강·먹는 양 얘기는 넣지 않는다.
import { readJSON, writeJSON } from "./storage";

// when(f): 받을 수 있는 달인가. f = { m(월), days(지난 날 수), walkDays, walkMin, check, streaks, records, together(함께한 날), ageMonths,
//                                    birthday, anniversary, hundred(이 달에 맞은 100일 단위), first(첫 달) }
// 순서가 곧 우선순위(특별한 달 → 기록으로 받는 상). 계절·그냥 상은 아래 따로.
export const AWARDS = [
  { id: "birthday", name: "생일 주인공상", when: (f) => f.birthday, lines: [
    (f) => `${f.m}월은 내 생일 달! 주인공은 나야`, () => "한 살 더 먹었어. 귀여움은 그대로야", () => "생일 축하는 한 달 내내 받을게", () => "태어나길 잘했어. 이 집이라서 더" ] },
  { id: "anniversary", name: "우리 집 기념상", when: (f) => f.anniversary, lines: [
    () => "이 집에 온 달이야. 제일 잘한 일이지", (f) => `함께한 지 ${f.together}일. 아직도 매일 반가워`, () => "처음 온 날 기억나? 난 다 기억해", () => "우리 집이 된 달, 올해도 축하해 줘" ] },
  { id: "hundred", name: "백일 축하상", when: (f) => f.hundred, lines: [
    (f) => `함께한 지 ${f.hundred}일 넘었어. 박수!`, (f) => `${f.hundred}일 동안 매일 귀여웠어`, (f) => `벌써 ${f.hundred}일이래. 시간 참 빠르다`, (f) => `${f.hundred}일 기념으로 한 번 더 쓰다듬어 줘` ] },
  { id: "first", name: "첫 달 새싹상", when: (f) => f.first, lines: [
    () => "멍케어 첫 달이야. 이제 시작!", (f) => `첫 달에 기록 ${f.records}개. 출발이 좋아`, () => "내 수첩이 생겼어. 잘 부탁해", () => "첫 장을 넘겼어. 다음 달도 같이 쓰자" ] },
  { id: "walk-master", name: "산책 대장상", when: (f) => f.walkDays >= 20, lines: [
    (f) => `산책 ${f.walkDays}번 나갔어. 동네는 내가 접수했어`, (f) => `${f.walkDays}번이나 나갔어. 발바닥이 바빴지`, (f) => `산책 ${f.walkDays}번. 현관문이 제일 좋아`, (f) => `이번 달 산책 ${f.walkDays}번. 대장은 나야` ] },
  { id: "walk-hard", name: "산책 열심상", when: (f) => f.walkDays >= 10, lines: [
    (f) => `산책 ${f.walkDays}번 나갔어. 줄은 내가 끌었어`, (f) => `${f.walkDays}번 나갔어. 냄새 맡을 데가 많았거든`, (f) => `산책 ${f.walkDays}번. 다음 달엔 더 가자`, (f) => `${f.walkDays}번 걸었어. 같이 걷는 게 제일 좋아` ] },
  { id: "walk-slow", name: "느긋 산책상", when: (f) => f.walkDays >= 4 && f.walkMin / f.walkDays >= 40, lines: [
    (f) => `한 번 나가면 ${Math.round(f.walkMin / f.walkDays)}분. 천천히 걷는 게 내 멋이야`, () => "서두르지 않아. 풀 냄새는 오래 맡아야 해", (f) => `모두 ${f.walkMin}분 걸었어. 느긋하게`, () => "산책은 길게, 걸음은 천천히" ] },
  { id: "explorer", name: "동네 탐험상", when: (f) => f.walkDays >= 4, lines: [
    (f) => `산책 ${f.walkDays}번. 새 냄새를 많이 찾았어`, () => "저 골목은 다음에 꼭 가 보자", (f) => `${f.walkDays}번 나가서 동네를 살펴봤어`, () => "전봇대마다 인사하고 왔어" ] },
  { id: "perfect", name: "도장 개근상", when: (f) => f.days >= 20 && f.check >= f.days, lines: [
    (f) => `도장 ${f.check}개. 하루도 안 빠졌어`, (f) => `${f.check}일 내내 도장 찍었어. 나 좀 대단하지?`, () => "빈칸이 하나도 없어. 개근이야", (f) => `발도장 ${f.check}개 꽉 채웠어` ] },
  { id: "collector", name: "발도장 수집상", when: (f) => f.streaks >= 2, lines: [
    (f) => `일주일 내리 찍기를 ${f.streaks}번 했어. 도장 부자야`, (f) => `도장 ${f.check}개 모았어. 나 좀 대단하지?`, (f) => `일주일 내리 찍기 ${f.streaks}번 성공`, (f) => `발도장 ${f.check}개. 수첩이 알록달록해` ] },
  { id: "steady", name: "꼬박꼬박상", when: (f) => f.check >= 7 && f.check >= f.days / 2, lines: [
    (f) => `도장 ${f.check}개 모았어. 꼬박꼬박 챙겨 줬네`, (f) => `${f.check}일이나 나를 들여다봤어. 고마워`, (f) => `발도장 ${f.check}개. 절반을 넘겼어`, () => "매일 안부를 물어봐 줘서 좋았어" ] },
  { id: "rich", name: "기록 부자상", when: (f) => f.records >= 40, lines: [
    (f) => `기록 ${f.records}개. 내 얘기가 이만큼이야`, (f) => `${f.records}개나 적었어. 나는 할 얘기가 많은 강아지야`, (f) => `수첩에 ${f.records}줄. 두툼해졌어`, (f) => `이번 달 기록 ${f.records}개. 부자가 됐어` ] },
  { id: "diary", name: "일기 꾸준상", when: (f) => f.records >= 15, lines: [
    (f) => `기록 ${f.records}개. 내 하루가 차곡차곡 쌓였어`, (f) => `${f.records}번 적어 줬어. 다 기억할게`, (f) => `이번 달 내 일기 ${f.records}줄`, () => "조금씩 적은 게 벌써 이만큼이야" ] },
  { id: "growing", name: "쑥쑥 자람상", when: (f) => f.ageMonths != null && f.ageMonths < 12, lines: [
    (f) => `벌써 ${f.ageMonths}개월. 하루하루 크는 중이야`, () => "어제의 나보다 조금 더 컸어", (f) => `${f.ageMonths}개월 차. 세상이 다 신기해`, () => "자고 일어나면 커 있을 거야" ] },
];

// 계절 상: 달마다 하나. 기록과 상관없이 누구나
export const SEASONAL = {
  1: { id: "s1", name: "새해 다짐상", lines: [() => "올해도 귀여울 예정이야", () => "새해 목표는 산책 많이 가기", () => "올해도 잘 부탁해", () => "새해 첫 달, 꼬리부터 흔들었어"] },
  2: { id: "s2", name: "이불 속 명당상", lines: [() => "겨울엔 이불 속이 최고야", () => "따뜻한 자리는 내가 먼저 찾아", () => "추운 날엔 꼭 붙어 있자", () => "이불 한가운데는 내 자리야"] },
  3: { id: "s3", name: "봄바람 살랑상", lines: [() => "봄 냄새가 나. 코가 바빠졌어", () => "바람이 살랑, 꼬리도 살랑", () => "봄이 왔대. 나가 보자", () => "새싹 냄새를 제일 먼저 맡았어"] },
  4: { id: "s4", name: "꽃구경상", lines: [() => "꽃보다 내가 더 예쁘지?", () => "꽃길만 걷는 중이야", () => "꽃잎이 코에 붙었어", () => "사진은 꽃 앞에서 찍어 줘"] },
  5: { id: "s5", name: "햇살 뒹굴상", lines: [() => "햇볕 드는 자리는 다 내 거야", () => "뒹굴기 좋은 달이었어", () => "잔디가 폭신했어", () => "햇살 아래서 배를 보였어"] },
  6: { id: "s6", name: "장마 뽀송상", lines: [() => "비 오는 날엔 창밖 구경이지", () => "빗소리 들으며 잘 잤어", () => "발은 젖어도 마음은 뽀송해", () => "우산 속은 생각보다 아늑했어"] },
  7: { id: "s7", name: "선풍기 앞자리상", lines: [() => "선풍기 앞은 양보 못 해", () => "시원한 바닥을 찾아냈어", () => "여름엔 바람 드는 자리가 최고야", () => "털이 바람에 날렸어. 멋있지?"] },
  8: { id: "s8", name: "그늘 명당상", lines: [() => "그늘 자리는 내가 제일 잘 알아", () => "나무 밑이 제일 좋았어", () => "한여름에도 꼬리는 흔들었어", () => "저녁 바람을 기다렸어"] },
  9: { id: "s9", name: "하늘 구경상", lines: [() => "하늘이 높아졌어. 귀도 쫑긋", () => "바람이 선선해졌어. 신나", () => "가을 냄새가 나기 시작했어", () => "구름을 한참 올려다봤어"] },
  10: { id: "s10", name: "낙엽 바스락상", lines: [() => "낙엽 밟는 소리가 좋아", () => "바스락, 바스락. 또 밟을래", () => "낙엽 더미는 그냥 못 지나쳐", () => "가을 길은 소리가 나서 재밌어"] },
  11: { id: "s11", name: "따뜻한 무릎상", lines: [() => "쌀쌀해지면 무릎이 최고야", () => "따뜻한 데는 내가 다 알아", () => "꼭 붙어 있기 좋은 달이었어", () => "담요를 하나 차지했어"] },
  12: { id: "s12", name: "첫눈 기다림상", lines: [() => "눈 오면 제일 먼저 나갈 거야", () => "올해도 고마웠어", () => "한 해 동안 매일 귀여웠어", () => "내년에도 같이 걷자"] },
};

// 그냥 받는 상: 기록이 없어도. 달마다 돌아가며
export const FUN = [
  { id: "cute", name: "그냥 귀여움상", lines: [() => "이번 달도 귀여웠어. 그게 내 일이야", () => "특별히 한 건 없어. 귀여웠을 뿐이야", () => "가만히 있어도 귀여운 걸 어떡해", () => "귀여움은 쉬는 날이 없어"] },
  { id: "tail", name: "꼬리 살랑상", lines: [() => "꼬리가 쉴 틈이 없었어", () => "반가우면 꼬리부터 나가", () => "이번 달도 살랑살랑", () => "꼬리로 인사를 많이 했어"] },
  { id: "eyes", name: "눈빛 장인상", lines: [() => "쳐다보기만 해도 다 통했지", () => "이 눈빛을 누가 이겨", () => "말은 못 해도 눈으로 다 말했어", () => "한 번 쳐다보면 끝이야"] },
  { id: "charm", name: "애교 만점상", lines: [() => "배 보여 주기는 내 특기야", () => "애교는 아끼지 않았어", () => "기대고, 비비고, 또 기댔어", () => "쓰다듬어 달라고 열심히 말했어"] },
  { id: "sleepy", name: "잠꾸러기상", lines: [() => "자는 모습도 봐 줘서 고마워", () => "꿈에서도 산책했어", () => "낮잠은 진지하게 자는 편이야", () => "눕는 자리마다 침대가 됐어"] },
  { id: "guard", name: "집 지킴이상", lines: [() => "집은 내가 잘 지키고 있었어", () => "초인종 소리는 내가 먼저 들어", () => "현관은 내 담당이야", () => "오늘도 집에 별일 없었어"] },
  { id: "welcome", name: "현관 마중상", lines: [() => "문 열리면 제일 먼저 달려갔어", () => "기다리는 건 내가 제일 잘해", () => "발소리만 들어도 알아", () => "돌아오면 그게 제일 좋아"] },
  { id: "window", name: "창밖 구경상", lines: [() => "창밖엔 볼 게 참 많아", () => "새 한 마리를 오래 지켜봤어", () => "창가는 내 영화관이야", () => "지나가는 사람은 다 봤어"] },
  { id: "toy", name: "장난감 사랑상", lines: [() => "제일 아끼는 장난감은 안 빌려줘", () => "삑삑 소리는 질리지 않아", () => "장난감을 여기저기 숨겨 놨어", () => "던져 주면 또 가져올게"] },
  { id: "yawn", name: "하품 대장상", lines: [() => "하품도 크게 하는 편이야", () => "기지개는 매일 빼먹지 않았어", () => "아침마다 쭉 늘어났어", () => "하품하는 얼굴도 귀엽대"] },
  { id: "shadow", name: "껌딱지상", lines: [() => "어딜 가든 따라다녔어", () => "혼자 화장실 가는 건 안 돼", () => "옆자리는 늘 내 거야", () => "붙어 있는 게 제일 좋아"] },
  { id: "ears", name: "귀 쫑긋상", lines: [() => "작은 소리도 놓치지 않았어", () => "내 이름은 멀리서도 들려", () => "봉지 소리는 특히 잘 들려", () => "귀가 먼저 알아채"] },
];

const KEY = "dogcare-month-award-v1"; // { [dogId]: { "2026-11": { id, line } } } — 한 번 받은 상은 그 달에 고정
const hash = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

// 상 고르기(순수 함수). recent = 최근에 받은 상 id들(새것부터) — 연달아 같은 상이 안 나오게
export function chooseAward(f, recent = [], seed = "") {
  const h = hash(`${seed}|${f.m}`);
  const special = AWARDS.slice(0, 4).find((a) => a.when(f)); // 생일·기념일·백일·첫 달은 그 달에만 있는 일 — 먼저
  if (special) return special;
  const avoid = recent.slice(0, 3);
  const earned = AWARDS.slice(4).filter((a) => a.when(f) && !avoid.includes(a.id));
  if (earned.length) return earned[0];
  const seasonal = SEASONAL[f.m];
  const fun = FUN.filter((a) => !avoid.includes(a.id));
  const pool = [...(seasonal && !avoid.includes(seasonal.id) ? [seasonal, seasonal] : []), ...fun]; // 계절 상이 조금 더 자주
  return pool[h % pool.length] || FUN[0];
}

export const lineOf = (award, f, seed = "") => award.lines[hash(`${seed}|${award.id}|${f.m}`) % award.lines.length](f);

// 그 달의 상. 끝난 달은 저장해 두고 같은 상(keep), 이번 달은 그때그때 고른다
export function awardFor(dogId, month, f, { keep = true } = {}) {
  const all = readJSON(KEY, {});
  const mine = all[dogId] || {};
  const every = [...AWARDS, ...Object.values(SEASONAL), ...FUN];
  let award = every.find((a) => a.id === mine[month]?.id);
  if (!award) {
    const recent = Object.keys(mine).filter((k) => k < month).sort().reverse().map((k) => mine[k].id);
    award = chooseAward(f, recent, dogId);
    if (keep) { all[dogId] = { ...mine, [month]: { id: award.id } }; writeJSON(KEY, all); } // 아직 안 끝난 달은 적어 두지 않는다(산책이 늘면 상이 바뀔 수 있게)
  }
  return { id: award.id, name: award.name, line: lineOf(award, f, dogId) };
}
