import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { todayKey } from "../utils/date";
import { getVetNote, saveVetNote, buildVetSummary, summaryToText, SYMPTOMS, SECTIONS, PERIODS } from "../services/vetSummary";

// 병원용 기록 — 위에서 이번 진료 메모와 넣을 항목을 고르고, 아래 정리본을 진료실에서 보여 주거나 읽어 준다.
export default function VetSummary({ dog, onBack }) {
  const [note, setNote] = useState(() => getVetNote(dog.id));
  const [showing, setShowing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const sections = buildVetSummary(dog, note);
  const text = summaryToText(dog, sections);

  function update(patch) {
    const next = { ...note, ...patch };
    setNote(next);
    saveVetNote(dog.id, next);
  }
  const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function speak() {
    const synth = window.speechSynthesis;
    if (!synth) return setShareMsg("이 기기는 읽어 주기를 지원하지 않아요.");
    if (speaking) {
      synth.cancel();
      return setSpeaking(false);
    }
    const u = new SpeechSynthesisUtterance(text.replace(/■ /g, "").replace(/·/g, ","));
    u.lang = "ko-KR";
    u.rate = 0.95;
    u.onend = u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  }

  // 크게 보기 화면을 띄운 뒤 그 화면만 인쇄(인쇄 창에서 PDF로 저장 가능) — 따로 PDF 라이브러리를 넣지 않는다
  function printDoc() {
    setShowing(true);
    setTimeout(() => {
      try {
        window.print();
      } catch {
        setShareMsg("이 기기에서는 인쇄를 열 수 없어요. [공유]를 써 주세요.");
      }
    }, 300);
  }

  async function share() {
    setShareMsg("");
    try {
      if (navigator.share) await navigator.share({ title: `${dog.name} 병원용 기록`, text });
      else {
        await navigator.clipboard.writeText(text);
        setShareMsg("복사했어요. 메시지에 붙여 넣으면 돼요.");
      }
    } catch (err) {
      if (err.name !== "AbortError") setShareMsg("공유하지 못했어요. 화면을 그대로 보여 주세요.");
    }
  }

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 프로필로
      </button>
      <div className="h1">병원용 기록</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        앱에 쌓인 기록과 메모를 수의사가 바로 읽을 수 있게 정리했어요. 진료실에서 [보여 주기]를 누르거나 [읽어 주기]로 들려주세요.
      </p>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">이번 진료 메모</div>
        <div className="field">
          <label>지금 보이는 증상</label>
          <div className="chip-wrap">
            {SYMPTOMS.map((s) => (
              <button key={s} type="button" className={`seg${note.symptoms.includes(s) ? " on" : ""}`} onClick={() => update({ symptoms: toggle(note.symptoms, s) })}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>언제부터</label>
          <input type="date" value={note.since} max={todayKey()} onChange={(e) => update({ since: e.target.value })} />
        </div>
        <div className="field">
          <label>상태 설명</label>
          <textarea rows={3} value={note.text} onChange={(e) => update({ text: e.target.value })} placeholder="예: 이틀 전부터 아침마다 노란 토를 1번씩 해요. 밥은 반만 먹어요." maxLength={500} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>여쭤보고 싶은 것</label>
          <textarea rows={2} value={note.questions} onChange={(e) => update({ questions: e.target.value })} placeholder="예: 심장약을 계속 먹어도 되나요?" maxLength={300} />
        </div>
        {(note.symptoms.length > 0 || note.since || note.text || note.questions) && (
          <button className="link-btn" onClick={() => confirm("이번 진료 메모를 비울까요?") && update({ symptoms: [], since: "", text: "", questions: "" })}>
            메모 비우기
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">넣을 기록</div>
        <div className="chip-wrap" style={{ marginBottom: 12 }}>
          {SECTIONS.map((s) => (
            <button key={s.key} type="button" className={`seg${note.sections[s.key] ? " on" : ""}`} onClick={() => update({ sections: { ...note.sections, [s.key]: !note.sections[s.key] } })}>
              {note.sections[s.key] ? "✓ " : ""}{s.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {PERIODS.map((p) => (
            <button key={p} type="button" className={`seg${note.period === p ? " on" : ""}`} onClick={() => update({ period: p })}>
              최근 {p}일
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button className="btn-primary" style={{ flex: 2 }} onClick={() => setShowing(true)}>🩺 보여 주기</button>
        <button className="btn-ghost" style={{ flex: 1 }} onClick={speak}>{speaking ? "⏹ 멈춤" : "🔊 읽어 주기"}</button>
        <button className="btn-ghost" style={{ flex: 1 }} onClick={share}>공유</button>
      </div>
      <button className="btn-ghost" style={{ width: "100%", marginBottom: 8 }} onClick={printDoc}>🖨️ 인쇄 · PDF로 저장</button>
      {shareMsg && <p className="faint" style={{ margin: "0 0 8px" }}>{shareMsg}</p>}

      <SummaryDoc dog={dog} sections={sections} />
      <p className="faint" style={{ marginTop: 10 }}>보호자가 앱에 기록한 내용만 옮겼어요. 진단이 아니며, 기록하지 않은 건 빠져 있을 수 있어요.</p>

      {/* 화면 전체(하단 탭 위까지)를 덮어야 해서 body에 띄운다 */}
      {showing &&
        createPortal(
          <div className="vet-show" role="dialog" aria-label="병원용 기록 크게 보기">
            <button className="btn-ghost vet-show-close" onClick={() => setShowing(false)}>닫기</button>
            <SummaryDoc dog={dog} sections={sections} large />
          </div>,
          document.body
        )}
    </div>
  );
}

function SummaryDoc({ dog, sections, large }) {
  return (
    <div className={`card vet-doc${large ? " large" : ""}`}>
      <div className="vet-doc-head">
        <span>{dog.name} 병원용 기록</span>
        <span className="faint">{todayKey()}</span>
      </div>
      {sections.length === 0 && <p className="subtle">넣을 기록을 하나 이상 골라 주세요.</p>}
      {sections.map((s) => (
        <section key={s.key} className={`vet-sec${s.key === "note" ? " note" : ""}`}>
          <div className="vet-sec-title">{s.title}</div>
          {s.lines.map((l, i) => (
            <div key={i} className={l.startsWith("  ") ? "vet-line sub" : "vet-line"}>{l.trim()}</div>
          ))}
        </section>
      ))}
    </div>
  );
}
