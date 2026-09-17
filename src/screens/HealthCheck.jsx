import { useState } from "react";
import { analyzePhoto } from "../services/aiClient";

export default function HealthCheck({ dog, onBack }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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
    try {
      const answer = await analyzePhoto(dog, file);
      setResult(answer);
    } catch {
      setError("AI 서버에 연결하지 못했어요. server/.env에 API 키를 넣고 서버를 켠 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 뒤로
      </button>
      <div className="h1">변 상태 확인</div>
      <p className="faint" style={{ marginBottom: 16 }}>
        퓨리나 대변 점수표(임상에서 실제 쓰이는 평가 도구) 기준의 참고 소견이며, 수의사의 진단을 대신하지 않아요.
        이상이 지속되면 반드시 동물병원에 방문하세요.
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
          <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
        </label>

        <button className="btn-primary" onClick={handleSubmit} disabled={!file || pending}>
          {pending ? "분석 중…" : "확인하기"}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <p className="error-text">{error}</p>
        </div>
      )}

      {result && (
        <div className="card">
          <div className="h2">참고 소견</div>
          <p className="subtle" style={{ whiteSpace: "pre-wrap" }}>{result}</p>
        </div>
      )}
    </div>
  );
}
