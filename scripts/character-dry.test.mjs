// 우리 아이 캐릭터 서버(server/character.js) 모의 시험 — 돈을 한 푼도 안 쓰고 상태기계 전체를 돌린다(11/18, 사용자: "수익·지출 문제라 오류처럼 나면 안 된다").
// 가짜 DB(메모리) + 가짜 Gemini + 가짜 Runway + 가짜 저장소, ffmpeg만 진짜. 확인하는 것:
//   ① 사진 → 후보 4장 → 고르기 → 영상 2편 → 완성, 영상 요청 2번, 장부 90크레딧, 비용 합계
//   ② 끊긴 뒤 이어받기: 저장된 Runway 작업 번호가 있으면 새로 요청하지 않는다(청구됐는데 결과 잃는 일 방지)
//   ③ 크레딧 부족 → 실패 아닌 대기, 충전되면 이어감   ④ 다시 만들기 2번 상한   ⑤ 하루 영상 한도 → 대기   ⑥ 후보는 한 장마다 저장
//   node scripts/character-dry.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import express from "express";
import ffmpegPath from "ffmpeg-static";
import { mountCharacter } from "../server/character.js";

const run = promisify(execFile);
process.env.RUNWAY_API_KEY = "test-runway";
process.env.CHARACTER_POLL_MS = "20";
process.env.CHARACTER_OPEN = "0";
const SUPA = "https://fake.supabase.co";

// ---- 고정 파일(ffmpeg로 즉석 생성): 사진 jpg, Gemini 그림 png, Runway 영상 mp4(초록 배경 + 어두운 네모) ----
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mc-dry-"));
const ff = (...a) => run(ffmpegPath, ["-y", "-hide_banner", "-loglevel", "error", ...a]);
await ff("-f", "lavfi", "-i", "color=c=0x8899aa:s=96x96:d=1", "-frames:v", "1", path.join(tmp, "photo.jpg"));
await ff("-f", "lavfi", "-i", "color=c=0x00ff00:s=256x256:d=1", "-vf", "drawbox=x=96:y=96:w=64:h=64:color=0x332211:t=fill", "-frames:v", "1", path.join(tmp, "pic.png"));
await ff("-f", "lavfi", "-i", "color=c=0x00ff00:s=960x960:d=1:r=12", "-vf", "drawbox=x=380:y=380:w=200:h=200:color=0x332211:t=fill", "-pix_fmt", "yuv420p", path.join(tmp, "clip.mp4"));
const PHOTO = await fs.readFile(path.join(tmp, "photo.jpg"));
const PIC = await fs.readFile(path.join(tmp, "pic.png"));
const CLIP = await fs.readFile(path.join(tmp, "clip.mp4"));

// ---- 가짜 DB(PostgREST 흉내: eq/neq/lt/gte/in, order, limit, POST/PATCH/DELETE) ----
const PK = { character_invites: "code", character_access: "pet_id", character_waitlist: "endpoint", character_jobs: "id" };
const tables = Object.fromEntries(Object.keys(PK).map((t) => [t, []]));
function parse(pathq) {
  const [table, q = ""] = pathq.split("?");
  const filters = []; let order = null, limit = Infinity;
  for (const kv of q.split("&").filter(Boolean)) {
    const [k, raw] = kv.split("="); const v = decodeURIComponent(raw || "");
    if (k === "select") continue;
    if (k === "order") { const [c, d] = v.split("."); order = { c, d }; continue; }
    if (k === "limit") { limit = Number(v); continue; }
    const m = v.match(/^(eq|neq|lt|gte|in)\.(.*)$/s); if (!m) throw new Error("filter? " + kv);
    filters.push({ k, op: m[1], v: m[2] });
  }
  return { table, filters, order, limit };
}
const match = (row, f) => {
  const x = row[f.k];
  if (f.op === "eq") return String(x) === f.v;
  if (f.op === "neq") return String(x ?? "") !== f.v;
  if (f.op === "lt") return String(x) < f.v;
  if (f.op === "gte") return String(x) >= f.v;
  if (f.op === "in") return f.v.replace(/^\(|\)$/g, "").split(",").includes(String(x));
  return false;
};
async function db(pathq, { method = "GET", body, prefer } = {}) {
  const { table, filters, order, limit } = parse(pathq);
  const rows = tables[table]; if (!rows) throw new Error("table? " + table);
  const sel = () => rows.filter((r) => filters.every((f) => match(r, f)));
  if (method === "GET") {
    let out = sel();
    if (order) out = [...out].sort((a, b) => (String(a[order.c]) < String(b[order.c]) ? -1 : 1) * (order.d === "desc" ? -1 : 1));
    return out.slice(0, limit).map((r) => ({ ...r }));
  }
  if (method === "POST") {
    for (const b of Array.isArray(body) ? body : [body]) {
      const pk = PK[table]; const i = rows.findIndex((r) => r[pk] === b[pk]);
      const now = new Date().toISOString();
      const base = table === "character_jobs" ? { photos: [], candidates: [], regen: 0, cost: 0, created_at: now, updated_at: now } : table === "character_invites" ? { max_uses: 1, used: 0 } : {};
      if (i >= 0) { if (/ignore/.test(prefer || "")) continue; if (/merge/.test(prefer || "")) { rows[i] = { ...rows[i], ...b }; continue; } throw new Error("duplicate " + pk); }
      rows.push({ ...base, ...b });
    }
    return null;
  }
  if (method === "PATCH") { for (const r of sel()) Object.assign(r, body); return null; }
  if (method === "DELETE") { const del = new Set(sel()); tables[table] = rows.filter((r) => !del.has(r)); return null; }
}

