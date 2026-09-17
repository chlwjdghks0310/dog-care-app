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
