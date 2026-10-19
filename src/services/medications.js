import { readJSON, writeJSON } from "./storage";
import { addDays, toDateKey, todayKey, pad2 } from "../utils/date";

// 약 관리 — 약(처방) 목록과 복용 기록을 강아지별로 따로 저장한다.
// 약은 "처방 묶음(seriesId)" 단위로 이어진다: 이미 먹기 시작한 약의 용량·시간·요일을 바꾸면 기존 약은 어제로 끝내고
// 오늘부터 새 버전을 만든다 — 지난 날짜 기록은 그때 처방 그대로 남는다.
// 복용 기록은 `seriesId|날짜|예정시각` 하나에 하나만 있어서(같은 복용 건 중복 불가), 같은 시각이면 버전이 바뀌어도 이어진다.
// 기록은 사용자가 직접 누른 것만 남긴다 — 알림을 봤거나 시간이 지났다고 "먹음"으로 추정하지 않는다.
const MEDS_KEY = "dogcare-meds-v1";
const LOG_KEY = "dogcare-med-log-v1";
const CHECK_AFTER_MIN = 60; // 예정 시각에서 이만큼 지나도 기록이 없으면 "기록 확인 필요"
const LOW_STOCK_DAYS = 3;

// Med = { id, seriesId, name, photo?, purpose?, dose("1알"·"0.5ml" 등 처방 그대로), times["HH:MM"], startDate, endDate?,
//         days[0~6](빈 배열이면 매일), stock?{ base, perDose, setAt }, remind, createdAt, updatedAt }
// DoseRecord = { key, medId, seriesId, date, time, name, dose, status("done"|"skipped"|"none"), doneAt?(실제 먹인 로컬 시각), units,
//               countedAt(수량 계산용), markedAt(마지막으로 누른 시각), edits[{ at, note }] }
const newId = (p) => `${p}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const localNow = () => {
  const d = new Date();
  return `${toDateKey(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
};
const readAll = (key) => readJSON(key, {});

export function getMeds(dogId) {
  return readAll(MEDS_KEY)[dogId] || [];
}

function saveMeds(dogId, list) {
  const all = readAll(MEDS_KEY);
  all[dogId] = list;
  if (!writeJSON(MEDS_KEY, all)) throw new Error("저장 공간이 부족해요. 약 사진을 빼고 다시 저장해 보세요.");
}

function getLog(dogId) {
  return readAll(LOG_KEY)[dogId] || {};
}

// 보호자가 실제로 먹임/건너뜀을 누른 복용 기록(통합 기록 타임라인용) — "기록 없음"으로 되돌린 건 빼고
export function getDoseRecords(dogId) {
  return Object.values(getLog(dogId)).filter((r) => r.status === "done" || r.status === "skipped");
}

function saveLog(dogId, log) {
  const all = readAll(LOG_KEY);
  all[dogId] = log;
  if (!writeJSON(LOG_KEY, all)) throw new Error("기록을 저장하지 못했어요.");
}

export const isEnded = (med, today = todayKey()) => Boolean(med.endDate && med.endDate < today);

export function isScheduledOn(med, dateKey) {
  if (dateKey < med.startDate || (med.endDate && dateKey > med.endDate)) return false;
  return !med.days?.length || med.days.includes(new Date(`${dateKey}T00:00:00`).getDay());
}

export const doseKey = (seriesId, dateKey, time) => `${seriesId}|${dateKey}|${time}`;

// 입력값 확인 — 잘못된 값이면 오류 문구, 괜찮으면 null
export function validateMed(m) {
  if (!m.name?.trim()) return "약 이름을 적어 주세요.";
  if (!m.dose?.trim()) return "1회 용량을 처방전에 적힌 대로 적어 주세요. (예: 1알, 0.5ml)";
  if (!m.times?.length || m.times.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) return "복용 시간을 모두 정해 주세요.";
  if (new Set(m.times).size !== m.times.length) return "같은 복용 시간이 두 번 들어가 있어요.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.startDate || "")) return "시작일을 정해 주세요.";
  if (m.endDate && m.endDate < m.startDate) return "종료일이 시작일보다 빨라요.";
  if (m.stock) {
    if (!(m.stock.base >= 0)) return "보유 수량을 숫자로 적어 주세요.";
    if (!(m.stock.perDose > 0)) return "보유 수량을 계산하려면 1회에 쓰는 개수를 적어 주세요.";
  }
  return null;
}

const clean = (m) => ({
  name: m.name.trim().slice(0, 40),
  dose: m.dose.trim().slice(0, 30),
  purpose: (m.purpose || "").trim().slice(0, 200),
  photo: m.photo || "",
  times: [...m.times].sort(),
  startDate: m.startDate,
  endDate: m.endDate || "",
  days: [...(m.days || [])].sort(),
  stock: m.stock || null,
  remind: m.remind !== false,
});

export function addMed(dogId, input) {
  const err = validateMed(input);
  if (err) throw new Error(err);
  const now = new Date().toISOString();
  const id = newId("med");
  const med = { id, seriesId: id, ...clean(input), createdAt: now, updatedAt: now };
  saveMeds(dogId, [...getMeds(dogId), med]);
  return med;
}

// 처방(용량·시간·요일)이 바뀌고 이미 먹기 시작한 약이면 새 버전으로 나눈다. 이름·메모·사진·수량·알림만 바뀌면 그대로 고친다.
export function updateMed(dogId, id, input) {
  const err = validateMed(input);
  if (err) throw new Error(err);
  const list = getMeds(dogId);
  const old = list.find((m) => m.id === id);
  if (!old) throw new Error("약을 찾지 못했어요.");
  const next = clean(input);
  const today = todayKey();
  const now = new Date().toISOString();
  const prescriptionChanged =
    next.dose !== old.dose || next.times.join() !== old.times.join() || next.days.join() !== (old.days || []).join();
  if (prescriptionChanged && old.startDate < today) {
    const yesterday = toDateKey(addDays(new Date(`${today}T00:00:00`), -1));
    const newMed = { id: newId("med"), seriesId: old.seriesId, ...next, startDate: today, createdAt: now, updatedAt: now, previousId: old.id };
    saveMeds(dogId, [...list.map((m) => (m.id === id ? { ...m, endDate: yesterday, updatedAt: now } : m)), newMed]);
    return newMed;
  }
  const updated = { ...old, ...next, updatedAt: now };
  saveMeds(dogId, list.map((m) => (m.id === id ? updated : m)));
  return updated;
}

// 복용 중단 — 기록은 그대로 두고 활성 목록에서만 빠진다. 오늘 이미 기록한 게 있으면 오늘까지, 아니면 어제까지.
export function stopMed(dogId, id) {
  const today = todayKey();
  const med = getMeds(dogId).find((m) => m.id === id);
  if (!med) return;
  const hasToday = Object.values(getLog(dogId)).some((r) => r.seriesId === med.seriesId && r.date === today && r.status !== "none");
  const end = hasToday || med.startDate >= today ? today : toDateKey(addDays(new Date(`${today}T00:00:00`), -1));
  saveMeds(dogId, getMeds(dogId).map((m) => (m.id === id ? { ...m, endDate: end, updatedAt: new Date().toISOString() } : m)));
}

// 완전히 지우기 — 이 처방 묶음의 모든 버전과 복용 기록까지 지운다(잘못 등록한 약용).
export function deleteMedSeries(dogId, seriesId) {
  saveMeds(dogId, getMeds(dogId).filter((m) => m.seriesId !== seriesId));
  const log = getLog(dogId);
  for (const k of Object.keys(log)) if (log[k].seriesId === seriesId) delete log[k];
  saveLog(dogId, log);
}

// 그날 먹을 약 목록(시간순). status: planned(복용 예정) / done / skipped / check(기록 확인 필요)
export function getDosesForDate(dogId, dateKey, now = new Date()) {
  const log = getLog(dogId);
  const today = toDateKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const doses = [];
  for (const med of getMeds(dogId)) {
    if (!isScheduledOn(med, dateKey)) continue;
    for (const time of med.times) {
      const key = doseKey(med.seriesId, dateKey, time);
      const rec = log[key];
      let status = rec && rec.status !== "none" ? rec.status : "planned";
      if (status === "planned") {
        const [h, m] = time.split(":").map(Number);
        if (dateKey < today || (dateKey === today && nowMin > h * 60 + m + CHECK_AFTER_MIN)) status = "check";
      }
      doses.push({ key, med, time, date: dateKey, status, record: rec || null });
    }
  }
  return doses.sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name));
}

