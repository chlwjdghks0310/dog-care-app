import { readJSON, writeJSON } from "./storage";

const KEY = "dogcare-feeding-settings-v1";

// 구조: { [dogId]: { times: ["08:00", ...], kcalPer100g?: number, stoolCondition?: 'normal'|'loose'|'constipated' } }
function getAll() {
  return readJSON(KEY, {});
}

export function getFeedingSettings(dogId) {
  return getAll()[dogId] || { times: [], kcalPer100g: null, stoolCondition: "normal" };
}

export function saveFeedingSettings(dogId, settings) {
  const all = getAll();
  all[dogId] = { ...getFeedingSettings(dogId), ...settings };
  writeJSON(KEY, all);
  return all[dogId];
}
