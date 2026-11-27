import { readJSON, writeJSON } from "./storage";
import { getDay } from "./dailyCheck";
import { todayKey, toDateKey, addDays } from "../utils/date";

// 하루 체크 스탬프 상품(사용자 결정 11/19): 7일 연속 체크 = 배지 1개 · 배지 5개 = 캐릭터 부가 동작 1편 · 배지 10개 = 정성 캐릭터 할인.
// 배지는 이어진 동안 실제로 체크한 7번마다 하나(14번이면 2개). 계산은 아래 streakOf 한 곳.
// 받은 보상은 이 폰에만 적어 둔다(dogcare-stamp-rewards-v1). 결제가 붙기 전까지 할인은 "할인권 있음" 표시만.
const KEY = "dogcare-stamp-rewards-v1"; // { [dogId]: { extraClaimed: n } }
export const BADGE_DAYS = 7;
export const EXTRA_PER = 5;
export const DISCOUNT_AT = 10;

const checked = (dogId, d) => { const v = getDay(dogId, d); return Boolean(v && v.status !== "unknown"); };

// 연속 기록 계산은 여기 한 곳(11/27): 케어 탭·배지·한 달 리포트·자랑 카드가 모두 이 결과를 읽는다. 체크한 날짜만 저장돼 있어서 규칙을 바꾸면 지난 기록도 저절로 다시 세어진다.
// 쉬는 날: 하루 빠져도 다음 날 체크하면 이어진다(최근 7일 안에 한 번만, 이틀 연속 빠지면 다시 1일째). 쉬는 날은 끊기는 것만 막고 숫자는 올리지 않는다 —
//   배지는 실제로 체크한 7번마다 하나라서 보상이 쉬워지지 않는다. 쉬는 날 표시는 지나고 나서만(어제 빠졌고 오늘 아직이면 pending — "오늘 체크하면 이어져요").
// 근거 ../자료용/자료/2026-11-27-듀오링고-분석.md(주말 부적: 1주 뒤 복귀 +4%) · 2026-11-27-습관장치-도입방식-검증.md
export const REST_EVERY = 7;
export function streakOf(dogId, today = todayKey()) {
  const days = Object.keys(readJSON("dogcare-daily-check-v1", {})[dogId] || {}).filter((k) => k <= today && checked(dogId, k)).sort();
  const out = { streak: 0, best: 0, badges: [], rest: [], toNext: BADGE_DAYS, pending: false, checkedToday: false };
  if (!days.length) return out;
  const set = new Set(days);
  out.checkedToday = set.has(today);
  let run = 0, lastRest = -REST_EVERY, i = 0;
  // 가장 오래된 체크일부터 오늘까지 하루씩 훑는다(기록은 많아야 수백 일)
  for (let d = new Date(`${days[0]}T00:00:00`); toDateKey(d) <= today; d = addDays(d, 1), i++) {
    const k = toDateKey(d);
    if (set.has(k)) { run += 1; if (run % BADGE_DAYS === 0) out.badges.push(k); if (run > out.best) out.best = run; continue; }
    if (k === today) break; // 오늘은 아직 안 한 것뿐
    const next = toDateKey(addDays(d, 1));
    const canRest = run > 0 && i - lastRest >= REST_EVERY;
    if (canRest && set.has(next)) { out.rest.push(k); lastRest = i; }
    else if (canRest && next === today) out.pending = true; // 어제 빠졌고 오늘 체크하면 쉬는 날로 넘어간다
    else run = 0;
  }
  out.streak = run;
  const rem = run % BADGE_DAYS;
  out.toNext = run > 0 && rem === 0 ? BADGE_DAYS : BADGE_DAYS - rem;
  return out;
}
// 하루 체크 말풍선 아래 작은 한 줄(강아지 말투): 어제 빠졌으면 오늘 이어질 수 있다고, 오래 쉬다 왔으면 반갑다고. 그 밖엔 빈 문자열
export function restHint(dogId, today = todayKey()) {
  const r = streakOf(dogId, today);
  if (r.checkedToday) return "";
  if (r.pending) return "어제는 못 만났네. 오늘 체크하면 발도장이 이어져";
  if (r.streak === 0 && r.best >= 3) return `다시 만나서 반가워! 가장 길게 이어진 건 ${r.best}일이야`;
  return "";
}
// 예전 이름(배지 목록·이어진 날수·다음 배지까지)
export const badgesOf = (dogId, today = todayKey()) => { const r = streakOf(dogId, today); return { badges: r.badges, streak: r.streak, toNext: r.toNext }; };

// 오늘 체크로 배지를 막 땄나(도장 순간에 축하 줄)
export function badgeEarnedToday(dogId, today = todayKey()) {
  return badgesOf(dogId, today).badges.includes(today);
}

export function rewardsOf(dogId, today = todayKey()) {
  const { badges, streak, toNext, best, rest, pending, checkedToday } = streakOf(dogId, today);
  const n = badges.length;
  const claimed = readJSON(KEY, {})[dogId]?.extraClaimed || 0;
  const extrasEarned = Math.floor(n / EXTRA_PER);
  return { badges: n, streak, toNext, best, rest, pending, checkedToday, extrasEarned, extrasLeft: Math.max(0, extrasEarned - claimed), discount: n >= DISCOUNT_AT, toExtra: EXTRA_PER - (n % EXTRA_PER), toDiscount: Math.max(0, DISCOUNT_AT - n) };
}

export function claimExtra(dogId) {
  const all = readJSON(KEY, {});
  const cur = all[dogId]?.extraClaimed || 0;
  writeJSON(KEY, { ...all, [dogId]: { ...(all[dogId] || {}), extraClaimed: cur + 1 } });
}
