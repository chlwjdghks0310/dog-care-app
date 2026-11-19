import Ico from "../components/Ico";
import { useHelpTip } from "../components/HelpTip";
export default function HealthHub({ dog, onOpenStool, onOpenBehavior, onBack }) {
  const [tip, panel] = useHelpTip("건강 체크", `${dog.name}의 상태를 직접 골라 기록해요. 기록은 병원용 기록에도 들어가요. AI 사진·영상 확인은 필요할 때만 쓰는 참고용이에요(하루 2번).`); // 11/18: 설명 문단 대신 ? 버튼
  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 병원으로
      </button>
      <div className="h1" style={{ display: "flex", alignItems: "center", gap: 8 }}>건강 체크{tip}</div>
      {panel}
      <div style={{ height: 12 }} />

      {/* 11/19: 글 카드 2장 → 큰 그림 타일 2개(AI티 줄이기) */}
      <div className="quick-actions two hub-tiles">
        <button type="button" className="quick-tile hub-tile" onClick={onOpenStool}>
          <Ico name="toilet" size={52} sticker />
          <span className="quick-tile-label">변 체크</span>
          <span className="hub-sub">모양 1~7 · 색 · 보이는 것</span>
        </button>
        <button type="button" className="quick-tile hub-tile" onClick={onOpenBehavior}>
          <Ico name="smiley" size={52} sticker />
          <span className="quick-tile-label">컨디션 체크</span>
          <span className="hub-sub">기운·식욕·걸음 등 여섯 가지</span>
        </button>
      </div>
      <p className="faint" style={{ marginTop: 12 }}>둘 다 보호자가 직접 고르는 기록이에요. AI 사진·영상 확인은 각 화면 아래에서 필요할 때만(하루 2번).</p>
    </div>
  );
}
