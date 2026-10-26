import { useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";
import { addExpense, updateExpense, deleteExpense, quickItems, categoryIco, isMedical, VET_ITEMS, CLAIMS, saveFixedExpense, deleteFixedExpense } from "../services/expenses";

const won = (n) => `${n.toLocaleString("ko-KR")}원`;
const commas = (text) => {
  const d = String(text).replace(/\D/g, "");
  return d ? Number(d).toLocaleString("ko-KR") : "";
};

// 지출 추가·고치기 시트(아래에서 올라옴). initial: { id?, title?, amount?, categoryId?, date, memo? } — id가 있으면 고치기
// 순서: 자주 쓰는 내역 → 분류 → 내용 → 금액 → 날짜 → 메모
export default function ExpenseSheet({ dog, categories, expenses, initial, onClose, onSaved }) {
  const editing = Boolean(initial.id);
  const [title, setTitle] = useState(initial.title || "");
  const [amountText, setAmountText] = useState(initial.amount ? commas(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial.categoryId || "");
  const [catPicked, setCatPicked] = useState(Boolean(initial.categoryId)); // 직접 고르기 전엔 내용에 분류 이름이 있으면 그걸로("사료" → 사료)
  const [date, setDate] = useState(initial.date);
  const [memo, setMemo] = useState(initial.memo || "");
  // 병원·예방 지출만: 세부 항목, 보험 청구 상태, 받은 보험금
  const [items, setItems] = useState(initial.items || []);
  const [claim, setClaim] = useState(initial.claim || "");
  const [claimPaidText, setClaimPaidText] = useState(initial.claimPaid ? commas(initial.claimPaid) : "");
  const medical = isMedical(categoryId);
  const [error, setError] = useState("");
  const quick = editing ? [] : quickItems(expenses);

  function handleTitle(value) {
    setTitle(value);
    if (catPicked) return;
    const v = value.replace(/\s+/g, "");
    const hit = categories.find((c) => c.name.split(/[·()]/).some((part) => part && v.includes(part)));
    if (hit) setCategoryId(hit.id);
  }

  function fillQuick(q) {
    setTitle(q.title);
    setAmountText(commas(q.amount));
    if (categories.some((c) => c.id === q.categoryId)) (setCategoryId(q.categoryId), setCatPicked(true));
    setMemo(q.memo || "");
  }

  function save() {
    const amount = Number(amountText.replace(/\D/g, ""));
    if (!title.trim()) return setError("무엇에 썼는지 적어 주세요.");
    if (!amount) return setError("금액을 적어 주세요.");
    if (!categoryId) return setError("분류를 골라 주세요.");
    if (!date) return setError("날짜를 골라 주세요.");
    const fields = {
      title: title.trim(), amount, categoryId, date, memo: memo.trim(),
      items: medical ? items : [], claim: medical ? claim : "", claimPaid: medical && claim === "paid" ? Number(claimPaidText.replace(/\D/g, "")) || null : null,
    };
    onSaved(editing ? updateExpense(dog.id, initial.id, fields) : addExpense(dog.id, fields), date);
  }

  function remove() {
    if (!confirm("이 지출을 지울까요?")) return;
    onSaved(deleteExpense(dog.id, initial.id), date);
  }

  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label={editing ? "지출 고치기" : "지출 기록"}>
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">{editing ? "지출 고치기" : "지출 기록"}</div>
          <span style={{ width: 36 }} />
        </div>

        <div className="es-scroll" style={{ padding: "4px 16px 12px" }}>
          {quick.length > 0 && (
            <>
              <div className="xs-label">자주 쓰는 내역</div>
              <div className="chip-wrap" style={{ marginBottom: 14 }}>
                {quick.map((q) => (
                  <button key={q.title} type="button" className="chip xs-quick" onClick={() => fillQuick(q)}>
                    {q.title} · {won(q.amount)}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="xs-label">분류</div>
          <div className="chip-wrap" style={{ marginBottom: 14 }}>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className="chip cat-chip"
                aria-pressed={categoryId === c.id}
                onClick={() => (setCategoryId(c.id), setCatPicked(true))}
                style={{ "--ev": c.color, border: categoryId === c.id ? "2px solid var(--accent)" : "2px solid transparent", fontSize: 13, padding: "5px 10px" }}
              >
                <Ico name={categoryIco(c)} size={14} /> {c.name}
              </button>
            ))}
          </div>

          <div className="xs-label">무엇에 썼나요</div>
          <input className="es-input" value={title} onChange={(e) => handleTitle(e.target.value)} placeholder="예: 예방접종" maxLength={60} aria-label="무엇에 썼나요" />
          <div className="xs-label">금액</div>
          <div className="xs-amount">
            <input className="es-input" value={amountText} onChange={(e) => setAmountText(commas(e.target.value))} inputMode="numeric" placeholder="0" aria-label="금액" />
            <span>원</span>
          </div>
          <div className="xs-label">날짜</div>
          <input className="es-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="날짜" />
          <div className="xs-label">메모 (선택)</div>
          <input className="es-input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 행복동물병원, 슬개골 검사" maxLength={100} aria-label="메모" />
          {medical && (
            <>
              <div className="xs-label">병원비 항목 (선택)</div>
              <div className="chip-wrap" style={{ marginBottom: 14 }}>
                {VET_ITEMS.map((x) => (
                  <button key={x} type="button" className={`seg${items.includes(x) ? " on" : ""}`} style={{ flex: "0 0 auto" }} aria-pressed={items.includes(x)} onClick={() => setItems((l) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]))}>
                    {x}
                  </button>
                ))}
              </div>
              <div className="xs-label">보험 청구</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {CLAIMS.map(([id, label]) => (
                  <button key={id} type="button" className={`seg${claim === id ? " on" : ""}`} aria-pressed={claim === id} onClick={() => setClaim(id)}>{label}</button>
                ))}
              </div>
              {claim === "paid" && (
                <div className="xs-amount">
                  <input className="es-input" value={claimPaidText} onChange={(e) => setClaimPaidText(commas(e.target.value))} inputMode="numeric" placeholder="받은 보험금" aria-label="받은 보험금" style={{ fontSize: 16 }} />
                  <span>원</span>
                </div>
              )}
              {claim && <p className="faint" style={{ marginTop: 0 }}>영수증·진료비 세부내역서는 보험사마다 필요한 서류가 달라요. 받아 두면 청구할 때 편해요.</p>}
            </>
          )}
          {error && <p className="error-text" role="alert">{error}</p>}
        </div>

        <div className="es-foot">
          {editing ? <button type="button" className="link-btn" style={{ color: "var(--danger)", margin: 0 }} onClick={remove}>삭제</button> : <span />}
          <button type="button" className="btn-primary es-save" onClick={save}>저장</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// 매달 나가는 돈 등록·고치기 시트. initial: { id?, title?, amount?, categoryId?, day?, memo? }
// 저장하면 날이 될 때마다 가계부에 저절로 기록된다(등록한 날 이후 회차부터)
export function FixedSheet({ dog, categories, initial, today, onClose, onSaved }) {
  const editing = Boolean(initial.id);
  const [title, setTitle] = useState(initial.title || "");
  const [amountText, setAmountText] = useState(initial.amount ? commas(initial.amount) : "");
  const [categoryId, setCategoryId] = useState(initial.categoryId || categories.find((c) => c.id === "insurance")?.id || "");
  const [day, setDay] = useState(initial.day || Number(today.slice(8)));
  const [memo, setMemo] = useState(initial.memo || "");
  const [error, setError] = useState("");

  function save() {
    const amount = Number(amountText.replace(/\D/g, ""));
    if (!title.trim()) return setError("무엇이 나가는지 적어 주세요. (예: 펫보험)");
    if (!amount) return setError("금액을 적어 주세요.");
    if (!categoryId) return setError("분류를 골라 주세요.");
    saveFixedExpense(dog.id, { id: initial.id, title: title.trim(), amount, categoryId, day: Number(day), memo: memo.trim() }, today);
    onSaved();
  }
  function remove() {
    if (!confirm("매달 나가는 돈에서 뺄까요? 이미 가계부에 기록된 지출은 그대로 남아요.")) return;
    deleteFixedExpense(dog.id, initial.id);
    onSaved();
  }

  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label={editing ? "매달 나가는 돈 고치기" : "매달 나가는 돈 등록"}>
        <div className="es-top">
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>✕</button>
          <div className="es-title">{editing ? "매달 나가는 돈 고치기" : "매달 나가는 돈 등록"}</div>
          <span style={{ width: 36 }} />
        </div>
        <div className="es-scroll" style={{ padding: "4px 16px 12px" }}>
          <p className="faint" style={{ marginTop: 0 }}>보험료·정기 배송처럼 매달 나가는 돈을 등록하면, 그날이 될 때마다 가계부에 저절로 기록돼요.</p>
          <div className="xs-label">분류</div>
          <div className="chip-wrap" style={{ marginBottom: 14 }}>
            {categories.map((c) => (
              <button key={c.id} type="button" className="chip cat-chip" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)} style={{ "--ev": c.color, border: categoryId === c.id ? "2px solid var(--accent)" : "2px solid transparent", fontSize: 13, padding: "5px 10px" }}>
                <Ico name={categoryIco(c)} size={14} /> {c.name}
              </button>
            ))}
          </div>
          <div className="xs-label">무엇이 나가나요</div>
          <input className="es-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 펫보험, 정기 배송 사료" maxLength={60} aria-label="무엇이 나가나요" />
          <div className="xs-label">한 달 금액</div>
          <div className="xs-amount">
            <input className="es-input" value={amountText} onChange={(e) => setAmountText(commas(e.target.value))} inputMode="numeric" placeholder="0" aria-label="한 달 금액" />
            <span>원</span>
          </div>
          <div className="xs-label">매달 며칠에 나가나요</div>
          <select className="es-input" value={day} onChange={(e) => setDay(e.target.value)} aria-label="매달 나가는 날">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}일{d >= 29 ? " (없는 달은 말일)" : ""}</option>
            ))}
          </select>
          <div className="xs-label">메모 (선택)</div>
          <input className="es-input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: ○○펫보험, 자동이체 카드" maxLength={100} aria-label="메모" />
          {!editing && Number(day) < Number(today.slice(8)) && <p className="faint" style={{ marginTop: 0 }}>이번 달 {day}일은 지났으니 다음 달부터 기록돼요. 이번 달 것은 따로 적어 주세요.</p>}
          {error && <p className="error-text" role="alert">{error}</p>}
        </div>
        <div className="es-foot">
          {editing ? <button type="button" className="link-btn" style={{ color: "var(--danger)", margin: 0 }} onClick={remove}>등록 해제</button> : <span />}
          <button type="button" className="btn-primary es-save" onClick={save}>저장</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
