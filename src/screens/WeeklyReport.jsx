import { useMemo } from "react";
import Ico from "../components/Ico";
import { buildWeeklyReport } from "../services/weeklyReport";
import { stockLabel } from "../services/foodStock";
import { durationLabel } from "../services/routine";
import { md } from "../services/records";
import { josa } from "../utils/text";

// 주간 리포트(일요일 밤 알림·프로필에서). 기록된 사실만 숫자로 — 좋다/나쁘다 판단은 하지 않는다.
export default function WeeklyReport({ dog, onBack, onOpenVet }) {
  const r = useMemo(() => buildWeeklyReport(dog), [dog]);
  const tiles = [
    { ico: "walk", tone: "violet", label: "산책", value: r.walk.days ? `${r.walk.days}일` : "기록 없음", sub: r.walk.minutes ? `모두 ${r.walk.minutes}분` : "" },
    { ico: "bowl", tone: "rose", label: "밥", value: r.meal.usual + r.meal.less + r.meal.more ? `평소 ${r.meal.usual}번` : "기록 없음", sub: [r.meal.less && `적게 ${r.meal.less}번`, r.meal.more && `많이 ${r.meal.more}번`].filter(Boolean).join(" · ") },
    { ico: "toilet", tone: "teal", label: "무른 변·설사", value: `${r.looseDays.length}일`, sub: r.looseDays.length ? r.looseDays.map(md).join(", ") : "기록된 날 없음" },
    { ico: "bandaid", tone: "blue", label: "증상 기록", value: `${r.symptoms.length}번`, sub: r.symptoms.length ? "아래에 날짜별로" : "기록된 증상 없음" },
    { ico: "scales", tone: "blue", label: "체중", value: r.weight ? `${r.weight.kg}kg` : "기록 없음", sub: r.weight?.diff != null ? `지난 기록보다 ${r.weight.diff > 0 ? "+" : ""}${r.weight.diff}kg` : "" },
    { ico: "house", tone: "violet", label: "혼자 있던 시간", value: r.alone ? `하루 ${durationLabel(r.alone.avg)}` : "기록 없음", sub: r.alone ? `평균 · [다녀올게] 누른 ${r.alone.days}일` : "외출할 때 [다녀올게]를 눌러요" },
    { ico: "checklist", tone: "blue", label: "체크리스트", value: r.checklist.total ? `${r.checklist.done}/${r.checklist.total}` : "—", sub: r.checklist.total ? "한 일 / 할 일" : "앱을 연 날만 세요" },
  ];
  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>← 프로필로</button>
      <div className="h1">{josa(dog.name, "이의", "의")} 이번 주</div>
      <p className="subtle" style={{ marginBottom: 14 }}>
        {md(r.from)} ~ {md(r.to)} · 기록 {r.records}개를 모았어요
      </p>

      {r.records < 3 && (
        <div className="wr-hint">
          <Ico name="idea" size={18} />
          <span>이번 주는 기록이 {r.records}개예요. 저녁에 비서 화면의 <b>30초 체크인</b>만 눌러도 다음 주 리포트가 채워져요.</span>
        </div>
      )}

      <div className="wr-grid">
        {tiles.map((t) => (
          <div key={t.label} className="wr-tile">
            <span className="wr-label"><Ico name={t.ico} size={16} className={`cat-ico tone-${t.tone}`} /> {t.label}</span>
            <b>{t.value}</b>
            {t.sub && <span className="wr-sub">{t.sub}</span>}
          </div>
        ))}
      </div>

      {r.symptoms.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="h2">증상 기록</div>
          {r.symptoms.map((s, i) => (
            <div key={i} className="wr-row"><span className="faint">{md(s.date)}</span><span>{s.kinds.join(", ")}</span></div>
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

      <button type="button" className="btn-ghost report-btn" style={{ marginTop: 14 }} onClick={onOpenVet}>
        <Ico name="clipboard" size={18} className="cat-ico tone-blue" /> 병원용 기록으로 보기
      </button>
      <p className="faint" style={{ marginTop: 10 }}>적어 둔 기록을 그대로 센 숫자예요. 몸 상태를 판단한 결과가 아니에요.</p>
    </div>
  );
}
