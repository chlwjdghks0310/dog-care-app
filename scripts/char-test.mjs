#!/usr/bin/env node
// 우리 아이 캐릭터 손 시험(11/16 계획, 점검/2026-11-16-캐릭터-계획.md)
// 사진 3~4장 + 스타일 견본 → 설정화 후보 4장 → (고른 뒤) 컷 생성. Gemini 3 Pro Image, 키는 .env.local의 GEMINI_API_KEY(출력하지 않음).
//
//   node scripts/char-test.mjs sheet <이름> <3d|hand>              후보 4장 → 점검/캐릭터-시험/<이름>/out/<style>/cand-N.png
//   node scripts/char-test.mjs cuts  <이름> <3d|hand> <설정화파일> [컷 수]   컷 8개(hand는 컷마다 3프레임) → out/<style>/cut-<키>-fN.png
//   node scripts/char-test.mjs samples crayon|sticker [n]           사진 없이 그림체 견본만(후보 B 만들 때) → 점검/캐릭터-시험/스타일-손그림/후보B-*.png
//
//   node scripts/char-test.mjs green <png>                          같은 그림을 초록 배경으로 → <이름>-green.png (Runway 영상 입력, char-video.mjs)
// cuts는 이미 있는 컷(마지막 프레임 파일이 있으면)은 건너뛴다.
//
// 입력 사진은 EXIF를 지우고 1536px로 줄인 사본(out/_in/)만 보낸다. 지킬 것: 사진은 Kling 웹에 올리지 않는다, 비용은 장당 $0.134로 적어 둔다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const ROOT = path.resolve(decodeURIComponent(new URL("..", import.meta.url).pathname));
const TEST = path.join(ROOT, "..", "점검", "캐릭터-시험");
const PY = `${process.env.HOME}/.venvs/whisper/bin/python`;
const MODEL = "gemini-3-pro-image";
const PRICE = 0.134;

function loadEnv() {
  const f = path.join(ROOT, ".env.local");
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  if (!process.env.GEMINI_API_KEY) throw new Error(".env.local에 GEMINI_API_KEY가 없어요");
}

const IMG = /\.(jpe?g|png|heic|webp)$/i;
const listImages = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => IMG.test(f) && !f.startsWith(".")).sort().map((f) => path.join(dir, f)) : []);

// EXIF 제거 + 긴 변 1536px + JPEG. PIL(whisper venv)로. 원본은 건드리지 않는다.
function sanitize(src, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const dst = path.join(outDir, path.basename(src).replace(/\.[^.]+$/, "") + ".jpg");
  const code = `
import sys
from PIL import Image, ImageOps
im = Image.open(sys.argv[1]); im = ImageOps.exif_transpose(im).convert("RGB"); im.thumbnail((1536, 1536))
im.save(sys.argv[2], "JPEG", quality=90)`;
  try { execFileSync(PY, ["-I", "-c", code, src, dst], { stdio: "pipe" }); }
  catch (e) { // HEIC 등 PIL이 못 열면 sips로 먼저 JPEG 변환 뒤 다시
    const tmp = dst + ".tmp.jpg"; execFileSync("sips", ["-s", "format", "jpeg", src, "--out", tmp], { stdio: "pipe" });
    execFileSync(PY, ["-I", "-c", code, tmp, dst], { stdio: "pipe" }); fs.unlinkSync(tmp);
  }
  return dst;
}
const part = (file) => ({ inlineData: { mimeType: file.endsWith(".png") ? "image/png" : "image/jpeg", data: fs.readFileSync(file).toString("base64") } });

