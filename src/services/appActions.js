import { addExpense, getCategories, setAllowance } from "./expenses";
import { addEvent } from "./calendarEvents";
import { addWeightRecord, getLatestWeightRecord } from "./weightLog";
import { saveDog } from "./dogRepository";
import { getScheduleForDate, toggleScheduleItem } from "./scheduleRepository";
import { getTodayChecklist } from "./careEngine";
import { addCustomSchedule } from "./customSchedules";
import { ALARM_SOUND_LIST } from "./alarmSounds";
import { syncPushAlarms } from "./notifications";
import { todayKey } from "../utils/date";

// 채팅 AI가 "기록해 달라"는 요청을 받아 보낸 동작(actions)을 실제로 앱에 저장한다.
// AI가 보낸 값은 그대로 믿지 않고 형식을 확인한 뒤 저장하고, 결과를 한 줄씩 돌려준다(채팅에 표시).
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime());
const isTime = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const text = (v) => (typeof v === "string" ? v.trim().slice(0, 100) : "");
const won = (n) => `${n.toLocaleString("ko-KR")}원`;

function run(dog, a) {
  switch (a.type) {
    case "add_expense": {
      const amount = Math.round(Number(a.amount));
      if (!text(a.title) || !(amount > 0) || !isDate(a.date)) return null;
      const categories = getCategories();
      const cat = categories.find((c) => c.name === a.category) || categories[0];
      addExpense(dog.id, { title: text(a.title), amount, date: a.date, categoryId: cat?.id });
      return `💰 가계부: ${a.date} ${text(a.title)} ${won(amount)} (${cat?.emoji ?? ""}${cat?.name ?? "기타"})`;
    }
    case "set_allowance": {
      const amount = Math.round(Number(a.amount));
      if (!/^\d{4}-\d{2}$/.test(a.month) || !(amount > 0)) return null;
      setAllowance(dog.id, a.month, amount);
      return `💰 ${a.month} 용돈: ${won(amount)}`;
    }
    case "add_calendar_event": {
      if (!isDate(a.date) || !text(a.title)) return null;
      addEvent(dog.id, a.date, text(a.title));
      return `🗓️ 일정표: ${a.date} ${text(a.title)}`;
    }
    case "add_weight_record": {
      const kg = Number(a.weight_kg);
      if (!(kg > 0 && kg < 150) || !isDate(a.date)) return null;
      const time = isTime(a.time) ? a.time : a.date === todayKey() ? new Date().toTimeString().slice(0, 5) : "12:00";
      addWeightRecord(dog.id, { weightKg: kg, measuredAt: `${a.date}T${time}:00`, note: "채팅으로 기록" });
      // 프로필 체중은 가장 최근 기록과 같게
      const latest = getLatestWeightRecord(dog.id);
      if (latest && latest.weightKg !== dog.weight) saveDog({ ...dog, weight: latest.weightKg });
      return `⚖️ 체중 관리: ${a.date} ${kg}kg`;
    }
    case "set_checklist_done": {
      const today = todayKey();
      getTodayChecklist(dog); // 오늘 목록이 아직 없으면 만들어 둔다
      const item = (getScheduleForDate(dog.id, today) || []).find((it) => it.title === a.title || it.title.includes(text(a.title)) || text(a.title).includes(it.title));
      if (!item) return null;
      if (Boolean(item.completed) !== Boolean(a.done)) toggleScheduleItem(dog.id, today, item.id);
      return `✅ 체크리스트: ${item.title} ${a.done ? "완료" : "완료 취소"}`;
    }
    case "add_alarm": {
      if (!text(a.title) || !isTime(a.time)) return null;
      addCustomSchedule(dog.id, { title: text(a.title), time: a.time, sound: ALARM_SOUND_LIST[0].id });
      syncPushAlarms();
      return `⏰ 알람: 매일 ${a.time} ${text(a.title)}`;
    }
    default:
      return null;
  }
}

// 반환: { done: ["저장한 내용", ...], failed: 개수 }
export function applyAppActions(dog, actions) {
  const done = [];
  let failed = 0;
  for (const a of actions || []) {
    try {
      const result = run(dog, a);
      if (result) done.push(result);
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { done, failed };
}