function writeRecord(dogId, dose, patch, editNote) {
  const log = getLog(dogId);
  const prev = log[dose.key];
  const at = localNow();
  log[dose.key] = {
    key: dose.key,
    medId: dose.med.id,
    seriesId: dose.med.seriesId,
    date: dose.date,
    time: dose.time,
    name: dose.med.name,
    dose: dose.med.dose,
    units: dose.med.stock?.perDose || 0,
    ...prev,
    ...patch,
    markedAt: at,
    edits: [...(prev?.edits || []), ...(prev || editNote ? [{ at, note: editNote || patch.status }] : [])],
  };
  saveLog(dogId, log);
  return log[dose.key];
}

// 한 번 탭으로 "먹였어요" — 지금 시각을 실제 복용 시각으로 저장한다. 이미 완료면 그대로(두 번 눌러도 한 번만 기록).
export function markDoseDone(dogId, dose, doneAt = localNow()) {
  if (dose.record?.status === "done") return dose.record;
  const patch = { status: "done", doneAt, units: dose.med.stock?.perDose || 0, countedAt: new Date().toISOString() };
  return writeRecord(dogId, dose, patch, dose.record ? `완료 (${doneAt.slice(11, 16)})` : null);
}

export function markDoseSkipped(dogId, dose) {
  if (dose.record?.status === "skipped") return dose.record;
  return writeRecord(dogId, dose, { status: "skipped", doneAt: null }, dose.record ? "건너뜀" : null);
}

