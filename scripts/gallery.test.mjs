// 갤러리 사진 찍은 날 바꾸기 확인: npm test
import assert from "node:assert/strict";
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k], key: (i) => Object.keys(store)[i], get length() { return Object.keys(store).length; } };
globalThis.window = globalThis;
const R = await import("../src/services/records.js");
const G = await import("../src/services/gallery.js");
const [id] = G.addPhotos("a", ["data:x"], "2026-11-07T18:30");
assert.equal(G.setPhotoDate("a", id, "2026-11-06", "2026-11-07"), "2026-11-06T18:30", "어제로, 시각은 그대로");
assert.equal(G.setPhotoDate("a", id, "2026-11-09", "2026-11-07"), "2026-11-06T18:30", "내일로는 안 바뀜");
R.saveRecord("a", { id: "s1", type: "symptom", at: "2026-11-05T09:00", data: { kinds: ["구토"] }, photos: ["data:y"] });
assert.equal(G.setPhotoDate("a", "s1", "2026-11-01", "2026-11-07"), "2026-11-05T09:00", "증상 기록 사진은 기록 날짜를 따름");
assert.equal(G.getPhotos("a").length, 1, "증상 사진은 성장 추억에 안 나옴");
R.saveRecord("a", { id: "d1", type: "daily", at: "2026-11-04T09:00", data: { kind: "산책" }, photos: ["data:z"] });
assert.equal(G.getPhotos("a")[1].at, "2026-11-04T09:00", "산책 사진은 나옴");
// 사진 파일 속 찍은 시각(EXIF) 읽기: 최소 JPEG(SOI + APP1 Exif, 리틀엔디언, IFD0 → Exif IFD → DateTimeOriginal)
const { parseExifDate } = await import("../src/utils/exifDate.js");
function jpeg(dateStr, le = true) {
  const tiff = new DataView(new ArrayBuffer(8 + 2 + 12 + 4 + 2 + 12 + 4 + 20));
  const w16 = (o, x) => tiff.setUint16(o, x, le), w32 = (o, x) => tiff.setUint32(o, x, le);
  tiff.setUint16(0, le ? 0x4949 : 0x4d4d); w16(2, 42); w32(4, 8);
  w16(8, 1); w16(10, 0x8769); w16(12, 4); w32(14, 1); w32(18, 26); w32(22, 0); // IFD0: Exif 포인터 → 26
  w16(26, 1); w16(28, 0x9003); w16(30, 2); w32(32, 20); w32(36, 44); w32(40, 0); // Exif IFD: DateTimeOriginal → 44
  [...dateStr].forEach((c, i) => tiff.setUint8(44 + i, c.charCodeAt(0)));
  const body = new Uint8Array(tiff.buffer);
  const out = new Uint8Array(2 + 4 + 6 + body.length + 2);
  const dv = new DataView(out.buffer);
  dv.setUint16(0, 0xffd8); dv.setUint16(2, 0xffe1); dv.setUint16(4, 2 + 6 + body.length);
  out.set([0x45, 0x78, 0x69, 0x66, 0, 0], 6); out.set(body, 12); dv.setUint16(12 + body.length, 0xffd9);
  return out.buffer;
}
assert.equal(parseExifDate(jpeg("2026:11:06 14:22:05")), "2026-11-06T14:22", "찍은 시각 읽기(리틀엔디언)");
assert.equal(parseExifDate(jpeg("2025:05:01 09:00:00", false)), "2025-05-01T09:00", "빅엔디언(아이폰)");
assert.equal(parseExifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer), null, "JPEG 아니면 없음");
console.log("갤러리 날짜 OK");
