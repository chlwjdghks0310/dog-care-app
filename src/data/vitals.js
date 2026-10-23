// 건강 수치 종류. sum = 하루에 여러 번 적고 합계로 보는 것(먹은 양·마신 양·산책), point = 잴 때마다 따로 보는 것(호흡·심박·체온).
// 참고 범위는 일반적인 성견 안정 시 값 — 개체·측정법마다 다르므로 "참고"로만 보여 주고 판정하지 않는다.
// 근거: Merck 수의학 매뉴얼(호흡 18~34·심박 70~120·체온 37.5~39.2), VCA·미주리대(수면 호흡 15~30, 30 초과 지속 시 문의). ../자료용/자료/2026-10-21-건강수치-측정법-검증.md
export const VITALS = [
  { id: "weight", label: "몸무게", icon: "⚖️", ico: "scales", tone: "blue", unit: "kg", kind: "point", step: 0.1, min: 0.1, max: 120, external: true },
  { id: "dry", label: "건식 사료", icon: "🥣", ico: "bowl", tone: "rose", unit: "g", kind: "sum", step: 1, min: 1, max: 3000 },
  { id: "wet", label: "습식", icon: "🥫", ico: "droplets", tone: "rose", unit: "g", kind: "sum", step: 1, min: 1, max: 3000 },
  { id: "treat", label: "간식", icon: "🦴", ico: "bone", tone: "rose", unit: "개", kind: "sum", step: 1, min: 1, max: 100 },
  { id: "water", label: "음수량", icon: "💧", ico: "droplet", tone: "teal", unit: "ml", kind: "sum", step: 10, min: 1, max: 5000 },
  { id: "fluid", label: "피하수액", icon: "💉", ico: "pipette", tone: "teal", unit: "ml", kind: "sum", step: 10, min: 1, max: 1000 },
  {
    id: "resp", label: "호흡수", icon: "🫁", ico: "wind", tone: "blue", unit: "회/분", kind: "point", step: 1, min: 4, max: 200, range: [15, 30], counter: 30,
    how: "잠들었거나 편히 쉴 때, 가슴이 한 번 올라갔다 내려오면 1회로 세요.",
    note: "잘 때·쉴 때 기준 참고 범위예요. 계속 30회를 넘으면 다시 세어 보고, 그래도 계속이면 동물병원에 문의하세요. 심장병 진단을 받았다면 수의사 기준이 우선이에요.",
  },
  {
    id: "heart", label: "심박수", icon: "❤️", ico: "heart", tone: "blue", unit: "회/분", kind: "point", step: 1, min: 20, max: 300, range: [70, 120], soft: true, counter: 15,
    how: "뒷다리 안쪽 허벅지 맥이나 왼쪽 팔꿈치가 닿는 가슴을 짚고, 한 번 뛸 때마다 누르세요.",
    note: "수의학 매뉴얼의 일반 범위예요. 크기·나이마다 차이가 커서 평소 값과 비교해 보세요.",
  },
  {
    id: "temp", label: "체온", icon: "🌡️", ico: "thermometer", tone: "blue", unit: "℃", kind: "point", step: 0.1, min: 30, max: 45, range: [37.5, 39.2],
    note: "항문 체온 기준이에요. 39.2℃를 넘으면 10분 쉬고 다시 재요. 40.0℃ 초과·37.2℃ 미만이면 바로 병원에 가요.",
  },
  { id: "walk", label: "산책", icon: "🦮", ico: "walk", tone: "violet", unit: "분", kind: "sum", step: 5, min: 1, max: 600 },
];
export const VITAL = Object.fromEntries(VITALS.map((v) => [v.id, v]));
// 프로필에 기본으로 보이는 수치(나머지는 최근 30일 기록이 있거나 [편집]에서 켜면 보임)
export const DEFAULT_PINS = ["weight", "dry", "water", "walk", "resp", "temp"];

export const fmtValue = (id, v) => {
  const def = VITAL[id];
  const n = Number(v);
  return def?.step < 1 ? (Math.round(n * 10) / 10).toString() : Math.round(n).toLocaleString("ko-KR");
};
// 참고 범위 밖이면 "below" | "above", 아니면 null. soft(출처마다 범위가 크게 다른 심박수)는 범위만 보여 주고 표시하지 않는다
export const outOfRange = (id, v) => {
  const r = VITAL[id]?.range;
  if (!r || VITAL[id].soft) return null;
  return v < r[0] ? "below" : v > r[1] ? "above" : null;
};
