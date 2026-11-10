import { useState } from "react";
import Ico from "../components/Ico";
import { resizeImageFile } from "../utils/image";
import { visitorId } from "../services/analytics";
import { APP_VERSION } from "../services/beta";

const API = import.meta.env?.VITE_API_BASE || "http://localhost:8787";
const KINDS = [["bug", "버그예요"], ["wish", "바랐던 게 있어요"], ["good", "좋았어요"]];

// 설정 맨 위 [의견 보내기](베타 조사 ②): 한 줄 + 종류 + 스크린샷(선택). 버전·기기·화면 경로·익명 번호는 자동으로 붙고, 이름·기록 내용은 안 간다.
export default function Feedback({ onBack }) {
  const [kind, setKind] = useState("bug");
  const [text, setText] = useState("");
  const [shot, setShot] = useState(null);
  const [state, setState] = useState("idle"); // idle | sending | sent | error

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) setShot(await resizeImageFile(f, 1000, 0.7).catch(() => null));
  }
  async function send() {
    if (!text.trim() || state === "sending") return;
    setState("sending");
    try {
      const r = await fetch(`${API}/api/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, text: text.trim().slice(0, 1000), shot, ver: APP_VERSION, path: location.pathname, ua: navigator.userAgent.slice(0, 200), v: visitorId() }) });
      setState(r.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "sent")
    return (
      <div className="screen" style={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        <div style={{ marginBottom: 8, color: "var(--warm)" }}><Ico name="paw" size={56} /></div>
        <div className="h1">고마워요!</div>
        <p className="subtle" style={{ margin: "8px 0 20px" }}>보내 주신 의견은 개발자만 보고, 다음 버전에 반영할게요.</p>
        <button type="button" className="btn-primary" onClick={onBack}>돌아가기</button>
      </div>
    );

  return (
    <div className="screen">
      <button type="button" className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>← 설정으로</button>
      <div className="h1">의견 보내기</div>
      <p className="subtle" style={{ marginBottom: 14 }}>사소한 것도 좋아요. 불편했거나 이상했던 점을 한 줄로 알려 주세요.</p>
      <div className="card">
        <div className="chip-wrap" style={{ marginBottom: 10 }}>
          {KINDS.map(([k, label]) => (
            <button key={k} type="button" className={`seg${kind === k ? " on" : ""}`} aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>
          ))}
        </div>
        <textarea className="es-input" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 밥·물 기록에서 날짜 상자가 잘려요" maxLength={1000} />
        <label className="btn-ghost" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
          <Ico name="camera" size={16} /> {shot ? "스크린샷 바꾸기" : "스크린샷 붙이기 (선택)"}
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={pick} />
        </label>
        {shot && (
          <div style={{ position: "relative", marginBottom: 10 }}>
            <img src={shot} alt="첨부한 스크린샷" style={{ width: "100%", borderRadius: 12, display: "block" }} />
            <button type="button" className="btn-ghost small" style={{ position: "absolute", top: 6, right: 6 }} onClick={() => setShot(null)}>빼기</button>
          </div>
        )}
        <button type="button" className="btn-primary" disabled={!text.trim() || state === "sending"} onClick={send}>{state === "sending" ? "보내는 중…" : "보내기"}</button>
        {state === "error" && <p className="subtle" style={{ margin: "8px 0 0", color: "var(--danger, #c0392b)" }}>지금은 보낼 수 없어요. 잠시 뒤 다시 하거나 설정 → 문의하기로 보내 주세요.</p>}
        <p className="faint" style={{ margin: "10px 0 0", fontSize: 12.5 }}>앱 버전·기기 종류·보던 화면이 같이 가요. 강아지 이름과 기록 내용은 안 가요.</p>
      </div>
    </div>
  );
}
