// 가계부 분석(토스 '내 소비' 방식 참고) — 화면과 테스트가 같이 쓰는 계산만 모았다. 모두 기록된 지출로만 계산하고 추정은 "예상"이라고 밝힌다.
// expense = { id, title, amount, date: "YYYY-MM-DD", categoryId }
const pad = (n) => String(n).padStart(2, "0");
export const monthKeyOf = (y, m) => `${y}-${pad(m + 1)}`; // m: 0~11
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
const sum = (list) => list.reduce((s, e) => s + e.amount, 0);
const norm = (t) => t.replace(/\s+/g, "").toLowerCase();

// 지난달 이맘때 비교: 이번 달 1일~오늘 vs 지난달 1일~같은 날(지난달이 짧으면 말일까지)
export function compareSameTime(expenses, today) {
  const [y, m, d] = today.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  const py = prev.getFullYear();
  const pm = prev.getMonth();
  const lastDay = Math.min(d, daysIn(py, pm));
  const thisPrefix = monthKeyOf(y, m - 1);
  const prevPrefix = monthKeyOf(py, pm);
  const now = sum(expenses.filter((e) => e.date.startsWith(thisPrefix) && e.date <= today));
  const before = sum(expenses.filter((e) => e.date.startsWith(prevPrefix) && Number(e.date.slice(8)) <= lastDay));
  const hasPrev = expenses.some((e) => e.date.startsWith(prevPrefix));
  return { now, before, diff: now - before, hasPrev };
}

// 고정 지출: 같은 이름이 최근 3달(이번 달 제외) 중 2달 이상 나온 것. 이번 달에 이미 냈는지도 함께.
export function detectFixed(expenses, monthPrefix) {
  const [y, m] = monthPrefix.split("-").map(Number);
  const prevMonths = [1, 2, 3].map((i) => {
    const dt = new Date(y, m - 1 - i, 1);
    return monthKeyOf(dt.getFullYear(), dt.getMonth());
  });
  const groups = {};
  for (const e of expenses) {
    const key = norm(e.title);
    if (!key) continue;
    (groups[key] ||= []).push(e);
  }
  const out = [];
  for (const list of Object.values(groups)) {
    const months = new Set(list.map((e) => e.date.slice(0, 7)).filter((p) => prevMonths.includes(p)));
    if (months.size < 2) continue;
    const recent = list.filter((e) => prevMonths.includes(e.date.slice(0, 7)));
    const paid = list.filter((e) => e.date.startsWith(monthPrefix));
    const latest = [...list].sort((a, b) => b.date.localeCompare(a.date))[0];
    out.push({
      title: latest.title,
      categoryId: latest.categoryId,
      avg: Math.round(sum(recent) / months.size),
      day: Math.round(recent.reduce((s, e) => s + Number(e.date.slice(8)), 0) / recent.length), // 보통 나가는 날
      paid: sum(paid),
      paidThisMonth: paid.length > 0,
    });
  }
  return out.sort((a, b) => b.avg - a.avg);
}

// 이번 달 예상 지출 = 지금까지 쓴 돈 + 아직 안 나간 고정 지출 + 변동 지출 속도 × 남은 날. 3일 미만이면 계산하지 않는다.
// 수술비처럼 평소보다 큰 한 번짜리 지출(bigLine 이상)은 속도 계산에서 뺀다 — 남은 날에도 또 나갈 돈이 아니라서.
export function projectMonth(expenses, today, fixed, bigLine = Infinity) {
  const [y, m, d] = today.split("-").map(Number);
  if (d < 3) return null;
  const prefix = monthKeyOf(y, m - 1);
  const soFar = expenses.filter((e) => e.date.startsWith(prefix) && e.date <= today);
  if (!soFar.length) return null;
  const fixedNames = new Set(fixed.map((f) => norm(f.title)));
  const variable = sum(soFar.filter((e) => !fixedNames.has(norm(e.title)) && e.amount < bigLine));
  const unpaidFixed = sum(fixed.filter((f) => !f.paidThisMonth).map((f) => ({ amount: f.avg })));
  const remainDays = daysIn(y, m - 1) - d;
  return Math.round(sum(soFar) + unpaidFixed + (variable / d) * remainDays);
}

// 평소보다 큰 지출: 이 강아지 지출 중앙값의 3배 이상이면서 3만 원 이상(기록이 5개 미만이면 표시 안 함)
export function bigExpenseThreshold(expenses) {
  if (expenses.length < 5) return Infinity;
  const sorted = expenses.map((e) => e.amount).sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)];
  return Math.max(30000, mid * 3);
}

// 주별 합계: 1일부터 7일씩 끊어서(1주 1~7일, 2주 8~14일 …)
export function weeklyTotals(expenses, monthPrefix) {
  const [y, m] = monthPrefix.split("-").map(Number);
  const n = daysIn(y, m - 1);
  const weeks = [];
  for (let start = 1, w = 1; start <= n; start += 7, w++) {
    const end = Math.min(n, start + 6);
    const total = sum(expenses.filter((e) => e.date.startsWith(monthPrefix) && Number(e.date.slice(8)) >= start && Number(e.date.slice(8)) <= end));
    weeks.push({ week: w, from: start, to: end, total });
  }
  return weeks;
}

// 자주 산 것 TOP 5(횟수 순, 같으면 금액 순)
export function topItems(monthExpenses, limit = 5) {
  const map = {};
  for (const e of monthExpenses) {
    const key = norm(e.title);
    map[key] ||= { title: e.title, count: 0, total: 0, categoryId: e.categoryId };
    map[key].count += 1;
    map[key].total += e.amount;
  }
  return Object.values(map)
    .filter((x) => x.count >= 2)
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .slice(0, limit);
}

// 카테고리별 이번 달 vs 지난달
export function categoryCompare(expenses, monthPrefix, categoryIdOf) {
  const [y, m] = monthPrefix.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  const prevPrefix = monthKeyOf(prev.getFullYear(), prev.getMonth());
  const now = {};
  const before = {};
  for (const e of expenses) {
    const id = categoryIdOf(e.categoryId);
    if (e.date.startsWith(monthPrefix)) now[id] = (now[id] || 0) + e.amount;
    else if (e.date.startsWith(prevPrefix)) before[id] = (before[id] || 0) + e.amount;
  }
  return Object.entries(now)
    .map(([id, total]) => ({ id, total, prev: before[id] || 0 }))
    .sort((a, b) => b.total - a.total);
}
