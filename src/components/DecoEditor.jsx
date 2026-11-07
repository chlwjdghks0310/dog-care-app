import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";

// 사진 꾸미기: 스티커·글자를 올려 끌어 옮기고 크기를 바꾼다. 저장하면 원본 위에 그려 새 사진으로(원본·꾸밈 정보는 남겨 다시 고칠 수 있게).
// 위치·크기는 사진 너비 대비 %(x·y·s) — 화면 크기와 상관없이 같은 자리에 그려진다
// 스티커: Microsoft Fluent Emoji 3D(MIT, public/licenses.txt). 기기마다 모양이 다른 이모지 대신 같은 그림으로
export const STICKER_CATS = [
  ["강아지", "dog_face dog poodle guide_dog paw_prints teddy_bear tennis"],
  ["하트", "red_heart pink_heart sparkling_heart two_hearts heart_with_ribbon smiling_face_with_hearts"],
  ["표정", "pleading_face drooling_face sleeping_face partying_face zzz"],
  ["간식", "bone meat_on_bone cookie strawberry cupcake birthday_cake"],
  ["축하", "party_popper confetti_ball balloon wrapped_gift crown 1st_place_medal star glowing_star sparkles hundred_points"],
  ["날씨", "sun sun_behind_small_cloud cloud_with_rain rainbow snowflake snowman cherry_blossom four_leaf_clover maple_leaf"],
  ["말풍선·기타", "speech_balloon thought_balloon camera_with_flash soap"],
].map(([label, ids]) => ({ label, ids: ids.split(" ") }));
export const stickerSrc = (id) => `/stickers/${id}.png`;
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
export const TEXT_STYLES = [
  { id: "white", label: "흰 글씨", color: "#ffffff", stroke: "rgba(0,0,0,.55)" },
  { id: "black", label: "검은 글씨", color: "#2b2320", stroke: "rgba(255,255,255,.7)" },
  { id: "pink", label: "분홍", color: "#ff6fa0", stroke: "#ffffff" },
  { id: "bubble", label: "말풍선", color: "#2b2320", box: "#ffffff" },
];
const FONT = '"Jua", "Apple SD Gothic Neo", sans-serif';

