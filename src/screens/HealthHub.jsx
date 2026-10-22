export default function HealthHub({ dog, onOpenStool, onOpenBehavior, onBack }) {
  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 체크리스트로
      </button>
      <div className="h1">건강 체크</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        {dog.name}의 상태를 사진/영상으로 확인해보세요. 참고용 분석이며 진단을 대신하지 않아요.
      </p>

      <button
        className="card"
        onClick={onOpenStool}
        style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 12, border: "1px solid var(--border)" }}
      >
        <div className="h2">📷 변 상태 확인</div>
        <p className="subtle">사진으로 대변 굳기/색상을 퓨리나 대변 점수표 기준으로 확인해요.</p>
      </button>

      <button
        className="card"
        onClick={onOpenBehavior}
        style={{ display: "block", width: "100%", textAlign: "left", border: "1px solid var(--border)" }}
      >
        <div className="h2">🎥 활동 상태 확인</div>
        <p className="subtle">짧은 영상으로 자세·걸음걸이·스트레스 신호를 확인해요.</p>
      </button>
    </div>
  );
}
