import Ico from "./Ico";
// 오늘 진행 상황을 동그라미로 — done/total만 보여 준다(점수나 건강 판정이 아님).
export default function ProgressRing({ done, total, size = 64, stroke = 7, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = total ? Math.min(1, done / total) : 0;
  const full = total > 0 && done >= total;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${label || "진행"} ${total}개 중 ${done}개 완료`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-soft)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={full ? "var(--success)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="ring-bar"
        />
      </svg>
      <span className="ring-text" style={{ fontSize: size * 0.22 }}>{full ? <Ico name="party" size={Math.round(size * 0.3)} /> : `${done}/${total}`}</span>
    </div>
  );
}
