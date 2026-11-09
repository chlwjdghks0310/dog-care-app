// 이용 통계 확인: npm test — 유입 경로 고르기 + 서버가 사건을 올바른 항목으로 Supabase(analytics_track)에 넘기는지. 가짜 Supabase로 확인
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { pickSource } from "../src/services/analytics.js";

assert.equal(pickSource("?from=Threads", "", "meongcare.kr"), "threads", "?from= 우선");
assert.equal(pickSource("?utm_source=insta", "https://naver.com", "meongcare.kr"), "insta");
assert.equal(pickSource("", "https://m.blog.naver.com/x", "meongcare.kr"), "naver", "눌러 온 사이트");
assert.equal(pickSource("", "https://l.instagram.com/?u=1", "meongcare.kr"), "instagram");
assert.equal(pickSource("", "https://meongcare.kr/intro/", "meongcare.kr"), "", "같은 사이트 안 이동은 바로 들어옴");
assert.equal(pickSource("", "", "meongcare.kr"), "");

const calls = [];
const fake = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.url.includes("rpc/analytics_track")) calls.push(JSON.parse(body));
    res.writeHead(200, { "Content-Type": "application/json" }).end(req.method === "GET" ? "[]" : "");
  });
});
await new Promise((r) => fake.listen(8795, r));
const PORT = 8794;
const srv = spawn(process.execPath, ["server/index.js"], { env: { ...process.env, SUPABASE_URL: "http://localhost:8795", SUPABASE_SERVICE_ROLE_KEY: "test", PORT: String(PORT), VAPID_PUBLIC_KEY: "", VAPID_PRIVATE_KEY: "", ANTHROPIC_API_KEY: "x" }, stdio: "ignore" });
for (let i = 0; i < 50; i++) {
  try {
    await fetch(`http://localhost:${PORT}/api/push/tick`);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 100));
  }
}
const t = (b, ua = "Mozilla/5.0 iPhone") => fetch(`http://localhost:${PORT}/api/t`, { method: "POST", headers: { "Content-Type": "text/plain", "User-Agent": ua }, body: JSON.stringify(b) });
await t({ e: "page", p: "guide", s: "Threads!", v: "abcdefgh-1234" });
await t({ e: "first_open", s: "blog", i: true, v: "abcdefgh-1234" });
await t({ e: "open", l: false, i: true, d: true, v: "abcdefgh-1234" });
await t({ e: "page", v: "abcdefgh-1234" }, "Googlebot/2.1"); // 봇은 안 셈
await t({ e: "act", a: "check", v: "abcdefgh-1234" }); // 하루 체크 끝냄(핵심 행동)
await t({ e: "act", a: "drop-table", v: "abcdefgh-1234" }); // 모르는 행동은 안 셈
await t({ e: "hack", v: "abcdefgh-1234" }); // 모르는 사건은 안 셈
await fetch(`http://localhost:${PORT}/api/record`, { method: "POST", headers: { "Content-Type": "application/json", "X-MC-V": "abcdefgh-1234", "X-MC-L": "0" }, body: JSON.stringify({}) }); // 내용이 없어 400이어도 요청은 센다
await new Promise((r) => setTimeout(r, 300));
srv.kill();
fake.close();

assert.equal(calls.length, 5, JSON.stringify(calls));
// 서버는 204를 먼저 보내고 DB 호출은 뒤에서 하므로 도착 순서가 바뀔 수 있다 → 이름으로 찾는다(11/9 간헐 실패)
const by = (m) => calls.find((c) => c.p_metric === m) || {};
const [page, first, open, act, ai] = ["page:guide", "app_first_open_installed", "app_open", "act:check", "ai_chat:anon"].map(by);
assert.deepEqual([act.p_metric, act.p_kinds], ["act:check", ["act_check"]]);
assert.deepEqual([page.p_metric, page.p_source, page.p_kinds], ["page:guide", "threads", ["web"]]);
assert.match(page.p_visitor, /^[0-9a-f]{24}$/, "기기 번호는 해시로만");
assert.deepEqual([first.p_metric, first.p_source, first.p_visitor], ["app_first_open_installed", "blog", null]);
assert.deepEqual([open.p_metric, open.p_kinds], ["app_open", ["app", "app_anon", "app_installed", "app_dog"]]);
assert.deepEqual([ai.p_metric, ai.p_source, ai.p_kinds], ["ai_chat:anon", "", ["ai", "ai_anon"]]);
assert.equal(page.p_visitor, open.p_visitor, "같은 기기는 같은 사람");
assert.match(page.p_day, /^\d{4}-\d{2}-\d{2}$/);
console.log("analytics ok");
