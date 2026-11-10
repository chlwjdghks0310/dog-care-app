import { useEffect, useState } from "react";
import { justUpdated } from "../services/beta";
import { WHATS_NEW } from "../whatsnew";

// 새 버전으로 바뀐 뒤 처음 열 때 위쪽에 4초 — "새로고침할래요?"보다 바뀐 점을 알려 주는 쪽(베타 조사 ③)
export default function WhatsNew() {
  const [show, setShow] = useState(() => Boolean(WHATS_NEW) && justUpdated());
  useEffect(() => {
    if (!show) return;
    const id = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(id);
  }, [show]);
  if (!show) return null;
  return (
    <div className="whats-new rise-in" role="status" onClick={() => setShow(false)}>
      <b>새 버전이에요</b> · {WHATS_NEW}
    </div>
  );
}
