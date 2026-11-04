import { useMemo, useState } from "react";
import { useAnalysisTimer, AnalysisTimeInfo } from "../components/AnalysisTimer";
import { renderEmphasized } from "../components/RichText";
import Ico from "../components/Ico";
import AskBox from "../components/AskBox";
import { ConditionCheck } from "../components/HealthChecks";
import { analyzeBehavior } from "../services/aiClient";
import { conditionFlags } from "../services/healthRules";
import { getRecords, localNow, newRecordId, saveRecord, validateRecord } from "../services/records";

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

  function save() {
    setSaveError("");
    const rec = { id, type: "condition", at, data: { check, ...(videoTaken && { videoTaken }), ...(flags.length && { flags }) }, memo: memo.trim(), photos: [] };
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
  }

  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
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
      const { answer } = await analyzeBehavior(dog, file, undefined, "vet", { question: question.trim() });
      setResult(answer);
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
      <div className="h1">컨디션 체크</div>
      <p className="faint" style={{ marginBottom: 16 }}>
        여섯 가지를 평소 모습과 비교해 골라 기록해요. 기록은 '병원용 기록'에도 들어가요. 고른 내용으로 병원에 연락해 볼 신호만 알려 드리고, 진단은 하지 않아요.
      </p>

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
          <button type="button" className="btn-primary" onClick={save}>기록 저장</button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="h2"><Ico name="scan" size={18} /> AI로 영상 보기 (선택 · 하루 2번)</div>
        <p className="faint" style={{ marginTop: 0 }}>
          영상 속 자세·걸음걸이·호흡을 AI가 참고용으로 설명해 줘요. 영상만으로는 한계가 있어 진단을 대신하지 않아요. 영상은 분석을 위해 서버를 거쳐 Google Gemini API로 전송되고, 결과는 저장되지 않아요.
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
            <Ico name="alert" size={15} /> 이 화면을 나가면 AI 결과가 지워져요. 남겨 두려면 화면을 캡처해 주세요.
          </div>
        </div>
      )}
    </div>
  );
}
