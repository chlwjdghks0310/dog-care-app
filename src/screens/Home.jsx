import { useEffect, useMemo, useState } from "react";
import { todayKey, formatKoreanDate } from "../utils/date";
import { getTodayChecklist, getThisWeekHighlights, getUpcoming } from "../services/careEngine";
import { toggleScheduleItem } from "../services/scheduleRepository";
import { getCategoryIco, getCategoryTone } from "../data/categoryIcons";
import Ico from "../components/Ico";
import ProgressRing from "../components/ProgressRing";
import { getFeedingSettings } from "../services/feedingSettings";
import { getHiddenRules, setRuleHidden } from "../services/ruleOverrides";
import { getRuleById } from "../data/careRules";
import { getRoutine, isWorkday, daySlot } from "../services/routine";
import { getFoodStock, stockLabel } from "../services/foodStock";
import { RoutineSheet } from "../components/OutingCard";

// 체중 체크·약 관리는 프로필의 건강 수치에서 한다(체크리스트는 오늘의 케어 일과만).
export default function Home({ dog, onOpenWeek, onOpenHealth, onOpenFeeding, onOpenAlarms, onOpenInfo, onOpenMain }) {
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

  const weekHighlights = useMemo(() => getThisWeekHighlights(dog).slice(0, 2), [dog, hidden]); // eslint-disable-line react-hooks/exhaustive-deps
  const upcoming = useMemo(() => getUpcoming(dog).slice(0, 2), [dog, hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  // 나가는 날(평소 외출 시간 설정)이면 종류별 대신 "아침 · 나가기 전 / 저녁 · 들어와서"로 — 낮에 할 수 없는 일은 저녁에
  const [routine, setRoutine] = useState(getRoutine);
  const [routineOpen, setRoutineOpen] = useState(false);
  const bySlot = isWorkday(routine);
  const food = useMemo(() => getFoodStock(dog), [dog]);
  const groupedChecklist = useMemo(() => {
    if (bySlot) {
      const groups = [
        ["아침 · 나가기 전", "sun", checklist.filter((it) => daySlot(it, routine) === "morning")],
        ["저녁 · 들어와서", "moon", checklist.filter((it) => daySlot(it, routine) === "evening")],
      ];
      return groups.filter(([, , items]) => items.length).map(([label, ico, items]) => [label, items, ico]);
    }
    const map = new Map();
    for (const item of checklist) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category).push(item);
    }
    return [...map.entries()];
  }, [checklist, bySlot, routine]);

  function handleToggle(itemId) {
    toggleScheduleItem(dog.id, dateKey, itemId);
    loadChecklist();
  }

  const doneCount = checklist.filter((i) => i.completed).length;

  const noMealTimes = !(getFeedingSettings(dog.id).times || []).length;

  return (
    <div className="screen">
      <div className="h1" style={{ marginBottom: 10 }}>체크리스트</div>
      <div className="quick-actions" style={{ marginBottom: 14 }}>
        <button className="quick-tile tone-blue filled" onClick={onOpenHealth}>
          <span className="quick-tile-icon" aria-hidden="true"><Ico name="scan" size={24} /></span>
          <span className="quick-tile-label">건강 체크</span>
        </button>
        <button className="quick-tile tone-rose filled" onClick={onOpenFeeding}>
          <span className="quick-tile-icon" aria-hidden="true"><Ico name="bowl" size={24} /></span>
          <span className="quick-tile-label">사료 계산기</span>
        </button>
        <button className="quick-tile tone-violet filled" onClick={onOpenAlarms}>
          <span className="quick-tile-icon" aria-hidden="true"><Ico name="alarm" size={24} /></span>
          <span className="quick-tile-label">알림·알람</span>
        </button>
      </div>

      {food && food.daysLeft <= 7 && (
        <button type="button" className="food-alert" onClick={onOpenFeeding}>
          <Ico name="bowl" size={18} />
          <span><b>{stockLabel(food)}</b> {food.daysLeft > 0 ? "· 지금 주문하면 넉넉해요" : "· 새 봉투를 뜯었으면 눌러서 알려 주세요"}</span>
        </button>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="h2">오늘 해야 할 일</div>
          <span className="faint">{formatKoreanDate(dateKey)}</span>
        </div>
        {checklist.length === 0 ? (
          <p className="subtle">오늘 등록된 필수 일과가 없어요. 이번 주 핵심을 확인해보세요.</p>
        ) : (
          <>
            <div className="today-head">
              <ProgressRing done={doneCount} total={checklist.length} label="오늘 할 일" />
              <div>
                <div style={{ fontWeight: 700 }}>
                  {doneCount === checklist.length ? `오늘 할 일을 다 했어요!` : `${checklist.length - doneCount}개 남았어요`}
                </div>
                <div className="faint">{checklist.length}개 중 {doneCount}개 완료</div>
              </div>
            </div>
            {groupedChecklist.map(([category, items, slotIco]) => (
              <div key={category} className="category-group">
                <div className="category-label">
                  <Ico name={slotIco || getCategoryIco(category)} size={16} className={`cat-ico tone-${slotIco ? "violet" : getCategoryTone(category)}`} />
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
          </>
        )}
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
        <button type="button" className="link-btn" style={{ marginTop: 8 }} onClick={() => setRoutineOpen(true)}>
          {bySlot ? `평소 외출 시간(${routine.leave}~${routine.back}) 기준으로 나눴어요 · 바꾸기` : routine ? "평소 외출 시간 바꾸기" : "출근·외출이 잦나요? 아침·저녁으로 나눠 보기"}
        </button>
        {routineOpen && <RoutineSheet onClose={() => (setRoutineOpen(false), setRoutine(getRoutine()))} />}
        {noMealTimes && (
          <button type="button" className="btn-ghost small" style={{ width: "100%", marginTop: 10 }} onClick={onOpenFeeding}>
            <Ico name="bowl" size={16} /> 밥 시간 정하고 알림 받기
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div className="h2">이번 주 핵심</div>
          <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12.5 }} onClick={onOpenWeek}>
            더보기
          </button>
        </div>
        {weekHighlights.length === 0 ? (
          <p className="subtle">이번 주 특별히 챙길 항목이 없어요.</p>
        ) : (
          weekHighlights.map((rule) => (
            <div key={rule.id} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{rule.title}</div>
              <div className="subtle">{rule.why}</div>
            </div>
          ))
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="h2">곧 시작하는 관리</div>
          {upcoming.map((rule) => (
            <div key={rule.id} className="subtle" style={{ marginBottom: 6 }}>
              약 {rule.startsInWeeks}주 후 · {rule.title}
            </div>
          ))}
        </div>
      )}

      <button className="btn-ghost" style={{ width: "100%" }} onClick={onOpenInfo}>
        <Ico name="book" size={18} /> 월령별 케어 정보 더 보기
      </button>

      <button type="button" className="link-btn" style={{ display: "block", margin: "14px auto 0" }} onClick={onOpenMain}>
        궁금한 점은 비서 탭의 강아지한테 물어보세요 ›
      </button>
    </div>
  );
}
