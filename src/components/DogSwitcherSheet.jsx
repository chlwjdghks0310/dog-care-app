import Ico from "./Ico";
// 바텀내비 프로필 아이콘을 길게 누르면 뜨는 강아지 전환 목록 (인스타그램 계정 전환과 같은 동작).
export default function DogSwitcherSheet({ dogs, activeDogId, onSelect, onAddDog, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: "18px 18px 0 0",
          maxHeight: "60vh",
          overflowY: "auto",
          paddingBottom: "calc(18px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="h2" style={{ marginBottom: 10 }}>강아지 전환</div>

        {dogs.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelect(d)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              background: "none",
              border: "none",
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              textAlign: "left",
            }}
          >
            {d.photo ? (
              <img src={d.photo} alt="" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover" }} />
            ) : (
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--accent-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "var(--accent-strong)",
                }}
                aria-hidden="true"
              >
                <Ico name="dog" size={24} />
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{d.name}</div>
              <div className="faint">{d.breed}</div>
            </div>
            {d.id === activeDogId && <span style={{ color: "var(--accent-strong)", fontWeight: 700 }}>✓</span>}
          </button>
        ))}

        <button
          onClick={onAddDog}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            background: "none",
            border: "none",
            padding: "10px 0",
            textAlign: "left",
            color: "var(--accent-strong)",
            fontWeight: 600,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "1px dashed var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
            }}
          >
            +
          </span>
          강아지 추가
        </button>
      </div>
    </div>
  );
}
