import { useState } from "react";
import InfoAccordionItem from "../components/InfoAccordion";

const CONTACT_EMAIL = "meongcare.app@gmail.com";

// 자주 묻는 질문 — 문의 전에 먼저 보여 준다(앱에 실제로 있는 메뉴 이름으로 안내)
const FAQ = [
  ["폰을 바꾸거나 앱을 지우면 기록이 사라지나요?", "로그인하지 않으면 기록이 이 폰에만 있어서 사라질 수 있어요. 설정(☰) → 백업·로그인에서 카카오나 이메일로 로그인하면 기록이 서버에 백업돼, 새 폰에서 같은 방법으로 로그인하면 그대로 불러와요."],
  ["알림이 오지 않아요.", "체크리스트 → 알림·알람에서 [알림 켜기]를 누르고 알림을 허용해 주세요. 아이폰은 사파리 공유 버튼 → \"홈 화면에 추가\"로 설치한 앱에서만 알림이 와요. 휴대폰이 무음·집중 모드면 소리 없이 올 수 있어요."],
  ["가족과 같이 기록할 수 있나요?", "네. 설정(☰) → 가족 공유에서 초대 코드를 만들어 가족에게 보내 주세요. 가족이 앱에서 코드를 넣으면 같은 강아지 기록을 함께 보고 적을 수 있어요(둘 다 로그인이 필요해요)."],
  ["AI 답변을 믿어도 되나요?", "AI 답변은 기록과 공개된 수의학 자료를 바탕으로 한 참고용이에요. 진단이나 처방이 아니니, 걱정되는 증상이 있거나 응급 상황이면 바로 동물병원에 문의해 주세요."],
  ["계정이나 기록을 지우고 싶어요.", "설정(☰) → 백업·로그인 → [계정 삭제]로 서버에 백업된 기록과 로그인 정보를 지울 수 있어요. 한 마리 기록만 지우려면 설정 맨 아래 [이 강아지 삭제]를 눌러 주세요."],
];

export default function Contact({ onBack }) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("[멍케어 문의]")}&body=${encodeURIComponent(message)}`;

  // 메일 앱으로 넘긴 뒤 돌아오면 감사 화면
  if (sent) {
    return (
      <div className="screen" style={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 8 }} aria-hidden="true">🐾</div>
        <div className="h1">문의해 주셔서 고마워요!</div>
        <p className="subtle" style={{ margin: "8px 0 4px" }}>
          보내 주신 내용은 꼼꼼히 읽고 <b style={{ color: "var(--text)" }}>1시간 이내</b>에 메일로 답변드릴게요.
        </p>
        <p className="faint" style={{ marginBottom: 20 }}>메일 앱에서 [보내기]까지 눌러야 접수돼요. 아직 안 보냈다면 다시 보내 주세요.</p>
        <button type="button" className="btn-ghost" style={{ marginBottom: 8 }} onClick={() => setSent(false)}>
          다시 보내기
        </button>
        {onBack && (
          <button type="button" className="btn-primary" onClick={onBack}>
            돌아가기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="screen">
      {onBack && (
        <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
          ← 설정으로
        </button>
      )}
      <div className="h1">문의하기</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        궁금한 점이나 불편한 점을 알려 주세요. <b style={{ color: "var(--text)" }}>1시간 이내</b>에 답변드려요.
      </p>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2" style={{ marginBottom: 2 }}>자주 묻는 질문</div>
        {FAQ.map(([q, a]) => (
          <InfoAccordionItem key={q} headline={q} detail={a} />
        ))}
      </div>

      <div className="card">
        <div className="field">
          <label>문의 내용</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="궁금한 점이나 불편한 점을 자유롭게 적어 주세요."
            rows={6}
            style={{ resize: "vertical" }}
          />
        </div>
        <a
          className="btn-primary"
          href={mailtoHref}
          onClick={() => setTimeout(() => setSent(true), 300)}
          style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 8 }}
        >
          메일로 문의하기
        </a>
        <p className="faint" style={{ marginTop: 8 }}>{CONTACT_EMAIL}로 메일 앱이 열려요.</p>
      </div>
    </div>
  );
}
