import { readJSON, writeJSON } from "./storage";
import { CATALOG, PLUS_MONTH, CHAR_BASIC, STAMP_DISCOUNT, priceOf } from "./billingCatalog";
import { API_BASE } from "./aiClient";

export * from "./billingCatalog";

// 결제(11/20): 사업자등록 전이라 결제 자체는 잠겨 있다(BILLING_OPEN=false). 화면·견적·환불 계산·기록은 다 만들어 두고,
// 베타 동안은 결제 자리에서 플러스/초대 코드를 쓴다. 토스페이먼츠 연동은 사업자등록 뒤 서버(server/billing.js)에서 연다.
export const BILLING_OPEN = false;

const KEY = "dogcare-billing-v1"; // { [dogId]: { plan: {id, startedAt, nextAt, source:"beta"|"card", last4?, canceledAt?} | null, orders: [{id, at, items:[{id,title,price}], total, source}] } }
const all = () => readJSON(KEY, {}) || {};
export const getBilling = (dogId) => all()[dogId] || { plan: null, orders: [] };
const save = (dogId, patch) => { const a = all(); a[dogId] = { ...getBilling(dogId), ...patch }; writeJSON(KEY, a); window.dispatchEvent(new CustomEvent("dogcare-billing-changed")); return a[dogId]; };

// 날짜: 같은 날짜로 n달 뒤(31일 → 다음 달 말일로 당김)
export function addMonthsClamp(iso, n) {
  const d = new Date(iso);
  const day = d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes());
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last));
  return t.toISOString();
}
// 시작한 달 수(시작 날짜 기준으로 새 달에 하루라도 들어가면 한 달로 센다): 11/20 시작 → 11/20 1 · 12/20 2 · 2/10 3
export function monthsUsed(startedAt, now = new Date()) {
  const s = new Date(startedAt), e = new Date(now);
  if (e < s) return 1;
  let m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() < s.getDate()) m -= 1;
  return Math.max(1, m + 1);
}
const fmtDate = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const won = (n) => `${Math.round(n).toLocaleString()}원`;

// 중도 해지 때 돌려줄 돈(사용자 11/20 정책). 연간: 38,900 − 쓴 달 × 3,900 − (캐릭터 만들었으면 4,900). 월간: 0, 결제일 전날까지 사용
export function refundOnCancel({ planId, startedAt, now = new Date(), characterMade = false }) {
  const p = CATALOG[planId];
  if (!p || p.kind !== "plus") return null;
  const nextAt = addMonthsClamp(startedAt, p.period === "year" ? 12 : 1);
  if (p.period === "month") return { refund: 0, usableUntil: fmtDate(nextAt), lines: [`해지해도 ${fmtDate(nextAt)} 전날까지 쓸 수 있어요`, "다음 달부터 결제되지 않아요"] };
  const used = Math.min(12, monthsUsed(startedAt, now));
  const usedAmt = used * PLUS_MONTH;
  const charAmt = characterMade ? CHAR_BASIC : 0;
  const refund = Math.max(0, p.price - usedAmt - charAmt);
  return { refund, used, usedAmt, charAmt, usableUntil: fmtDate(nextAt), lines: [`${p.price.toLocaleString()} − 쓴 ${used}달 × ${PLUS_MONTH.toLocaleString()}${characterMade ? ` − 만든 캐릭터 ${CHAR_BASIC.toLocaleString()}` : ""} = ${refund.toLocaleString()}원`, "위약금 없음 · 3영업일 안에 결제한 카드로"] };
}

// 견적: 고른 것 → 줄·합계. plus면 추가 옵션 할인가, 배지 할인권은 정성에만
export function quote({ items, plus = false, stampDiscount = false }) {
  const lines = [];
  for (const id of items) {
    const p = CATALOG[id]; if (!p) continue;
    const price = priceOf(id, { plus });
    lines.push({ id, title: p.title, price, note: plus && p.plusPrice != null && p.plusPrice < p.price ? `플러스 할인 (정가 ${won(p.price)})` : "" });
    if (p.kind === "plus" && p.includesCharacter) lines.push({ id: "incl_char", title: "기본 캐릭터 1번", price: 0, note: "포함", included: true });
  }
  if (stampDiscount && items.includes("char_premium")) lines.push({ id: "stamp", title: "배지 10개 할인권", price: -STAMP_DISCOUNT, note: "" });
  const total = Math.max(0, lines.reduce((a, l) => a + l.price, 0));
  const plan = items.map((i) => CATALOG[i]).find((p) => p?.kind === "plus") || null;
  const startedAt = new Date().toISOString();
  return { lines, total, plan, nextAt: plan ? fmtDate(addMonthsClamp(startedAt, plan.period === "year" ? 12 : 1)) : null, startedAt: fmtDate(startedAt), totalKorean: koreanNumber(total) };
}

// 금액 한글 병기(전상법 지침 5나): 38900 → 삼만팔천구백
export function koreanNumber(n) {
  n = Math.round(Math.abs(n)); if (n === 0) return "영";
  const D = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"], U = ["", "십", "백", "천"], B = ["", "만", "억"];
  let out = "", gi = 0;
  while (n > 0) { let g = n % 10000, s = ""; for (let i = 0; g > 0; i++) { const d = g % 10; if (d) s = (d === 1 && i > 0 ? "" : D[d]) + U[i] + s; g = Math.floor(g / 10); } if (s) out = s + B[gi] + out; n = Math.floor(n / 10000); gi++; }
  return out;
}

// 베타: 코드로 플러스가 열렸을 때 장부에 적는다(결제 0원). 정식 결제 때도 같은 모양으로 쌓인다
export function recordBetaPlus(dogId, code) {
  const b = getBilling(dogId);
  if (b.plan?.source === "beta") return b;
  const at = new Date().toISOString();
  return save(dogId, { plan: { id: "plus_beta", title: "플러스 (베타)", startedAt: at, nextAt: null, source: "beta" }, orders: [{ id: `beta-${Date.now()}`, at, items: [{ id: "plus_beta", title: `플러스 코드 ${String(code || "").slice(0, 7)}…`, price: 0 }], total: 0, source: "beta" }, ...b.orders] });
}
export function recordBetaCharacter(dogId, code) {
  const b = getBilling(dogId);
  if (b.orders.some((o) => o.items.some((i) => i.id === "char_beta"))) return b;
  const at = new Date().toISOString();
  return save(dogId, { orders: [{ id: `beta-c-${Date.now()}`, at, items: [{ id: "char_beta", title: `캐릭터 초대 코드 ${String(code || "").slice(0, 7)}…`, price: 0 }], total: 0, source: "beta" }, ...b.orders] });
}

// 결제 시작: 지금은 서버가 503으로 "정식 출시 때"를 돌려준다. 열리면 서버가 토스페이먼츠 결제창 주소를 준다
export async function startCheckout({ dogId, items, plus }) {
  if (!BILLING_OPEN) return { open: false };
  const res = await fetch(`${API_BASE}/api/billing/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId: dogId, items, plus }), signal: AbortSignal.timeout(15_000) })
    .catch(() => { throw new Error("서버에 연결할 수 없어요. 인터넷을 확인하고 다시 시도해 주세요"); });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `결제를 시작하지 못했어요 (${res.status})`);
  return { open: true, ...data };
}
