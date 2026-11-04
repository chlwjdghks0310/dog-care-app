// 말로 기록하기 서버 확인: npm test — 가짜 Claude 서버로 /api/record가 가벼운 모델로 도구 호출만 돌려주는지,
// 질문은 question으로 넘기는지, 끝난 /api/ask는 410인지, AI 상태 확인은 기기별 하루 2번에서 막히는지
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";

const seen = [];
const msg = (content, stop) => ({ id: "msg_t", type: "message", role: "assistant", model: "x", content, stop_reason: stop, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } });
const fake = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const b = JSON.parse(body || "{}");
    seen.push(b);
    const said = JSON.stringify(b.messages?.at(-1)?.content || "");
    let out;
    if (b.tools?.some((t) => t.name === "stool_observation")) out = msg([{ type: "tool_use", id: "t1", name: "stool_observation", input: { is_stool: true, shape: "정상", blood: "안 보임", mucus: "안 보임", foreign: "안 보임", color: "갈색", flags: [], summary: "", retake: "" } }], "tool_use");
    else if (said.includes("?")) out = msg([{ type: "text", text: "QUESTION" }], "end_turn");
    else if (said.includes("얼마")) out = msg([{ type: "text", text: "얼마 썼는지 알려 주면 바로 적어 둘게!" }], "end_turn");
    else if (b.tools) out = msg([{ type: "tool_use", id: "t2", name: "add_health_record", input: { record_type: "daily", date: "2026-11-04", kind: "산책" } }], "tool_use");
    else out = msg([{ type: "text", text: "참고용 정리예요." }], "end_turn");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(out));
  });
});
await new Promise((r) => fake.listen(8789, r));
const PORT = 8788;
const srv = spawn(process.execPath, ["server/index.js"], { env: { ...process.env, PORT: String(PORT), ANTHROPIC_API_KEY: "test", ANTHROPIC_BASE_URL: "http://localhost:8789", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "", VAPID_PUBLIC_KEY: "", VAPID_PRIVATE_KEY: "" }, stdio: "ignore" });
for (let i = 0; i < 50; i++) {
  try {
    await fetch(`http://localhost:${PORT}/api/push/tick`);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 100));
  }
}
const post = (path, body, v = "visitor-aaaa-1111") => fetch(`http://localhost:${PORT}${path}`, { method: "POST", headers: { "Content-Type": "application/json", "X-MC-V": v }, body: JSON.stringify(body) });

try {
  let r = await (await post("/api/record", { text: "산책 30분 했어", dogContext: { name: "초코" }, categories: ["사료"] })).json();
  assert.equal(r.actions[0].type, "add_health_record", "도구 호출을 동작으로");
  assert.equal(r.question, false);
  const req = seen.at(-1);
  assert.equal(req.model, "claude-haiku-5-5", "가장 가벼운 모델");
  assert.deepEqual(req.thinking, { type: "disabled" });
  assert.ok(req.tools.length > 5 && !req.tools.some((t) => t.name === "web_search"), "앱 도구만, 검색 없음");

  r = await (await post("/api/record", { text: "초코가 자꾸 긁어 왜 그래?" })).json();
  assert.deepEqual([r.actions.length, r.question, r.reply], [0, true, ""], "질문은 답하지 않고 question");
  r = await (await post("/api/record", { text: "사료 샀어 얼마였더라" })).json();
  assert.equal(r.reply, "얼마 썼는지 알려 주면 바로 적어 둘게!", "빠진 정보는 되묻기");

  assert.equal((await post("/api/ask", { question: "hi" })).status, 410, "질문 답변은 끝남");
  assert.equal((await post("/api/record", { text: "" })).status, 400);

  // AI 상태 확인: 변 사진 2번까지, 3번째는 429(같은 기기). 다른 기기는 따로 센다
  const img = { imageBase64: "aGVsbG8=", mediaType: "image/jpeg" };
  assert.equal((await post("/api/quick-stool", img)).status, 200);
  assert.equal((await post("/api/analyze-photo", img)).status, 200);
  const third = await post("/api/quick-stool", img);
  assert.equal(third.status, 429);
  assert.match((await third.json()).error, /하루 2번/);
  assert.equal((await post("/api/quick-stool", img, "visitor-bbbb-2222")).status, 200, "다른 기기는 따로");
  const photoReq = seen.find((b) => !b.tools && JSON.stringify(b.messages).includes("변 사진에서 보이는 것"));
  assert.equal(photoReq.model, "claude-sonnet-5-5", "변 사진 자세히 보기는 중간 모델");
  console.log("record-api ok");
} finally {
  srv.kill();
  fake.close();
}
