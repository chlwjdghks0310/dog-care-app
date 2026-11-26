// 주간 결산 카드(공유용 그림 1080×1350): 공유하면 앱이 알려지는 고리(방향 정리 — 캐릭터 아이디어 흡수, 바이럴 장치로만).
// 남에게 보이는 그림이라 건강 문제(무른 변·증상·병원)는 넣지 않고 함께한 기록만: 함께 본 날·산책·몸무게·기록 수.
import { buildWeeklyReport } from "./weeklyReport";
import { daysInRange } from "./dailyCheck";
import { md, getTimeline } from "./records";
import { josa } from "../utils/text";
import { toDateKey } from "../utils/date";
import { characterOutputs } from "./character";
import { awardFor } from "./monthAward";
import { getStage } from "./stageGuide";

export function weeklyCardStats(dog, today) {
  const r = buildWeeklyReport(dog, today);
  return {
    title: `${josa(dog.name, "이의", "의")} 이번 주`,
    range: `${md(r.from)} ~ ${md(r.to)}`,
    rows: [
      ["함께 본 날", `${daysInRange(dog.id, r.from, r.to)}일`],
      ["산책", r.walk.days ? `${r.walk.days}일${r.walk.minutes ? ` · ${r.walk.minutes}분` : ""}` : "—"],
      ["몸무게", r.weight ? `${r.weight.kg}kg` : "—"],
      ["남긴 기록", `${r.records}개`],
    ],
  };
}

const loadImg = (src) => new Promise((ok, fail) => { const i = new Image(); if (/^https?:/.test(src)) i.crossOrigin = "anonymous"; /* 캐릭터 포스터(Supabase)는 다른 출처 — 캔버스 오염 방지 */ i.onload = () => ok(i); i.onerror = fail; i.src = src; });

// 함께한 날: 입양일(없으면 생일)부터 오늘까지. 100일·200일…·1년·1000일 같은 날을 기념 카드로
export function togetherDays(dog, today = new Date()) {
  const start = dog.adoptionDate || dog.birthDate;
  if (!start) return null;
  return Math.floor((new Date(today.toDateString()) - new Date(`${start}T00:00:00`)) / 86400000) + 1;
}
export const isMilestone = (n) => n > 0 && (n % 100 === 0 || n % 365 === 0);

export function togetherCardStats(dog, today) {
  const n = togetherDays(dog, today ? new Date(`${today}T00:00:00`) : new Date());
  const start = dog.adoptionDate || dog.birthDate;
  return {
    title: `${josa(dog.name, "이랑", "랑")} 함께한 지 ${n}일`,
    range: `${start.replaceAll("-", ".")}부터 ${dog.adoptionDate ? "함께" : "태어나서"}`,
    rows: [
      ["함께 본 날", `${daysInRange(dog.id, start, today || toDateKey(new Date()))}일`],
      ["남긴 기록", `${getTimeline(dog.id).filter((r) => r.type !== "med").length}개`],
    ],
  };
}

export const drawWeeklyCard = (dog, today) => drawCard(dog, weeklyCardStats(dog, today));
export const drawTogetherCard = (dog, today) => drawCard(dog, togetherCardStats(dog, today));

