// 월령별 가이드 카드 모양 검사: npm test — 칸이 다 있고, 영역이 앱에 있는 것이고, id가 겹치지 않고, 출처 주소가 https이고, 약 용량 같은 금지 낱말이 없다
import assert from "node:assert/strict";
const { GUIDE_CARDS, GUIDE_AREAS } = await import("../src/data/stageGuide.js");
const areas = new Set(GUIDE_AREAS.map((a) => a.id));
assert.equal(new Set(GUIDE_CARDS.map((c) => c.id)).size, GUIDE_CARDS.length, "id 중복");
const per = {};
for (const c of GUIDE_CARDS) {
  per[c.stage] = (per[c.stage] || 0) + 1;
  assert.ok(areas.has(c.area), `${c.id}: 없는 영역 ${c.area}`);
  assert.ok(c.title && c.title.length <= 40, `${c.id}: 제목`);
  for (const k of ["why", "how", "avoid"]) assert.ok(Array.isArray(c[k]) && c[k].length >= 1 && c[k].every((t) => typeof t === "string" && t.trim()), `${c.id}: ${k}`);
  assert.ok(typeof c.ask === "string" && c.ask.trim(), `${c.id}: ask`);
  assert.ok(Array.isArray(c.sources) && c.sources.length >= 1 && c.sources.every((x) => x.name && /^https:\/\//.test(x.url)), `${c.id}: 출처`);
  if (c.stage >= 5) { const all = [c.title, ...c.why, ...c.how, ...c.avoid, c.ask].join(" "); assert.ok(!/\d+\s?(mg|㎎|밀리그램)|정씩|알씩/.test(all), `${c.id}: 약 용량처럼 보이는 말`); assert.ok(!/진단됩니다|확실히 .*병/.test(all), `${c.id}: 단정`); }
}
for (const s of [1, 2, 3, 4]) assert.ok(per[s] >= 15, `시기 ${s} 카드 ${per[s]}`);
console.log(`stage-guide ok (카드 ${GUIDE_CARDS.length}장: ${Object.entries(per).map(([k, v]) => `${k}=${v}`).join(" ")})`);
