// 오늘 화면 말풍선(11/10): 손으로 그린 구름 SVG를 .sb-body의 border-image로 늘려 쓴다(index.css "구름 말풍선"). 꼬리는 생각 풍선처럼 동그라미 두 개.
export default function SpeechBubble({ children, className = "rise-in" }) {
  return (
    <div className={`sb ${className}`}>
      <div className="sb-body">{children}</div>
      <span className="sb-puff sb-puff1" aria-hidden="true" />
      <span className="sb-puff sb-puff2" aria-hidden="true" />
    </div>
  );
}
