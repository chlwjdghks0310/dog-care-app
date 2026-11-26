// 여름이가 챙겨 주는 하루 체크(11/26 사용자 결정): 같은 하루 체크인데 "묻는 말"과 "마친 뒤 한마디"가 어제·오늘 기록을 안다.
//   ① 어제 다른 점이 있었으면 그걸 기억하고 묻는다          askFor → kind "yesterday"
//   ② 오늘 이미 적은 기록이 있으면 그걸로 채워 두고 확인만 받는다 askFor → kind "records" (①과 겹치면 오늘 기록이 먼저 — 오늘 적은 사실이 더 정확하다)
//   ③ 체크를 마치면 기록을 보고 한 문장으로 말한다           remarkFor
// 전부 규칙으로 고른다(AI를 부르지 않는다 — 비용 0, 엉뚱한 말 없음). 병 이름은 말하지 않고, 병원 안내 기준은 하루 체크(dailyCheck.js ITEMS)의 것을 그대로 쓴다.
import { ITEMS, getDay } from "./dailyCheck";
import { readJSON, writeJSON } from "./storage";
import { addDays, toDateKey } from "../utils/date";

// 선택지 → 지난 일로 말하는 줄기(뒤에 "잖아"·"네"·"구나"·"고"를 붙인다). 줄기가 없는 선택지(산책 못 감·짧게만)는 묻지 않는다.
const STEM = {
  meal: { "조금 남김": "밥을 조금 남겼", "반 이상 남김": "밥을 반 넘게 남겼", "안 먹음": "밥을 안 먹었", "많이 먹음": "밥을 많이 먹었" },
  stool: { "무름": "변이 물렀", "설사": "설사를 했", "딱딱함·안 나옴": "변이 딱딱했", "피·검은 변": "변에 피가 보였", "이상한 게 섞임": "변에 이상한 게 섞였" },
  vomit: { "토함": "토했", "여러 번 토함": "여러 번 토했", "기침·재채기": "기침을 했", "숨이 가쁨": "숨이 가빴" },
  urine: { "자주 조금씩": "쉬를 자주 했", "힘줘도 안 나옴": "쉬가 잘 안 나왔", "피·진한 색": "쉬 색이 이상했", "실수 늘어남": "쉬 실수가 늘었" },
  energy: { "덜 놂": "덜 놀았", "많이 잠": "잠을 많이 잤", "반응이 느림": "기운이 없었", "떨림·비틀거림": "몸을 떨었" },
  water: { "많이 마심": "물을 많이 마셨", "적게 마심": "물을 적게 마셨", "물도 못 마심": "물도 못 마셨" },
  walk: { "절뚝거림": "다리를 절었" },
  etc: { "긁음·핥음": "많이 긁었", "눈·귀 이상": "눈이나 귀가 불편했", "피부 이상": "피부가 안 좋았", "토함": "토했", "기침·재채기": "기침을 했" },
};
const stemOf = (id, label) => STEM[id]?.[label] || null;
const itemOf = (id) => ITEMS.find((i) => i.id === id);
const hasBatchim = (word) => { const c = word.charCodeAt(word.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const josa = (word, withB, without) => word + (hasBatchim(word) ? withB : without);
const yesterdayOf = (today) => toDateKey(addDays(new Date(`${today}T00:00:00`), -1));
const askable = (picks = {}) => Object.fromEntries(Object.entries(picks).filter(([id, label]) => stemOf(id, label)));

// 오늘 보호자가 직접 적은 기록 → 하루 체크 선택지. 항목마다 하나(먼저 나온 것), 하루 체크가 만든 기록은 뺀다.
// 평소와 같은 기록(식욕 평소·변 정상·산책 40분)은 "다른 점"이 아니라서 가져오지 않는다.
const FROM_REC = {
  meal: (d) => [
    d.appetite === "평소보다 적음" && ["meal", "조금 남김"], d.appetite === "평소보다 많음" && ["meal", "많이 먹음"],
    d.water === "평소보다 많음" && ["water", "많이 마심"], d.water === "평소보다 적음" && ["water", "적게 마심"],
  ],
  potty: (d) => [
    { "무름": ["stool", "무름"], "설사": ["stool", "설사"], "딱딱함": ["stool", "딱딱함·안 나옴"], "피 섞임": ["stool", "피·검은 변"] }[d.stool],
    { "잦음": ["urine", "자주 조금씩"], "적음": ["urine", "힘줘도 안 나옴"], "색 이상": ["urine", "피·진한 색"], "실수": ["urine", "실수 늘어남"] }[d.urine],
  ],
  symptom: (d) => (d.kinds || []).map((k) => ({
    "구토": ["vomit", d.repeat === "자주" || d.repeat === "계속" ? "여러 번 토함" : "토함"], "설사": ["stool", "설사"], "기침": ["vomit", "기침·재채기"], "숨이 가쁨": ["vomit", "숨이 가쁨"],
    "기운 없음": ["energy", "반응이 느림"], "떨림": ["energy", "떨림·비틀거림"], "절뚝거림": ["walk", "절뚝거림"], "가려움·긁음": ["etc", "긁음·핥음"],
    "눈 이상": ["etc", "눈·귀 이상"], "귀 이상": ["etc", "눈·귀 이상"], "피부 이상": ["etc", "피부 이상"], "식욕 없음": ["meal", "안 먹음"], "물 많이 마심": ["water", "많이 마심"],
  }[k])),
  condition: (d) => [d.check?.energy === "조금 다름" && ["energy", "덜 놂"], d.check?.energy === "많이 다름" && ["energy", "반응이 느림"]],
};
export function picksFromRecords(records, date) {
  const picks = {};
  const from = []; // 화면에 보여 줄 근거 [{ id, itemId, label, time }]
  const today = records.filter((r) => r.at?.slice(0, 10) === date && !String(r.memo || "").startsWith("하루 체크:")).sort((a, b) => a.at.localeCompare(b.at));
  for (const r of today) {
    for (const hit of (FROM_REC[r.type]?.(r.data || {}) || []).filter(Boolean)) {
      const [id, label] = hit;
      if (picks[id]) continue;
      picks[id] = label;
      from.push({ id: r.id, itemId: id, label, time: r.at.slice(11, 16) });
    }
  }
  return { picks, from };
}

// 묻는 말. usual·again·more는 버튼 세 개(없으면 그 버튼은 안 보인다).
//   again.picks를 그대로 저장하면 끝, more.initial은 [다른 점 고르기] 창에 미리 골라 둘 것, noRec는 "이미 기록이 있으니 새로 만들지 말 항목"
export function askFor(dogId, today, records = []) {
  const plain = { kind: "plain", text: "오늘 나 어땠어?", usual: "평소와 같아요", more: { label: "다른 게 있었어요", initial: {} } };
  const rec = picksFromRecords(records, today);
  const recIds = Object.keys(rec.picks);
  if (recIds.length) {
    const stems = recIds.map((id) => stemOf(id, rec.picks[id]));
    const said = stems.length === 1 ? `${stems[0]}네` : `${stems[0]}고 ${stems[1]}네${stems.length > 2 ? " (그 밖에도 있어)" : ""}`;
    return {
      kind: "records", text: `오늘 적은 걸 보니 ${said}. 이대로 체크해 둘까?`, from: rec.from,
      again: { label: "응, 이대로", picks: rec.picks, noRec: recIds },
      more: { label: "더 있어", initial: rec.picks, noRec: recIds },
    };
  }
  const y = getDay(dogId, yesterdayOf(today));
  const yPicks = y?.status === "diff" ? askable(y.picks) : {};
  const ids = Object.keys(yPicks);
  if (!ids.length) return plain;
  if (ids.length === 1) {
    const [id] = ids;
    const left = id === "meal" && /남김/.test(yPicks[id]);
    return {
      kind: "yesterday", text: `나 어제 ${stemOf(id, yPicks[id])}잖아. 오늘은 어땠어?`,
      usual: "평소로 돌아왔어", again: { label: left ? "또 남겼어" : "오늘도 그랬어", picks: yPicks }, more: { label: "다른 것도 있었어", initial: yPicks },
    };
  }
  // 두 가지면 이름을 부르고, 셋 이상이거나 "그 밖에"가 끼면 "여러 가지가"(이름을 늘어놓으면 문장이 어색해진다)
  const names = ids.map((id) => itemOf(id).label);
  const list = ids.length === 2 && !ids.includes("etc") ? `${josa(names[0], "이랑", "랑")} ${josa(names[1], "이", "가")}` : "여러 가지가";
  return {
    kind: "yesterday", text: `어제 ${list} 달랐잖아. 오늘은 어땠어?`,
    usual: "평소로 돌아왔어", again: { label: "아직 그래", picks: yPicks }, more: { label: "다른 것도 있었어", initial: yPicks },
  };
}

// ---- 마친 뒤 한마디 ----
const DAYS = ["", "하루", "이틀", "사흘", "나흘", "닷새", "엿새", "이레"];
const nth = (n) => (DAYS[n] ? `${DAYS[n]}째` : `${n}일째`);
// 월령(시기)마다 두 줄 — 케어 탭 월령별 가이드와 같은 내용을 여름이 말로. go: "guide"면 누르면 가이드로
const STAGE_LINES = {
  settle: ["나 아직 새집이 낯설어. 조용히 지켜봐 줘.", "밥은 원래 먹던 걸로 천천히 바꿔 줘."],
  social: ["지금은 새로운 소리를 많이 들어 볼 때래.", "땅은 아직이래. 품에 안고 바깥 구경 시켜 줘."],
  teeth: ["나 요즘 이가 간지러워. 씹을 거 하나 줘.", "빠진 이를 발견해도 놀라지 마. 이갈이 중이야."],
  teen: ["요즘 내가 말을 안 듣지? 그럴 때래. 조금만 봐줘.", "힘이 남아. 산책을 조금만 더 하자."],
  adult: ["몸무게를 한 달에 한 번만 재 줘.", "양치 잊지 마. 이가 평생 가야 해."],
  middle: ["이제 검진 항목을 조금 늘릴 때래.", "계단은 천천히 갈게. 기다려 줘."],
  senior: ["작은 변화도 적어 줘. 병원에서 큰 도움이 돼.", "산책은 짧게 여러 번이 좋아."],
};
const SAID_KEY = "dogcare-check-talk-v1"; // { [dogId]: { today: { date, key, text, go }, last: { [key]: date } } }

// facts: 화면이 모아서 넘겨 준다 — { diffToday: 오늘 고른 것, usualRun: 오늘까지 평소가 이어진 날, runs: [{ item, days }], resolved: 어제 달랐다가 오늘 평소로 돌아온 항목 라벨들,
//   event: { days, title }, medEndsIn: 약이 끝나기까지 남은 날, foodDays: 사료 남은 날, walk: { now, before }(최근 7일·그 앞 7일 산책한 날 수),
//   signalIds: 이상 신호가 뜬 항목 id들, weightDays: 몸무게 잰 지 며칠, stage: { key, name }, stageToday: 오늘 시기가 바뀜, birthdayIn: 생일까지 남은 날, together: 함께한 날, milestone: 기념일인지 }
export function pickRemark(facts, lastSaid = {}, today) {
  const fresh = (key, days = 7) => !lastSaid[key] || lastSaid[key] <= toDateKey(addDays(new Date(`${today}T00:00:00`), -days));
  const f = facts;
  // 1. 오늘 다른 점 — 이어지면 며칠째인지와 병원에 말할 때, 하루뿐이면 받아 적었다는 말만
  if (f.runs?.length) {
    const r = [...f.runs].sort((a, b) => b.days - a.days)[0];
    // 같은 항목의 이상 신호(signals.js)가 아래 줄에 병원 안내를 따로 보여 주면, 여기서는 사실만 말한다(안내가 두 번·서로 다르게 나오지 않게)
    const advise = f.signalIds?.includes(r.item.id) ? "" : " 내일도 그러면 병원에 말해 줘.";
    return { key: `run:${r.item.id}`, text: `${josa(r.item.label, "은", "는")} ${nth(r.days)} 평소랑 달랐네.${advise}`, go: "vet" };
  }
  if (f.diffToday) {
    const stems = Object.entries(f.diffToday).map(([id, label]) => stemOf(id, label)).filter(Boolean);
    return { key: "diff", text: stems.length ? `오늘은 ${stems[0]}구나${stems.length > 1 ? ". 다른 것도 적어 뒀어" : ""}. 내일 다시 물어볼게.` : "오늘 다른 점을 적어 뒀어. 내일 다시 물어볼게." };
  }
  if (f.resolved?.length) return { key: "resolved", text: f.resolved.length === 1 ? `${josa(f.resolved[0], "이", "가")} 다시 평소로 돌아왔네. 다행이다!` : "어제 달랐던 게 다시 평소로 돌아왔네. 다행이다!" };
  // 2. 다가온 일
  if (f.event && f.event.days <= 3) return { key: `event:${f.event.title}:${f.event.days}`, text: f.event.days === 0 ? `오늘 ${f.event.title} 있는 날이야.` : f.event.days === 1 ? `내일 ${f.event.title} 있어. 잊지 마!` : `${f.event.days}일 뒤에 ${f.event.title} 있어.` };
  if (f.medEndsIn != null && f.medEndsIn >= 0 && f.medEndsIn <= 2) return { key: `med:${f.medEndsIn}`, text: f.medEndsIn === 0 ? "약이 오늘로 끝나. 더 받아야 하는지 물어봐 줘." : `약이 ${f.medEndsIn === 1 ? "내일" : "모레"}면 끝나. 더 받아야 하는지 물어봐 줘.` };
  if (f.foodDays != null && f.foodDays <= 5 && fresh("food", 2)) return { key: "food", text: f.foodDays <= 0 ? "내 밥이 다 떨어졌을 때야. 확인해 줘." : `내 밥이 ${f.foodDays}일 치 남았어. 주문해 줄래?` };
  // 3. 기록의 변화(일주일에 한 번까지)
  if (f.walk && f.walk.before >= 4 && f.walk.now * 2 <= f.walk.before && fresh("walk")) return { key: "walk", text: "이번 주는 산책을 덜 했네. 주말에 같이 나가자." };
  if (f.weightDays != null && f.weightDays >= 30 && fresh("weight")) return { key: "weight", text: "나 몸무게 잰 지 한 달 됐어. 한번 재 볼까?" };
  // 4. 월령
  if (f.stageToday && f.stage) return { key: `stage-start:${f.stage.key}`, text: `나 오늘부터 ${f.stage.name}야. 뭐가 달라지는지 봐 줘.`, go: "guide" };
  // 5. 기념일
  if (f.birthdayIn === 0) return { key: "birthday:0", text: "오늘 내 생일이야!" };
  if (f.birthdayIn === 1) return { key: "birthday:1", text: "내일 내 생일이야!" };
  if (f.birthdayIn === 7) return { key: "birthday:7", text: "다음 주에 내 생일이야!" };
  if (f.milestone && f.together) return { key: `together:${f.together}`, text: `우리 같이 산 지 ${f.together}일이야.` };
  // 4'. 월령 한마디(일주일에 한 번, 두 줄을 번갈아)
  const lines = STAGE_LINES[f.stage?.key];
  if (lines && fresh(`stage:${f.stage.key}`)) {
    const i = lastSaid[`stage:${f.stage.key}:n`] === "0" ? 1 : 0;
    return { key: `stage:${f.stage.key}`, text: lines[i], go: "guide", turn: String(i) };
  }
  // 6. 평소가 이어짐
  return { key: "usual", text: f.usualRun >= 2 ? `좋아! 벌써 ${nth(f.usualRun)} 평소 같았어.` : "오늘도 평소 같았구나. 좋아!" };
}

// 오늘 한마디는 하루 동안 그대로(화면을 다시 그려도 바뀌지 않게), 단 오늘 체크를 고치면(sig가 달라지면) 다시 고른다
export function remarkFor(dogId, today, facts) {
  const all = readJSON(SAID_KEY, {});
  const mine = all[dogId] || {};
  const sig = JSON.stringify([facts.diffToday || null, facts.usualRun || 0]);
  if (mine.today?.date === today && mine.today.sig === sig) return mine.today;
  // 시기가 바뀐 걸 처음 본 날(전에 본 시기와 다름)에만 "오늘부터 ○○야" — 처음 쓰는 날엔 말하지 않는다
  const stageKey = facts.stage?.key || null;
  const r = pickRemark({ ...facts, stageToday: Boolean(mine.stage && stageKey && mine.stage !== stageKey) }, mine.last || {}, today);
  const old = toDateKey(addDays(new Date(`${today}T00:00:00`), -30)); // 한 달 넘은 "말한 적"은 지운다(일정 제목이 들어간 키가 쌓이지 않게). 번갈아 말하기 표시(:n)는 남긴다
  const kept = Object.fromEntries(Object.entries(mine.last || {}).filter(([k, v]) => k.endsWith(":n") || v > old));
  const last = { ...kept, [r.key]: today, ...(r.turn != null && { [`${r.key}:n`]: r.turn }) };
  all[dogId] = { today: { date: today, sig, key: r.key, text: r.text, go: r.go }, last, stage: stageKey || mine.stage };
  writeJSON(SAID_KEY, all);
  return all[dogId].today;
}
