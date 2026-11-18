// 우리 아이 캐릭터(11/17): 서버(server/character.js)와 주고받기 + 폰에 저장되는 것(강아지별 토큰·완성본).
// 문은 잠겨 있고(곧 출시) 초대 코드를 쓴 강아지만 만들 수 있다. 완성본은 폰에 저장해 홈 화면 강아지가 그 아이로 바뀐다.
import { API_BASE } from "./aiClient";
import { readJSON, writeJSON } from "./storage";
import { getPushSubscription } from "./notifications";

const KEY = (dogId) => `dogcare-character-${dogId}`; // { token, job, outputs }
export const getCharacter = (dogId) => readJSON(KEY(dogId), null);
function save(dogId, patch) {
  writeJSON(KEY(dogId), { ...(getCharacter(dogId) || {}), ...patch });
  if ("outputs" in patch) window.dispatchEvent(new CustomEvent("dogcare-character-changed")); // 홈 화면 강아지(Main)가 듣는다
  return getCharacter(dogId);
}
// 홈 화면 강아지에 쓸 완성본(없으면 null → 기본 견종 캐릭터)
export const characterOutputs = (dogId) => getCharacter(dogId)?.outputs || null;
export const clearCharacterOutputs = (dogId) => save(dogId, { outputs: null });

async function endpoint() {
  try { return (await getPushSubscription())?.endpoint || null; } catch { return null; }
}
async function call(path, { method = "GET", body, form } = {}) {
  const res = await fetch(`${API_BASE}/api/character${path}`, {
    method,
    headers: form ? undefined : { "Content-Type": "application/json" },
    body: form || (body && JSON.stringify(body)),
    signal: AbortSignal.timeout(form ? 60_000 : 15_000),
  }).catch(() => { throw new Error("서버에 연결할 수 없어요. 인터넷을 확인하고 잠시 뒤 다시 열어 주세요"); });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `서버 오류 ${res.status}`);
  return data;
}
// 상태 한 번에: 문 열렸나·코드 썼나·마지막 작업. 완성된 작업이면 완성본을 폰에 저장한다
export async function fetchStatus(dogId) {
  const c = getCharacter(dogId) || {};
  const ep = await endpoint();
  const q = new URLSearchParams({ petId: dogId, ...(c.token && { token: c.token }), ...(ep && { endpoint: ep }) });
  const s = await call(`/status?${q}`);
  if (typeof s.plus === "boolean" && Boolean(c.plus) !== s.plus) save(dogId, { plus: s.plus }); // 플러스 여부(services/plus.js가 읽음)
  if (s.job) save(dogId, { job: s.job, ...(["done", "extra-queued", "extra"].includes(s.job.status) && s.job.outputs && { outputs: s.job.outputs }) });
  return s;
}
export async function setWaitlist(dogId, on) {
  const ep = await endpoint();
  if (!ep) throw new Error("먼저 알림을 켜 주세요(출시 소식을 알림으로 보내 드려요)");
  return call("/waitlist", { method: "POST", body: { endpoint: ep, petId: dogId, on } });
}
export async function redeem(dogId, code) {
  const { token } = await call("/redeem", { method: "POST", body: { code, petId: dogId } });
  save(dogId, { token });
  return token;
}
// 사진은 캔버스로 다시 그려 보낸다 → EXIF(위치·기기)가 빠지고 긴 변 1536px JPEG로 작아진다
export async function shrinkPhoto(file, max = 1536) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error("사진을 읽을 수 없어요");
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k);
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error("사진 변환 실패"))), "image/jpeg", 0.9));
}
export async function startJob(dogId, { style, blobs }) {
  const c = getCharacter(dogId) || {};
  const form = new FormData();
  form.append("petId", dogId); form.append("style", style); form.append("consent", "1"); form.append("adult", "1");
  if (c.token) form.append("token", c.token);
  const ep = await endpoint(); if (ep) form.append("endpoint", ep);
  blobs.forEach((b, i) => form.append("photos", b, `photo-${i + 1}.jpg`));
  const { job } = await call("/jobs", { method: "POST", form });
  save(dogId, { job, outputs: null });
  return job;
}
export async function refreshJob(dogId) {
  const c = getCharacter(dogId);
  if (!c?.job?.id) return null;
  const { job } = await call(`/jobs/${c.job.id}?token=${encodeURIComponent(c.token || "")}`);
  save(dogId, { job, ...(["done", "extra-queued", "extra"].includes(job.status) && job.outputs && { outputs: job.outputs }) });
  return job;
}
export async function pickCandidate(dogId, picked) {
  const c = getCharacter(dogId);
  const { job } = await call(`/jobs/${c.job.id}/pick`, { method: "POST", body: { picked, token: c.token } });
  save(dogId, { job });
  return job;
}
// 영상 단계에서 실패했을 때: 고른 설정화 그대로 영상만 다시
export async function retryRender(dogId) {
  const c = getCharacter(dogId);
  const { job } = await call(`/jobs/${c.job.id}/retry`, { method: "POST", body: { token: c.token } });
  save(dogId, { job });
  return job;
}
export async function regenCandidates(dogId) {
  const c = getCharacter(dogId);
  const { job } = await call(`/jobs/${c.job.id}/regen`, { method: "POST", body: { token: c.token } });
  save(dogId, { job });
  return job;
}
export const STYLE_LABEL = { "3d": "말랑 3D", hand: "그림일기" };
export const isWorking = (job) => job && ["queued", "sheet", "picked", "render", "extra-queued", "extra"].includes(job.status);
export const isExtraWorking = (job) => job && ["extra-queued", "extra"].includes(job.status);
// 부가 동작 한 편 더(정성 상품: 3편까지). 기본 캐릭터가 완성된 뒤에만
export async function addExtra(dogId, kind) {
  const c = getCharacter(dogId);
  const { job } = await call(`/jobs/${c.job.id}/extra`, { method: "POST", body: { kind, token: c.token } });
  save(dogId, { job });
  return job;
}
