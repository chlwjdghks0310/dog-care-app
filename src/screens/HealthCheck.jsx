import { useMemo, useState } from "react";
import { useAnalysisTimer, AnalysisTimeInfo } from "../components/AnalysisTimer";
import { renderEmphasized } from "../components/RichText";
import Ico from "../components/Ico";
import { useHelpTip } from "../components/HelpTip";
import AskBox from "../components/AskBox";
import { StoolCheck } from "../components/HealthChecks";
import { analyzePhoto } from "../services/aiClient";
import { stoolFlags } from "../services/healthRules";
import { resizeImageFile } from "../utils/image";
import { getRecords, localNow, newRecordId, saveRecord, validateRecord, aiNoteOf } from "../services/records";

// 변 체크 — 보호자가 모양·색·보이는 것을 직접 골라 배변 기록으로 저장(기본). AI 자세히 보기는 선택(하루 2번, 참고).
export default function HealthCheck({ dog, onBack }) {
  const [id, setId] = useState(newRecordId); // 같은 id로 저장해 두 번 눌러도 기록은 하나
  const [at, setAt] = useState(localNow);
  const [data, setData] = useState({});
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const timer = useAnalysisTimer("dogcare-timing-stool-v1", [50, 60]);
  const [tip, panel] = useHelpTip("변 체크", "눈으로 본 모양·색을 골라 기록해요. 기록은 병원용 기록에도 들어가요. 고른 내용으로 병원에 연락해 볼 신호만 알려 드리고, 진단은 하지 않아요."); // 11/18: 설명 문단 대신 ? 버튼

  const others = useMemo(() => getRecords(dog.id).filter((r) => r.type === "potty" && r.id !== id), [dog.id, id]);
  const flags = stoolFlags(data, others, at.slice(0, 10));
  const change = (p) => (setData((d) => ({ ...d, ...p })), setSaved(false));

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    setSaved(false);
    setPreviewUrl(URL.createObjectURL(f));
  }

  // note: AI 설명이 막 도착했을 때 그 글(상태가 아직 안 바뀌어 직접 넘긴다). AI 참고 설명은 같은 기록에 aiNote로 같이 남는다(11/26)
  async function save(note) {
    setSaveError("");
    const aiNote = aiNoteOf(typeof note === "string" ? note : result);
    const clean = Object.fromEntries(Object.entries({ ...data, flags, ...(aiNote && { aiNote }) }).filter(([, v]) => (Array.isArray(v) ? v.length : v != null && v !== "")));
    let photos = [];
    try {
      if (file) photos = [await resizeImageFile(file, 720, 0.8)];
    } catch {
      return setSaveError("사진을 불러오지 못했어요. 사진을 빼거나 다른 사진으로 해 주세요.");
    }
    const rec = { id, type: "potty", at, data: clean, memo: memo.trim(), photos };
    const problem = validateRecord(rec);
    if (problem) return setSaveError(problem === "적은 내용이 없어요." ? "변 모양이나 색을 하나 이상 골라 주세요." : problem);
    try {
      saveRecord(dog.id, rec);
      setSaved(true);
    } catch (err) {
      setSaveError(err.message);
    }
  }

  function reset() {
    setId(newRecordId());
    setAt(localNow());
    setData({});
    setMemo("");
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError("");
    setSaved(false);
  }

  async function handleSubmit() {
    if (!file || pending) return;
    setPending(true);
    setError("");
    setResult(null);
    timer.start();
    try {
      const answer = await analyzePhoto(dog, file, question.trim());
      setResult(answer);
      timer.stop(true);
      save(answer); // 설명을 이 기록에 바로 남긴다 — 여름이가 다음 질문부터 기억한다
    } catch (err) {
      timer.stop(false);
      // 서버의 하루 횟수 제한(429) 문구도 그대로 보여 준다
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
      <div className="h1" style={{ display: "flex", alignItems: "center", gap: 8 }}>변 체크{tip}</div>
      {panel}
      <div style={{ height: 12 }} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label htmlFor="stool-at">본 날짜·시각</label>
          <input id="stool-at" type="datetime-local" value={at} max={localNow()} onChange={(e) => (setAt(e.target.value), setSaved(false))} />
        </div>
        <StoolCheck data={data} onChange={change} flags={flags} />

        <div className="field">
          <label>사진 (선택)</label>
          {previewUrl && <img src={previewUrl} alt="선택한 변 사진" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, marginBottom: 8 }} />}
          <label className="btn-ghost" style={{ display: "block", textAlign: "center" }}>
            {file ? "다른 사진 선택" : "사진 촬영 / 선택"}
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
          </label>
        </div>
        <div className="field">
          <label htmlFor="stool-memo">메모</label>
          <textarea id="stool-memo" rows={2} value={memo} onChange={(e) => (setMemo(e.target.value), setSaved(false))} placeholder="선택 · 예: 새 간식 먹은 다음 날" maxLength={500} />
        </div>

        {saveError && <p className="error-text" role="alert">{saveError}</p>}
        {saved ? (
          <div role="status">
            <p className="subtle" style={{ margin: "0 0 8px" }}>배변 기록에 저장했어요. 고치려면 기록 화면에서 눌러 주세요.</p>
            <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={reset}>새로 체크하기</button>
          </div>
        ) : (
          <button type="button" className="btn-primary" onClick={() => save()}>기록 저장</button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="h2"><Ico name="scan" size={18} /> AI로 자세히 보기 (선택 · 하루 2번)</div>
        <p className="faint" style={{ marginTop: 0 }}>
          위에 넣은 사진을 AI가 대변 점수표 같은 자료를 바탕으로 참고용으로 설명해 줘요. 설명은 이 기록에 같이 남아요.
        </p>
        <AskBox value={question} onChange={setQuestion} examples={["언제부터 지켜봐야 해?", "사료를 바꿔야 할까?", "어제보다 묽어졌어", "병원 가기 전에 뭘 확인해?"]} />
        <button className="btn-ghost" style={{ width: "100%" }} onClick={handleSubmit} disabled={!file || pending}>
          {pending ? "분석 중…" : file ? "AI로 자세히 보기 (하루 2번)" : "사진을 먼저 넣어 주세요"}
        </button>
        <AnalysisTimeInfo timer={timer} />
      </div>

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)" }}>
          <p className="error-text" role="alert">{error}</p>
        </div>
      )}

      {result && (
        <div className="card">
          <div className="h2"><Ico name="scan" size={18} /> 참고 분석 (진단 아님)</div>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14.5, margin: 0 }}>{renderEmphasized(result)}</p>
          <div className="leave-note" style={{ marginTop: 12 }}>
            <Ico name="note" size={15} /> {saved ? "이 설명을 배변 기록에 같이 남겼어요. 기록 탭에서 다시 볼 수 있어요." : "위에서 [기록 저장]을 누르면 이 설명도 같이 남아요."}
          </div>
        </div>
      )}
    </div>
  );
}
