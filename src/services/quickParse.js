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
