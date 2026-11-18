import { getDay, daysThisMonth } from "../services/dailyCheck";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { todayKey, toDateKey, addDays } from "../utils/date";
import { md } from "../services/records";

// 숫자를 그림으로(11/18 시안 2차 확정): 발도장 주간 줄·스탬프 노트·사료통·숟가락·물컵·원·성장 자·증상 타임라인.
// 원칙: 그림은 "얼마나 찼나"만 말한다(좋다/나쁘다 색 없음). 숫자는 옆에 작게 남긴다. 조각 그림은 public/pieces/(앱 스티커 톤, Gemini).
const PIECE = (n) => `/pieces/${n}.png`;
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

// 앱 발바닥(lucide paw-print — Ico "paw"와 같은 선). SVG 안에서 쓰려고 path로.
export function PawGlyph({ x = 0, y = 0, s = 1, rotate = 0, stroke = "var(--warm)", width = 2 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${rotate} 12 12)`} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" />
      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
    </g>
  );
}

// 이번 주 월~일 7칸(dates: 월요일부터). mark: "paw" | "square". on(date) → 채움 여부
export function WeekStrip({ dates, on, mark = "paw", labelToday = false, today = todayKey() }) {
  const W = 154, step = 22;
  return (
    <svg viewBox={`0 0 ${W} 34`} width="100%" style={{ maxWidth: 220, display: "block" }} aria-hidden="true">
      {dates.map((d, i) => {
        const cx = 11 + i * step, filled = on(d), future = d > today, isToday = d === today;
        return (
          <g key={d}>
            {mark === "square"
              ? <rect x={cx - 9} y={4} width={18} height={16} rx={4} fill={filled ? "var(--sky, #81abcc)" : "var(--surface)"} stroke={filled ? "var(--ink, #47392e)" : "var(--border)"} strokeWidth="1.3" opacity={future ? 0.45 : 1} />
              : <circle cx={cx} cy={13} r={9.5} fill="var(--surface)" stroke={filled ? "var(--warm-bg)" : "var(--border)"} strokeWidth="1.3" strokeDasharray={filled ? "" : "2 2"} opacity={future ? 0.45 : 1} />}
            {mark === "paw" && filled && <PawGlyph x={cx - 7} y={6} s={0.6} rotate={[-8, 0, 6, -4, 5, -6, 3][i]} />}
            <text x={cx} y={32} fontSize="7.5" textAnchor="middle" fill={isToday && labelToday ? "var(--warm)" : "var(--text-faint)"} fontWeight={isToday && labelToday ? 800 : 400}>{isToday && labelToday ? "오늘" : DOW[new Date(`${d}T00:00:00`).getDay()]}</text>
          </g>
        );
      })}
    </svg>
  );
}
export function weekDates(today = todayKey()) {
  const d = new Date(`${today}T00:00:00`);
  const mon = addDays(d, -((d.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(mon, i)));
}

// 하루 체크 스탬프 노트(오늘 탭 말풍선 안): 이번 주 7칸, 찍은 날 발도장, 오늘은 쿵 찍히는 모션. 빠진 날은 그냥 빈 칸(벌점 없음)
export function WeekStamps({ dogId, today = todayKey() }) {
  const dates = weekDates(today);
  const stamped = (d) => { const v = getDay(dogId, d); return Boolean(v && v.status !== "unknown"); };
  const month = daysThisMonth(dogId, today);
  return (
    <span className="stamps" role="img" aria-label={`이번 주 하루 체크 ${dates.filter(stamped).length}일, 이번 달 ${month}일`}>
      <img className="stamps-tape" src={PIECE("tape")} alt="" />
      <span className="stamps-ttl">이번 주 하루 체크<small>이번 달 <b>{month}</b>번</small></span>
      <span className="stamps-week">
        {dates.map((d, i) => {
          const on = stamped(d), isToday = d === today, future = d > today;
          return (
            <span key={d} className={`stamp-day${future ? " future" : ""}`}>
              <span className={`stamp-slot${on ? " on" : ""}${isToday ? " today" : ""}${isToday && on ? " stamped" : ""}`}>
                {on && <svg viewBox="0 0 24 24" style={{ transform: `rotate(${[-8, 6, -3, 5, -6, 4, -2][i]}deg)` }}><PawGlyph stroke="currentColor" width={2.1} /></svg>}
              </span>
              <span className={isToday ? "stamp-lab today" : "stamp-lab"}>{isToday ? "오늘" : DOW[new Date(`${d}T00:00:00`).getDay()]}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

// 사료통: 빈 통 위에 "가득 찬 통"을 남은 비율만큼만 보이게 겹친다(안의 사료가 원래 그 통에 그려진 것이라 자연스럽다)
export function FoodJar({ stock, size = 96, ticks = true }) {
  if (!stock) return null;
  const bagG = stock.bagDays * stock.dailyGrams;
  const leftG = Math.max(0, stock.daysLeft) * stock.dailyGrams;
  const pct = bagG > 0 ? Math.max(0, Math.min(1, leftG / bagG)) : 0;
  const top = 24 + (1 - pct) * 60; // 통 안쪽은 그림의 24%~84% 높이
  const kg = (g) => (g >= 1000 ? `${Math.round(g / 100) / 10}kg` : `${Math.round(g)}g`);
  return (
    <span className="jar" style={{ width: size, height: Math.round(size * 1.13), marginRight: ticks ? 72 : 0 }} role="img" aria-label={`사료 ${kg(leftG)} 남음, 약 ${stock.daysLeft}일분`}>
      <img src={PIECE("container")} alt="" />
      <img src={PIECE("container-full")} alt="" style={{ clipPath: `inset(${top}% 0 0 0)` }} />
      {ticks && (
        <span className="jar-ticks">
          <i style={{ top: "24%" }}>꽉 참 {kg(bagG)}</i>
          <i style={{ top: `${top}%` }}>오늘 {kg(leftG)}</i>
          <i style={{ top: "84%" }}>{stock.daysLeft > 0 ? `${md(stock.runOut)} 비어요` : "비었어요"}</i>
        </span>
      )}
    </span>
  );
}

// 계량 숟가락 n개(한 끼 큰술)
export function Spoons({ n, size = 52 }) {
  const full = Math.max(0, Math.min(8, Math.floor(n)));
  const half = n - full >= 0.4; // 반 숟가락은 반투명으로
  return (
    <span className="spoons" role="img" aria-label={`밥숟가락 ${n}개`}>
      {Array.from({ length: full }, (_, i) => <img key={i} src={PIECE("spoon")} alt="" style={{ width: size }} />)}
      {half && <img src={PIECE("spoon")} alt="" style={{ width: size, opacity: 0.45 }} />}
    </span>
  );
}

// 물컵: 빈 컵 + 가득 찬 컵을 오늘 양만큼. 점선은 평소(7일 평균) 높이 — 판정이 아니라 비교
export function WaterCup({ today = 0, avg = 0, size = 64 }) {
  const level = avg > 0 ? Math.max(0.06, Math.min(0.92, (today / avg) * 0.5)) : today > 0 ? 0.5 : 0; // 평소 = 절반 높이
  const top = 10 + (1 - level) * 76;
  return (
    <span className="cup" style={{ width: size, height: Math.round(size * 1.3) }} role="img" aria-label={`물 ${today}ml`}>
      <img src={PIECE("cup")} alt="" />
      {level > 0 && <img src={PIECE("cup-full")} alt="" style={{ clipPath: `inset(${top}% 0 0 0)` }} />}
      {avg > 0 && <i className="cup-avg" style={{ top: `${10 + 0.5 * 76}%` }} />}
    </span>
  );
}

// 둥근 게이지 + 가운데 스티커(D-day·투약). pct 0~1
export function RingStat({ pct, size = 48, stroke = 5, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, pct || 0));
  return (
    <span className="ringstat" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-soft)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sky, #81abcc)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <span className="ringstat-in">{children}</span>
    </span>
  );
}

// 함께한 날 성장 자: 다음 기념일(100일 → 1년 → 매년)까지 차는 자
export function GrowthRuler({ days, startLabel }) {
  if (!(days > 0)) return null;
  const next = days < 100 ? 100 : days < 365 ? 365 : Math.ceil(days / 365) * 365;
  const prev = days < 100 ? 0 : days < 365 ? 100 : next - 365;
  const pct = (days - prev) / (next - prev);
  const label = (n) => (n % 365 === 0 ? `${n / 365}년` : `${n}일`);
  const x = 8 + pct * 304;
  return (
    <svg viewBox="0 0 320 60" width="100%" style={{ maxWidth: 420, display: "block" }} role="img" aria-label={`함께한 지 ${days}일, ${label(next)}까지 ${next - days}일`}>
      <rect x="8" y="26" width="304" height="10" rx="5" fill="var(--surface)" stroke="var(--ink, #47392e)" strokeWidth="1.3" />
      <rect x="8" y="26" width={Math.max(10, pct * 304)} height="10" rx="5" fill="var(--warm-bg)" stroke="var(--warm)" strokeWidth="1" />
      <g fill="none" stroke="var(--ink, #47392e)" strokeWidth="1.2"><line x1="8" y1="22" x2="8" y2="40" /><line x1="312" y1="22" x2="312" y2="40" /><line x1="160" y1="24" x2="160" y2="38" /></g>
      <g fontSize="9" fill="var(--text-faint)"><text x="8" y="50">{prev === 0 && startLabel ? startLabel : label(prev)}</text>{prev < 365 && <text x="160" y="50" textAnchor="middle">{label(Math.round((prev + next) / 2))}</text>}<text x="312" y="50" textAnchor="end">{label(next)}</text></g>
      <PawGlyph x={x - 11} y={0} s={0.85} />
      <text x="160" y="59" fontSize="9.5" textAnchor="middle" fill="var(--text)" fontWeight="800">{days}일째 · {label(next)}까지 {next - days}일</text>
    </svg>
  );
}

// 증상 타임라인: 기간 축 위에 그날 점(색 하나). rows: [{ label, dates:[YYYY-MM-DD] }]
export function SymptomTimeline({ rows, from, to }) {
  const span = Math.max(1, (new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000);
  const x = (d) => 48 + Math.max(0, Math.min(1, (new Date(`${d}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000 / span)) * 262;
  const H = 18 + rows.length * 28;
  return (
    <svg viewBox={`0 0 320 ${H}`} width="100%" style={{ display: "block" }} role="img" aria-label="증상 타임라인">
      {rows.map((r, i) => {
        const y = 14 + i * 28;
        return (
          <g key={r.label}>
            <text x="4" y={y + 4} fontSize="11" fontWeight="700" fill="var(--text)">{r.label}</text>
            <line x1="48" y1={y} x2="312" y2={y} stroke="var(--border)" />
            {r.dates.map((d, k) => <circle key={d + k} cx={x(d)} cy={y} r="5" fill="var(--sky, #81abcc)" stroke="var(--ink, #47392e)" strokeWidth="1.1" />)}
          </g>
        );
      })}
      <g fontSize="8.5" fill="var(--text-faint)" textAnchor="middle"><text x="48" y={H - 2}>{md(from)}</text><text x="312" y={H - 2}>{to === todayKey() ? "오늘" : md(to)}</text></g>
    </svg>
  );
}

// 하루 체크를 마친 순간: 화면을 어둡게 하고 스탬프 노트가 떠서 오늘 칸에 도장이 "쿵" 찍힌 뒤 사라진다(2.6초, 누르면 바로 닫힘). 노트 자체는 케어 탭에 산다
export function StampMoment({ dogId, onDone }) {
  const [out, setOut] = useState(false);
  const done = useRef(onDone); done.current = onDone;
  const close = () => { setOut(true); setTimeout(() => done.current(), 360); };
  useEffect(() => { const t = setTimeout(close, 2600); return () => clearTimeout(t); }, []);
  return createPortal(
    <div className={`stamp-moment${out ? " out" : ""}`} onClick={close} role="status" aria-live="polite">
      <div className="sm-box">
        <span className="sm-cheer">잘했어요!!</span>
        <WeekStamps dogId={dogId} />
      </div>
    </div>,
    document.body,
  );
}