const STYLE = {
  "3d": {
    dir: "스타일-3D",
    desc: "soft 3D pastel toy-like render: plush rounded fur, big glossy dark eyes with highlights, gentle studio light, clean plain very light blue-white background, no text, no props, full body sitting facing the camera, centered, like the style reference images",
  },
  // 11/17 사용자: "3D는 마이펫의 이중생활 느낌으로 더 귀엽게" → 스타일 견본 없이(기존 견본이 옛 톤을 끌어당김) 영화풍 설명만으로
  "3d2": {
    dir: null,
    desc: "a 3D animated feature-film character in the style of modern American CG animal comedies: big round head with oversized expressive glossy eyes, small chubby body, exaggerated cute proportions, soft stylized fur with gentle sculpted clumps (NOT photoreal, NOT a plush toy), a charming slightly mischievous smile, bright cheerful three-point lighting, clean plain very light blue-white background, no text, no props, full body sitting facing the camera, centered",
  },
  hand: {
    dir: "스타일-손그림",
    desc: "a child's picture-diary drawing made with wax crayons and colored pencils on cream drawing paper, exactly like the style reference images: visible crayon strokes and paper grain, slightly wobbly hand-drawn pencil outlines, warm and cute, NOT flat vector, NOT clean digital lines, no text, full body sitting facing the camera, centered",
  },
};
// 견본 견종을 섞는다(11/17: 포메 견본 3장만 쓰니 흰 말티즈·검은 믹스견에 포메 무늬가 섞여 나옴)
const SAMPLE_BREEDS = ["a golden retriever", "a grey miniature schnauzer", "a brown dachshund"];
const SAMPLES = {
  crayon: (i) => `a children's picture-diary style drawing of ${SAMPLE_BREEDS[(i - 1) % SAMPLE_BREEDS.length]} sitting and facing the camera, drawn with wax crayons and colored pencils on cream drawing paper, visible crayon texture and slightly wobbly outlines, warm and cute, simple, no text, no sun, no grass, no doodles, full body centered`,
  sticker: "a flat hand-drawn sticker illustration of a small fluffy black-and-tan pomeranian puppy sitting and facing the camera, thick dark-brown ink outline, soft pastel fills, almost no shading, cream paper background, cute simple face, no text, full body centered",
};
// 11/17: 예시로 적었던 "black-and-tan" 문구가 검은 개에 황갈 무늬를 만들어 냄 → 예시 삭제, "사진에 없는 무늬 금지" 명시
const IDENTITY = "The first photos are all the SAME real dog. Keep this exact dog's identity: breed, size impression, body shape, ear shape and set, eye color, muzzle (including any grey hairs), and the coat colors EXACTLY as in the photos. If the photos show a solid single-color coat, draw a solid single-color coat — do NOT invent markings, eyebrows, tan points or patches that are not in the photos. Do not change the breed. Do not add collars, leashes, bows, hair clips, clothes or props even if the photos have them.";

const CUTS = [
  ["idle", "sitting calmly, relaxed happy face"],
  ["happy", "jumping with joy, tail wagging, big smile, ears up"],
  ["sleepy", "curled up lying down, eyes closed, tiny z z z bubble made of simple shapes (no letters)"],
  ["worried", "sitting, slightly worried face, ears back, small sweat drop"],
  ["meal", "sitting in front of a small food bowl, looking at it eagerly"],
  ["walk", "walking happily, mid-step, no leash"],
  ["birthday", "sitting, wearing a small party hat, happy"],
  ["proud", "sitting proudly, chest out, a small band-aid on one front leg"],
];

async function gen(ai, parts, { aspect = "1:1", size = "1K" } = {}) {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { aspectRatio: aspect, imageSize: size } },
  });
  const out = res.candidates?.[0]?.content?.parts || [];
  const img = out.find((p) => p.inlineData);
  const text = out.filter((p) => p.text).map((p) => p.text).join(" ").slice(0, 200);
  if (!img) throw new Error(`이미지가 안 왔어요: ${res.candidates?.[0]?.finishReason || ""} ${text}`);
  return { buf: Buffer.from(img.inlineData.data, "base64"), text };
}

let spent = 0;
const save = (file, buf) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf); spent += PRICE; console.log("저장", path.relative(TEST, file)); };

async function sheet(ai, name, style) {
  const S = STYLE[style]; if (!S) throw new Error("style은 3d, 3d2 또는 hand");
  const dogDir = path.join(TEST, name);
  const photos = listImages(dogDir).slice(0, 5);
  if (photos.length < 2) throw new Error(`${dogDir}에 사진이 2장 이상 있어야 해요`);
  const refs = S.dir ? listImages(path.join(TEST, S.dir)).slice(0, 3) : [];
  if (S.dir && !refs.length) throw new Error(`${S.dir}에 스타일 견본이 없어요`);
  const inDir = path.join(dogDir, "out", "_in");
  const clean = photos.map((p) => sanitize(p, inDir));
  console.log(`사진 ${clean.length}장(EXIF 제거) · 스타일 견본 ${refs.length}장 · 후보 4장 만들기 (${style})`);
  const refNote = refs.length ? `The last ${refs.length} images are STYLE references only (not this dog): copy their art style, line quality, colors and background, not their subject.\n\nDraw this dog as a character in that style: ` : "Draw this dog as a character: ";
  const prompt = `${IDENTITY}\n\n${refNote}${S.desc}. One character only, square image.`;
  for (let i = 1; i <= 4; i++) {
    const { buf } = await gen(ai, [...clean.map(part), ...refs.map(part), { text: prompt + (i > 1 ? ` Variation ${i}: a slightly different but equally faithful interpretation.` : "") }]);
    save(path.join(dogDir, "out", style, `cand-${i}.png`), buf);
  }
}

