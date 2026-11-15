import { useEffect, useMemo, useState } from "react";
import { todayKey, formatKoreanDate } from "../utils/date";
import { formatAge } from "../utils/age";
import { RoutineSheet } from "../components/OutingCard";
import { getTodayChecklist } from "../services/careEngine";
import { toggleScheduleItem } from "../services/scheduleRepository";
import { getCategoryIco, getCategoryTone } from "../data/categoryIcons";
import Ico from "../components/Ico";
import ProgressRing from "../components/ProgressRing";
import PuppyCard from "../components/PuppyCard";
import { getFeedingSettings } from "../services/feedingSettings";
import { getHiddenRules, setRuleHidden } from "../services/ruleOverrides";
import { getRuleById } from "../data/careRules";
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
  const [checklist, setChecklist] = useState([]);

  // 날짜가 자정을 넘어가면 새로운 오늘 일정을 다시 불러온다.
  useEffect(() => {
    const timer = setInterval(() => {
      const key = todayKey();
      setDateKey((prev) => (prev === key ? prev : key));
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  function loadChecklist() {
    setChecklist(getTodayChecklist(dog, dateKey));
  }
  // 앱이 추천한 할 일은 숨길 수 있다(밥 주기처럼 직접 정한 건 제외). 숨긴 건 카드 아래에서 다시 보이게
  const [hidden, setHidden] = useState(() => getHiddenRules(dog.id));
  const [showHidden, setShowHidden] = useState(false);
  const hiddenList = Object.keys(hidden).map(getRuleById).filter(Boolean);
  function toggleHide(ruleId, nextHidden) {
    setRuleHidden(dog.id, ruleId, nextHidden);
    setHidden(getHiddenRules(dog.id));
    setChecklist(getTodayChecklist(dog, dateKey));
  }
  useEffect(loadChecklist, [dog, dateKey]);


  const food = useMemo(() => getFoodStock(dog), [dog]);
  const groupedChecklist = useMemo(() => {
    const map = new Map();
    for (const item of checklist) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category).push(item);
    }
    return [...map.entries()];
  }, [checklist]);

  function handleToggle(itemId) {
    toggleScheduleItem(dog.id, dateKey, itemId);
    loadChecklist();
  }

  const doneCount = checklist.filter((i) => i.completed).length;

  const noMealTimes = !(getFeedingSettings(dog.id).times || []).length;

  const [listOpen, setListOpen] = useState(false); // 11/15 사용자: 케어 탭은 가이드·훈련이 먼저, 할 일은 접어서 아래에
  const left = checklist.length - doneCount;
  const fit = useMemo(() => getFit(dog, stage).slice(0, 2), [dog, stage]);

  return (
    <div className="screen">
      {/* 11/15: 케어 탭 첫 화면 — 월령별 가이드(크게) → 퍼피 100일 → 하루 체크 결과 → 오늘 할 일(접힘) → 사료 계산기·알림·외출 시간 */}
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
        <span className="care-guide-go">간식·장난감·산책·건강 카드 보기 ›</span>
      </button>

      {onOpenPuppy && <PuppyCard dog={dog} onOpen={onOpenPuppy} />}
      {routineOpen && <RoutineSheet onClose={() => setRoutineOpen(false)} />}

      {food && food.daysLeft <= 7 && (
        <button type="button" className="food-alert" onClick={onOpenFeeding}>
          <Ico name="bowl" size={18} />
          <span><b>{stockLabel(food)}</b> {food.daysLeft > 0 ? "· 지금 주문하면 넉넉해요" : "· 새 봉투를 뜯었으면 눌러서 알려 주세요"}</span>
        </button>
      )}

      <DailyRow dog={dog} dateKey={dateKey} onBack={onBack} />

      {/* 오늘 할 일: 접어 두고 남은 개수만. 밥 시간 알림·산책 체크·가이드에서 넣은 할 일이 여기 쌓인다 */}
      <div className="card" style={{ marginBottom: 14, padding: listOpen ? undefined : "12px 16px" }}>
        <button type="button" className="care-list-head" aria-expanded={listOpen} onClick={() => setListOpen((v) => !v)}>
          <Ico name="checklist" size={22} />
          <span className="care-list-text">
            <b>오늘 할 일</b>
            <span className="faint">{checklist.length === 0 ? "오늘 등록된 할 일이 없어요" : left === 0 ? "다 했어요!" : `${left}개 남았어요 · ${checklist.length}개 중 ${doneCount}개 완료`} · {formatKoreanDate(dateKey)}</span>
          </span>
          <Ico name="arrowDown" size={18} className={`mg-card-arrow${listOpen ? " up" : ""}`} style={{ marginTop: 0 }} />
        </button>
        {listOpen && (
          <div style={{ marginTop: 10 }}>
            {checklist.length > 0 && (
              <div className="today-head">
                <ProgressRing done={doneCount} total={checklist.length} label="오늘 할 일" />
                <div>
                  <div style={{ fontWeight: 700 }}>{doneCount === checklist.length ? `오늘 할 일을 다 했어요!` : `${left}개 남았어요`}</div>
                  <div className="faint">{checklist.length}개 중 {doneCount}개 완료</div>
                </div>
              </div>
            )}
            {groupedChecklist.map(([category, items]) => (
              <div key={category} className="category-group">
                <div className="category-label">
                  <Ico name={getCategoryIco(category)} size={16} className={`cat-ico tone-${getCategoryTone(category)}`} />
                  <span>{category}</span>
                </div>
                {items.map((item) => (
                  <label key={item.id} className={`checklist-item${item.completed ? " completed" : ""}`}>
                    <input type="checkbox" checked={item.completed} disabled={item.autoDone} onChange={() => handleToggle(item.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="checklist-title" style={{ fontWeight: 600 }}>{item.title}</div>
                      {item.autoDone ? <div className="subtle">오늘 산책 기록이 있어서 완료로 표시했어요.</div> : item.description && <div className="subtle">{item.description}</div>}
                    </div>
                    {item.ruleId && !item.ruleId.startsWith("meal-") && (
                      <button type="button" className="hide-btn" onClick={(e) => (e.preventDefault(), toggleHide(item.ruleId, true))}>숨기기</button>
                    )}
                  </label>
                ))}
              </div>
            ))}
            {hiddenList.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="link-btn" aria-expanded={showHidden} onClick={() => setShowHidden((v) => !v)}>
                  숨긴 할 일 {hiddenList.length}개 {showHidden ? "▴" : "▾"}
                </button>
                {showHidden &&
                  hiddenList.map((rule) => (
                    <div key={rule.id} className="hidden-row">
                      <span className="subtle">{rule.title}</span>
                      <button type="button" className="hide-btn" onClick={() => toggleHide(rule.id, false)}>다시 보이기</button>
                    </div>
                  ))}
              </div>
            )}
            {noMealTimes && (
              <button type="button" className="btn-ghost small" style={{ width: "100%", marginTop: 10 }} onClick={onOpenFeeding}>
                <Ico name="bowl" size={16} /> 밥 시간 정하고 알림 받기
              </button>
            )}
          </div>
        )}
      </div>

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
    <div className="card dc-row" style={{ marginBottom: 14 }}>
      <Ico name="check" size={18} className="cat-ico tone-teal" />
      <span style={{ flex: 1, minWidth: 0 }}><b>오늘 하루 체크</b> · {text}</span>
      <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => (clearDay(dog.id, dateKey), markCheckedIn(dog.id, null), syncPushAlarms(), setDay(null), onBack())}>다시 고르기</button>
    </div>
  );
}
