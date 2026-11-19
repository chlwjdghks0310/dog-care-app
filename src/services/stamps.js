import { readJSON, writeJSON } from "./storage";
import { getDay } from "./dailyCheck";
import { todayKey, toDateKey, addDays } from "../utils/date";

// 하루 체크 스탬프 상품(사용자 결정 11/19): 7일 연속 체크 = 배지 1개 · 배지 5개 = 캐릭터 부가 동작 1편 · 배지 10개 = 정성 캐릭터 할인.
// 배지는 "끊기지 않고 이어진 7일"마다 하나(14일 연속이면 2개). 빠진 날은 벌점 없이 그냥 다시 센다.
// 받은 보상은 이 폰에만 적어 둔다(dogcare-stamp-rewards-v1). 결제가 붙기 전까지 할인은 "할인권 있음" 표시만.
const KEY = "dogcare-stamp-rewards-v1"; // { [dogId]: { extraClaimed: n } }
export const BADGE_DAYS = 7;
export const EXTRA_PER = 5;
export const DISCOUNT_AT = 10;

const checked = (dogId, d) => { const v = getDay(dogId, d); return Boolean(v && v.status !== "unknown"); };

// 오늘까지의 체크 기록으로 배지 목록(딴 날짜)·지금 이어진 날수·다음 배지까지 남은 날
export function badgesOf(dogId, today = todayKey()) {
  const days = Object.keys(readJSON("dogcare-daily-check-v1", {})[dogId] || {}).sort();
  const first = days[0];
  if (!first) return { badges: [], streak: 0, toNext: BADGE_DAYS };
  const earned = [];
  let run = 0;
  // 가장 오래된 체크일부터 오늘까지 하루씩 훑는다(기록은 많아야 수백 일)
  for (let d = new Date(`${first}T00:00:00`); toDateKey(d) <= today; d = addDays(d, 1)) {
    const k = toDateKey(d);
    if (checked(dogId, k)) { run += 1; if (run % BADGE_DAYS === 0) earned.push(k); }
    else run = 0;
  }
  // 오늘 아직 안 찍었으면 어제까지 이어진 날수(오늘 찍으면 이어진다)
  let streak = run;
  if (!checked(dogId, today)) { streak = 0; for (let d = addDays(new Date(`${today}T00:00:00`), -1); checked(dogId, toDateKey(d)); d = addDays(d, -1)) streak += 1; }
  const rem = streak % BADGE_DAYS;
  const toNext = streak > 0 && rem === 0 && checked(dogId, today) ? BADGE_DAYS : BADGE_DAYS - rem;
  return { badges: earned, streak, toNext };
}

// 오늘 체크로 배지를 막 땄나(도장 순간에 축하 줄)
export function badgeEarnedToday(dogId, today = todayKey()) {
  return badgesOf(dogId, today).badges.includes(today);
}

export function rewardsOf(dogId, today = todayKey()) {
  const { badges, streak, toNext } = badgesOf(dogId, today);
  const n = badges.length;
  const claimed = readJSON(KEY, {})[dogId]?.extraClaimed || 0;
  const extrasEarned = Math.floor(n / EXTRA_PER);
  return { badges: n, streak, toNext, extrasEarned, extrasLeft: Math.max(0, extrasEarned - claimed), discount: n >= DISCOUNT_AT, toExtra: EXTRA_PER - (n % EXTRA_PER), toDiscount: Math.max(0, DISCOUNT_AT - n) };
}

export function claimExtra(dogId) {
  const all = readJSON(KEY, {});
  const cur = all[dogId]?.extraClaimed || 0;
  writeJSON(KEY, { ...all, [dogId]: { ...(all[dogId] || {}), extraClaimed: cur + 1 } });
}