function drawItem(g, it, W, H, imgs) {
  const size = (it.s / 100) * W;
  const x = (it.x / 100) * W, y = (it.y / 100) * H;
  g.save();
  g.translate(x, y);
  g.rotate(((it.r || 0) * Math.PI) / 180);
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (it.t === "sticker" && imgs[it.v]) {
    g.drawImage(imgs[it.v], -size / 2, -size / 2, size, size);
  } else if (it.t === "sticker") { // 예전 이모지 스티커
    g.font = `${size}px "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    g.fillText(it.v, 0, 0);
  } else {
    const st = TEXT_STYLES.find((s) => s.id === it.style) || TEXT_STYLES[0];
    g.font = `800 ${size}px ${FONT}`;
    const lines = String(it.v).split("\n");
    const lh = size * 1.25;
    const w = Math.max(...lines.map((l) => g.measureText(l).width));
    if (st.box) {
      g.fillStyle = st.box;
      const pw = w + size * 0.9, ph = lh * lines.length + size * 0.5;
      g.beginPath();
      g.roundRect(-pw / 2, -ph / 2, pw, ph, size * 0.5);
      g.fill();
    }
    lines.forEach((l, i) => {
      const ly = (i - (lines.length - 1) / 2) * lh;
      if (st.stroke) {
        g.lineWidth = size * 0.16;
        g.strokeStyle = st.stroke;
        g.lineJoin = "round";
        g.strokeText(l, 0, ly);
      }
      g.fillStyle = st.color;
      g.fillText(l, 0, ly);
    });
  }
  g.restore();
}

// 원본 + 꾸밈 → 새 사진(dataURL)
export async function composeDeco(src, items) {
  const img = await loadImg(src);
  const imgs = {};
  for (const it of items) if (it.t === "sticker" && /^[a-z0-9_]+$/.test(it.v)) imgs[it.v] = await loadImg(stickerSrc(it.v));
  if (document.fonts?.load) await Promise.all([document.fonts.load(`800 40px ${FONT}`).catch(() => {})]);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  for (const it of items) drawItem(g, it, c.width, c.height, imgs);
  return c.toDataURL("image/jpeg", 0.85);
}

export default function DecoEditor({ src, items: initial = [], onSave, onClose }) {
  const [items, setItems] = useState(initial);
  const [sel, setSel] = useState(null);
  const [panel, setPanel] = useState(null); // "sticker" | "text"
  const [cat, setCat] = useState(0);
  const [text, setText] = useState("");
  const [style, setStyle] = useState("white");
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const drag = useRef(null);
  const upd = (i, patch) => setItems((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const add = (it) => (setItems((l) => [...l, it]), setSel(items.length), setPanel(null));
  const down = (i) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    setSel(i);
    drag.current = { i, sx: e.clientX, sy: e.clientY, x: items[i].x, y: items[i].y };
    box.current.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const r = box.current.getBoundingClientRect();
    upd(d.i, { x: Math.max(0, Math.min(100, d.x + ((e.clientX - d.sx) / r.width) * 100)), y: Math.max(0, Math.min(100, d.y + ((e.clientY - d.sy) / r.height) * 100)) });
  };
  const up = () => (drag.current = null);
  async function save() {
    setBusy(true);
    try {
      onSave(await composeDeco(src, items), items);
    } catch {
      setBusy(false);
    }
  }
  const s = sel != null ? items[sel] : null;
  return createPortal(
    <div className="es-backdrop" style={{ zIndex: 400 }}>
      <div className="es-sheet de-sheet" role="dialog" aria-label="사진 꾸미기">
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">꾸미기</div>
          <button type="button" className="btn-primary small" disabled={busy} onClick={save}>{busy ? "…" : "완료"}</button>
        </div>
        <div className="es-scroll" style={{ padding: "4px 12px 14px" }}>
          <div ref={box} className="de-box" onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerDown={() => setSel(null)}>
            <img src={src} alt="" draggable={false} />
            {items.map((it, i) => (
              <span key={i} className={`de-item${sel === i ? " on" : ""} ${it.t}`} onPointerDown={down(i)} style={{ left: `${it.x}%`, top: `${it.y}%`, fontSize: `${it.s}cqw`, transform: `translate(-50%,-50%) rotate(${it.r || 0}deg)`, ...(it.t === "text" ? textCss(it.style) : {}) }}>
                {it.t === "sticker" && /^[a-z0-9_]+$/.test(it.v) ? <img src={stickerSrc(it.v)} alt="" draggable={false} /> : it.v}
              </span>
            ))}
          </div>
          {s ? (
            <div className="de-tools">
              <label className="ca-zoom" style={{ marginTop: 0 }}><span>작게</span><input type="range" min="4" max="60" step="0.5" value={s.s} onChange={(e) => upd(sel, { s: Number(e.target.value) })} aria-label="크기" /><span>크게</span></label>
              <label className="ca-zoom" style={{ marginTop: 6 }}><span>기울기</span><input type="range" min="-45" max="45" step="1" value={s.r || 0} onChange={(e) => upd(sel, { r: Number(e.target.value) })} aria-label="기울기" /><span /></label>
              <button type="button" className="btn-ghost small" style={{ color: "var(--danger)" }} onClick={() => (setItems((l) => l.filter((_, k) => k !== sel)), setSel(null))}>이것 지우기</button>
            </div>
          ) : (
            <p className="faint" style={{ margin: "8px 2px", fontSize: 12.5 }}>스티커나 글자를 넣고 손가락으로 끌어 옮겨요. 누르면 크기·기울기를 바꿀 수 있어요.</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className={`btn-ghost${panel === "sticker" ? " on" : ""}`} style={{ flex: 1 }} onClick={() => setPanel(panel === "sticker" ? null : "sticker")}>😊 스티커</button>
            <button type="button" className={`btn-ghost${panel === "text" ? " on" : ""}`} style={{ flex: 1 }} onClick={() => setPanel(panel === "text" ? null : "text")}>Aa 글자</button>
          </div>
          {panel === "sticker" && (
            <>
              <div className="chip-wrap de-cats" role="tablist">
                {STICKER_CATS.map((c, k) => (
                  <button key={c.label} type="button" role="tab" aria-selected={cat === k} className={`seg${cat === k ? " on" : ""}`} onClick={() => setCat(k)}>{c.label}</button>
                ))}
              </div>
              <div className="de-stickers">
                {STICKER_CATS[cat].ids.map((id) => (
                  <button key={id} type="button" onClick={() => add({ t: "sticker", v: id, x: 50, y: 50, s: 22, r: 0 })} aria-label={`스티커 ${id.replace(/_/g, " ")}`}><img src={stickerSrc(id)} alt="" loading="lazy" /></button>
                ))}
              </div>
            </>
          )}
          {panel === "text" && (
            <div className="de-text">
              <textarea rows={2} maxLength={60} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 첫 눈 ❄️ / 여름이 4개월" aria-label="넣을 글자" />
              <div className="chip-wrap">
                {TEXT_STYLES.map((t) => (
                  <button key={t.id} type="button" className={`seg${style === t.id ? " on" : ""}`} onClick={() => setStyle(t.id)}>{t.label}</button>
                ))}
              </div>
              <button type="button" className="btn-primary" disabled={!text.trim()} onClick={() => (add({ t: "text", v: text.trim(), style, x: 50, y: 82, s: 8, r: 0 }), setText(""))}>글자 넣기</button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const textCss = (id) => {
  const st = TEXT_STYLES.find((s) => s.id === id) || TEXT_STYLES[0];
  return { color: st.color, fontFamily: FONT, fontWeight: 800, whiteSpace: "pre", ...(st.stroke && { WebkitTextStroke: `0.06em ${st.stroke}`, paintOrder: "stroke fill" }), ...(st.box && { background: st.box, padding: "0.25em 0.45em", borderRadius: "0.5em" }) };
};
