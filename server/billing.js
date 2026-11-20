import { CATALOG, POLICY } from "../src/services/billingCatalog.js";

// 결제 서버(11/20): 사업자등록 전이라 잠겨 있다(BILLING_OPEN=1 전까지 503). 가격·정책은 앱과 같은 파일(src/services/billingCatalog.js)을 읽어 어긋나지 않는다.
// 열 때 할 일(사업자등록 뒤): 토스페이먼츠 빌링키 — /checkout이 결제창 주소를 돌려주고, /confirm이 승인·빌링키 저장, /webhook이 자동결제 결과,
// 결제 7일 전 이메일(POLICY.renewNotice), 환불 /refund(refundOnCancel과 같은 식), 표는 supabase/billing.sql(기록 5년).
export function mountBilling(app, { tooMany }) {
  const isOpen = () => process.env.BILLING_OPEN === "1";
  app.get("/api/billing/catalog", (req, res) => res.json({ open: isOpen(), catalog: CATALOG, policy: POLICY }));
  const closed = (res) => res.status(503).json({ error: "결제는 정식 출시 때 열려요. 지금은 베타 코드로 같은 걸 무료로 쓸 수 있어요.", open: false });
  app.post("/api/billing/checkout", (req, res) => {
    if (tooMany(req)) return res.status(429).json({ error: "잠시 뒤 다시 시도해 주세요" });
    const items = Array.isArray(req.body?.items) ? req.body.items.filter((i) => typeof i === "string" && Object.hasOwn(CATALOG, i)) : [];
    if (!items.length) return res.status(400).json({ error: "고른 상품이 없어요" });
    if (!isOpen()) return closed(res);
    res.status(501).json({ error: "결제 연동 준비 중이에요" }); // 토스페이먼츠 연동 자리
  });
  for (const p of ["/api/billing/confirm", "/api/billing/cancel", "/api/billing/refund"]) app.post(p, (req, res) => (isOpen() ? res.status(501).json({ error: "준비 중" }) : closed(res)));
  return { isOpen };
}
