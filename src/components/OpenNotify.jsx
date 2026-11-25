import { useState } from "react";
import Ico from "./Ico";
import { setWaitlist } from "../services/character";
import { getPermission, isNotificationSupported, requestPermission } from "../services/notifications";
import { isNative } from "../services/native";
import { readJSON, writeJSON } from "../services/storage";
import { PAY_OPENS } from "../services/billing";

// [결제가 열리면 알려 주세요] — 플러스·캐릭터 화면이 같이 쓴다. 웹은 서버 대기 명단(푸시 주소만), 스토어 앱은 폰에만 표시해 둔다.
// ponytail: 스토어 앱은 서버 푸시(APNs·FCM)가 아직 없어 폰에 표시만 남긴다 — 푸시를 붙이면 이 표시를 서버 명단으로 올린다
const KEY = "dogcare-open-notify-v1";
export default function OpenNotify({ dog, waiting, offline, onChange }) {
  const [local, setLocal] = useState(() => readJSON(KEY, false) === true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const can = isNotificationSupported();
  const on = isNative() ? local : Boolean(waiting);
  const toggle = async (next) => {
    setBusy(true); setErr("");
    try {
      if (next && getPermission() !== "granted" && (await requestPermission()) !== "granted") throw new Error("알림을 켜야 소식을 보내 드릴 수 있어요");
      if (isNative()) { writeJSON(KEY, next); setLocal(next); }
      else onChange?.((await setWaitlist(dog.id, next)).waiting);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <section className="px-card">
      <label className="px-switch">
        <Ico name="bell" size={38} />
        <div className="px-feat-body">
          <div className="px-feat-title">열리면 알려 주세요</div>
          <div className="px-feat-desc">{can ? `결제는 ${PAY_OPENS}에 열려요. 그날 알림 한 번만 보내요` : "알림을 쓸 수 있는 홈 화면 앱에서 켤 수 있어요"}</div>
        </div>
        <input type="checkbox" role="switch" className="switch" checked={on} disabled={!can || busy || (!isNative() && offline)} onChange={(e) => toggle(e.target.checked)} aria-label="결제가 열리면 알려 주세요" />
      </label>
      {err && <p className="error-text" style={{ margin: 0 }}>{err}</p>}
    </section>
  );
}
