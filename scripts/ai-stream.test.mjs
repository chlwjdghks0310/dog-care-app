// 서버 스트리밍(SSE) 읽기: 조각이 이벤트 중간에서 끊겨 와도 글이 이어지고, done이 최종 답이 된다
import assert from "node:assert/strict";
import { readStream } from "../src/services/aiClient.js";

const sse = (chunks) => new Response(new ReadableStream({ start(c) { chunks.forEach((x) => c.enqueue(new TextEncoder().encode(x))); c.close(); } }));
const seen = [];
const done = await readStream(sse(['data: {"t":"안녕"}\n\ndata: {"t":"하세', '요"}\n\n', 'data: {"done":{"answer":"안녕하세요"}}\n\n']), (t) => seen.push(t));
assert.deepEqual(seen, ["안녕", "안녕하세요"]);
assert.equal(done.answer, "안녕하세요");
await assert.rejects(readStream(sse(['data: {"error":"AI 서버 호출에 실패했어요."}\n\n']), () => {}), /실패/);
await assert.rejects(readStream(sse(['data: {"t":"반"}\n\n']), () => {}), /끊겼/);
console.log("ai-stream ok");
