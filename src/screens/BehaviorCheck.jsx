import { useState } from "react";
import { useAnalysisTimer, AnalysisTimeInfo } from "../components/AnalysisTimer";
import { renderEmphasized } from "../components/RichText";
import Ico from "../components/Ico";
import { analyzeBehavior } from "../services/aiClient";

const MAX_SIZE_MB = 500;

export default function BehaviorCheck({ dog, onBack }) {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const timer = useAnalysisTimer("dogcare-timing-video-v1", [35, 60]);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`영상이 너무 커요 (${MAX_SIZE_MB}MB 이하만 가능해요).`);
      return;
    }
    setFile(f);
    setResult(null);
    setError("");
    setVideoUrl(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file || pending) return;
    setPending(true);
    setError("");
    setResult(null);
    timer.start();
    try {
      const { answer } = await analyzeBehavior(dog, file, undefined, "vet");
      setResult(answer);
      timer.stop(true);
    } catch (err) {
      timer.stop(false);
      setError(err instanceof TypeError ? "AI 서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요." : err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 건강 체크로
      </button>
      <div className="h1">활동 상태 확인</div>
      <p className="faint" style={{ marginBottom: 16 }}>
        영상 속 자세·걸음걸이·호흡·소리를 수의 임상 기준과 최신 자료로 참고용으로 자세히 분석해요. 영상만으로는
        한계가 있어 진단을 대신하지 않으니, 이상이 지속되면 병원에 방문하세요. 영상은 분석을 위해 서버를 거쳐 Google Gemini API로 전송돼요.
      </p>

      <div className="leave-note" style={{ marginBottom: 12 }}>
        <Ico name="alert" size={15} /> 이 화면을 나가면 올린 영상과 분석 결과가 지워져서 다시 해야 해요.
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        {videoUrl ? (
          <video src={videoUrl} controls style={{ width: "100%", borderRadius: 12, marginBottom: 12 }} />
        ) : (
          <div
            className="subtle"
            style={{
              height: 160,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px dashed var(--border)",
              borderRadius: 12,
              marginBottom: 12,
            }}
          >
            영상을 선택해 주세요 (최대 {MAX_SIZE_MB}MB)
          </div>
        )}

        <label className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }}>
          {videoUrl ? "다른 영상 선택" : "영상 촬영 / 선택"}
          <input type="file" accept="video/*" onChange={handleFileChange} style={{ display: "none" }} />
        </label>

        <button className="btn-primary" onClick={handleSubmit} disabled={!file || pending}>
          {pending ? "분석 중…" : "확인하기"}
        </button>
        <AnalysisTimeInfo timer={timer} note="영상이 길거나 크면 업로드 때문에 더 걸려요" />
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <p className="error-text">{error}</p>
        </div>
      )}

      {result && (
        <div className="card">
          <div className="h2"><Ico name="scan" size={18} /> 참고 분석 (진단 아님)</div>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14.5, margin: 0 }}>{renderEmphasized(result)}</p>
          <div className="leave-note" style={{ marginTop: 12 }}>
            <Ico name="alert" size={15} /> 이 화면을 나가면 결과가 지워져요. 남겨 두려면 화면을 캡처해 주세요.
          </div>
        </div>
      )}
    </div>
  );
}
