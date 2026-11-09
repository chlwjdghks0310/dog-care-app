// 강아지가 직접 말하는 듯한 문구를 담는 말풍선 — 손그림 느낌(11/10 사용자 요청): 네 귀가 조금씩 다른 둥근 모서리, 잉크색 선 두 겹,
// 종이 오려 붙인 듯한 그림자, 꼬리는 손으로 그린 곡선(SVG). 안의 버튼·글도 .sb 아래 CSS에서 같은 느낌으로 맞춘다(index.css "손그림 말풍선").
export default function SpeechBubble({ children, className = "rise-in" }) {
  return (
    <div className={`sb ${className}`}>
      <div className="sb-body">{children}</div>
      <svg className="sb-tail" viewBox="0 0 32 20" width="32" height="20" aria-hidden="true">
        {/* 몸통 테두리를 덮는 채움 → 양옆 선만 따로 그려 손선처럼 */}
        <path d="M3 0 H30 V2.5 C 23 6.5, 18 12.5, 14.5 19 C 12 13.5, 9 8.5, 3 2.5 Z" fill="var(--surface)" />
        <path d="M30 2 C 23 6.5, 18 12.5, 14.5 19 C 12 13.5, 9 8.5, 3 2" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
