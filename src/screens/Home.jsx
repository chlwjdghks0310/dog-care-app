import { useEffect, useMemo, useState } from "react";
import { todayKey, formatKoreanDate } from "../utils/date";
import { getTodayChecklist, getThisWeekHighlights, getUpcoming } from "../services/careEngine";
import { toggleScheduleItem } from "../services/scheduleRepository";
import { getCategoryIco, getCategoryTone } from "../data/categoryIcons";
import Ico from "../components/Ico";
import ProgressRing from "../components/ProgressRing";
import { getFeedingSettings } from "../services/feedingSettings";

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
  useEffect(loadChecklist, [dog, dateKey]);

  const weekHighlights = useMemo(() => getThisWeekHighlights(dog).slice(0, 2), [dog]);
  const upcoming = useMemo(() => getUpcoming(dog).slice(0, 2), [dog]);

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

  return (
    <div className="screen">
      <div className="h1" style={{ marginBottom: 10 }}>체크리스트</div>
      <div className="quick-actions" style={{ marginBottom: 14 }}>
        <button className="quick-tile" onClick={onOpenHealth}>
          <span className="quick-tile-icon tone-blue" aria-hidden="true"><Ico name="stethoscope" size={24} /></span>
          <span className="quick-tile-label">건강 체크</span>
        </button>
        <button className="quick-tile" onClick={onOpenFeeding}>
          <span className="quick-tile-icon tone-rose" aria-hidden="true"><Ico name="utensils" size={24} /></span>
          <span className="quick-tile-label">사료 계산기</span>
        </button>
        <button className="quick-tile" onClick={onOpenAlarms}>
          <span className="quick-tile-icon tone-violet" aria-hidden="true"><Ico name="alarm" size={24} /></span>
          <span className="quick-tile-label">알림·알람</span>
        </button>
      </div>

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
            {groupedChecklist.map(([category, items]) => (
              <div key={category} className="category-group">
                <div className="category-label">
                  <Ico name={getCategoryIco(category)} size={16} className={`cat-ico tone-${getCategoryTone(category)}`} />
                  <span>{category}</span>
                </div>
                {items.map((item) => (
                  <label key={item.id} className={`checklist-item${item.completed ? " completed" : ""}`}>
                    <input type="checkbox" checked={item.completed} onChange={() => handleToggle(item.id)} />
                    <div>
                      <div className="checklist-title" style={{ fontWeight: 600 }}>{item.title}</div>
                      {item.description && <div className="subtle">{item.description}</div>}
                    </div>
                  </label>
                ))}
              </div>
            ))}
          </>
        )}
        {noMealTimes && (
          <button type="button" className="btn-ghost small" style={{ width: "100%", marginTop: 10 }} onClick={onOpenFeeding}>
            <Ico name="utensils" size={16} /> 밥 시간 정하고 알림 받기
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
          <div className="h2">다가오는 일정</div>
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

      <p
        className="subtle"
        style={{ textAlign: "center", marginTop: 14, marginBottom: 0, cursor: "pointer" }}
        onClick={onOpenMain}
      >
        궁금한 점은 비서 탭의 강아지한테 물어보세요!
      </p>
    </div>
  );
}
