import { createPortal } from "react-dom";

// 개인정보 처리방침(초안) — 개인정보보호법 제30조·시행령 제31조 항목 기준(자료용 조사: ../자료용/자료/2026-10-20-supabase-카카오로그인.md).
// ⚠️ 법률 검토 전 초안. 아래 OPERATOR의 빈칸(운영자·연락처·시행일)은 사용자가 채워야 하고, 국외 이전 해당 여부는 법률 확인이 필요하다.
const OPERATOR = {
  name: "[운영자 이름 또는 상호]",
  contact: "[개인정보 보호책임자 이메일]",
  effective: "[시행일: 0000년 0월 0일]",
};

const SECTIONS = [
  ["1. 처리 목적", "로그인, 반려견 기록의 서버 백업과 기기 간 불러오기, 가족 공유, 알림 발송, 문의 응대를 위해 개인정보를 처리합니다."],
  [
    "2. 처리하는 항목",
    "· 카카오 로그인: 카카오 회원 번호, 닉네임, 프로필 사진(동의한 경우)\n· 이메일 로그인: 이메일 주소\n· 서비스 이용 중 생성: 반려견 프로필·건강 기록·일정·가계부·약 기록, 가족 공유 시 표시 이름, 접속 기록, 알림 수신용 기기 정보",
  ],
  ["3. 보유 기간", "회원 탈퇴 또는 백업 해제를 요청할 때까지 보관하고, 요청 후 지체 없이 파기합니다. 법령에 따라 보관해야 하는 경우에는 그 기간 동안 보관합니다."],
  ["4. 제3자 제공", "이용자의 동의나 법령에 근거가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다. 단, 가족 공유를 켜면 초대한 가족이 해당 반려견의 기록과 이용자의 표시 이름을 볼 수 있습니다."],
  [
    "5. 처리 위탁과 국외 이전",
    "· Supabase Inc.(데이터 저장·로그인, 저장 위치: 대한민국 서울 리전)\n· Render(앱 서버 운영)\n· Anthropic(AI 상담·사진 분석), Google(영상 분석) — 이용자가 AI에 보낸 질문·사진·영상과 반려견 정보가 답변 생성을 위해 전송됩니다.\n[국외 이전 해당 여부와 이전 국가·시기·방법은 법률 확인 후 기재]",
  ],
  ["6. 파기 절차와 방법", "보유 기간이 끝나거나 처리 목적이 달성된 개인정보는 지체 없이 복구할 수 없는 방법으로 삭제합니다."],
  ["7. 이용자의 권리", "이용자는 언제든지 개인정보의 열람·정정·삭제·처리 정지를 요청할 수 있으며, 아래 연락처로 요청하면 지체 없이 조치합니다. 로그아웃해도 이 기기에 저장된 기록은 남아 있습니다."],
  ["8. 안전성 확보 조치", "데이터베이스 접근 권한을 본인과 초대한 가족으로 제한하고(행 단위 접근 제어), 전송 구간을 암호화(HTTPS)합니다."],
  ["9. 만 14세 미만", "이 서비스는 만 14세 미만 아동을 대상으로 하지 않습니다."],
];

export default function PrivacyPolicy({ onClose }) {
  return createPortal(
    <div className="settings-sheet" role="dialog" aria-label="개인정보 처리방침" style={{ zIndex: 130 }}>
      <div className="settings-head">
        <div className="h1" style={{ margin: 0 }}>개인정보 처리방침</div>
        <button type="button" className="btn-ghost" onClick={onClose}>
          닫기
        </button>
      </div>
      <div className="card">
        <p className="subtle" style={{ marginTop: 0 }}>
          {OPERATOR.name}(이하 "멍케어")는 개인정보 보호법에 따라 이용자의 개인정보를 보호하고 관련 고충을 원활하게 처리하기 위해 다음과 같이 처리방침을 둡니다.
        </p>
        {SECTIONS.map(([title, body]) => (
          <div key={title} style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
            <div className="subtle" style={{ whiteSpace: "pre-line" }}>{body}</div>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>10. 개인정보 보호책임자</div>
          <div className="subtle">
            {OPERATOR.name} · {OPERATOR.contact}
          </div>
        </div>
        <p className="faint" style={{ marginTop: 14, marginBottom: 0 }}>{OPERATOR.effective}부터 적용합니다.</p>
      </div>
    </div>,
    document.body
  );
}
