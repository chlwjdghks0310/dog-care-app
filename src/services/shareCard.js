// 주간 결산 카드(공유용 그림 1080×1350): 공유하면 앱이 알려지는 고리(방향 정리 — 캐릭터 아이디어 흡수, 바이럴 장치로만).
// 남에게 보이는 그림이라 건강 문제(무른 변·증상·병원)는 넣지 않고 함께한 기록만: 함께 본 날·산책·몸무게·기록 수.
import { buildWeeklyReport } from "./weeklyReport";
import { daysInRange } from "./dailyCheck";
import { md } from "./records";
import { josa } from "../utils/text";

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

const loadImg = (src) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });

export async function drawWeeklyCard(dog, today) {
  const s = weeklyCardStats(dog, today);
  const W = 1080, H = 1350, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  const font = (w, px) => `${w} ${px}px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#eaf2fd"); bg.addColorStop(1, "#fdf1e6");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // 사진(없으면 멍케어 강아지 그림)
  try {
    const img = await loadImg(dog.photo || "/intro/img/dog-yeoreum-sit.png");
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
    const x = 90 + (i % 2) * 460, y = 780 + Math.floor(i / 2) * 210;
    g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(x, y, 440, 180, 36); g.fill();
    g.textAlign = "left"; g.fillStyle = "#7a6f63"; g.font = font(600, 36); g.fillText(k, x + 40, y + 66);
    g.fillStyle = "#2f6fbd"; g.font = font(800, 60); g.fillText(v, x + 40, y + 140);
  });
  g.textAlign = "center"; g.fillStyle = "#2f6fbd"; g.font = font(800, 40); g.fillText("🐾 멍케어로 기록했어요", W / 2, 1255);
  g.fillStyle = "#7a6f63"; g.font = font(500, 32); g.fillText("meongcare.kr", W / 2, 1305);
  return new Promise((ok) => c.toBlob(ok, "image/png"));
}
