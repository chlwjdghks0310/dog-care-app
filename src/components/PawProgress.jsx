import { useEffect, useState } from "react";
import Ico from "./Ico";

// 발바닥 둘레 원형 게이지(11/18, 사용자). 서버가 준 progress { base, next, secs, since }로 "지금 값 → 다음 값" 사이를 흐른 시간만큼 채운다.
// 다음 값에 닿으면 거기서 멈춰 기다리고(서버가 다음 단계로 넘기면 다시 움직임), 끝(1)은 완성 때만.
export function estimate(p, now = Date.now()) {
  if (!p) return 0;
  const since = p.since ? new Date(p.since).getTime() : now;
  const t = Math.max(0, Math.min(1, (now - since) / 1000 / Math.max(1, p.secs)));
  const eased = 1 - Math.pow(1 - t, 2); // 처음엔 빠르게, 끝에선 천천히
  return Math.min(p.next, p.base + (p.next - p.base) * eased);
}

export default function PawProgress({ progress, size = 112, stroke = 8, label }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const v = estimate(progress, now);
  const pct = Math.round(v * 100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="pawp" style={{ width: size, height: size }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label || "만드는 중"}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-strong)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .9s ease" }} />
      </svg>
      <div className="pawp-in">
        <span className="pawp-paw"><Ico name="paw" size={Math.round(size * 0.3)} /></span>
        <b>{pct}%</b>
      </div>
    </div>
  );
}
