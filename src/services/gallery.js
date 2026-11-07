// 아이 갤러리: 사진이 붙은 모든 기록(사진 기록·증상·병원 등)을 한곳에 모아 본다. 새로 넣는 사진은 '사진' 기록(media)으로 하나씩 남겨
// 사진마다 메모·추억을 따로 적을 수 있게 한다(사용자 요청 11/7). 사진은 폰 저장소에 줄여서(긴 변 900px) — 로그인하면 백업.
import { getRecords, saveRecord, deleteRecord, newRecordId, localNow } from "./records";
import { isVisitRecord } from "./vetVisits";

// 성장 추억(11/7): 병원·증상·배변 사진은 빼고 — 그 사진은 각 기록과 병원용 기록에 남는다
const MEDICAL = new Set(["symptom", "vet", "potty"]);

export function getPhotos(dogId) {
  const out = [];
  for (const r of getRecords(dogId)) if (!MEDICAL.has(r.type) && !isVisitRecord(r)) (r.photos || []).forEach((src, idx) => out.push({ key: `${r.id}:${idx}`, recId: r.id, idx, src, at: r.at, memo: r.memo || "", type: r.type }));
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

// 사진 여러 장 → 사진 기록 여러 개(한 장에 하나). 저장 공간이 꽉 차 저장이 안 되면 알려 준다
export function addPhotos(dogId, dataUrls, at = localNow()) {
  const ids = [];
  for (const src of dataUrls) {
    const id = newRecordId();
    saveRecord(dogId, { id, type: "media", at, data: {}, memo: "", photos: [src] });
    if (!getRecords(dogId).some((r) => r.id === id)) throw new Error("폰 저장 공간이 꽉 차서 사진을 더 넣지 못했어요. 오래된 사진을 지우거나 로그인해 백업해 주세요.");
    ids.push(id);
  }
  return ids;
}

export function setPhotoMemo(dogId, recId, memo) {
  const r = getRecords(dogId).find((x) => x.id === recId);
  if (r) saveRecord(dogId, { ...r, memo: memo.trim().slice(0, 500) });
}

// 찍은 날 바꾸기(11/7: 오늘 넣었어도 어제 사진일 수 있음). 사진 기록만 — 증상·병원 기록에 붙은 사진은 그 기록 날짜를 따른다.
// 시각은 그대로 두고 날짜만, 오늘보다 뒤로는 안 됨. 바뀐 at을 돌려준다
export function setPhotoDate(dogId, recId, date, today = localNow().slice(0, 10)) {
  const r = getRecords(dogId).find((x) => x.id === recId);
  if (!r || r.type !== "media" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) return r?.at;
  const at = `${date}${r.at.slice(10)}`;
  saveRecord(dogId, { ...r, at });
  return at;
}

// 사진 지우기: 사진 기록에 한 장뿐이면 기록째, 다른 기록(증상 등)에 붙은 사진이면 그 사진만
export function removePhoto(dogId, recId, idx) {
  const r = getRecords(dogId).find((x) => x.id === recId);
  if (!r) return;
  const photos = r.photos.filter((_, i) => i !== idx);
  if (r.type === "media" && !photos.length) deleteRecord(dogId, recId);
  else saveRecord(dogId, { ...r, photos });
}

// 꾸민 사진 저장: 보이는 사진은 꾸민 것으로 바꾸고, 원본과 꾸밈(스티커·글자 위치)은 남겨 다시 고칠 수 있게
export function saveDecorated(dogId, recId, idx, src, items) {
  const r = getRecords(dogId).find((x) => x.id === recId);
  if (!r) return;
  const orig = { ...(r.data?.orig || {}) };
  if (!orig[idx]) orig[idx] = r.photos[idx];
  const deco = { ...(r.data?.deco || {}), [idx]: items };
  if (!items.length) (r.photos[idx] = orig[idx]), delete orig[idx], delete deco[idx];
  else r.photos[idx] = src;
  saveRecord(dogId, { ...r, photos: [...r.photos], data: { ...r.data, orig, deco } });
  if (!getRecords(dogId).find((x) => x.id === recId)?.photos.includes(items.length ? src : r.photos[idx])) throw new Error("폰 저장 공간이 꽉 차서 저장하지 못했어요.");
}
export const decoOf = (dogId, recId, idx) => {
  const r = getRecords(dogId).find((x) => x.id === recId);
  return { orig: r?.data?.orig?.[idx] || r?.photos?.[idx], items: r?.data?.deco?.[idx] || [] };
};
