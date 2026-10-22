// 산책 GPS 계산 확인: npm test
import assert from "node:assert/strict";
import { distanceM, acceptPoint, simplify, pace, fmtTime } from "../src/utils/geo.js";

// 위도 0.001도 ≈ 111m
const a = { lat: 37.5, lng: 127.0 };
assert.ok(Math.abs(distanceM(a, { lat: 37.501, lng: 127.0 }) - 111.2) < 1, "남북 0.001도 ≈ 111m");

// 걷는 속도(1.2m/s)로 10초마다 12m씩 → 100번 = 약 1.2km
let prev = null, total = 0, accepted = 0;
for (let i = 0; i <= 100; i++) {
  const p = { lat: 37.5 + i * 0.000108, lng: 127.0, accuracy: 8, t: i * 10000 };
  const r = acceptPoint(prev, p);
  if (r.ok) (total += r.step), (prev = p), accepted++;
}
assert.ok(Math.abs(total - 1200) < 15, `걸은 거리 ${total}`);
// 서 있을 때 GPS 흔들림(2m)은 거리로 안 쌓임
assert.equal(acceptPoint(prev, { lat: prev.lat + 0.00002, lng: prev.lng, accuracy: 8, t: prev.t + 5000 }).ok, false);
// 순간 300m 튐(1초)은 버림
assert.equal(acceptPoint(prev, { lat: prev.lat + 0.0027, lng: prev.lng, accuracy: 8, t: prev.t + 1000 }).reason, "jump");
// 부정확한 위치(±80m)는 버림
assert.equal(acceptPoint(prev, { lat: prev.lat + 0.0002, lng: prev.lng, accuracy: 80, t: prev.t + 20000 }).reason, "accuracy");
// 앱을 내렸다 2분 뒤 150m 떨어진 곳에서 다시 받으면(걷는 속도) 이어서 침
assert.ok(acceptPoint(prev, { lat: prev.lat + 0.00135, lng: prev.lng, accuracy: 8, t: prev.t + 120000 }).ok);

// 저장 전 줄이기: 첫·끝 점은 남기고 6m 안쪽 점은 뺌
const dense = Array.from({ length: 50 }, (_, i) => ({ lat: 37.5 + i * 0.00001, lng: 127 }));
const s = simplify(dense);
assert.ok(s.length < 15 && s[0].lat === 37.5 && s.at(-1).lat === dense.at(-1).lat);

assert.equal(pace(1000, 720), `12'00"`);
assert.equal(pace(20, 60), "-");
assert.equal(fmtTime(3725), "1:02:05");
assert.equal(fmtTime(65), "01:05");
console.log("산책 GPS 계산 확인 통과");
