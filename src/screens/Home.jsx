import { useEffect, useMemo, useState } from "react";
import { calculateAge } from "../utils/age";
import { todayKey, formatKoreanDate } from "../utils/date";
import { getTodayChecklist, getThisWeekHighlights, getUpcoming, getWeightCheckItem } from "../services/careEngine";
import { toggleScheduleItem } from "../services/scheduleRepository";
import { getCategoryIcon } from "../data/categoryIcons";
import { getWeightAssessment, getWeightStatusShortText } from "../data/weightGuide";
import { getLatestWeightRecord } from "../services/weightLog";
import { getDosesForDate, markDoseDone, undoDose } from "../services/medications";
import { syncPushAlarms } from "../services/notifications";

// 오늘 먹을 약을 "오늘 해야 할 일"에 함께 보여 준다 — 저장하지 않고 약 기록에서 매번 계산해서 같은 복용 건이 두 번 생기지 않는다.
const MED_STATUS_TEXT = { planned: "복용 예정", done: "먹였어요", skipped: "건너뜀", check: "기록 확인 필요" };
const medItems = (dog, dateKey) =>
  getDosesForDate(dog.id, dateKey).map((d) => ({
    id: `med-${d.key}`,
    ruleId: "med",
    dose: d,
    title: `${d.time} ${d.med.name} ${d.med.dose}`,
    description: d.status === "done" ? `${d.record.doneAt.slice(11, 16)}에 먹였어요` : MED_STATUS_TEXT[d.status],
    category: "약",
    completed: d.status === "done",
  }));

export default function Home({ dog, onOpenWeek, onOpenHealth, onOpenFeeding, onOpenAlarms, onOpenInfo, onOpenWeight, onOpenMeds, onOpenMain }) {
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
    const items = getTodayChecklist(dog, dateKey);
    const weightItem = getWeightCheckItem(dog, dateKey);
    setChecklist([...items, ...(weightItem ? [weightItem] : []), ...medItems(dog, dateKey)]);
  }
  useEffect(loadChecklist, [dog, dateKey]);

  const weightText = useMemo(() => {
    const age = calculateAge(dog.birthDate, new Date(dateKey));
    const latestRecord = getLatestWeightRecord(dog.id);
    const currentWeight = latestRecord ? latestRecord.weightKg : dog.weight;
    return getWeightStatusShortText(getWeightAssessment({ ...dog, weight: currentWeight }, age.ageInMonths));
  }, [dog, dateKey]);
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

  function handleMedToggle(item) {
    if (item.completed) undoDose(dog.id, item.dose);
    else markDoseDone(dog.id, item.dose);
    syncPushAlarms();
    loadChecklist();
  }

  const medsToday = checklist.filter((i) => i.ruleId === "med");
  const medsToCheck = medsToday.filter((i) => i.dose.status === "check").length;

  const doneCount = checklist.filter((i) => i.completed).length;

  return (
    <div className="screen">
      <div className="quick-actions" style={{ marginBottom: 14 }}>
        <button className="quick-tile" onClick={onOpenHealth}>
          <span className="quick-tile-icon" aria-hidden="true">🩺</span>
          <span className="quick-tile-label">건강 체크</span>
        </button>
        <button className="quick-tile" onClick={onOpenFeeding}>
          <span className="quick-tile-icon" aria-hidden="true">🍚</span>
          <span className="quick-tile-label">사료 계산기</span>
        </button>
        <button className="quick-tile" onClick={onOpenAlarms}>
          <span className="quick-tile-icon" aria-hidden="true">⏰</span>
          <span className="quick-tile-label">알림·알람</span>
        </button>
      </div>

      <div className="mini-cards">
        <button type="button" className="mini-card" onClick={onOpenWeight}>
          <span className="mini-card-title">⚖️ 체중 체크</span>
          <span className="mini-card-text">{weightText || "아직 기록이 없어요"}</span>
        </button>
        <button type="button" className="mini-card" onClick={onOpenMeds}>
          <span className="mini-card-title">💊 약 관리</span>
          <span className="mini-card-text">
            {medsToday.length === 0
              ? "오늘 먹을 약이 없어요"
              : `오늘 ${medsToday.filter((i) => i.completed).length}/${medsToday.length} 먹였어요${medsToCheck ? ` · 확인 필요 ${medsToCheck}` : ""}`}
          </span>
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
            <p className="faint" style={{ marginBottom: 4 }}>{doneCount}/{checklist.length} 완료</p>
            {groupedChecklist.map(([category, items]) => (
              <div key={category} className="category-group">
                <div className="category-label">
                  <span aria-hidden="true">{getCategoryIcon(category)}</span>
                  <span>{category}</span>
                </div>
                {items.map((item) =>
                  item.ruleId === "med" ? (
                    <label key={item.id} className={`checklist-item${item.completed ? " completed" : ""}`}>
                      <input type="checkbox" checked={item.completed} disabled={item.dose.status === "skipped"} onChange={() => handleMedToggle(item)} />
                      <div>
                        <div className="checklist-title" style={{ fontWeight: 600 }}>{item.title}</div>
                        <div className="subtle" style={item.dose.status === "check" ? { color: "var(--warning)" } : undefined}>{item.description}</div>
                      </div>
                    </label>
                  ) : item.ruleId === "weight-check" ? (
                    // 체중 측정은 체크박스로 직접 완료 처리하지 않는다 — 완료 표시는 실제로
                    // 체중을 기록해야만 바뀌고, 여기서는 그 화면으로 이동만 시킨다.
                    <button
                      key={item.id}
                      type="button"
                      onClick={onOpenWeight}
                      className={`checklist-item${item.completed ? " completed" : ""}`}
                      style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                    >
                      <span aria-hidden="true" style={{ fontSize: 18, width: 20, flexShrink: 0 }}>
                        {item.completed ? "✅" : "⚖️"}
                      </span>
                      <div>
                        <div className="checklist-title" style={{ fontWeight: 600 }}>{item.title}</div>
                        <div className="subtle">{item.description}</div>
                      </div>
                    </button>
                  ) : (
                    <label key={item.id} className={`checklist-item${item.completed ? " completed" : ""}`}>
                      <input type="checkbox" checked={item.completed} onChange={() => handleToggle(item.id)} />
                      <div>
                        <div className="checklist-title" style={{ fontWeight: 600 }}>{item.title}</div>
                        {item.description && <div className="subtle">{item.description}</div>}
                      </div>
                    </label>
                  )
                )}
              </div>
            ))}
          </>
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
        📖 월령별 케어 정보 더 보기
      </button>

      <p
        className="subtle"
        style={{ textAlign: "center", marginTop: 14, marginBottom: 0, cursor: "pointer" }}
        onClick={onOpenMain}
      >
        궁금한 점은 메인에 있는 강아지한테 물어보세요!
      </p>
    </div>
  );
}
