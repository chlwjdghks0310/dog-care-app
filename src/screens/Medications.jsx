import { useEffect, useRef, useState } from "react";
import { todayKey, formatKoreanDate } from "../utils/date";
import { resizeImageFile } from "../utils/image";
import { josa } from "../utils/text";
import { md } from "../services/records";
import {
  getMeds,
  addMed,
  updateMed,
  stopMed,
  deleteMedSeries,
  isEnded,
  getDosesForDate,
  markDoseDone,
  markDoseSkipped,
  undoDose,
  editDoneTime,
  getStockInfo,
  stockNow,
  validateMed,
} from "../services/medications";
import { getPermission, syncPushAlarms } from "../services/notifications";

const STATUS = {
  planned: { label: "복용 예정", color: "var(--accent-strong)", bg: "var(--accent-soft)" },
  done: { label: "복용 완료", color: "var(--success)", bg: "var(--success-bg)" },
  skipped: { label: "건너뜀", color: "var(--text-soft)", bg: "var(--border)" },
  check: { label: "기록 확인 필요", color: "var(--warning)", bg: "var(--warning-bg)" },
};
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
const DEFAULT_TIMES = [["08:00"], ["08:00", "20:00"], ["08:00", "14:00", "20:00"], ["08:00", "12:00", "16:00", "20:00"]];

const daysLabel = (days) => (days?.length ? days.map((d) => DAY_NAMES[d]).join("·") : "매일");

