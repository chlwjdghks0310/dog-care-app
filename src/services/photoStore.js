// 사진 저장소(11/8): 사진을 localStorage(5MB, 기록과 같이 씀) 대신 IndexedDB에 파일(Blob)로 둔다.
// 근거: ../자료용/자료/2026-11-08-PWA-사진-저장.md — iOS 17+ IndexedDB는 디스크의 최대 60%, 홈 화면 앱도 같음.
//
// 어떻게: 기록 안의 사진 글자(data:image/...)를 "idb:<번호>"로 바꿔 둔다. 번호는 사진 글자의 지문이라 같은 사진은
//   어느 폰에서나 같은 번호(가족 공유·서버와 맞추기 쉬움).
//   · 읽을 때(storage.readJSON): "idb:번호" → 화면용 주소(blob:)로 바꿔 준다 → 화면 코드는 그대로 <img src>
//   · 쓸 때(storage.writeJSON): 화면용 주소 → 다시 "idb:번호"
//   · 새로 들어온 사진 글자는 저장된 뒤 조금 있다 옮긴다(stashSoon): 저장 → 확인 → 그다음 기록 안의 글자를 번호로 바꿈.
//     중간에 앱이 꺼져도 예전 사진 글자는 기록에 그대로 있어 사라지지 않는다.
//   · 서버로 올릴 때·백업 파일엔 다시 사진 글자로 붙인다(expand), 받을 때는 떼어 넣는다(ingest).
// IndexedDB를 못 쓰는 곳(개인정보 보호 모드 일부, 테스트용 Node)에선 아무것도 하지 않는다 → 예전처럼 동작.
// ponytail: 미리보기용 작은 사진(thumb)은 따로 안 만든다 — 모아 보기가 느려지면 그때 240px 사본 추가.

const DB = "mungcare-photos";
const STORE = "photos";
const PREFIX = "idb:";
const DATA_RE = /data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g;

const urlOf = new Map(); // 번호 → blob: 주소
const putAt = new Map(); // 번호 → 넣은 시각(막 넣고 아직 기록에 안 쓰인 사진을 정리에서 지키려고)
const idOfUrl = new Map(); // blob: 주소 → 번호
let db = null;
let ready = false;

