import { createPortal } from "react-dom";
import { useSwipeClose } from "./SwipeBack";

// 개인정보 처리방침(초안) — 개인정보보호법 제30조·시행령 제31조 항목 기준(자료용 조사: ../자료용/자료/2026-10-20-supabase-카카오로그인.md).
// ⚠️ 법률 검토 전 초안. 운영자·연락처·시행일은 사용자가 정한 값(2026-10-22). 국외 이전 해당 여부는 법률 확인이 필요하다.
const OPERATOR = {
  name: "멍케어(대표 최정환)",
  contact: "meongcare.app@gmail.com",
  effective: "2026년 10월 22일",
  revised: "2026년 10월 31일",
};

const SECTIONS = [
  ["1. 처리 목적", "로그인, 반려견 기록의 서버 백업과 기기 간 불러오기, 가족 공유, 알림 발송, 문의 응대를 위해 개인정보를 처리합니다."],
  [
    "2. 처리하는 항목",
    "· 카카오 로그인: 카카오 회원 번호, 닉네임, 프로필 사진(동의한 경우)\n· 이메일 로그인: 이메일 주소\n· 서비스 이용 중 생성: 반려견 프로필·건강 기록·일정·가계부·약 기록, 가족 공유 시 표시 이름, 접속 기록, 알림 수신용 기기 정보\n· 로그인하지 않으면 기록은 이 기기(브라우저 저장소)에만 저장되고 서버로 보내지 않습니다(AI 기능을 쓸 때 보낸 내용은 5번 참고).",
  ],
  ["3. 보유 기간", "계정을 삭제할 때까지 보관하고, 삭제하면 지체 없이 파기합니다(설정 → 백업·로그인 → 계정 삭제). 가족과 함께 쓰던 반려견의 기록은 남은 가족의 기록으로 계속 보관됩니다. 법령에 따라 보관해야 하는 경우에는 그 기간 동안 보관합니다."],
  ["4. 제3자 제공", "이용자의 동의나 법령에 근거가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다. 단, 가족 공유를 켜면 초대한 가족이 해당 반려견의 기록과 이용자의 표시 이름을 볼 수 있습니다."],
  [
    "5. 처리 위탁과 국외 이전",
    "· Supabase Inc.(데이터 저장·로그인, 저장 위치: 대한민국 서울 리전)\n· Render(앱 서버 운영)\n· 알림 발송: 이용자 기기의 푸시 서비스(Apple, Google 등) — 알림을 켠 경우 알림 내용과 기기 알림 주소가 전달됩니다.\n· jsDelivr(글꼴 파일 전송) — 화면 글꼴을 받을 때 접속 IP 등 일반적인 접속 정보가 전달될 수 있습니다.\n· Anthropic(AI 상담·사진 분석), Google(영상 분석·음성 받아쓰기) — 이용자가 AI에 보낸 질문·사진·영상·음성과 반려견 정보가 답변 생성과 받아쓰기를 위해 전송됩니다. 음성은 글자로 바꾼 뒤 저장하지 않습니다. AI 기능을 처음 쓸 때 전송 동의를 받고, 동의하지 않으면 전송하지 않습니다(설정에서 철회 가능).\n[국외 이전 해당 여부와 이전 국가·시기·방법은 법률 확인 후 기재]",
  ],
  ["6. 파기 절차와 방법", "보유 기간이 끝나거나 처리 목적이 달성된 개인정보는 지체 없이 복구할 수 없는 방법으로 삭제합니다."],
  ["7. 이용자의 권리", "이용자는 언제든지 개인정보의 열람·정정·삭제·처리 정지를 요청할 수 있습니다.\n· 앱에서 직접: 설정(☰) → 백업·로그인 → 계정 삭제(서버 기록과 로그인 정보 삭제), 설정 맨 아래 [이 강아지 삭제](그 반려견 기록 삭제)\n· 앱을 쓸 수 없으면: 아래 이메일로 \"개인정보 삭제 요청\"과 로그인에 쓴 이메일(카카오면 닉네임)을 보내 주시면 본인 확인 후 10일 안에 처리하고 결과를 알려 드립니다.\n로그아웃해도 이 기기에 저장된 기록은 남아 있습니다."],
  [
    "8. 쿠키와 기기 저장소",
    "광고·분석용 쿠키나 추적 도구를 쓰지 않습니다. 앱은 기록·설정과 로그인 상태를 유지하기 위해 기기의 브라우저 저장소(로컬 스토리지)를 씁니다. 이 저장소는 서비스 제공에 꼭 필요한 것이라 따로 동의를 받지 않으며, 브라우저 설정에서 사이트 데이터를 지우면 삭제됩니다(로그인하지 않은 기록도 함께 지워집니다). 광고·분석 도구를 쓰게 되면 이 방침을 고치고 사전에 동의를 받습니다.",
  ],
  ["9. 안전성 확보 조치", "데이터베이스 접근 권한을 본인과 초대한 가족으로 제한하고(행 단위 접근 제어), 전송 구간을 암호화(HTTPS)합니다."],
  ["10. 만 14세 미만", "이 서비스는 만 14세 미만 아동을 대상으로 하지 않습니다."],
];

export default function PrivacyPolicy({ onClose }) {
  const swipeClose = useSwipeClose(onClose);
  return createPortal(
    <div className="settings-sheet" role="dialog" aria-label="개인정보 처리방침" style={{ zIndex: 130 }} {...(onClose && swipeClose)}>
      <div className="settings-head">
        <div className="h1" style={{ margin: 0 }}>개인정보 처리방침</div>
        {onClose && (
          <button type="button" className="btn-ghost" onClick={onClose}>
            닫기
          </button>
        )}
      </div>
      <div className="card">
        <p className="subtle" style={{ marginTop: 0 }}>
          {OPERATOR.name}는 개인정보 보호법에 따라 이용자의 개인정보를 보호하고 관련 고충을 원활하게 처리하기 위해 다음과 같이 처리방침을 둡니다.
        </p>
        {SECTIONS.map(([title, body]) => (
          <div key={title} style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
            <div className="subtle" style={{ whiteSpace: "pre-line" }}>{body}</div>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>11. 개인정보 보호책임자</div>
          <div className="subtle">
            {OPERATOR.name} · {OPERATOR.contact}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>12. 권익 침해 구제 방법</div>
          <div className="subtle" style={{ whiteSpace: "pre-line" }}>
            {"개인정보 침해로 상담이 필요하면 아래 기관에 문의할 수 있습니다.\n· 개인정보분쟁조정위원회 1833-6972 (kopico.go.kr)\n· 개인정보침해신고센터 118 (privacy.kisa.or.kr)\n· 대검찰청 1301 / 경찰청 182"}
          </div>
        </div>
        <p className="faint" style={{ marginTop: 14, marginBottom: 0 }}>{OPERATOR.effective}부터 적용합니다({OPERATOR.revised} 개정).</p>
      </div>
    </div>,
    document.body
  );
}
