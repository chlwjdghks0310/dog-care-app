import { addExpense, deleteExpense, getCategories, getExpenses, setAllowance, updateExpense, findCategoryByName, isMedical, VET_ITEMS, saveFixedExpense, deleteFixedExpense, getFixedExpenses, applyFixedExpenses, addCategory, CATEGORY_CHOICES } from "./expenses";
import { linkVetExpense } from "./vetVisits";
import { saveFeedingSettings } from "./feedingSettings";
import { removeEvent, saveEvent, getEventsByDog, EVENT_KINDS } from "./calendarEvents";
import { addWeightRecord, deleteWeightRecord, getLatestWeightRecord, getWeightRecords, updateWeightRecord } from "./weightLog";
import { saveDog } from "./dogRepository";
import { getScheduleForDate, toggleScheduleItem } from "./scheduleRepository";
import { getTodayChecklist } from "./careEngine";
import { addCustomSchedule, deleteCustomSchedule, getCustomSchedules, updateCustomSchedule } from "./customSchedules";
import { syncPushAlarms } from "./notifications";
import { todayKey, nowLabel } from "../utils/date";
import { getDosesForDate, markDoseDone, markDoseSkipped, undoDose, editDoneTime } from "./medications";
import { getRecords, saveRecord, deleteRecord, newRecordId, validateRecord, summarize, syncSchedule, TYPES, SYMPTOM_KINDS, REPEAT, STOOL, URINE, DAILY_KINDS, LIFE_KINDS, LEVELS } from "./records";
import { VITAL, fmtValue } from "../data/vitals";

// 채팅 AI가 "기록해 달라"는 요청을 받아 보낸 동작(actions)을 실제로 앱에 저장한다.
// AI가 보낸 값은 그대로 믿지 않고 형식을 확인한 뒤 저장하고, 결과를 한 줄씩 돌려준다(채팅에 표시).
const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime());
const isTime = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const text = (v) => (typeof v === "string" ? v.trim().slice(0, 100) : "");
const won = (n) => `${n.toLocaleString("ko-KR")}원`;
const oneOf = (list, v) => (list.includes(v) ? v : "");
// 지출의 병원비 항목·보험 청구(병원·예방 분류일 때만)
function claimFields(a, categoryId) {
  if (!isMedical(categoryId)) return {};
  const out = {};
  const items = Array.isArray(a.items) ? a.items.filter((x) => VET_ITEMS.includes(x)) : [];
  if (items.length) out.items = items;
  if (["todo", "sent", "paid"].includes(a.claim)) out.claim = a.claim;
  if (out.claim === "paid" && Number(a.claim_paid) > 0) out.claimPaid = Math.round(Number(a.claim_paid));
  return out;
}
const timeFor = (a) => (isTime(a.time) ? a.time : a.date === todayKey() ? new Date().toTimeString().slice(0, 5) : "12:00");

