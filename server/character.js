// 우리 아이 캐릭터 — 사진 → 설정화 후보 4장 → (사용자가 고름) → 초록판·엎드린 그림 → Runway 영상 2편 → ffmpeg 키잉 → stacked mp4
// 손 시험(scripts/char-test.mjs·char-video.mjs, 11/17 여름이·말티즈·검은 믹스견)에서 확정된 지시문을 그대로 서버로 옮긴 것.
// 문은 잠겨 있다: CHARACTER_OPEN=1 이 아니면 초대 코드(character_invites)를 쓴 강아지만 만들 수 있고, 나머지는 알림 대기(character_waitlist)만.
// 표·저장소: supabase/character.sql. 비밀값(키)은 로그에 찍지 않는다. 사진은 끝나면 바로 지운다(비공개 저장소).
import os from "os";
import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomBytes, createHash, randomUUID } from "crypto";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);
const GEMINI_MODEL = "gemini-3-pro-image";
const GEMINI_PRICE = 0.134; // 장당 달러
const RUNWAY = "https://api.dev.runwayml.com";
const DAILY_CAP = Number(process.env.CHARACTER_DAILY_CAP_USD || 20); // 하루 생성비 한도(달러) — 넘으면 큐에서 기다린다
const MAX_REGEN = 2; // 후보 다시 뽑기 횟수(기본 상품 조건)

// ---- 지시문(손 시험 확정본) ----
const STYLE = {
  "3d": "a 3D animated feature-film character in the style of modern American CG animal comedies: big round head with oversized expressive glossy eyes, small chubby body, exaggerated cute proportions, soft stylized fur with gentle sculpted clumps (NOT photoreal, NOT a plush toy), a charming closed-mouth smile, bright cheerful three-point lighting, clean plain very light blue-white background, no text, no props, full body sitting facing the camera, centered and filling about 80% of the image height",
  hand: "a child's picture-diary drawing made with wax crayons and colored pencils on cream drawing paper, exactly like the style reference images: visible crayon strokes and paper grain, slightly wobbly hand-drawn pencil outlines, warm and cute, NOT flat vector, NOT clean digital lines, no text, no sun, no grass, no doodles, no drawn frame or border, full body sitting facing the camera, centered and filling about 80% of the image height",
};
const IDENTITY = "The first photos are all the SAME real dog. Keep this exact dog's identity: breed, size impression, body shape, ear shape and set, eye color, muzzle (including any grey hairs), and the coat colors EXACTLY as in the photos. If the photos show a solid single-color coat, draw a solid single-color coat — do NOT invent markings, eyebrows, tan points or patches that are not in the photos. Do not change the breed. Do not add collars, leashes, bows, hair clips, clothes or props even if the photos have them.";
const GREEN = "Redraw this exact image with ONLY one change: replace the entire background with a flat, uniform, pure bright green (#00FF00) chroma-key screen. Keep the character pixel-identical: same pose, size, position, colors, lighting, outline and shadow under it. No green tint or reflection on the character, no text, nothing else.";
const LIE = "lying flat on its belly facing the camera, head LOW with the chin resting directly on top of both front paws, eyes looking up at the viewer, body low and relaxed like a resting puppy; keep the SAME flat pure green background, NO sun, NO grass, NO doodles, nothing else in the picture";
const HAND_2D = "This is a hand-drawn crayon and colored-pencil picture-diary drawing; animate it like a flat 2D hand-drawn flip-book, keeping the sketchy crayon strokes and wobbly outlines in every frame, never 3D, glossy or realistic. ";
const MOUTH = "CRITICAL: the mouth (and tongue, if any) is completely frozen for the entire video — drawn identically in every single frame, no opening, no talking, no panting. ";
const IDLE = "Calm, natural idle animation of this sitting puppy: the fluffy tail wags gently from side to side, the ears flick softly now and then, the head tilts slowly and curiously to one side, pauses, then slowly to the other side, two slow blinks, a gentle breathing rise and fall. Unhurried, never busy or jittery. Stays seated. Static camera. Seamless loop: the final frame matches the first frame exactly.";
const THINK = "The puppy stays lying down with its chin resting on its paws the whole time. A cute 'thinking hard' moment: the big eyes roll up and to one side as if pondering, then slowly to the other side, the brows shift slightly, one ear twitches, then a slow squint and one blink, then back to looking up at the viewer. Body does not get up. Static camera. Seamless loop: the final frame matches the first frame exactly.";
const motion = (style, kind) => (style === "hand" ? HAND_2D : "") + MOUTH + (kind === "idle" ? IDLE : THINK);
const DURATION = { "3d": { idle: 10, thinking: 5 }, hand: { idle: 5, thinking: 5 } }; // 3D idle은 분주하지 않게 10초(사용자 11/17)

