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
