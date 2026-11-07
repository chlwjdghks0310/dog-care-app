// 처음 쓰는 사람 안내 "첫 걸음 3가지"(오늘 탭 말풍선, 첫 하루 체크 뒤). 실제 기록으로 저절로 체크된다 — 몸무게·평소 모습·병원용 기록 미리 보기
// (방향 A 병원 수첩에 맞춤, 11/7 — 예전: 밥 시간·몸무게·말로 기록)
// 3개를 다 하거나 "다음에 할게"를 누르면 원래 오늘 요약으로. 강아지마다 따로, 이 기기에만 저장.
import { readJSON, writeJSON } from "./storage";
import { getDog } from "./dogRepository";
import { getWeightRecords } from "./weightLog";

const KEY = "dogcare-firststeps-v1"; // { [dogId]: { dismissed?: true, chat?: true, vet?: true } }

export function getFirstSteps(dogId) {
  const saved = readJSON(KEY, {})[dogId] || {};
  const steps = {
    weight: getWeightRecords(dogId).length > 0,
    usual: Boolean(getDog(dogId)?.usual),
    vet: Boolean(saved.vet),
  };
  return { steps, show: !saved.dismissed && !(steps.weight && steps.usual && steps.vet) };
}

export function markFirstSteps(dogId, patch) {
  const all = readJSON(KEY, {});
  writeJSON(KEY, { ...all, [dogId]: { ...all[dogId], ...patch } });
}
