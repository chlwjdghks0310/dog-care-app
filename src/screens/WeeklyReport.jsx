import { useEffect, useMemo, useState } from "react";
import Ico from "../components/Ico";
import { buildWeeklyReport } from "../services/weeklyReport";
import { stockLabel } from "../services/foodStock";
import { durationLabel } from "../services/routine";
import { md } from "../services/records";
import { josa } from "../utils/text";
import { drawTogetherCard, drawWeeklyCard, togetherDays } from "../services/shareCard";
import { WeekStrip } from "../components/Pieces";

// 체중: 지난 기록 → 이번 주 두 점(색 판정 없음)
function WeightDots({ w }) {
  if (!w) return <span style={{ display: "block", height: 28 }} />;
  const prev = w.diff != null ? Math.round((w.kg - w.diff) * 100) / 100 : null;
  const y2 = prev == null ? 18 : w.diff > 0 ? 12 : w.diff < 0 ? 24 : 18;
  return (
    <svg viewBox="0 0 150 36" width="100%" style={{ maxWidth: 200, display: "block" }} aria-hidden="true">
      <line x1="10" y1="30" x2="140" y2="30" stroke="var(--border)" />
      {prev != null && <><line x1="40" y1="18" x2="110" y2={y2} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="3 3" /><circle cx="40" cy="18" r="4.5" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.5" /><text x="40" y="9" fontSize="8.5" textAnchor="middle" fill="var(--text-faint)">지난 {prev}</text></>}
      <circle cx="110" cy={y2} r="5.5" fill="var(--warm-bg)" stroke="var(--ink)" strokeWidth="1.5" />
      <text x="110" y={y2 - 9} fontSize="8.5" textAnchor="middle" fill="var(--text)" fontWeight="800">{w.kg}</text>
    </svg>
  );
}
// 혼자 있던 시간: 하루 24시간 중 평균 몇 시간인지 호로
function AloneArc({ hours }) {
  const v = Math.max(0, Math.min(1, hours / 24)), c = 2 * Math.PI * 19;
  return (
    <svg width="46" height="46" viewBox="0 0 50 50" aria-hidden="true">
      <circle cx="25" cy="25" r="19" fill="var(--surface)" stroke="var(--accent-soft)" strokeWidth="6" />
      <circle cx="25" cy="25" r="19" fill="none" stroke="var(--sky)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} transform="rotate(-90 25 25)" />
      <text x="25" y="29" fontSize="11" textAnchor="middle" fill="var(--ink)" fontWeight="800">{hours ? `${Math.round(hours * 10) / 10}h` : "–"}</text>
    </svg>
  );
}

// 주간 리포트(일요일 밤 알림·프로필에서). 기록된 사실만 숫자로 — 좋다/나쁘다 판단은 하지 않는다.
export default function WeeklyReport({ dog, onBack, onOpenVet }) {
  const r = useMemo(() => buildWeeklyReport(dog), [dog]);
  const symptomDates = new Set(r.symptoms.map((s) => s.date));
  const mealTotal = r.meal.usual + r.meal.less + r.meal.more;
  const tiles = [
    { ico: "walk", tone: "violet", label: "산책", viz: <WeekStrip dates={r.dates} on={(d) => r.walk.dates.includes(d)} />, num: r.walk.days ? `${r.walk.days}일` : "기록 없음", unit: r.walk.minutes ? `모두 ${r.walk.minutes}분` : "" },
    { ico: "bowl", tone: "rose", label: "밥", viz: <span style={{ display: "flex", gap: 1, alignItems: "center", minHeight: 28 }}>{Array.from({ length: Math.min(7, mealTotal) }, (_, i) => <img key={i} src="/pieces/bowl.png" alt="" style={{ width: 26, opacity: i < r.meal.usual ? 1 : 0.35, filter: i < r.meal.usual ? "none" : "grayscale(1)" }} />)}</span>, num: mealTotal ? `${r.meal.usual}번` : "기록 없음", unit: [r.meal.less && `적게 ${r.meal.less}`, r.meal.more && `많이 ${r.meal.more}`].filter(Boolean).join(" · ") },
    { ico: "toilet", tone: "teal", label: "무른 변·설사", viz: <WeekStrip dates={r.dates} on={(d) => r.looseDays.includes(d)} mark="square" />, num: `${r.looseDays.length}일`, unit: r.looseDays.length ? r.looseDays.map(md).join(", ") : "기록된 날 없음" },
    { ico: "bandaid", tone: "blue", label: "증상 기록", viz: <WeekStrip dates={r.dates} on={(d) => symptomDates.has(d)} mark="square" />, num: `${r.symptoms.length}번`, unit: r.symptoms.length ? "아래에 날짜별로" : "기록된 증상 없음" },
    { ico: "scales", tone: "blue", label: "체중", viz: <WeightDots w={r.weight} />, num: r.weight ? `${r.weight.kg}` : "기록 없음", unit: r.weight ? `kg${r.weight.diff != null ? ` · ${r.weight.diff > 0 ? "+" : ""}${r.weight.diff}` : ""}` : "" },
    { ico: "house", tone: "violet", label: "혼자 있던 시간", viz: <AloneArc hours={r.alone ? r.alone.avg / 60 : 0} />, num: r.alone ? durationLabel(r.alone.avg) : "기록 없음", unit: r.alone ? `하루 평균 · ${r.alone.days}일` : "외출할 때 [다녀올게]를 눌러요" },
  ];
  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>← 우리 아이로</button>
      <div className="h1">{josa(dog.name, "이의", "의")} 이번 주</div>
      <p className="subtle" style={{ marginBottom: 14 }}>
        {md(r.from)} ~ {md(r.to)} · 기록 {r.records}개를 모았어요
      </p>

      {r.records < 3 && (
        <div className="wr-hint">
          <Ico name="idea" size={18} />
          <span>이번 주는 기록이 {r.records}개예요. 오늘 탭에서 <b>[평소와 같아요]</b>만 눌러도 다음 주 리포트가 채워져요.</span>
        </div>
      )}

      {/* 11/18 그림화(시안 2차): 칸 6개는 그대로, 큰 숫자 자리에 그림 + 숫자는 동글체로 작게. 색 판정 없음 */}
      <div className="wr-grid">
        {tiles.map((t) => (
          <div key={t.label} className="wr-tile">
            <span className="wr-label"><Ico name={t.ico} size={16} className={`cat-ico tone-${t.tone}`} /> {t.label}</span>
            <span className="wr-viz">{t.viz}</span>
            <span className="wr-num">{t.num}{t.unit && <small> {t.unit}</small>}</span>
            {t.sub && <span className="wr-sub">{t.sub}</span>}
          </div>
        ))}
      </div>

      {r.symptoms.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="h2">증상 기록</div>
          {r.symptoms.map((s, i) => (
            <div key={i} className="wr-row"><span className="faint">{md(s.date)}</span><span>{(s.kinds || []).join(", ")}</span></div>
          ))}
          <p className="faint" style={{ marginTop: 6 }}>병원에 가게 되면 병원용 기록으로 한 장에 정리해 보여 줄 수 있어요.</p>
        </div>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <div className="h2">다음 7일</div>
        {r.next.length ? (
          r.next.map((e, i) => (
            <div key={i} className="wr-row"><span className="faint">{md(e.date)}{e.time ? ` ${e.time}` : ""}</span><span>{e.title}</span></div>
          ))
        ) : (
          <p className="subtle">일정표에 잡힌 일정이 없어요.</p>
        )}
        {r.food && <div className="wr-row"><span className="faint">사료</span><span>{stockLabel(r.food)}</span></div>}
      </div>

      <ShareCardButton dog={dog} />
      <button type="button" className="btn-ghost report-btn" style={{ marginTop: 14 }} onClick={onOpenVet}>
        <Ico name="clipboard" size={18} className="cat-ico tone-blue" /> 병원용 기록으로 보기
      </button>
      <p className="faint" style={{ marginTop: 10 }}>적어 둔 기록을 그대로 센 숫자예요. 몸 상태를 판단한 결과가 아니에요.</p>
    </div>
  );
}

// 이번 주 카드 공유(인스타 스토리·카톡 등) — 건강 문제 없이 함께한 기록만 그림으로
function ShareCardButton({ dog }) {
  const [msg, setMsg] = useState("");
  const [files, setFiles] = useState({}); // 미리 만든 그림 — 아이폰은 누른 직후에만 공유 창이 열려서(만드는 동안 기다리면 막힘)
  const days = togetherDays(dog);
  useEffect(() => {
    let alive = true;
    const make = async (kind, draw, name) => new File([await draw(dog)], name, { type: "image/png" });
    Promise.all([make("week", drawWeeklyCard, `${dog.name}-이번주.png`), days > 0 ? make("together", drawTogetherCard, `${dog.name}-함께한${days}일.png`) : null])
      .then(([week, together]) => alive && setFiles({ week, together }))
      .catch(() => alive && setMsg("카드를 만들지 못했어요."));
    return () => (alive = false);
  }, [dog, days]);
  function share(kind) {
    setMsg("");
    const file = files[kind];
    if (!file) return setMsg("카드를 만드는 중이에요. 잠시 뒤 다시 눌러 주세요.");
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title: `${dog.name}의 카드` }).catch((e) => e.name !== "AbortError" && setMsg("공유하지 못했어요. 다시 시도해 주세요."));
      return;
    }
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(file), download: file.name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <>
      <button type="button" className="btn-primary" style={{ marginTop: 14 }} onClick={() => share("week")}>
        <Ico name="camera" size={18} /> 이번 주 카드로 자랑하기
      </button>
      {days > 0 && (
        <button type="button" className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => share("together")}>
          <Ico name="heartPlain" size={18} /> 함께한 {days}일 카드 만들기
        </button>
      )}
      <p className="faint" style={{ margin: "6px 0 0", fontSize: 12.5 }}>함께 본 날·산책·몸무게·기록 수만 들어가요. 건강 기록은 넣지 않아요.</p>
      {msg && <p className="error-text">{msg}</p>}
    </>
  );
}
