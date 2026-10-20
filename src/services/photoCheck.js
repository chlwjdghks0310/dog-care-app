import { STOOL } from "./records";

// AI가 돌려준 변 사진 관찰 결과를 배변 기록 칸으로 옮긴다. 모르는 값은 버리고(지어낸 값이 칸에 들어가지 않게),
// 피가 보인다고 했으면 대변 상태를 "피 섞임"으로. 반환값은 보호자가 확인·수정한 뒤 저장한다.
const LOOK = ["안 보임", "보임", "판단 어려움"];
const SHAPES = ["정상", "무름", "설사", "딱딱함"];
const text = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function normalizeStoolResult(r) {
  if (!r || r.is_stool !== true) return { ok: false, retake: text(r?.retake) || "변이 잘 보이게 밝은 곳에서 가까이 다시 찍어 주세요." };
  const look = (v) => (LOOK.includes(v) ? v : "판단 어려움");
  const score = Number.isInteger(r.fecal_score) && r.fecal_score >= 1 && r.fecal_score <= 7 ? r.fecal_score : null;
  const obs = {
    shape: SHAPES.includes(r.shape) ? r.shape : "판단 어려움",
    score,
    color: text(r.color, 30) || "판단 어려움",
    blood: look(r.blood),
    mucus: look(r.mucus),
    foreign: look(r.foreign),
    foreignNote: text(r.foreign_note, 80),
    flags: Array.isArray(r.flags) ? r.flags.map((f) => text(f, 80)).filter(Boolean).slice(0, 4) : [],
    summary: text(r.summary, 300),
  };
  const stool = obs.blood === "보임" ? "피 섞임" : SHAPES.includes(obs.shape) ? obs.shape : "";
  return {
    ok: true,
    obs,
    fill: {
      ...(STOOL.includes(stool) ? { stool } : {}),
      photoNote: [
        obs.score && `대변 점수 ${obs.score}/7`,
        `색 ${obs.color}`,
        `피 ${obs.blood}`,
        `점액 ${obs.mucus}`,
        `이물질 ${obs.foreign}${obs.foreignNote ? `(${obs.foreignNote})` : ""}`,
      ].filter(Boolean).join(" · "),
      photoFlags: obs.flags,
    },
  };
}