const sha = (s) => createHash("sha256").update(s).digest("hex");
const nowIso = () => new Date().toISOString();

export function mountCharacter(app, { db, dbOk, supabaseUrl, serviceKey, pushDevices, sendPush, tooMany }) {
  const geminiKey = process.env.CHARACTER_GEMINI_API_KEY || process.env.GEMINI_API_KEY; // 유료 등급 키(사진이 학습에 안 쓰이게)
  const runwayKey = process.env.RUNWAY_API_KEY;
  const ready = Boolean(dbOk && geminiKey && runwayKey && ffmpegPath);
  const isOpen = () => process.env.CHARACTER_OPEN === "1";
  const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;
  console.log(`[character] ${ready ? "준비됨" : "꺼짐"} (db ${dbOk ? "ok" : "x"} · gemini ${geminiKey ? "ok" : "x"} · runway ${runwayKey ? "ok" : "x"} · ffmpeg ${ffmpegPath ? "ok" : "x"}) · 문 ${isOpen() ? "열림" : "초대 코드만"}`);

  // ---- 저장소(Supabase Storage REST) ----
  const sh = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  async function put(bucket, p, body, type) {
    const r = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${p}`, { method: "POST", headers: { ...sh, "Content-Type": type, "x-upsert": "true" }, body });
    if (!r.ok) throw new Error(`storage put ${r.status}`);
    return p;
  }
  async function getPrivate(p) {
    const r = await fetch(`${supabaseUrl}/storage/v1/object/character-private/${p}`, { headers: sh });
    if (!r.ok) throw new Error(`storage get ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  const delPrivate = (paths) => paths.length && fetch(`${supabaseUrl}/storage/v1/object/character-private`, { method: "DELETE", headers: { ...sh, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: paths }) }).catch(() => {});
  const publicUrl = (p) => `${supabaseUrl}/storage/v1/object/public/character-public/${p}`;

  // ---- 표 ----
  const one = (rows) => (Array.isArray(rows) ? rows[0] : null);
  const jobsOf = (petId) => db(`character_jobs?pet_id=eq.${encodeURIComponent(petId)}&order=created_at.desc&limit=1`);
  const jobById = (id) => db(`character_jobs?id=eq.${encodeURIComponent(id)}`).then(one);
  const update = (id, patch) => db(`character_jobs?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: { ...patch, updated_at: nowIso() } });
  async function hasAccess(petId, token) {
    if (typeof petId !== "string" || typeof token !== "string" || token.length < 32) return false;
    const row = one(await db(`character_access?pet_id=eq.${encodeURIComponent(petId)}&select=token_hash`));
    return Boolean(row && row.token_hash === sha(token));
  }
  async function spentToday() {
    const start = new Date(Date.now() + 9 * 3600e3); start.setUTCHours(0, 0, 0, 0); // KST 자정
    const rows = await db(`character_jobs?select=cost&created_at=gte.${new Date(start.getTime() - 9 * 3600e3).toISOString()}`);
    return rows.reduce((s, r) => s + Number(r.cost || 0), 0);
  }
  const view = (j) => j && ({ id: j.id, status: j.status, step: j.step, style: j.style, candidates: (j.candidates || []).map(publicUrl), picked: j.picked, regen: j.regen, regenLeft: Math.max(0, MAX_REGEN - (j.regen || 0)), outputs: j.outputs, error: j.error, createdAt: j.created_at, updatedAt: j.updated_at });

  // ---- 푸시 ----
  async function notify(endpoint, title, body) {
    const device = endpoint && pushDevices.get(endpoint);
    if (device) await sendPush(device, title, body, "/?app&open=character");
  }

  // ---- API ----
  const bad = (res, code, msg) => res.status(code).json({ error: msg });
  const gate = (req, res) => { if (tooMany(req)) { bad(res, 429, "too many"); return false; } if (!dbOk) { bad(res, 503, "db off"); return false; } return true; };

  // 화면 하나가 한 번에 묻는다: 문 열렸나 · 이 강아지는 코드 썼나 · 마지막 작업
  app.get("/api/character/status", async (req, res) => {
    if (!gate(req, res)) return;
    const { petId, token } = req.query;
    const access = await hasAccess(petId, token).catch(() => false);
    const job = typeof petId === "string" && petId ? one(await jobsOf(petId).catch(() => [])) : null;
    const wait = req.query.endpoint ? one(await db(`character_waitlist?endpoint=eq.${encodeURIComponent(req.query.endpoint)}&select=endpoint`).catch(() => [])) : null;
    res.json({ open: isOpen(), ready, access, waiting: Boolean(wait), job: view(job) });
  });

  // [출시되면 알려 주세요] 켜기/끄기 — 푸시 주소만 저장(이름·이메일 없음)
  app.post("/api/character/waitlist", async (req, res) => {
    if (!gate(req, res)) return;
    const { endpoint, petId, on } = req.body || {};
    if (typeof endpoint !== "string" || !/^https:\/\//.test(endpoint)) return bad(res, 400, "endpoint");
    if (on === false) await db(`character_waitlist?endpoint=eq.${encodeURIComponent(endpoint)}`, { method: "DELETE" });
    else await db("character_waitlist", { method: "POST", prefer: "resolution=merge-duplicates", body: { endpoint, pet_id: typeof petId === "string" ? petId.slice(0, 80) : null } });
    res.json({ waiting: on !== false });
  });

  // 초대 코드 → 이 강아지 전용 token(폰에만 저장). 코드는 대소문자·공백 무시
  app.post("/api/character/redeem", async (req, res) => {
    if (!gate(req, res)) return;
    const code = String(req.body?.code || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
    const petId = String(req.body?.petId || "").slice(0, 80);
    if (!code || !petId) return bad(res, 400, "code/petId");
    const inv = one(await db(`character_invites?code=eq.${encodeURIComponent(code)}`));
    if (!inv) return bad(res, 404, "없는 코드예요");
    const already = one(await db(`character_access?pet_id=eq.${encodeURIComponent(petId)}&select=pet_id`));
    if (!already && inv.used >= inv.max_uses) return bad(res, 409, "이미 다 쓴 코드예요");
    const token = randomBytes(24).toString("hex");
    await db("character_access", { method: "POST", prefer: "resolution=merge-duplicates", body: { pet_id: petId, token_hash: sha(token), code, granted_at: nowIso() } });
    if (!already) await db(`character_invites?code=eq.${encodeURIComponent(code)}`, { method: "PATCH", body: { used: inv.used + 1 } });
    res.json({ token });
  });

  // 사진 2~4장(앱이 캔버스로 다시 그려 EXIF 없이 JPEG로 보냄) + 그림체 + 동의 → 작업 등록
  const photos = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024, files: 4 } });
  app.post("/api/character/jobs", photos.array("photos", 4), async (req, res) => {
    if (!gate(req, res)) return;
    if (!ready) return bad(res, 503, "지금은 만들 수 없어요(서버 설정)");
    const { petId, token, style, consent, adult, endpoint } = req.body || {};
    if (!isOpen() && !(await hasAccess(petId, token))) return bad(res, 403, "초대 코드가 필요해요");
    if (!STYLE[style]) return bad(res, 400, "style");
    if (consent !== "1" || adult !== "1") return bad(res, 400, "동의가 필요해요");
    const files = (req.files || []).filter((f) => /^image\/(jpeg|png)$/.test(f.mimetype));
    if (files.length < 2) return bad(res, 400, "사진이 2장 이상 필요해요");
    const last = one(await jobsOf(petId));
    if (last && !["done", "failed"].includes(last.status)) return bad(res, 409, "이미 만드는 중이에요");
    const id = randomUUID();
    const paths = [];
    for (const [i, f] of files.entries()) paths.push(await put("character-private", `${id}/photo-${i + 1}.${f.mimetype === "image/png" ? "png" : "jpg"}`, f.buffer, f.mimetype));
    await db("character_jobs", { method: "POST", body: { id, pet_id: String(petId).slice(0, 80), style, status: "queued", step: "순서를 기다리는 중", photos: paths, endpoint: typeof endpoint === "string" ? endpoint.slice(0, 500) : null } });
    res.json({ job: view(await jobById(id)) });
    setTimeout(tick, 500);
  });

  app.get("/api/character/jobs/:id", async (req, res) => {
    if (!gate(req, res)) return;
    const j = await jobById(req.params.id).catch(() => null);
    if (!j || !(await hasAccess(j.pet_id, req.query.token)) && !isOpen()) return bad(res, 404, "없어요");
    res.json({ job: view(j) });
  });

  // 후보 고르기 → 영상 단계로
  app.post("/api/character/jobs/:id/pick", async (req, res) => {
    if (!gate(req, res)) return;
    const j = await jobById(req.params.id).catch(() => null);
    const picked = Number(req.body?.picked);
    if (!j || !(await hasAccess(j.pet_id, req.body?.token))) return bad(res, 404, "없어요");
    if (j.status !== "pick" || !(picked >= 1 && picked <= (j.candidates || []).length)) return bad(res, 409, "고를 수 있는 상태가 아니에요");
    await update(j.id, { picked, status: "picked", step: "순서를 기다리는 중" });
    res.json({ job: view(await jobById(j.id)) });
    setTimeout(tick, 500);
  });

  // 영상 단계에서 실패한 작업: 사진·후보는 그대로 두고 고른 설정화로 영상만 다시(Gemini 후보 비용 없음)
  app.post("/api/character/jobs/:id/retry", async (req, res) => {
    if (!gate(req, res)) return;
    const j = await jobById(req.params.id).catch(() => null);
    if (!j || !(await hasAccess(j.pet_id, req.body?.token))) return bad(res, 404, "없어요");
    if (j.status !== "failed" || !j.picked || !(j.candidates || []).length) return bad(res, 409, "영상 단계만 다시 할 수 있는 작업이 아니에요");
    await update(j.id, { status: "picked", error: null, step: "순서를 기다리는 중" });
    res.json({ job: view(await jobById(j.id)) });
    setTimeout(tick, 500);
  });

  // 후보 다시 뽑기(MAX_REGEN회)
  app.post("/api/character/jobs/:id/regen", async (req, res) => {
    if (!gate(req, res)) return;
    const j = await jobById(req.params.id).catch(() => null);
    if (!j || !(await hasAccess(j.pet_id, req.body?.token))) return bad(res, 404, "없어요");
    if (j.status !== "pick") return bad(res, 409, "지금은 다시 뽑을 수 없어요");
    if ((j.regen || 0) >= MAX_REGEN) return bad(res, 409, "다시 뽑기를 다 썼어요");
    await update(j.id, { status: "queued", regen: (j.regen || 0) + 1, candidates: [], step: "순서를 기다리는 중" });
    res.json({ job: view(await jobById(j.id)) });
    setTimeout(tick, 500);
  });

  // ---- 생성 단계 ----
  const part = (buf, mime) => ({ inlineData: { mimeType: mime, data: buf.toString("base64") } });
  async function gen(parts, addCost) {
    const res = await ai.models.generateContent({ model: GEMINI_MODEL, contents: [{ role: "user", parts }], config: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { aspectRatio: "1:1", imageSize: "1K" } } });
    const img = (res.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
    await addCost(GEMINI_PRICE);
    if (!img) throw new Error(`그림이 안 나왔어요(${res.candidates?.[0]?.finishReason || "?"})`);
    return Buffer.from(img.inlineData.data, "base64");
  }
  async function styleRefs(style) {
    if (style !== "hand") return [];
    const dir = path.join(path.dirname(new URL(import.meta.url).pathname), "character-refs");
    const files = (await fs.readdir(dir).catch(() => [])).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort().slice(0, 3);
    return Promise.all(files.map(async (f) => part(await fs.readFile(path.join(dir, f)), f.endsWith(".png") ? "image/png" : "image/jpeg")));
  }
  async function runway(jpegBuf, promptText, duration, addCost) {
    const H = { Authorization: `Bearer ${runwayKey}`, "X-Runway-Version": "2024-11-06", "Content-Type": "application/json" };
    const uri = `data:image/jpeg;base64,${jpegBuf.toString("base64")}`;
    const r = await fetch(`${RUNWAY}/v1/image_to_video`, { method: "POST", headers: H, body: JSON.stringify({ model: "kling3.0_standard", ratio: "960:960", duration, audio: false, promptImage: [{ uri, position: "first" }, { uri, position: "last" }], promptText }) });
    const t = await r.json();
    if (!r.ok || !t.id) throw new Error(`영상 요청 실패 ${r.status}`);
    for (let i = 0; i < 72; i++) { // 최대 6분, 5초 간격
      await new Promise((ok) => setTimeout(ok, 5000));
      const s = await (await fetch(`${RUNWAY}/v1/tasks/${t.id}`, { headers: H })).json();
      if (s.status === "SUCCEEDED") { await addCost((s.cost?.credits ?? duration * 9) / 100); return Buffer.from(await (await fetch(s.output[0])).arrayBuffer()); }
      if (["FAILED", "CANCELLED"].includes(s.status)) throw new Error(`영상 실패: ${s.failureCode || s.status}`);
    }
    throw new Error("영상이 6분 넘게 안 끝났어요");
  }
  // 초록 빼기 → 720px stacked(위 색·아래 알파) mp4. 포스터는 첫 프레임 투명 PNG 512px
  // 끝의 format=rgba: ffmpeg 6.0(ffmpeg-static)은 scale 뒤에 알파를 떨어뜨려 alphaextract가 "Requested planes not available"로 죽는다(11/17 첫 서버 시험)
  const CK = "format=rgba,chromakey=0x00FF00:0.22:0.06,despill=type=green,scale=720:720:flags=lanczos,format=rgba";
  // ffmpeg 실패는 stderr 끝부분을 오류 문장에 남긴다(11/17 첫 서버 시험: "Command failed"만 보여 원인을 못 봄)
  async function ff(args) {
    try { await run(ffmpegPath, ["-y", "-hide_banner", "-loglevel", "error", ...args], { maxBuffer: 4 * 1024 * 1024 }); }
    catch (e) { throw new Error(`ffmpeg: ${String(e.stderr || e.message).trim().split("\n").slice(-3).join(" | ").slice(0, 400)}`); }
  }
  async function keyVideo(raw, base) {
    await fs.writeFile(`${base}-raw.mp4`, raw);
    await ff(["-i", `${base}-raw.mp4`, "-filter_complex", `[0:v]${CK},split[c][a];[a]alphaextract,format=yuv420p[al];[c]format=yuv420p[cc];[cc][al]vstack,format=yuv420p`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", `${base}-stacked.mp4`]);
    return fs.readFile(`${base}-stacked.mp4`);
  }
  async function poster(raw, base) {
    await ff(["-i", `${base}-raw.mp4`, "-vf", `${CK},scale=512:512`, "-frames:v", "1", "-pix_fmt", "rgba", `${base}-poster.png`]);
    return fs.readFile(`${base}-poster.png`);
  }
  // 초록판을 Runway에 JPEG로(PNG도 되지만 data URI를 작게)
  async function toJpeg(pngBuf, base) {
    await fs.writeFile(`${base}.png`, pngBuf);
    await ff(["-i", `${base}.png`, "-vf", "scale=960:960", "-q:v", "3", `${base}.jpg`]);
    return fs.readFile(`${base}.jpg`);
  }
  // 켤 때 한 번: 이 ffmpeg가 필요한 필터·인코더를 가졌는지 로그로(없으면 서버 시험 전에 안다)
  if (ffmpegPath) {
    Promise.all([run(ffmpegPath, ["-hide_banner", "-filters"]), run(ffmpegPath, ["-hide_banner", "-encoders"]), run(ffmpegPath, ["-version"])])
      .then(([f, e, v]) => {
        const miss = ["chromakey", "despill", "alphaextract", "vstack"].filter((n) => !f.stdout.includes(` ${n} `)).concat(e.stdout.includes("libx264") ? [] : ["libx264"]);
        console.log(`[character] ffmpeg ${v.stdout.split("\n")[0].slice(0, 40)}${miss.length ? ` · 없음: ${miss.join(",")}` : " · 필터·인코더 OK"}`);
      })
      .catch((e) => console.error("[character] ffmpeg 점검 실패:", e.message.slice(0, 200)));
  }

  async function doSheet(j) {
    let spent = 0; const bump = async (d) => { spent += d; await update(j.id, { cost: Number(j.cost || 0) + spent }).catch(() => {}); };
    await update(j.id, { status: "sheet", step: "사진을 보고 설정화 후보를 그리는 중 (3~5분)" });
    const photos = await Promise.all(j.photos.map(async (p) => part(await getPrivate(p), p.endsWith(".png") ? "image/png" : "image/jpeg")));
    const refs = await styleRefs(j.style);
    const refNote = refs.length ? `The last ${refs.length} images are STYLE references only (not this dog): copy their art style, line quality, colors and background, not their subject or breed.\n\nDraw this dog as a character in that style: ` : "Draw this dog as a character: ";
    const prompt = `${IDENTITY}\n\n${refNote}${STYLE[j.style]}. One character only, square image.`;
    const out = [];
    for (let i = 1; i <= 4; i++) {
      const buf = await gen([...photos, ...refs, { text: prompt + (i > 1 ? ` Variation ${i}: a slightly different but equally faithful interpretation.` : "") }], bump);
      out.push(await put("character-public", `${j.id}/cand-${j.regen || 0}-${i}.png`, buf, "image/png"));
      await update(j.id, { step: `설정화 후보 ${i}/4 완성` });
    }
    await update(j.id, { status: "pick", candidates: out, step: "후보 4장이 나왔어요. 하나 골라 주세요" });
    await notify(j.endpoint, "🐾 캐릭터 후보가 나왔어요", "4장 중 가장 닮은 아이를 골라 주세요");
  }

  async function doRender(j) {
    let spent = 0; const bump = async (d) => { spent += d; await update(j.id, { cost: Number(j.cost || 0) + spent }).catch(() => {}); };
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mc-char-"));
    try {
      await update(j.id, { status: "render", step: "고른 설정화로 움직임을 만드는 중 (10~15분)" });
      const sheetPath = j.candidates[j.picked - 1];
      const sheet = Buffer.from(await (await fetch(publicUrl(sheetPath))).arrayBuffer());
      const style = STYLE[j.style];
      const green = await gen([part(sheet, "image/png"), { text: GREEN }], bump);
      await update(j.id, { step: "엎드린 모습을 그리는 중" });
      const lie = await gen([part(green, "image/png"), { text: `The image is the official character sheet of this dog character. Draw the SAME character (identical face, markings, colors, line style, background) in a new pose: ${LIE}. Keep the exact art style: ${style}. Square image, character centered, nothing else.` }], bump);
      await update(j.id, { step: "움직이는 영상 2편을 만드는 중 (5~10분)" });
      const [idleJ, lieJ] = await Promise.all([toJpeg(green, path.join(tmp, "idle")), toJpeg(lie, path.join(tmp, "lie"))]);
      const [idleRaw, thinkRaw] = await Promise.all([
        runway(idleJ, motion(j.style, "idle"), DURATION[j.style].idle, bump),
        runway(lieJ, motion(j.style, "thinking"), DURATION[j.style].thinking, bump),
      ]);
      await update(j.id, { step: "배경을 지우고 앱용으로 바꾸는 중" });
      const idleMp4 = await keyVideo(idleRaw, path.join(tmp, "idle"));
      const thinkMp4 = await keyVideo(thinkRaw, path.join(tmp, "think"));
      const posterPng = await poster(idleRaw, path.join(tmp, "idle"));
      const base = `${j.id}/v${j.regen || 0}-${j.picked}`;
      const outputs = {
        style: j.style,
        sheet: publicUrl(sheetPath),
        idle: publicUrl(await put("character-public", `${base}-idle.mp4`, idleMp4, "video/mp4")),
        thinking: publicUrl(await put("character-public", `${base}-thinking.mp4`, thinkMp4, "video/mp4")),
        poster: publicUrl(await put("character-public", `${base}-poster.png`, posterPng, "image/png")),
        madeAt: nowIso(),
      };
      await update(j.id, { status: "done", outputs, step: "완성!" });
      await delPrivate(j.photos);
      await notify(j.endpoint, "🎉 우리 아이 캐릭터가 완성됐어요", "앱을 열면 홈 화면에서 움직여요");
    } finally {
      fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  }

  // ---- 일꾼: 한 번에 하나씩(비용·Runway 동시 호출 제한) ----
  let busy = false;
  async function tick() {
    if (!ready || busy) return;
    busy = true;
    try {
      const j = one(await db("character_jobs?status=in.(queued,picked)&order=created_at.asc&limit=1"));
      if (!j) return;
      if ((await spentToday()) >= DAILY_CAP) { await update(j.id, { step: "오늘 만들 수 있는 양을 다 썼어요. 내일 이어서 만들어요" }); return; }
      try {
        if (j.status === "queued") await doSheet(j);
        else await doRender(j);
      } catch (e) {
        console.error("[character] job", j.id, e.message);
        await update(j.id, { status: "failed", error: String(e.message).slice(0, 200), step: "실패했어요" }).catch(() => {});
        await delPrivate(j.photos || []);
        await notify(j.endpoint, "😿 캐릭터 만들기가 실패했어요", "앱에서 다시 시도해 주세요. 사진은 지웠어요");
      }
    } catch (e) {
      console.error("[character] tick:", e.message);
    } finally {
      busy = false;
    }
  }
  if (ready) setInterval(tick, 20_000).unref();
  return { tick };
}
