import { useState } from "react";
import { analyzeBehavior } from "../services/aiClient";

const MAX_SIZE_MB = 500;

export default function BehaviorCheck({ dog, onBack }) {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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
    try {
      const answer = await analyzeBehavior(dog, file);
      setResult(answer);
    } catch {
      setError("AI 서버에 연결하지 못했어요. server/.env에 GEMINI_API_KEY를 넣고 서버를 켠 뒤 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 뒤로
      </button>
      <div className="h1">활동 상태 확인</div>
      <p className="faint" style={{ marginBottom: 16 }}>
        영상 속 자세·걸음걸이·소리를 참고 소견으로 알려드려요. 수의사의 진단을 대신하지 않으니, 이상이 지속되면
        병원에 방문하세요. 영상은 분석을 위해 서버를 거쳐 Google Gemini API로 전송돼요.
      </p>

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
          <input type="file" accept="video/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
        </label>

        <button className="btn-primary" onClick={handleSubmit} disabled={!file || pending}>
          {pending ? "분석 중… (영상은 시간이 조금 더 걸려요)" : "확인하기"}
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
