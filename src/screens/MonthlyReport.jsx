import { useEffect, useMemo, useState } from "react";
import Ico from "../components/Ico";
import { PawGlyph } from "../components/Pieces";
import Empty from "../components/Empty";
import { buildMonthlyReport, addMonths, monthLabel, monthOf, monthDigest } from "../services/monthlyReport";
import { canSeeMonthReport, isPlus } from "../services/plus";
import { fetchStatus, characterOutputs } from "../services/character";
import { askAssistant } from "../services/aiClient";
import { readJSON, writeJSON } from "../services/storage";
import { md } from "../services/records";
import { drawMonthCard } from "../services/shareCard";
import { toast } from "../services/toast";
import { todayKey } from "../utils/date";
import { josa } from "../utils/text";

const NOTE_KEY = "dogcare-month-note-v1"; // { [dogId]: { [month]: { text, at } } } — 비서 해설은 달마다 한 번만 받는다
const DOW = ["월", "화", "수", "목", "금", "토", "일"];

// 한 달 리포트(멍케어 플러스) — 11/20 2차: 한 달에만 보이는 것부터. ① 달라진 것 세 줄(규칙) + 플러스 비서 한 문단 ② 겹쳐 보기 ③ 달력 ④ 체중 흐름 ⑤ 자랑 카드 ⑥ 숫자 네 칸.
// 판단·점수 없음: "a → b"와 "n번 중 m번 겹침"까지만.
export default function MonthlyReport({ dog, onBack, onOpenVet, onOpenPlus }) {
  const [month, setMonth] = useState(() => monthOf(todayKey()));
  const [plus, setPlus] = useState(() => isPlus(dog.id));
  useEffect(() => { fetchStatus(dog.id).then((s) => setPlus(Boolean(s.plus))).catch(() => {}); }, [dog.id]);
  const r = useMemo(() => buildMonthlyReport(dog, month), [dog, month]);
  const open = canSeeMonthReport(dog.id) || plus;
  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>← 우리 아이로</button>
      <div className="mr-head">
        <button type="button" className="mr-nav" aria-label="지난달" onClick={() => setMonth(addMonths(month, -1))}>‹</button>
        <div className="h1" style={{ margin: 0 }}>{josa(dog.name, "이의", "의")} {monthLabel(month)}</div>
        <button type="button" className="mr-nav" aria-label="다음 달" disabled={r.isCurrent} onClick={() => setMonth(addMonths(month, 1))}>›</button>
      </div>
      <p className="subtle" style={{ marginBottom: 14 }}>{md(r.from)} ~ {md(r.to)} · 기록 {r.records}개{r.prevHasRecords ? ` · ${monthLabel(r.prevMonth)}과 비교했어요` : ""} <span className="px-badge" style={{ marginLeft: 6 }}>플러스</span></p>

      {!open ? (
        <div className="card mr-lock">
          <Ico name="lock" size={40} />
          <div><b>한 달 리포트는 멍케어 플러스에서 열려요</b><p className="subtle" style={{ margin: "4px 0 0" }}>지난달과 달라진 점 세 줄, 증상 난 날 앞뒤 겹쳐 보기, 달력 한 장, 체중 흐름, 자랑 카드까지.</p></div>
          <button type="button" className="btn-primary" onClick={onOpenPlus}>플러스 알아보기</button>
        </div>
      ) : r.records === 0 ? (
        <>
          <MonthGrid r={r} />
          <Empty ico="note" compact style={{ marginTop: 10 }}>{monthLabel(r.month)}엔 적은 기록이 없어요.</Empty>
        </>
      ) : (
        <>
          <DiffCard r={r} dog={dog} plus={plus} onOpenPlus={onOpenPlus} />
          <OverlapCard r={r} />
          <MonthGrid r={r} />
          <WeightCard r={r} />
          <ShareCard dog={dog} r={r} />
          <MiniStats r={r} />
          <button type="button" className="btn-ghost report-btn" style={{ marginTop: 10 }} onClick={onOpenVet}>
            <Ico name="clipboard" size={18} className="cat-ico tone-blue" /> 병원용 기록으로 보기
          </button>
          <p className="faint" style={{ marginTop: 10 }}>적어 둔 기록을 그대로 센 것이에요. 몸 상태를 판단한 결과가 아니에요.</p>
        </>
      )}
    </div>
  );
}

