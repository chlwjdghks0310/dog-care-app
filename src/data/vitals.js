// 건강 수치 종류. sum = 하루에 여러 번 적고 합계로 보는 것(먹은 양·마신 양·산책), point = 잴 때마다 따로 보는 것(호흡·심박·체온).
// 참고 범위는 일반적인 성견 안정 시 값 — 개체·측정법마다 다르므로 "참고"로만 보여 주고 판정하지 않는다.
export const VITALS = [
  { id: "weight", label: "몸무게", icon: "⚖️", unit: "kg", kind: "point", step: 0.1, min: 0.1, max: 120, external: true },
  { id: "dry", label: "건식 사료", icon: "🥣", unit: "g", kind: "sum", step: 1, min: 1, max: 3000 },
  { id: "wet", label: "습식", icon: "🥫", unit: "g", kind: "sum", step: 1, min: 1, max: 3000 },
  { id: "treat", label: "간식", icon: "🦴", unit: "개", kind: "sum", step: 1, min: 1, max: 100 },
  { id: "water", label: "음수량", icon: "💧", unit: "ml", kind: "sum", step: 10, min: 1, max: 5000 },
  { id: "fluid", label: "피하수액", icon: "💉", unit: "ml", kind: "sum", step: 10, min: 1, max: 1000 },
  {
    id: "resp", label: "호흡수", icon: "🫁", unit: "회/분", kind: "point", step: 1, min: 4, max: 200, range: [15, 30], counter: 30,
    how: "잠들었거나 편히 쉴 때, 가슴이 한 번 올라갔다 내려오면 1회로 세요.",
    note: "잠잘 때 기준 일반 참고 범위예요. 쉬는데도 1분에 40회 넘게 계속되면 동물병원에 문의하세요.",
  },
  {
    id: "heart", label: "심박수", icon: "❤️", unit: "회/분", kind: "point", step: 1, min: 20, max: 300, range: [60, 140], counter: 15,
    how: "왼쪽 앞다리 뒤 가슴에 손을 대거나 뒷다리 안쪽 맥을 짚고, 한 번 뛸 때마다 누르세요.",
    note: "쉬고 있을 때 성견 기준 참고 범위예요. 소형견·어린 강아지는 더 빠를 수 있어요.",
  },
  {
    id: "temp", label: "체온", icon: "🌡️", unit: "℃", kind: "point", step: 0.1, min: 30, max: 45, range: [38.0, 39.2],
    note: "항문 체온 기준 참고 범위예요. 39.5℃ 이상이거나 37.5℃ 이하면 동물병원에 문의하세요.",
  },
  { id: "walk", label: "산책", icon: "🦮", unit: "분", kind: "sum", step: 5, min: 1, max: 600 },
];
export const VITAL = Object.fromEntries(VITALS.map((v) => [v.id, v]));
// 프로필에 기본으로 보이는 수치(나머지는 최근 30일 기록이 있거나 [편집]에서 켜면 보임)
export const DEFAULT_PINS = ["weight", "dry", "water", "walk", "resp", "temp"];

export const fmtValue = (id, v) => {
  const def = VITAL[id];
  const n = Number(v);
  return def?.step < 1 ? (Math.round(n * 10) / 10).toString() : Math.round(n).toLocaleString("ko-KR");
};
// 참고 범위 밖이면 "below" | "above", 아니면 null
export const outOfRange = (id, v) => {
  const r = VITAL[id]?.range;
  if (!r) return null;
  return v < r[0] ? "below" : v > r[1] ? "above" : null;
};
