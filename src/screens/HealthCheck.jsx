import { useState } from "react";
import { useAnalysisTimer, AnalysisTimeInfo } from "../components/AnalysisTimer";
import { renderEmphasized } from "../components/RichText";
import Ico from "../components/Ico";
import { analyzePhoto } from "../services/aiClient";

export default function HealthCheck({ dog, onBack }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const timer = useAnalysisTimer("dogcare-timing-stool-v1", [50, 60]);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    if (!file || pending) return;
    setPending(true);
    setError("");
    setResult(null);
    timer.start();
    try {
      const answer = await analyzePhoto(dog, file);
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
      <div className="h1">변 상태 확인</div>
      <p className="faint" style={{ marginBottom: 16 }}>
        수의 임상 기준(퓨리나 대변 점수표 등)과 최신 자료를 찾아 참고용으로 자세히 분석해요. 사진만으로는 한계가
        있어 진단을 대신하지 않으니, 이상이 지속되면 반드시 동물병원에 방문하세요.
      </p>

      <div className="card" style={{ marginBottom: 16 }}>
        {previewUrl ? (
          <img src={previewUrl} alt="선택한 사진 미리보기" style={{ width: "100%", borderRadius: 12, marginBottom: 12 }} />
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
            사진을 선택해 주세요
          </div>
        )}

        <label className="btn-ghost" style={{ display: "block", textAlign: "center", marginBottom: 8 }}>
          {file ? "다른 사진 선택" : "사진 촬영 / 선택"}
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        </label>

        <button className="btn-primary" onClick={handleSubmit} disabled={!file || pending}>
          {pending ? "분석 중…" : "확인하기"}
        </button>
        <AnalysisTimeInfo timer={timer} />
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <p className="error-text">{error}</p>
        </div>
      )}

      {result && (
        <div className="card">
          <div className="h2"><Ico name="stethoscope" size={18} /> 참고 분석 (진단 아님)</div>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14.5, margin: 0 }}>{renderEmphasized(result)}</p>
        </div>
      )}
    </div>
  );
}
