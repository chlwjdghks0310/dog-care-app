import { useState } from "react";

// 눌러서 펼치는 팁 한 줄(체중 관리·건강 수치 화면)
export default function InfoAccordionItem({ headline, detail }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", padding: 0, textAlign: "left", color: "var(--text)" }}
      >
        <span style={{ fontWeight: 700, fontSize: 14 }}>{headline}</span>
        <span className="subtle" aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <p className="subtle" style={{ marginTop: 8, marginBottom: 0 }}>
          {detail}
        </p>
      )}
    </div>
  );
}
