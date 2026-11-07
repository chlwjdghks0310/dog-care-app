import Ico from "../components/Ico";
export default function HealthHub({ dog, onOpenStool, onOpenBehavior, onBack }) {
  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 오늘 할 일로
      </button>
      <div className="h1">건강 체크</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        {dog.name}의 상태를 직접 골라 기록해요. 기록은 병원용 기록에도 들어가요. AI 사진·영상 확인은 필요할 때만 쓰는 참고용이에요(하루 2번).
      </p>

      <button
        className="card"
        onClick={onOpenStool}
        style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 12, border: "1px solid var(--border)" }}
      >
        <div className="h2"><Ico name="camera" size={20} /> 변 체크</div>
        <p className="subtle">모양(1~7)·색·보이는 것을 골라 기록해요. AI 사진 확인은 선택이에요.</p>
      </button>

      <button
        className="card"
        onClick={onOpenBehavior}
        style={{ display: "block", width: "100%", textAlign: "left", border: "1px solid var(--border)" }}
      >
        <div className="h2"><Ico name="video" size={20} /> 컨디션 체크</div>
        <p className="subtle">기운·식욕·걸음걸이 등 여섯 가지를 평소와 비교해 기록해요. AI 영상 보기는 선택이에요.</p>
      </button>
    </div>
  );
}
