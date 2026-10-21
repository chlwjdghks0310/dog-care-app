// 기록 서버 저장(동기화) 엔진. 화면 코드는 그대로 localStorage에 읽고 쓰고, 여기서 서버와 맞춘다.
// 순서: ① 서버에서 바뀐 항목 받기(pull) → ② 이 폰에서 바뀐 항목 올리기(push).
// 충돌: 같은 항목을 이 폰에서도 고쳤으면 이 폰 것을 남기고(다음 push로 서버도 바뀜), 아니면 서버 것을 받는다.
// remote(서버)는 바꿔 끼울 수 있게 함수 묶음으로 받는다 — 실제는 Supabase(supabaseRemote.js), 테스트는 가짜.
//   remote.myPets() → [{ id, role }]          내가 구성원인 강아지와 역할(owner/family)
//   remote.createPets(ids)                     처음 올리는 강아지 등록(나는 보호자)
//   remote.pull(petIds, sinceIso) → rows       { pet_id, key, item, shape, value, deleted, updated_at }
//   remote.push(rows)                          같은 모양으로 올리기(서버가 updated_at을 찍음)
import { readJSON, writeJSON } from "../storage";
import { flatten, unflatten } from "./items";

// 강아지별로 저장되는 키({ [dogId]: 값 }) 중 서버에 올리는 것. 테마·채팅 모드·AI 대화 기억·알림 기록 같은 개인 설정은 폰에만.
export const SYNCED_KEYS = [
  "dogcare-weight-log-v1",
  "dogcare-weight-cadence-v1",
  "dogcare-vet-note-v1",
  "dogcare-schedules-v1",
  "dogcare-rule-overrides-v1",
  "dogcare-records-v1",
  "dogcare-meds-v1",
  "dogcare-med-log-v1",
  "dogcare-feeding-settings-v1",
  "dogcare-expenses-v1",
  "dogcare-custom-schedules-v1",
  "dogcare-calendar-events-v1",
  "dogcare-allowance-v1",
];
const DOGS_KEY = "dogcare-dogs-v1";
const CATEGORIES_KEY = "dogcare-expense-categories-v1";
const PROFILE = "dog"; // 강아지 프로필(이름·견종 등) 자체
const CATEGORIES = "expense-categories"; // 지출 카테고리는 앱 전체 공용이라 강아지마다 사본을 올리고 받을 땐 합친다
const STATE_KEY = "dogcare-sync-v1";
// ponytail: 서버 시각 기준 커서 + 겹쳐 받기 10초 — 거의 동시에 저장된 행을 놓치지 않으려고. 받는 건 몇 번 받아도 같은 결과라 안전.
const OVERLAP_MS = 10_000;

