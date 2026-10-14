import { readJSON, writeJSON } from "./storage";

const KEY = "dogcare-rule-overrides-v1";

// 구조: { [dogId]: { [ruleId]: true } } — 사용자가 "숨기기"한 케어 추천 항목.
// 앱이 알려주는 일정/목표를 사용자가 끄고 켤 수 있게 해주는 최소 기능.
function getAll() {
  return readJSON(KEY, {});
}

export function getHiddenRules(dogId) {
  return getAll()[dogId] || {};
}

export function setRuleHidden(dogId, ruleId, hidden) {
  const all = getAll();
  if (!all[dogId]) all[dogId] = {};
  if (hidden) {
    all[dogId][ruleId] = true;
  } else {
    delete all[dogId][ruleId];
  }
  writeJSON(KEY, all);
}
