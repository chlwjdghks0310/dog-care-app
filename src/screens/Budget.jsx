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
  updateExpense,
  UNKNOWN_CATEGORY,
  CATEGORY_CHOICES,
  categoryIco,
} from "../services/expenses";
import { compareSameTime, detectFixed, projectMonth, bigExpenseThreshold, weeklyTotals, topItems, categoryCompare } from "../services/budgetInsights";
import Ico from "../components/Ico";

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
  const [analysisView, setAnalysisView] = useState("category"); // category | week
  const [editing, setEditing] = useState(null); // 고치는 중인 지출 { id, title, amountText, categoryId, date }

  const [title, setTitle] = useState("");
  const [amountText, setAmountText] = useState("");
  const [categoryId, setCategoryId] = useState(() => getCategories()[0]?.id);
  const [catPicked, setCatPicked] = useState(false); // 직접 고르기 전엔 적은 내용에 카테고리 이름이 있으면 그걸로("사료" → 사료)
  function handleTitle(value) {
    setTitle(value);
    if (catPicked) return;
    const hit = categories.find((c) => value.includes(c.name));
    if (hit) setCategoryId(hit.id);
  }

  const [newCatName, setNewCatName] = useState("");
  const [newCatIco, setNewCatIco] = useState(CATEGORY_CHOICES[6]); // [아이콘 이름, 이모지]

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

  const today = todayKey();
  const isThisMonth = today.startsWith(monthPrefix);
  const same = isThisMonth ? compareSameTime(expenses, today) : null;
  const fixed = useMemo(() => detectFixed(expenses, monthPrefix), [expenses, monthPrefix]);
  const bigLine = useMemo(() => bigExpenseThreshold(expenses), [expenses]);
  const projected = isThisMonth ? projectMonth(expenses, today, fixed, bigLine) : null;
  const weeks = weeklyTotals(expenses, monthPrefix);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.total));
  const top = topItems(monthExpenses);
  const catCompare = categoryCompare(expenses, monthPrefix, (id) => categoryById(id).id);
  const daysLeft = isThisMonth ? new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate() - Number(today.slice(8)) + 1 : 0;
  const bigDays = new Set(monthExpenses.filter((e) => e.amount >= bigLine).map((e) => e.date));

  function startEdit(e) {
    setEditing({ id: e.id, title: e.title, amountText: e.amount.toLocaleString("ko-KR"), categoryId: categoryById(e.categoryId).id === "unknown" ? categories[0]?.id : e.categoryId, date: e.date });
  }
  function saveEdit() {
    const amount = Number(editing.amountText.replace(/\D/g, ""));
    if (!editing.title.trim() || !amount || !editing.date) return;
    setExpenses(updateExpense(dog.id, editing.id, { title: editing.title.trim(), amount, categoryId: editing.categoryId, date: editing.date }));
    setEditing(null);
  }

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
    setCatPicked(false);
    setAmountText("");
  }

  function handleAddCategory(e) {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    setCategories(addCategory(name, newCatIco[1], newCatIco[0]));
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
      <div className="card bud-sum" style={{ marginBottom: 14 }}>
        <div className="faint">{monthDate.getMonth() + 1}월 쓴 돈</div>
        <div className="bud-total">{won(monthTotal)}</div>
        {same && (
          <p className="bud-insight">
            {!same.hasPrev
              ? "지난달 기록이 없어서 아직 비교할 수 없어요."
              : same.diff === 0
                ? "지난달 이맘때와 똑같이 썼어요."
                : <>지난달 이맘때보다 <b className={same.diff > 0 ? "up" : "down"}>{won(Math.abs(same.diff))} {same.diff > 0 ? "더" : "덜"}</b> 썼어요</>}
          </p>
        )}
        {projected != null && projected > monthTotal && (
          <p className="faint" style={{ margin: "2px 0 0" }}>이대로면 이번 달 약 {won(Math.round(projected / 1000) * 1000)} 쓸 것 같아요 (예상)</p>
        )}

        <label className="bud-allow">
          <span className="faint">{withI(dog.name)}의 용돈</span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
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
              style={{ width: inputWidth(allowanceText ?? (allowance ? allowance.toLocaleString("ko-KR") : "")), maxWidth: "100%", minWidth: 0, border: "none", background: "none", padding: 0, fontSize: 17, fontWeight: 700, textAlign: "right", color: "var(--text)" }}
            />
            {(allowanceText ?? allowance) ? <strong style={{ fontSize: 17 }}>원</strong> : null}
          </span>
        </label>
        {allowance ? (
          <>
            <div className="bud-bar" role="img" aria-label={`용돈 ${won(allowance)} 중 ${won(monthTotal)} 사용`}>
              <span style={{ width: `${Math.min(100, (monthTotal / allowance) * 100)}%`, background: monthTotal > allowance ? "var(--danger)" : "var(--accent)" }} />
            </div>
            <p style={{ margin: "6px 0 0", fontWeight: 700, color: allowance - monthTotal >= 0 ? "var(--accent-strong)" : "var(--danger)" }}>
              {allowance - monthTotal >= 0 ? `${won(allowance - monthTotal)} 남았어요` : `${won(monthTotal - allowance)} 넘게 썼어요`}
              {isThisMonth && allowance > monthTotal && daysLeft > 0 && <span className="faint" style={{ fontWeight: 400 }}> · 하루 {won(Math.floor((allowance - monthTotal) / daysLeft / 100) * 100)}씩 쓸 수 있어요</span>}
            </p>
          </>
        ) : (
          <p className="faint" style={{ margin: "6px 0 0" }}>용돈을 넣으면 남은 돈과 하루에 쓸 수 있는 돈을 알려 드려요</p>
        )}
      </div>

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
            <span style={{ fontSize: 10, height: 12, color: bigDays.has(key) ? "var(--danger)" : "var(--accent-strong)", fontWeight: 600, whiteSpace: "nowrap" }}>
              {dayTotals[key] ? shortWon(dayTotals[key]) : ""}
            </span>
          )}
        />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="h2" style={{ margin: 0 }}>지출 분석</div>
          <div style={{ display: "flex", gap: 4 }}>
            <button type="button" className={`seg${analysisView === "category" ? " on" : ""}`} style={{ flex: "0 0 auto", padding: "6px 12px", whiteSpace: "nowrap" }} onClick={() => setAnalysisView("category")}>카테고리</button>
            <button type="button" className={`seg${analysisView === "week" ? " on" : ""}`} style={{ flex: "0 0 auto", padding: "6px 12px", whiteSpace: "nowrap" }} onClick={() => setAnalysisView("week")}>주별</button>
          </div>
        </div>
        {byCategory.length === 0 ? (
          <p className="subtle" style={{ margin: 0 }}>이번 달 기록이 아직 없어요.</p>
        ) : analysisView === "week" ? (
          <div className="bud-weeks">
            {weeks.map((w) => {
              const now = isThisMonth && Number(today.slice(8)) >= w.from && Number(today.slice(8)) <= w.to;
              return (
                <div key={w.week} className={`bud-week${now ? " now" : ""}`}>
                  <span className="bud-week-label">{w.week}주<span className="faint"> {w.from}~{w.to}일</span></span>
                  <span className="bud-week-bar"><span style={{ width: `${(w.total / maxWeek) * 100}%` }} /></span>
                  <span className="bud-week-amt">{w.total ? won(w.total) : "-"}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="bud-donut-wrap">
              <Donut parts={byCategory.map(({ id, total }) => ({ value: total, color: colorOf(id) }))} />
              <div className="bud-donut-center">
                <span className="faint">{byCategory.length}개 분야</span>
                <b>{won(monthTotal)}</b>
              </div>
            </div>
            {catCompare.map(({ id, total, prev }) => {
              const cat = categoryById(id);
              const active = filterCategoryId === id;
              const diff = total - prev;
              return (
                <button key={id} type="button" className={`bud-cat${active ? " on" : ""}`} aria-pressed={active} onClick={() => setFilterCategoryId(active ? null : id)}>
                  <span className="bud-cat-icon" style={{ background: colorOf(id) }}><Ico name={categoryIco(cat)} size={20} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="bud-cat-name">{cat.name} <span className="faint">{Math.round((total / monthTotal) * 100)}%</span></span>
                    {prev > 0 && diff !== 0 && <span className={`bud-cat-diff ${diff > 0 ? "up" : "down"}`}>지난달보다 {won(Math.abs(diff))} {diff > 0 ? "더" : "덜"}</span>}
                  </span>
                  <span className="bud-amt">{won(total)}</span>
                </button>
              );
            })}
            {top.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="faint" style={{ marginBottom: 6 }}>이번 달 자주 산 것</div>
                <div className="chip-wrap">
                  {top.map((t) => (
                    <span key={t.title} className="bud-top"><Ico name={categoryIco(categoryById(t.categoryId))} size={14} /> {t.title} <b>{t.count}번</b></span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {fixed.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="h2" style={{ marginBottom: 4 }}>매달 나가는 돈</div>
          <p className="faint" style={{ marginTop: 0 }}>최근 3달 중 2달 이상 같은 이름으로 적은 지출이에요.</p>
          {fixed.map((f) => (
            <div key={f.title} className="bud-row">
              <span className="bud-cat-icon" style={{ background: colorOf(categoryById(f.categoryId).id) }}><Ico name={categoryIco(categoryById(f.categoryId))} size={20} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="bud-row-title">{f.title}</span>
                <span className="faint">보통 {f.day}일쯤 · 평균 {won(f.avg)}</span>
              </span>
              {isThisMonth || f.paidThisMonth ? <span className={`bud-badge${f.paidThisMonth ? " done" : ""}`}>{f.paidThisMonth ? "냈어요" : "아직"}</span> : null}
            </div>
          ))}
        </div>
      )}

      {/* 카테고리 관리를 열면 지출 칸 자리에 대신 보여 준다 */}
      {!showCategoryManager && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div className="h2" style={{ margin: 0 }}>
              {filterCategoryId
                ? <><Ico name={categoryIco(categoryById(filterCategoryId))} size={18} /> 이번 달 {categoryById(filterCategoryId).name}</>
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
                <Ico name="settings" size={15} /> 카테고리 관리
              </button>
            )}
          </div>

          {!filterCategoryId && dayTotals[selectedDateKey] > 0 && <p className="faint" style={{ margin: "-4px 0 6px" }}>이날 합계 {won(dayTotals[selectedDateKey])}</p>}
          {listed.length === 0 ? (
            <p className="subtle" style={{ marginBottom: 10 }}>기록이 없어요.</p>
          ) : (
            <div style={{ marginBottom: 10 }}>
              {listed.map((e) => {
                const cat = categoryById(e.categoryId);
                if (editing?.id === e.id)
                  return (
                    <div key={e.id} className="bud-edit">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                        {categories.map((c) => (
                          <button key={c.id} type="button" className="chip cat-chip" onClick={() => setEditing((x) => ({ ...x, categoryId: c.id }))} style={{ "--ev": colorOf(c.id), border: editing.categoryId === c.id ? "2px solid var(--accent)" : "2px solid transparent", fontSize: 13, padding: "5px 10px" }}>
                            <Ico name={categoryIco(c)} size={14} /> {c.name}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input value={editing.title} onChange={(ev) => setEditing((x) => ({ ...x, title: ev.target.value }))} aria-label="무엇에 썼나요" style={{ ...inputStyle, flex: 2 }} />
                        <input value={editing.amountText} inputMode="numeric" aria-label="금액" onChange={(ev) => { const d = ev.target.value.replace(/\D/g, ""); setEditing((x) => ({ ...x, amountText: d ? Number(d).toLocaleString("ko-KR") : "" })); }} style={{ ...inputStyle, flex: 1 }} />
                      </div>
                      <input type="date" value={editing.date} onChange={(ev) => setEditing((x) => ({ ...x, date: ev.target.value }))} aria-label="날짜" style={{ ...inputStyle, width: "100%", marginBottom: 8 }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="btn-ghost small" style={{ color: "var(--danger)" }} onClick={() => { if (confirm("이 지출을 지울까요?")) { setExpenses(deleteExpense(dog.id, e.id)); setEditing(null); } }}>삭제</button>
                        <span style={{ flex: 1 }} />
                        <button type="button" className="btn-ghost small" onClick={() => setEditing(null)}>취소</button>
                        <button type="button" className="btn-primary small" onClick={saveEdit}>저장</button>
                      </div>
                    </div>
                  );
                const big = e.amount >= bigLine;
                return (
                  <button key={e.id} type="button" className="bud-row bud-row-btn" onClick={() => startEdit(e)} aria-label={`${e.title} ${won(e.amount)} 고치기`}>
                    <span className="bud-cat-icon" style={{ background: colorOf(cat.id) }}><Ico name={categoryIco(cat)} size={20} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="bud-row-title">{e.title}</span>
                      <span className="faint">{cat.name}{filterCategoryId ? ` · ${formatKoreanDate(e.date)}` : ""}{big ? " · 평소보다 큰 지출" : ""}</span>
                    </span>
                    <span className="bud-amt" style={big ? { color: "var(--danger)" } : undefined}>{won(e.amount)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!filterCategoryId && !editing && (
            <form onSubmit={handleAdd}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="chip cat-chip"
                    onClick={() => (setCategoryId(c.id), setCatPicked(true))}
                    style={{ "--ev": colorOf(c.id), border: categoryId === c.id ? "2px solid var(--accent)" : "2px solid transparent", fontSize: 13, padding: "5px 10px" }}
                  >
                    <Ico name={categoryIco(c)} size={14} /> {c.name}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={title} onChange={(e) => handleTitle(e.target.value)} placeholder="무엇에 썼나요? (예: 예방접종)" style={{ ...inputStyle, flex: 2 }} />
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
              <span key={c.id} className="chip cat-chip" style={{ "--ev": colorOf(c.id), fontSize: 13, padding: "5px 6px 5px 10px", gap: 4 }}>
                <Ico name={categoryIco(c)} size={14} /> {c.name}
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
            <div className="faint" style={{ marginBottom: 6 }}>아이콘 고르기</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginBottom: 8 }}>
              {CATEGORY_CHOICES.map((choice, i) => (
                <button
                  key={choice[0]}
                  type="button"
                  className={`cat-pick${newCatIco[0] === choice[0] ? " on" : ""}`}
                  aria-label={`아이콘 ${choice[0]}`}
                  aria-pressed={newCatIco[0] === choice[0]}
                  onClick={() => setNewCatIco(choice)}
                  style={{ "--ev": CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                >
                  <Ico name={choice[0]} size={20} />
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span aria-hidden="true" style={{ ...inputStyle, width: 44, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-strong)", padding: 0 }}>
                <Ico name={newCatIco[0]} size={20} />
              </span>
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

// 카테고리 비율 도넛(SVG) — 조각 사이 작은 틈
function Donut({ parts, size = 168, stroke = 26 }) {
  const total = parts.reduce((t, p) => t + p.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = parts.length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="카테고리별 지출 비율">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {parts.map((p, i) => {
          const len = (p.value / total) * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={stroke} strokeDasharray={`${Math.max(0.5, len - gap)} ${c}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
      </g>
    </svg>
  );
}
