import { useEffect, useRef } from "react";

// 아래로 당겨 새로고침(사파리·인스타그램처럼): 화면 맨 위에서 아래로 당기면 화면이 손가락을 따라 내려오고(점점 무겁게)
// 위에서 동그란 표시가 돌며 내려온다. 충분히 당겼다 놓으면 onRefresh가 끝날 때까지 돌다가 제자리로.
// 손가락 따라가기는 화면을 다시 그리지 않도록 DOM에 직접 적용한다(매 프레임 React 갱신은 버벅임).
const TRIGGER = 70; // 이만큼(px) 내려오면 놓았을 때 새로고침
const HOLD = 56; // 새로고침 중 화면이 내려와 있는 높이
const MAX = 130;
const ANIM = "transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)";

export default function PullToRefresh({ targetRef, onRefresh, isBlocked }) {
  const ptrRef = useRef(null);
  const busy = useRef(false);
  const latest = useRef({ onRefresh, isBlocked });
  latest.current = { onRefresh, isBlocked };

  useEffect(() => {
    const root = targetRef.current;
    if (!root) return;
    let g = null; // 지금 제스처: { y, x, page, pull, pulling }

    const show = (page, pull, animate) => {
      const ptr = ptrRef.current;
      ptr.style.transition = animate ? ANIM : "none";
      if (page) {
        page.style.transition = ptr.style.transition;
        page.style.transform = pull ? `translateY(${pull}px)` : "";
      }
      ptr.style.transform = `translateY(${pull - 48}px) rotate(${pull * 3}deg)`;
      ptr.style.opacity = String(Math.min(1, pull / TRIGGER));
      ptr.classList.toggle("ready", pull >= TRIGGER);
    };

    const onStart = (e) => {
      if (busy.current || e.touches.length > 1 || e.target.closest("input, textarea, select")) return void (g = null);
      const page = e.target.closest(".swipe-back-top") || e.target.closest(".pager-page");
      if (!page || latest.current.isBlocked?.(page)) return void (g = null);
      // 손가락 아래의 스크롤 영역이 하나라도 맨 위가 아니면 평소 스크롤
      for (let n = e.target; n && n !== root; n = n.parentElement) if (n.scrollTop > 0) return void (g = null);
      g = { y: e.touches[0].clientY, x: e.touches[0].clientX, page, pull: 0, pulling: false };
    };

    const onMove = (e) => {
      if (!g) return;
      const dy = e.touches[0].clientY - g.y;
      const dx = e.touches[0].clientX - g.x;
      if (!g.pulling) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy)) return void (g = null); // 위로 스크롤·옆으로 밀기는 그대로
        g.pulling = true;
      }
      e.preventDefault(); // 아이폰 기본 튕김 대신 우리 표시가 따라오게
      g.pull = Math.min(MAX, dy * 0.5);
      show(g.page, g.pull, false);
    };

    const onEnd = async () => {
      const cur = g;
      g = null;
      if (!cur?.pulling) return;
      if (cur.pull < TRIGGER) return show(cur.page, 0, true);
      busy.current = true;
      show(cur.page, HOLD, true);
      ptrRef.current.classList.add("spinning");
      const started = Date.now();
      try {
        await latest.current.onRefresh();
      } finally {
        // 너무 빨리 끝나도 돈 게 보이게 조금은 기다린다
        await new Promise((r) => setTimeout(r, Math.max(0, 600 - (Date.now() - started))));
        ptrRef.current?.classList.remove("spinning");
        if (ptrRef.current) show(cur.page.isConnected ? cur.page : null, 0, true); // 새로 그려져 사라진 화면이면 표시만 거둔다
        busy.current = false;
      }
    };

    root.addEventListener("touchstart", onStart, { passive: true });
    root.addEventListener("touchmove", onMove, { passive: false });
    root.addEventListener("touchend", onEnd);
    root.addEventListener("touchcancel", onEnd);
    return () => {
      root.removeEventListener("touchstart", onStart);
      root.removeEventListener("touchmove", onMove);
      root.removeEventListener("touchend", onEnd);
      root.removeEventListener("touchcancel", onEnd);
    };
  }, [targetRef]);

  return (
    <div ref={ptrRef} className="ptr" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M12 4a8 8 0 1 0 8 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M12 1.5 15.5 4 12 6.5Z" fill="currentColor" className="ptr-arrow" />
      </svg>
    </div>
  );
}
