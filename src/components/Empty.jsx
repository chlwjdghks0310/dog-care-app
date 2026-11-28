import Ico from "./Ico";

// 빈 상태 공용(11/19, 계획표 4번): 회색 한 줄 대신 스티커 하나 + 한 문장 + (있으면) 다음 할 일 단추. 화면마다 제각각이던 "아직 … 없어요"를 한 모양으로.
export default function Empty({ ico = "note", children, action, onAction, compact = false, style }) {
  return (
    <div className={`empty-state${compact ? " compact" : ""}`} style={style}>
      <Ico name={ico} size={compact ? 34 : 46} sticker />
      <p>{children}</p>
      {action && <button type="button" className="btn-ghost small" onClick={onAction}>{action}</button>}
    </div>
  );
}
