import { useEffect, useRef, useState } from "react";
import Ico from "./Ico";

// 토스트 그리는 곳(App에 하나). services/toast.js의 toast()가 보낸 이벤트를 받아 아래 탭 위에 알약으로 띄운다.
export default function Toaster() {
  const [t, setT] = useState(null);
  const timer = useRef(null);
  useEffect(() => {
    const on = (e) => {
      clearTimeout(timer.current);
      setT({ ...e.detail, key: Date.now() });
      timer.current = setTimeout(() => setT(null), e.detail.ms);
    };
    window.addEventListener("dogcare-toast", on);
    return () => (window.removeEventListener("dogcare-toast", on), clearTimeout(timer.current));
  }, []);
  if (!t) return null;
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div key={t.key} className={`toast pop-in${t.action ? " has-action" : ""}`}>
        <Ico name={t.ico} size={18} />
        <span>{t.text}</span>
        {t.action && <button type="button" onClick={() => (clearTimeout(timer.current), setT(null), t.onAction?.())}>{t.action}</button>}
      </div>
    </div>
  );
}
