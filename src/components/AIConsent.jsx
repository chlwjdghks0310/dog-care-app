import { useState } from "react";
import { createRoot } from "react-dom/client";
import { hasAIConsent, setAIConsent } from "../services/aiConsent";

// AI 정보 전송 동의 화면(상태·저장은 services/aiConsent.js). askConsent()는 시트를 띄우고 동의 여부(true/false)를 돌려준다.
export function askConsent() {
  return new Promise((resolve) => {
    const el = document.body.appendChild(document.createElement("div"));
    const root = createRoot(el);
    const done = (agreed) => {
      root.unmount();
      el.remove();
      resolve(agreed);
    };
    root.render(<ConsentSheet onDone={done} />);
  });
}

function ConsentSheet({ onDone }) {
  return (
    <div className="es-backdrop" style={{ zIndex: 200 }}>
      <div className="es-sheet" role="dialog" aria-modal="true" aria-label="AI 정보 전송 동의">
        <div className="es-top">
          <span className="es-title">AI 기능을 쓰기 전에</span>
        </div>
        <div className="es-scroll" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
          <p className="subtle" style={{ margin: 0 }}>
            말로 기록하기와 AI 사진·영상 확인(선택)을 쓰려면 아래 정보가 외부 AI 회사로 전송돼요.
          </p>
          <ul className="subtle" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>
              <b>보내는 것:</b> 기록하려고 적거나 말한 문장, AI 확인을 누른 사진·영상, 말로 입력한 음성, <b>진료 정리에 넣은 영수증·진료비 내역·처방전·약봉투 사진</b>, 그리고 기록에 필요한 강아지 정보(프로필과 최근 기록 요약)
            </li>
            <li>
              <b>받는 곳:</b> Anthropic(말로 기록하기·사진 확인·진료 정리), Google(영상 확인·음성 받아쓰기)
            </li>
            <li>
              <b>쓰는 곳:</b> 기록 정리와 확인 결과를 만드는 데만 쓰고, 음성은 글자로 바꾼 뒤 저장하지 않아요. 멍케어는 이 정보를 광고에 쓰지 않아요.
            </li>
          </ul>
          <p className="faint" style={{ margin: 0 }}>동의하지 않아도 기록·일정·알림 등 다른 기능은 그대로 쓸 수 있어요. 설정에서 언제든 철회할 수 있어요.</p>
          <button type="button" className="btn-primary" onClick={() => onDone(true)}>
            동의하고 계속하기
          </button>
          <button type="button" className="btn-ghost" onClick={() => onDone(false)}>
            동의하지 않음
          </button>
        </div>
      </div>
    </div>
  );
}

// 설정 화면: 동의 상태와 철회
export function AIConsentCard() {
  const [agreed, setAgreed] = useState(hasAIConsent);
  const toggle = () => {
    if (agreed && !window.confirm("동의를 철회할까요? 말로 기록하기·AI 사진·영상 확인·음성 입력을 쓰려면 다시 동의해야 해요.")) return;
    setAIConsent(!agreed);
    setAgreed(!agreed);
  };
  return (
    <div className="section">
      <div className="h2">AI 정보 전송</div>
      <p className="subtle" style={{ margin: "0 0 10px" }}>
        {agreed ? "동의함 — AI를 쓸 때 질문·사진·영상·음성과 강아지 정보가 Anthropic·Google로 전송돼요." : "동의 안 함 — AI 기능을 처음 쓸 때 다시 물어볼게요."}
      </p>
      <button type="button" className="btn-ghost small" onClick={toggle}>
        {agreed ? "동의 철회" : "지금 동의하기"}
      </button>
    </div>
  );
}
