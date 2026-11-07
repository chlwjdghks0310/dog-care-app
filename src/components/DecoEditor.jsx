import { useRef, useState } from "react";
import { useSheetSwipe } from "./SwipeBack";
import { createPortal } from "react-dom";
import Ico from "./Ico";

// 사진 꾸미기: 스티커·글자를 올려 끌어 옮기고 크기를 바꾼다. 저장하면 원본 위에 그려 새 사진으로(원본·꾸밈 정보는 남겨 다시 고칠 수 있게).
// 위치·크기는 사진 너비 대비 %(x·y·s) — 화면 크기와 상관없이 같은 자리에 그려진다
// 스티커 3가지 모양(11/7): 손그림 = Doodle Icons(Khushmeen, CC0, 흰 칼선 테두리 넣어 PNG로), 2D 컬러 = Fluent Emoji Flat, 3D = Fluent Emoji 3D(둘 다 MIT, public/licenses.txt)
const cats = (list) => list.map(([label, ids]) => ({ label, ids: ids.split(" ") }));
const pre = (p, ids) => ids.split(" ").map((i) => p + i).join(" ");
export const STICKER_SETS = [
  { label: "손그림", cats: cats([
    ["표정", pre("d-", "happy-emoji heart-eyes-emoji laugh-emoji smiling-emoji wink-emoji cool-emoji surprised-emoji crying-emoji")],
    ["하트·말풍선", pre("d-", "heart heart-beat star message message-2 music fire")],
    ["간식·날씨", pre("d-", "cake candy ice-cream popsicle egg water coffee-cup-1 sunny sun-2 cloudy-day rain-light snow snowflake snowman night wind")],
    ["축하·일상", pre("d-", "balloon balloon-2 gift mail-gift crown trophy bell camera frame home sofa calendar hot-air-balloon rocket")],
    ["병원 가는 날", pre("d-", "first-aid pills stethoscope tooth")],
  ]) },
  { label: "2D 컬러", cats: cats([
    ["강아지", pre("f-", "dog-face dog poodle guide-dog paw-prints bone meat-on-bone teddy-bear tennis soccer-ball")],
    ["하트·표정", pre("f-", "red-heart pink-heart sparkling-heart two-hearts heart-with-ribbon growing-heart smiling-face-with-hearts pleading-face sleeping-face drooling-face partying-face face-blowing-a-kiss zzz")],
    ["간식·꽃", pre("f-", "cookie birthday-cake cupcake strawberry bowl-with-spoon droplet cherry-blossom blossom tulip sunflower four-leaf-clover")],
    ["축하·날씨", pre("f-", "party-popper confetti-ball balloon wrapped-gift crown 1st-place-medal star glowing-star sparkles hundred-points christmas-tree jack-o-lantern sun sun-behind-small-cloud cloud-with-rain rainbow snowflake snowman fallen-leaf maple-leaf")],
    ["말풍선·일상", pre("f-", "speech-balloon thought-balloon camera-with-flash soap bathtub house-with-garden musical-notes")],
  ]) },
  { label: "3D", cats: cats([
    ["강아지", "dog_face dog poodle guide_dog paw_prints teddy_bear tennis"],
    ["하트", "red_heart pink_heart sparkling_heart two_hearts heart_with_ribbon smiling_face_with_hearts"],
    ["표정", "pleading_face drooling_face sleeping_face partying_face zzz"],
    ["간식", "bone meat_on_bone cookie strawberry cupcake birthday_cake"],
    ["축하", "party_popper confetti_ball balloon wrapped_gift crown 1st_place_medal star glowing_star sparkles hundred_points"],
    ["날씨", "sun sun_behind_small_cloud cloud_with_rain rainbow snowflake snowman cherry_blossom four_leaf_clover maple_leaf"],
    ["말풍선·기타", "speech_balloon thought_balloon camera_with_flash soap"],
  ]) },
];
export const TEXT_PRESETS = ["사랑해 ♥", "생일 축하해!", "오늘도 귀여움", "첫 산책", "꿀잠 zzz", "병원 다녀온 날", "간식 타임", "우리 집 막내"];
export const stickerSrc = (id) => `/stickers/${id}.png`;
const loadImg = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
// 예전(11/7 첫 판) 글자 모양 — 저장된 꾸미기를 그대로 다시 그리려고 남김
export const TEXT_STYLES = [
  { id: "white", color: "#ffffff", stroke: "rgba(0,0,0,.55)" },
  { id: "black", color: "#2b2320", stroke: "rgba(255,255,255,.7)" },
  { id: "pink", color: "#ff6fa0", stroke: "#ffffff" },
  { id: "bubble", color: "#2b2320", box: "#ffffff" },
];
// 손글씨 글씨체(모두 SIL OFL 1.1, 완성형 2350자만 잘라 public/fonts) — 글자 창을 열 때만 받는다
export const FONTS = [
  { id: "jua", label: "주아", family: "Jua", weight: 800 },
  { id: "gaegu", label: "개구", family: "Gaegu" },
  { id: "pen", label: "나눔손글씨 펜", family: "Nanum Pen Script", scale: 1.3 },
  { id: "gamja", label: "감자꽃", family: "Gamja Flower" },
  { id: "melody", label: "하이멜로디", family: "Hi Melody", scale: 1.15 },
  { id: "poor", label: "푸어스토리", family: "Poor Story" },
  { id: "yeon", label: "연성", family: "Yeon Sung" },
  { id: "single", label: "싱글데이", family: "Single Day" },
  { id: "dongle", label: "동글", family: "Dongle", scale: 1.4 },
];
export const COLORS = ["#ffffff", "#2b2320", "#ff6fa0", "#ff8a3d", "#ffd43b", "#51cf66", "#4dabf7", "#9775fa"];
const DECOS = [["stroke", "테두리"], ["box", "바탕"], ["none", "글씨만"]];
const PEN_W = [["가늘게", 6], ["보통", 12], ["굵게", 24]];
const fontOf = (id) => FONTS.find((f) => f.id === id) || FONTS[0];
const css = (f) => `"${f.family}", "Apple SD Gothic Neo", sans-serif`;
const isLight = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160;
};
// 글자 한 개의 모양(예전 style 값도 읽음)
function textSpec(it) {
  if (it.style) {
    const st = TEXT_STYLES.find((s) => s.id === it.style) || TEXT_STYLES[0];
    return { ...st, font: FONTS[0] };
  }
  const light = isLight(it.c || "#ffffff");
  return {
    color: it.c || "#ffffff",
    stroke: it.d === "stroke" ? (light ? "rgba(0,0,0,.55)" : "#ffffff") : null,
    box: it.d === "box" ? (light ? "rgba(43,35,32,.85)" : "#ffffff") : null,
    font: fontOf(it.f),
  };
}

