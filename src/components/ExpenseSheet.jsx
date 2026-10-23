import { useState } from "react";
import { createPortal } from "react-dom";
import Ico from "./Ico";
import { addExpense, updateExpense, deleteExpense, quickItems, categoryIco } from "../services/expenses";

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
    const fields = { title: title.trim(), amount, categoryId, date, memo: memo.trim() };
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
