import { useRef } from "react";

export const TABS = [
  { key: "main", label: "비서", icon: "🐶" },
  { key: "home", label: "체크리스트", icon: "✅" },
  { key: "calendar", label: "일정표", icon: "🗓️" },
  { key: "budget", label: "가계부", icon: "💰" },
  { key: "profile", label: "프로필", icon: "🐾" },
];

const LONG_PRESS_MS = 500;
const DOUBLE_TAP_MS = 300;

// ponytail: 포인터 이벤트만으로 탭/더블탭/롱프레스를 구분한다 — 키보드(Enter)로 활성화하는
// 경로는 다루지 않는다. 이 앱은 폰에서만 쓰는 PWA라 지금은 그 정도로 충분하다.
export default function BottomNav({ active, onChange, onItemLongPress, onItemDoubleTap }) {
  const pressState = useRef({});

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
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          className={`nav-item${active === tab.key ? " active" : ""}`}
          style={{ touchAction: "manipulation" }}
          onPointerDown={() => handlePointerDown(tab.key)}
          onPointerUp={() => handlePointerUp(tab.key)}
          onPointerLeave={() => handlePointerLeave(tab.key)}
        >
          <span aria-hidden="true">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
