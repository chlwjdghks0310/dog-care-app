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
const DECO_NEXT = { stroke: "box", box: "none", none: "stroke" };
const DECO_LABEL = { stroke: "테두리", box: "바탕", none: "글씨만" };

// 아이콘(선 아이콘 직접 그림)
const I = {
  sticker: <svg viewBox="0 0 24 24"><path d="M14 3H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h7l7-7V7a4 4 0 0 0-4-4h-3" /><path d="M14 21v-3a4 4 0 0 1 4-4h3" /><circle cx="9" cy="10" r=".6" /><circle cx="15" cy="10" r=".6" /><path d="M8.5 14.5c1.6 1.4 3.5 1.6 5.2.6" /></svg>,
  pen: <svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M14 7l3 3" /></svg>,
  undo: <svg viewBox="0 0 24 24"><path d="M9 7L4 12l5 5" /><path d="M4 12h10a6 6 0 0 1 0 12h-2" transform="translate(0 -6)" /></svg>,
  trash: <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>,
};

// 사진 꾸미기(11/7 2판, 인스타 스토리 편집기 방식): 한 화면 안에서 위 도구 아이콘 3개 → 스티커는 아래 서랍, 글자는 사진 위에서 바로, 펜은 화면 그대로.
// 한 손가락 옮기기 · 두 손가락 크기·돌리기 · 끌어서 아래 휴지통에 놓으면 지우기 · 글자를 누르면 다시 고치기
export default function DecoEditor({ src, items: initial = [], onSave, onClose }) {
  const [items, setItems] = useState(initial);
  const [sel, setSel] = useState(null);
  const [mode, setMode] = useState(null); // null | "sticker" | "text" | "draw"
  const [set, setSet] = useState(0);
  const [cat, setCat] = useState(0);
  const [edit, setEdit] = useState(null); // 글자 고치는 중: { i, v, f, c, d }
  const [last, setLast] = useState({ f: "gaegu", c: "#ffffff", d: "stroke" });
  const [pen, setPen] = useState({ c: "#ffffff", w: 12 });
  const [ratio, setRatio] = useState(1);
  const [drag, setDrag] = useState(null); // { over } 옮기는 중이면 휴지통 보이기
  const [busy, setBusy] = useState(false);
  const box = useRef(null);
  const trash = useRef(null);
  const ptrs = useRef(new Map());
  const gest = useRef(null);
  const live = useRef(items);
  live.current = items;
  const hist = useRef([]); // 되돌리기: 바꾸기 직전 모습들
  const remember = () => hist.current.push(live.current);
  const undo = () => (hist.current.length && setItems(hist.current.pop()), setSel(null));
  const upd = (i, patch) => setItems((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const addSticker = (id) => (remember(), setItems((l) => [...l, { t: "sticker", v: id, x: 50, y: 45, s: 26, r: 0 }]), setSel(items.length), setMode(null));
  const openText = (i) => {
    const it = i != null ? items[i] : null;
    setSel(null);
    setEdit(it ? { i, v: it.v, f: textSpec(it).font.id, c: textSpec(it).color, d: it.d || (it.style === "bubble" ? "box" : "stroke") } : { i: null, v: "", ...last });
    setMode("text");
  };
  function finishText() {
    const e = edit;
    const v = e.v.trim();
    setLast({ f: e.f, c: e.c, d: e.d });
    if (e.i != null || v) remember();
    if (e.i != null) v ? upd(e.i, { v, f: e.f, c: e.c, d: e.d, style: undefined }) : setItems((l) => l.filter((_, k) => k !== e.i));
    else if (v) setItems((l) => [...l, { t: "text", v, f: e.f, c: e.c, d: e.d, x: 50, y: 50, s: 10, r: 0 }]);
    setEdit(null);
    setMode(null);
  }

  const rel = (e) => ({ x: e.clientX, y: e.clientY });
  function down(e) {
    if (mode === "sticker" || mode === "text") return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 합성 이벤트 */ }
    const r = box.current.getBoundingClientRect();
    if (mode === "draw") {
      if (gest.current) return;
      const u = 1000 / r.width;
      remember();
      gest.current = { mode: "draw", id: e.pointerId, i: live.current.length };
      setItems((l) => [...l, { t: "draw", pts: [[(e.clientX - r.left) * u, (e.clientY - r.top) * u]], c: pen.c, w: pen.w }]);
      return;
    }
    const p = rel(e);
    ptrs.current.set(e.pointerId, p);
    const hit = e.target.closest?.("[data-i]");
    if (ptrs.current.size === 1) {
      if (!hit) return (setSel(null), (gest.current = null));
      const i = Number(hit.dataset.i);
      const tapEdit = sel === i && live.current[i].t === "text";
      setSel(i);
      remember();
      gest.current = { mode: "drag", i, sx: p.x, sy: p.y, x0: live.current[i].x, y0: live.current[i].y, moved: false, tapEdit };
    } else if (ptrs.current.size === 2 && gest.current) startPinch(gest.current.i);
  }
  function startPinch(i) {
    const [a, b] = [...ptrs.current.values()];
    const it = live.current[i];
    gest.current = { mode: "pinch", i, d0: dist(a, b), a0: angle(a, b), s0: it.s, r0: it.r || 0, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, x0: it.x, y0: it.y, moved: true };
  }
  const overTrash = (p) => {
    const t = trash.current?.getBoundingClientRect();
    return t && p.x > t.left - 16 && p.x < t.right + 16 && p.y > t.top - 16 && p.y < t.bottom + 16;
  };
  function move(e) {
    const g = gest.current;
    if (!g) return;
    const r = box.current.getBoundingClientRect();
    if (g.mode === "draw") {
      if (e.pointerId !== g.id) return;
      const u = 1000 / r.width;
      const pt = [(e.clientX - r.left) * u, (e.clientY - r.top) * u];
      return setItems((l) => l.map((x, k) => (k === g.i ? { ...x, pts: [...x.pts, pt] } : x)));
    }
    if (!ptrs.current.has(e.pointerId)) return;
    const p = rel(e);
    ptrs.current.set(e.pointerId, p);
    if (g.mode === "drag") {
      if (!g.moved && Math.hypot(p.x - g.sx, p.y - g.sy) < 6) return;
      g.moved = true;
      setDrag({ over: overTrash(p) });
      upd(g.i, { x: clamp(g.x0 + ((p.x - g.sx) / r.width) * 100, -10, 110), y: clamp(g.y0 + ((p.y - g.sy) / r.height) * 100, -10, 110) });
    } else if (ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      setDrag({ over: false });
      upd(g.i, {
        s: clamp(g.s0 * (dist(a, b) / g.d0), 3, 90),
        r: Math.round(g.r0 + angle(a, b) - g.a0),
        x: clamp(g.x0 + ((mx - g.mx) / r.width) * 100, -10, 110),
        y: clamp(g.y0 + ((my - g.my) / r.height) * 100, -10, 110),
      });
    }
  }
  function up(e) {
    const g = gest.current;
    if (g?.mode === "draw") return e.pointerId === g.id && (gest.current = null);
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size) {
      if (g?.mode === "pinch") {
        const p = [...ptrs.current.values()][0];
        gest.current = { mode: "drag", i: g.i, sx: p.x, sy: p.y, x0: live.current[g.i].x, y0: live.current[g.i].y, moved: true };
      }
      return;
    }
    gest.current = null;
    setDrag(null);
    if (!g) return;
    if (g.mode === "drag" && g.moved && overTrash(rel(e))) return (setItems((l) => l.filter((_, k) => k !== g.i)), setSel(null));
    if (g.mode === "drag" && !g.moved) hist.current.pop(); // 누르기만 했으면 되돌릴 것 없음
    if (g.mode === "drag" && !g.moved && g.tapEdit) openText(g.i);
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
  // 왼쪽 끝에서 밀면 뒤로(꾸민 것 저장하고 게시물로) — 사진 위 끌기와 겹치지 않게 가장자리에서만
  const sw = useSheetSwipe(save);
  const swipe = { ...sw, onTouchStart: (e) => (e.touches[0].clientX < 28 ? sw.onTouchStart(e) : sw.onTouchEnd({ currentTarget: e.currentTarget })) };
  const s = sel != null ? items[sel] : null;
  const draws = items.map((it, i) => [it, i]).filter(([it]) => it.t === "draw");
  const step = (k) => (remember(), upd(sel, { s: clamp(s.s * k, 3, 90) }));
  const turn = (d) => (remember(), upd(sel, { r: (s.r || 0) + d }));
  const del = () => (remember(), setItems((l) => l.filter((_, k) => k !== sel)), setSel(null));

  return createPortal(
    <div className="de-full" role="dialog" aria-label="사진 꾸미기" {...swipe}>
      {mode === "text" ? null : mode === "draw" ? (
        <div className="de-top">
          <button type="button" className="de-ic" aria-label="되돌리기" disabled={!hist.current.length} onClick={undo}>{I.undo}</button>
          <span className="de-top-title">손가락으로 그려요</span>
          <button type="button" className="de-done" onClick={() => setMode(null)}>다 그렸어요</button>
        </div>
      ) : (
        <div className="de-top">
          <button type="button" className="de-ic" aria-label="닫기(저장 안 함)" onClick={onClose}>✕</button>
          <span className="de-top-title">꾸미기</span>
          <button type="button" className="de-done" disabled={busy} onClick={save}>{busy ? "저장 중" : "완료"}</button>
        </div>
      )}
      <div className="de-stage" data-no-swipe onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div ref={box} className="de-box" style={{ "--r": ratio }}>
          <img src={src} alt="" draggable={false} onLoad={(e) => setRatio(e.target.naturalHeight / e.target.naturalWidth || 1)} />
          {draws.length > 0 && (
            <svg className="de-draw" viewBox={`0 0 1000 ${1000 * ratio}`} aria-hidden="true">
              {draws.map(([it, i]) => (
                <path key={i} d={it.pts.map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + (it.pts.length === 1 ? "l0.1 0" : "")} stroke={it.c} strokeWidth={it.w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
          )}
          {items.map((it, i) => it.t !== "draw" && !(edit && edit.i === i) && (
            <span key={i} data-i={i} className={`de-item${sel === i ? " on" : ""} ${it.t}${drag && sel === i ? (drag.over ? " doom" : " lift") : ""}`} style={{ left: `${it.x}%`, top: `${it.y}%`, fontSize: `${it.s * (it.t === "text" ? textSpec(it).font.scale || 1 : 1)}cqw`, transform: `translate(-50%,-50%) rotate(${it.r || 0}deg)`, ...(it.t === "text" ? textCss(it) : {}) }}>
              {isImgSticker(it) ? <img src={stickerSrc(it.v)} alt="" draggable={false} /> : it.v}
            </span>
          ))}
        </div>
      </div>
      <div className="de-bottom" style={mode === "text" ? { visibility: "hidden" } : undefined}>
        <div className="de-ctx">
        {drag ? (
          <div ref={trash} className={`de-trash${drag.over ? " over" : ""}`} aria-hidden="true">{I.trash}</div>
        ) : mode === "draw" ? (
          <>
            <Swatches value={pen.c} onPick={(c) => setPen({ ...pen, c })} />
            <div className="de-widths">
              {[6, 12, 24].map((w) => <button key={w} type="button" aria-label={`굵기 ${w}`} className={pen.w === w ? "on" : ""} onClick={() => setPen({ ...pen, w })}><i style={{ width: w / 1.5 + 4, height: w / 1.5 + 4 }} /></button>)}
            </div>
          </>
        ) : s ? (
          <div className="de-selbar">
            <button type="button" onClick={() => step(1 / 1.15)} aria-label="작게">－</button>
            <button type="button" onClick={() => step(1.15)} aria-label="크게">＋</button>
            <button type="button" onClick={() => turn(-15)} aria-label="왼쪽으로 돌리기">⟲</button>
            <button type="button" onClick={() => turn(15)} aria-label="오른쪽으로 돌리기">⟳</button>
            {s.t === "text" && <button type="button" onClick={() => openText(sel)}>고치기</button>}
            <button type="button" className="danger" onClick={del} aria-label="지우기">{I.trash}</button>
          </div>
        ) : (
          <p className="de-hint">{items.length ? "두 손가락으로 크기·방향 · 끌어서 휴지통에 놓으면 지워져요" : "아래에서 스티커·글자·그리기를 골라요"}</p>
        )}
        </div>
        {mode !== "draw" && (
          <div className="de-tools">
            <button type="button" onClick={() => (setSel(null), setMode("sticker"))}>{I.sticker}<span>스티커</span></button>
            <button type="button" onClick={() => openText(null)}><b className="de-aa">Aa</b><span>글자</span></button>
            <button type="button" onClick={() => (setSel(null), setMode("draw"))}>{I.pen}<span>그리기</span></button>
            <button type="button" disabled={!hist.current.length} onClick={undo}>{I.undo}<span>되돌리기</span></button>
          </div>
        )}
      </div>

      {mode === "sticker" && (
        <div className="de-tray-bg" onClick={(e) => e.target === e.currentTarget && setMode(null)}>
          <div className="de-tray" role="dialog" aria-label="스티커 고르기">
            <div className="de-grab" aria-hidden="true" />
            <div className="de-sets" role="tablist" aria-label="스티커 모양">
              {STICKER_SETS.map((g, k) => (
                <button key={g.label} type="button" role="tab" aria-selected={set === k} className={set === k ? "on" : ""} onClick={() => (setSet(k), setCat(0))}>{g.label}</button>
              ))}
            </div>
            <div className="de-row" role="tablist" aria-label="스티커 종류">
              {STICKER_SETS[set].cats.map((c, k) => (
                <button key={c.label} type="button" role="tab" aria-selected={cat === k} className={cat === k ? "on" : ""} onClick={() => setCat(k)}>{c.label}</button>
              ))}
            </div>
            <div className="de-stickers">
              {STICKER_SETS[set].cats[cat].ids.map((id) => (
                <button key={id} type="button" onClick={() => addSticker(id)} aria-label={`스티커 ${id.replace(/^[df]-/, "").replace(/[_-]/g, " ")}`}><img src={stickerSrc(id)} alt="" loading="lazy" /></button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === "text" && edit && (
        <div className="de-textmode">
          {/* 위에 원래 줄 대신 */}
          <div className="de-top">
            <button type="button" className="de-pill" onClick={() => setEdit({ ...edit, d: DECO_NEXT[edit.d] })} aria-label="글자 모양 바꾸기">
              <span className={`de-pill-a ${edit.d}`}>A</span> {DECO_LABEL[edit.d]}
            </button>
            <span style={{ flex: 1 }} />
            <button type="button" className="de-done" onClick={finishText}>완료</button>
          </div>
          <div className="de-textwrap" onClick={(e) => e.target === e.currentTarget && finishText()}>
            <textarea
              autoFocus
              rows={Math.max(1, edit.v.split("\n").length)}
              maxLength={60}
              value={edit.v}
              onChange={(e) => setEdit({ ...edit, v: e.target.value })}
              aria-label="넣을 글자"
              placeholder="글자 입력"
              style={{ ...textCss({ t: "text", f: edit.f, c: edit.c, d: edit.d }), fontSize: 34 * (fontOf(edit.f).scale || 1), whiteSpace: "pre-wrap", width: `min(100%, ${textWidth(edit) + 34 * 1.2}px)` }}
            />
          </div>
          <div className="de-textbar">
            <div className="de-row" aria-label="자주 쓰는 문구">
              {TEXT_PRESETS.map((t) => <button key={t} type="button" onClick={() => setEdit({ ...edit, v: t })}>{t}</button>)}
            </div>
            <div className="de-row" aria-label="글씨체">
              {FONTS.map((f) => <button key={f.id} type="button" className={edit.f === f.id ? "on" : ""} style={{ fontFamily: css(f), fontSize: 15 * (f.scale || 1) }} onClick={() => setEdit({ ...edit, f: f.id })}>{f.label}</button>)}
            </div>
            <Swatches value={edit.c} onPick={(c) => setEdit({ ...edit, c })} />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

// 입력칸을 글자 길이에 맞추기(사파리 옛 버전엔 field-sizing이 없음)
let meas;
function textWidth(e) {
  const f = fontOf(e.f);
  meas ||= document.createElement("canvas").getContext("2d");
  meas.font = `${f.weight || 400} ${34 * (f.scale || 1)}px ${css(f)}`;
  return Math.max(meas.measureText("글자 입력").width, ...e.v.split("\n").map((l) => meas.measureText(l).width));
}

function Swatches({ value, onPick }) {
  return (
    <div className="de-colors" role="radiogroup" aria-label="색">
      {COLORS.map((c) => <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={c} className={value === c ? "on" : ""} style={{ background: c }} onClick={() => onPick(c)} />)}
    </div>
  );
}

const textCss = (it) => {
  const st = textSpec(it);
  return { color: st.color, fontFamily: css(st.font), fontWeight: st.font.weight || 400, lineHeight: 1.2, whiteSpace: "pre", ...(st.stroke && { WebkitTextStroke: `0.08em ${st.stroke}`, paintOrder: "stroke fill" }), ...(st.box && { background: st.box, padding: "0.2em 0.45em", borderRadius: "0.45em" }) };
};
