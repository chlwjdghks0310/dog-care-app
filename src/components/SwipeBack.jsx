import { useRef, useState } from "react";

// 세부 화면(더보기 등)을 오른쪽으로 밀면 인스타그램처럼 뒤로 간다: 화면이 손가락을 따라 밀려나고
// 아래에서 이전 화면이 조금씩 따라 나온다. 화면 너비의 35%를 넘기거나 빠르게 튕기면 뒤로, 아니면 제자리로.
const BACK_RATIO = 0.35;
const FLICK_SPEED = 0.5; // px/ms
const ANIM_MS = 220;

// 오른쪽으로 미는 손가락 따라가기(세로 스크롤·입력칸·가로 스크롤 영역은 건드리지 않음).
// onMove(dx): 끄는 중, onEnd(back): 손을 뗌(back=뒤로 갈지)
function useRightDrag({ onStart, onMove, onEnd }) {
  const drag = useRef(null);
  return {
    onTouchStart(e) {
      const t = e.touches[0];
      const blocked = e.touches.length > 1 || e.target.closest?.("input, textarea, select, [data-no-swipe]") || hasHorizontalScroll(e.target);
      drag.current = blocked ? null : { x: t.clientX, y: t.clientY, at: Date.now(), dx: 0, active: false };
    },
    onTouchMove(e) {
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
        onStart?.();
      }
      d.dx = Math.max(0, dx);
      onMove(d.dx);
    },
    onTouchEnd(e) {
      const d = drag.current;
      drag.current = null;
      if (!d?.active) return;
      const width = e.currentTarget.offsetWidth;
      const speed = d.dx / Math.max(1, Date.now() - d.at);
      onEnd(d.dx > width * BACK_RATIO || speed > FLICK_SPEED, width);
    },
  };
}

export default function SwipeBack({ renderUnderlay, onBack, children }) {
  const topRef = useRef(null);
  const underRef = useRef(null);
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

  const handlers = useRightDrag({
    onStart: () => setShowUnderlay(true),
    onMove: (dx) => place(dx, false),
    onEnd: (back, width) => {
      if (back) {
        place(width, true);
        setTimeout(onBack, ANIM_MS);
      } else {
        place(0, true);
        setTimeout(() => setShowUnderlay(false), ANIM_MS);
      }
    },
  });

  return (
    <div className="swipe-back">
      {showUnderlay && (
        <div ref={underRef} className="swipe-back-layer swipe-back-under" aria-hidden="true">
          {renderUnderlay()}
        </div>
      )}
      <div ref={topRef} className="swipe-back-layer swipe-back-top" {...handlers} onTouchCancel={handlers.onTouchEnd}>
        {children}
      </div>
    </div>
  );
}

// 위에 덮이는 전체 화면(설정 등)을 오른쪽으로 밀어 닫기 — 밀려나는 만큼 아래의 앱 화면이 보인다.
// 쓰는 법: <div className="settings-sheet" {...useSwipeClose(onClose)}>
export function useSwipeClose(onClose) {
  const place = (el, dx, animate) => {
    el.style.transition = animate ? `transform ${ANIM_MS}ms ease-out` : "none";
    el.style.transform = dx ? `translateX(${dx}px)` : "";
  };
  const elRef = useRef(null);
  const handlers = useRightDrag({
    onMove: (dx) => place(elRef.current, dx, false),
    onEnd: (back, width) => {
      place(elRef.current, back ? width : 0, true);
      if (back) setTimeout(onClose, ANIM_MS);
    },
  });
  return {
    onTouchStart: (e) => ((elRef.current = e.currentTarget), handlers.onTouchStart(e)),
    onTouchMove: handlers.onTouchMove,
    onTouchEnd: handlers.onTouchEnd,
    onTouchCancel: handlers.onTouchEnd,
  };
}

function hasHorizontalScroll(el) {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (node.scrollWidth > node.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(node).overflowX)) return true;
  }
  return false;
}
