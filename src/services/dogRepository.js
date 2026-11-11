import { readJSON, writeJSON } from "./storage";

const DOGS_KEY = "dogcare-dogs-v1";

export function getDogs() {
  return readJSON(DOGS_KEY, []);
}

export function getDog(dogId) {
  return getDogs().find((d) => d.id === dogId) || null;
}

export function saveDog(dog) {
  const dogs = getDogs();
  const idx = dogs.findIndex((d) => d.id === dog.id);
  if (idx === -1) {
    dogs.push(dog);
  } else {
    dogs[idx] = { ...dog, updatedAt: new Date().toISOString() };
  }
  writeJSON(DOGS_KEY, dogs);
  return dog;
}

export function deleteDog(dogId) {
  const dogs = getDogs().filter((d) => d.id !== dogId);
  writeJSON(DOGS_KEY, dogs);
  // 11/11 점검 #5: 프로필만 지우고 기록·체중·약·하루 체크·사진 참조가 남던 것 → 이 강아지로 묶인 칸은 전부 지운다.
  // 모양을 모르는 키도 안전하게: 객체면 dogId 칸만, 배열이면 dogId/petId가 같은 항목만 뺀다(사진 실제 파일은 photoStore가 참조 없는 것을 정리)
  const skip = new Set([DOGS_KEY, "dogcare-active-dog-v1", "dogcare-theme-v1", "dogcare-color-v1", "dogcare-sync-v1", "dogcare-onboarding-v1", "dogcare-notif-prefs-v1", "dogcare-ai-consent-v1"]);
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith("dogcare-") || skip.has(key)) continue;
    const v = readJSON(key, undefined);
    if (Array.isArray(v)) {
      const next = v.filter((x) => !(x && typeof x === "object" && (x.dogId === dogId || x.petId === dogId)));
      if (next.length !== v.length) writeJSON(key, next);
    } else if (v && typeof v === "object" && Object.prototype.hasOwnProperty.call(v, dogId)) {
      const { [dogId]: _, ...rest } = v;
      writeJSON(key, rest);
    }
  }
}

const ACTIVE_DOG_KEY = "dogcare-active-dog-v1";

// 여러 마리를 등록했을 때 "지금 보고 있는 강아지"를 기억해서, 새로고침/재접속해도
// 마지막으로 전환했던 강아지가 그대로 유지되게 한다.
export function getActiveDogId() {
  return readJSON(ACTIVE_DOG_KEY, null);
}

export function setActiveDogId(dogId) {
  writeJSON(ACTIVE_DOG_KEY, dogId);
}
