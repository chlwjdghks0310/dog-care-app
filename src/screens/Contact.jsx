import { useState } from "react";

const CONTACT_EMAIL = "bluelovei05@gmail.com";

export default function Contact({ onBack }) {
  const [message, setMessage] = useState("");

  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    "[멍케어 문의]"
  )}&body=${encodeURIComponent(message)}`;

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 프로필로
      </button>
      <div className="h1">문의하기</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        궁금한 점이나 불편한 점을 적어주시면 메일 앱으로 보낼 수 있도록 연결해드려요.
      </p>

      <div className="card">
        <div className="field">
          <label>문의 내용</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="궁금한 점이나 불편한 점을 자유롭게 적어주세요."
            rows={6}
            style={{ resize: "vertical" }}
          />
        </div>
        <a
          className="btn-primary"
          href={mailtoHref}
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 8 }}
        >
          메일로 문의하기
        </a>
        <p className="faint" style={{ marginTop: 8 }}>{CONTACT_EMAIL}로 전송돼요.</p>
      </div>
    </div>
  );
}
