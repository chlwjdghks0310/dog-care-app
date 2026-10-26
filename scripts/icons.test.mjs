// 앱에서 쓰는 아이콘 이름이 모두 components/Ico.jsx에 있는지 — 없으면 화면에 아무것도 안 그려진다(조용히 빈칸)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ico = fs.readFileSync("src/components/Ico.jsx", "utf8");
const map = ico.slice(ico.indexOf("const ICONS = {"), ico.indexOf("};", ico.indexOf("const ICONS = {"))).replace(/\/\/.*$/gm, ""); // 주석 처리된 건 없는 것
const ph = ico.slice(ico.indexOf("const PHOSPHOR = {"), ico.indexOf("};", ico.indexOf("const PHOSPHOR = {")));
const known = new Set([...[...map.matchAll(/(\w+):\s*\w+Icon\b/g)].map((m) => m[1]), ...[...ph.matchAll(/(\w+):\s*[A-Z]\w*/g)].map((m) => m[1])]);
const emojiMap = ico.slice(ico.indexOf("const EMOJI = {"), ico.indexOf("};", ico.indexOf("const EMOJI = {")));

const used = new Map();
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
  const p = path.join(dir, d.name);
  if (d.isDirectory()) return walk(p);
  if (!/\.(jsx?|mjs)$/.test(d.name)) return;
  const src = fs.readFileSync(p, "utf8");
  const add = (n) => used.has(n) || used.set(n, p);
  for (const m of src.matchAll(/<Ico name="(\w+)"/g)) add(m[1]);
  for (const m of src.matchAll(/\bico: "(\w+)"/g)) add(m[1]);
});
walk("src");
for (const m of fs.readFileSync("src/data/categoryIcons.js", "utf8").matchAll(/: "(\w+)",?$/gm)) used.set(m[1], "categoryIcons.js");
for (const m of emojiMap.matchAll(/: "(\w+)"/g)) used.set(m[1], "Ico.jsx EMOJI");
const expSrc = fs.readFileSync("src/services/expenses.js", "utf8");
const choices = expSrc.slice(expSrc.indexOf("CATEGORY_CHOICES = ["), expSrc.indexOf("];", expSrc.indexOf("CATEGORY_CHOICES = [")));
for (const m of choices.matchAll(/\["(\w+)", "/g)) used.set(m[1], "expenses.js CATEGORY_CHOICES");
for (const m of expSrc.matchAll(/ico: "(\w+)"/g)) used.set(m[1], "expenses.js 기본 분류");
for (const m of fs.readFileSync("src/services/expenses.js", "utf8").matchAll(/"[^"\w]+": "(\w+)"/g)) used.set(m[1], "expenses.js EMOJI_ICO");

const missing = [...used].filter(([n]) => !known.has(n));
assert.deepEqual(missing, [], `Ico.jsx에 없는 아이콘 이름: ${missing.map(([n, f]) => `${n}(${f})`).join(", ")}`);
console.log(`아이콘 이름 확인 통과 (${used.size}개)`);
