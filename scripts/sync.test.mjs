// 기록 서버 저장(동기화) 확인: npm test — 폰 두 대(엄마·아빠)와 가짜 서버로 흉내 낸다.
import assert from "node:assert/strict";

// 폰마다 저장소를 따로 두고, 지금 쓰는 폰의 것으로 바꿔 끼운다
const phones = { mom: {}, dad: {} };
let current = phones.mom;
globalThis.localStorage = { getItem: (k) => current[k] ?? null, setItem: (k, v) => (current[k] = String(v)), removeItem: (k) => delete current[k] };
const use = (name) => (current = phones[name]);
const get = (k) => JSON.parse(current[k] ?? "null");
const set = (k, v) => (current[k] = JSON.stringify(v));

const { flatten, unflatten } = await import("../src/services/sync/items.js");
const { syncOnce } = await import("../src/services/sync/engine.js");

// ── 쪼개기/합치기 ──
const cal = { "2026-10-20": [{ id: "e1", title: "미용" }, { id: "e2", title: "병원" }], "2026-10-21": [{ id: "e3", title: "접종" }] };
const f = flatten(cal);
assert.equal(f.shape, "object");
assert.equal(Object.keys(f.items).length, 3);
assert.deepEqual(unflatten(f.shape, f.items, Object.keys(f.items)), cal);
const list = [{ id: "a", n: 1 }, { id: "b", n: 2 }];
assert.deepEqual(unflatten("list", flatten(list).items, ["a", "b"]), list);
assert.deepEqual(flatten(7), { shape: "single", items: { _: 7 } });
assert.deepEqual(unflatten("object", flatten({ r1: true, r2: true }).items), { r1: true, r2: true });

// ── 가짜 서버: 행마다 서버 시각을 찍고, 같은 (강아지, 키, 항목)은 덮어쓴다 ──
let clock = Date.parse("2026-10-20T00:00:00Z");
const server = { pets: new Set(), rows: new Map(), members: { mom: new Set(), dad: new Set() } };
let who = "mom";
const remote = {
  myPetIds: async () => [...server.members[who]],
  createPets: async (ids) => ids.forEach((id) => (server.pets.add(id), server.members[who].add(id))),
  pull: async (petIds, since) =>
    [...server.rows.values()].filter((r) => petIds.includes(r.pet_id) && (!since || r.updated_at > since)).map((r) => structuredClone(r)),
  push: async (rows) =>
    rows.forEach((r) => {
      if (!server.members[who].has(r.pet_id)) throw new Error("권한 없음");
      clock += 1000;
      server.rows.set(`${r.pet_id}|${r.key}|${r.item}`, { ...structuredClone(r), updated_at: new Date(clock).toISOString() });
    }),
};
const syncAs = (name) => (use(name), (who = name), syncOnce(remote));

// 엄마 폰: 강아지와 지출 2건, 체중 주기(숫자), 일정
use("mom");
set("dogcare-dogs-v1", [{ id: "dog-1", name: "초코", breed: "말티즈" }]);
set("dogcare-expenses-v1", { "dog-1": [{ id: "x1", title: "사료", amount: 30000 }, { id: "x2", title: "간식", amount: 5000 }] });
set("dogcare-weight-cadence-v1", { "dog-1": 14 });
set("dogcare-calendar-events-v1", { "dog-1": cal });
set("dogcare-theme-v1", "mint"); // 개인 설정 — 올라가면 안 됨
let r = await syncAs("mom");
assert.ok(r.pushed > 0);
assert.ok(![...server.rows.values()].some((x) => x.key === "dogcare-theme-v1"), "테마는 서버에 안 올라감");

// 아빠가 같은 강아지에 합류(3단계 초대를 흉내) → 받아 보면 엄마 기록이 그대로
server.members.dad.add("dog-1");
await syncAs("dad");
assert.equal(get("dogcare-dogs-v1")[0].name, "초코");
assert.deepEqual(get("dogcare-expenses-v1")["dog-1"].map((e) => e.id), ["x1", "x2"]);
assert.equal(get("dogcare-weight-cadence-v1")["dog-1"], 14);
assert.deepEqual(get("dogcare-calendar-events-v1")["dog-1"], cal);
assert.equal(get("dogcare-theme-v1"), null);

