import { useEffect, useRef, useState } from "react";
import { todayKey, toDateKey, addDays } from "../utils/date";
import { VITAL, fmtValue, outOfRange } from "../data/vitals";
import { getVitalEntries, vitalDaily, saveRecord, deleteRecord, getRecords, localNow, newRecordId, validateRecord, md } from "../services/records";

const PERIODS = [7, 30, 90];

// 건강 수치 하나: 맨 위 오늘/최근 값 → 바로 적기(호흡·심박은 탭해서 세기) → 기간 그래프 → 날짜별 기록(고치기·지우기)
export default function VitalDetail({ dog, metric, onBack, onOpenWeight }) {
  const def = VITAL[metric];
  const [entries, setEntries] = useState(() => getVitalEntries(dog.id, metric));
  const [days, setDays] = useState(7);
  const [value, setValue] = useState("");
  const [at, setAt] = useState(localNow());
  const [memo, setMemo] = useState("");
  const [editId, setEditId] = useState(null); // 고치는 중이면 그 기록 id
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const reload = () => setEntries(getVitalEntries(dog.id, metric));

  const today = todayKey();
  const daily = vitalDaily(entries, def.kind);
  const todayRow = daily.find((d) => d.date === today);
  const latest = entries.at(-1);
  const from = toDateKey(addDays(new Date(), -(days - 1)));
  const shown = daily.filter((d) => d.date >= from);
  const recent7 = daily.filter((d) => d.date >= toDateKey(addDays(new Date(), -6)));
  const avg7 = recent7.length ? recent7.reduce((s, d) => s + d.value, 0) / recent7.length : null;
  const unit = def.unit;

  function resetForm() {
    setValue("");
    setMemo("");
    setAt(localNow());
    setEditId(null);
  }

  function save() {
    setError("");
    const rec = { id: editId || newRecordId(), type: "vital", at, data: { metric, value: Number(value) }, memo: memo.trim(), photos: [] };
    const problem = value === "" ? `${def.label}을 숫자로 적어 주세요.` : validateRecord(rec);
    if (problem) return setError(problem);
    try {
      saveRecord(dog.id, editId ? { ...getRecords(dog.id).find((r) => r.id === editId), ...rec } : rec);
      reload();
      setMsg(`${editId ? "고쳤어요" : "적었어요"}: ${md(at.slice(0, 10))} ${at.slice(11)} ${fmtValue(metric, value)}${unit}`);
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(e) {
    setEditId(e.id);
    setValue(String(e.value));
    setAt(e.at);
    setMemo(e.memo);
    setMsg("");
    window.scrollTo?.({ top: 0, behavior: "smooth" });
    document.querySelector(".vd-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function remove(e) {
    if (!confirm(`${md(e.at.slice(0, 10))} ${e.at.slice(11)} ${fmtValue(metric, e.value)}${unit} 기록을 지울까요?`)) return;
    try {
      deleteRecord(dog.id, e.id);
      reload();
      if (editId === e.id) resetForm();
    } catch (err) {
      setError(err.message);
    }
  }

  const headline = def.kind === "sum" ? todayRow?.value : latest?.value;
  const flag = def.kind === "point" && latest ? outOfRange(metric, latest.value) : null;

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>← 프로필로</button>
      <div className="vd-head">
        <span className="vd-icon" aria-hidden="true">{def.icon}</span>
        <div>
          <div className="h1" style={{ margin: 0 }}>{def.label}</div>
          <div className="faint">{def.kind === "sum" ? "하루 동안 적은 걸 합쳐서 보여 줘요" : "잴 때마다 따로 적어요"}</div>
        </div>
      </div>

      <div className="card vd-now">
        <div className="faint">{def.kind === "sum" ? "오늘 합계" : latest ? `최근 · ${md(latest.at.slice(0, 10))} ${latest.at.slice(11)}` : "최근"}</div>
        {headline != null ? (
          <div className="vd-big">
            {fmtValue(metric, headline)}
            <span className="vd-unit">{unit}</span>
          </div>
        ) : (
          <div className="vd-none">{def.kind === "sum" ? "오늘은 아직 기록이 없어요" : "아직 기록이 없어요"}</div>
        )}
        {def.kind === "sum" && <div className="subtle">{avg7 != null ? `최근 7일 기록한 날 평균 ${fmtValue(metric, avg7)}${unit} (${recent7.length}일)` : "최근 7일 기록이 없어요"}</div>}
        {def.range && (
          <div className={`vd-range${flag ? " out" : ""}`}>
            {flag && <b>{flag === "above" ? "참고 범위보다 높아요 · " : "참고 범위보다 낮아요 · "}</b>}
            참고 범위 {def.range[0]}~{def.range[1]}{unit}. {def.note}
          </div>
        )}
      </div>

      <div className="card vd-form">
        <div className="h2">{editId ? "기록 고치기" : "지금 적기"}</div>
        {def.counter && !editId && <TapCounter seconds={def.counter} how={def.how} onResult={(v) => setValue(String(v))} />}
        <div className="vd-input-row">
          <input
            type="number"
            inputMode="decimal"
            step={def.step}
            min={def.min}
            max={def.max}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
            aria-label={`${def.label} (${unit})`}
            className="vd-input"
          />
          <span className="vd-input-unit">{unit}</span>
        </div>
        <div className="field">
          <label>날짜·시각</label>
          <input type="datetime-local" value={at} max={localNow()} onChange={(e) => setAt(e.target.value)} />
        </div>
        <div className="field">
          <label>메모 (선택)</label>
          <input value={memo} maxLength={200} onChange={(e) => setMemo(e.target.value)} placeholder={metric === "fluid" ? "예: 왼쪽 어깨, 수액 종류" : "예: 산책 후"} />
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          {editId && <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={resetForm}>취소</button>}
          <button type="button" className="btn-primary" style={{ flex: 2 }} onClick={save}>{editId ? "고친 내용 저장" : "저장"}</button>
        </div>
        {msg && <p className="subtle" role="status" style={{ margin: "8px 0 0" }}>✓ {msg}</p>}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="rec-head">
          <div className="h2" style={{ margin: 0 }}>{def.kind === "sum" ? "하루 합계" : "변화"}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {PERIODS.map((p) => (
              <button key={p} type="button" className={`seg${days === p ? " on" : ""}`} style={{ flex: "0 0 auto", padding: "6px 10px" }} onClick={() => setDays(p)}>{p}일</button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="subtle" style={{ margin: 0 }}>최근 {days}일 기록이 없어요.</p>
        ) : (
          <>
            <ValueChart rows={shown} kind={def.kind} unit={unit} metric={metric} range={def.range} from={from} to={today} />
            {shown.length < 3 && <p className="faint" style={{ marginBottom: 0 }}>기록이 {shown.length}일뿐이라 변화를 말하기엔 부족해요. 기록 없는 날은 0이 아니라 비워 둬요.</p>}
          </>
        )}
      </div>

      <div className="card">
        <div className="h2">기록</div>
        {entries.length === 0 ? (
          <p className="subtle" style={{ margin: 0 }}>아직 기록이 없어요. 위에서 첫 기록을 적어 보세요.</p>
        ) : (
          [...daily].reverse().slice(0, 30).map((d) => (
            <div key={d.date} className="vd-day">
              <div className="vd-day-head">
                <b>{md(d.date)}{d.date === today ? " 오늘" : ""}</b>
                {def.kind === "sum" && <span className="faint">합계 {fmtValue(metric, d.value)}{unit}</span>}
              </div>
              {entries.filter((e) => e.at.startsWith(d.date)).reverse().map((e) => (
                <div key={e.id} className="vd-entry">
                  <span className="vd-entry-time">{e.at.slice(11)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b>{fmtValue(metric, e.value)}{unit}</b>
                    {def.kind === "point" && outOfRange(metric, e.value) && <span className="vd-flag"> 참고 범위 밖</span>}
                    {e.memo && <span className="faint"> · {e.memo}</span>}
                    {e.source === "daily" && <span className="faint"> · 일상 기록</span>}
                  </span>
                  {e.source === "vital" ? (
                    <>
                      <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => startEdit(e)}>고치기</button>
                      <button type="button" className="link-btn" style={{ margin: "0 0 0 10px", color: "var(--danger)" }} onClick={() => remove(e)}>삭제</button>
                    </>
                  ) : e.source === "weight" ? (
                    <button type="button" className="link-btn" style={{ margin: 0 }} onClick={onOpenWeight}>체중 관리</button>
                  ) : null}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 탭해서 세기: 정해진 초 동안 누른 횟수 × (60/초) = 1분 값
function TapCounter({ seconds, how, onResult }) {
  const [left, setLeft] = useState(null); // null = 대기
  const [taps, setTaps] = useState(0);
  const tapsRef = useRef(0);
  const doneRef = useRef(onResult);
  doneRef.current = onResult;
  const running = left != null;
  // 탭할 때마다 다시 그려져도 1초 간격이 밀리지 않게 시작할 때 한 번만 타이머를 건다
  useEffect(() => {
    if (!running) return;
    const end = Date.now() + seconds * 1000;
    const t = setInterval(() => {
      const remain = Math.ceil((end - Date.now()) / 1000);
      if (remain <= 0) {
        clearInterval(t);
        doneRef.current(Math.round(tapsRef.current * (60 / seconds)));
        setLeft(null);
      } else setLeft(remain);
    }, 250);
    return () => clearInterval(t);
  }, [running, seconds]);

  if (left == null)
    return (
      <div className="vd-counter">
        <p className="faint" style={{ margin: "0 0 8px" }}>{how}</p>
        <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={() => ((tapsRef.current = 0), setTaps(0), setLeft(seconds))}>
          ⏱ {seconds}초 동안 탭해서 세기
        </button>
      </div>
    );
  return (
    <div className="vd-counter">
      <button
        type="button"
        className="vd-tap"
        onClick={() => {
          tapsRef.current += 1;
          setTaps(tapsRef.current);
        }}
      >
        <span className="vd-tap-n">{taps}</span>
        <span>탭!</span>
      </button>
      <p className="subtle" style={{ textAlign: "center", margin: "8px 0 0" }}>
        {left}초 남음 · <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => setLeft(null)}>그만</button>
      </p>
    </div>
  );
}

// 기록한 날만 그리는 그래프 — sum은 막대(하루 합계), point는 점과 선. 참고 범위는 옅은 띠.
function ValueChart({ rows, kind, unit, metric, range, from, to }) {
  const W = 320;
  const H = 150;
  const P = { t: 14, r: 10, b: 22, l: 10 };
  const t0 = new Date(`${from}T00:00:00`).getTime();
  const t1 = new Date(`${to}T00:00:00`).getTime();
  const span = Math.max(1, t1 - t0);
  const x = (d) => P.l + ((new Date(`${d}T00:00:00`).getTime() - t0) / span) * (W - P.l - P.r);
  const vals = rows.map((r) => r.value);
  const lo = kind === "sum" ? 0 : Math.min(...vals, ...(range || []));
  const hi = Math.max(...vals, ...(range || [])) || 1;
  const pad = kind === "sum" ? 0 : (hi - lo) * 0.15 || 1;
  const y = (v) => P.t + (H - P.t - P.b) * (1 - (v - (lo - pad)) / (hi + pad - (lo - pad) || 1));
  const barW = Math.max(3, Math.min(18, ((W - P.l - P.r) / ((t1 - t0) / 86400000 + 1)) * 0.6));
  const last = rows.at(-1);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={`${rows.length}일 기록 그래프`}>
        {range && kind === "point" && <rect x={P.l} y={y(range[1])} width={W - P.l - P.r} height={Math.max(0, y(range[0]) - y(range[1]))} fill="var(--success)" opacity="0.12" />}
        <line x1={P.l} y1={H - P.b} x2={W - P.r} y2={H - P.b} stroke="var(--border)" />
        {kind === "sum"
          ? rows.map((r) => <rect key={r.date} x={x(r.date) - barW / 2} y={y(r.value)} width={barW} height={H - P.b - y(r.value)} rx="3" fill="var(--accent)" />)
          : (
            <>
              {rows.length > 1 && <path d={rows.map((r, i) => `${i ? "L" : "M"}${x(r.date).toFixed(1)},${y(r.value).toFixed(1)}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2" />}
              {rows.map((r) => <circle key={r.date} cx={x(r.date)} cy={y(r.value)} r="3.5" fill={outOfRange(metric, r.value) ? "var(--warning)" : "var(--accent)"} />)}
            </>
          )}
        <text x={P.l} y={H - 6} fontSize="10" fill="var(--text-faint)">{md(from)}</text>
        <text x={W - P.r} y={H - 6} fontSize="10" fill="var(--text-faint)" textAnchor="end">{md(to)}</text>
      </svg>
      <p className="faint" style={{ textAlign: "center", margin: "4px 0 0" }}>
        마지막 기록 {md(last.date)} {fmtValue(metric, last.value)}{unit}{kind === "point" && range ? " · 초록 띠 = 참고 범위" : ""}
      </p>
    </div>
  );
}
