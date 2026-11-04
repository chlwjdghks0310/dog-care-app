import assert from "node:assert/strict";
import { isEmergency, findInfo, looksLikeQuestion } from "../src/services/infoSearch.js";
import { INFO_CARDS } from "../src/data/infoCards.js";
import { GUIDEBOOK_CHAPTERS } from "../src/data/guidebookChapters.js";

const firstCardId = (q) => findInfo(q).find((r) => r.type === "card")?.card.id;

assert.ok(isEmergency("초콜릿 한 조각 먹었어"), "초콜릿 → 응급");
assert.ok(isEmergency("경련해요"), "경련 → 응급");
assert.equal(firstCardId("아침에 노란 거품 토했어"), "vomit-diarrhea");
assert.equal(firstCardId("사료 언제 바꿔?"), "food-switch");
assert.equal(isEmergency("산책 20분 했어"), null);
assert.equal(looksLikeQuestion("산책 20분 했어"), false);
assert.equal(looksLikeQuestion("사료 언제 바꿔?"), true);

const chapters = new Set(GUIDEBOOK_CHAPTERS.map((c) => c.chapter));
for (const c of INFO_CARDS) {
  assert.ok(c.sources.length && c.sources.every((s) => /^https:\/\//.test(s.url)), `${c.id} 출처`);
  assert.ok(c.vetWhen.length, `${c.id} 병원 연락`);
  assert.ok(!c.guidebook || chapters.has(c.guidebook.chapter), `${c.id} 가이드북 장`);
  const text = JSON.stringify(c);
  for (const bad of ["괜찮아요", "정상이에요", "안심"]) assert.ok(!text.includes(bad), `${c.id}에 "${bad}"`);
}
console.log(`정보 검색 확인 통과 (카드 ${INFO_CARDS.length}개, 가이드북 ${GUIDEBOOK_CHAPTERS.length}장)`);
