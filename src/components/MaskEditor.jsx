import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// 사진 가리기: 손가락으로 끌어 검은 네모를 그린다(보호자 이름·전화번호·카드번호). 가린 사진으로 바꿔서 AI에 보낸다 — 원본은 보내지 않음.
// 제안 분석 11/7 ①: "AI로 보내기 전에 이름·번호 부분을 가리는 단계"
export default function MaskEditor({ file, onDone, onClose }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [boxes, setBoxes] = useState([]);
  const drag = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const c = canvasRef.current;
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      draw([]);
    };
    img.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(img.src);
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  function draw(list, live) {
    const c = canvasRef.current, g = c.getContext("2d");
    g.drawImage(imgRef.current, 0, 0, c.width, c.height);
    g.fillStyle = "#000";
    for (const b of live ? [...list, live] : list) g.fillRect(Math.min(b.x1, b.x2), Math.min(b.y1, b.y2), Math.abs(b.x2 - b.x1), Math.abs(b.y2 - b.y1));
  }
  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvasRef.current.width, y: ((e.clientY - r.top) / r.height) * canvasRef.current.height };
  };
  const down = (e) => { e.preventDefault(); const p = pos(e); drag.current = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; canvasRef.current.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (!drag.current) return; const p = pos(e); drag.current = { ...drag.current, x2: p.x, y2: p.y }; draw(boxes, drag.current); };
  const up = () => { if (!drag.current) return; const b = drag.current; drag.current = null; if (Math.abs(b.x2 - b.x1) > 6 && Math.abs(b.y2 - b.y1) > 6) { const next = [...boxes, b]; setBoxes(next); draw(next); } else draw(boxes); };
  function undo() { const next = boxes.slice(0, -1); setBoxes(next); draw(next); }
  function done() { canvasRef.current.toBlob((blob) => onDone(new File([blob], file.name.replace(/\.\w+$/, "") + "-가림.jpg", { type: "image/jpeg" })), "image/jpeg", 0.85); }

  return createPortal(
    <div className="es-backdrop" style={{ zIndex: 400 }}>
      <div className="es-sheet" role="dialog" aria-label="사진 가리기" style={{ maxHeight: "96vh" }}>
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">가릴 곳을 손가락으로 칠해요</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll" style={{ padding: "4px 12px 16px" }}>
          <p className="subtle" style={{ margin: "0 0 8px" }}>보호자 이름·전화번호·주소·카드번호 위를 끌어서 네모로 가려요. 가린 사진만 보내요.</p>
          <canvas ref={canvasRef} className="mask-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" className="btn-ghost" style={{ flex: 1 }} disabled={!boxes.length} onClick={undo}>하나 지우기</button>
            <button type="button" className="btn-primary" style={{ flex: 2 }} onClick={done}>가렸어요 ({boxes.length}곳)</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