async function drawCard(dog, s) {
  const W = 1080, H = 1350, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const font = (w, px) => `${w} ${px}px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#eaf2fd"); bg.addColorStop(1, "#fdf1e6");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // 사진(없으면 멍케어 강아지 그림)
  try {
    const img = await loadImg(s.image || dog.photo || "/intro/img/dog-yeoreum-sit.png");
    const R = 220, cx = W / 2, cy = 330;
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.clip();
    const k = Math.max((R * 2) / img.width, (R * 2) / img.height);
    g.drawImage(img, cx - (img.width * k) / 2, cy - (img.height * k) / 2, img.width * k, img.height * k);
    g.restore();
  } catch { /* 사진을 못 불러와도 카드는 만든다 */ }
  g.textAlign = "center"; g.fillStyle = "#2b2320";
  g.font = font(800, 72); g.fillText(s.title, W / 2, 660);
  g.font = font(500, 38); g.fillStyle = "#7a6f63"; g.fillText(s.range, W / 2, 715);
  s.rows.forEach(([k, v], i) => {
    const x = 90 + (i % 2) * 460, y = (s.rows.length > 2 ? 780 : 860) + Math.floor(i / 2) * 210;
    g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(x, y, 440, 180, 36); g.fill();
    g.textAlign = "left"; g.fillStyle = "#7a6f63"; g.font = font(600, 36); g.fillText(k, x + 40, y + 66);
    g.fillStyle = "#2f6fbd"; g.font = font(800, 60); g.fillText(v, x + 40, y + 140);
  });
  g.textAlign = "center"; g.fillStyle = "#2f6fbd"; g.font = font(800, 40); g.fillText("🐾 멍케어로 기록했어요", W / 2, 1255);
  g.fillStyle = "#7a6f63"; g.font = font(500, 32); g.fillText("meongcare.kr", W / 2, 1305);
  return new Promise((ok) => c.toBlob(ok, "image/png"));
}

// ── 한 달 그림일기 카드(11/27, 시안 A-2): 크림 종이 + 테이프로 붙인 그림 + 이 달의 상장 + 아이 한마디 + 발도장 칸.
// 건강 정보·체중·순위는 넣지 않는다. story면 1080×1920(위 14%·아래 35%는 인스타가 가려서 무늬만)
export function monthCardFacts(dog, r) {
  const [y, m] = r.month.split("-").map(Number);
  const end = new Date(`${r.isCurrent ? toDateKey(new Date()) : r.to}T00:00:00`);
  const start = new Date(`${r.month}-01T00:00:00`);
  const together = togetherDays(dog, end);
  const before = together != null ? together - Math.round((end - start) / 86400000) - 1 : null; // 지난달 말까지 함께한 날
  const hundred = together != null && together >= 100 && Math.floor(together / 100) > Math.floor(Math.max(0, before) / 100) ? Math.floor(together / 100) * 100 : 0;
  const mOf = (d) => (d ? Number(d.slice(5, 7)) : 0), yOf = (d) => (d ? Number(d.slice(0, 4)) : 0);
  const ageMonths = dog.birthDate ? (end.getFullYear() - yOf(dog.birthDate)) * 12 + (end.getMonth() + 1 - mOf(dog.birthDate)) - (end.getDate() < Number(dog.birthDate.slice(8, 10)) ? 1 : 0) : null;
  const firstDate = getTimeline(dog.id).map((x) => (x.date || x.at || x.measuredAt || "").slice(0, 7)).filter(Boolean).sort()[0];
  return {
    m, days: r.elapsed || r.days, walkDays: r.walk.days, walkMin: r.walk.minutes, check: r.checkDays.length, streaks: r.streaks || 0, records: r.records,
    together, ageMonths: ageMonths != null && ageMonths >= 0 ? ageMonths : null,
    birthday: !dog.ageEstimated && mOf(dog.birthDate) === m && yOf(dog.birthDate) < y,
    anniversary: mOf(dog.adoptionDate) === m && yOf(dog.adoptionDate) < y,
    hundred, first: !!firstDate && firstDate === r.month && r.records > 0,
  };
}
export function monthCardData(dog, r) {
  const f = monthCardFacts(dog, r);
  const award = awardFor(dog.id, r.month, f, { keep: !r.isCurrent });
  const poster = characterOutputs(dog.id)?.poster;
  let label = `${r.month.slice(0, 4)}년 ${f.m}월`;
  if (r.isCurrent && dog.birthDate && f.ageMonths != null) {
    const age = f.ageMonths < 12 ? `생후 ${Math.max(1, f.ageMonths)}개월` : `${Math.floor(f.ageMonths / 12)}살`;
    try { label = `${age} · ${getStage(dog).name}`; } catch { label = age; }
  }
  return { f, award, label, title: `${f.m}월의 ${dog.name}`, image: poster || dog.photo || "/intro/img/dog-yeoreum-sit.png", cover: !poster && !!dog.photo, cells: r.cells };
}

const PAW_PAD = "M13.5 26.5c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5c0 2.3-2 3.2-3.6 2.6-1.9-.7-3.9-.7-5.800 0-1.600.6-3.600-.3-3.600-2.600z";
const SEAL_RIBBON = "M46 104 34 146l18-10 10 14 8-40zM90 104l12 42-18-10-10 14-8-40z";
const SEAL_BODY = "M68 6l11 8 13-3 6 12 13 4-1 14 10 9-7 12 4 13-12 6-3 13-14 0-9 10-11-7-11 7-9-10-14 0-3-13-12-6 4-13-7-12 10-9-1-14 13-4 6-12 13 3z";
const INK = "#2b2320";

export async function drawDiaryCard(dog, r, { story = false } = {}) {
  const d = monthCardData(dog, r);
  const K = 2, W = 540, H = story ? 960 : 675; // 좌표는 시안(540폭) 기준, 캔버스는 2배
  const c = document.createElement("canvas"); c.width = W * K; c.height = H * K;
  const g = c.getContext("2d"); g.scale(K, K);
  const F = { say: '"Dongle", "Apple SD Gothic Neo", sans-serif', ui: '"Jua", "Apple SD Gothic Neo", sans-serif', big: '"Bagel Fat One", "Jua", sans-serif' };
  try { await Promise.all(["40px Dongle", "16px Jua", '40px "Bagel Fat One"'].map((x) => document.fonts.load(x, `${d.title}${d.award.name}D+0123456789`))); } catch { /* 글꼴이 없어도 그린다 */ }
  // 종이
  g.fillStyle = "#fbf5e9"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#e3d8c3"; for (let y = 9; y < H; y += 18) for (let x = 9; x < W; x += 18) { g.beginPath(); g.arc(x, y, 1.1, 0, 7); g.fill(); }
  const top = story ? 110 : 0; // 스토리는 위를 비운다
  const paw = (cx, cy, size, rot, alpha = 1) => {
    g.save(); g.translate(cx, cy); g.rotate((rot * Math.PI) / 180); g.scale(size / 40, size / 40); g.translate(-20, -20); g.globalAlpha = alpha;
    g.lineWidth = 2.4; g.strokeStyle = "#c8642a"; g.lineJoin = "round";
    g.fillStyle = "#fff1e2"; g.beginPath(); g.arc(20, 20, 17.5, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#f5a66b"; const pad = new Path2D(PAW_PAD); g.fill(pad); g.stroke(pad);
    for (const [x, y] of [[11.5, 18], [16.5, 12.5], [23.5, 12.5], [28.5, 18]]) { g.beginPath(); g.ellipse(x, y, 2.3, 3, 0, 0, 7); g.fill(); g.stroke(); }
    g.restore();
  };
  if (story) { paw(115, 765, 150, -18, 0.16); paw(425, 865, 110, 14, 0.16); }
  // 시기 테이프(왼쪽 위)
  g.save(); g.translate(-6, top + 40); g.rotate((-4 * Math.PI) / 180); g.font = `18px ${F.ui}`;
  const lw = g.measureText(d.label).width + 40;
  g.fillStyle = "#ffd9b0"; g.beginPath(); g.moveTo(0, 0); g.lineTo(lw, 0); g.lineTo(lw - 7, 16); g.lineTo(lw, 32); g.lineTo(0, 32); g.closePath(); g.fill();
  g.fillStyle = "#7a4a22"; g.textBaseline = "middle"; g.fillText(d.label, 22, 17); g.restore();
  // 함께한 날(오른쪽 위)
  if (d.f.together) {
    g.textAlign = "right"; g.textBaseline = "alphabetic";
    g.fillStyle = "#8a7d6d"; g.font = `16px ${F.ui}`; g.fillText("함께한 지", W - 30, top + 46);
    g.fillStyle = "#2f6fbd"; g.font = `46px ${F.big}`; g.fillText(`D+${d.f.together}`, W - 30, top + 92);
  }
  // 그림(테이프로 붙인 사진·캐릭터)
  const P = story ? { y: top + 102, s: 196 } : { y: 104, s: 232 };
  g.save(); g.translate(W / 2, P.y + P.s / 2); g.rotate((-2.5 * Math.PI) / 180);
  g.fillStyle = "#fff"; g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.roundRect(-P.s / 2, -P.s / 2, P.s, P.s, 18); g.fill(); g.stroke();
  const inner = P.s - 22; g.beginPath(); g.roundRect(-inner / 2, -inner / 2, inner, inner, 10); g.fillStyle = "#eaf2fd"; g.fill(); g.clip();
  try {
    const img = await loadImg(d.image);
    const k = d.cover ? Math.max(inner / img.width, inner / img.height) : Math.min(inner / img.width, inner / img.height) * 0.92;
    g.drawImage(img, -(img.width * k) / 2, -(img.height * k) / 2 + (d.cover ? 0 : inner * 0.03), img.width * k, img.height * k);
  } catch { /* 그림을 못 불러와도 카드는 만든다 */ }
  g.restore();
  try { const tape = await loadImg("/pieces/tape.png"); const tw = 140, th = (tape.height / tape.width) * tw; g.save(); g.translate(W / 2, P.y - 4); g.rotate((3 * Math.PI) / 180); g.drawImage(tape, -tw / 2, -th / 2, tw, th); g.restore(); } catch { /* 테이프 없이 */ }
  // 상장
  const S = { x: W / 2 + P.s / 2 - 34, y: P.y + P.s - 106, w: 116 };
  g.save(); g.translate(S.x + S.w / 2, S.y + 64); g.rotate((8 * Math.PI) / 180); g.scale(S.w / 136, S.w / 136); g.translate(-68, -75);
  g.lineJoin = "round"; g.lineWidth = 2.5; g.strokeStyle = INK;
  g.fillStyle = "#f5a66b"; const rb = new Path2D(SEAL_RIBBON); g.fill(rb); g.stroke(rb);
  g.fillStyle = "#ffe2a6"; const sb = new Path2D(SEAL_BODY); g.fill(sb); g.stroke(sb);
  g.fillStyle = "#fff6dd"; g.beginPath(); g.arc(68, 62, 40, 0, 7); g.fill(); g.setLineDash([3, 4]); g.strokeStyle = "#e0a54a"; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = "#9a5a1e"; g.font = `13px ${F.ui}`; g.fillText(`${d.f.m}월의`, 68, 44);
  const words = d.award.name.split(" "); const an = words.length > 1 ? [words.slice(0, -1).join(" "), words.at(-1)] : [d.award.name]; // 띄어 쓴 이름은 두 줄로
  g.fillStyle = "#7a3d10";
  an.filter(Boolean).forEach((t, i, arr) => { let px = 19; g.font = `${px}px ${F.ui}`; while (g.measureText(t).width > 70 && px > 11) g.font = `${--px}px ${F.ui}`; g.fillText(t, 68, (arr.length > 1 ? 63 : 72) + i * 20); });
  g.restore();
  // 아이 한마디(숫자에 밑줄)
  const sayY = P.y + P.s + (story ? 44 : 50), sayPx = story ? 38 : 42;
  g.font = `${sayPx}px ${F.say}`; g.textBaseline = "alphabetic"; g.textAlign = "left";
  const lines = g.measureText(d.award.line).width <= W - 90 ? [d.award.line] : d.award.line.split(/(?<=[.!?])\s+/).slice(0, 2); // 한 줄에 들어가면 한 줄로
  lines.forEach((t, i) => {
    const y = sayY + i * sayPx * 0.92, m = t.match(/\d+(개월|번|개|일|분|줄)?/);
    const w = g.measureText(t).width; let x = W / 2 - w / 2;
    if (m) { const pre = g.measureText(t.slice(0, m.index)).width, nw = g.measureText(m[0]).width; g.fillStyle = "#ffc994"; g.fillRect(x + pre, y + 2, nw, 7); }
    g.fillStyle = INK; g.fillText(t, x, y);
  });
  // 발도장 칸: 절반 넘게 찍은 달은 달력처럼(쉬는 날은 쿨쿨), 적게 찍은 달은 모은 도장만 — 빈칸이 많아 보이지 않게
  const GX = story ? 54 : 40, GY = sayY + (lines.length > 1 ? sayPx : 6) + (story ? 16 : 22), GW = W - GX * 2;
  const got = d.cells.filter((x) => x.checked), full = got.length >= d.f.days / 2;
  const list = full ? d.cells : got, cols = full ? Math.ceil(list.length / 3) : 10, cell = (GW - 36) / cols;
  const gh = list.length ? 34 + cell * Math.ceil(list.length / cols) + 10 : 0;
  if (list.length) {
    g.fillStyle = "#fffdf8"; g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.roundRect(GX, GY, GW, gh, 22); g.fill(); g.stroke();
    g.font = `${story ? 13 : 15}px ${F.ui}`; g.fillStyle = "#8a7d6d"; g.textAlign = "left"; g.fillText(`${d.f.m}월 발도장 ${d.f.check}개`, GX + 18, GY + 24);
    g.textAlign = "right"; g.fillText(full ? (list.some((x) => !x.checked && !x.future) ? "쉬는 날은 쿨쿨" : "하루도 안 빠졌어") : "하나씩 모으는 중", GX + GW - 18, GY + 24);
    list.forEach((x, i) => {
      const cx = GX + 18 + (i % cols) * cell + cell / 2, cy = GY + 34 + Math.floor(i / cols) * cell + cell / 2, rad = cell * 0.36;
      if (x.checked) paw(cx, cy, cell * 0.8, ((x.day * 37) % 21) - 10);
      else if (x.future) { g.setLineDash([3, 3]); g.strokeStyle = "#e3d8c3"; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.stroke(); g.setLineDash([]); }
      else { g.fillStyle = "#eef3fa"; g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.fill(); g.fillStyle = "#b9c4d6"; g.font = `${Math.max(9, cell * 0.26)}px ${F.ui}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("zZ", cx, cy + 1); g.textBaseline = "alphabetic"; }
    });
  }
  // 서명·로고
  const fy = story ? GY + gh + 26 : H - 24;
  g.textAlign = "left"; g.fillStyle = "#7a6f63"; g.font = `${story ? 26 : 30}px ${F.say}`; g.fillText(d.title, GX, fy + 4);
  g.textAlign = "right"; g.font = `14px ${F.ui}`; g.fillStyle = "#2f6fbd"; g.fillText("meongcare.kr", W - GX, fy);
  const mw = g.measureText("meongcare.kr").width; g.fillStyle = "#a39683"; g.fillText("멍케어 · ", W - GX - mw, fy);
  return new Promise((ok) => c.toBlob(ok, "image/png"));
}
