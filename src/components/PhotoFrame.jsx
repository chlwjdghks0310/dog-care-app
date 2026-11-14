import { useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";
import { getPhotos, addPhotos } from "../services/gallery";
import { resizeImageFile } from "../utils/image";
import { photoTakenAt } from "../utils/exifDate";
import { localNow } from "../services/records";

// 프로필 사진 틀(사용자가 고름): 둥근 네모·동그라미·네모·하트(11/7 사용자 결정, 발바닥·별 뺌 — 예전에 고른 사람은 둥근 네모로). 하트는 SVG 모양으로 잘라 보인다(mask)
const svg = (path, vb = "0 0 100 100") => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='${vb}'><path d='${path}'/></svg>`)}")`;
export const FRAMES = [
  { id: "round", label: "둥근 네모", style: { borderRadius: "22%" } },
  { id: "circle", label: "동그라미", style: { borderRadius: "50%" } },
  { id: "square", label: "네모", style: { borderRadius: "6%" } },
  // 통통한 큰 하트(11/7): 양쪽 볼록이를 끝까지 키우고 아래 뾰족한 끝은 틀 밖으로(잘려도 됨)
  { id: "heart", label: "하트", mask: svg("M50 112 C22 92 0 72 0 40 C0 18 15 3 33 3 C42 3 47 8 50 14 C53 8 58 3 67 3 C85 3 100 18 100 40 C100 72 78 92 50 112 Z") },
];
export const frameOf = (id) => FRAMES.find((f) => f.id === id) || FRAMES[0];
const PLACE = { x: 50, y: 40, z: 1 };

// 틀에 맞춘 사진(위치 x·y %, 크기 z배)
export function FramedPhoto({ src, pos, frame, size = 200, alt = "" }) {
  const f = frameOf(frame);
  const p = pos || PLACE;
  const maskStyle = f.mask ? { WebkitMaskImage: f.mask, maskImage: f.mask, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" } : {};
  return (
    <span className="framed" style={{ width: size, height: size, ...f.style, ...maskStyle }}>
      {src ? <img src={src} alt={alt} draggable={false} style={{ objectPosition: `${p.x}% ${p.y}%`, transform: `scale(${p.z})`, transformOrigin: `${p.x}% ${p.y}%` }} /> : <Ico name="dog" size={Math.round(size * 0.42)} style={{ color: "var(--ico-line)" }} />}
    </span>
  );
}

// 사진 바꾸기: 갤러리에서 고를지, 사진 보관함에서 가져올지 묻는다
export function PhotoSourceSheet({ dog, onPicked, onClose, onAdjust, onRemove }) {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const photos = getPhotos(dog.id);
  async function fromFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const src = await resizeImageFile(file, 1200, 0.8);
      try {
        addPhotos(dog.id, [src], (await photoTakenAt(file, localNow())) || localNow()); // 가져온 사진도 갤러리·기록에 남긴다(찍은 날로)
      } catch {
        // 공간이 모자라면 프로필 사진으로만
      }
      onPicked(src);
    } catch {
      setError("사진을 불러오지 못했어요. 다른 사진으로 해 주세요.");
    }
  }
  return createPortal(
    <div className="es-backdrop" style={{ zIndex: 300 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label="프로필 사진 바꾸기">
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">{picking ? `${dog.name} 갤러리에서 고르기` : "프로필 사진"}</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll" style={{ padding: "4px 16px 18px" }}>
          {picking ? (
            photos.length ? (
              <div className="gl-grid">
                {photos.map((p) => (
                  <button key={p.key} type="button" className="gl-item" onClick={() => onPicked(p.src)} aria-label="이 사진으로">
                    <img src={p.src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="subtle">갤러리에 사진이 아직 없어요. 사진 보관함에서 가져와 주세요.</p>
            )
          ) : (
            <div className="ps-list">
              <button type="button" className="ps-item" onClick={() => setPicking(true)}>
                <Ico name="image" size={20} className="cat-ico tone-blue" /><b>{dog.name} 갤러리에서 고르기</b><span className="faint">{photos.length}장</span>
              </button>
              <label className="ps-item">
                <Ico name="imagePlus" size={20} className="cat-ico tone-teal" /><b>사진 보관함에서 가져오기</b><span className="faint">갤러리에도 남아요</span>
                <input type="file" accept="image/*" hidden onChange={fromFile} />
              </label>
              {onAdjust && (
                <button type="button" className="ps-item" onClick={onAdjust}>
                  <Ico name="star" size={20} className="cat-ico tone-rose" /><b>틀·위치 맞추기</b><span className="faint">하트·동그라미…</span>
                </button>
              )}
              {onRemove && (
                <button type="button" className="ps-item" style={{ color: "var(--danger)" }} onClick={onRemove}>
                  <Ico name="trash" size={20} /><b>사진 지우기</b><span />
                </button>
              )}
              {error && <p className="error-text">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
