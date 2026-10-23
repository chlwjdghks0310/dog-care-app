// AI 영상이 말풍선/구름 모양을 잘 못 그려서, 생각 중 말풍선은 HTML/CSS로 직접 그린다.
// 캐릭터가 작은 원으로 줄어든 좌측 상단 자리 옆에 붙여서 쓴다.
// top: 말풍선이 붙을 캐릭터 원의 top 좌표 (그보다 살짝 위에 뜨도록 자동으로 보정한다)
export default function ThinkingBubble({ top = "56px" }) {
  return (
    <div style={{ position: "absolute", top: `calc(${top} - 18px)`, left: 82, zIndex: 6 }} aria-hidden="true">
      <div
        style={{
          background: "var(--field)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "7px 11px",
          boxShadow: "var(--shadow)",
          display: "flex",
          gap: 4,
        }}
      >
        <span className="thinking-dot" style={{ animationDelay: "0s" }} />
        <span className="thinking-dot" style={{ animationDelay: "0.15s" }} />
        <span className="thinking-dot" style={{ animationDelay: "0.3s" }} />
      </div>
      {/* 말풍선 꼬리 (작아지는 원 2개로 구름 말풍선 느낌을 낸다) */}
      <div
        style={{
          position: "absolute",
          bottom: -5,
          left: 8,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: "var(--field)",
          border: "1px solid var(--border)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -12,
          left: 1,
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: "var(--field)",
          border: "1px solid var(--border)",
        }}
      />
    </div>
  );
}
