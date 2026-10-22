// 산책 GPS 계산: 두 지점 거리, 튀는 점 거르기, 저장 전 점 줄이기. 화면(Walk.jsx)과 테스트(scripts/walk.test.mjs)가 같이 쓴다.

// 두 지점 사이 거리(m) — 하버사인 공식
export function distanceM(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const MAX_ACCURACY_M = 35; // 이보다 부정확한 위치는 버린다(실내·건물 사이에서 튀는 값)
export const MIN_STEP_M = 4; // 이보다 가까우면 같은 자리로 본다(서 있을 때 GPS 흔들림이 거리로 쌓이지 않게)
export const MAX_SPEED_MS = 4.5; // 약 16km/h — 강아지와 걷거나 뛰는 속도를 넘으면 튄 점

// 새 위치를 받을지: { ok, step(m) }. prev가 없으면 첫 점
export function acceptPoint(prev, next) {
  if (!(next.accuracy <= MAX_ACCURACY_M)) return { ok: false, reason: "accuracy" };
  if (!prev) return { ok: true, step: 0 };
  const step = distanceM(prev, next);
  if (step < MIN_STEP_M) return { ok: false, reason: "still" };
  const sec = Math.max(1, (next.t - prev.t) / 1000);
  if (step / sec > MAX_SPEED_MS) return { ok: false, reason: "jump" };
  return { ok: true, step };
}

// 저장용: 소수 5자리(약 1m)로 줄이고, minM보다 가까운 점은 뺀다(첫·끝 점은 남김)
export function simplify(points, minM = 6) {
  if (points.length < 3) return points.map(round);
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) if (distanceM(out[out.length - 1], points[i]) >= minM) out.push(points[i]);
  out.push(points[points.length - 1]);
  return out.map(round);
}
const round = (p) => ({ lat: Math.round(p.lat * 1e5) / 1e5, lng: Math.round(p.lng * 1e5) / 1e5 });

// 페이스(1km에 걸린 시간) "12'30\"" — 너무 짧게 걸었으면 "-"
export function pace(distance, sec) {
  if (distance < 50 || sec < 30) return "-";
  const perKm = sec / (distance / 1000);
  const m = Math.floor(perKm / 60);
  const s = Math.round(perKm % 60);
  return m > 99 ? "-" : `${m}'${String(s).padStart(2, "0")}"`;
}

export const fmtKm = (m) => (m / 1000).toFixed(2);
export function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