// ---- 가짜 바깥세상: Runway·저장소·Gemini ----
const world = { credits: 1000, posts: 0, tasks: {}, store: new Map(), geminiCalls: 0 };
const realFetch = globalThis.fetch;
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.startsWith("http://127.0.0.1") || u.startsWith("http://localhost")) return realFetch(url, opts);
  if (u.startsWith("https://api.dev.runwayml.com/v1/organization")) return json({ creditBalance: world.credits });
  if (u.startsWith("https://api.dev.runwayml.com/v1/image_to_video")) { if (world.credits < 45) return json({ error: "insufficient" }, 400); world.posts++; const id = `task-${world.posts}`; world.tasks[id] = { polls: 0 }; world.credits -= 45; return json({ id, estimatedCost: { credits: 45 } }); }
  let m = u.match(/api\.dev\.runwayml\.com\/v1\/tasks\/(.+)$/);
  if (m) { const t = world.tasks[m[1]]; if (!t) return json({ status: "FAILED", failureCode: "not found" }); t.polls++; return json(t.polls < 2 ? { status: "RUNNING", progress: 0.5 } : { status: "SUCCEEDED", output: [`fake://video/${m[1]}`], cost: { credits: 45 } }); }
  if (u.startsWith("fake://video/")) return new Response(CLIP);
  m = u.match(/\/storage\/v1\/object\/(character-(?:public|private))\/(.+)$/);
  if (m && opts.method === "POST") { world.store.set(`${m[1]}/${m[2]}`, Buffer.from(opts.body)); return new Response("{}"); }
  if (m && (!opts.method || opts.method === "GET")) { const b = world.store.get(`${m[1]}/${m[2]}`); return b ? new Response(b) : new Response("no", { status: 404 }); }
  m = u.match(/\/storage\/v1\/object\/public\/character-public\/(.+)$/);
  if (m) { const b = world.store.get(`character-public/${m[1]}`); return b ? new Response(b) : new Response("no", { status: 404 }); }
  if (/\/storage\/v1\/object\/character-private$/.test(u) && opts.method === "DELETE") return new Response("{}");
  throw new Error("가짜 세상에 없는 주소: " + u);
};
const fakeAi = { models: { generateContent: async () => { world.geminiCalls++; return { candidates: [{ content: { parts: [{ inlineData: { data: PIC.toString("base64") } }] } }] }; } } };

