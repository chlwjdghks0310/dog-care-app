export default function Onboarding({ onStart }) {
  return (
    <div className="screen" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: "70vh" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }} aria-hidden="true">🐾</div>
      <div className="h1">멍케어</div>
      <p className="subtle" style={{ marginBottom: 28, maxWidth: 320 }}>
        우리 강아지를 등록하면, 지금 우리 강아지에게 필요한 일을 알려드려요.
      </p>
      <button className="btn-primary" style={{ maxWidth: 260 }} onClick={onStart}>
        시작하기
      </button>
    </div>
  );
}
