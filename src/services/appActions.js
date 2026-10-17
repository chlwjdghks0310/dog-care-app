import { addExpense, deleteExpense, getCategories, getExpenses, setAllowance, updateExpense } from "./expenses";
import { addEvent, deleteEvent, getEventsByDog } from "./calendarEvents";
import { addWeightRecord, deleteWeightRecord, getLatestWeightRecord, getWeightRecords, updateWeightRecord } from "./weightLog";
import { saveDog } from "./dogRepository";
import { getScheduleForDate, toggleScheduleItem } from "./scheduleRepository";
import { getTodayChecklist } from "./careEngine";
import { addCustomSchedule, deleteCustomSchedule, getCustomSchedules, updateCustomSchedule } from "./customSchedules";
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
      syncDogWeight(dog);
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

// 프로필 체중은 체중 관리의 가장 최근 기록과 같게
function syncDogWeight(dog) {
  const latest = getLatestWeightRecord(dog.id);
  const weight = latest ? latest.weightKg : dog.weight;
  if (weight !== dog.weight) saveDog({ ...dog, weight });
}

// 고치기·지우기는 보호자가 채팅의 [확인] 버튼을 눌렀을 때만 실행한다. 대상 기록이 지금도 있는지 다시 찾는다.
function findRecord(dog, kind, id) {
  if (kind === "expense") return getExpenses(dog.id).find((e) => e.id === id);
  if (kind === "weight") return getWeightRecords(dog.id).find((r) => r.id === id);
  if (kind === "alarm") return getCustomSchedules(dog.id).find((a) => a.id === id);
  if (kind === "calendar_event") {
    for (const [date, list] of Object.entries(getEventsByDog(dog.id))) {
      const e = list.find((x) => x.id === id);
      if (e) return { ...e, date };
    }
  }
  return null;
}

// 반환: 성공 문구 또는 null(기록이 없거나 값이 잘못됨)
export function applyConfirmedAction(dog, a) {
  const rec = findRecord(dog, a.kind, a.id);
  if (!rec) return null;
  if (a.type === "delete_record") {
    if (a.kind === "expense") deleteExpense(dog.id, a.id);
    if (a.kind === "calendar_event") deleteEvent(dog.id, rec.date, a.id);
    if (a.kind === "weight") {
      deleteWeightRecord(dog.id, a.id);
      syncDogWeight(dog);
    }
    if (a.kind === "alarm") {
      deleteCustomSchedule(dog.id, a.id);
      syncPushAlarms();
    }
    return `🗑️ 지웠어요: ${text(a.summary)}`;
  }
  if (a.type === "update_record") {
    if (a.kind === "expense") {
      const patch = {};
      if (text(a.title)) patch.title = text(a.title);
      if (Number(a.amount) > 0) patch.amount = Math.round(Number(a.amount));
      if (isDate(a.date)) patch.date = a.date;
      const cat = getCategories().find((c) => c.name === a.category);
      if (cat) patch.categoryId = cat.id;
      if (!Object.keys(patch).length) return null;
      updateExpense(dog.id, a.id, patch);
    } else if (a.kind === "calendar_event") {
      const title = text(a.title) || rec.title;
      const date = isDate(a.date) ? a.date : rec.date;
      deleteEvent(dog.id, rec.date, a.id);
      addEvent(dog.id, date, title, rec.color);
    } else if (a.kind === "weight") {
      const patch = {};
      const kg = Number(a.weight_kg);
      if (kg > 0 && kg < 150) patch.weightKg = kg;
      if (isDate(a.date) || isTime(a.time)) {
        const [d, t] = rec.measuredAt.split("T");
        patch.measuredAt = `${isDate(a.date) ? a.date : d}T${isTime(a.time) ? `${a.time}:00` : t}`;
      }
      if (!Object.keys(patch).length) return null;
      updateWeightRecord(dog.id, a.id, patch);
      syncDogWeight(dog);
    } else if (a.kind === "alarm") {
      const patch = {};
      if (text(a.title)) patch.title = text(a.title);
      if (isTime(a.time)) patch.time = a.time;
      if (!Object.keys(patch).length) return null;
      updateCustomSchedule(dog.id, a.id, patch);
      syncPushAlarms();
    }
    return `✏️ 고쳤어요: ${text(a.summary)}`;
  }
  return null;
}

// 반환: { done: ["저장한 내용", ...], failed: 개수, confirm: [고치기·지우기 요청 — 버튼으로 확인] }
export function applyAppActions(dog, actions) {
  const done = [];
  const confirm = [];
  let failed = 0;
  for (const a of actions || []) {
    if (a.type === "update_record" || a.type === "delete_record") {
      if (findRecord(dog, a.kind, a.id)) confirm.push({ ...a, summary: text(a.summary) || "기록" });
      else failed += 1;
      continue;
    }
    try {
      const result = run(dog, a);
      if (result) done.push(result);
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { done, failed, confirm };
}
