import { useEffect, useMemo, useState } from "react";
import { toast } from "../services/toast";
import { todayKey } from "../utils/date";
import { FoodJar, WeekStamps, StampRewards } from "../components/Pieces";
import { formatAge } from "../utils/age";
import { RoutineSheet } from "../components/OutingCard";
import Ico from "../components/Ico";
import PuppyCard from "../components/PuppyCard";
import { getFoodStock, stockLabel } from "../services/foodStock";
import { getFeedingPlan } from "../data/feedingGuide";
import { getFeedingSettings } from "../services/feedingSettings";
import { calculateAge } from "../utils/age";
import { getStage, getFit } from "../services/stageGuide";
import { getDay, clearDay, ITEMS } from "../services/dailyCheck";
import { markCheckedIn } from "../services/routine";
import { syncPushAlarms } from "../services/notifications";

// 체중 체크·약 관리는 프로필의 건강 수치에서 한다(체크리스트는 오늘의 케어 일과만).
export default function Home({ dog, onBack, onOpenFeeding, onOpenAlarms, onOpenGuide, onOpenPuppy, onOpenCharacter }) {
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
  // 11/19 사료 계산기 큰 타일: 한 끼 g · 다음 밥 시각(같은 모양 타일 3개 → 큰 것 하나 + 작은 둘)
  const feed = useMemo(() => {
    const st = getFeedingSettings(dog.id);
    const plan = dog.weight ? getFeedingPlan(dog, calculateAge(dog.birthDate).ageInWeeks, { stoolCondition: st.stoolCondition, kcalPer100g: st.kcalPer100g || undefined }) : null;
    const now = new Date(); const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const times = [...(st.times || [])].sort(); const next = times.find((t) => t > hm) || times[0];
    const perMeal = plan && plan.mealsPerDay ? Math.round(plan.dailyGrams / plan.mealsPerDay) : null;
    return { perMeal, meals: plan?.mealsPerDay, next, tomorrow: next && !times.some((t) => t > hm) };
  }, [dog, dateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen">
      {/* 11/15 사용자 결정: 오늘 할 일 목록은 뺌(하루 체크는 말풍선, 밥 알림은 사료 계산기 시각으로). 케어 = 월령별 가이드 → 퍼피 100일 → 하루 체크 결과 → 사료 계산기·알림·외출 시간 */}
      <div className="h1" style={{ marginBottom: 2 }}>케어</div>
      <p className="subtle" style={{ margin: "0 0 12px" }}>{dog.name} · {formatAge(stage.age)} · {stage.sizeLabel}{dog.weight ? ` · ${dog.weight}kg` : ""}</p>

      {/* 11/20 순서(사용자): 하루 체크 → 사료 계산기·알림·외출 → 월령별 가이드 → 퍼피 100일 훈련 */}
      <DailyRow dog={dog} dateKey={dateKey} onBack={onBack} onOpenCharacter={onOpenCharacter} />

      {food && food.daysLeft <= 7 && (
        <button type="button" className="food-alert" onClick={onOpenFeeding} style={{ alignItems: "center", gap: 12 }}>
          <FoodJar stock={food} size={44} ticks={false} />
          <span><b>{stockLabel(food)}</b> {food.daysLeft > 0 ? "· 지금 주문하면 넉넉해요" : "· 새 봉투를 뜯었으면 눌러서 알려 주세요"}</span>
        </button>
      )}

      <button type="button" className="care-feed" onClick={onOpenFeeding}>
        <img src="/pieces/bowl.png" alt="" width="56" height="56" />
        <span className="care-feed-body">
          <b>사료 계산기</b>
          <span>{feed.perMeal ? `한 끼 ${feed.perMeal}g · 하루 ${feed.meals}끼` : "몸무게를 적으면 한 끼 양을 계산해요"}{feed.next ? ` · ${feed.tomorrow ? "내일" : "다음"} ${feed.next}` : ""}</span>
        </span>
        <span className="care-feed-go">›</span>
      </button>
      <div className="quick-actions two" style={{ marginBottom: 14 }}>
        <button className="quick-tile" onClick={onOpenAlarms}>
          <span className="quick-tile-icon" aria-hidden="true"><Ico name="alarm" size={24} /></span>
          <span className="quick-tile-label">알림·알람</span>
        </button>
        <button className="quick-tile" onClick={() => setRoutineOpen(true)}>
          <span className="quick-tile-icon" aria-hidden="true"><Ico name="house" size={24} /></span>
          <span className="quick-tile-label">외출 시간</span>
        </button>
      </div>
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

    </div>
  );
}

// 오늘 하루 체크 결과 — 잘못 눌렀으면 [다시 고르기](체크와 체크로 만든 기록을 지우고 오늘 탭 말풍선이 다시 물어본다)
function DailyRow({ dog, dateKey, onBack, onOpenCharacter }) {
  const [day, setDay] = useState(() => getDay(dog.id, dateKey));
  if (!day || day.status === "unknown") return null;
  const text = day.status === "usual" ? "평소와 같았어요" : Object.entries(day.picks).map(([id, l]) => `${ITEMS.find((i) => i.id === id).label} ${l}`).join(", ");
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="dc-row">
        <Ico name="check" size={18} className="cat-ico tone-teal" />
        <span style={{ flex: 1, minWidth: 0 }}><b>오늘 하루 체크</b> · {text}</span>
        <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => (clearDay(dog.id, dateKey), markCheckedIn(dog.id, null), syncPushAlarms(), setDay(null), toast("오늘 하루 체크를 지웠어요 · 다시 골라 주세요"), onBack?.())}>다시 고르기</button>
      </div>
      {/* 11/18 사용자: 스탬프 노트는 오늘 탭 말풍선이 아니라 여기(케어)에 — 오늘 탭 강아지가 작아지지 않게 */}
      <WeekStamps dogId={dog.id} today={dateKey} />
      <StampRewards dogId={dog.id} today={dateKey} onOpenCharacter={onOpenCharacter} />
    </div>
  );
}