function run(dog, a) {
  switch (a.type) {
    case "add_expense": {
      const amount = Math.round(Number(a.amount));
      if (!text(a.title) || !(amount > 0) || !isDate(a.date)) return null;
      const cat = findCategoryByName(a.category);
      if (!cat) return { ask: { type: "expense_category", title: text(a.title), amount, date: a.date, memo: text(a.memo), extra: { items: a.items, claim: a.claim, claim_paid: a.claim_paid } } }; // 분류가 없거나 "모름" → 보호자에게 묻기
      addExpense(dog.id, { title: text(a.title), amount, date: a.date, categoryId: cat.id, memo: text(a.memo), ...claimFields(a, cat.id) });
      return `💰 가계부: ${a.date} ${text(a.title)} ${won(amount)} (${cat.name})`;
    }
    case "add_fixed_expense": {
      const amount = Math.round(Number(a.amount));
      const day = Math.round(Number(a.day));
      if (!text(a.title) || !(amount > 0) || !(day >= 1 && day <= 31)) return null;
      const cat = findCategoryByName(a.category);
      if (!cat) return { ask: { type: "expense_category", fixed: true, title: text(a.title), amount, day, memo: text(a.memo) } };
      saveFixedExpense(dog.id, { title: text(a.title), amount, categoryId: cat.id, day, memo: text(a.memo) }, todayKey());
      applyFixedExpenses(dog.id, todayKey());
      return `💰 매달 나가는 돈: 매달 ${day}일 ${text(a.title)} ${won(amount)} (${cat.name}) — 그날마다 가계부에 저절로 기록돼요`;
    }
    case "add_expense_category": {
      const name = text(a.name).slice(0, 20);
      if (!name) return null;
      if (findCategoryByName(name)) return `💰 가계부 분류 "${name}"은 이미 있어요`;
      const [ico, emoji] = CATEGORY_CHOICES.find(([, e]) => e === "📦");
      addCategory(name, emoji, ico);
      return `💰 가계부 분류 추가: ${name} (아이콘은 분류 관리에서 바꿀 수 있어요)`;
    }
    case "set_feeding_times": {
      const times = [...new Set((Array.isArray(a.times) ? a.times : []).filter(isTime))].sort();
      if (!times.length) return null;
      saveFeedingSettings(dog.id, { times });
      syncPushAlarms();
      return `🍚 급여 시각: ${times.join(", ")}`;
    }
    case "add_health_record": {
      const t = a.record_type;
      if (!isDate(a.date) || !TYPES[t] || ["weight", "vital", "med", "media"].includes(t)) return null;
      const d = {};
      const put = (k, v) => v && (Array.isArray(v) ? v.length : true) && (d[k] = v);
      if (t === "symptom") {
        put("kinds", (Array.isArray(a.symptoms) ? a.symptoms : []).filter((x) => SYMPTOM_KINDS.includes(x)));
        put("repeat", oneOf(REPEAT, a.repeat));
        put("since", isDate(a.since) ? a.since : "");
        put("observed", text(a.observed));
      } else if (t === "meal") {
        put("appetite", oneOf(LEVELS, a.appetite));
        put("water", oneOf(LEVELS, a.water));
        put("food", text(a.food));
        put("amount", text(a.amount));
        put("treats", text(a.treats));
      } else if (t === "potty") {
        put("stool", oneOf(STOOL, a.stool));
        put("urine", oneOf(URINE, a.urine));
      } else if (t === "vet") {
        for (const k of ["hospital", "reason", "explanation", "tests", "prescription"]) put(k, text(a[k]));
        put("cost", Number(a.cost) > 0 ? String(Math.round(Number(a.cost))) : "");
        put("nextDate", isDate(a.next_date) && a.next_date >= todayKey() ? a.next_date : "");
      } else if (t === "condition") {
        put("activity", oneOf(LEVELS, a.activity));
        put("sleep", oneOf(LEVELS, a.sleep));
        put("body", text(a.body));
        put("oral", text(a.oral));
      } else if (t === "daily") {
        put("kind", oneOf(DAILY_KINDS, a.daily_kind));
        put("minutes", Number(a.minutes) > 0 ? String(Math.round(Number(a.minutes))) : "");
      } else if (t === "life") {
        put("kind", oneOf(LIFE_KINDS, a.life_kind));
        put("title", text(a.title));
        put("nextDate", d.kind === "예방접종" && isDate(a.next_date) && a.next_date >= todayKey() ? a.next_date : "");
      }
      let rec = { id: newRecordId(), type: t, at: `${a.date}T${timeFor(a)}`, data: d, memo: text(a.memo), photos: [] };
      if (validateRecord(rec)) return null;
      rec = saveRecord(dog.id, rec);
      // 화면에서 적을 때와 같게: 다음 진료·접종일은 일정표에, 진료비는 가계부에
      if (d.nextDate) {
        const title = t === "vet" ? `🏥 ${d.hospital ? `${d.hospital} ` : ""}진료 (${d.reason})` : `💉 예방접종${d.title ? ` (${d.title})` : ""}`;
        rec = saveRecord(dog.id, { ...rec, links: syncSchedule(dog.id, rec, { title, date: d.nextDate, alarm: false, kind: t === "vet" ? "vet" : "vaccine" }) });
      }
      if (t === "vet" && d.cost) rec = saveRecord(dog.id, { ...rec, expenseId: linkVetExpense(dog.id, rec) });
      return `${TYPES[t].icon} ${TYPES[t].label}: ${a.date} ${summarize(rec)}${d.cost ? " · 가계부에도 기록" : ""}${d.nextDate ? " · 일정표에 다음 날짜" : ""}`;
    }
    case "set_allowance": {
      const amount = Math.round(Number(a.amount));
      if (!/^\d{4}-\d{2}$/.test(a.month) || !(amount > 0)) return null;
      setAllowance(dog.id, a.month, amount);
      return `💰 ${a.month} 용돈: ${won(amount)}`;
    }
    case "add_calendar_event": {
      if (!isDate(a.date) || !text(a.title)) return null;
      const kind = EVENT_KINDS.find((k) => k.id === a.kind) || EVENT_KINDS.find((k) => k.id === "etc");
      const time = isTime(a.time) ? a.time : "";
      const endDate = isDate(a.end_date) && a.end_date > a.date ? a.end_date : "";
      const repeat = !endDate && ["weekly", "monthly", "yearly"].includes(a.repeat) ? a.repeat : "";
      const alarm = ["morning", "eve"].includes(a.alarm) || (a.alarm === "before1h" && time) ? a.alarm : "";
      saveEvent(dog.id, a.date, { title: text(a.title), kind: kind.id, color: kind.color, time, endDate, repeat, memo: text(a.memo), alarm });
      if (alarm) syncPushAlarms();
      const rep = { weekly: "매주", monthly: "매달", yearly: "매년" }[repeat];
      return `🗓️ 일정표: ${a.date}${endDate ? `~${endDate}` : ""}${time ? ` ${time}` : ""} ${text(a.title)} (${kind.icon} ${kind.label})${rep ? ` · ${rep} 반복` : ""}${alarm ? " · 알림" : ""}`;
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
      if (!text(a.title) || !isTime(a.time) || (a.date && !isDate(a.date))) return null;
      addCustomSchedule(dog.id, { title: text(a.title), time: a.time, date: a.date });
      syncPushAlarms();
      return `⏰ 알람: ${a.date ? `${a.date} 하루만` : "매일"} ${a.time} ${text(a.title)}`;
    }
    case "add_health_value": {
      const def = VITAL[a.metric];
      if (!def || def.external || !isDate(a.date)) return null;
      const now = new Date().toTimeString().slice(0, 5);
      const time = isTime(a.time) ? a.time : a.date === todayKey() ? now : "12:00";
      const rec = { id: newRecordId(), type: "vital", at: `${a.date}T${time}`, data: { metric: a.metric, value: Number(a.value) }, memo: text(a.memo), photos: [] };
      if (validateRecord(rec)) return null; // 범위 밖·미래 시각 등은 저장하지 않음
      saveRecord(dog.id, rec);
      return `${def.icon} 건강 수치: ${a.date} ${time} ${def.label} ${fmtValue(a.metric, rec.data.value)}${def.unit}`;
    }
    case "mark_med_dose": {
      // 기록할 수 있는 건 앱에 있는 복용 건뿐 — AI가 보낸 값은 [복용:...] 목록에서 다시 찾는다
      const date = String(a.dose || "").split("|")[1];
      const dose = isDate(date) && getDosesForDate(dog.id, date).find((d) => d.key === a.dose);
      if (!dose || date > todayKey()) return null;
      const label = `${date === todayKey() ? "오늘" : date} ${dose.time} ${dose.med.name} ${dose.med.dose}`;
      if (a.status === "undo") return undoDose(dog.id, dose) ? `💊 약 기록 취소: ${label}` : null;
      if (a.status === "skipped") {
        markDoseSkipped(dog.id, dose);
        syncPushAlarms();
        return `💊 약: ${label} 건너뜀`;
      }
      if (a.status !== "done") return null;
      const time = isTime(a.time) ? a.time : nowLabel();
      if (date === todayKey() && time > nowLabel()) return null; // 아직 오지 않은 시각에 먹였다고 기록하지 않는다
      if (dose.record?.status === "done") {
        if (isTime(a.time)) editDoneTime(dog.id, dose, a.time); // 시각을 말했을 때만 고친다
        return `💊 약: ${label} — 이미 먹인 걸로 기록돼 있어요(먹인 시각 ${isTime(a.time) ? a.time : dose.record.doneAt.slice(11, 16)})`;
      }
      markDoseDone(dog.id, dose, `${date}T${time}:00`);
      syncPushAlarms();
      return `💊 약: ${label} 먹임 (${time})`;
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
  if (kind === "fixed_expense") return getFixedExpenses(dog.id).find((f) => f.id === id);
  if (kind === "weight") return getWeightRecords(dog.id).find((r) => r.id === id);
  if (kind === "alarm") return getCustomSchedules(dog.id).find((a) => a.id === id);
  if (kind === "health_record") return getRecords(dog.id).find((r) => r.id === id);
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
    if (a.kind === "fixed_expense") deleteFixedExpense(dog.id, a.id); // 이미 기록된 지출은 남김
    if (a.kind === "calendar_event") removeEvent(dog.id, rec.date, a.id);
    if (a.kind === "weight") {
      deleteWeightRecord(dog.id, a.id);
      syncDogWeight(dog);
    }
    if (a.kind === "alarm") {
      deleteCustomSchedule(dog.id, a.id);
      syncPushAlarms();
    }
    if (a.kind === "health_record") {
      deleteRecord(dog.id, a.id); // 이 기록으로 만든 일정·알림도 같이 지워짐
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
      const cat = findCategoryByName(a.category);
      if (cat) patch.categoryId = cat.id;
      if (typeof a.memo === "string") patch.memo = text(a.memo);
      const catId = patch.categoryId || rec.categoryId;
      if (a.claim === "none") Object.assign(patch, { claim: "", claimPaid: null });
      else Object.assign(patch, claimFields({ ...a, items: a.items ?? rec.items, claim: a.claim ?? rec.claim, claim_paid: a.claim_paid ?? rec.claimPaid }, catId));
      if (!Object.keys(patch).length) return null;
      updateExpense(dog.id, a.id, patch);
    } else if (a.kind === "fixed_expense") {
      const patch = { id: a.id };
      if (text(a.title)) patch.title = text(a.title);
      if (Number(a.amount) > 0) patch.amount = Math.round(Number(a.amount));
      if (Number(a.day) >= 1 && Number(a.day) <= 31) patch.day = Math.round(Number(a.day));
      const cat = findCategoryByName(a.category);
      if (cat) patch.categoryId = cat.id;
      if (typeof a.memo === "string") patch.memo = text(a.memo);
      if (Object.keys(patch).length === 1) return null;
      saveFixedExpense(dog.id, patch, todayKey());
    } else if (a.kind === "calendar_event") {
      const title = text(a.title) || rec.title;
      const date = isDate(a.date) ? a.date : rec.date;
      const { date: _old, ...event } = rec; // eslint-disable-line no-unused-vars
      const kind = EVENT_KINDS.find((k) => k.id === a.event_kind);
      // 바꾸라고 한 것(제목·날짜·종류·시각)만 바꾸고 반복·알림은 그대로
      saveEvent(dog.id, date, { ...event, title, ...(kind && { kind: kind.id, color: kind.color }), ...(isTime(a.time) && { time: a.time }), ...(typeof a.memo === "string" && { memo: text(a.memo) }) });
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
    } else if (a.kind === "health_record") {
      const next = { ...rec, data: { ...rec.data } };
      if (rec.type === "vital" && a.value != null && Number.isFinite(Number(a.value))) next.data.value = Number(a.value);
      if (typeof a.memo === "string") next.memo = text(a.memo);
      if (isDate(a.date) || isTime(a.time)) next.at = `${isDate(a.date) ? a.date : rec.at.slice(0, 10)}T${isTime(a.time) ? a.time : rec.at.slice(11, 16)}`;
      if (JSON.stringify(next) === JSON.stringify(rec) || validateRecord(next)) return null;
      saveRecord(dog.id, next);
      return `✏️ 고쳤어요: ${summarize(next)}`;
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
  const ask = []; // 보호자에게 물을 것(가계부 분류 고르기)
  let failed = 0;
  for (const a of actions || []) {
    if (a.type === "update_record" || a.type === "delete_record") {
      if (findRecord(dog, a.kind, a.id)) confirm.push({ ...a, summary: text(a.summary) || "기록" });
      else failed += 1;
      continue;
    }
    try {
      const result = run(dog, a);
      if (result?.ask) ask.push(result.ask);
      else if (result) done.push(result);
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
  return { done, failed, confirm, ask };
}

// 채팅에서 분류를 물은 지출: 보호자가 고른 분류로 저장
export function saveAskedExpense(dog, a, categoryId) {
  const cat = getCategories().find((c) => c.id === categoryId);
  if (!cat) return null;
  if (a.fixed) {
    saveFixedExpense(dog.id, { title: a.title, amount: a.amount, categoryId, day: a.day, memo: a.memo }, todayKey());
    applyFixedExpenses(dog.id, todayKey());
    return `💰 매달 나가는 돈: 매달 ${a.day}일 ${a.title} ${won(a.amount)} (${cat.name})`;
  }
  addExpense(dog.id, { title: a.title, amount: a.amount, date: a.date, categoryId, memo: a.memo, ...claimFields(a.extra || {}, categoryId) });
  return `💰 가계부: ${a.date} ${a.title} ${won(a.amount)} (${cat.name})`;
}