function drawItem(g, it, W, H, imgs) {
  g.save();
  if (it.t === "draw") {
    const k = W / 1000;
    g.scale(k, k);
    g.strokeStyle = it.c;
    g.lineWidth = it.w;
    g.lineCap = g.lineJoin = "round";
    g.beginPath();
    it.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    if (it.pts.length === 1) g.lineTo(it.pts[0][0] + 0.1, it.pts[0][1]);
    g.stroke();
    return g.restore();
  }
  const size = (it.s / 100) * W;
  g.translate((it.x / 100) * W, (it.y / 100) * H);
  g.rotate(((it.r || 0) * Math.PI) / 180);
  g.textAlign = "center";
  g.textBaseline = "middle";
  if (it.t === "sticker" && imgs[it.v]) {
    g.drawImage(imgs[it.v], -size / 2, -size / 2, size, size);
  } else if (it.t === "sticker") { // 예전 이모지 스티커
    g.font = `${size}px "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    g.fillText(it.v, 0, 0);
  } else {
    const st = textSpec(it);
    const fs = size * (st.font.scale || 1);
    g.font = `${st.font.weight || 400} ${fs}px ${css(st.font)}`;
    const lines = String(it.v).split("\n");
    const lh = fs * 1.2;
    const w = Math.max(...lines.map((l) => g.measureText(l).width));
    if (st.box) {
      g.fillStyle = st.box;
      const pw = w + fs * 0.9, ph = lh * lines.length + fs * 0.4;
      g.beginPath();
      g.roundRect(-pw / 2, -ph / 2, pw, ph, fs * 0.45);
      g.fill();
    }
    lines.forEach((l, i) => {
      const ly = (i - (lines.length - 1) / 2) * lh;
      if (st.stroke) {
        g.lineWidth = fs * 0.16;
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

const isImgSticker = (it) => it.t === "sticker" && /^[a-z0-9_-]+$/.test(it.v);

// 원본 + 꾸밈 → 새 사진(dataURL). 그림(펜)은 화면처럼 맨 아래에
export async function composeDeco(src, items) {
  const img = await loadImg(src);
  const imgs = {};
  for (const it of items) if (isImgSticker(it)) imgs[it.v] = await loadImg(stickerSrc(it.v));
  const fonts = [...new Set(items.filter((i) => i.t === "text").map((i) => textSpec(i).font))];
  if (document.fonts?.load) await Promise.all(fonts.map((f) => document.fonts.load(`${f.weight || 400} 40px "${f.family}"`).catch(() => {})));
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  for (const it of [...items.filter((i) => i.t === "draw"), ...items.filter((i) => i.t !== "draw")]) drawItem(g, it, c.width, c.height, imgs);
  return c.toDataURL("image/jpeg", 0.85);
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angle = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function DecoEditor({ src, items: initial = [], onSave, onClose }) {
  const [items, setItems] = useState(initial);
  const [sel, setSel] = useState(null);
  const [panel, setPanel] = useState(null); // "sticker" | "text" | "draw"
  const [set, setSet] = useState(0);
  const [cat, setCat] = useState(0);
  const [text, setText] = useState("");
  const [font, setFont] = useState("gaegu");
  const [color, setColor] = useState("#ffffff");
  const [deco, setDeco] = useState("stroke");
  const [pen, setPen] = useState({ c: "#ffffff", w: 12 });
  const [ratio, setRatio] = useState(1);
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const ptrs = useRef(new Map());
  const gest = useRef(null);
  const live = useRef(items);
  live.current = items;
  const upd = (i, patch) => setItems((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const add = (it) => (setItems((l) => [...l, it]), setSel(items.length), setPanel(null));
  const at = (e) => {
    const r = box.current.getBoundingClientRect();
    return { x: e.clientX, y: e.clientY, r };
  };

  // 한 손가락: 옮기기 · 두 손가락: 크기·돌리기(인스타 스토리처럼) · 그리기 모드: 펜
  function down(e) {
    try { box.current.setPointerCapture(e.pointerId); } catch { /* 이미 뗀 손가락 */ }
    const p = at(e);
    if (panel === "draw") {
      if (gest.current) return;
      const u = 1000 / p.r.width;
      gest.current = { mode: "draw", id: e.pointerId, i: live.current.length };
      setItems((l) => [...l, { t: "draw", pts: [[(p.x - p.r.left) * u, (p.y - p.r.top) * u]], c: pen.c, w: pen.w }]);
      return;
    }
    ptrs.current.set(e.pointerId, p);
    const hit = e.target.closest?.("[data-i]");
    if (ptrs.current.size === 1) {
      if (!hit) return (setSel(null), (gest.current = null));
      const i = Number(hit.dataset.i);
      setSel(i);
      gest.current = { mode: "drag", i, sx: p.x, sy: p.y, x0: live.current[i].x, y0: live.current[i].y };
    } else if (ptrs.current.size === 2 && gest.current) startPinch(gest.current.i);
  }
  function startPinch(i) {
    const [a, b] = [...ptrs.current.values()];
    const it = live.current[i];
    gest.current = { mode: "pinch", i, d0: dist(a, b), a0: angle(a, b), s0: it.s, r0: it.r || 0, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, x0: it.x, y0: it.y };
  }
  function move(e) {
    const g = gest.current;
    if (!g) return;
    const p = at(e);
    if (g.mode === "draw") {
      if (e.pointerId !== g.id) return;
      const u = 1000 / p.r.width;
      const pt = [(p.x - p.r.left) * u, (p.y - p.r.top) * u];
      return setItems((l) => l.map((x, k) => (k === g.i ? { ...x, pts: [...x.pts, pt] } : x)));
    }
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, p);
    if (g.mode === "drag") {
      upd(g.i, { x: clamp(g.x0 + ((p.x - g.sx) / p.r.width) * 100, 0, 100), y: clamp(g.y0 + ((p.y - g.sy) / p.r.height) * 100, 0, 100) });
    } else if (ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      upd(g.i, {
        s: clamp(g.s0 * (dist(a, b) / g.d0), 3, 90),
        r: Math.round(g.r0 + angle(a, b) - g.a0),
        x: clamp(g.x0 + ((mx - g.mx) / p.r.width) * 100, 0, 100),
        y: clamp(g.y0 + ((my - g.my) / p.r.height) * 100, 0, 100),
      });
    }
  }
  function up(e) {
    const g = gest.current;
    if (g?.mode === "draw") return e.pointerId === g.id && (gest.current = null);
    ptrs.current.delete(e.pointerId);
    if (!ptrs.current.size) return (gest.current = null);
    if (g?.mode === "pinch") { // 한 손가락만 남으면 그 손가락으로 계속 옮기기
      const p = [...ptrs.current.values()][0];
      gest.current = { mode: "drag", i: g.i, sx: p.x, sy: p.y, x0: live.current[g.i].x, y0: live.current[g.i].y };
    }
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      onSave(await composeDeco(src, items), items);
    } catch {
      setBusy(false);
    }
  }
  const swipe = useSheetSwipe(save); // 밀어서 뒤로 = 꾸민 것 저장하고 게시물로
  const s = sel != null ? items[sel] : null;
  // 글자를 고른 상태에서 글씨체·색을 바꾸면 그 글자에 바로
  const pickText = (patch) => {
    if (patch.f) setFont(patch.f);
    if (patch.c) setColor(patch.c);
    if (patch.d) setDeco(patch.d);
    if (s?.t === "text") upd(sel, { ...patch, style: undefined });
  };
  const togglePanel = (p) => (setPanel(panel === p ? null : p), setSel(null));
  const draws = items.map((it, i) => [it, i]).filter(([it]) => it.t === "draw");
  return createPortal(
    <div className="es-backdrop" style={{ zIndex: 400 }}>
      <div className="es-sheet de-sheet" role="dialog" aria-label="사진 꾸미기" {...swipe}>
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">꾸미기</div>
          <button type="button" className="btn-primary small" disabled={busy} onClick={save}>{busy ? "…" : "완료"}</button>
        </div>
        <div className="es-scroll" style={{ padding: "4px 12px 14px" }}>
          <div ref={box} data-no-swipe className={`de-box${panel === "draw" ? " drawing" : ""}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <img src={src} alt="" draggable={false} onLoad={(e) => setRatio(e.target.naturalHeight / e.target.naturalWidth || 1)} />
            {draws.length > 0 && (
              <svg className="de-draw" viewBox={`0 0 1000 ${1000 * ratio}`} aria-hidden="true">
                {draws.map(([it, i]) => (
                  <path key={i} d={it.pts.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + (it.pts.length === 1 ? "l0.1 0" : "")} stroke={it.c} strokeWidth={it.w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </svg>
            )}
            {items.map((it, i) => it.t !== "draw" && (
              <span key={i} data-i={i} className={`de-item${sel === i ? " on" : ""} ${it.t}`} style={{ left: `${it.x}%`, top: `${it.y}%`, fontSize: `${it.s * (it.t === "text" ? textSpec(it).font.scale || 1 : 1)}cqw`, transform: `translate(-50%,-50%) rotate(${it.r || 0}deg)`, ...(it.t === "text" ? textCss(it) : {}) }}>
                {isImgSticker(it) ? <img src={stickerSrc(it.v)} alt="" draggable={false} /> : it.v}
              </span>
            ))}
          </div>
          {s ? (
            <div className="de-tools">
              <label className="ca-zoom" style={{ marginTop: 0 }}><span>작게</span><input type="range" min="3" max="90" step="0.5" value={s.s} onChange={(e) => upd(sel, { s: Number(e.target.value) })} aria-label="크기" /><span>크게</span></label>
              <label className="ca-zoom" style={{ marginTop: 6 }}><span>돌리기</span><input type="range" min="-180" max="180" step="1" value={s.r || 0} onChange={(e) => upd(sel, { r: Number(e.target.value) })} aria-label="돌리기" /><span /></label>
              {s.t === "text" && <TextOptions font={textSpec(s).font.id} color={textSpec(s).color} deco={s.d || (s.style === "bubble" ? "box" : "stroke")} onPick={pickText} />}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn-ghost small" onClick={() => (setItems((l) => [...l.filter((_, k) => k !== sel), l[sel]]), setSel(items.length - 1))}>맨 앞으로</button>
                <button type="button" className="btn-ghost small" style={{ color: "var(--danger)" }} onClick={() => (setItems((l) => l.filter((_, k) => k !== sel)), setSel(null))}>이것 지우기</button>
              </div>
            </div>
          ) : (
            <p className="faint" style={{ margin: "8px 2px", fontSize: 12.5 }}>
              {panel === "draw" ? "사진 위에 손가락으로 그려요." : "한 손가락으로 끌어 옮기고, 두 손가락으로 벌리거나 돌려서 크기·방향을 바꿔요."}
            </p>
          )}
          <div className="de-modes">
            <button type="button" className={`btn-ghost${panel === "sticker" ? " on" : ""}`} onClick={() => togglePanel("sticker")}>😊 스티커</button>
            <button type="button" className={`btn-ghost${panel === "text" ? " on" : ""}`} onClick={() => togglePanel("text")}>Aa 글자</button>
            <button type="button" className={`btn-ghost${panel === "draw" ? " on" : ""}`} onClick={() => togglePanel("draw")}>✏️ 그리기</button>
          </div>
          {panel === "sticker" && (
            <>
              <div className="de-sets" role="tablist" aria-label="스티커 모양">
                {STICKER_SETS.map((g, k) => (
                  <button key={g.label} type="button" role="tab" aria-selected={set === k} className={set === k ? "on" : ""} onClick={() => (setSet(k), setCat(0))}>{g.label}</button>
                ))}
              </div>
              <div className="chip-wrap de-cats" role="tablist" aria-label="스티커 종류">
                {STICKER_SETS[set].cats.map((c, k) => (
                  <button key={c.label} type="button" role="tab" aria-selected={cat === k} className={`seg${cat === k ? " on" : ""}`} onClick={() => setCat(k)}>{c.label}</button>
                ))}
              </div>
              <div className="de-stickers">
                {STICKER_SETS[set].cats[cat].ids.map((id) => (
                  <button key={id} type="button" onClick={() => add({ t: "sticker", v: id, x: 50, y: 50, s: 22, r: 0 })} aria-label={`스티커 ${id.replace(/^[df]-/, "").replace(/[_-]/g, " ")}`}><img src={stickerSrc(id)} alt="" loading="lazy" /></button>
                ))}
              </div>
            </>
          )}
          {panel === "text" && (
            <div className="de-text">
              <textarea rows={2} maxLength={60} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 첫 눈 ❄️ / 4개월 된 날" aria-label="넣을 글자" style={{ fontFamily: css(fontOf(font)) }} />
              <div className="chip-wrap de-cats" aria-label="자주 쓰는 문구">
                {TEXT_PRESETS.map((t) => <button key={t} type="button" className="seg" onClick={() => setText(t)}>{t}</button>)}
              </div>
              <TextOptions font={font} color={color} deco={deco} onPick={pickText} />
              <button type="button" className="btn-primary" disabled={!text.trim()} onClick={() => (add({ t: "text", v: text.trim(), f: font, c: color, d: deco, x: 50, y: 82, s: 9, r: 0 }), setText(""))}>글자 넣기</button>
            </div>
          )}
          {panel === "draw" && (
            <div className="de-text">
              <Swatches value={pen.c} onPick={(c) => setPen({ ...pen, c })} />
              <div className="chip-wrap">
                {PEN_W.map(([l, w]) => <button key={w} type="button" className={`seg${pen.w === w ? " on" : ""}`} onClick={() => setPen({ ...pen, w })}>{l}</button>)}
                <button type="button" className="seg" disabled={!draws.length} onClick={() => setItems((l) => l.filter((_, k) => k !== draws.at(-1)[1]))}>↩ 되돌리기</button>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setPanel(null)}>그리기 끝</button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Swatches({ value, onPick }) {
  return (
    <div className="de-colors" role="radiogroup" aria-label="색">
      {COLORS.map((c) => <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} className={value === c ? "on" : ""} style={{ background: c }} onClick={() => onPick(c)} />)}
    </div>
  );
}

function TextOptions({ font, color, deco, onPick }) {
  return (
    <>
      <div className="chip-wrap de-cats" aria-label="글씨체">
        {FONTS.map((f) => <button key={f.id} type="button" className={`seg${font === f.id ? " on" : ""}`} style={{ fontFamily: css(f), fontSize: 16 * (f.scale || 1) }} onClick={() => onPick({ f: f.id })}>{f.label}</button>)}
      </div>
      <Swatches value={color} onPick={(c) => onPick({ c })} />
      <div className="chip-wrap">
        {DECOS.map(([id, l]) => <button key={id} type="button" className={`seg${deco === id ? " on" : ""}`} onClick={() => onPick({ d: id })}>{l}</button>)}
      </div>
    </>
  );
}

const textCss = (it) => {
  const st = textSpec(it);
  return { color: st.color, fontFamily: css(st.font), fontWeight: st.font.weight || 400, lineHeight: 1.2, whiteSpace: "pre", ...(st.stroke && { WebkitTextStroke: `0.08em ${st.stroke}`, paintOrder: "stroke fill" }), ...(st.box && { background: st.box, padding: "0.2em 0.45em", borderRadius: "0.45em" }) };
};