// 둘이 동시에 지출을 하나씩 적음 → 둘 다 남아야 함
use("mom");
set("dogcare-expenses-v1", { "dog-1": [...get("dogcare-expenses-v1")["dog-1"], { id: "x3", title: "미용", amount: 40000 }] });
use("dad");
set("dogcare-expenses-v1", { "dog-1": [...get("dogcare-expenses-v1")["dog-1"], { id: "x4", title: "장난감", amount: 9000 }] });
await syncAs("mom");
await syncAs("dad");
await syncAs("mom");
for (const name of ["mom", "dad"]) {
  use(name);
  assert.deepEqual(get("dogcare-expenses-v1")["dog-1"].map((e) => e.id).sort(), ["x1", "x2", "x3", "x4"], `${name} 폰에 지출 4건`);
}

// 아빠가 지출 하나 지우고 금액 하나 고침 → 엄마 폰에도 반영
use("dad");
set("dogcare-expenses-v1", { "dog-1": get("dogcare-expenses-v1")["dog-1"].filter((e) => e.id !== "x2").map((e) => (e.id === "x1" ? { ...e, amount: 32000 } : e)) });
await syncAs("dad");
await syncAs("mom");
const momExp = get("dogcare-expenses-v1")["dog-1"];
assert.ok(!momExp.some((e) => e.id === "x2"), "지운 지출이 엄마 폰에서도 사라짐");
assert.equal(momExp.find((e) => e.id === "x1").amount, 32000);

// 같은 항목을 둘이 고치면: 받는 쪽 폰에서 아직 안 올린 수정이 있으면 그 폰 것을 지키고, 다음에 올린 쪽이 남는다(마지막 저장 우선)
use("mom");
set("dogcare-weight-cadence-v1", { "dog-1": 7 });
use("dad");
set("dogcare-weight-cadence-v1", { "dog-1": 30 });
await syncAs("mom"); // 서버 7
await syncAs("dad"); // 아빠 폰은 30을 고친 상태라 7을 안 받고 30을 올림
assert.equal(get("dogcare-weight-cadence-v1")["dog-1"], 30);
await syncAs("mom");
assert.equal(get("dogcare-weight-cadence-v1")["dog-1"], 30, "마지막에 올린 값으로 맞춰짐");

// 일정 날짜의 일정을 모두 지우면 그 날짜가 엄마 폰에서도 비워짐
use("dad");
const c = get("dogcare-calendar-events-v1");
delete c["dog-1"]["2026-10-21"];
set("dogcare-calendar-events-v1", c);
await syncAs("dad");
await syncAs("mom");
assert.equal(get("dogcare-calendar-events-v1")["dog-1"]["2026-10-21"], undefined);
assert.equal(get("dogcare-calendar-events-v1")["dog-1"]["2026-10-20"].length, 2);

// 아무것도 안 바뀌었으면 올리는 것도 없음
r = await syncAs("mom");
assert.equal(r.pushed, 0);

// 새 폰(엄마가 폰을 바꿈)에서 로그인하면 기록을 내려받음
phones.momNew = {};
use("momNew");
who = "mom";
await syncOnce(remote);
assert.equal(get("dogcare-dogs-v1")[0].id, "dog-1");
assert.equal(get("dogcare-expenses-v1")["dog-1"].length, 3);

// 이미 받은 행을 다시 받아도(겹쳐 받기) 폰 저장소에 다시 쓰지 않음 — 다시 쓰면 맞추기가 끝없이 반복된다
use("mom");
who = "mom";
const before = JSON.stringify(phones.mom);
let writes = 0;
const origSet = globalThis.localStorage.setItem;
globalThis.localStorage.setItem = (k, v) => (k !== "dogcare-sync-v1" && writes++, origSet(k, v));
await syncOnce(remote);
globalThis.localStorage.setItem = origSet;
assert.equal(writes, 0, "같은 값은 다시 안 씀");
assert.equal(JSON.parse(before)["dogcare-expenses-v1"], phones.mom["dogcare-expenses-v1"]);

console.log("기록 서버 저장(동기화) 확인 통과");
