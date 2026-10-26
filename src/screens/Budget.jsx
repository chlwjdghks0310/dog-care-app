import { useEffect, useMemo, useState } from "react";
import MonthGrid from "../components/MonthGrid";
import { todayKey, formatKoreanDate } from "../utils/date";
import {
  getCategories,
  addCategory,
  deleteCategory,
  updateCategory,
  getExpenses,
  getAllowance,
  setAllowance,
  searchExpenses,
  resolveCategoryId,
  UNKNOWN_CATEGORY,
  CATEGORY_COLORS,
  CLAIMS,
  expensesToCsv,
  CATEGORY_CHOICES,
  categoryIco,
} from "../services/expenses";
import { compareSameTime, detectFixed, projectMonth, bigExpenseThreshold, weeklyTotals, topItems, categoryCompare } from "../services/budgetInsights";
import Ico from "../components/Ico";
import ExpenseSheet from "../components/ExpenseSheet";
import { josa } from "../utils/text";
import { HOLIDAYS } from "../data/holidays";

const inputStyle = { height: 40, border: "1px solid var(--border)", borderRadius: 10, padding: "0 12px", fontSize: 16, minWidth: 0 };


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
  const [sheet, setSheet] = useState(null); // 지출 추가·고치기 시트 { id?, title?, amount?, categoryId?, date, memo? }
  const [search, setSearch] = useState(null); // 검색 중이면 검색어(문자열)
  const [claimView, setClaimView] = useState(false); // 보험 청구할 병원비만 보기
  const [editingCat, setEditingCat] = useState(null); // 분류 관리에서 고치는 분류 id

  const [newCatName, setNewCatName] = useState("");
  const [newCatIco, setNewCatIco] = useState(CATEGORY_CHOICES[6]); // [아이콘 이름, 이모지]

  // 지운 분류로 적은 기록은 "기타"(있으면 그 분류, 없으면 임시 기타)로. 합친 분류(장난감 → 용품)는 이어받은 분류로
  const categoryById = (id) => categories.find((c) => c.id === resolveCategoryId(id)) || categories.find((c) => c.id === "etc") || UNKNOWN_CATEGORY;
  const colorOf = (id) => categories.find((c) => c.id === id)?.color || "#b0a89f";

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

  const startEdit = (e) => setSheet({ id: e.id, title: e.title, amount: e.amount, categoryId: categoryById(e.categoryId).id === "unknown" ? "" : categoryById(e.categoryId).id, date: e.date, memo: e.memo });
  const openAdd = (extra = {}) => setSheet({ date: selectedDateKey > today ? today : selectedDateKey, ...extra });
  function handleSheetSaved(list, date) {
    setExpenses(list);
    setSheet(null);
    setSelectedDateKey(date);
    setMonthDate(new Date(`${date}T00:00:00`));
    setFilterCategoryId(null);
  }

  const searching = search !== null;
  const claimOpen = expenses.filter((e) => e.claim === "todo" || e.claim === "sent"); // 청구 전·청구함(아직 못 받음)
  const listed = claimView
    ? [...claimOpen].sort((a, b) => b.date.localeCompare(a.date))
    : searching
    ? searchExpenses(expenses, search, (id) => categoryById(id).name)
    : filterCategoryId
      ? monthExpenses.filter((e) => categoryById(e.categoryId).id === filterCategoryId).sort((a, b) => b.date.localeCompare(a.date))
      : expenses.filter((e) => e.date === selectedDateKey);
  const listedTotal = listed.reduce((t, e) => t + e.amount, 0);

  // 전체 지출을 CSV 파일로: 공유 시트(파일 공유 되는 기기) → 안 되면 내려받기
  const [exportMsg, setExportMsg] = useState("");
  async function exportCsv() {
    const name = `${dog.name}-가계부-${today}.csv`;
    const file = new File([expensesToCsv(expenses, (id) => categoryById(id).name)], name, { type: "text/csv" });
    try {
      if (navigator.canShare?.({ files: [file] })) return await navigator.share({ files: [file], title: name });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(file), download: name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (err) {
      if (err.name !== "AbortError") setExportMsg("내보내지 못했어요. 다시 시도해 주세요.");
    }
  }

  // 분류 추가·고치기(기본 분류도 이름·아이콘을 고칠 수 있다)
  function handleAddCategory(e) {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    setCategories(editingCat ? updateCategory(editingCat, { name, emoji: newCatIco[1], ico: newCatIco[0] }) : addCategory(name, newCatIco[1], newCatIco[0]));
    setNewCatName("");
    setEditingCat(null);
  }
  function startEditCategory(c) {
    setEditingCat(c.id);
    setNewCatName(c.name);
    setNewCatIco(CATEGORY_CHOICES.find(([ico]) => ico === categoryIco(c)) || [categoryIco(c), c.emoji]);
  }

  function handleDeleteCategory(cat) {
    const used = expenses.some((e) => e.categoryId === cat.id);
    if (used && !window.confirm(`'${cat.name}' 카테고리를 지울까요? 이 카테고리로 적은 기록은 '기타'로 보여요.`)) return;
    const next = deleteCategory(cat.id);
    setCategories(next);
    if (editingCat === cat.id) (setEditingCat(null), setNewCatName(""));
    if (filterCategoryId === cat.id) setFilterCategoryId(null);
  }

  return (
    <div className="screen">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div className="h1" style={{ margin: 0 }}>가계부</div>
        <button type="button" className="btn-primary small" onClick={() => openAdd()}>＋ 지출</button>
      </div>
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
          <p className="faint" style={{ margin: "2px 0 0" }}>이대로면 이번 달 약 {won(Math.round(projected / 1000) * 1000)} (지금까지 기록으로 본 예상)</p>
        )}

        {claimOpen.length > 0 && (
          <button type="button" className="bud-claim" onClick={() => (setClaimView(true), setSearch(null), setFilterCategoryId(null))}>
            <Ico name="umbrella" size={16} /> 보험 청구 기다리는 병원비 {claimOpen.length}건 · {won(claimOpen.reduce((t, e) => t + e.amount, 0))} ›
          </button>
        )}

        <label className="bud-allow">
          <span className="faint">{josa(dog.name, "이", "")}의 용돈</span>
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
          holidays={HOLIDAYS}
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
            <p className="faint bud-avg">참고: 농림축산식품부 2025 반려동물 양육현황 조사 기준, 개 1마리 양육비 월평균 약 13.5만 원(병원비 포함)</p>
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
              {f.paidThisMonth ? (
                <span className="bud-badge done">냈어요</span>
              ) : isThisMonth ? (
                <button type="button" className="chip bud-record" onClick={() => openAdd({ title: f.title, amount: f.lastAmount, categoryId: categoryById(f.categoryId).id, memo: f.memo, date: today })}>
                  기록
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* 카테고리 관리를 열면 지출 칸 자리에 대신 보여 준다 */}
      {!showCategoryManager && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div className="h2" style={{ margin: 0, minWidth: 0 }}>
              {claimView
                ? "보험 청구 기다리는 병원비"
                : searching
                ? "지출 찾기"
                : filterCategoryId
                  ? <><Ico name={categoryIco(categoryById(filterCategoryId))} size={18} /> 이번 달 {categoryById(filterCategoryId).name}</>
                  : `${formatKoreanDate(selectedDateKey)} 지출`}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {claimView ? (
                <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => setClaimView(false)}>닫기</button>
              ) : searching ? (
                <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => setSearch(null)}>닫기</button>
              ) : filterCategoryId ? (
                <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => setFilterCategoryId(null)}>날짜별 보기</button>
              ) : (
                <>
                  <button type="button" className="chip" aria-label="지출 찾기" onClick={() => setSearch("")} style={{ padding: "5px 9px" }}><Ico name="search" size={15} /></button>
                  <button type="button" className="chip" onClick={() => setShowCategoryManager(true)} style={{ fontSize: 13, padding: "5px 10px", whiteSpace: "nowrap" }}>
                    <Ico name="settings" size={15} /> 분류 관리
                  </button>
                </>
              )}
            </div>
          </div>

          {searching && (
            <>
              <input className="es-input" autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="내용·메모·분류 (예: 병원, 로얄캐닌)" aria-label="지출 찾기" />
              {search.trim() && <p className="faint" style={{ margin: "0 0 6px" }}>{listed.length}건 · {won(listedTotal)} (전체 기간)</p>}
            </>
          )}
          {claimView && <p className="faint" style={{ margin: "-4px 0 6px" }}>청구했거나 보험금을 받으면 지출을 눌러 "보험 청구"를 바꿔 주세요.</p>}
          {!claimView && !searching && !filterCategoryId && dayTotals[selectedDateKey] > 0 && <p className="faint" style={{ margin: "-4px 0 6px" }}>이날 합계 {won(dayTotals[selectedDateKey])}</p>}
          {listed.length === 0 ? (
            (!searching || search.trim()) && <p className="subtle" style={{ marginBottom: 10 }}>{claimView ? "청구를 기다리는 병원비가 없어요." : searching ? "찾는 지출이 없어요." : "기록이 없어요."}</p>
          ) : (
            <div style={{ marginBottom: 10 }}>
              {listed.map((e) => {
                const cat = categoryById(e.categoryId);
                const big = e.amount >= bigLine;
                return (
                  <button key={e.id} type="button" className="bud-row bud-row-btn" onClick={() => startEdit(e)} aria-label={`${e.title} ${won(e.amount)} 고치기`}>
                    <span className="bud-cat-icon" style={{ background: colorOf(cat.id) }}><Ico name={categoryIco(cat)} size={20} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="bud-row-title">{e.title}</span>
                      <span className="faint">{cat.name}{searching || filterCategoryId || claimView ? ` · ${formatKoreanDate(e.date)}` : ""}{big ? " · 평소보다 큰 지출" : ""}</span>
                      {(e.memo || e.items?.length) && <span className="faint bud-memo">{[e.items?.join("·"), e.memo].filter(Boolean).join(" · ")}</span>}
                      {e.claim && <span className={`bud-claim-badge ${e.claim}`}>보험 {CLAIMS.find((c) => c[0] === e.claim)?.[1]}{e.claim === "paid" && e.claimPaid ? ` ${won(e.claimPaid)}` : ""}</span>}
                    </span>
                    <span className="bud-amt" style={big ? { color: "var(--danger)" } : undefined}>{won(e.amount)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!searching && !filterCategoryId && !claimView && (
            <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={() => openAdd()}>
              ＋ {formatKoreanDate(selectedDateKey > today ? today : selectedDateKey)} 지출 기록
            </button>
          )}
        </div>
      )}

      {showCategoryManager && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div className="h2" style={{ margin: 0 }}>분류 관리</div>
            <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => (setShowCategoryManager(false), setEditingCat(null), setNewCatName(""))}>
              완료
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {categories.map((c) => (
              <span key={c.id} className="chip cat-chip" style={{ "--ev": colorOf(c.id), fontSize: 13, padding: "5px 6px 5px 10px", gap: 4, outline: editingCat === c.id ? "2px solid var(--accent)" : "none" }}>
                <button type="button" aria-label={`${c.name} 고치기`} onClick={() => startEditCategory(c)} style={{ background: "none", border: "none", padding: 0, color: "inherit", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Ico name={categoryIco(c)} size={14} /> {c.name}
                </button>
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

          <p className="faint" style={{ marginTop: -4 }}>분류를 누르면 이름·아이콘을 고칠 수 있어요. ×를 누르면 지워지고, 그 분류로 적은 기록은 '기타'로 보여요.</p>
          <form onSubmit={handleAddCategory}>
            <div className="faint" style={{ marginBottom: 6 }}>{editingCat ? "고치는 중 — 아이콘 고르기" : "새 분류 — 아이콘 고르기"}</div>
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
              <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="분류 이름 (예: 호텔·돌봄)" maxLength={20} aria-label="분류 이름" style={{ ...inputStyle, flex: 1 }} />
              <button type="submit" className="btn-primary" style={{ width: "auto", padding: "0 16px" }}>
                {editingCat ? "저장" : "추가"}
              </button>
            </div>
          </form>
        </div>
      )}
      {expenses.length > 0 && !showCategoryManager && (
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <button type="button" className="link-btn" onClick={exportCsv}><Ico name="arrowDown" size={15} /> 전체 지출 내보내기 (엑셀용 CSV)</button>
          {exportMsg && <p className="faint" style={{ margin: 0 }}>{exportMsg}</p>}
        </div>
      )}

      {sheet && <ExpenseSheet dog={dog} categories={categories} expenses={expenses} initial={sheet} onClose={() => setSheet(null)} onSaved={handleSheetSaved} />}
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