export default function Medications({ dog, focusDose, onBack }) {
  const [date, setDate] = useState(() => focusDose?.split("|")[1] || todayKey()); // 알림을 눌러 들어오면 그 날짜로
  const [, setVersion] = useState(0); // 기록이 바뀌면 다시 그려 새로 읽는다
  const [editing, setEditing] = useState(null); // null | "new" | med
  const [error, setError] = useState("");
  const focusRef = useRef(null);

  const today = todayKey();
  const meds = getMeds(dog.id);
  const doses = getDosesForDate(dog.id, date);
  const active = meds.filter((m) => !isEnded(m, today));
  const ended = latestPerSeries(meds.filter((m) => isEnded(m, today) && !active.some((a) => a.seriesId === m.seriesId)));
  const lowStock = active.map((m) => ({ med: m, stock: getStockInfo(dog.id, m) })).filter((x) => x.stock?.low);
  const remindOff = active.some((m) => m.remind) && getPermission() !== "granted";

  // 알림을 눌러 들어오면 그 복용 건이 보이게
  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusDose, date]);

  function act(fn) {
    setError("");
    try {
      fn();
      syncPushAlarms(); // 먹인 약은 오늘 알림이 안 오게
    } catch (err) {
      setError(err.message);
    }
    setVersion((v) => v + 1);
  }

  if (editing) {
    return (
      <MedForm
        med={editing === "new" ? null : editing}
        onCancel={() => setEditing(null)}
        onSave={(input) => {
          if (editing === "new") addMed(dog.id, input);
          else updateMed(dog.id, editing.id, input);
          syncPushAlarms();
          setEditing(null);
        }}
        onStop={() => {
          stopMed(dog.id, editing.id);
          syncPushAlarms();
          setEditing(null);
        }}
        onDelete={() => {
          deleteMedSeries(dog.id, editing.seriesId);
          syncPushAlarms();
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={onBack}>
        ← 프로필로
      </button>
      <div className="h1">약 관리</div>
      <p className="subtle" style={{ marginBottom: 16 }}>
        먹인 약은 [먹였어요]를 눌러 기록해요. 용량·횟수는 처방대로만 적고, 약을 놓쳤다고 두 번 먹이지 마세요. 이상 반응이 보이면 바로 수의사에게 문의하세요.
      </p>

      {lowStock.map(({ med, stock }) => (
        <div key={med.id} className="card med-alert" style={{ marginBottom: 10 }}>
          ⚠️ {josa(med.name, "이", "가")} {stock.remaining <= 0 ? "다 떨어졌어요" : stock.daysLeft < 1 ? `하루치도 안 남았어요` : `${stock.daysLeft}일치쯤 남았어요`} (기록 기준 {stock.remaining}개). 미리 병원에 문의해 두세요.
        </div>
      ))}
      {remindOff && (
        <p className="faint" style={{ margin: "0 0 10px" }}>
          🔕 알림 권한이 꺼져 있어 복용 알림이 오지 않아요. 체크리스트 → 알림·알람에서 켤 수 있어요.
        </p>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div className="h2" style={{ margin: 0 }}>{date === today ? "오늘 먹을 약" : formatKoreanDate(date)}</div>
          <input type="date" className="med-date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="날짜 선택" />
        </div>
        {date !== today && (
          <button className="link-btn" onClick={() => setDate(today)}>오늘로</button>
        )}
        {error && <p className="error-text">{error}</p>}
        {doses.length === 0 ? (
          <p className="subtle" style={{ margin: "8px 0 0" }}>{meds.length ? "이 날은 먹을 약이 없어요." : "등록된 약이 없어요. 아래에서 약을 추가해 보세요."}</p>
        ) : (
          doses.map((d) => (
            <DoseRow
              key={d.key}
              dose={d}
              future={date > today}
              focused={d.key === focusDose}
              innerRef={d.key === focusDose ? focusRef : undefined}
              onDone={() => act(() => markDoseDone(dog.id, d))}
              onSkip={() => act(() => markDoseSkipped(dog.id, d))}
              onUndo={() => act(() => undoDose(dog.id, d))}
              onTime={(t) => act(() => editDoneTime(dog.id, d, t))}
            />
          ))
        )}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">먹고 있는 약</div>
        {active.length === 0 && <p className="subtle">아직 없어요.</p>}
        {active.map((m) => (
          <MedSummary key={m.id} med={m} stock={getStockInfo(dog.id, m)} onClick={() => setEditing(m)} />
        ))}
        <button className="btn-primary" style={{ marginTop: 10 }} onClick={() => setEditing("new")}>
          ＋ 약 추가
        </button>
      </div>

      {ended.length > 0 && (
        <details className="card" style={{ marginBottom: 14 }}>
          <summary className="h2" style={{ margin: 0, cursor: "pointer" }}>끝난 약 {ended.length}개</summary>
          <p className="faint">지난 복용 기록은 위 날짜를 바꿔서 볼 수 있어요.</p>
          {ended.map((m) => (
            <MedSummary key={m.id} med={m} ended onDelete={() => confirm(`${m.name}의 모든 복용 기록까지 지울까요?`) && act(() => deleteMedSeries(dog.id, m.seriesId))} />
          ))}
        </details>
      )}
    </div>
  );
}

function latestPerSeries(list) {
  const map = new Map();
  for (const m of list) if (!map.has(m.seriesId) || map.get(m.seriesId).endDate < m.endDate) map.set(m.seriesId, m);
  return [...map.values()];
}

function DoseRow({ dose, future, focused, innerRef, onDone, onSkip, onUndo, onTime }) {
  const s = STATUS[dose.status];
  const rec = dose.record;
  const edits = rec?.edits?.length || 0;
  return (
    <div ref={innerRef} className={`med-dose${focused ? " focused" : ""}`}>
      <div className="med-dose-time">{dose.time}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{rec?.name || dose.med.name}</div>
        <div className="subtle">{rec?.dose || dose.med.dose}</div>
        <span className="med-status" style={{ color: s.color, background: s.bg }}>{s.label}</span>
        {dose.status === "done" && (
          <label className="faint" style={{ marginLeft: 8 }}>
            먹인 시각{" "}
            <input type="time" className="med-time-input" value={rec.doneAt?.slice(11, 16) || ""} onChange={(e) => e.target.value && onTime(e.target.value)} />
          </label>
        )}
        {edits > 0 && <div className="faint" style={{ marginTop: 2 }}>수정 {edits}번 · 마지막: {rec.edits[edits - 1].note}</div>}
      </div>
      {!future && (
        <div className="med-dose-actions">
          {dose.status === "done" || dose.status === "skipped" ? (
            <button className="btn-ghost small" onClick={onUndo}>취소</button>
          ) : (
            <>
              <button className="btn-primary small" onClick={onDone}>먹였어요</button>
              <button className="link-btn" onClick={onSkip}>건너뜀</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MedSummary({ med, stock, ended, onClick, onDelete }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className="med-summary" onClick={onClick}>
      {med.photo ? <img src={med.photo} alt="" className="med-photo" /> : <span className="med-photo">💊</span>}
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontWeight: 700 }}>{med.name} <span className="subtle" style={{ fontWeight: 400 }}>{med.dose}</span></div>
        <div className="faint">
          {daysLabel(med.days)} {med.times.join(", ")} · {md(med.startDate)} ~ {med.endDate ? md(med.endDate) : "계속"}
        </div>
        {med.purpose && <div className="faint">{med.purpose}</div>}
        {stock && <div className="faint">남은 수량 {stock.remaining}개{stock.daysLeft >= 1 ? ` (약 ${stock.daysLeft}일치)` : ""}</div>}
      </div>
      {ended ? (
        <button type="button" className="link-btn" onClick={onDelete}>기록까지 지우기</button>
      ) : (
        <span className="subtle">›</span>
      )}
    </Tag>
  );
}

// 등록·수정 — 1) 꼭 필요한 것 2) 기간·요일 3) 선택 항목, 세 단계로 나눈다.
function MedForm({ med, onSave, onCancel, onStop, onDelete }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState(() => ({
    name: med?.name || "",
    dose: med?.dose || "",
    times: med?.times || ["08:00"],
    startDate: med?.startDate || todayKey(),
    endDate: med?.endDate || "",
    days: med?.days || [],
    purpose: med?.purpose || "",
    photo: med?.photo || "",
    stockBase: med?.stock ? String(med.stock.base) : "",
    perDose: med?.stock ? String(med.stock.perDose) : "",
    remind: med ? med.remind : true,
  }));
  const [error, setError] = useState("");
  const set = (patch) => (setError(""), setF((p) => ({ ...p, ...patch })));

  function toInput() {
    const stockChanged = med?.stock ? String(med.stock.base) !== f.stockBase || String(med.stock.perDose) !== f.perDose : true;
    const stock = f.stockBase.trim() === "" ? null : stockChanged ? stockNow(f.stockBase, f.perDose) : med.stock;
    if (stock && (Number.isNaN(stock.base) || Number.isNaN(stock.perDose))) return { stock: { base: -1 } };
    return { ...f, stock };
  }

  // 이 단계에서 확인할 항목만 검사
  function next() {
    const input = toInput();
    const err = validateMed(input);
    const stepOf = (e) => (/이름|용량|시간/.test(e) ? 0 : /시작일|종료일/.test(e) ? 1 : 2);
    if (err && stepOf(err) <= step) return setError(err);
    setError("");
    if (step < 2) return setStep(step + 1);
    try {
      onSave(input);
    } catch (e) {
      setError(e.message);
    }
  }

  async function pickPhoto(e) {
    const file = e.target.files?.[0];
    if (file) set({ photo: await resizeImageFile(file, 320, 0.75).catch(() => "") });
  }

  const started = med && med.startDate < todayKey();
  return (
    <div className="screen">
      <button className="btn-ghost" style={{ marginBottom: 12 }} onClick={step ? () => setStep(step - 1) : onCancel}>
        ← {step ? "이전" : "취소"}
      </button>
      <div className="h1">{med ? "약 고치기" : "약 추가"}</div>
      <div className="onb-progress" style={{ margin: "8px 0 16px", maxWidth: "none" }}>
        <div style={{ width: `${((step + 1) / 3) * 100}%` }} />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        {step === 0 && (
          <>
            <div className="field">
              <label>약 이름 *</label>
              <input value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="예: 심장약, 넥스가드" maxLength={40} />
            </div>
            <div className="field">
              <label>1회 용량 * <span className="faint">(처방전에 적힌 그대로)</span></label>
              <input value={f.dose} onChange={(e) => set({ dose: e.target.value })} placeholder="예: 1알, 반 알, 0.5ml" maxLength={30} />
            </div>
            <div className="field">
              <label>하루 몇 번 *</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4].map((n) => (
                  <button key={n} type="button" className={`seg${f.times.length === n ? " on" : ""}`} onClick={() => set({ times: DEFAULT_TIMES[n - 1] })}>
                    {n}번
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>복용 시간 *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {f.times.map((t, i) => (
                  <input key={i} type="time" value={t} style={{ width: "auto", flex: "1 1 40%" }} onChange={(e) => set({ times: f.times.map((x, j) => (j === i ? e.target.value : x)) })} />
                ))}
              </div>
            </div>
            {started && <p className="faint" style={{ margin: 0 }}>용량·시간·요일을 바꾸면 오늘부터 새 처방으로 적용되고, 지난 기록은 그대로 남아요.</p>}
          </>
        )}

        {step === 1 && (
          <>
            <div className="field">
              <label>시작일 *</label>
              <input type="date" value={f.startDate} disabled={started} onChange={(e) => set({ startDate: e.target.value })} />
            </div>
            <div className="field">
              <label>종료일 <span className="faint">(비우면 계속 먹는 약)</span></label>
              <input type="date" value={f.endDate} min={f.startDate} onChange={(e) => set({ endDate: e.target.value })} />
            </div>
            <div className="field">
              <label>먹는 요일</label>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" className={`seg${f.days.length === 0 ? " on" : ""}`} onClick={() => set({ days: [] })}>매일</button>
                {DAY_NAMES.map((n, d) => (
                  <button
                    key={d}
                    type="button"
                    className={`seg${f.days.includes(d) ? " on" : ""}`}
                    onClick={() => {
                      const days = f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d];
                      set({ days: days.length === 7 ? [] : days });
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="faint" style={{ marginTop: 0 }}>모두 선택 항목이에요. 비워 두고 저장해도 돼요.</p>
            <div className="field">
              <label>약 사진</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {f.photo && <img src={f.photo} alt="약 사진" className="med-photo" />}
                <label className="btn-ghost" style={{ flex: 1, textAlign: "center" }}>
                  {f.photo ? "다른 사진" : "사진 찍기 / 고르기"}
                  <input type="file" accept="image/*" onChange={pickPhoto} style={{ display: "none" }} />
                </label>
                {f.photo && <button type="button" className="link-btn" onClick={() => set({ photo: "" })}>빼기</button>}
              </div>
            </div>
            <div className="field">
              <label>처방 목적·메모</label>
              <textarea rows={2} value={f.purpose} onChange={(e) => set({ purpose: e.target.value })} placeholder="예: 심장 질환, 밥 먹고 30분 뒤" maxLength={200} />
            </div>
            <div className="field">
              <label>남은 수량 계산</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input inputMode="decimal" value={f.stockBase} onChange={(e) => set({ stockBase: e.target.value })} placeholder="지금 가진 개수" />
                <input inputMode="decimal" value={f.perDose} onChange={(e) => set({ perDose: e.target.value })} placeholder="1회에 쓰는 개수" />
              </div>
              <span className="faint">[먹였어요] 기록만큼 줄어들어요. 실제 개수와 다르면 여기서 고치면 돼요.</span>
            </div>
            <label className="checklist-item" style={{ borderBottom: "none", paddingBottom: 0 }}>
              <input type="checkbox" checked={f.remind} onChange={(e) => set({ remind: e.target.checked })} />
              <div>복용 시간에 알림 받기</div>
            </label>
          </>
        )}
        {error && <p className="error-text" style={{ marginBottom: 0 }}>{error}</p>}
      </div>

      <button className="btn-primary" onClick={next}>{step < 2 ? "다음" : "저장"}</button>

      {med && step === 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn-ghost" style={{ flex: 1 }} onClick={() => confirm(`${josa(med.name, "을", "를")} 그만 먹나요? 지난 기록은 남아요.`) && onStop()}>
            복용 끝내기
          </button>
          <button className="btn-ghost" style={{ flex: 1, color: "var(--danger)" }} onClick={() => confirm(`잘못 등록한 약인가요? ${josa(med.name, "과", "와")} 모든 복용 기록을 지워요.`) && onDelete()}>
            삭제
          </button>
        </div>
      )}
    </div>
  );
}