// 사진 글자 지문(cyrb53) — 같은 사진이면 같은 번호
export function photoId(dataUrl) {
  let h1 = 0xdeadbeef ^ dataUrl.length;
  let h2 = 0x41c6ce57 ^ dataUrl.length;
  for (let i = 0; i < dataUrl.length; i++) {
    const ch = dataUrl.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return "p" + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + dataUrl.length.toString(36);
}

const has = () => typeof indexedDB !== "undefined";
// 사파리 개인정보 보호 모드는 파일(Blob)을 못 넣는다("BlobURLs are not yet supported") → 그땐 바이트 그대로(buf) 넣는다
const blobOf = (r) => r?.blob || (r?.buf ? new Blob([r.buf], { type: r.type || "image/jpeg" }) : null);
const sizeOf = (r) => r?.blob?.size ?? r?.buf?.byteLength ?? -1;

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => {
      db = req.result;
      db.onclose = () => (db = null); // 아이폰 홈 화면 앱: 나갔다 오면 연결이 끊기는 버그(WebKit 235579)
      db.onversionchange = () => (db.close(), (db = null)); // 다른 창이 저장소를 고치려 하면 막지 않고 비켜 준다
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

// 짧은 트랜잭션 하나. 연결이 끊겨 있으면 다시 열고 한 번 더(자료 ④)
async function tx(mode, fn) {
  for (let attempt = 0; ; attempt++) {
    try {
      const d = db || (await open());
      return await new Promise((resolve, reject) => {
        const t = d.transaction(STORE, mode);
        const out = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(out?.result ?? out);
        t.onabort = t.onerror = () => reject(t.error || new Error("사진 저장소 오류"));
      });
    } catch (e) {
      db = null;
      if (attempt >= 1) throw e;
    }
  }
}

function remember(id, blob) {
  if (urlOf.has(id)) return urlOf.get(id);
  const url = URL.createObjectURL(blob);
  urlOf.set(id, url);
  idOfUrl.set(url, id);
  return url;
}

// 앱을 열 때 한 번: 저장된 사진 전부의 화면용 주소를 만든다(파일을 메모리에 다 올리는 건 아님). 3초 넘으면 기다리지 않음
export async function initPhotos() {
  if (!has()) return;
  try {
    const all = await Promise.race([tx("readonly", (s) => s.getAll()), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]);
    for (const r of all || []) remember(r.id, blobOf(r));
    ready = true;
    stashSoon(0);
  } catch {
    ready = false; // 못 열면 예전처럼 기록 안의 사진 글자를 그대로 쓴다
  }
}

// ── storage.js가 쓰는 변환 ──
export const needsRevive = (raw) => urlOf.size > 0 && raw.includes(`"${PREFIX}`);
export const revive = (_k, v) => (typeof v === "string" && v.startsWith(PREFIX) ? urlOf.get(v.slice(PREFIX.length)) || v : v);
export const needsReplace = () => idOfUrl.size > 0;
export const replace = (_k, v) => (typeof v === "string" && v.startsWith("blob:") && idOfUrl.has(v) ? PREFIX + idOfUrl.get(v) : v);

// 서버와 맞출 때 쓰는 "같은 사진인지" 비교용 모양: 사진 글자·화면용 주소 모두 "idb:번호"로
export function normalize(value) {
  return JSON.parse(JSON.stringify(value ?? null, (k, v) => {
    if (typeof v !== "string") return v;
    if (v.startsWith("data:image/")) return PREFIX + photoId(v);
    return replace(k, v);
  }));
}

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

// 서버로 올릴 때·백업 파일: 번호와 화면용 주소를 사진 글자로 다시 붙인다. 못 찾은 사진은 번호 그대로 둔다(지우지 않음)
export async function expand(value) {
  const ids = new Set();
  JSON.stringify(value ?? null, (k, v) => {
    if (typeof v === "string") {
      if (v.startsWith(PREFIX)) ids.add(v.slice(PREFIX.length));
      else if (idOfUrl.has(v)) ids.add(idOfUrl.get(v));
    }
    return v;
  });
  if (!ids.size || !has()) return value;
  const data = new Map();
  for (const id of ids) {
    try {
      const r = await tx("readonly", (s) => s.get(id));
      if (blobOf(r)) data.set(id, await blobToDataUrl(blobOf(r)));
    } catch {
      /* 못 읽은 사진은 번호 그대로 */
    }
  }
  return JSON.parse(JSON.stringify(value, (k, v) => {
    if (typeof v !== "string") return v;
    const id = v.startsWith(PREFIX) ? v.slice(PREFIX.length) : idOfUrl.get(v);
    return id && data.has(id) ? data.get(id) : v;
  }));
}

// 사진 글자 하나 → 저장소(이미 있으면 건너뜀). 저장이 끝난 걸 확인한 뒤에만 true
async function put(dataUrl) {
  const id = photoId(dataUrl);
  putAt.set(id, Date.now()); // 이미 있어도 "방금 쓰임"으로(정리에서 지킴)
  if (urlOf.has(id)) return id;
  // dataURL을 그대로 넣지 않고 파일로(자료 ⑤). fetch 대신 직접 풀기 — 앱을 끄는 순간 fetch가 끊기며 오류가 남던 것
  const [head, b64] = dataUrl.split(",");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: head.slice(5, head.indexOf(";")) });
  try {
    await tx("readwrite", (s) => s.put({ id, blob, createdAt: Date.now() }));
  } catch (e) {
    if (e?.name !== "DataCloneError") throw e;
    const buf = await blob.arrayBuffer(); // 트랜잭션 밖에서 미리(안에서 기다리면 트랜잭션이 닫힘)
    await tx("readwrite", (s) => s.put({ id, buf, type: blob.type, createdAt: Date.now() }));
  }
  const back = await tx("readonly", (s) => s.get(id));
  if (sizeOf(back) !== blob.size) throw new Error("사진 저장 확인 실패");
  remember(id, blobOf(back));
  putAt.set(id, Date.now());
  return id;
}

