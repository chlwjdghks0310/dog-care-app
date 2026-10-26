// 건강 체크(변 사진·활동 영상)에 함께 보내는 보호자 질문 — 비워 둬도 된다. 예시를 누르면 칸에 이어 붙는다.
export default function AskBox({ value, onChange, examples }) {
  return (
    <div className="field" style={{ marginBottom: 12 }}>
      <label htmlFor="askbox">궁금한 점 (선택)</label>
      <textarea id="askbox" rows={3} maxLength={1000} value={value} onChange={(e) => onChange(e.target.value)} placeholder="예: 어제부터 이랬어요. 지켜봐도 될까요?" />
      <div className="chip-wrap">
        {examples.map((q) => (
          <button key={q} type="button" className="seg" onClick={() => onChange(value.trim() ? `${value.trim()} ${q}` : q)}>
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
