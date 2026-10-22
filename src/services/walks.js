// 산책 기록(지도 코스). { [dogId]: Walk[] } — 가족 공유 대상(sync/engine.js SYNCED_KEYS).
// Walk = { id, startedAt("YYYY-MM-DDTHH:MM" 기기 시각), durationSec(움직인 시간, 일시정지 제외), distanceM,
//          route: [[{lat,lng}, ...], ...](일시정지마다 끊긴 구간), marks: [{ type: "poop"|"pee", lat, lng, at }], memo }
// 저장하면 건강 수치 "산책(분)"과 배변·배뇨 기록도 함께 남긴다(프로필에서 한눈에 보이게).
import { readJSON, writeJSON } from "./storage";
import { saveRecord, deleteRecord, newRecordId } from "./records";

const KEY = "dogcare-walks-v1";

export function getWalks(dogId) {
  return (readJSON(KEY, {})[dogId] || []).slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function saveWalk(dogId, walk, { stool, urine } = {}) {
  const all = readJSON(KEY, {});
  all[dogId] = [...(all[dogId] || []).filter((w) => w.id !== walk.id), walk];
  writeJSON(KEY, all);
  const minutes = Math.max(1, Math.round(walk.durationSec / 60));
  saveRecord(dogId, { id: `${walk.id}-vital`, type: "vital", at: walk.startedAt, data: { metric: "walk", value: minutes }, memo: `산책 ${(walk.distanceM / 1000).toFixed(2)}km (지도 기록)`, photos: [] });
  if (stool || urine) saveRecord(dogId, { id: `${walk.id}-potty`, type: "potty", at: walk.startedAt, data: { stool: stool || "", urine: urine || "" }, memo: "산책 중", photos: [] });
}

export function deleteWalk(dogId, id) {
  const all = readJSON(KEY, {});
  all[dogId] = (all[dogId] || []).filter((w) => w.id !== id);
  writeJSON(KEY, all);
  deleteRecord(dogId, `${id}-vital`); // 함께 남긴 건강 수치·배변 기록도
  deleteRecord(dogId, `${id}-potty`);
}

export const newWalkId = () => newRecordId().replace("rec-", "walk-");
