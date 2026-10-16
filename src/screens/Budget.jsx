import { useEffect, useMemo, useState } from "react";
import MonthGrid from "../components/MonthGrid";
import { todayKey, formatKoreanDate } from "../utils/date";
import {
  getCategories,
  addCategory,
  deleteCategory,
  getExpenses,
  addExpense,
  deleteExpense,
  getAllowance,
  setAllowance,
  UNKNOWN_CATEGORY,
} from "../services/expenses";

const EMOJI_CHOICES = ["🏥", "💊", "💉", "🧸", "🎾", "🧴", "🛁", "✂️", "🦴", "🍖", "🍚", "🥫", "🦮", "🎀", "👕", "🏠", "🚗", "🏨", "🎓", "📸", "🛡️", "🎂", "🧻", "💰"];

const inputStyle = { height: 40, border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", fontSize: 16, minWidth: 0 };

// 카테고리 색 — 카테고리 목록 순서대로 정해져서 달이 바뀌어도 같은 색
const CATEGORY_COLORS = ["#e8774a", "#4a90e2", "#5cb85c", "#f0b429", "#9b6dd6", "#e05a8a", "#2bb5a5", "#8d6e63", "#7f8c8d", "#c0392b"];

// 받침 있는 이름은 "초롱이의", 없는 이름은 "보리의"
const withI = (name) => {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0 ? `${name}이` : name;
};

// 금액 입력칸을 숫자 길이만큼만(뒤의 "원"이 숫자에 붙도록). 비어 있으면 안내 문구 크기.
const inputWidth = (text) => (text ? `${text.replace(/,/g, "").length * 0.6 + (text.match(/,/g) || []).length * 0.3 + 0.15}em` : "5em");

const won = (n) => `${n.toLocaleString("ko-KR")}원`;
// 달력 칸에 들어갈 짧은 금액: 12,000 → 1.2만
const shortWon = (n) => (n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만` : n.toLocaleString("ko-KR"));

export default function Budget({ dog }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey());
  const [expenses, setExpenses] = useState(() => getExpenses(dog.id));
  const [categories, setCategories] = useState(getCategories);
  const [filterCategoryId, setFilterCategoryId] = useState(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const [title, setTitle] = useState("");
  const [amountText, setAmountText] = useState("");
  const [categoryId, setCategoryId] = useState(() => getCategories()[0]?.id);

  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("🎾");

  const categoryById = (id) => categories.find((c) => c.id === id) || UNKNOWN_CATEGORY;
  const colorOf = (id) => {
    const i = categories.findIndex((c) => c.id === id);
    return i < 0 ? "#b0a89f" : CATEGORY_COLORS[i % CATEGORY_COLORS.length];
  };

  const monthPrefix = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
  const [allowance, setAllowanceState] = useState(() => getAllowance(dog.id, monthPrefix));
  const [allowanceText, setAllowanceText] = useState(null); // 입력 중일 때만 문자열
  useEffect(() => {
    setAllowanceState(getAllowance(dog.id, monthPrefix));
    setAllowanceText(null);
  }, [dog.id, monthPrefix]);

  function saveAllowance() {
    if (allowanceText === null) return;
    const amount = Number(allowanceText.replace(/\D/g, "")) || null;
    setAllowance(dog.id, monthPrefix, amount);
    setAllowanceState(amount);
    setAllowanceText(null);
  }
  const monthExpenses = useMemo(() => expenses.filter((e) => e.date.startsWith(monthPrefix)), [expenses, monthPrefix]);
  const monthTotal = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const dayTotals = useMemo(() => {
    const map = {};
    for (const e of monthExpenses) map[e.date] = (map[e.date] || 0) + e.amount;
    return map;
  }, [monthExpenses]);

  // 이번 달 카테고리별 합계(큰 순서)
  const categoryTotals = {};
  for (const e of monthExpenses) {
    const id = categoryById(e.categoryId).id;
    categoryTotals[id] = (categoryTotals[id] || 0) + e.amount;
  }
  const byCategory = Object.entries(categoryTotals)
    .map(([id, total]) => ({ id, total }))
    .sort((a, b) => b.total - a.total);

  const listed = filterCategoryId
    ? monthExpenses
        .filter((e) => categoryById(e.categoryId).id === filterCategoryId)
        .sort((a, b) => b.date.localeCompare(a.date))
    : expenses.filter((e) => e.date === selectedDateKey);

  function handleAdd(e) {
    e.preventDefault();
    const amount = Number(amountText.replace(/\D/g, ""));
    if (!title.trim() || !amount || !categoryId) return;
    setExpenses(addExpense(dog.id, { title: title.trim(), amount, date: selectedDateKey, categoryId }));
    setTitle("");
    setAmountText("");
  }

  function handleAddCategory(e) {
    e.preventDefault();
    const name = newCatName.trim();
    const emoji = newCatEmoji.trim();
    if (!name || !emoji) return;
    setCategories(addCategory(name, emoji));
    setNewCatName("");
    setShowCategoryManager(false);
  }

  function handleDeleteCategory(cat) {
    const used = expenses.some((e) => e.categoryId === cat.id);
    if (used && !window.confirm(`'${cat.name}' 카테고리를 지울까요? 이 카테고리로 적은 기록은 '기타'로 보여요.`)) return;
    const next = deleteCategory(cat.id);
    setCategories(next);
    if (categoryId === cat.id) setCategoryId(next[0]?.id);
    if (filterCategoryId === cat.id) setFilterCategoryId(null);
  }

  return (
    <div className="screen">
      <div className="h1" style={{ marginBottom: 10 }}>가계부</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
        <div className="card" style={{ flex: 1, minWidth: 0, padding: "12px 14px" }}>
          <div className="faint">{monthDate.getMonth() + 1}월 지출</div>
          <strong style={{ fontSize: 20, color: "var(--accent-strong)" }}>{won(monthTotal)}</strong>
        </div>
        <label className="card" style={{ flex: 1, minWidth: 0, padding: "12px 14px", cursor: "text" }}>
          <div className="faint">{withI(dog.name)}의 용돈</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
          <input
            value={allowanceText ?? (allowance ? allowance.toLocaleString("ko-KR") : "")}
            onFocus={() => setAllowanceText(allowance ? allowance.toLocaleString("ko-KR") : "")}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              setAllowanceText(digits ? Number(digits).toLocaleString("ko-KR") : "");
            }}
            onBlur={saveAllowance}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            inputMode="numeric"
            placeholder="금액 넣기"
            aria-label={`${monthDate.getMonth() + 1}월 ${dog.name} 용돈`}
            style={{ width: inputWidth(allowanceText ?? (allowance ? allowance.toLocaleString("ko-KR") : "")), maxWidth: "100%", minWidth: 0, border: "none", background: "none", padding: 0, fontSize: 20, fontWeight: 700, color: "var(--text)" }}
          />
          {(allowanceText ?? allowance) ? <strong style={{ fontSize: 20 }}>원</strong> : <span aria-hidden="true">✏️</span>}
          </div>
        </label>
      </div>
      {allowance ? (
        <p style={{ margin: "0 0 14px", textAlign: "right", fontWeight: 700, color: allowance - monthTotal >= 0 ? "#2f7fd8" : "#d9443b" }}>
          {allowance - monthTotal >= 0 ? `+${won(allowance - monthTotal)} 남았어요` : `${won(monthTotal - allowance)} 넘게 썼어요`}
        </p>
      ) : (
        <p className="faint" style={{ margin: "0 0 14px", textAlign: "right" }}>용돈을 넣으면 남은 돈을 알려 드려요</p>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <MonthGrid
          monthDate={monthDate}
          onMonthChange={(d) => {
            setMonthDate(d);
            setFilterCategoryId(null);
          }}
          selectedDateKey={selectedDateKey}
          onSelect={(key) => {
            setSelectedDateKey(key);
            setFilterCategoryId(null);
          }}
          renderMarker={(key) => (
            <span style={{ fontSize: 10, height: 12, color: "var(--accent-strong)", fontWeight: 600, whiteSpace: "nowrap" }}>
              {dayTotals[key] ? shortWon(dayTotals[key]) : ""}
            </span>
          )}
        />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2" style={{ marginBottom: 10 }}>지출 분석</div>
        {byCategory.length === 0 ? (
          <p className="subtle" style={{ margin: 0 }}>이번 달 기록이 아직 없어요.</p>
        ) : (
          <>
            <div style={{ display: "flex", height: 22, borderRadius: 11, overflow: "hidden", gap: 2, marginBottom: 12 }} role="img" aria-label="카테고리별 지출 비율">
              {byCategory.map(({ id, total }) => (
                <div key={id} style={{ flex: total, minWidth: 4, background: colorOf(id) }} />
              ))}
            </div>
            {byCategory.map(({ id, total }) => {
              const cat = categoryById(id);
              const active = filterCategoryId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilterCategoryId(active ? null : id)}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", background: "none", border: "none", padding: "7px 0", fontSize: 14, fontWeight: active ? 700 : 400 }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: colorOf(id), flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{cat.emoji} {cat.name}</span>
                  <span>{won(total)} <span className="faint">({Math.round((total / monthTotal) * 100)}%)</span></span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* 카테고리 관리를 열면 지출 칸 자리에 대신 보여 준다 */}
      {!showCategoryManager && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div className="h2" style={{ margin: 0 }}>
              {filterCategoryId
                ? `${categoryById(filterCategoryId).emoji} 이번 달 ${categoryById(filterCategoryId).name}`
                : `${formatKoreanDate(selectedDateKey)} 지출`}
            </div>
            {filterCategoryId ? (
              <button className="faint" style={{ background: "none", border: "none" }} onClick={() => setFilterCategoryId(null)}>
                날짜별 보기
              </button>
            ) : (
              <button
                type="button"
                className="chip"
                aria-expanded={showCategoryManager}
                onClick={() => setShowCategoryManager(true)}
                style={{ fontSize: 13, padding: "5px 10px", whiteSpace: "nowrap" }}
              >
                ⚙️ 카테고리 관리
              </button>
            )}
          </div>

          {listed.length === 0 ? (
            <p className="subtle" style={{ marginBottom: 10 }}>기록이 없어요.</p>
          ) : (
            <div style={{ marginBottom: 10 }}>
              {listed.map((e) => {
                const cat = categoryById(e.categoryId);
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                      <div className="faint">{cat.name}{filterCategoryId ? ` · ${formatKoreanDate(e.date)}` : ""}</div>
                    </div>
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{won(e.amount)}</span>
                    <button className="faint" style={{ background: "none", border: "none" }} onClick={() => setExpenses(deleteExpense(dog.id, e.id))}>
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!filterCategoryId && (
            <form onSubmit={handleAdd}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="chip"
                    onClick={() => setCategoryId(c.id)}
                    style={{ border: categoryId === c.id ? "2px solid var(--accent)" : "2px solid transparent", fontSize: 13, padding: "5px 10px" }}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="무엇에 썼나요? (예: 예방접종)" style={{ ...inputStyle, flex: 2 }} />
                <input
                  value={amountText}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setAmountText(digits ? Number(digits).toLocaleString("ko-KR") : "");
                  }}
                  inputMode="numeric"
                  placeholder="금액(원)"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
                {formatKoreanDate(selectedDateKey)}에 기록하기
              </button>
            </form>
          )}
        </div>
      )}

      {showCategoryManager && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div className="h2" style={{ margin: 0 }}>카테고리 관리</div>
            <button className="faint" style={{ background: "none", border: "none" }} onClick={() => setShowCategoryManager(false)}>
              취소
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {categories.map((c) => (
              <span key={c.id} className="chip" style={{ fontSize: 13, padding: "5px 6px 5px 10px", gap: 4 }}>
                {c.emoji} {c.name}
                <button
                  type="button"
                  aria-label={`${c.name} 카테고리 삭제`}
                  onClick={() => handleDeleteCategory(c)}
                  style={{ background: "none", border: "none", padding: "0 4px", color: "inherit" }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <form onSubmit={handleAddCategory}>
            <div className="faint" style={{ marginBottom: 6 }}>이모티콘 고르기 (키보드 이모티콘도 직접 넣을 수 있어요)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 8 }}>
              {EMOJI_CHOICES.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setNewCatEmoji(em)}
                  style={{
                    fontSize: 20,
                    padding: "4px 0",
                    borderRadius: 8,
                    background: newCatEmoji === em ? "var(--accent-soft)" : "none",
                    border: newCatEmoji === em ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newCatEmoji}
                onChange={(e) => setNewCatEmoji(e.target.value)}
                aria-label="카테고리 이모티콘"
                style={{ ...inputStyle, width: 56, textAlign: "center", fontSize: 20, padding: 0 }}
              />
              <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="새 카테고리 이름 (예: 미용)" style={{ ...inputStyle, flex: 1 }} />
              <button type="submit" className="btn-primary" style={{ width: "auto", padding: "0 16px" }}>
                추가
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
