import { useState } from "react";
import { createPortal } from "react-dom";
import Ico from "../components/Ico";
import { getPhotos, addPhotos, setPhotoMemo, removePhoto, saveDecorated, decoOf } from "../services/gallery";
import DecoEditor from "../components/DecoEditor";
import { FramedPhoto } from "../components/PhotoFrame";
import { saveDog } from "../services/dogRepository";
import { TYPES } from "../services/records";
import { resizeImageFile } from "../utils/image";

// 아이 갤러리(우리 아이 → 갤러리): 달마다 사진 모음, 누르면 크게 보고 메모·추억 적기·대표 사진으로·지우기
const ym = (at) => `${Number(at.slice(0, 4))}년 ${Number(at.slice(5, 7))}월`;
const dateLabel = (at) => `${Number(at.slice(5, 7))}월 ${Number(at.slice(8, 10))}일`;
const fullDate = (at) => `${Number(at.slice(0, 4))}년 ${dateLabel(at)}`;
const agoLabel = (at) => {
  const d = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
  return d <= 0 ? "오늘" : d === 1 ? "어제" : d < 7 ? `${d}일 전` : d < 31 ? `${Math.floor(d / 7)}주 전` : fullDate(at);
};

export default function Gallery({ dog, onBack, onUpdateDog }) {
  const [photos, setPhotos] = useState(() => getPhotos(dog.id));
  const [open, setOpen] = useState(null); // 크게 보는 사진
  const [error, setError] = useState("");
  const [view, setView] = useState("grid"); // grid | feed
  const reload = () => setPhotos(getPhotos(dog.id));

  async function add(e) {
    const files = [...(e.target.files || [])].slice(0, 10);
    e.target.value = "";
    if (!files.length) return;
    setError("");
    try {
      const urls = await Promise.all(files.map((f) => resizeImageFile(f, 900, 0.8)));
      addPhotos(dog.id, urls);
    } catch (err) {
      setError(err.message || "사진을 불러오지 못했어요.");
    }
    reload();
    const fresh = getPhotos(dog.id);
    if (files.length === 1 && fresh[0]) setOpen(fresh[0]); // 한 장이면 바로 메모 적기
  }

  const groups = [];
  for (const p of photos) {
    const g = ym(p.at);
    if (groups.at(-1)?.title !== g) groups.push({ title: g, items: [] });
    groups.at(-1).items.push(p);
  }

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>← 우리 아이로</button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div className="h1" style={{ margin: 0 }}>{dog.name} 갤러리</div>
        <label className="btn-primary small" style={{ cursor: "pointer" }}>
          ＋ 사진
          <input type="file" accept="image/*" multiple hidden onChange={add} />
        </label>
      </div>
      <p className="subtle" style={{ margin: "0 0 12px" }}>사진 {photos.length}장 · 사진을 누르면 그날의 메모·추억을 적을 수 있어요. 넣은 사진은 기록 탭에도 '사진'으로 남아요.</p>
      {error && <p className="error-text">{error}</p>}
      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <button type="button" className={`seg${view === "grid" ? " on" : ""}`} onClick={() => setView("grid")}>▦ 모아 보기</button>
          <button type="button" className={`seg${view === "feed" ? " on" : ""}`} onClick={() => setView("feed")}>☰ 게시물로 보기</button>
        </div>
      )}
      {!photos.length && (
        <label className="gl-empty">
          <Ico name="camera" size={28} />
          <b>첫 사진을 넣어 주세요</b>
          <span className="faint">여러 장을 한 번에 넣을 수 있어요</span>
          <input type="file" accept="image/*" multiple hidden onChange={add} />
        </label>
      )}
      {view === "feed" &&
        photos.map((p) => (
          <article key={p.key} className="feed-card" onClick={() => setOpen(p)}>
            <img src={p.src} alt={p.memo || "사진"} loading="lazy" />
            <div className="feed-body">
              {p.memo ? <p className="post-caption"><b>{dog.name}</b> {p.memo}</p> : <p className="faint" style={{ margin: 0 }}>눌러서 이날의 문구를 남겨 보세요</p>}
              <span className="faint post-date">{fullDate(p.at)}</span>
            </div>
          </article>
        ))}
      {view === "grid" && groups.map((g) => (
        <section key={g.title} style={{ marginBottom: 14 }}>
          <div className="h2" style={{ fontSize: 15, margin: "0 2px 8px" }}>{g.title}</div>
          <div className="gl-grid">
            {g.items.map((p) => (
              <button key={p.key} type="button" className="gl-item" onClick={() => setOpen(p)} aria-label={`${dateLabel(p.at)} 사진${p.memo ? `, ${p.memo}` : ""}`}>
                <img src={p.src} alt="" loading="lazy" />
                {p.memo && <span className="gl-memo-dot" aria-hidden="true"><Ico name="pencil" size={11} /></span>}
              </button>
            ))}
          </div>
        </section>
      ))}
      {open && (
        <PhotoSheet
          dog={dog}
          photo={open}
          isCover={dog.photo === open.src}
          onClose={() => (setOpen(null), reload())}
          onCover={(src) => (onUpdateDog?.(saveDog({ ...dog, photo: src || open.src, coverPos: null })), setOpen(null), reload())}
          onDelete={() => {
            if (!window.confirm("이 사진을 지울까요?")) return;
            removePhoto(dog.id, open.recId, open.idx);
            setOpen(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

// 사진 한 장(게시물 보기, 11/7): 크게 보고 아래에 문구. 고치기는 [수정] — 문구·꾸미기·대표 사진으로·지우기
function PhotoSheet({ photo, isCover, onClose, onCover, onDelete, dog }) {
  const [memo, setMemo] = useState(photo.memo);
  const [src, setSrc] = useState(photo.src);
  const [editing, setEditing] = useState(false);
  const [deco, setDeco] = useState(null);
  const [error, setError] = useState("");
  const done = () => (setPhotoMemo(dog.id, photo.recId, memo), setEditing(false));
  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet post-sheet" role="dialog" aria-label="사진 보기">
        <div className="post-head">
          <FramedPhoto src={dog.photo} pos={dog.coverPos} frame={dog.frame} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{dog.name}</b>
            <span className="faint">{fullDate(photo.at)}{photo.type !== "media" ? ` · ${TYPES[photo.type]?.label} 기록` : ""}</span>
          </div>
          {!editing && <button type="button" className="btn-ghost small" onClick={() => setEditing(true)}>수정</button>}
          <button type="button" className="es-x" aria-label="닫기" onClick={() => (editing && done(), onClose())}>✕</button>
        </div>
        <div className="es-scroll" style={{ padding: 0 }}>
          <img src={src} alt={memo || "사진"} className="post-img" />
          {!editing ? (
            <div className="post-body">
              {memo.trim() ? (
                <p className="post-caption"><b>{dog.name}</b> {memo}</p>
              ) : (
                <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => setEditing(true)}>✏️ 이날의 문구·추억 쓰기</button>
              )}
              <span className="faint post-date">{agoLabel(photo.at)}</span>
            </div>
          ) : (
            <div className="post-body">
              <label className="field">
                <span className="xs-label">문구 · 추억</span>
                <textarea rows={3} maxLength={500} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 처음으로 공원에 간 날. 낙엽 냄새를 한참 맡았어요" autoFocus />
              </label>
              <div className="post-edit">
                <button type="button" className="btn-ghost" onClick={() => setDeco(decoOf(dog.id, photo.recId, photo.idx))}>🎨 스티커·글자 꾸미기</button>
                <button type="button" className="btn-ghost" disabled={isCover} onClick={() => (done(), onCover(src))}>{isCover ? "지금 대표 사진" : "대표 사진으로"}</button>
                <button type="button" className="btn-ghost" style={{ color: "var(--danger)" }} onClick={onDelete}>지우기</button>
              </div>
              {error && <p className="error-text">{error}</p>}
              <button type="button" className="btn-primary" onClick={done}>완료</button>
            </div>
          )}
        </div>
      </div>
      {deco && (
        <DecoEditor
          src={deco.orig}
          items={deco.items}
          onClose={() => setDeco(null)}
          onSave={(out, items) => {
            try {
              saveDecorated(dog.id, photo.recId, photo.idx, out, items);
              setSrc(items.length ? out : deco.orig);
              setDeco(null);
            } catch (e) {
              setError(e.message);
              setDeco(null);
            }
          }}
        />
      )}
    </div>,
    document.body
  );
}