// 실수로 누른 기록 되돌리기 — 기록을 지우지 않고 "기록 없음"으로 바꾸고 수정 내역에 남긴다.
export function undoDose(dogId, dose) {
  if (!dose.record || dose.record.status === "none") return null;
  return writeRecord(dogId, dose, { status: "none", doneAt: null }, `${dose.record.status === "done" ? "완료" : "건너뜀"} 취소`);
}

// 실제로 먹인 시각 고치기
export function editDoneTime(dogId, dose, hhmm) {
  if (dose.record?.status !== "done" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return null;
  const before = dose.record.doneAt?.slice(11, 16);
  if (before === hhmm) return dose.record;
  return writeRecord(dogId, dose, { doneAt: `${dose.date}T${hhmm}:00` }, `먹인 시각 ${before} → ${hhmm}`);
}

// 남은 수량 = 보유 수량을 적은 뒤 "먹였어요"로 기록된 개수만큼만 뺀다(기록 기준, 추정 없음).
export function getStockInfo(dogId, med) {
  if (!med.stock) return null;
  const used = Object.values(getLog(dogId))
    .filter((r) => r.seriesId === med.seriesId && r.status === "done" && r.countedAt >= med.stock.setAt)
    .reduce((s, r) => s + (r.units || 0), 0);
  const remaining = Math.max(0, Math.round((med.stock.base - used) * 100) / 100);
  const perWeek = med.stock.perDose * med.times.length * (med.days?.length || 7);
  const daysLeft = perWeek > 0 ? Math.floor((remaining / perWeek) * 7) : null;
  const today = todayKey();
  const endsFirst = med.endDate && daysLeft != null && med.endDate <= toDateKey(addDays(new Date(`${today}T00:00:00`), daysLeft));
  return { remaining, daysLeft, low: !isEnded(med) && !endsFirst && daysLeft != null && daysLeft <= LOW_STOCK_DAYS };
}

export const stockNow = (base, perDose) => ({ base: Number(base), perDose: Number(perDose), setAt: new Date().toISOString() });

// 알림 문구 — 놓친 약을 더 먹이라는 말은 하지 않는다.
export const medMessage = (dog, med) => ({ title: `💊 ${dog.name} 약 시간`, body: `${med.name} ${med.dose} 먹일 시간이에요. 먹였으면 앱에서 [먹였어요]를 눌러 주세요.` });
export const medUrl = (dogId, key) => `/?dog=${encodeURIComponent(dogId)}&dose=${encodeURIComponent(key)}`;
