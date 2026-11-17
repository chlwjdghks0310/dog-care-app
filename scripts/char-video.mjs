#!/usr/bin/env node
// 3D 캐릭터 움직임 손 시험: 초록 배경 그림 1장 → Runway API(kling3.0_standard, 960:960, 5초, 첫=끝 프레임) → ffmpeg 키잉 → 투명 영상.
// 키는 .env.local의 RUNWAY_API_KEY(출력하지 않음). 한 번 실행 = 영상 1편 = 약 $0.45. 재시도 루프 없음(실패하면 그냥 멈춤).
//
//   [DUR=초] node scripts/char-video.mjs <초록배경.png> [동작 설명] [출력이름]   → 같은 폴더에 <이름>-raw.mp4(원본) · <이름>-stacked.mp4(위 색·아래 알파, 앱용) · <이름>-alpha.webm(크롬 확인용) · <이름>-poster.png
//
// 초록 배경 그림은 `node scripts/char-test.mjs green <설정화.png>`로 만든다. ffmpeg는 whisper venv의 imageio-ffmpeg 바이너리.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(decodeURIComponent(new URL("..", import.meta.url).pathname));
const PY = `${process.env.HOME}/.venvs/whisper/bin/python`;
const API = "https://api.dev.runwayml.com";
const H = () => ({ Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`, "X-Runway-Version": "2024-11-06", "Content-Type": "application/json" });
const PRICE = 0.45;

function loadEnv() {
  for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  if (!process.env.RUNWAY_API_KEY) throw new Error(".env.local에 RUNWAY_API_KEY가 없어요 — 코워크가 넣은 뒤 다시 실행");
}
const ffmpeg = () => execFileSync(PY, ["-I", "-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim();

// Runway에는 JPEG(≤1MB쯤)로 보낸다. 출력은 mp4라 입력 PNG 무손실은 의미 없음.
function toJpegDataUri(png) {
  const jpg = png.replace(/\.png$/, ".runway-in.jpg");
  execFileSync(PY, ["-I", "-c", `
import sys; from PIL import Image
im = Image.open(sys.argv[1]).convert("RGB"); im.thumbnail((960, 960)); im.save(sys.argv[2], "JPEG", quality=92)`, png, jpg]);
  return `data:image/jpeg;base64,${fs.readFileSync(jpg).toString("base64")}`;
}

async function runway(uri, promptText, duration) {
  const need = duration * 9; // 9cr/초
  const org = await (await fetch(`${API}/v1/organization`, { headers: H() })).json();
  if (!(org.creditBalance >= need)) throw new Error(`Runway 크레딧이 부족해요(${org.creditBalance ?? "?"}cr, ${duration}초 = ${need}cr)`);
  console.log(`크레딧 ${org.creditBalance}cr · ${duration}초 영상 1편 만들기(약 $${(need / 100).toFixed(2)})`);
  const body = {
    model: "kling3.0_standard", ratio: "960:960", duration, audio: false,
    promptImage: [{ uri, position: "first" }, { uri, position: "last" }],
    promptText,
  };
  const r = await fetch(`${API}/v1/image_to_video`, { method: "POST", headers: H(), body: JSON.stringify(body) });
  const t = await r.json();
  if (!r.ok || !t.id) throw new Error(`작업 생성 실패 ${r.status}: ${JSON.stringify(t).slice(0, 300)}`);
  console.log("작업", t.id, "예상", t.estimatedCost?.credits, "cr");
  for (let i = 0; i < 60; i++) { // 최대 5분, 5초 간격(문서: 5초보다 자주 묻지 말 것)
    await new Promise((res) => setTimeout(res, 5000));
    const s = await (await fetch(`${API}/v1/tasks/${t.id}`, { headers: H() })).json();
    process.stdout.write(`\r${s.status} ${Math.round((s.progress || 0) * 100)}%   `);
    if (s.status === "SUCCEEDED") { console.log(); return { url: s.output[0], credits: s.cost?.credits }; }
    if (["FAILED", "CANCELLED"].includes(s.status)) throw new Error(`\n${s.status}: ${s.failureCode || ""} ${s.failure || ""}`);
  }
  throw new Error("5분 넘게 안 끝나서 멈춤(작업은 Runway에 남아 있음)");
}

// 초록 빼기 → 위 색(검정 배경 위 합성)·아래 알파를 세로로 붙인 mp4(앱 stacked 플레이어용) + 알파 webm(확인용) + 포스터
function key(ff, raw, base) {
  const ck = "format=rgba,chromakey=0x00FF00:0.22:0.06,despill=type=green";
  execFileSync(ff, ["-y", "-loglevel", "error", "-i", raw,
    "-filter_complex", `[0:v]${ck},split[c][a];[a]alphaextract,format=yuv420p[al];[c]format=yuv420p[cc];[cc][al]vstack,format=yuv420p`,
    "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", `${base}-stacked.mp4`]);
  execFileSync(ff, ["-y", "-loglevel", "error", "-i", raw, "-vf", ck, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "1M", "-an", `${base}-alpha.webm`]);
  execFileSync(ff, ["-y", "-loglevel", "error", "-i", raw, "-vf", ck, "-frames:v", "1", "-pix_fmt", "rgba", `${base}-poster.png`]);
}

(async () => {
  loadEnv();
  const file = path.resolve(process.argv[2] || "");
  if (!file.endsWith(".png") || !fs.existsSync(file)) { console.log("사용법: node scripts/char-video.mjs <초록배경.png> [동작 설명]"); process.exit(1); }
  const motion = process.argv[3] || "The dog sits still and breathes softly, tail wags gently, ears twitch once, blinks twice. Subtle idle animation, seamless loop, the pose at the end matches the start exactly.";
  const prompt = `${motion} Static camera, no zoom, no pan. Keep the flat pure green background completely unchanged and uniform. No text, no other objects, no new elements.`;
  const base = process.argv[4] ? path.join(path.dirname(file), process.argv[4]) : file.replace(/\.png$/, ""); // 3번째 인자 = 출력 이름(예: idle2)
  const duration = Math.min(15, Math.max(3, Number(process.env.DUR) || 5)); // DUR=10 node scripts/char-video.mjs … (3~15초)
  const { url, credits } = await runway(toJpegDataUri(file), prompt, duration);
  const raw = `${base}-raw.mp4`;
  fs.writeFileSync(raw, Buffer.from(await (await fetch(url)).arrayBuffer()));
  console.log("저장", path.basename(raw), `(${(fs.statSync(raw).size / 1024).toFixed(0)}KB)`);
  key(ffmpeg(), raw, base);
  for (const s of ["-stacked.mp4", "-alpha.webm", "-poster.png"]) console.log("저장", path.basename(base + s), `(${(fs.statSync(base + s).size / 1024).toFixed(0)}KB)`);
  const cost = credits != null ? credits / 100 : PRICE;
  fs.appendFileSync(path.join(ROOT, "..", "점검", "캐릭터-시험", "비용.log"), `${new Date().toISOString().slice(0, 16)} video ${path.relative(ROOT, file)} → $${cost.toFixed(2)} (Runway ${credits ?? "~45"}cr)\n`);
  console.log("이번 비용 약", `$${cost.toFixed(2)}`);
})().catch((e) => { console.error("실패:", e.message); process.exit(1); });
