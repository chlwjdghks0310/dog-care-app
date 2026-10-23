// 처음 쓰는 사람 안내 "첫 걸음 3가지"(비서 첫 화면 말풍선). 실제 기록으로 저절로 체크된다 — 밥 시간·몸무게·말로 기록해 보기.
// 3개를 다 하거나 "다음에 할게"를 누르면 원래 오늘 요약으로. 강아지마다 따로, 이 기기에만 저장.
import { readJSON, writeJSON } from "./storage";
import { getFeedingSettings } from "./feedingSettings";
import { getWeightRecords } from "./weightLog";

const KEY = "dogcare-firststeps-v1"; // { [dogId]: { dismissed?: true, chat?: true } }

export function getFirstSteps(dogId) {
  const saved = readJSON(KEY, {})[dogId] || {};
  const steps = {
    meal: (getFeedingSettings(dogId).times || []).length > 0,
    weight: getWeightRecords(dogId).length > 0,
    chat: Boolean(saved.chat),
  };
  return { steps, show: !saved.dismissed && !(steps.meal && steps.weight && steps.chat) };
}

export function markFirstSteps(dogId, patch) {
  const all = readJSON(KEY, {});
  writeJSON(KEY, { ...all, [dogId]: { ...all[dogId], ...patch } });
}