// ① 이 달 달라진 것 — 스티커 + 제목 + 지난달(회색)·이번 달(살구) 막대
function DiffCard({ r, dog, plus, onOpenPlus }) {
  return (
    <div className="card mr-diff">
      <div className="mr-sec">{r.prevHasRecords ? "이 달 달라진 것" : "이 달 눈에 띄는 것"}</div>
      {r.diffs.length === 0 ? (
        <div className="mr-quiet"><Ico name="sparkles" size={26} sticker /><span><b>{r.prevHasRecords ? `${monthLabel(r.prevMonth)}과 비슷한 한 달이었어요` : "아직 비교할 지난달이 없어요"}</b><br /><small className="faint">{r.prevHasRecords ? "꾸준함이 쌓이는 중이에요" : "다음 달부터 달라진 점을 찾아 드려요"}</small></span></div>
      ) : (
        <ul className="mr-diffs">
          {r.diffs.map((d) => <li key={d.key}><Ico name={d.ico} size={36} sticker /><span className="mr-diff-t"><b>{d.title}</b>{d.sub && <small>{d.sub}</small>}</span><Bars a={d.a} b={d.b} unit={d.unit} /></li>)}
        </ul>
      )}
      <AssistantNote dog={dog} r={r} plus={plus} onOpenPlus={onOpenPlus} />
    </div>
  );
}
function Bars({ a, b, unit }) {
  const max = Math.max(a, b, 0.01);
  const w = (v) => Math.max(8, (v / max) * 72);
  const fmt = (v) => (unit === "kg" ? v : Math.round(v));
  return (
    <span className="mr-bars" aria-label={`지난달 ${fmt(a)}${unit}, 이번 달 ${fmt(b)}${unit}`}>
      <i style={{ width: w(a) }} /><i className="now" style={{ width: w(b) }} />
      <small>{fmt(a)}{unit} → <b>{fmt(b)}{unit}</b></small>
    </span>
  );
}

// ② 겹쳐 보기: 증상·무른 변 난 날마다 전날·당일·다음날 세 칸
function OverlapCard({ r }) {
  const o = r.overlaps;
  const Cell = ({ c, kind, i }) => {
    if (i === 1) return <span className="mr-ov-c mark"><Ico name={/변|설사/.test(kind) ? "toilet" : "bandaid"} size={22} sticker />{kind}</span>;
    const what = c.less ? ["bowl", "밥 적게"] : c.treat ? ["bone", "간식"] : c.noWalk ? ["walk", "산책 없음"] : ["check", "평소"];
    const hit = c.less || c.treat || c.noWalk;
    return <span className={`mr-ov-c${hit ? " hit" : ""}`}><Ico name={what[0]} size={22} sticker={hit} />{what[1]}</span>;
  };
  return (
    <div className="card mr-ov">
      <div className="mr-sec">겹쳐 보기 · 증상 난 날 앞뒤</div>
      {o.rows.length > 0 && (
        <div className="mr-ov-grid">
          <span /><span className="mr-ov-h">전날</span><span className="mr-ov-h">당일</span><span className="mr-ov-h">다음날</span>
          {o.rows.slice(0, 6).map((row) => (
            <RowCells key={row.date} row={row} Cell={Cell} />
          ))}
        </div>
      )}
      {o.rows.length > 6 && <p className="faint" style={{ margin: "4px 0 0" }}>그 밖에 {o.rows.length - 6}번 더 있어요.</p>}
      <p className="subtle" style={{ margin: "8px 0 0" }}>{o.line}</p>
    </div>
  );
}
function RowCells({ row, Cell }) {
  return (
    <>
      <span className="mr-ov-d">{Number(row.date.slice(8))}일</span>
      {row.cells.map((c, i) => <Cell key={i} c={c} kind={row.kind} i={i} />)}
    </>
  );
}

// ③ 달력 한 장: 칠한 칸=하루 체크한 날, 발도장=산책, 점=증상·무른 변, 십자=병원
function MonthGrid({ r }) {
  return (
    <div className="card mr-cal">
      <div className="mr-cal-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="mr-cal-grid">
        {Array.from({ length: r.firstDow }, (_, i) => <span key={`e${i}`} />)}
        {r.cells.map((c) => (
          <span key={c.date} className={`mr-cell${c.checked ? " on" : ""}${c.future ? " future" : ""}`} aria-label={`${c.day}일${c.walk ? " 산책" : ""}${c.mark ? " 증상" : ""}${c.vet ? " 병원" : ""}`}>
            <i>{c.day}</i>
            {c.walk && <svg viewBox="0 0 24 24" className="mr-paw"><PawGlyph stroke="currentColor" width={2.2} /></svg>}
            {c.mark && <b className="mr-dot" />}
            {c.vet && <b className="mr-vet">+</b>}
          </span>
        ))}
      </div>
      <div className="mr-legend"><span><i className="lg-on" /> 하루 체크</span><span><svg viewBox="0 0 24 24"><PawGlyph stroke="currentColor" width={2.2} /></svg> 산책</span><span><b className="mr-dot" /> 증상·무른 변</span><span><b className="mr-vet">+</b> 병원</span></div>
    </div>
  );
}

