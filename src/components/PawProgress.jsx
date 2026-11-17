import { useEffect, useState } from "react";
import Ico from "./Ico";

// 발바닥 원형 게이지(11/18, 사용자). 서버가 준 progress { base, next, secs, since }로 "지금 값 → 다음 값" 사이를 흐른 시간만큼 채운다.
// 다음 값에 닿으면 거기서 멈춰 기다리고(서버가 다음 단계로 넘기면 다시 움직임), 끝(1)은 완성 때만.
// 11/18 새벽 다시(사용자): 발바닥은 앱에서 쓰는 선 아이콘(발도장 표식, 살구색) 그대로 원 한가운데, 바는 앱 파랑(배경과 같은 계열), 퍼센트는 원 밖 알약.
export function estimate(p, now = Date.now()) {
  if (!p) return 0;
  const since = p.since ? new Date(p.since).getTime() : now;
  const t = Math.max(0, Math.min(1, (now - since) / 1000 / Math.max(1, p.secs)));
  const eased = 1 - Math.pow(1 - t, 2); // 처음엔 빠르게, 끝에선 천천히
  return Math.min(p.next, p.base + (p.next - p.base) * eased);
}
export function usePercent(progress) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return Math.round(estimate(progress, now) * 100);
}

export default function PawProgress({ progress, size = 120, stroke = 9, label, percent = "below" }) {
  const pct = usePercent(progress);
  const v = pct / 100;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // 진행 끝점에 작은 점(어디까지 왔는지 눈이 따라가기 쉽게)
  const ang = -Math.PI / 2 + 2 * Math.PI * v;
  const tip = { x: size / 2 + r * Math.cos(ang), y: size / 2 + r * Math.sin(ang) };
  const paw = Math.round(size * 0.36);
  return (
    <div className="pawp-wrap" style={{ width: size }}>
      <div className="pawp" style={{ width: size, height: size }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label || "만드는 중"}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="var(--pawp-plate)" stroke="var(--pawp-track)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--pawp-bar)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .9s ease" }} />
          {v > 0.01 && <circle cx={tip.x} cy={tip.y} r={stroke * 0.28} fill="var(--pawp-ink)" style={{ transition: "cx .9s ease, cy .9s ease" }} />}
        </svg>
        {/* 앱에서 쓰는 발바닥 선 아이콘(발도장 표식과 같은 것)을 정중앙에 — 아이콘 상자 크기를 고정해 어긋나지 않게 */}
        <span className="pawp-paw" style={{ width: paw, height: paw, left: (size - paw) / 2, top: (size - paw) / 2 }}><Ico name="paw" size={paw} /></span>
      </div>
      {percent === "below" && <span className="pawp-pct">{pct}%</span>}
    </div>
  );
}
