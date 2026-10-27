// 푸시 알람 서버 저장 확인: npm test — 기기를 등록하고 서버를 껐다 켜도(배포·잠듦) 그 기기가 남는지. 가짜 Supabase로 확인
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";

const rows = new Map();
const fake = http.createServer((req, res) => {
  if (req.headers.authorization !== "Bearer test-service") return res.writeHead(401).end();
  const u = new URL(req.url, "http://x");
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (!u.pathname.endsWith("/push_devices")) return res.writeHead(200, { "Content-Type": "application/json" }).end("[]");
    if (req.method === "POST") rows.set(JSON.parse(body).endpoint, JSON.parse(body));
    if (req.method === "DELETE") rows.delete(decodeURIComponent(u.searchParams.get("endpoint").slice(3)));
    res.writeHead(200, { "Content-Type": "application/json" }).end(req.method === "GET" ? JSON.stringify([...rows.values()]) : "");
  });
});
await new Promise((r) => fake.listen(8797, r));

const PORT = 8796;
const env = { ...process.env, SUPABASE_URL: "http://localhost:8797", SUPABASE_SERVICE_ROLE_KEY: "test-service", PORT: String(PORT), VAPID_PUBLIC_KEY: "", VAPID_PRIVATE_KEY: "" };
async function boot() {
  const p = spawn(process.execPath, ["server/index.js"], { env, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`http://localhost:${PORT}/api/push/tick`);
      return p;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error("server did not start");
}
const tick = async () => (await fetch(`http://localhost:${PORT}/api/push/tick`)).json();

let srv = await boot();
const sub = { endpoint: "https://example.invalid/push/1", keys: { p256dh: "x", auth: "y" } };
await fetch(`http://localhost:${PORT}/api/push/subscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub, alarms: [{ time: "08:00", title: "밥", body: "아침 밥" }] }) });
await new Promise((r) => setTimeout(r, 300));
assert.equal(rows.get(sub.endpoint)?.alarms?.[0]?.title, "밥", "등록하면 DB에 저장");
srv.kill();
await new Promise((r) => srv.on("exit", r));

srv = await boot();
assert.deepEqual(await tick(), { ok: true, devices: 1, db: true }, "다시 켜도 기기가 남음");
srv.kill();
fake.close();
console.log("push-db ok");
