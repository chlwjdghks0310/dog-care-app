import { useEffect, useRef } from "react";
// 움직이는 아이콘(animateicons.in, MIT · Lucide 모양 기반 — 저작권 표시는 public/licenses.txt)
import { CalendarDaysIcon, DogIcon, ListChecksIcon, PawPrintIcon, WalletIcon } from "@animateicons/react/lucide";

export const TABS = [
  { key: "main", label: "비서", Icon: DogIcon },
  { key: "home", label: "체크리스트", Icon: ListChecksIcon },
  { key: "profile", label: "프로필", Icon: PawPrintIcon },
  { key: "calendar", label: "일정표", Icon: CalendarDaysIcon },
  { key: "budget", label: "가계부", Icon: WalletIcon },
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
      onChange(key);
    }
  }

  function handlePointerLeave(key) {
    clearTimeout(getState(key).timer);
  }

  return (
    <nav ref={navRef} className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`nav-item${active === tab.key ? " active" : ""}`}
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
