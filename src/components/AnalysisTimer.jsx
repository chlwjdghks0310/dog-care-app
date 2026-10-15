import { useEffect, useState } from "react";
import { readJSON, writeJSON } from "../services/storage";

// 분석에 걸린 시간을 재고, 최근 실제 걸린 시간(최대 5회)으로 예상 시간을 알려준다.
// 기록이 없으면 서버에서 측정한 기본값(fallback [최소, 최대] 초)을 쓴다.
export function useAnalysisTimer(storageKey, fallback) {
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(0);
  const [lastSeconds, setLastSeconds] = useState(null);
  const [history, setHistory] = useState(() => readJSON(storageKey, []));

  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  function start() {
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
    setLastSeconds(null);
  }

  function stop(succeeded) {
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    setStartedAt(null);
    if (!succeeded) return;
    setLastSeconds(seconds);
    const next = [...history, seconds].slice(-5);
    setHistory(next);
    writeJSON(storageKey, next);
  }

  const estimate = history.length ? [Math.min(...history), Math.max(...history)] : fallback;
  const elapsed = startedAt ? Math.max(0, Math.round((now - startedAt) / 1000)) : 0;
  return { start, stop, running: Boolean(startedAt), elapsed, lastSeconds, estimate };
}

const range = ([min, max]) => (min === max ? `약 ${min}초` : `약 ${min}~${max}초`);

export function AnalysisTimeInfo({ timer, note }) {
  const { running, elapsed, lastSeconds, estimate } = timer;

  if (running) {
    const pct = Math.min(95, Math.round((elapsed / estimate[1]) * 100));
    return (
      <div style={{ marginTop: 10 }} aria-live="polite">
        <div className="subtle" style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
          <span>⏱ 분석 중… {elapsed}초 지났어요</span>
          <span>보통 {range(estimate)}</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--accent-soft)" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: "var(--accent)", transition: "width 1s linear" }} />
        </div>
        {elapsed > estimate[1] && <p className="faint" style={{ margin: "4px 0 0" }}>평소보다 조금 더 걸리고 있어요. 거의 다 됐어요!</p>}
      </div>
    );
  }

  return (
    <p className="faint" style={{ margin: "10px 0 0", textAlign: "center" }}>
      {lastSeconds !== null ? `⏱ 이번 분석에 ${lastSeconds}초 걸렸어요` : `⏱ 분석에 보통 ${range(estimate)} 걸려요${note ? ` (${note})` : ""}`}
    </p>
  );
}
