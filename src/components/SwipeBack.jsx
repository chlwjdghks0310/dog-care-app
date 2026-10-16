import { useRef, useState } from "react";

// 세부 화면(더보기 등)을 오른쪽으로 밀면 인스타그램처럼 뒤로 간다: 화면이 손가락을 따라 밀려나고
// 아래에서 이전 화면이 조금씩 따라 나온다. 화면 너비의 35%를 넘기거나 빠르게 튕기면 뒤로, 아니면 제자리로.
const BACK_RATIO = 0.35;
const FLICK_SPEED = 0.5; // px/ms
const ANIM_MS = 220;

export default function SwipeBack({ renderUnderlay, onBack, children }) {
  const topRef = useRef(null);
  const underRef = useRef(null);
  const drag = useRef(null);
  const [showUnderlay, setShowUnderlay] = useState(false);

  function place(dx, animate) {
    const width = topRef.current.offsetWidth;
    const t = animate ? `transform ${ANIM_MS}ms ease-out` : "none";
    topRef.current.style.transition = t;
    topRef.current.style.transform = `translateX(${dx}px)`;
    if (underRef.current) {
      underRef.current.style.transition = t;
      underRef.current.style.transform = `translateX(${(dx / width - 1) * 30}%)`;
      underRef.current.style.opacity = String(0.6 + (0.4 * dx) / width);
    }
  }

  function onTouchStart(e) {
    const t = e.touches[0];
    const blocked = e.touches.length > 1 || e.target.closest?.("input, textarea, select, [data-no-swipe]") || hasHorizontalScroll(e.target);
    drag.current = blocked ? null : { x: t.clientX, y: t.clientY, at: Date.now(), dx: 0, active: false };
  }

  function onTouchMove(e) {
    const d = drag.current;
    if (!d) return;
    const t = e.touches[0];
    const dx = t.clientX - d.x;
    const dy = t.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      // 가로로 먼저, 오른쪽으로 움직일 때만 뒤로가기로 인식(세로 스크롤은 그대로)
      if (dx <= 0 || Math.abs(dx) < Math.abs(dy) * 1.2) {
        drag.current = null;
        return;
      }
      d.active = true;
      setShowUnderlay(true);
    }
    d.dx = Math.max(0, dx);
    place(d.dx, false);
  }

  function onTouchEnd() {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    const width = topRef.current.offsetWidth;
    const speed = d.dx / Math.max(1, Date.now() - d.at);
    if (d.dx > width * BACK_RATIO || speed > FLICK_SPEED) {
      place(width, true);
      setTimeout(onBack, ANIM_MS);
    } else {
      place(0, true);
      setTimeout(() => setShowUnderlay(false), ANIM_MS);
    }
  }

  return (
    <div className="swipe-back">
      {showUnderlay && (
        <div ref={underRef} className="swipe-back-layer swipe-back-under" aria-hidden="true">
          {renderUnderlay()}
        </div>
      )}
      <div
        ref={topRef}
        className="swipe-back-layer swipe-back-top"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

function hasHorizontalScroll(el) {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(node).overflowX)) return true;
  }
  return false;
}
