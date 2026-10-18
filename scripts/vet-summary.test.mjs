// 병원용 기록 정리 확인: npm test
import assert from "node:assert/strict";

const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
globalThis.window = globalThis;
const M = await import("../src/services/medications.js");
const { addWeightRecord } = await import("../src/services/weightLog.js");
const { addExpense } = await import("../src/services/expenses.js");
const { addEvent } = await import("../src/services/calendarEvents.js");
const { rememberChat } = await import("../src/services/chatMemory.js");
const V = await import("../src/services/vetSummary.js");
const { toDateKey, addDays } = await import("../src/utils/date.js");

const { todayKey } = await import("../src/utils/date.js");
const today = todayKey(); // 복용 상태는 실제 지금 시각 기준이라 오늘 날짜로
const day = (n) => toDateKey(addDays(new Date(`${today}T00:00:00`), n));
const dog = { id: "d1", name: "콩이", breed: "포메라니안", gender: "male", neutered: true, birthDate: "2015-03-01", allergies: "닭고기" };

const med = M.addMed(dog.id, { name: "심장약", dose: "1알", times: ["08:00", "20:00"], startDate: day(-3), purpose: "심장 질환" });
const d1 = M.getDosesForDate(dog.id, day(-1));
M.markDoseDone(dog.id, d1[0], `${day(-1)}T08:05:00`);
M.markDoseSkipped(dog.id, d1[1]);
addWeightRecord(dog.id, { weightKg: 4, measuredAt: `${day(-40)}T09:00:00` });
addWeightRecord(dog.id, { weightKg: 3.6, measuredAt: `${day(-2)}T09:00:00` });
addExpense(dog.id, { title: "심장 초음파", amount: 150000, date: day(-5), categoryId: "medical" });
addExpense(dog.id, { title: "간식", amount: 5000, date: day(-5), categoryId: "snack" });
addEvent(dog.id, day(3), "병원 재진");
addEvent(dog.id, day(-1), "미용");
rememberChat(dog.id, "요즘 밤에 기침을 해", "답");

const note = { ...V.getVetNote(dog.id), symptoms: ["기침", "식욕 줄었음"], since: day(-4), text: "밤에 3~4번 기침" };
const s = V.buildVetSummary(dog, { ...note, sections: { ...note.sections, chat: true } }, today);
const get = (k) => s.find((x) => x.key === k).lines.join("\n");

assert.match(get("note"), /기침, 식욕 줄었음/);
assert.match(get("note"), /4일째/);
assert.match(get("basic"), /수컷\(중성화\)/);
assert.match(get("basic"), /알레르기: 닭고기/);
assert.match(get("meds"), /심장약 1회 1알, 매일 08:00·20:00/);
// 3일 전~어제 6번(+ 오늘 시간이 지난 것) 중 1번 먹임, 1번 건너뜀, 나머지는 "기록 없음" — 먹었다고 추정하지 않는다
assert.match(get("meds"), /(6|7|8)번 중 1번 먹임, 1번 건너뜀, (4|5|6)번 기록 없음/);
assert.match(get("weight"), /4kg → 3\.6kg \(-0\.4kg, -10%\)/);
assert.match(get("visits"), /심장 초음파/);
assert.match(get("visits"), /병원 재진 \(예정\)/);
assert.doesNotMatch(get("visits"), /간식|미용/);
assert.match(get("chat"), /밤에 기침/);

// 처방 변경이 정리에 남는다
M.updateMed(dog.id, med.id, { ...med, dose: "반 알" });
assert.match(V.buildVetSummary(dog, note, today).find((x) => x.key === "meds").lines.join("\n"), /처방 변경 전: .* 1회 1알/);

// 끈 항목은 빠지고, 빈 항목은 "기록 없음"
const off = V.buildVetSummary({ id: "empty", name: "보리", breed: "말티즈" }, { ...V.getVetNote("empty"), sections: { note: true, meds: true } }, today);
assert.deepEqual(off.map((x) => [x.key, x.lines]), [["note", ["기록 없음"]], ["meds", ["기록 없음"]]]);
assert.match(V.summaryToText(dog, s, today), new RegExp(`^\\[콩이 병원용 기록\\] ${today}\\n\\n■ 보호자 메모`));

console.log("병원용 기록 확인 통과");
