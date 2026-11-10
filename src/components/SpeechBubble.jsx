// 오늘 화면 말풍선(11/10 구름 모양): 뒤에 깔린 .sb-cloud가 둥근 몸통+가장자리 동그라미 묶음을 그리고,
// filter drop-shadow로 그 묶음 바깥에만 잉크 선을 두른다(안쪽 글·버튼엔 선이 안 생기게 층을 나눔). 꼬리는 생각 풍선처럼 동그라미 두 개.
export default function SpeechBubble({ children, className = "rise-in" }) {
  return (
    <div className={`sb ${className}`}>
      <div className="sb-cloud" aria-hidden="true" />
      <div className="sb-body">{children}</div>
      <span className="sb-puff sb-puff1" aria-hidden="true" />
      <span className="sb-puff sb-puff2" aria-hidden="true" />
    </div>
  );
}
