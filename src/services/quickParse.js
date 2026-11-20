// 말로 기록 — 자주 쓰는 짧은 말은 AI 없이 기기에서 바로(비용 0원·빠름). 문장 전체가 아래 모양일 때만, 애매하면 null → 지금처럼 AI로.
// 저장한 뒤 [되돌리기]를 보여 준다(제안 분석 11/7 ③). AI가 만드는 것과 같은 모양(app action)으로 돌려줘 저장 길은 하나.
const END = "\\s*(했어|했어요|함|했음|다녀왔어|다녀왔어요|갔다 ?왔어|야|이야|임|됐어|나왔어|요)?\\s*[.!~^ㅎㅋ]*$";
const when = (s) => (/(아침)/.test(s) ? "아침 " : /점심/.test(s) ? "점심 " : /저녁/.test(s) ? "저녁 " : "");

export function quickParse(said, today) {
  const s = said.trim().replace(/\s+/g, " ");
  if (s.length > 30) return null;
  let m;
  if ((m = s.match(new RegExp(`^(?:오늘 ?)?산책 ?(\\d{1,3}) ?분${END}`)))) {
    const v = Number(m[1]);
    return v > 0 && v <= 300 ? [{ type: "add_health_value", metric: "walk", value: v, date: today }] : null;
  }
  if ((m = s.match(new RegExp(`^(?:몸무게|체중) ?(\\d{1,3}(?:\\.\\d{1,2})?) ?(?:kg|키로|킬로|킬로그램)?${END}`)))) {
    const kg = Number(m[1]);
    return kg > 0 && kg < 120 ? [{ type: "add_weight_record", weight_kg: kg, date: today }] : null;
  }
  if (new RegExp(`^(?:아침|점심|저녁)? ?(?:사료|밥) ?(?:다|잘|싹|깨끗이) ?먹었어(?:요)?${END}`).test(s)) return [{ type: "add_health_record", record_type: "meal", date: today, appetite: "평소", memo: `${when(s)}사료 다 먹음`.trim() }];
  if (new RegExp(`^(?:아침|점심|저녁)? ?(?:사료|밥)(?:을|를)? ?(?:조금|반|많이)? ?(?:남겼어|남김|안 먹었어|안먹었어)(?:요)?${END}`).test(s)) return [{ type: "add_health_record", record_type: "meal", date: today, appetite: "평소보다 적음", memo: s }];
  if (new RegExp(`^(?:노란 ?)?(?:토했어|토함|구토했어|토했어요)${END}`).test(s)) return [{ type: "add_health_record", record_type: "symptom", date: today, symptoms: ["구토"], memo: s }];
  if ((m = s.match(new RegExp(`^(?:변|똥|응가|대변) ?(?:을 )?(정상|좋아|좋았어|잘 쌌어|쌌어|무르게 쌌어|묽어|무름|설사(?:했어)?)${END}`)))) {
    const stool = /무르|묽|무름/.test(m[1]) ? "무름" : /설사/.test(m[1]) ? "설사" : "정상";
    return [{ type: "add_health_record", record_type: "potty", date: today, stool, memo: s }];
  }
  return null;
}

// 채팅으로 지우기(11/20 사용자: "대충 말해도 지우기 버튼이 뜨게"): "지워줘/삭제/빼줘"가 보이면 AI 없이 바로 후보를 고른다.
// 힌트(오늘·어제·방금·산책·밥·변·구토·체중·병원·약·간식)로 좁히고, 없으면 오늘 기록 전부(최신순 4건). 각 후보가 [지우기] 버튼으로 뜨니 보호자가 고른다.
// 후보가 하나도 없으면 null → AI 경로(일정·가계부처럼 여기서 안 다루는 것도 AI가 찾는다).
import { getRecords, summarize, TYPES } from "./records.js";
import { getWeightRecords } from "./weightLog.js";
export const isDeleteAsk = (s) => /(지워|삭제|빼 ?줘|없애|취소해)/.test(s) && s.trim().length <= 40;
export function quickDelete(dogId, said, today) {
  const s = said.trim();
  if (!isDeleteAsk(s)) return null;
  const d = new Date(`${today}T00:00:00`);
  const shift = (n) => { const x = new Date(d); x.setDate(x.getDate() + n); const z = (v) => String(v).padStart(2, "0"); return `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())}`; }; // 현지 날짜(toISOString은 UTC라 하루 밀림)
  const date = /그저께|그제/.test(s) ? shift(-2) : /어제/.test(s) ? shift(-1) : /방금|아까|마지막|최근|직전/.test(s) ? null : today;
  const HINT = [[/산책/, (r) => r.type === "daily" && /산책/.test(r.data?.kind || "") || (r.type === "vital" && r.data?.metric === "walk")], [/밥|사료|식사|먹/, (r) => r.type === "meal"], [/변|똥|응가|배변|오줌|소변/, (r) => r.type === "potty"], [/토|구토|설사|기침|증상|아파/, (r) => r.type === "symptom"], [/병원|진료/, (r) => r.type === "vet"], [/약/, (r) => r.type === "med" || r.type === "dose"], [/간식/, (r) => r.type === "daily" && /간식/.test(r.data?.kind || "")], [/컨디션|기운/, (r) => r.type === "condition"]];
  const wantWeight = /체중|몸무게|kg|키로/.test(s);
  const typeHint = HINT.filter(([re]) => re.test(s)).map(([, f]) => f);
  const matchType = (r) => (typeHint.length ? typeHint.some((f) => f(r)) : true);
  let recs = getRecords(dogId).filter((r) => matchType(r) && (!date || r.at.slice(0, 10) === date));
  recs.sort((a, b) => b.at.localeCompare(a.at));
  let weights = wantWeight || (!typeHint.length && !date) || (!typeHint.length && date) ? getWeightRecords(dogId).filter((w) => !date || String(w.measuredAt).slice(0, 10) === date) : [];
  weights.sort((a, b) => String(b.measuredAt).localeCompare(String(a.measuredAt)));
  if (wantWeight) recs = [];
  const out = [
    ...recs.map((r) => ({ type: "delete_record", kind: "health_record", id: r.id, summary: `${r.at.slice(5, 16).replace("T", " ")} ${(TYPES[r.type] || TYPES.daily).label}: ${summarize(r)}` })),
    ...weights.map((w) => ({ type: "delete_record", kind: "weight", id: w.id, summary: `${String(w.measuredAt).slice(5, 16).replace("T", " ")} 체중 ${w.weightKg}kg` })),
  ].sort((a, b) => b.summary.localeCompare(a.summary));
  if (!out.length) return null;
  return date === null ? out.slice(0, 1) : out.slice(0, 4); // "방금 거"는 가장 최근 하나만
}
