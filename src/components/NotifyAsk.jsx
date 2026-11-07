import { useState } from "react";
import Ico from "./Ico";
import { getPermission, isPushSupported, subscribeToPush } from "../services/notifications";
import { readJSON, writeJSON } from "../services/storage";
import { checkAlarmPlan } from "../services/routine";

// 알림 허락은 첫 기록을 해낸 뒤에 한 번만 묻는다(Apple HIG: 써 본 뒤에 권한 요청 — ../자료용/자료/2026-11-07-온보딩-2장.md).
// 등록 중에 묻던 것을 옮겼다. 이미 켰거나, 거절했거나, [나중에]를 눌렀거나, 지원 안 하는 기기면 묻지 않는다.
const KEY = "dogcare-notify-asked-v1";
const isStandalone = () => window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
const everChecked = (dogId) => Object.keys(readJSON("dogcare-daily-check-v1", {})[dogId] || {}).length > 0;

// "20:30" → "저녁 8시 30분"
const when = (t) => {
  const h = Number(t.slice(0, 2)), m = Number(t.slice(3, 5));
  const part = h < 5 ? "새벽 " : h < 12 ? "아침 " : h < 18 ? "오후 " : "저녁 ";
  return `${part}${h % 12 || 12}시${m ? ` ${m}분` : ""}`;
};

export const notifyAskPending = (dogId) =>
  !readJSON(KEY, false) && everChecked(dogId) && isPushSupported() && isStandalone() && getPermission() === "default";

export default function NotifyAsk({ dog, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const time = checkAlarmPlan()?.time || "20:00";
  const close = () => (writeJSON(KEY, true), onDone());
  async function enable() {
    setBusy(true);
    setError("");
    try {
      await subscribeToPush();
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="summary dc-ask">
      <span className="summary-open">
        <span className="summary-role">첫 기록 완료 · {dog.name}</span>
        병원에서 보여 줄 기록이 시작됐어! 내일 {when(time)}에도 물어봐도 돼?
      </span>
      <span className="dc-btns">
        <button type="button" className="dc-usual" disabled={busy} onClick={enable}><Ico name="bell" size={18} /> {busy ? "켜는 중…" : "알림 켜기"}</button>
        <button type="button" className="dc-diff" onClick={close}>나중에</button>
      </span>
      {error ? <span className="error-text summary-more">{error}</span> : <span className="summary-more">약·병원 일정 알림도 같이 받을 수 있어요. 언제든 알림·알람에서 바꿔요</span>}
    </span>
  );
}
