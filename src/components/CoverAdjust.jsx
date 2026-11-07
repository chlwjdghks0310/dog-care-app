import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FRAMES, FramedPhoto } from "./PhotoFrame";

// 대표 사진 맞추기: 손가락으로 끌어 보이는 부분을 옮기고, 막대로 크게·작게(1~3배). 사진은 그대로 두고 위치·크기만 저장한다(dog.coverPos).
// 사용자 요청(11/7) "사진 사이즈를 맞출 수 있게"
export const coverStyle = (pos) => {
  const p = pos || { x: 50, y: 40, z: 1 };
  return { objectPosition: `${p.x}% ${p.y}%`, transform: `scale(${p.z})`, transformOrigin: `${p.x}% ${p.y}%` };
};

export default function CoverAdjust({ src, pos, frame: initialFrame, onSave, onClose, onChangePhoto }) {
  const [p, setP] = useState(pos || { x: 50, y: 40, z: 1 });
  const [fr, setFr] = useState(initialFrame || "round");
  const drag = useRef(null);
  const frame = useRef(null);
  const down = (e) => {
    e.preventDefault();
    drag.current = { sx: e.clientX, sy: e.clientY, p };
    frame.current.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const r = frame.current.getBoundingClientRect();
    // 손가락이 오른쪽으로 가면 사진도 오른쪽으로(=보이는 곳은 왼쪽으로): object-position %는 반대로 움직인다
    const k = 100 / d.p.z;
    setP({ ...d.p, x: Math.max(0, Math.min(100, d.p.x - ((e.clientX - d.sx) / r.width) * k)), y: Math.max(0, Math.min(100, d.p.y - ((e.clientY - d.sy) / r.height) * k)) });
  };
  const up = () => (drag.current = null);
  return createPortal(
    <div className="es-backdrop" style={{ zIndex: 400 }}>
      <div className="es-sheet" role="dialog" aria-label="프로필 사진 맞추기" style={{ maxHeight: "96vh" }}>
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">프로필 사진 맞추기</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll" style={{ padding: "4px 16px 18px" }}>
          <p className="subtle" style={{ margin: "0 0 8px" }}>틀을 고르고, 사진을 끌어서 보일 곳을 옮기고, 아래 막대로 크기를 맞춰요.</p>
          <div className="chip-wrap" style={{ marginBottom: 10 }} role="radiogroup" aria-label="사진 틀">
            {FRAMES.map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={fr === f.id} className={`seg${fr === f.id ? " on" : ""}`} onClick={() => setFr(f.id)}>{f.label}</button>
            ))}
          </div>
          <div ref={frame} className="ca-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <FramedPhoto src={src} pos={p} frame={fr} size={240} />
          </div>
          <label className="ca-zoom">
            <span>작게</span>
            <input type="range" min="1" max="3" step="0.05" value={p.z} onChange={(e) => setP({ ...p, z: Number(e.target.value) })} aria-label="사진 크기" />
            <span>크게</span>
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={() => setP({ x: 50, y: 40, z: 1 })}>처음대로</button>
            {onChangePhoto && (
              <label className="btn-ghost" style={{ flex: 1, textAlign: "center", cursor: "pointer" }}>
                다른 사진
                <input type="file" accept="image/*" hidden onChange={onChangePhoto} />
              </label>
            )}
            <button type="button" className="btn-primary" style={{ flex: 1.4 }} onClick={() => onSave(p, fr)}>이대로 저장</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
