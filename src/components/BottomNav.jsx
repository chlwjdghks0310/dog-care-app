import { startTransition, useEffect, useOptimistic, useRef } from "react";
// 움직이는 아이콘(animateicons.in, MIT · Lucide 모양 기반 — 저작권 표시는 public/licenses.txt)
import { DogIcon, NotebookPenIcon, PawPrintIcon, SproutIcon, StethoscopeIcon } from "@animateicons/react/lucide";

export const TABS = [
  // 11/26(사용자): '오늘' → '비서', 순서는 케어 · 기록 · 비서 · 병원 · 우리 아이 — 비서가 한가운데이자 앱을 열면 처음 보이는 화면(key는 그대로 main)
  { key: "care", label: "케어", Icon: SproutIcon }, // 11/15: 월령별 가이드·퍼피 100일. 새싹 = 시기에 맞춰 자라는 아이
  { key: "records", label: "기록", Icon: NotebookPenIcon },
  { key: "main", label: "비서", Icon: DogIcon },
  { key: "hospital", label: "병원", Icon: StethoscopeIcon },
  { key: "profile", label: "우리 아이", Icon: PawPrintIcon },
];

const LONG_PRESS_MS = 500;
const DOUBLE_TAP_MS = 300;

// ponytail: 포인터 이벤트만으로 탭/더블탭/롱프레스를 구분한다 — 키보드(Enter)로 활성화하는
// 경로는 다루지 않는다. 이 앱은 폰에서만 쓰는 PWA라 지금은 그 정도로 충분하다.
export default function BottomNav({ active, onChange, onItemLongPress, onItemDoubleTap }) {
  const pressState = useRef({});
  const iconRefs = useRef({}); // 탭을 누르면 그 아이콘이 한 번 움직인다(폰엔 마우스 올리기가 없어서 직접 시작)
  // 탭 높이(아이폰 하단 여백 포함)를 CSS에 알려 둔다 — 비서 답변 읽기 때 이만큼 아래로 내려 숨긴다(index.css .reading)
  const navRef = useRef(null);
  // 누르는 순간 막대부터 옮긴다(11/28 끊김): 탭 화면 바꾸기는 급하지 않은 일로 넘기고, 그동안 막대는 누른 탭을 보여 준다
  const [shown, showTab] = useOptimistic(active);
  useEffect(() => {
    const el = navRef.current;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--nav-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function getState(key) {
    if (!pressState.current[key]) pressState.current[key] = { timer: null, longPressFired: false, lastTapAt: 0 };
    return pressState.current[key];
  }

  function handlePointerDown(key) {
    const state = getState(key);
    state.longPressFired = false;
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.longPressFired = true;
      onItemLongPress?.(key);
    }, LONG_PRESS_MS);
  }

  function handlePointerUp(key) {
    iconRefs.current[key]?.startAnimation?.();
    const state = getState(key);
    clearTimeout(state.timer);
    if (state.longPressFired) {
      state.lastTapAt = 0;
      return;
    }
    const now = Date.now();
    if (state.lastTapAt && now - state.lastTapAt < DOUBLE_TAP_MS) {
      state.lastTapAt = 0;
      onItemDoubleTap?.(key);
    } else {
      state.lastTapAt = now;
      startTransition(() => { showTab(key); onChange(key); });
    }
  }

  function handlePointerLeave(key) {
    clearTimeout(getState(key).timer);
  }

  return (
    <nav ref={navRef} className="bottom-nav">
      {/* 슬라이딩 필(11/15): 켜진 탭 뒤의 둥근 판이 탭 사이를 미끄러져 간다. 탭 수로 폭을 나눈다 */}
      <span className="nav-pill" aria-hidden="true" style={{ width: `calc((100% - 12px) / ${TABS.length})`, transform: `translateX(${Math.max(0, TABS.findIndex((t) => t.key === shown)) * 100}%)` }} />
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`nav-item${shown === tab.key ? " active" : ""}`}
          style={{ touchAction: "manipulation" }}
          onPointerDown={() => handlePointerDown(tab.key)}
          onPointerUp={() => handlePointerUp(tab.key)}
          onPointerLeave={() => handlePointerLeave(tab.key)}
        >
          <tab.Icon ref={(el) => (iconRefs.current[tab.key] = el)} size={24} duration={0.6} aria-hidden="true" />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