// 짧은 해시(cyrb53) — 서버와 맞춘 상태를 값 전체 대신 지문만 기억해서 폰 저장 공간을 아낀다
function fingerprint(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const fp = (value) => fingerprint(JSON.stringify(value));

function loadState() {
  const s = readJSON(STATE_KEY, null);
  // pets: 지난번 서버에서 내가 구성원이던 강아지(새로 들어온 강아지를 알아내려고), family: 그중 가족으로 들어온 강아지(빠지면 폰 사본을 지울 대상)
  const empty = { cursor: null, base: {}, pets: null, family: [] };
  return s && typeof s === "object" ? { ...empty, ...s, base: s.base || {}, family: s.family || [] } : empty;
}

// ── 이 폰의 값 읽기/쓰기(키 종류별) ──
function readLocal(petId, key) {
  if (key === PROFILE) return readJSON(DOGS_KEY, []).find((d) => d.id === petId);
  if (key === CATEGORIES) return readJSON(CATEGORIES_KEY, undefined);
  return readJSON(key, {})[petId];
}

function writeLocal(petId, key, value) {
  if (key === PROFILE) {
    const dogs = readJSON(DOGS_KEY, []);
    const rest = dogs.filter((d) => d.id !== petId);
    const at = dogs.findIndex((d) => d.id === petId);
    if (value === undefined) return writeJSON(DOGS_KEY, rest);
    return writeJSON(DOGS_KEY, at < 0 ? [...dogs, value] : dogs.map((d) => (d.id === petId ? value : d)));
  }
  if (key === CATEGORIES) {
    // 합치기: 받은 카테고리를 id 기준으로 덮어쓰고, 이 폰에만 있는 건 남긴다
    const mine = readJSON(CATEGORIES_KEY, undefined);
    if (!Array.isArray(value)) return true;
    if (!Array.isArray(mine)) return writeJSON(CATEGORIES_KEY, value);
    const byId = new Map(mine.map((c) => [c.id, c]));
    for (const c of value) byId.set(c.id, c);
    return writeJSON(CATEGORIES_KEY, [...byId.values()]);
  }
  const all = readJSON(key, {});
  if (value === undefined) delete all[petId];
  else all[petId] = value;
  return writeJSON(key, all);
}

const keysFor = () => [PROFILE, CATEGORIES, ...SYNCED_KEYS];
const localPetIds = () => readJSON(DOGS_KEY, []).map((d) => d.id);

// ① 받기: 이 폰에서 안 고친 항목만 서버 값으로 바꾼다. 실제로 폰 기록이 바뀐 묶음 수를 돌려준다
function applyRows(rows, state) {
  let changedGroups = 0;
  const groups = new Map();
  for (const r of rows) {
    const g = `${r.pet_id}\n${r.key}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  for (const list of groups.values()) {
    const { pet_id: petId, key } = list[0];
    if (!keysFor().includes(key)) continue;
    const before = readLocal(petId, key);
    const { shape: localShape, items } = flatten(before);
    const order = Object.keys(items);
    const base = ((state.base[petId] ||= {})[key] ||= {});
    let shape = localShape;
    let changed = false;
    for (const r of list) {
      const localFp = r.item in items ? fp(items[r.item]) : undefined;
      if (localFp !== base[r.item]) continue; // 이 폰에서 고친 항목 → 이 폰 것 우선
      if (r.deleted) {
        if (r.item in items) changed = true;
        delete items[r.item];
        delete base[r.item];
      } else {
        const f = fp(r.value);
        if (f !== localFp) changed = true; // 이미 같은 값이면 다시 쓰지 않는다(쓰면 또 맞추기가 돌아 끝없이 반복)
        items[r.item] = r.value;
        base[r.item] = f;
      }
      if (r.shape && r.shape !== "none") shape = r.shape;
    }
    if (!changed) continue;
    changedGroups++;
    // 항목이 하나도 안 남으면: 목록은 빈 목록, 객체는 빈 객체, 그 밖(프로필 등)은 값 자체를 지운다
    const empty = shape === "list" ? [] : shape === "object" ? {} : undefined;
    writeLocal(petId, key, Object.keys(items).length ? unflatten(shape === "none" ? "single" : shape, items, order) : empty);
  }
  return changedGroups;
}

// 더 이상 구성원이 아닌 강아지(가족에서 내보내짐·나감): 서버에는 손대지 않고 이 폰의 사본만 지운다
function dropLocalPet(petId, state) {
  for (const key of [PROFILE, ...SYNCED_KEYS]) if (readLocal(petId, key) !== undefined) writeLocal(petId, key, undefined);
  delete state.base[petId];
}

// ② 올리기: 지난번 맞춘 상태(지문)와 지금을 비교해 바뀐 항목만. 지운 항목은 deleted=true(무덤 표시)로 올린다.
function collectChanges(petIds, state) {
  const rows = [];
  const commits = [];
  for (const petId of petIds) {
    for (const key of keysFor()) {
      const { shape, items } = flatten(readLocal(petId, key));
      const base = state.base[petId]?.[key] || {};
      for (const [item, value] of Object.entries(items)) {
        const f = fp(value);
        if (f === base[item]) continue;
        rows.push({ pet_id: petId, key, item, shape, value, deleted: false });
        commits.push({ petId, key, item, f });
      }
      for (const item of Object.keys(base)) {
        if (item in items) continue;
        rows.push({ pet_id: petId, key, item, shape, value: null, deleted: true });
        commits.push({ petId, key, item, f: undefined });
      }
    }
  }
  return { rows, commits };
}

// 한 번 맞추기. 실패하면 던지고(다음에 다시), 성공한 만큼만 기억한다.
export async function syncOnce(remote) {
  const state = loadState();
  let pets = await remote.myPets();
  let remoteIds = pets.map((p) => p.id);
  // 가족으로 들어왔다가 빠진 강아지만 폰에서 지운다(보호자 강아지는 서버 목록이 비어 보여도 절대 안 지움)
  const removed = state.family.filter((id) => !remoteIds.includes(id));
  for (const id of removed) dropLocalPet(id, state);
  const mine = localPetIds();
  const missing = mine.filter((id) => !remoteIds.includes(id));
  if (missing.length) {
    await remote.createPets(missing);
    pets = await remote.myPets(); // 같은 id가 다른 계정에 이미 있으면 등록되지 않는다 → 그 강아지는 올리지 않는다
    remoteIds = pets.map((p) => p.id);
  }
  const blocked = mine.filter((id) => !remoteIds.includes(id));
  const petIds = remoteIds;
  const family = pets.filter((p) => p.role === "family").map((p) => p.id);

  // 처음 보는 강아지(가족 초대로 막 들어옴)는 커서와 상관없이 기록 전체를 받는다. 목록을 모르면(예전 버전에서 넘어옴) 한 번 전부 받는다
  const fresh = state.pets ? petIds.filter((id) => !state.pets.includes(id)) : petIds;
  const known = petIds.filter((id) => !fresh.includes(id));
  const since = state.cursor ? new Date(new Date(state.cursor).getTime() - OVERLAP_MS).toISOString() : null;
  const rows = [...(fresh.length ? await remote.pull(fresh, null) : []), ...(known.length ? await remote.pull(known, since) : [])];
  const changed = applyRows(rows, state) + removed.length;
  // 커서는 서버가 찍은 시각만 쓴다(폰 시계가 틀려도 놓치지 않게)
  const cursor = rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), state.cursor || "") || null;
  writeJSON(STATE_KEY, { cursor, base: state.base, pets: petIds, family });

  const { rows: out, commits } = collectChanges(petIds, state);
  if (out.length) {
    await remote.push(out);
    for (const c of commits) {
      const base = ((state.base[c.petId] ||= {})[c.key] ||= {});
      if (c.f === undefined) delete base[c.item];
      else base[c.item] = c.f;
    }
    writeJSON(STATE_KEY, { cursor, base: state.base, pets: petIds, family });
  }
  return { pulled: rows.length, changed, pushed: out.length, blocked };
}

// 로그아웃하면 서버와 맞춘 기억을 지운다(폰 기록은 그대로 남김)
export function resetSyncState() {
  writeJSON(STATE_KEY, { cursor: null, base: {}, pets: null, family: [] });
}
