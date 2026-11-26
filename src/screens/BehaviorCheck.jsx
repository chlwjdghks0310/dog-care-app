import { useMemo, useRef, useState } from "react";
import { useAnalysisTimer, AnalysisTimeInfo } from "../components/AnalysisTimer";
import { renderEmphasized } from "../components/RichText";
import Ico from "../components/Ico";
import { useHelpTip } from "../components/HelpTip";
import AskBox from "../components/AskBox";
import { ConditionCheck } from "../components/HealthChecks";
import { analyzeBehavior } from "../services/aiClient";
import { conditionFlags } from "../services/healthRules";
import { getRecords, localNow, newRecordId, saveRecord, validateRecord, aiNoteOf } from "../services/records";

const MAX_SIZE_MB = 500;

// 컨디션 체크 — 여섯 가지를 평소와 비교해 보호자가 직접 골라 컨디션 기록으로 저장(기본). AI 영상 보기는 선택(하루 2번, 참고).
export default function BehaviorCheck({ dog, onBack }) {
  const [id, setId] = useState(newRecordId); // 같은 id로 저장해 두 번 눌러도 기록은 하나
  const [at, setAt] = useState(localNow);
  const [check, setCheck] = useState({});
  const [videoTaken, setVideoTaken] = useState(false);
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const others = useMemo(() => getRecords(dog.id).filter((r) => r.type === "condition" && r.id !== id), [dog.id, id]);
  const flags = conditionFlags(check, others, at.slice(0, 10));
  const edit = (fn) => (v) => (fn(v), setSaved(false));

  // note: AI 영상 설명이 막 도착했을 때 그 글. 설명은 같은 기록에 aiNote로 같이 남는다(영상 파일은 저장하지 않는다, 11/26)
  function save(note) {
    setSaveError("");
    const aiNote = aiNoteOf(typeof note === "string" ? note : resultRef.current);
    const rec = { id, type: "condition", at, data: { check, ...(videoTaken && { videoTaken }), ...(flags.length && { flags }), ...(aiNote && { aiNote }) }, memo: memo.trim(), photos: [] };
    const problem = validateRecord(rec);
    if (problem) return setSaveError(problem === "적은 내용이 없어요." ? "한 가지 이상 골라 주세요." : problem);
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
    setCheck({});
    setVideoTaken(false);
    setMemo("");
    setSaved(false);
    setResult(null); // 새 기록에 앞 기록의 AI 설명이 딸려 가지 않게
  }

  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null); resultRef.current = result; // save()가 위에 있어 최신 결과를 ref로 읽는다
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const timer = useAnalysisTimer("dogcare-timing-video-v1", [35, 60]);
  const [tip, panel] = useHelpTip("컨디션 체크", "여섯 가지를 평소 모습과 비교해 골라 기록해요. 기록은 병원용 기록에도 들어가요. 고른 내용으로 병원에 연락해 볼 신호만 알려 드리고, 진단은 하지 않아요."); // 11/18: 설명 문단 대신 ? 버튼

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
      const { answer } = await analyzeBehavior(dog, file, undefined, "vet", { question: question.trim() });
      setResult(answer);
      save(answer); // 설명 글을 이 기록에 바로 남긴다 — 여름이가 다음 질문부터 기억한다
      timer.stop(true);
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
      <div className="h1" style={{ display: "flex", alignItems: "center", gap: 8 }}>컨디션 체크{tip}</div>
      {panel}
      <div style={{ height: 12 }} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label htmlFor="cond-at">본 날짜·시각</label>
          <input id="cond-at" type="datetime-local" value={at} max={localNow()} onChange={(e) => edit(setAt)(e.target.value)} />
        </div>
        <ConditionCheck check={check} onChange={edit(setCheck)} flags={flags} />
        <div className="field">
          <label htmlFor="cond-memo">메모</label>
          <textarea id="cond-memo" rows={2} value={memo} onChange={(e) => edit(setMemo)(e.target.value)} placeholder="선택 · 예: 산책 중에 오른쪽 뒷다리를 들고 걸었어요" maxLength={500} />
        </div>
        <label className="rec-check" style={{ marginBottom: 4 }}>
          <input type="checkbox" checked={videoTaken} onChange={(e) => edit(setVideoTaken)(e.target.checked)} />
          영상 찍어 둠
        </label>
        <p className="faint" style={{ margin: "0 0 14px" }}>
          영상은 앱에 올리지 않고 휴대폰 앨범에 그대로 둬요(용량이 커서 앱에 담기 어려워요). 걸음걸이나 숨쉬기는 진료실에서 잘 안 보일 때가 많아, 찍어 둔 영상을 수의사에게 보여 주면 도움이 돼요.
        </p>
        {saveError && <p className="error-text" role="alert">{saveError}</p>}
        {saved ? (
          <div role="status">
            <p className="subtle" style={{ margin: "0 0 8px" }}>컨디션 기록에 저장했어요. 고치려면 기록 화면에서 눌러 주세요.</p>
            <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={reset}>새로 체크하기</button>
          </div>
        ) : (
          <button type="button" className="btn-primary" onClick={() => save()}>기록 저장</button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="h2"><Ico name="scan" size={18} /> AI로 영상 보기 (선택 · 하루 2번)</div>
        <p className="faint" style={{ marginTop: 0 }}>
          영상 속 자세·걸음걸이·호흡을 AI가 참고용으로 설명해 줘요. 영상은 서버를 거쳐 Google Gemini API로 전송되고, 영상은 저장하지 않고 설명 글만 이 기록에 같이 남아요.
        </p>
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

        <AskBox value={question} onChange={setQuestion} examples={["다리를 저는 것 같아", "숨이 빨라 보여", "이 행동이 스트레스야?", "병원 가기 전에 뭘 확인해?"]} />
        <button className="btn-ghost" style={{ width: "100%" }} onClick={handleSubmit} disabled={!file || pending}>
          {pending ? "분석 중…" : file ? "AI로 영상 보기 (하루 2번)" : "영상을 먼저 골라 주세요"}
        </button>
        <AnalysisTimeInfo timer={timer} note="영상이 길거나 크면 업로드 때문에 더 걸려요" />
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
            <Ico name="note" size={15} /> {saved ? "이 설명을 컨디션 기록에 같이 남겼어요. 기록 탭에서 다시 볼 수 있어요." : "위에서 [기록 저장]을 누르면 이 설명도 같이 남아요."}
          </div>
        </div>
      )}
    </div>
  );
}
