// 서버 저장용으로 강아지 한 마리의 저장값을 "항목" 단위로 쪼개고 다시 합친다.
// 왜 항목 단위인가: 가족 둘이 같은 날 지출을 하나씩 적어도 둘 다 남아야 해서(통째로 덮어쓰면 한쪽이 사라짐).
// 저장값 모양(localStorage의 { [dogId]: 값 }에서 "값"):
//   · id가 있는 객체 배열(지출·체중·기록·약 등)  → 항목 = id
//   · 객체(날짜→목록, 규칙→true, 설정 필드 등)    → 항목 = 속성 이름, 속성 값이 id 배열이면 "속성␟id"로 한 단계 더
//   · 그 밖(숫자 등)                                → 항목 하나 "_"
const SEP = "␟"; // 날짜 키나 id에 나올 일 없는 글자
const SINGLE = "_";

const isIdList = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === "object" && typeof x.id === "string");
const isPlainObject = (v) => v && typeof v === "object" && !Array.isArray(v);

// 모양 표시: 다시 합칠 때 배열로 만들지 객체로 만들지 알아야 해서 항목과 함께 저장한다.
export function flatten(value) {
  const items = {};
  if (value === undefined) return { shape: "none", items };
  if (Array.isArray(value)) {
    if (value.length === 0) return { shape: "list", items };
    if (isIdList(value)) {
      for (const x of value) items[x.id] = x;
      return { shape: "list", items };
    }
    items[SINGLE] = value;
    return { shape: "single", items };
  }
  if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (isIdList(v)) for (const x of v) items[`${k}${SEP}${x.id}`] = x;
      else items[k] = v;
    }
    return { shape: "object", items };
  }
  items[SINGLE] = value;
  return { shape: "single", items };
}

// order: 원래 순서를 지키고 싶을 때 이전 값의 항목 순서(없으면 받은 순서대로)
export function unflatten(shape, items, order = []) {
  const keys = Object.keys(items);
  const rank = new Map(order.map((k, i) => [k, i]));
  keys.sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity));
  if (shape === "list") return keys.map((k) => items[k]);
  if (shape === "single") return items[SINGLE];
  if (shape === "object") {
    const out = {};
    for (const k of keys) {
      const at = k.indexOf(SEP);
      if (at < 0) out[k] = items[k];
      else (out[k.slice(0, at)] ||= []).push(items[k]);
    }
    return out;
  }
  return undefined;
}

export const ITEM_SEP = SEP;
