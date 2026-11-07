import { useState } from "react";
import { createPortal } from "react-dom";
import Ico from "../components/Ico";
import { getPhotos, addPhotos, setPhotoMemo, removePhoto } from "../services/gallery";
import { saveDog } from "../services/dogRepository";
import { TYPES } from "../services/records";
import { resizeImageFile } from "../utils/image";

// 아이 갤러리(우리 아이 → 갤러리): 달마다 사진 모음, 누르면 크게 보고 메모·추억 적기·대표 사진으로·지우기
const ym = (at) => `${Number(at.slice(0, 4))}년 ${Number(at.slice(5, 7))}월`;
const dateLabel = (at) => `${Number(at.slice(5, 7))}월 ${Number(at.slice(8, 10))}일`;

export default function Gallery({ dog, onBack, onUpdateDog }) {
  const [photos, setPhotos] = useState(() => getPhotos(dog.id));
  const [open, setOpen] = useState(null); // 크게 보는 사진
  const [error, setError] = useState("");
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
      {!photos.length && (
        <label className="gl-empty">
          <Ico name="camera" size={28} />
          <b>첫 사진을 넣어 주세요</b>
          <span className="faint">여러 장을 한 번에 넣을 수 있어요</span>
          <input type="file" accept="image/*" multiple hidden onChange={add} />
        </label>
      )}
      {groups.map((g) => (
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
          onCover={() => (onUpdateDog?.(saveDog({ ...dog, photo: open.src })), setOpen(null))}
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

function PhotoSheet({ photo, isCover, onClose, onCover, onDelete, dog }) {
  const [memo, setMemo] = useState(photo.memo);
  const [saved, setSaved] = useState(false);
  const save = () => (setPhotoMemo(dog.id, photo.recId, memo), setSaved(true));
  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && (save(), onClose())}>
      <div className="es-sheet" role="dialog" aria-label="사진 보기" style={{ maxHeight: "96vh" }}>
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={() => (save(), onClose())}>✕</button>
          <div className="es-title">{dateLabel(photo.at)}{photo.type !== "media" ? ` · ${TYPES[photo.type]?.label} 기록` : ""}</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll" style={{ padding: "4px 16px 18px" }}>
          <img src={photo.src} alt="" className="gl-big" />
          <label className="field" style={{ marginTop: 10 }}>
            <span className="xs-label">메모 · 추억</span>
            <textarea rows={3} maxLength={500} value={memo} onChange={(e) => (setMemo(e.target.value), setSaved(false))} onBlur={save} placeholder="예: 처음으로 공원에 간 날. 낙엽 냄새를 한참 맡았어요" />
          </label>
          {saved && memo.trim() && <p className="faint" style={{ margin: "-4px 0 8px", fontSize: 12.5 }}>저장했어요</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-ghost" style={{ flex: 1 }} disabled={isCover} onClick={() => (save(), onCover())}>{isCover ? "지금 대표 사진" : "대표 사진으로"}</button>
            <button type="button" className="btn-ghost" style={{ flex: 1, color: "var(--danger)" }} onClick={onDelete}>지우기</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