// ---- 서버 띄우기 ----
const app = express();
app.use(express.json());
const pushDevices = new Map([["https://push.test/dev1", { subscription: { endpoint: "https://push.test/dev1" } }]]);
const pushes = [];
const sendPush = async (_d, title) => { pushes.push(title); return true; };
const ch = mountCharacter(app, { db, dbOk: true, supabaseUrl: SUPA, serviceKey: "k", pushDevices, sendPush, tooMany: () => false, fakeAi, quiet: true });
const server = await new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
const BASE = `http://127.0.0.1:${server.address().port}/api/character`;
const api = async (p, init) => { const r = await realFetch(BASE + p, init); return { status: r.status, body: await r.json() }; };
const post = (p, body) => api(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const drain = async (n = 12) => { for (let i = 0; i < n; i++) await ch.tick(); };
const job = async (pet, token) => (await api(`/status?petId=${pet}&token=${token}`)).body.job;
const pass = (name) => console.error("  ✓", name);

// ① 처음부터 끝까지
{
  const pet = "dog-a";
  const r = await post("/redeem", { code: "MC-PLUS-A7KQ", petId: pet });
  assert.equal(r.status, 200); assert.equal(r.body.plus, true);
  const token = r.body.token;
  const form = new FormData();
  for (const [k, v] of Object.entries({ petId: pet, token, style: "hand", consent: "1", adult: "1", endpoint: "https://push.test/dev1" })) form.append(k, v);
  form.append("photos", new Blob([PHOTO], { type: "image/jpeg" }), "a.jpg"); form.append("photos", new Blob([PHOTO], { type: "image/jpeg" }), "b.jpg");
  const made = await api("/jobs", { method: "POST", body: form });
  assert.equal(made.status, 200, JSON.stringify(made.body)); assert.equal(made.body.job.status, "queued");
  await ch.tick();
  let j = await job(pet, token);
  assert.equal(j.status, "pick"); assert.equal(j.candidates.length, 4); assert.equal(world.geminiCalls, 4);
  assert.equal(pushes.at(-1), "🐾 캐릭터 후보가 나왔어요");
  const picked = await post(`/jobs/${j.id}/pick`, { picked: 2, token });
  assert.equal(picked.body.job.status, "picked");
  await drain(3);
  j = await job(pet, token);
  assert.equal(j.status, "done", j.step);
  for (const k of ["idle", "thinking", "poster", "green", "lie", "sheet"]) assert.ok(j.outputs[k], k);
  assert.equal(world.posts, 2, "영상 요청은 딱 2번");
  assert.equal(world.geminiCalls, 6, "그림은 후보 4 + 초록판 + 엎드림");
  const ledger = tables.character_jobs.find((r) => r.status === "ledger");
  assert.equal(ledger.regen, 90, "장부 90크레딧");
  const row = tables.character_jobs.find((r) => r.pet_id === pet);
  assert.ok(Math.abs(row.cost - (6 * 0.134 + 0.9)) < 0.001, `비용 ${row.cost}`);
  assert.equal(pushes.at(-1), "🎉 우리 아이 캐릭터가 완성됐어요");
  // 장부 행은 강아지 상태에 안 섞인다
  assert.ok(!(await api(`/status?petId=__ledger__`)).body.job);
  pass("① 사진 → 후보 → 고르기 → 영상 2편 → 완성 (영상 2번·장부 90·비용 맞음)");

  // ④ 다시 만들기 상한: failed로 만들고 세 번 누르기
  tables.character_jobs.find((r) => r.pet_id === pet).status = "failed";
  assert.equal((await post(`/jobs/${j.id}/retry`, { token })).status, 200);
  tables.character_jobs.find((r) => r.pet_id === pet).status = "failed";
  assert.equal((await post(`/jobs/${j.id}/retry`, { token })).status, 200);
  tables.character_jobs.find((r) => r.pet_id === pet).status = "failed";
  const third = await post(`/jobs/${j.id}/retry`, { token });
  assert.equal(third.status, 409); assert.match(third.body.error, /2번까지/);
  pass("④ 다시 만들기는 2번까지");
  tables.character_jobs.find((r) => r.pet_id === pet).status = "done";
}

// ② 끊긴 뒤 이어받기: Runway 작업 번호가 저장돼 있으면 새로 요청하지 않는다
{
  const pet = "dog-b";
  const token = (await post("/redeem", { code: "MC-PLUS-B3ZM", petId: pet })).body.token;
  const before = world.posts;
  world.tasks["task-old"] = { polls: 1 };
  // green·lie 판은 저장소에 있고, idle 영상은 요청해 둔 상태에서 서버가 죽었다고 가정
  world.store.set("character-public/jobB/v0-1-green.png", PIC); world.store.set("character-public/jobB/v0-1-lie.png", PIC); world.store.set("character-public/jobB/cand-0-1.png", PIC);
  tables.character_jobs.push({ id: "jobB", pet_id: pet, style: "3d", status: "render", step: "기다리기 영상을 만드는 중", photos: [], candidates: ["jobB/cand-0-1.png"], picked: 1, regen: 0, cost: 0.81, outputs: { partial: { green: `${SUPA}/storage/v1/object/public/character-public/jobB/v0-1-green.png`, lie: `${SUPA}/storage/v1/object/public/character-public/jobB/v0-1-lie.png`, tasks: { idle: "task-old" } } }, created_at: new Date(Date.now() - 3600e3).toISOString(), updated_at: new Date(Date.now() - 20 * 60e3).toISOString() });
  await ch.recoverStale(); // 15분 넘게 멈춘 render → picked
  assert.equal(tables.character_jobs.find((r) => r.id === "jobB").status, "picked");
  await drain(3);
  const j = await job(pet, token);
  assert.equal(j.status, "done", j.step);
  assert.equal(world.posts - before, 1, "기다리기는 이어받고 고민 중만 새로 요청");
  assert.equal(world.geminiCalls, 6, "초록판·엎드림은 다시 안 그림");
  pass("② 서버가 끊겨도 요청해 둔 영상을 이어받고, 판은 다시 안 그림");
}

// ③ 크레딧 부족 → 대기 → 충전되면 이어감
{
  const pet = "dog-c";
  const token = (await post("/redeem", { code: "MC-PLUS-C9RX", petId: pet })).body.token;
  world.store.set("character-public/jobC/cand-0-1.png", PIC);
  tables.character_jobs.push({ id: "jobC", pet_id: pet, style: "hand", status: "picked", step: "", photos: [], candidates: ["jobC/cand-0-1.png"], picked: 1, regen: 0, cost: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  world.credits = 10;
  const before = world.posts;
  await drain(2);
  let j = await job(pet, token);
  assert.equal(j.status, "picked"); assert.match(j.step, /크레딧이 모자라요/); assert.equal(world.posts, before, "요청 안 함");
  world.credits = 1000;
  await drain(3);
  j = await job(pet, token);
  assert.equal(j.status, "done", j.step); assert.equal(world.posts - before, 2);
  pass("③ 크레딧 부족이면 실패 대신 대기, 충전되면 자동으로 이어감");
}

// ⑤ 하루 영상 한도(450) → 대기
{
  const pet = "dog-d";
  const token = (await post("/redeem", { code: "MC-PLUS-D2WH", petId: pet })).body.token;
  tables.character_jobs.find((r) => r.status === "ledger").regen = 440;
  world.store.set("character-public/jobD/cand-0-1.png", PIC);
  tables.character_jobs.push({ id: "jobD", pet_id: pet, style: "hand", status: "picked", step: "", photos: [], candidates: ["jobD/cand-0-1.png"], picked: 1, regen: 0, cost: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  const before = world.posts;
  await drain(2);
  const j = await job(pet, token);
  assert.equal(j.status, "picked"); assert.match(j.step, /한도/); assert.equal(world.posts, before);
  pass("⑤ 하루 영상 한도에 닿으면 대기(요청 안 함)");
  tables.character_jobs.find((r) => r.status === "ledger").regen = 0;
  tables.character_jobs.find((r) => r.id === "jobD").status = "done"; // 다음 시험이 이 작업에 막히지 않게
}

// ⑥ 후보는 한 장마다 저장: 3장 만들고 끊겨도 4번째만 더 그림
{
  const pet = "dog-e";
  const token = (await post("/redeem", { code: "MC-PLUS-E6NT", petId: pet })).body.token;
  tables.character_jobs.push({ id: "jobE", pet_id: pet, style: "hand", status: "queued", step: "", photos: ["jobE/photo-1.jpg", "jobE/photo-2.jpg"], candidates: ["jobE/cand-0-1.png", "jobE/cand-0-2.png", "jobE/cand-0-3.png"], regen: 0, cost: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  world.store.set("character-private/jobE/photo-1.jpg", PHOTO); world.store.set("character-private/jobE/photo-2.jpg", PHOTO);
  const g = world.geminiCalls;
  await ch.tick();
  const j = await job(pet, token);
  assert.equal(j.status, "pick"); assert.equal(j.candidates.length, 4); assert.equal(world.geminiCalls - g, 1, "4번째 한 장만");
  pass("⑥ 후보는 한 장마다 저장돼 끊겨도 남은 장만 그림");
}

server.close();
await fs.rm(tmp, { recursive: true, force: true });
console.error("character-dry ok");
