// 질문 → 응급 카드 / 정보 카드 / 가이드북 장 찾기. AI 없이 우리 자료 안에서만 찾는다.
import { INFO_CARDS } from "../data/infoCards.js";
import { GUIDEBOOK_CHAPTERS } from "../data/guidebookChapters.js";
import { EMERGENCY } from "../data/emergency.js";

// 띄어쓰기·문장부호를 지우고 소문자로. "토 했어요!" → "토했어요"
const norm = (s) => String(s || "").toLowerCase().replace(/[\s.,!?~·…'"()\[\]{}:;\-_/]+/g, "");

// 키워드 한 개가 맞으면 점수(글자 수, 길수록 구체적), 아니면 0.
// 붙여 쓴 키워드는 그대로 이어져 있어야 하고, 띄어 쓴 키워드는 조각이 모두 들어 있으면 된다("사료 바꿔" ↔ "사료 언제 바꿔?").
// ponytail: 글자 포함 검사라 어미 변화(했어/했는데/먹었어)는 앞부분만 키워드로 두면 잡히지만, 띄어 쓴 조각은 순서·거리를 안 본다. 오탐이 늘면 형태소 분석이나 조각 간 거리 제한으로.
function hit(text, keyword) {
  const parts = String(keyword).split(/\s+/).map(norm).filter(Boolean);
  return parts.every((p) => text.includes(p)) ? parts.join("").length : 0;
}

const scoreOf = (text, keywords) => keywords.reduce((sum, k) => sum + hit(text, k), 0);

/** 응급 단어가 있으면 그 단어, 없으면 null */
export function isEmergency(text) {
  const t = norm(text);
  if (!t) return null;
  return EMERGENCY.keywords.find((k) => hit(t, k)) || null;
}

/** 점수 순 [{ type:"card", card } | { type:"guidebook", chapter }]. 같은 점수면 카드가 먼저, 카드가 이미 가리키는 장은 뺀다. */
export function findInfo(text, { limit = 3 } = {}) {
  const t = norm(text);
  if (!t) return [];
  const cards = INFO_CARDS.map((card) => ({ type: "card", card, score: scoreOf(t, card.keywords) + 0.5 }));
  const chapters = GUIDEBOOK_CHAPTERS.map((chapter) => ({ type: "guidebook", chapter, score: scoreOf(t, chapter.keywords) }));
  const ranked = [...cards, ...chapters].filter((r) => r.score >= 1).sort((a, b) => b.score - a.score);
  const out = [];
  const linked = new Set();
  for (const r of ranked) {
    if (out.length >= limit) break;
    if (r.type === "guidebook" && linked.has(r.chapter.chapter)) continue;
    if (r.type === "card" && r.card.guidebook) linked.add(r.card.guidebook.chapter);
    out.push(r.type === "card" ? { type: "card", card: r.card } : { type: "guidebook", chapter: r.chapter });
  }
  return out;
}

// ponytail: 끝의 "?"와 자주 쓰는 물음 말투만 본다. "토했는데 병원 가야 하나" 같은 건 잡지만 물음표 없는 평서형 질문("사료 바꾸는 법")은 못 잡는다 — 그땐 findInfo 결과가 있는지로 보완.
const QUESTION_HINTS = ["왜", "어떻게", "어떡", "어쩌", "괜찮", "돼요", "되나", "되요", "될까", "나요", "할까", "까요", "을까", "뭐", "무엇", "언제", "얼마나", "몇번", "몇시간", "몇그램", "인가", "일까", "는지", "알려줘", "궁금", "해야해", "가야해", "가야하", "해야하"];

/** 기록 문장이 아니라 질문처럼 보이면 true */
export function looksLikeQuestion(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  if (/[?？]$/.test(raw)) return true;
  const t = norm(raw);
  return QUESTION_HINTS.some((h) => t.includes(h));
}
