// 체중 관리 기능의 핵심 로직(측정 주기 계산, 다음 측정일, 변화율, 체크리스트 완료 파생,
// 날짜/시간대 처리)에 대한 최소 회귀 테스트. 프레임워크 없이 node assert로 돈다.
//   node --experimental-loader ./scripts/resolve-extensionless-loader.mjs scripts/weight-logic.test.mjs
import assert from "node:assert/strict";

// storage.js가 쓰는 localStorage를 메모리로 흉내낸다(Node엔 기본으로 없음).
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const { getDefaultCadenceDays, getNextDueDateKey, setCustomCadenceDays, getEffectiveCadenceDays } = await import(
  "../src/services/weightSchedule.js"
);
const {
  addWeightRecord,
  updateWeightRecord,
  deleteWeightRecord,
  getWeightRecords,
  hasWeightRecordOnDate,
  getWeightChangeSummary,
  getWeightChangeAdvice,
} = await import("../src/services/weightLog.js");
const { getWeightCheckItem } = await import("../src/services/careEngine.js");
const { toDateKey } = await import("../src/utils/date.js");
const { getWeightAssessment, getExpectedWeightRange } = await import("../src/data/weightGuide.js");

let passed = 0;
function test(name, fn) {
  store.clear();
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

const smallDog = { id: "dog-small", breed: "포메라니안", birthDate: "2020-01-01" };
const largeDog = { id: "dog-large", breed: "골든리트리버", birthDate: "2020-01-01" };

test("기본 측정 주기 — 생후 0~2주는 매일", () => {
  assert.equal(getDefaultCadenceDays(smallDog, 1, 0), 1);
});

test("기본 측정 주기 — 2주~1개월은 3일", () => {
  assert.equal(getDefaultCadenceDays(smallDog, 3, 0), 3);
});

test("기본 측정 주기 — 1~6개월은 7일", () => {
  assert.equal(getDefaultCadenceDays(smallDog, 10, 3), 7);
});

test("기본 측정 주기 — 소형견 성견(12개월 이상)은 30일", () => {
  assert.equal(getDefaultCadenceDays(smallDog, 60, 14), 30);
});

test("기본 측정 주기 — 대형견은 18개월 전까지는 성장기(14일)", () => {
  assert.equal(getDefaultCadenceDays(largeDog, 60, 14), 14);
});

test("사용자 지정 주기가 있으면 기본값보다 우선한다", () => {
  setCustomCadenceDays(smallDog.id, 10);
  assert.equal(getEffectiveCadenceDays(smallDog, 60, 14), 10);
});

test("기록이 없으면 다음 측정 예정일은 오늘", () => {
  const due = getNextDueDateKey(smallDog, 60, 14);
  assert.equal(due, toDateKey(new Date()));
});

test("다음 측정 예정일 = 마지막 기록 날짜 + 주기 (과거 기록 추가는 영향 없음)", () => {
  addWeightRecord(smallDog.id, { weightKg: 3, measuredAt: "2026-01-01T09:00:00" });
  setCustomCadenceDays(smallDog.id, 7);
  assert.equal(getNextDueDateKey(smallDog, 60, 14), "2026-01-08");

  // 더 과거 기록을 나중에 추가해도(가장 최근 기록이 아니므로) 다음 예정일은 그대로다.
  addWeightRecord(smallDog.id, { weightKg: 2.8, measuredAt: "2025-12-01T09:00:00" });
  assert.equal(getNextDueDateKey(smallDog, 60, 14), "2026-01-08");
});

test("자정 근처 측정 시각도 로컬 날짜가 하루 밀리지 않는다", () => {
  addWeightRecord(smallDog.id, { weightKg: 3, measuredAt: "2026-03-01T23:50:00" });
  assert.ok(hasWeightRecordOnDate(smallDog.id, "2026-03-01"));
  assert.ok(!hasWeightRecordOnDate(smallDog.id, "2026-03-02"));
});

test("변화율 계산 — (현재-이전)/이전*100, 이전 기록 없으면 null", () => {
  addWeightRecord(smallDog.id, { weightKg: 4, measuredAt: "2026-01-01T09:00:00" });
  let summary = getWeightChangeSummary(smallDog.id);
  assert.equal(summary.deltaPercent, null);

  addWeightRecord(smallDog.id, { weightKg: 5, measuredAt: "2026-01-10T09:00:00" });
  summary = getWeightChangeSummary(smallDog.id);
  assert.equal(summary.deltaKg, 1);
  assert.equal(summary.deltaPercent, 25);
});

test("변화 안내 문구는 증가/감소 자체로 건강을 단정하지 않는다(중립 문구)", () => {
  const down = getWeightChangeAdvice(-10);
  const up = getWeightChangeAdvice(10);
  const flat = getWeightChangeAdvice(1);
  assert.ok(!/건강|비만|질병/.test(down + up + flat));
});

test("기록 삭제 — 같은 날 다른 기록이 남아있으면 그날 완료 상태는 유지된다", () => {
  addWeightRecord(smallDog.id, { weightKg: 3, measuredAt: "2026-02-01T08:00:00" });
  const second = addWeightRecord(smallDog.id, { weightKg: 3.1, measuredAt: "2026-02-01T20:00:00" });
  assert.ok(hasWeightRecordOnDate(smallDog.id, "2026-02-01"));
  deleteWeightRecord(smallDog.id, second.id);
  assert.ok(hasWeightRecordOnDate(smallDog.id, "2026-02-01")); // 하나 남아있으니 여전히 true

  const remaining = getWeightRecords(smallDog.id)[0];
  deleteWeightRecord(smallDog.id, remaining.id);
  assert.ok(!hasWeightRecordOnDate(smallDog.id, "2026-02-01")); // 다 지우면 false
});

test("기록 수정은 실제 저장된 기록에만 적용된다", () => {
  const r = addWeightRecord(smallDog.id, { weightKg: 3, measuredAt: "2026-01-01T09:00:00" });
  updateWeightRecord(smallDog.id, r.id, { weightKg: 3.5 });
  assert.equal(getWeightRecords(smallDog.id)[0].weightKg, 3.5);
  const result = updateWeightRecord(smallDog.id, "no-such-id", { weightKg: 99 });
  assert.equal(result, null);
});

test("체크리스트 완료 여부는 실제 기록 유무로 파생되고, 화면 state와 분리되어 있다", () => {
  setCustomCadenceDays(smallDog.id, 1);
  addWeightRecord(smallDog.id, { weightKg: 3, measuredAt: "2026-05-01T09:00:00" });
  const today = "2026-05-02"; // 주기 1일이므로 다음날이 측정 예정일
  let item = getWeightCheckItem(smallDog, today);
  assert.equal(item.completed, false);

  addWeightRecord(smallDog.id, { weightKg: 3.1, measuredAt: `${today}T09:00:00` });
  item = getWeightCheckItem(smallDog, today);
  assert.equal(item.completed, true);
});

test("강아지별로 기록이 분리된다", () => {
  addWeightRecord(smallDog.id, { weightKg: 3, measuredAt: "2026-01-01T09:00:00" });
  addWeightRecord(largeDog.id, { weightKg: 25, measuredAt: "2026-01-01T09:00:00" });
  assert.equal(getWeightRecords(smallDog.id).length, 1);
  assert.equal(getWeightRecords(largeDog.id).length, 1);
  assert.equal(getWeightRecords(largeDog.id)[0].weightKg, 25);
});

test("체중 적정 구간은 월령에 비례해 유연하게 넓어진다(성장기 < 성견)", () => {
  const newbornRange = getExpectedWeightRange(smallDog.breed, 0);
  const adultRange = getExpectedWeightRange(smallDog.breed, 12);
  assert.ok(newbornRange.max < adultRange.max);
  assert.ok(newbornRange.min < adultRange.min);
});

test("성장기 강아지도 구간을 벗어나면 성견과 다른 말투로(그러나 같은 상태로) 판정된다", () => {
  // 생후 1개월인데 성견 체중만큼 나가면(소형견 기준) 비만 쪽으로 판정돼야 한다.
  const assessment = getWeightAssessment({ ...smallDog, weight: 3.5 }, 1);
  assert.equal(assessment.growing, true);
  assert.ok(assessment.status === "over" || assessment.status === "obese");
});

test("성견이 적정 범위 안이면 ideal, growing은 false", () => {
  const assessment = getWeightAssessment({ ...smallDog, weight: 2.5 }, 24);
  assert.equal(assessment.status, "ideal");
  assert.equal(assessment.growing, false);
});

console.log(`\n${passed} tests passed`);