// ④ 체중 흐름: 그 달 점 + 지난달 끝(점선) + 추세선 + 30일 평균
function WeightCard({ r }) {
  const w = r.weight;
  const pts = r.weights;
  if (!pts.length && w.prevLast == null) return null;
  const all = [...(w.prevLast != null ? [{ date: `${r.prevMonth}-99`, kg: w.prevLast, prev: true }] : []), ...pts];
  const kgs = all.map((p) => p.kg);
  const lo = Math.min(...kgs) - 0.15, hi = Math.max(...kgs) + 0.15;
  const xOf = (day) => 40 + ((day - 1) / Math.max(1, r.days - 1)) * 268;
  const X = (p) => (p.prev ? 16 : xOf(Number(p.date.slice(8, 10))));
  const Y = (kg) => 44 - ((kg - lo) / (hi - lo || 1)) * 30;
  const line = all.filter((p) => !p.prev);
  const sign = (n) => (n > 0 ? "+" : "");
  const my = line.length ? line.reduce((s, p) => s + p.kg, 0) / line.length : 0;
  const mx = line.length ? line.reduce((s, p) => s + Number(p.date.slice(8)), 0) / line.length : 0;
  const trend = w.slope != null && line.length >= 2 ? [my + w.slope * (1 - mx), my + w.slope * (r.days - mx)] : null;
  return (
    <div className="card mr-weight">
      <div className="mr-weight-top">
        <Ico name="scales" size={34} sticker />
        <span className="wr-num" style={{ fontSize: 30 }}>{w.last ?? "–"}<small> kg</small></span>
        <span className="mr-weight-sub">
          {w.last != null && <small>30일 평균 {w.avg}{w.diff != null ? ` · 지난달 끝보다 ${sign(w.diff)}${w.diff} (${sign(w.pct)}${w.pct}%)` : ""}</small>}
          <small>{w.last != null ? `기록 ${pts.length}번 · ${w.dirLabel}` : "이 달엔 체중 기록이 없어요"}</small>
        </span>
      </div>
      <svg viewBox="0 0 320 60" width="100%" style={{ display: "block", marginTop: 4 }} aria-hidden="true">
        <line x1="40" y1="50" x2="308" y2="50" stroke="var(--border)" />
        {[1, 10, 20, r.days].map((d) => <text key={d} x={xOf(d)} y="59" fontSize="8.5" textAnchor="middle" fill="var(--text-faint)">{d}일</text>)}
        {trend && <line x1={xOf(1)} y1={Y(trend[0])} x2={xOf(r.days)} y2={Y(trend[1])} stroke="var(--warm)" strokeWidth="1" strokeDasharray="3 3" />}
        {w.prevLast != null && line.length > 0 && <line x1={16} y1={Y(w.prevLast)} x2={X(line[0])} y2={Y(line[0].kg)} stroke="var(--ink)" strokeWidth="1.3" strokeDasharray="2 3" />}
        {w.prevLast != null && <><circle cx="16" cy={Y(w.prevLast)} r="4" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.3" /><text x="16" y={Y(w.prevLast) - 7} fontSize="8" textAnchor="middle" fill="var(--text-faint)">지난달</text></>}
        {line.length > 1 && <polyline points={line.map((p) => `${X(p)},${Y(p.kg)}`).join(" ")} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />}
        {line.map((p, i) => <g key={p.date + i}><circle cx={X(p)} cy={Y(p.kg)} r={i === line.length - 1 ? 5 : 3.5} fill={i === line.length - 1 ? "var(--warm-bg)" : "var(--surface)"} stroke="var(--ink)" strokeWidth="1.4" />{(i === line.length - 1 || line.length <= 4) && <text x={X(p)} y={Y(p.kg) - 8} fontSize="8.5" textAnchor="middle" fill="var(--text)" fontWeight="800">{p.kg}</text>}</g>)}
      </svg>
    </div>
  );
}

// ⑤ 자랑 카드: 캐릭터(없으면 사진) + "11월의 여름이" + 좋은 것만. 건강 정보는 안 넣는다
function ShareCard({ dog, r }) {
  const poster = characterOutputs(dog.id)?.poster || dog.photo || "/intro/img/dog-yeoreum-sit.png";
  const [busy, setBusy] = useState(false);
  const good = [r.walk.days ? `산책 ${r.walk.days}일` : "", r.checkDays.length ? `하루 체크 ${r.checkDays.length}일` : "", r.streaks ? `배지 ${r.streaks}개` : "", `기록 ${r.records}개`].filter(Boolean).slice(0, 3);
  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await drawMonthCard(dog, r);
      const file = new File([blob], `${dog.name}-${monthLabel(r.month)}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `${monthLabel(r.month)}의 ${dog.name}` });
      else { const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(file), download: file.name }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
    } catch (e) { if (e.name !== "AbortError") toast("카드를 만들지 못했어요. 다시 시도해 주세요.", { ico: "alert" }); }
    finally { setBusy(false); }
  }
  return (
    <div className="mr-share">
      <div className="mr-share-pv">
        <img src={poster} alt="" />
        <span><b>{monthLabel(r.month)}의 {dog.name}</b><small>{good.join(" · ")}</small><small className="faint">달력 + 세 줄 + 캐릭터 한 장</small></span>
      </div>
      <button type="button" className="btn-primary" disabled={busy} onClick={share}><Ico name="camera" size={18} /> {busy ? "만드는 중…" : "이 달 카드로 자랑하기"}</button>
      <p className="faint" style={{ margin: 0, fontSize: 12 }}>산책·하루 체크·배지·기록 수만 들어가요. 증상·병원·체중은 넣지 않아요.</p>
    </div>
  );
}

// ⑥ 숫자 네 칸
function MiniStats({ r }) {
  const items = [["walk", r.walk.days, "산책일"], ["bowl", r.meal.usual + r.meal.less + r.meal.more, `밥${r.meal.less ? ` · 적게 ${r.meal.less}` : ""}`], ["bandaid", r.symptoms.length, "증상"], ["stethoscope", r.vetDays.length, r.cost ? `병원 · ${Math.round(r.cost / 1000).toLocaleString()}천원` : "병원"]];
  return <div className="mr-mini">{items.map(([ico, n, label]) => <div key={label}><Ico name={ico} size={22} sticker /><b>{n}</b><span>{label}</span></div>)}</div>;
}

// 플러스 비서 한 문단: 달마다 한 번 받아 둔다(다시 받기 가능). 무료면 어떤 건지 한 줄만
function AssistantNote({ dog, r, plus, onOpenPlus }) {
  const saved = readJSON(NOTE_KEY, {})[dog.id]?.[r.month];
  const [note, setNote] = useState(saved?.text || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { setNote(readJSON(NOTE_KEY, {})[dog.id]?.[r.month]?.text || ""); setErr(""); }, [dog.id, r.month]);
  async function ask() {
    setBusy(true); setErr("");
    try {
      const a = await askAssistant(dog, monthDigest(dog, r), { detail: true, format: "paragraph" });
      const text = a.answer || [a.todo, a.vet].filter(Boolean).join("\n");
      const all = readJSON(NOTE_KEY, {});
      all[dog.id] = { ...(all[dog.id] || {}), [r.month]: { text, at: new Date().toISOString() } };
      writeJSON(NOTE_KEY, all);
      setNote(text);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="mr-asst">
      <Ico name="chatHeart" size={26} sticker />
      <div className="mr-asst-body">
        {!plus ? (
          <span className="subtle">플러스면 비서가 이 달을 한 문단으로 읽어 줘요. {onOpenPlus && <button type="button" className="link-btn" style={{ margin: 0 }} onClick={onOpenPlus}>플러스 보기</button>}</span>
        ) : note ? (
          <><span className="mr-note-text">{note}</span><button type="button" className="link-btn" style={{ margin: 0 }} disabled={busy} onClick={ask}>{busy ? "읽는 중…" : "다시 읽어 주기"}</button></>
        ) : (
          <button type="button" className="btn-ghost small" disabled={busy || r.records < 3} onClick={ask}>{busy ? "읽는 중…" : r.records < 3 ? "기록이 3개 넘으면 읽어 줘요" : "플러스 비서가 이 달 읽어 주기"}</button>
        )}
        {err && <span className="error-text">{err}</span>}
      </div>
    </div>
  );
}