async function cuts(ai, name, style, refFile, limit = CUTS.length) {
  const S = STYLE[style]; if (!S) throw new Error("style은 3d 또는 hand");
  if (!fs.existsSync(refFile)) throw new Error(`설정화 파일이 없어요: ${refFile}`);
  const frames = style === "hand" ? 3 : 1;
  const outDir = path.join(TEST, name, "out", style);
  console.log(`컷 ${Math.min(limit, CUTS.length)}개 × ${frames}프레임 (${style}), 설정화 ${path.basename(refFile)}`);
  for (const [key, pose] of CUTS.slice(0, limit)) {
    if (fs.existsSync(path.join(outDir, `cut-${key}-f${frames}.png`))) { console.log("이미 있음, 건너뜀:", key); continue; }
    let prev = null;
    for (let f = 1; f <= frames; f++) {
      const parts = [part(refFile)];
      let text;
      if (f === 1) text = `The image is the official character sheet of this dog character. Draw the SAME character (identical face, markings, colors, line style, background) in a new pose: ${pose}. Keep the exact art style: ${S.desc}. Square image, character centered, nothing else.`;
      else { parts.push(part(prev)); text = `The first image is the character sheet, the second is frame ${f - 1} of a hand-drawn animation. Redraw frame ${f - 1} EXACTLY: same pose, same composition, same colors — only the natural tiny wobble of hand-redrawn lines may differ, as in a flip-book. No new elements.`; }
      const { buf } = await gen(ai, [...parts, { text }]);
      const file = path.join(outDir, `cut-${key}-f${f}.png`); save(file, buf); prev = file;
    }
  }
}

async function samples(ai, kind, n = 3) {
  const p = SAMPLES[kind]; if (!p) throw new Error("samples는 crayon 또는 sticker");
  const dir = path.join(TEST, "스타일-손그림");
  for (let i = 1; i <= n; i++) {
    const { buf } = await gen(ai, [{ text: `${typeof p === "function" ? p(i) : p}. Sample ${i}.` }]);
    save(path.join(dir, `후보B-${kind}-${i}.png`), buf);
  }
}

// 영상(Runway) 입력용: 같은 그림을 순수 초록(#00FF00) 배경으로 다시 그림 → 옆에 <이름>-green.png. 그 뒤 scripts/char-video.mjs가 키잉한다.
async function green(ai, file) {
  if (!fs.existsSync(file)) throw new Error(`파일이 없어요: ${file}`);
  const { buf } = await gen(ai, [part(file), { text: "Redraw this exact image with ONLY one change: replace the entire background with a flat, uniform, pure bright green (#00FF00) chroma-key screen. Keep the character pixel-identical: same pose, size, position, colors, lighting, outline and shadow under it. No green tint or reflection on the character, no text, nothing else." }]);
  save(file.replace(/\.png$/, "-green.png"), buf);
}

(async () => {
  loadEnv();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const [cmd, a, b, c, d] = process.argv.slice(2);
  if (cmd === "sheet") await sheet(ai, a, b);
  else if (cmd === "cuts") await cuts(ai, a, b, c, d ? Number(d) : undefined);
  else if (cmd === "samples") await samples(ai, a, Number(b) || 3);
  else if (cmd === "green") await green(ai, path.resolve(a));
  else if (cmd === "pose") { // pose <설정화> <3d|3d2|hand> "<자세 설명>" <출력.png> — 컷 하나만(영상 시작 자세용, 예: 고민 중은 엎드린 자세)
    const S = STYLE[b]; const { buf } = await gen(ai, [part(path.resolve(a)), { text: `The image is the official character sheet of this dog character. Draw the SAME character (identical face, markings, colors, line style, background) in a new pose: ${c}. Keep the exact art style: ${S.desc}. Square image, character centered, nothing else.` }]);
    save(path.resolve(d), buf);
  }
  else { console.log("사용법은 파일 머리 주석을 보세요"); process.exit(1); }
  const logLine = `${new Date().toISOString().slice(0, 16)} ${process.argv.slice(2).join(" ")} → $${spent.toFixed(2)}\n`;
  fs.appendFileSync(path.join(TEST, "비용.log"), logLine); console.log("이번 비용 약", `$${spent.toFixed(2)}`);
})().catch((e) => { console.error("실패:", e.message); process.exit(1); });
