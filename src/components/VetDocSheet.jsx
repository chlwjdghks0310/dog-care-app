import { useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";
import { readVetDoc } from "../services/aiClient";
import { docToPrefill, findSameVisit, medDrafts, TIMES_BY_COUNT } from "../services/vetDoc";
import { addMed } from "../services/medications";
import { getVetNote } from "../services/vetSummary";
import { syncPushAlarms } from "../services/notifications";
import { todayKey } from "../utils/date";
import { getRecords } from "../services/records";
import { imageForAI } from "../utils/image";
import MaskEditor from "./MaskEditor";

// 진료 정리: 영수증·세부내역·처방전 사진(최대 3장) + 들은 설명 → "맞는지 확인" → 진료 기록 칸을 채워 연다(저장은 보호자가).
// 근거: ../자료용/자료/2026-11-07-2단계-병원루프-조사.md ①(병원마다 영수증 형식이 다름·재진 안내는 말로 받음·펫수첩 "맞는지 확인")
// 사진은 정리에만 쓰고 저장하지 않는다. 보호자 이름·전화·카드번호는 서버가 옮기지 않는다. 약 용량은 적힌 그대로(바꾸지 않음).
const won = (n) => `${Number(n || 0).toLocaleString("ko-KR")}원`;

export default function VetDocSheet({ dog, onClose, onUse }) {
  const [files, setFiles] = useState([]); // { file, url }
  const [said, setSaid] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doc, setDoc] = useState(null);
  const [claim, setClaim] = useState(false); // 보험 청구할 병원비
  const [masking, setMasking] = useState(null); // 가리는 중인 사진
  const [meds, setMeds] = useState([]); // 약 일정 초안(확인 후 저장)
  const [answers, setAnswers] = useState(""); // 진료 전에 적어 둔 '물어볼 것'에 들은 답
  const questions = dog ? getVetNote(dog.id).questions.trim() : "";

  function addFiles(list) {
    const all = [...files, ...[...list].map((file) => ({ file, url: URL.createObjectURL(file) }))];
    all.slice(3).forEach((f) => URL.revokeObjectURL(f.url));
    setFiles(all.slice(0, 3));
    setError(all.length > 3 ? "사진은 3장까지 넣을 수 있어요." : "");
  }
  async function run() {
    setBusy(true);
    setError("");
    try {
      const images = await Promise.all(files.map((f) => imageForAI(f.file).then((x) => x.data)));
      const out = await readVetDoc({ images, text: said });
      if (!out?.is_doc) setError(out?.retake || "병원 서류로 읽지 못했어요. 영수증이 화면에 꽉 차게 다시 찍어 주세요.");
      else (setDoc(out), setMeds(medDrafts(out, /^\d{4}-\d{2}-\d{2}$/.test(out.visit_date || "") && out.visit_date <= todayKey() ? out.visit_date : todayKey())));
    } catch (e) {
      if (e.name !== "AbortError") setError(e instanceof TypeError ? "인터넷에 연결하지 못했어요. 연결을 확인하고 다시 시도해 주세요. 아래 [직접 적기]로도 남길 수 있어요." : `${e.message} 아래 [직접 적기]로도 남길 수 있어요.`);
    } finally {
      setBusy(false);
    }
  }

  const items = (doc?.items || []).filter((i) => i.name && i.amount > 0);
  const sum = items.reduce((a, i) => a + i.amount, 0);
  const mismatch = doc?.total > 0 && sum > 0 && sum !== doc.total;

  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label="진료 정리">
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">{doc ? "맞는지 확인해 주세요" : "진료 정리"}</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll" style={{ padding: "4px 16px 18px" }}>
          {!doc ? (
            <>
              <p className="subtle" style={{ margin: "0 0 10px" }}>영수증·진료비 내역·처방전 사진을 넣거나 들은 설명을 적으면, 진료 기록 칸을 채워 드려요. 저장은 확인한 뒤에 해요.</p>
              <div className="vd-photos">
                {files.map((f, i) => (
                  <div key={f.url} className="vd-thumb">
                    <img src={f.url} alt={`사진 ${i + 1}`} onClick={() => setMasking(f)} />
                    <button type="button" className="vd-mask" onClick={() => setMasking(f)}>{f.masked ? "가림 ✓" : "가리기"}</button>
                    <button type="button" aria-label="사진 빼기" onClick={() => (URL.revokeObjectURL(f.url), setFiles(files.filter((x) => x !== f)))}>✕</button>
                  </div>
                ))}
                {files.length < 3 && (
                  <label className="vd-add">
                    <Ico name="camera" size={22} />
                    <span>사진 넣기</span>
                    <input type="file" accept="image/*" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
                  </label>
                )}
              </div>
              <label className="field" style={{ marginTop: 12 }}>
                <span className="xs-label">수의사 선생님이 뭐라고 했나요? (선택)</span>
                <textarea rows={3} value={said} maxLength={2000} onChange={(e) => setSaid(e.target.value)} placeholder="예: 장염 같다, 위장약 하루 두 번 5일, 다음 주 수요일 다시 오래요" />
              </label>
              {files.length > 0 && (
                <div className="vd-privacy">
                  <b>보내기 전에 가려 주세요</b> · 영수증에 보호자 이름·전화번호·카드번호가 보이면 사진의 <b>[가리기]</b>를 눌러 칠해 주세요. 사진은 AI(Anthropic)로 보내 정리에만 쓰고 저장하지 않아요.
                </div>
              )}
              <p className="faint" style={{ fontSize: 12.5, margin: "6px 0 10px" }}>영수증·진료비 내역·처방전·약봉투 모두 돼요. 하루 3번까지.</p>
              {error && <p className="error-text">{error}</p>}
              <button type="button" className="btn-primary" disabled={busy || (!files.length && !said.trim())} onClick={run}>{busy ? "정리하는 중…" : "정리하기"}</button>
              {/* AI 없이도: 같은 칸을 직접 채우는 진료 기록으로(AI 동의 안 함·흐린 사진·인터넷 끊김) */}
              <button type="button" className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => onUse({ data: { reason: "", ...(said.trim() && { explanation: said.trim() }) } })}>AI 없이 직접 적기</button>
            </>
          ) : (
            <>
              <p className="subtle" style={{ margin: "0 0 10px" }}>사진·설명에서 읽은 내용이에요. 다음 화면에서 고칠 수 있어요.</p>
              <dl className="vd-list">
                {[["진료일", doc.visit_date], ["병원", doc.hospital], ["진료 사유", doc.reason], ["검사·처치", doc.tests], ["처방", doc.prescription], ["들은 소견", doc.explanation], ["주의사항", doc.cautions], ["다음 진료일", doc.next_date]].map(([k, v]) => (
                  <div key={k} className={v ? "" : "empty"}><dt>{k}</dt><dd>{v || "읽지 못함"}</dd></div>
                ))}
              </dl>
              {items.length > 0 && (
                <table className="vd-items">
                  <tbody>
                    {items.map((i, n) => (
                      <tr key={n}><td>{i.name}</td><td className="faint">{i.kind}</td><td style={{ textAlign: "right" }}>{won(i.amount)}</td></tr>
                    ))}
                    <tr className="vd-total"><td colSpan={2}>합계</td><td style={{ textAlign: "right" }}>{won(doc.total || sum)}</td></tr>
                  </tbody>
                </table>
              )}
              {dog && findSameVisit(getRecords(dog.id), doc) && <p className="dc-warn"><b>이미 정리한 영수증 같아요</b> · {doc.visit_date} 진료 기록이 벌써 있어요. 같은 영수증이면 [진료 기록으로 열기] 대신 닫아 주세요.</p>}
              {mismatch && <p className="dc-warn"><b>합계가 안 맞아요</b> · 항목 합 {won(sum)}, 영수증 합계 {won(doc.total)}. 빠진 항목이 있는지 사진을 확인해 주세요.</p>}
              {doc.prescription && <p className="faint" style={{ fontSize: 12.5 }}>약은 적힌 그대로 옮겼어요. 매일 먹일 약은 약 관리에 등록하면 알림이 와요.</p>}
              {(doc.total > 0 || sum > 0) && (
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 15, margin: "4px 0 12px" }}>
                  <input type="checkbox" checked={claim} onChange={(e) => setClaim(e.target.checked)} />
                  보험 청구할 병원비예요 (가계부에 "청구 전"으로)
                </label>
              )}
              {meds.length > 0 && (
                <div className="vd-meds">
                  <div className="xs-label">약 일정으로 만들기 (적힌 그대로 — 확인해 주세요)</div>
                  {meds.map((m, i) => {
                    const set = (patch) => setMeds((l) => l.map((x, k) => (k === i ? { ...x, ...patch } : x)));
                    return (
                      <div key={i} className="vd-med">
                        <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700 }}>
                          <input type="checkbox" checked={m.use} onChange={(e) => set({ use: e.target.checked })} /> {m.name}
                        </label>
                        <div className="vd-med-row">
                          <input value={m.dose} onChange={(e) => set({ dose: e.target.value })} placeholder="1회 양(예: 1포)" aria-label={`${m.name} 1회 양`} />
                          <select value={m.times.length} onChange={(e) => set({ times: TIMES_BY_COUNT[e.target.value] })} aria-label={`${m.name} 하루 횟수`}>
                            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>하루 {n}번</option>)}
                          </select>
                          <input type="number" min="0" max="90" value={m.courseDays || ""} onChange={(e) => set({ courseDays: Number(e.target.value) || 0, endDate: Number(e.target.value) ? new Date(new Date(`${m.startDate}T00:00:00`).getTime() + (Number(e.target.value) - 1) * 86400000).toLocaleDateString("sv-SE") : "" })} placeholder="며칠" aria-label={`${m.name} 며칠분`} />
                        </div>
                        <span className="faint" style={{ fontSize: 12 }}>{m.startDate}부터 {m.times.join(", ")}{m.endDate ? ` · ${m.endDate}까지` : ""} — 시각은 약 관리에서 바꿀 수 있어요</span>
                      </div>
                    );
                  })}
                  <p className="faint" style={{ fontSize: 12, margin: "4px 0 0" }}>멍케어는 용량을 바꾸지 않아요. 처방전·약봉투와 다르면 고쳐 주세요.</p>
                </div>
              )}
              {questions && (
                <div className="vd-meds">
                  <div className="xs-label">진료 전에 적어 둔 물어볼 것</div>
                  <p style={{ margin: "0 0 6px", whiteSpace: "pre-line", fontSize: 14 }}>{questions}</p>
                  <textarea rows={2} value={answers} onChange={(e) => setAnswers(e.target.value)} placeholder="들은 답을 한 줄씩 적어 두세요" aria-label="물어본 것에 들은 답" />
                </div>
              )}
              {error && <p className="error-text">{error}</p>}
              <button type="button" className="btn-primary" onClick={() => {
                // 고른 약은 약 관리에 바로 등록(알림 켜짐) — 실패하면 진료 기록으로 넘어가지 않고 알려 준다
                const chosen = meds.filter((m) => m.use);
                try {
                  for (const m of chosen) addMed(dog.id, { name: m.name, dose: m.dose, times: m.times, startDate: m.startDate, endDate: m.endDate, purpose: m.purpose, remind: true }); // 며칠분(courseDays)은 끝나는 날로만
                } catch (e) {
                  return setError(`약 일정을 만들지 못했어요: ${e.message}`);
                }
                if (chosen.length) syncPushAlarms();
                const pre = docToPrefill(doc, new Date(), { claim });
                if (questions || answers.trim()) pre.data.explanation = [pre.data.explanation, `물어본 것: ${questions.replace(/\n/g, " / ")}`, answers.trim() && `들은 답: ${answers.trim()}`].filter(Boolean).join("\n");
                if (chosen.length) pre.memo = [pre.memo, `약 일정 만듦: ${chosen.map((m) => m.name).join(", ")}`].filter(Boolean).join("\n");
                onUse(pre);
              }}>진료 기록으로 열기{meds.some((m) => m.use) ? ` · 약 ${meds.filter((m) => m.use).length}개 일정 만들기` : ""}</button>
              <button type="button" className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setDoc(null)}>다시 정리하기</button>
            </>
          )}
        </div>
      </div>
      {masking && (
        <MaskEditor
          file={masking.file}
          onClose={() => setMasking(null)}
          onDone={(file) => {
            URL.revokeObjectURL(masking.url);
            setFiles((list) => list.map((x) => (x === masking ? { file, url: URL.createObjectURL(file), masked: true } : x)));
            setMasking(null);
          }}
        />
      )}
    </div>,
    document.body
  );
}
