import { useState } from "react";
import { toDateKey, formatKoreanDate } from "../utils/date";

// 외부 차트 라이브러리 없이 그린 최소한의 SVG 선 그래프. 이 프로젝트엔 차트 라이브러리가 아직
// 없고, 점 몇 개짜리 체중 그래프 정도는 라이브러리를 새로 추가할 만큼 복잡하지 않다고 판단했다.
const WIDTH = 320;
const HEIGHT = 170;
const PAD = { top: 16, right: 16, bottom: 22, left: 8 };

// records의 각 항목은 { weightKg, measuredAt, color, bandMin, bandMax, statusText? } 형태다.
// color/bandMin/bandMax/statusText는 호출 쪽(WeightTracker)이 그 시점 월령 기준으로 미리 계산해
// 넘겨준다 — 적정 구간이 월령에 따라 넓어지거나 좁아지는 걸 그대로 반영하기 위해서다.
export default function WeightChart({ records }) {
  const [selected, setSelected] = useState(null);

  if (records.length === 0) return null;

  const weights = records.map((r) => r.weightKg);
  const bandMins = records.map((r) => r.bandMin).filter((v) => v != null);
  const bandMaxs = records.map((r) => r.bandMax).filter((v) => v != null);
  const minW = Math.min(...weights, ...bandMins);
  const maxW = Math.max(...weights, ...bandMaxs);
  const span = maxW - minW || 1;
  const yPad = span * 0.2;
  const lo = minW - yPad;
  const hi = maxW + yPad;
  const ySpan = hi - lo || 1;

  const times = records.map((r) => new Date(r.measuredAt).getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const tSpan = maxT - minT || 1;

  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  function yFor(weightKg) {
    return PAD.top + innerH - ((weightKg - lo) / ySpan) * innerH;
  }
  function xFor(t) {
    return PAD.left + (records.length > 1 ? ((t - minT) / tSpan) * innerW : innerW / 2);
  }

  const points = records.map((r) => {
    const x = xFor(new Date(r.measuredAt).getTime());
    return { x, y: yFor(r.weightKg), r };
  });

  // 적정 구간 띠 — 기록마다 월령이 달라 구간도 다를 수 있어서, 위쪽 경계선과 아래쪽 경계선을
  // 각각 이어 만든 폭이 유연하게 변하는 띠로 그린다(기록이 1개면 사각형 하나).
  // 적정 구간 값이 없는 기록이 섞이면(통합 기록의 단순 그래프) 띠를 그리지 않는다
  const hasBand = records.every((r) => r.bandMin != null && r.bandMax != null);
  const upper = points.map((p) => ({ x: p.x, y: yFor(p.r.bandMax) }));
  const lower = points.map((p) => ({ x: p.x, y: yFor(p.r.bandMin) }));
  const upperPath = upper.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const lowerPath = lower.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const bandPath =
    hasBand && upper.length > 0
      ? `${upperPath} ${[...lower]
          .reverse()
          .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(" ")} Z`
      : "";

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const active = selected || points[points.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {bandPath && (
          <>
            <path d={bandPath} fill="var(--success)" opacity="0.22" />
            <path d={upperPath} fill="none" stroke="var(--success)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
            <path d={lowerPath} fill="none" stroke="var(--success)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
          </>
        )}
        <line x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} stroke="var(--border)" />
        {points.length > 1 && <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" />}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p === active ? 5.5 : 3.5}
            fill={p.r.color || "var(--accent)"}
            stroke={p === active ? "var(--text)" : "none"}
            strokeWidth="1.5"
            style={{ cursor: "pointer" }}
            onClick={() => setSelected(p)}
          />
        ))}
      </svg>
      <p className="subtle" style={{ textAlign: "center", marginTop: 6, marginBottom: 0 }}>
        {formatKoreanDate(toDateKey(new Date(active.r.measuredAt)))} · {active.r.weightKg}kg
      </p>
      {hasBand && <p className="faint" style={{ textAlign: "center", marginTop: 2, marginBottom: 0 }}>
        연두색 띠 = 그 시점 월령 기준 적정 체중 구간 ({active.r.bandMin}~{active.r.bandMax}kg)
      </p>}
      {active.r.statusText && active.r.status !== "ideal" && (
        <p className="subtle" style={{ marginTop: 8, marginBottom: 0 }}>
          {active.r.statusText}
        </p>
      )}
    </div>
  );
}
