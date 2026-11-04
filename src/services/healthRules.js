import { addDays, toDateKey, todayKey } from "../utils/date";

// 규칙 기반 병원 안내 — 보호자가 고른 값만 보고, 정해 둔 문구로 "병원에 연락해 보세요"만 말한다(진단·점수 판정 없음).
// 근거: 자료용 2026-11-02-구토-설사.md(PetMD·VCA: 피·검은 변·물 같은 설사가 이어짐 → 병원), recordReactions.js 안내 문구.
// 반환은 화면에 그대로 보여 줄 문장 배열(없으면 []). 같은 문장은 한 번만.

export const STOOL_MSG = {
  blood: "피가 보이면 사진을 가지고 동물병원에 연락해 보세요",
  black: "검은 변은 바로 동물병원에 연락하세요",
  diarrhea: "설사가 이틀 넘게 이어지면 동물병원에 문의하세요",
  gray: "회색·흰색 변이 보이면 동물병원에 연락해 보세요",
  foreign: "이물질이나 기생충처럼 보이는 게 있으면 사진을 가지고 동물병원에 연락해 보세요",
};
export const CONDITION_MSG = {
  breathing: "숨쉬기가 많이 다르면 기다리지 말고 바로 동물병원에 연락하세요",
  energy: "기운이 평소와 많이 다르면 오늘 동물병원에 연락해 보세요",
  vomitCough: "구토나 기침이 평소와 많이 다르면 동물병원에 연락해 보세요",
  gait: "걸음걸이가 이틀 넘게 평소와 다르면 동물병원에 문의하세요",
};

const prevDay = (day) => toDateKey(addDays(new Date(`${day}T00:00:00`), -1));
const isDiarrhea = (d) => d?.stool === "설사" || Number(d?.stoolScore) >= 6;

// data: 지금 적는 배변 기록 칸, recent: 다른 배변 기록들({ at, data }), day: 지금 기록의 날짜(YYYY-MM-DD)
export function stoolFlags(data = {}, recent = [], day = todayKey()) {
  const signs = data.stoolSigns || [];
  const out = new Set();
  if (signs.includes("피") || data.stool === "피 섞임" || data.stoolColor === "붉은색") out.add(STOOL_MSG.blood);
  if (data.stoolColor === "검은색") out.add(STOOL_MSG.black);
  if (data.stoolColor === "회색·흰색") out.add(STOOL_MSG.gray);
  if (signs.includes("이물질·기생충 의심")) out.add(STOOL_MSG.foreign);
  // 오늘 설사 + 바로 전날도 설사 기록 → 이틀 이어짐
  if (isDiarrhea(data) && recent.some((r) => r.at?.slice(0, 10) === prevDay(day) && isDiarrhea(r.data))) out.add(STOOL_MSG.diarrhea);
  return [...out];
}

// check: { energy, appetite, gait, breathing, vomitCough, behavior } 값은 "평소 같음"|"조금 다름"|"많이 다름"
// recent: 다른 컨디션 기록들({ at, data: { check } }), day: 지금 기록의 날짜
export function conditionFlags(check = {}, recent = [], day = todayKey()) {
  const out = [];
  if (check.breathing === "많이 다름") out.push(CONDITION_MSG.breathing);
  if (check.energy === "많이 다름") out.push(CONDITION_MSG.energy);
  if (check.vomitCough === "많이 다름") out.push(CONDITION_MSG.vomitCough);
  const gaitOff = (c) => c?.gait && c.gait !== "평소 같음";
  if (gaitOff(check) && recent.some((r) => r.at?.slice(0, 10) === prevDay(day) && gaitOff(r.data?.check))) out.push(CONDITION_MSG.gait);
  return out;
}
