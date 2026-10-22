import { readJSON, writeJSON } from "./storage";

// AI 정보 전송 동의 — 처음 AI(질문·사진·영상·음성)를 쓸 때 한 번 묻는다(앱스토어 5.1.2: 외부 AI로 보내기 전 명시 동의).
// 동의하면 이 기기에 기억하고, 거절하면 아무것도 보내지 않는다. 묻는 화면은 components/AIConsent.jsx(필요할 때만 불러옴 — 노드 테스트에서도 import 가능하게).
const KEY = "dogcare-ai-consent-v1";
export const hasAIConsent = () => readJSON(KEY, null)?.agreed === true;
export const setAIConsent = (agreed) => writeJSON(KEY, agreed ? { agreed: true, at: new Date().toISOString() } : null);

let pending = null;
export function ensureAIConsent() {
  if (typeof document === "undefined" || hasAIConsent()) return Promise.resolve();
  pending ||= import("../components/AIConsent.jsx")
    .then((m) => m.askConsent())
    .then((agreed) => {
      pending = null;
      if (!agreed) throw Object.assign(new Error("AI 정보 전송에 동의하지 않아 보내지 않았어요."), { consent: false });
      setAIConsent(true);
    }, (err) => ((pending = null), Promise.reject(err)));
  return pending;
}
