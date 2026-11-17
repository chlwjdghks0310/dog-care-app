import { useEffect, useState } from "react";

// 발바닥 원형 게이지(11/18, 사용자). 서버가 준 progress { base, next, secs, since }로 "지금 값 → 다음 값" 사이를 흐른 시간만큼 채운다.
// 다음 값에 닿으면 거기서 멈춰 기다리고(서버가 다음 단계로 넘기면 다시 움직임), 끝(1)은 완성 때만.
// 11/18 새벽 다시: 발바닥은 원 한가운데(살구색 도장이 천천히 찍히듯 숨 쉼), 퍼센트는 원 밖 아래 작은 알약으로(겹침 없음), 색은 앱 보조색(살구 --warm)과 갈색 잉크.
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
  return (
    <div className="pawp-wrap" style={{ width: size }}>
      <div className="pawp" style={{ width: size, height: size }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label || "만드는 중"}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="var(--pawp-plate)" stroke="var(--pawp-track)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--pawp-bar)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .9s ease" }} />
          {v > 0.01 && <circle cx={tip.x} cy={tip.y} r={stroke * 0.28} fill="var(--pawp-ink)" style={{ transition: "cx .9s ease, cy .9s ease" }} />}
          {/* 발바닥을 같은 SVG 안에 직접 그린다 — 아이콘 라이브러리의 감싼 상자 때문에 중심이 어긋나던 일(11/18) */}
          <g className="pawp-paw" fill="var(--pawp-ink)">
            <ellipse cx={size / 2} cy={size / 2 + size * 0.07} rx={size * 0.125} ry={size * 0.1} />
            <circle cx={size / 2 - size * 0.155} cy={size / 2 - size * 0.05} r={size * 0.052} />
            <circle cx={size / 2 - size * 0.055} cy={size / 2 - size * 0.15} r={size * 0.055} />
            <circle cx={size / 2 + size * 0.055} cy={size / 2 - size * 0.15} r={size * 0.055} />
            <circle cx={size / 2 + size * 0.155} cy={size / 2 - size * 0.05} r={size * 0.052} />
          </g>
        </svg>
      </div>
      {percent === "below" && <span className="pawp-pct">{pct}%</span>}
    </div>
  );
}
