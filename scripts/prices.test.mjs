// AI 단가 계산(통계 화면의 "돈"이 여기서 나온다)
import assert from "node:assert/strict";
import { usdOf } from "../server/prices.js";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
near(usdOf("claude-haiku-5-5", 100_000, 0), 0.01); // 10만 토큰까지는 $0.10 / 100만
near(usdOf("claude-haiku-5-5", 100_001, 0), 0.0500005); // 넘으면 그 요청 전체가 $0.50 / 100만
near(usdOf("claude-haiku-5-5", 0, 1_000_000), 0.5);
near(usdOf("claude-haiku-5-5", 4000, 150), 0.000475); // 비서 빠른 답 한 번쯤: 1원이 안 된다
near(usdOf("claude-haiku-5-5-20261001", 1000, 0), 0.0001); // 날짜가 붙은 이름
near(usdOf("claude-haiku-5-5", 0, 0, 1_000_000, 1_000_000), 0.5 * 0 + 0.05 + 0.625); // 10만 토큰을 넘는 요청은 높은 단가
near(usdOf("claude-haiku-5-5", 50_000, 0, 40_000, 0), 0.005 + 0.0004); // 10만 이하: 캐시 읽기 0.01
near(usdOf("claude-sonnet-5-5", 5000, 800), 0.018); // 자세히 한 번쯤
near(usdOf("claude-sonnet-5-5", 0, 0, 1_000_000, 1_000_000), 0.1 + 2.5);
near(usdOf("claude-opus-5-5", 1_000_000, 1_000_000, 1_000_000, 1_000_000), 4 + 20 + 0.2 + 5);
assert.equal(usdOf("gemini-3.8-flash", 1000, 1000), null);
console.log("prices ok");
