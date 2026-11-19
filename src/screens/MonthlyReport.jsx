import { useEffect, useMemo, useState } from "react";
import Ico from "../components/Ico";
import { RingStat, PawGlyph } from "../components/Pieces";
import { buildMonthlyReport, addMonths, monthLabel, monthOf, monthDigest } from "../services/monthlyReport";
import { canSeeMonthReport, isPlus } from "../services/plus";
import { fetchStatus } from "../services/character";
import { askAssistant } from "../services/aiClient";
import { readJSON, writeJSON } from "../services/storage";
import { md } from "../services/records";
import { todayKey } from "../utils/date";
import { josa } from "../utils/text";
import Empty from "../components/Empty";

const NOTE_KEY = "dogcare-month-note-v1"; // { [dogId]: { [month]: { text, at } } } — 비서 해설은 달마다 한 번만 받는다
const DOW = ["월", "화", "수", "목", "금", "토", "일"];
const mealTotal = (r) => r.meal.usual + r.meal.less + r.meal.more;
const sign = (n, unit = "") => (n === 0 ? `지난달과 같아요` : `지난달보다 ${n > 0 ? "+" : "−"}${Math.abs(n).toLocaleString()}${unit}`);

// 한 달 리포트(멍케어 플러스, 11/18): 달력 한 장 + 체중 곡선 + 칸 5개 + 플러스 비서 세 줄. 판단 없이 기록된 사실과 지난달 차이만.
export default function MonthlyReport({ dog, onBack, onOpenVet, onOpenPlus }) {
  const [month, setMonth] = useState(() => monthOf(todayKey()));
  const [plus, setPlus] = useState(() => isPlus(dog.id));
  useEffect(() => { fetchStatus(dog.id).then((s) => setPlus(Boolean(s.plus))).catch(() => {}); }, [dog.id]);
  const r = useMemo(() => buildMonthlyReport(dog, month), [dog, month]);
  const open = canSeeMonthReport(dog.id) || plus;
  const tiles = [
    { ico: "walk", tone: "violet", label: "산책", viz: <PawRow n={r.walk.days} />, num: `${r.walk.days}일`, unit: r.walk.minutes ? `모두 ${r.walk.minutes}분` : "", sub: r.prevHasRecords ? sign(r.compare.walkDays, "일") : "" },
    { ico: "bowl", tone: "rose", label: "밥", viz: <Bowls usual={r.meal.usual} other={r.meal.less + r.meal.more} />, num: `${r.meal.usual}번`, unit: mealTotal(r) === 0 ? "" : [r.meal.less && `적게 ${r.meal.less}`, r.meal.more && `많이 ${r.meal.more}`].filter(Boolean).join(" · ") || "모두 평소만큼", sub: "" },
    { ico: "bandaid", tone: "blue", label: "증상·변", viz: <Dots n={r.symptoms.length + r.looseDays.length} />, num: `${r.symptoms.length}번`, unit: `무른 변 ${r.looseDays.length}일`, sub: r.topKinds.length ? r.topKinds.map(([k, n]) => `${k} ${n}`).join(" · ") : r.prevHasRecords ? sign(r.compare.symptoms, "번") : "" },
    { ico: "stethoscope", tone: "blue", label: "병원", viz: <Visits n={r.vetDays.length} />, num: `${r.vetDays.length}번`, unit: r.cost ? `${r.cost.toLocaleString()}원` : "병원비 기록 없음", sub: r.prevHasRecords && (r.cost || r.compare.cost) ? sign(r.compare.cost, "원") : "" },
    { ico: "check", tone: "teal", label: "하루 체크", wide: true, viz: <RingStat pct={r.elapsed ? r.checkDays.length / r.elapsed : 0} size={52} stroke={6}><svg viewBox="0 0 24 24" width="22" height="22" style={{ color: "var(--warm)" }}><PawGlyph stroke="currentColor" width={2.2} /></svg></RingStat>, num: `${r.checkDays.length}일`, unit: `${r.elapsed}일 중 · ${Math.round((r.checkDays.length / Math.max(1, r.elapsed)) * 100)}%`, sub: r.prevHasRecords ? sign(r.checkDays.length - r.prevCheck, "일") : "" },
  ];
  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>← 우리 아이로</button>
      <div className="mr-head">
        <button type="button" className="mr-nav" aria-label="지난달" onClick={() => setMonth(addMonths(month, -1))}>‹</button>
        <div className="h1" style={{ margin: 0 }}>{josa(dog.name, "이의", "의")} {monthLabel(month)}</div>
        <button type="button" className="mr-nav" aria-label="다음 달" disabled={r.isCurrent} onClick={() => setMonth(addMonths(month, 1))}>›</button>
      </div>
      <p className="subtle" style={{ marginBottom: 14 }}>{md(r.from)} ~ {md(r.to)} · 기록 {r.records}개 <span className="px-badge" style={{ marginLeft: 6 }}>플러스</span></p>

      {!open ? (
        <div className="card mr-lock">
          <Ico name="lock" size={40} />
          <div><b>한 달 리포트는 멍케어 플러스에서 열려요</b><p className="subtle" style={{ margin: "4px 0 0" }}>달력 한 장에 산책·증상·병원이 모이고, 체중 곡선과 지난달 비교, 비서 세 줄 해설까지.</p></div>
          <button type="button" className="btn-primary" onClick={onOpenPlus}>플러스 알아보기</button>
        </div>
      ) : (
        <>
          <MonthGrid r={r} />
          {r.records === 0 ? <Empty ico="note" compact style={{ marginTop: 10 }}>{monthLabel(r.month)}엔 적은 기록이 없어요.</Empty> : <>
          <WeightLine r={r} />
          <div className="wr-grid" style={{ marginTop: 10 }}>
            {tiles.map((t) => (
              <div key={t.label} className={`wr-tile${t.wide ? " wide" : ""}`}>
                <span className="wr-label"><Ico name={t.ico} size={16} className={`cat-ico tone-${t.tone}`} /> {t.label}</span>
                <span className="wr-body">
                  <span className="wr-viz">{t.viz}</span>
                  <span>
                    <span className="wr-num">{t.num}{t.unit && <small> {t.unit}</small>}</span>
                    {t.sub && <span className="wr-sub">{t.sub}</span>}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <AssistantNote dog={dog} r={r} plus={plus} onOpenPlus={onOpenPlus} />
          </>}
          <button type="button" className="btn-ghost report-btn" style={{ marginTop: 14 }} onClick={onOpenVet}>
            <Ico name="clipboard" size={18} className="cat-ico tone-blue" /> 병원용 기록으로 보기
          </button>
          <p className="faint" style={{ marginTop: 10 }}>적어 둔 기록을 그대로 센 숫자예요. 몸 상태를 판단한 결과가 아니에요.</p>
        </>
      )}
    </div>
  );
}

// 달력 한 장: 칠한 칸=하루 체크한 날, 발도장=산책, 점=증상·무른 변, 십자=병원
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

// 체중 곡선: 이 달 기록한 점들을 날짜 자리에(없으면 안 그림), 지난달 마지막 값은 점선으로
function WeightLine({ r }) {
  const pts = r.weights;
  if (!pts.length && r.weight.prevLast == null) return null;
  const all = [...(r.weight.prevLast != null ? [{ date: `${r.prevMonth}-99`, kg: r.weight.prevLast, prev: true }] : []), ...pts];
  const kgs = all.map((p) => p.kg);
  const lo = Math.min(...kgs) - 0.15, hi = Math.max(...kgs) + 0.15;
  const X = (p) => (p.prev ? 16 : 40 + ((Number(p.date.slice(8, 10)) - 1) / Math.max(1, r.days - 1)) * 268);
  const Y = (kg) => 44 - ((kg - lo) / (hi - lo || 1)) * 30;
  const line = all.filter((p) => !p.prev);
  return (
    <div className="card" style={{ marginTop: 10, padding: "12px 14px" }}>
      <span className="wr-label"><Ico name="scales" size={16} className="cat-ico tone-blue" /> 체중 {r.weight.last != null && <span className="wr-num" style={{ fontSize: 18, marginLeft: 4 }}>{r.weight.last}<small> kg{r.weight.diff != null ? ` · 지난달 ${r.weight.diff > 0 ? "+" : ""}${r.weight.diff}` : ""}</small></span>}</span>
      <svg viewBox="0 0 320 60" width="100%" style={{ display: "block", marginTop: 4 }} aria-hidden="true">
        <line x1="40" y1="50" x2="308" y2="50" stroke="var(--border)" />
        {[1, 10, 20, r.days].map((d) => <text key={d} x={40 + ((d - 1) / Math.max(1, r.days - 1)) * 268} y="59" fontSize="8.5" textAnchor="middle" fill="var(--text-faint)">{d}일</text>)}
        {r.weight.prevLast != null && line.length > 0 && <line x1={16} y1={Y(r.weight.prevLast)} x2={X(line[0])} y2={Y(line[0].kg)} stroke="var(--ink)" strokeWidth="1.3" strokeDasharray="3 3" />}
        {r.weight.prevLast != null && <><circle cx="16" cy={Y(r.weight.prevLast)} r="4" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.3" /><text x="16" y={Y(r.weight.prevLast) - 7} fontSize="8" textAnchor="middle" fill="var(--text-faint)">지난달</text></>}
        {line.length > 1 && <polyline points={line.map((p) => `${X(p)},${Y(p.kg)}`).join(" ")} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeLinejoin="round" />}
        {line.map((p, i) => <g key={p.date + i}><circle cx={X(p)} cy={Y(p.kg)} r={i === line.length - 1 ? 5 : 3.5} fill={i === line.length - 1 ? "var(--warm-bg)" : "var(--surface)"} stroke="var(--ink)" strokeWidth="1.4" />{(i === line.length - 1 || line.length <= 4) && <text x={X(p)} y={Y(p.kg) - 8} fontSize="8.5" textAnchor="middle" fill="var(--text)" fontWeight="800">{p.kg}</text>}</g>)}
        {!line.length && <text x="174" y="34" fontSize="10" textAnchor="middle" fill="var(--text-faint)">이 달엔 체중 기록이 없어요</text>}
      </svg>
    </div>
  );
}

const PawRow = ({ n }) => <span style={{ display: "flex", gap: 3, alignItems: "center", minHeight: 28 }}>{Array.from({ length: Math.min(7, n) }, (_, i) => <svg key={i} viewBox="0 0 24 24" width="16" height="16" style={{ color: "var(--warm)" }}><PawGlyph stroke="currentColor" width={2.2} /></svg>)}{n > 7 && <small className="faint" style={{ marginLeft: 4 }}>+{n - 7}</small>}{n === 0 && <small className="faint">기록 없음</small>}</span>;
// 밥 그릇은 두 줄(한 줄 5개, 최대 10개)로 — 사용자 11/20
const Bowls = ({ usual, other }) => <span style={{ display: "grid", gridTemplateColumns: "repeat(5, 18px)", gap: "2px 1px", alignItems: "center", minHeight: 28, justifyContent: "start" }}>{Array.from({ length: Math.min(10, usual + other) }, (_, i) => <img key={i} src="/pieces/bowl.png" alt="" style={{ width: 18, opacity: i < usual ? 1 : 0.35, filter: i < usual ? "none" : "grayscale(1)" }} />)}{usual + other > 10 && <small className="faint" style={{ gridColumn: "1 / -1", whiteSpace: "nowrap" }}>그릇 {usual + other}개</small>}{usual + other === 0 && <small className="faint" style={{ gridColumn: "1 / -1" }}>기록 없음</small>}</span>;
const Dots = ({ n }) => <span style={{ display: "flex", gap: 4, flexWrap: "wrap", minHeight: 28, alignItems: "center", maxWidth: 150 }}>{Array.from({ length: Math.min(20, n) }, (_, i) => <b key={i} className="mr-dot" style={{ width: 9, height: 9 }} />)}{n === 0 && <small className="faint">기록 없음</small>}</span>;
const Visits = ({ n }) => <span style={{ display: "flex", gap: 4, alignItems: "center", minHeight: 28 }}>{Array.from({ length: Math.min(6, n) }, (_, i) => <Ico key={i} name="stethoscope" size={22} sticker />)}{n > 6 && <small className="faint">+{n - 6}</small>}{n === 0 && <small className="faint">병원 안 갔어요</small>}</span>;

// 플러스 비서 세 줄: 달마다 한 번 받아 둔다(다시 받기 가능). 무료면 어떤 건지 한 줄만
function AssistantNote({ dog, r, plus, onOpenPlus }) {
  const saved = readJSON(NOTE_KEY, {})[dog.id]?.[r.month];
  const [note, setNote] = useState(saved?.text || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { setNote(readJSON(NOTE_KEY, {})[dog.id]?.[r.month]?.text || ""); setErr(""); }, [dog.id, r.month]);
  async function ask() {
    setBusy(true); setErr("");
    try {
      const a = await askAssistant(dog, monthDigest(dog, r), { detail: true });
      const text = a.answer || [a.todo, a.vet].filter(Boolean).join("\n");
      const all = readJSON(NOTE_KEY, {});
      all[dog.id] = { ...(all[dog.id] || {}), [r.month]: { text, at: new Date().toISOString() } };
      writeJSON(NOTE_KEY, all);
      setNote(text);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="card mr-note">
      <span className="wr-label"><Ico name="chatHeart" size={16} className="cat-ico tone-rose" /> 플러스 비서가 읽은 {monthLabel(r.month)}</span>
      {!plus ? (
        <p className="subtle" style={{ margin: 0 }}>플러스면 비서가 이 달 기록을 읽고 잘한 것·지켜볼 것·다음 달 할 일을 세 줄로 적어 줘요. {onOpenPlus && <button type="button" className="link-btn" style={{ margin: 0 }} onClick={onOpenPlus}>플러스 보기</button>}</p>
      ) : note ? (
        <>
          <p className="mr-note-text">{note}</p>
          <button type="button" className="link-btn" style={{ margin: 0, alignSelf: "flex-start" }} disabled={busy} onClick={ask}>{busy ? "읽는 중…" : "다시 읽어 달라기"}</button>
        </>
      ) : (
        <button type="button" className="btn-ghost" disabled={busy || r.records < 3} onClick={ask}>{busy ? "읽는 중…" : r.records < 3 ? "기록이 3개 넘으면 읽어 줘요" : "이 달 기록 세 줄로 읽어 줘"}</button>
      )}
      {err && <p className="error-text" style={{ margin: 0 }}>{err}</p>}
    </div>
  );
}
