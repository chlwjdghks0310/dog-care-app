import { useEffect, useMemo, useState } from "react";
import { todayKey } from "../utils/date";
import { FoodJar, WeekStamps } from "../components/Pieces";
import { formatAge } from "../utils/age";
import { RoutineSheet } from "../components/OutingCard";
import Ico from "../components/Ico";
import PuppyCard from "../components/PuppyCard";
import { getFoodStock, stockLabel } from "../services/foodStock";
import { getStage, getFit } from "../services/stageGuide";
import { getDay, clearDay, ITEMS } from "../services/dailyCheck";
import { markCheckedIn } from "../services/routine";
import { syncPushAlarms } from "../services/notifications";

// 체중 체크·약 관리는 프로필의 건강 수치에서 한다(체크리스트는 오늘의 케어 일과만).
export default function Home({ dog, onBack, onOpenFeeding, onOpenAlarms, onOpenGuide, onOpenPuppy }) {
  const stage = useMemo(() => getStage(dog), [dog]); // 월령별 가이드 띠(11/15)
  const [routineOpen, setRoutineOpen] = useState(false);
  const [dateKey, setDateKey] = useState(todayKey());

  // 날짜가 자정을 넘어가면 새로운 오늘 일정을 다시 불러온다.
  useEffect(() => {
    const timer = setInterval(() => {
      const key = todayKey();
      setDateKey((prev) => (prev === key ? prev : key));
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const food = useMemo(() => getFoodStock(dog), [dog]);
  const fit = useMemo(() => getFit(dog, stage).slice(0, 2), [dog, stage]);

  return (
    <div className="screen">
      {/* 11/15 사용자 결정: 오늘 할 일 목록은 뺌(하루 체크는 말풍선, 밥 알림은 사료 계산기 시각으로). 케어 = 월령별 가이드 → 퍼피 100일 → 하루 체크 결과 → 사료 계산기·알림·외출 시간 */}
      <div className="h1" style={{ marginBottom: 2 }}>케어</div>
      <p className="subtle" style={{ margin: "0 0 12px" }}>{dog.name} · {formatAge(stage.age)} · {stage.sizeLabel}{dog.weight ? ` · ${dog.weight}kg` : ""}</p>

      <button type="button" className="care-guide" onClick={onOpenGuide}>
        <span className="care-guide-top">
          <span className="care-guide-ico"><Ico name={stage.ico} size={34} /></span>
          <span className="care-guide-text">
            <span className="care-guide-sub">지금은 {stage.name} · {stage.rangeLabel}{stage.settle ? ` · 집에 온 지 ${stage.settle}일째` : ""}</span>
            <span className="care-guide-title">월령별 가이드</span>
            <span className="care-guide-desc">{stage.tip}</span>
          </span>
        </span>
        {fit.length > 0 && (
          <span className="care-guide-fit">
            {fit.map((f, i) => <span key={i}><Ico name={f.ico} size={16} /> {f.text}</span>)}
          </span>
        )}
        <span className="care-guide-foot">
          {stage.next && stage.weeksToNext !== null && <span className="faint">다음 · {stage.next.name}까지 약 {stage.weeksToNext >= 8 ? `${Math.round(stage.weeksToNext / 4.345)}개월` : `${stage.weeksToNext}주`}</span>}
          <span className="care-guide-go">간식·장난감·산책·건강 카드 보기 ›</span>
        </span>
      </button>

      {onOpenPuppy && <PuppyCard dog={dog} onOpen={onOpenPuppy} />}
      {routineOpen && <RoutineSheet onClose={() => setRoutineOpen(false)} />}

      {food && food.daysLeft <= 7 && (
        <button type="button" className="food-alert" onClick={onOpenFeeding} style={{ alignItems: "center", gap: 12 }}>
          <FoodJar stock={food} size={44} ticks={false} />
          <span><b>{stockLabel(food)}</b> {food.daysLeft > 0 ? "· 지금 주문하면 넉넉해요" : "· 새 봉투를 뜯었으면 눌러서 알려 주세요"}</span>
        </button>
      )}

      <DailyRow dog={dog} dateKey={dateKey} onBack={onBack} />

      <div className="quick-actions" style={{ marginBottom: 14 }}>
        <button className="quick-tile" onClick={onOpenFeeding}>
          <span className="quick-tile-icon" aria-hidden="true"><Ico name="bowl" size={24} /></span>
          <span className="quick-tile-label">사료 계산기</span>
        </button>
        <button className="quick-tile" onClick={onOpenAlarms}>
          <span className="quick-tile-icon" aria-hidden="true"><Ico name="alarm" size={24} /></span>
          <span className="quick-tile-label">알림·알람</span>
        </button>
        <button className="quick-tile" onClick={() => setRoutineOpen(true)}>
          <span className="quick-tile-icon" aria-hidden="true"><Ico name="house" size={24} /></span>
          <span className="quick-tile-label">외출 시간</span>
        </button>
      </div>
    </div>
  );
}

// 오늘 하루 체크 결과 — 잘못 눌렀으면 [다시 고르기](체크와 체크로 만든 기록을 지우고 오늘 탭 말풍선이 다시 물어본다)
function DailyRow({ dog, dateKey, onBack }) {
  const [day, setDay] = useState(() => getDay(dog.id, dateKey));
  if (!day || day.status === "unknown") return null;
  const text = day.status === "usual" ? "평소와 같았어요" : Object.entries(day.picks).map(([id, l]) => `${ITEMS.find((i) => i.id === id).label} ${l}`).join(", ");
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="dc-row">
        <Ico name="check" size={18} className="cat-ico tone-teal" />
        <span style={{ flex: 1, minWidth: 0 }}><b>오늘 하루 체크</b> · {text}</span>
        <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => (clearDay(dog.id, dateKey), markCheckedIn(dog.id, null), syncPushAlarms(), setDay(null), onBack())}>다시 고르기</button>
      </div>
      {/* 11/18 사용자: 스탬프 노트는 오늘 탭 말풍선이 아니라 여기(케어)에 — 오늘 탭 강아지가 작아지지 않게 */}
      <WeekStamps dogId={dog.id} today={dateKey} />
    </div>
  );
}
