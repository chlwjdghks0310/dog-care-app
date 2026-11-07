// 기록 내보내기: 데이터가 앱에 갇히지 않게 무료로(11pets 리뷰 불만 — ../자료용/자료/2026-11-07-1단계-남은것-조사.md ②)
// ① 전체 백업(JSON): 이 기기의 멍케어 데이터 전부(dogcare-*). 로그인 정보는 넣지 않는다.
// ② 기록 표(CSV): 강아지 한 마리의 기록을 엑셀에서 열 수 있게(사진은 빼고 "사진 n장"만)
import { TYPES, summarize, getTimeline } from "./records";

export function backupJson(storage = localStorage) {
  const data = {};
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k.startsWith("dogcare-")) data[k] = JSON.parse(storage.getItem(k));
  }
  return JSON.stringify({ app: "멍케어", version: 1, exportedAt: new Date().toISOString(), data }, null, 1);
}

const cell = (v) => {
  const t = String(v ?? "");
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
export function recordsCsv(dogId) {
  const rows = getTimeline(dogId)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((r) => [r.at.slice(0, 10), r.at.slice(11, 16), TYPES[r.type]?.label || r.type, summarize(r), r.memo, r.photos?.length ? `사진 ${r.photos.length}장` : ""].map(cell).join(","));
  return "﻿" + ["날짜,시각,종류,내용,메모,사진", ...rows].join("\n");
}

// 공유 시트(파일 공유 되는 기기) → 안 되면 내려받기
export async function shareFile(text, name, type) {
  const file = new File([text], name, { type });
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], title: name });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(file), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
