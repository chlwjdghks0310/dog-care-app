// 강아지가 직접 말하는 듯한 문구를 담는 말풍선. 아래쪽에 꼬리(삼각형)가 있어서
// 바로 아래에 있는 캐릭터가 말하고 있다는 느낌을 준다.
export default function SpeechBubble({ children }) {
  return (
    <div style={{ position: "relative", maxWidth: 320, margin: "0 auto" }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: "14px 18px",
          boxShadow: "var(--shadow)",
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.5,
          textAlign: "center",
          whiteSpace: "pre-line",
        }}
      >
        {children}
      </div>
      {/* 말풍선 꼬리: 정사각형을 45도 회전시켜 아래쪽 뾰족한 부분만 보이게 하는 방식 */}
      <div
        style={{
          position: "absolute",
          bottom: -7,
          left: "50%",
          width: 16,
          height: 16,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderTop: "none",
          borderLeft: "none",
          transform: "translateX(-50%) rotate(45deg)",
        }}
      />
    </div>
  );
}
