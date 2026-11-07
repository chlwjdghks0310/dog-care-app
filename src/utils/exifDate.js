// 사진 파일 안의 찍은 시각(EXIF DateTimeOriginal) 읽기 — 갤러리에 넣을 때 '넣은 날' 대신 '찍은 날'로(사용자 요청 11/7).
// JPEG만(아이폰 사파리는 사진 보관함 사진을 JPEG로 건넴). 없거나 못 읽으면 null → 넣은 시각으로
export function parseExifDate(buf) {
  const v = new DataView(buf);
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null;
  let o = 2;
  while (o + 4 <= v.byteLength) {
    const marker = v.getUint16(o);
    const len = v.getUint16(o + 2);
    if (marker === 0xffe1 && v.getUint32(o + 4) === 0x45786966) return fromTiff(v, o + 10); // "Exif"
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null;
    o += 2 + len;
  }
  return null;
}

function fromTiff(v, t) {
  const le = v.getUint16(t) === 0x4949;
  const u16 = (p) => v.getUint16(p, le);
  const u32 = (p) => v.getUint32(p, le);
  const tags = (ifd) => {
    const out = {};
    if (t + ifd + 2 > v.byteLength) return out;
    const n = u16(t + ifd);
    for (let i = 0; i < n; i++) {
      const e = t + ifd + 2 + i * 12;
      if (e + 12 > v.byteLength) break;
      out[u16(e)] = { type: u16(e + 2), count: u32(e + 4), val: e + 8 };
    }
    return out;
  };
  const str = (tag) => {
    if (!tag || tag.type !== 2) return null;
    const at = tag.count > 4 ? t + u32(tag.val) : tag.val;
    let s = "";
    for (let i = 0; i < tag.count - 1 && at + i < v.byteLength; i++) s += String.fromCharCode(v.getUint8(at + i));
    return s;
  };
  const ifd0 = tags(u32(t + 4));
  const exif = ifd0[0x8769] ? tags(u32(ifd0[0x8769].val)) : {};
  const raw = str(exif[0x9003]) || str(exif[0x9004]) || str(ifd0[0x0132]);
  const m = raw && raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);
  if (!m || m[1] < "1990") return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
}

// 파일 → 찍은 시각(앞부분 256KB만 읽음). 앞으로의 시각이면 버린다
export async function photoTakenAt(file, now) {
  try {
    const at = parseExifDate(await file.slice(0, 262144).arrayBuffer());
    return at && (!now || at <= now) ? at : null;
  } catch {
    return null;
  }
}