// 서버에서 받은 값: 사진 글자를 저장소에 넣고 번호로 바꾼 값을 돌려준다(못 넣으면 글자 그대로)
export async function ingest(value) {
  if (!ready) return value;
  const found = new Set();
  JSON.stringify(value ?? null, (k, v) => (typeof v === "string" && v.startsWith("data:image/") && found.add(v), v));
  if (!found.size) return value;
  const ids = new Map();
  for (const d of found) {
    try {
      ids.set(d, await put(d));
    } catch {
      /* 그대로 둠 */
    }
  }
  return JSON.parse(JSON.stringify(value, (k, v) => (typeof v === "string" && ids.has(v) ? PREFIX + ids.get(v) : v)));
}

// ── 옮기기: localStorage 안의 사진 글자를 저장소로 ──
// 한 장씩 저장·확인 → 그 직후 같은 순간에 localStorage 글자를 다시 읽어 그 사진만 번호로 바꿔 쓴다(그 사이 다른 저장이 끼어들 틈 없음)
let running = null;
let again = false;
let timer = null;
let asked = false;
export function stashSoon(ms = 1500) {
  if (!ready) return;
  clearTimeout(timer);
  timer = setTimeout(() => (running ? (again = true) : (running = stashAll().catch(() => 0).finally(() => ((running = null), again && ((again = false), stashSoon(0)))))), ms);
}

const appKeys = () => {
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("dogcare-")) out.push(k);
  }
  return out;
};

export async function stashAll() {
  if (!ready) return 0;
  let moved = 0;
  for (const key of appKeys()) {
    const raw = localStorage.getItem(key) || "";
    if (!raw.includes("data:image/")) continue;
    for (const d of new Set(raw.match(DATA_RE) || [])) {
      let id;
      try {
        id = await put(d);
      } catch {
        continue; // 저장소가 꽉 찼거나 오류 → 이 사진은 기록 안에 그대로(다음에 다시)
      }
      const now = localStorage.getItem(key) || "";
      if (!now.includes(d)) continue;
      try {
        localStorage.setItem(key, now.split(d).join(PREFIX + id));
        moved++;
      } catch {
        /* 쓰기 실패해도 원래 글자는 남아 있음 */
      }
    }
  }
  if (moved) askPersist();
  await sweep();
  return moved;
}

// 어디서도 안 쓰는 사진은 저장소에서도 지운다("지우면 되돌릴 수 없어요"와 맞게).
// 막 넣은 사진(5분 안)은 건드리지 않는다 — 서버에서 받아 넣었는데 기록에 쓰기 직전일 수 있어서
async function sweep() {
  const keys = appKeys();
  if (!keys.includes("dogcare-dogs-v1")) return; // 기록을 못 읽는 상태로 보이면 지우지 않음
  const used = new Set();
  for (const key of keys) for (const m of (localStorage.getItem(key) || "").matchAll(/"idb:([a-z0-9]+)"/g)) used.add(m[1]);
  const stale = [...urlOf.keys()].filter((id) => !used.has(id) && Date.now() - (putAt.get(id) || 0) > 5 * 60_000);
  if (!stale.length) return;
  try {
    await tx("readwrite", (s) => stale.forEach((id) => s.delete(id)));
    for (const id of stale) {
      const url = urlOf.get(id);
      urlOf.delete(id);
      idOfUrl.delete(url);
      URL.revokeObjectURL(url);
    }
  } catch {
    /* 다음에 다시 */
  }
}

// 홈 화면 앱이면 "이 앱 저장소는 지우지 말아 주세요"를 한 번 요청(iOS 17+, 자료 ②)
function askPersist() {
  if (asked) return;
  asked = true;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone) navigator.storage?.persist?.().catch(() => {});
}
