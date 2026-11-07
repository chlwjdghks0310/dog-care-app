import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";

// 어디서나 같은 + 버튼 하나: 하루 체크 · 새 기록 · 진료 정리 · 몸무게 — 입력 길을 하나로(제안 분석 11/7 ③).
// 아래로 내리면 숨고, 위로 올리거나 맨 위면 나타난다(예전 우리 아이 '새 기록' 버튼과 같은 동작)
const ITEMS = [
  ["check", "check", "teal", "하루 체크", "오늘 평소와 같았는지"],
  ["record", "pencil", "blue", "새 기록", "증상·식사·배변·사진 등"],
  ["doc", "camera", "rose", "진료 정리", "영수증·약봉투 사진으로"],
  ["weight", "scales", "violet", "몸무게", "지금 몸무게 적기"],
];
export default function QuickAddFab({ onPick }) {
  const ref = useRef(null);
  const [show, setShow] = useState(true);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const page = ref.current?.closest(".screen")?.scrollHeight > ref.current?.closest(".screen")?.clientHeight ? ref.current.closest(".screen") : ref.current?.closest(".pager-page");
    if (!page) return;
    let last = page.scrollTop;
    const onScroll = () => {
      const top = page.scrollTop;
      if (top <= 8) setShow(true);
      else if (top > last + 4) setShow(false);
      else if (top < last - 4) setShow(true);
      last = top;
    };
    page.addEventListener("scroll", onScroll, { passive: true });
    return () => page.removeEventListener("scroll", onScroll);
  }, []);
  if (!onPick) return null;
  return (
    <div ref={ref} className="fab-wrap">
      <button type="button" className={`fab${show ? "" : " hidden"}`} onClick={() => setOpen(true)} aria-label="기록하기" tabIndex={show ? 0 : -1}>
        <Ico name="pencil" size={24} />
      </button>
      {open &&
        createPortal(
          <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
            <div className="es-sheet" role="dialog" aria-label="기록하기">
              <div className="es-top">
                <button type="button" className="es-x" aria-label="닫기" onClick={() => setOpen(false)}>✕</button>
                <div className="es-title">무엇을 남길까요?</div>
                <span style={{ width: 36 }} />
              </div>
              <div className="es-scroll qa-grid" style={{ padding: "4px 16px 20px" }}>
                {ITEMS.map(([key, ico, tone, label, sub]) => (
                  <button key={key} type="button" className="qa-item" onClick={() => (setOpen(false), onPick(key))}>
                    <Ico name={ico} size={22} className={`cat-ico tone-${tone}`} />
                    <b>{label}</b>
                    <span className="faint">{sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
