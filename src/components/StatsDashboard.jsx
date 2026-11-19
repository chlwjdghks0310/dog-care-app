import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSwipeClose } from "./SwipeBack";
import { supabase } from "../services/supabase";
import { LoginForm } from "./AccountCard";
import { API_BASE } from "../services/aiClient";
import { PLUS_PRICE } from "../services/plus";

// 운영자용 이용 통계(설정 → 이용 통계 / meongcare.kr/?stats). 숫자는 Supabase analytics_dashboard()(사용자)·money_dashboard()(돈, supabase/money.sql)가 준다 —
// analytics_admins 표에 든 계정만 볼 수 있다. 이름·이메일 같은 개인정보는 없다(기기는 해시).
// 11/20 개편(사용자: "돈이 어디로 빠지고 수익이 나고, 뭘 얼마나 쓰고, 어디서 들어오고 얼마나 쓰고 나가는지 보기 쉽게"): 여섯 묶음 — 한눈에 · 돈 · 사용자 · 뭘 쓰나 · 캐릭터 · 의견
const n = (v) => Number(v) || 0;
const sum = (rows, k) => rows.reduce((a, r) => a + n(r[k]), 0);
const SOURCE_NAME = { "": "바로 들어옴", "바로 들어옴": "바로 들어옴", blog: "블로그", naver: "네이버", threads: "스레드", instagram: "인스타그램", insta: "인스타그램", qr: "QR", google: "구글", kakao: "카카오", daum: "다음", littly: "프로필 링크", beta: "베타 안내", install: "설치 안내" };
const FEATURE = { ask: "비서 빠른 답", ask_detail: "비서 자세히", chat: "말로 기록", photo: "변 사진 AI", stool: "변 빠른 체크", food: "사료 정보 찾기", food_label: "사료 라벨 읽기", vet_doc: "진료 정리", voice: "받아쓰기", video: "행동 영상", other: "기타" };
const ACT = { check: "하루 체크", task: "100일 과제", record: "기록 저장", vet: "병원용 기록", month: "한 달 리포트", report: "이번 주 리포트", week: "이번 주", guide: "월령별 가이드", puppy: "퍼피 100일", feeding: "사료 계산기", budget: "가계부", health: "건강 체크", weight: "체중", gallery: "갤러리", plus: "플러스 화면", character: "캐릭터 화면" };
const md = (d) => String(d).slice(5, 10).replace("-", "/");
const pct = (v, all) => (v == null ? "—" : `${n(v)}${n(all) ? ` (${Math.round((n(v) / n(all)) * 100)}%)` : ""}`);
const ratio = (a, b) => (n(b) ? `${Math.round((n(a) / n(b)) * 100)}%` : "—");
const krw = (v) => `₩${Math.round(n(v)).toLocaleString()}`;
const usd = (v) => `$${n(v).toFixed(2)}`;
const ls = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* 비공개 창 */ } } };

// 지원사업·회사에 보여 줄 한 줄: 기간이 다 지난 사람만 모아 7일·30일 유지율
function retentionSummary(rows, today = new Date()) {
  const age = (d) => Math.floor((today - new Date(`${d}T00:00:00+09:00`)) / 86400000);
  const s = (list, col) => list.reduce((t, r) => t + n(r[col]), 0);
  const mk = (list, col) => { const base = s(list, "사용자(명)"); return { pct: base ? Math.round((s(list, col) / base) * 100) : null, base }; };
  return {
    d7: mk(rows.filter((r) => age(r["처음 쓴 날"]) >= 8), "2~7일 안에 다시(명)"),
    d30: mk(rows.filter((r) => age(r["처음 쓴 날"]) >= 36), "28~35일 다시(명)"),
    check7: mk(rows.filter((r) => age(r["처음 쓴 날"]) >= 7), "첫 7일 하루 체크(명)"),
  };
}

function toCSV(rows) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return "﻿" + [cols.map(esc).join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
function download(rows) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" }));
  a.download = `멍케어-이용통계-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const Tile = ({ label, value, sub, tone }) => (
  <div style={{ background: tone === "warn" ? "var(--warm-bg)" : tone === "plain" ? "var(--surface)" : "var(--accent-soft)", border: tone === "plain" ? "1px solid var(--border)" : "none", borderRadius: 12, padding: "10px 12px", minWidth: 0 }}>
    <div className="faint" style={{ fontSize: 12 }}>{label}</div>
    <div style={{ fontSize: String(value).length > 8 ? 19 : 22, fontWeight: 800, lineHeight: 1.25, color: tone === "warn" ? "var(--warm)" : undefined, overflowWrap: "anywhere" }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
    {sub && <div className="faint" style={{ fontSize: 11.5 }}>{sub}</div>}
  </div>
);
// 좁은 폰에선 세 칸이 비좁아 두 칸으로 접힌다(auto-fit)
const Grid = ({ cols = 2, children }) => <div style={{ display: "grid", gridTemplateColumns: cols === 3 ? "repeat(auto-fit, minmax(150px, 1fr))" : `repeat(${cols}, minmax(0, 1fr))`, gap: 8 }}>{children}</div>;
const Note = ({ children }) => <p className="faint" style={{ margin: "6px 0 0", fontSize: 11.5, lineHeight: 1.5 }}>{children}</p>;

// 목표 대비 타일: 목표 넘으면 초록, 못 미치면 주황, 기간이 안 지났으면 회색
function Goal({ label, r, goal, note }) {
  const ok = r.pct != null && r.pct >= goal;
  const color = r.pct == null ? "var(--text-faint)" : ok ? "#1d7a4f" : "#b4483b";
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px" }}>
      <div className="faint" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, color }}>{r.pct == null ? "—" : `${r.pct}%`}</div>
      <div className="faint" style={{ fontSize: 11.5 }}>목표 {goal}% · {r.base ? `${r.base}기기 기준` : "아직 기간이 안 지남"}{note ? ` · ${note}` : ""}</div>
    </div>
  );
}
const delta = (a, b) => (b == null ? "" : a - b > 0 ? ` ▲${a - b}` : a - b < 0 ? ` ▼${b - a}` : " ＝");

// 날짜별 막대 — rows: [{ day, v }] 오래된 날이 왼쪽
function Bars({ rows, label, fmt = (v) => v || "" }) {
  const max = Math.max(1, ...rows.map((r) => n(r.v)));
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 100, marginTop: 6 }} role="img" aria-label={`${label} 날짜별 막대`}>
        {rows.map((r) => (
          <div key={r.day} title={`${md(r.day)} ${fmt(n(r.v))}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%", minWidth: 0 }}>
            <span style={{ fontSize: 9, color: "var(--text-faint)", whiteSpace: "nowrap", overflow: "hidden", maxWidth: "100%" }}>{rows.length <= 14 ? fmt(n(r.v)) : ""}</span>
            <div style={{ width: "100%", height: `${(n(r.v) / max) * 82}%`, minHeight: n(r.v) ? 3 : 0, background: "var(--accent)", borderRadius: 3 }} />
          </div>
        ))}
      </div>
      <div className="faint" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}>
        <span>{rows.length ? md(rows[0].day) : ""}</span><span>{rows.length ? md(rows[rows.length - 1].day) : ""}</span>
      </div>
    </div>
  );
}

// 가로 막대 목록(어디로 빠지나·뭘 쓰나)
function HBars({ rows, max }) {
  const top = Math.max(1, max ?? Math.max(...rows.map((r) => n(r.v))));
  return (
    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
      {rows.map((r) => (
        <div key={r.label} style={{ display: "grid", gridTemplateColumns: "minmax(96px, 34%) 1fr auto", gap: 8, alignItems: "center", fontSize: 12.5 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
          <div style={{ height: 10, background: "var(--surface-2, var(--border))", borderRadius: 5, overflow: "hidden" }}><div style={{ width: `${Math.max(2, (n(r.v) / top) * 100)}%`, height: "100%", background: r.tone === "warn" ? "var(--warm)" : "var(--accent)", borderRadius: 5 }} /></div>
          <span style={{ whiteSpace: "nowrap", textAlign: "right" }}><b>{r.text}</b>{r.sub && <span className="faint"> {r.sub}</span>}</span>
        </div>
      ))}
    </div>
  );
}

function Table({ cols, rows }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 6 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, whiteSpace: "nowrap" }}>
        <thead><tr>{cols.map(([label], i) => <th key={label} style={{ textAlign: i ? "right" : "left", padding: "6px 6px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>{label}</th>)}</tr></thead>
        <tbody>{rows.map((r, j) => <tr key={j}>{cols.map(([label, get], i) => <td key={label} style={{ textAlign: i ? "right" : "left", padding: "6px 6px", borderBottom: "1px solid var(--border)" }}>{get(r)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const SECTIONS = [["glance", "한눈에"], ["money", "돈"], ["people", "사용자"], ["use", "뭘 쓰나"], ["char", "캐릭터"], ["inbox", "의견·오류"]];
const Section = ({ id, title, sub, children }) => (
  <section id={`st-${id}`} style={{ scrollMarginTop: 96, marginTop: 18 }}>
    <div className="h2" style={{ display: "flex", alignItems: "baseline", gap: 8 }}>{title}{sub && <span className="faint" style={{ fontWeight: 400, fontSize: 12.5 }}>{sub}</span>}</div>
    {children}
  </section>
);
const Card = ({ title, children, style }) => <div className="card" style={{ marginTop: 10, ...style }}>{title && <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>}{children}</div>;

export default function StatsDashboard({ onClose }) {
  const swipeClose = useSwipeClose(onClose);
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [money, setMoney] = useState(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [rate, setRate] = useState(() => n(ls.get("mc-usd-krw", "1450")) || 1450); // 환율 가정(운영자 입력)
  const [fixed, setFixed] = useState(() => n(ls.get("mc-fixed-krw", "0"))); // 월 고정비(서버·도메인 등, 원)

  useEffect(() => {
    let alive = true;
    setError("");
    supabase.rpc("analytics_dashboard", { p_days: 30 }).then(({ data, error }) => alive && (error ? setError(error.code === "42501" ? "운영자 계정으로 로그인해야 볼 수 있어요." : "통계를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.") : setData(data)));
    return () => { alive = false; };
  }, [reload]);
  useEffect(() => {
    let alive = true;
    supabase.rpc("money_dashboard", { p_days: days }).then(({ data, error }) => alive && setMoney(error ? { error: error.message } : data));
    return () => { alive = false; };
  }, [reload, days]);

  const all = data?.report || [];
  const rows = all.slice(0, days);
  const today = rows[0] || {};
  const yesterday = rows[1] || null;
  const since = rows.length ? rows[rows.length - 1]["날짜"] : "";
  const srcRows = (data?.sources || []).filter((s) => s["날짜"] >= since);
  const bySource = {};
  for (const s of srcRows) {
    const name = SOURCE_NAME[s["어디서"]] || s["어디서"];
    const row = (bySource[name] ||= { name, web: 0, open: 0, inst: 0 });
    if (s["무엇"] === "홈페이지 방문") row.web += n(s["횟수"]);
    if (s["무엇"] === "앱 처음 열기") row.open += n(s["횟수"]);
    if (s["무엇"] === "홈 화면 앱 처음 열기") (row.open += n(s["횟수"]), (row.inst += n(s["횟수"])));
  }
  const sources = Object.values(bySource).sort((a, b) => b.open + b.web - (a.open + a.web));
  const ret = retentionSummary(data?.retention || []);

  // 돈 계산
  const m = money && !money.error ? money : null;
  const aiUsd = n(m?.period?.usd), charUsd = n(m?.character?.period_usd);
  const spendKrw = (aiUsd + charUsd) * rate;
  const plusUsers = n(m?.plus?.users);
  const monthFrac = days / 30; // 기간을 한 달로 환산
  const wouldBe = plusUsers * PLUS_PRICE.month * monthFrac; // 정식이면 들어왔을 돈(베타는 0원)
  const fixedPeriod = fixed * monthFrac;
  const byDay = {};
  for (const r of m?.daily || []) byDay[r.day] = (byDay[r.day] || 0) + n(r.usd);
  for (const r of m?.character?.daily || []) byDay[r.day] = (byDay[r.day] || 0) + n(r.usd);
  const dayList = Array.from({ length: days }, (_, i) => { const d = new Date(Date.now() + 9 * 3600e3 - (days - 1 - i) * 86400e3).toISOString().slice(0, 10); return { day: d, v: Math.round((byDay[d] || 0) * rate) }; });
  const features = (m?.features || []).map((f) => ({ ...f, label: FEATURE[f.feature] || f.feature }));
  const featTotal = features.reduce((a, f) => a + n(f.usd), 0) + charUsd;
  const plusCost = features.reduce((a, f) => a + (f.feature === "ask_detail" ? n(f.usd) : 0), 0); // 자세히는 플러스만 쓴다
  const perPlus = plusUsers ? (plusCost * rate) / plusUsers / monthFrac : 0; // 플러스 1명당 월 환산 비서 비용
  const unpriced = features.reduce((a, f) => a + n(f.unpriced), 0);
  const appPeople = n(m?.app_people);
  const acts = (m?.acts || []).map((a) => ({ ...a, kind: a.kind.replace(/^act_/, "") })).filter((a) => ACT[a.kind]);
  const P = m?.people || {};

  return createPortal(
    <div className="settings-sheet" role="dialog" aria-label="이용 통계" style={{ zIndex: 130 }} {...(onClose && swipeClose)}>
      <div className="settings-head">
        <div className="h1" style={{ margin: 0 }}>이용 통계</div>
        {onClose && <button type="button" className="btn-ghost" onClick={onClose}>닫기</button>}
      </div>

      <div style={{ position: "sticky", top: -14, zIndex: 2, background: "var(--bg)", padding: "6px 0 8px", marginTop: 4 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[7, 30].map((d) => (
            <button key={d} type="button" className={days === d ? "btn-primary" : "btn-ghost"} style={{ width: "auto", flex: "none", minHeight: 34, padding: "0 12px", margin: 0 }} onClick={() => setDays(d)} aria-pressed={days === d}>최근 {d}일</button>
          ))}
          <button type="button" className="btn-ghost" style={{ minHeight: 34, padding: "0 12px", marginLeft: "auto" }} onClick={() => setReload((x) => x + 1)}>새로고침</button>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginTop: 8, paddingBottom: 2 }}>
          {SECTIONS.map(([id, label]) => <button key={id} type="button" className="chip" style={{ flex: "none" }} onClick={() => document.getElementById(`st-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{label}</button>)}
        </div>
      </div>

      {error && <div className="card" style={{ marginTop: 12 }}>{error}</div>}
      {!data && !error && <div className="card subtle" style={{ marginTop: 12 }}>불러오는 중…</div>}

      {data && (
        <>
          {/* ① 한눈에 */}
          <Section id="glance" title="한눈에" sub="오늘 · 이번 달">
            <Grid>
              <Tile label="오늘 앱 연 기기" value={n(today["앱 사용자(명)"])} sub={`어제 ${n(yesterday?.["앱 사용자(명)"])}${delta(n(today["앱 사용자(명)"]), yesterday ? n(yesterday["앱 사용자(명)"]) : null)} · 홈 화면 앱 ${n(today["홈 화면 앱 사용자(명)"])}`} />
              <Tile label="오늘 처음 연 기기" value={n(today["앱 처음 연 횟수"])} sub={`홈페이지 방문 ${n(today["홈페이지 방문자(명)"])} · 앱 버튼 ${n(today["앱 버튼 누름(회)"])}회`} />
              <Tile label="이번 달 지출" value={m ? krw((n(m.month.usd) + n(m.character.month_usd)) * rate) : "—"} sub={m ? `AI ${usd(m.month.usd)} + 캐릭터 ${usd(m.character.month_usd)}` : "money.sql 필요"} tone="plain" />
              <Tile label="이번 달 수입" value="₩0" sub={`베타 · 플러스 ${plusUsers}명(정식이면 ${krw(plusUsers * PLUS_PRICE.month)}/월)`} tone="plain" />
            </Grid>
            <Note>기기 = 브라우저 저장소 하나(사람이 아님). 지출은 서버가 AI 응답마다 적은 토큰 × 단가, 캐릭터는 작업마다 적은 생성비. 환율·고정비는 아래 "돈"에서 바꿔요.</Note>
          </Section>

          {/* ② 돈 */}
          <Section id="money" title="돈" sub={`최근 ${days}일`}>
            {money?.error && <Card><p className="subtle" style={{ margin: 0 }}>돈 표가 아직 없어요 — Supabase에서 supabase/money.sql을 실행해 주세요. ({money.error})</p></Card>}
            {m && (
              <>
                <Grid cols={3}>
                  <Tile label="나간 돈" value={krw(spendKrw + fixedPeriod)} sub={`AI ${usd(aiUsd)} · 캐릭터 ${usd(charUsd)}${fixed ? ` · 고정비 ${krw(fixedPeriod)}` : ""}`} tone="warn" />
                  <Tile label="들어온 돈" value="₩0" sub={`베타(결제 없음) · 정식이면 ${krw(wouldBe)}`} tone="plain" />
                  <Tile label="정식이었다면" value={krw(wouldBe - spendKrw - fixedPeriod)} sub={wouldBe - spendKrw - fixedPeriod >= 0 ? "남아요" : "모자라요"} tone={wouldBe - spendKrw - fixedPeriod >= 0 ? "plain" : "warn"} />
                </Grid>
                <Card title="어디로 빠지나">
                  <HBars rows={[...features.map((f) => ({ label: f.label, v: n(f.usd), text: krw(n(f.usd) * rate), sub: `${n(f.calls)}번 · ${n(f.people)}기기` })), ...(charUsd || n(m.character.jobs) ? [{ label: "캐릭터 그림·영상", v: charUsd, text: krw(charUsd * rate), sub: `${n(m.character.daily.reduce((a, r) => a + n(r.jobs), 0))}작업`, tone: "warn" }] : [])].sort((a, b) => b.v - a.v)} max={featTotal} />
                  {features.length === 0 && !charUsd && <p className="subtle" style={{ margin: "6px 0 0" }}>이 기간엔 AI를 쓴 기록이 없어요(돈 표는 11/20부터 쌓여요).</p>}
                  <Note>비서 빠른 답은 Haiku(한 번 ≈ ₩3), 자세히는 Sonnet(≈ ₩20), 말로 기록은 Haiku, 진료 정리·사료·변 사진은 Sonnet. {unpriced ? `단가를 모르는 호출 ${unpriced}건(Gemini 받아쓰기)은 0원으로 잡혀 있어요.` : ""}</Note>
                </Card>
                <Card title="날짜별 지출(원)">
                  <Bars rows={dayList} label="" fmt={(v) => (!v ? "" : v < 1000 ? String(v) : `${Math.round(v / 100) / 10}천`)} />
                </Card>
                <Card title="1명당 얼마나 쓰나">
                  <Grid cols={2}>
                    <Tile label="앱 기기 1대당 AI 비용" value={appPeople ? krw((aiUsd * rate) / appPeople) : "—"} sub={`${days}일 · 앱 연 기기 ${appPeople}대`} tone="plain" />
                    <Tile label="플러스 1명당 월 환산" value={plusUsers ? krw(perPlus) : "—"} sub={`자세히 비용만 · 정가 ${krw(PLUS_PRICE.month)}`} tone={perPlus > PLUS_PRICE.month ? "warn" : "plain"} />
                  </Grid>
                  <Note>플러스 1명당이 정가(3,900원)를 넘으면 그 사람에게서 손해예요. 빠른 답은 무료 사용자도 쓰니 전체 1대당에만 들어가요.</Note>
                </Card>
                <Card title="많이 쓰는 기기 15">
                  {m.top.length ? (
                    <Table cols={[["기기", (r) => <span style={{ fontFamily: "monospace" }}>{String(r.who).slice(0, 6)}{r.plus ? " ★" : ""}</span>], ["호출", (r) => n(r.calls)], ["자세히", (r) => n(r.detail_calls) || "—"], ["쓴 날", (r) => n(r.days)], ["비용", (r) => krw(n(r.usd) * rate)], ["월 환산", (r) => { const v = (n(r.usd) * rate * 30) / Math.max(1, n(r.days)); return <span style={{ color: v > PLUS_PRICE.month ? "var(--warm)" : undefined, fontWeight: v > PLUS_PRICE.month ? 700 : 400 }}>{krw(v)}</span>; }]]} rows={m.top} />
                  ) : <p className="subtle" style={{ margin: 0 }}>아직 없어요.</p>}
                  <Note>★ = 플러스 코드 쓴 강아지. 월 환산 = 쓴 날 기준으로 30일을 썼다면. 주황이면 정가보다 비용이 커요 — 하루 한도(빠른 50·자세히 20)가 이걸 막아요.</Note>
                </Card>
                <Card title="가정값(운영자 입력)">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <label className="field" style={{ margin: 0 }}><span>환율(원/달러)</span><input type="number" inputMode="numeric" value={rate} onChange={(e) => { const v = n(e.target.value) || 1450; setRate(v); ls.set("mc-usd-krw", String(v)); }} /></label>
                    <label className="field" style={{ margin: 0 }}><span>월 고정비(원)</span><input type="number" inputMode="numeric" value={fixed} onChange={(e) => { const v = n(e.target.value); setFixed(v); ls.set("mc-fixed-krw", String(v)); }} placeholder="서버·도메인 등" /></label>
                  </div>
                  <Note>이 기기에만 저장돼요. 고정비를 넣으면 "나간 돈"과 "정식이었다면"에 기간만큼 나눠 들어가요.</Note>
                </Card>
              </>
            )}
          </Section>

          {/* ③ 사용자 */}
          <Section id="people" title="사용자" sub="들어오고 · 남고 · 나가고">
            {m && (
              <Grid cols={3}>
                <Tile label="전체 기기" value={n(P.total)} sub={`${days}일 새로 ${n(P.new_period)}`} />
                <Tile label="7일 안에 썼음" value={n(P.active7)} sub={`30일 안에 ${n(P.active30)}`} />
                <Tile label="떠남(14일↑ 안 옴)" value={n(P.gone14)} sub={`그중 2일 이상 썼던 ${n(P.gone14_used)} · 하루만 ${n(P.one_day)}`} tone="warn" />
              </Grid>
            )}
            <Grid>
              <Goal label="7일째에도 쓰나 (2~7일 안 재방문)" r={ret.d7} goal={50} />
              <Goal label="30일째에도 쓰나 (28~35일 재방문)" r={ret.d30} goal={30} />
              <Goal label="첫 주에 하루 체크 한 번이라도" r={ret.check7} goal={70} note="핵심 행동" />
              <Tile label={`${days}일 새로 들어온 기기`} value={sum(rows, "앱 처음 연 횟수")} sub={`홈 화면 설치 ${sum(rows, "그중 홈 화면 앱")} · 설치율 ${ratio(sum(rows, "그중 홈 화면 앱"), sum(rows, "앱 처음 연 횟수"))}`} />
            </Grid>
            <Card>
              <Bars rows={[...rows].reverse().map((r) => ({ day: r["날짜"], v: n(r["앱 사용자(명)"]) }))} label="날짜별 앱을 연 기기" />
              <Bars rows={[...rows].reverse().map((r) => ({ day: r["날짜"], v: n(r["앱 처음 연 횟수"]) }))} label="날짜별 처음 연 기기" />
            </Card>
            <Card title={`어디서 왔나 → 설치했나 (${days}일)`}>
              {sources.length ? (
                <Table cols={[["경로", (r) => r.name], ["홈페이지 열람", (r) => r.web], ["앱 처음 연 기기", (r) => r.open], ["홈 화면 설치", (r) => r.inst], ["설치율", (r) => ratio(r.inst, r.open)]]} rows={sources} />
              ) : <p className="subtle" style={{ margin: 0 }}>아직 기록이 없어요.</p>}
              <Note>경로 = 링크의 ?from= 꼬리표(threads·insta·kakao·beta…) 또는 넘어온 사이트. "바로 들어옴"은 주소를 직접 친 경우예요.</Note>
            </Card>
            <Card title="처음 연 날 기준 — 다시 왔나">
              {data.retention?.length ? (
                <Table cols={[["처음 연 날", (r) => md(r["처음 쓴 날"])], ["기기", (r) => n(r["사용자(명)"])], ["가족 집", (r) => (r["가족 집 강아지(명)"] == null ? "—" : n(r["가족 집 강아지(명)"]))], ["다음 날", (r) => pct(r["다음 날 다시(명)"], r["사용자(명)"])], ["2~7일", (r) => pct(r["2~7일 안에 다시(명)"], r["사용자(명)"])], ["8~30일", (r) => pct(r["8~30일 안에 다시(명)"], r["사용자(명)"])], ["28~35일", (r) => pct(r["28~35일 다시(명)"], r["사용자(명)"])], ["첫주 체크", (r) => pct(r["첫 7일 하루 체크(명)"], r["사용자(명)"])]]} rows={data.retention.filter((r) => r["처음 쓴 날"] >= since)} />
              ) : <p className="subtle" style={{ margin: 0 }}>아직 기록이 없어요.</p>}
              <Note>칸 = 기기 수(비율). 아직 안 지난 기간은 비어 있어요.</Note>
            </Card>
          </Section>

          {/* ④ 뭘 쓰나 */}
          <Section id="use" title="뭘 쓰나" sub={`최근 ${days}일 · 쓴 기기 수`}>
            <Card title={`기능별 (앱 연 기기 ${appPeople}대 중)`}>
              {m && (acts.length || features.length) ? (
                <HBars rows={[
                  ...acts.map((a) => ({ label: ACT[a.kind], v: n(a.people), text: `${n(a.people)}대`, sub: `${ratio(a.people, appPeople)} · ${n(a.days)}일` })),
                  ...features.map((f) => ({ label: f.label, v: n(f.people), text: `${n(f.people)}대`, sub: `${ratio(f.people, appPeople)} · AI ${n(f.calls)}번` })),
                ].sort((a, b) => b.v - a.v)} max={appPeople || undefined} />
              ) : <p className="subtle" style={{ margin: 0 }}>{m ? "아직 기록이 없어요(화면별 사용은 11/20부터 쌓여요)." : "money.sql이 필요해요."}</p>}
              <Note>화면 열기·기록 저장은 기기마다 하루 한 번만 세요. "n일"은 그 기능을 쓴 기기-날 수. AI 칸은 호출 횟수도.</Note>
            </Card>
            <Card title="날짜별">
              <Table cols={[["날짜", (r) => md(r["날짜"])], ["앱 연 기기", (r) => n(r["앱 사용자(명)"])], ["홈 화면 앱", (r) => n(r["홈 화면 앱 사용자(명)"])], ["처음 연", (r) => n(r["앱 처음 연 횟수"])], ["로그인", (r) => n(r["로그인 사용자(명)"])], ["말로 기록", (r) => n(r["AI 채팅(회)"])], ["AI 기타", (r) => n(r["AI 사진·음성 등(회)"])], ["AI 오류", (r) => n(r["AI 오류(회)"]) || ""], ["새 계정", (r) => n(r["새 가입(명)"])]]} rows={rows} />
            </Card>
          </Section>

          {/* ⑤ 캐릭터 */}
          <Section id="char" title="우리 아이 캐릭터" sub="생성비 · 작업">
            {m && (
              <Grid cols={3}>
                <Tile label="작업 전체" value={n(m.character.jobs)} sub={`완성 ${n(m.character.done)} · 실패 ${n(m.character.failed)}`} tone="plain" />
                <Tile label="완성 1마리당" value={usd(m.character.avg_usd)} sub={`≈ ${krw(n(m.character.avg_usd) * rate)} · 정가 4,900`} tone="plain" />
                <Tile label="코드 쓴 강아지" value={n(m.plus.character_users)} sub={`플러스 ${plusUsers} · 남은 플러스 코드 ${n(m.plus.codes_left)}`} tone="plain" />
              </Grid>
            )}
            <CharacterOps />
          </Section>

          {/* ⑥ 의견·오류 */}
          <Section id="inbox" title="베타 의견·오류" sub="30일">
            <BetaInbox />
          </Section>

          <Card title="읽는 법" style={{ fontSize: 12.5 }}>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li><b>기기</b> = 사람이 아니라 브라우저 저장소 하나. 같은 사람의 아이폰 앱·사파리·맥은 각각 1기기. 하루에 몇 번 열어도 1.</li>
              <li><b>돈</b>은 서버가 AI 응답마다 적은 토큰 × 단가(server PRICES, 11/20 기준)와 캐릭터 작업의 생성비. Anthropic·Google·Runway 청구서와 몇 % 차이는 날 수 있어요.</li>
              <li><b>정식이었다면</b> = 플러스 코드 쓴 강아지 수 × 3,900원 − 나간 돈. 베타라 실제 수입은 0원.</li>
              <li><b>떠남</b> = 마지막으로 앱을 연 지 14일 넘은 기기. "하루만"은 첫날만 열고 7일 넘게 안 온 기기.</li>
              <li>운영자 기기는 설정 → "이 기기는 통계에서 빼기"를 켜면 안 들어가요. 개발 중 컴퓨터와 자동 점검은 처음부터 빠져 있어요.</li>
            </ul>
          </Card>

          <button type="button" className="btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={() => download(all)}>최근 30일 표 파일로 받기 (CSV · 엑셀)</button>
          <p className="faint" style={{ fontSize: 11.5, textAlign: "center" }}>통계는 11/2부터, 돈·화면별 사용은 11/20부터 쌓여요.</p>
        </>
      )}
    </div>,
    document.body
  );
}

// 통계 전용 주소 meongcare.kr/?stats (main.jsx) — 컴퓨터 브라우저에서 즐겨찾기해 두고 본다.
export function StatsPage() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    if (!supabase) return setSession(null);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return null;
  if (session) return <StatsDashboard />;
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "48px 16px" }}>
      <div className="h1">이용 통계</div>
      <p className="subtle">운영자 계정으로 로그인해 주세요. 컴퓨터에서는 이메일 로그인이 편해요.</p>
      <LoginForm />
    </div>
  );
}

// 우리 아이 캐릭터 운영(supabase/character.sql character_summary + 서버 /api/character/notify-waitlist) — 운영자만(11/17)
function CharacterOps() {
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("");
  const load = () => supabase.rpc("character_summary").then(({ data, error }) => setData(error ? { error: error.message } : data));
  useEffect(() => { load(); }, []);
  const notify = async () => {
    if (!confirm("대기 명단 전원에게 '열렸어요' 알림을 한 번 보내고 명단을 비워요. 서버의 CHARACTER_OPEN이 1인지 먼저 확인했나요?")) return;
    setMsg("보내는 중…");
    try {
      const { data: s } = await supabase.auth.getSession();
      const r = await fetch(`${API_BASE}/api/character/notify-waitlist`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: s.session?.access_token }) });
      const j = await r.json();
      setMsg(r.ok ? `대기 ${j.waitlist}명 중 ${j.sent}명에게 보냈어요${j.open ? "" : " · 주의: 서버 문이 아직 잠겨 있어요(CHARACTER_OPEN=0)"}` : `실패: ${j.error}`);
      load();
    } catch (e) { setMsg(`실패: ${e.message}`); }
  };
  const st = data?.by_status || {};
  return (
    <Card title="운영">
      {!data ? <p className="subtle" style={{ margin: 0 }}>불러오는 중…</p> : data.error ? <p className="subtle" style={{ margin: 0 }}>아직 표가 없어요 — supabase/character.sql을 실행해 주세요. ({data.error})</p> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 13.5 }}>
            <div><div className="faint">오늘 생성비</div><b>${Number(data.today_cost).toFixed(2)}</b></div>
            <div><div className="faint">출시 알림 대기</div><b>{data.waitlist}명</b></div>
            <div><div className="faint">남은 초대 코드</div><b>{data.invites_left}개</b></div>
          </div>
          <div className="faint" style={{ margin: "8px 0 4px" }}>작업: {Object.keys(st).length ? Object.entries(st).filter(([k]) => k !== "ledger").map(([k, c]) => `${k} ${c}`).join(" · ") : "없음"}</div>
          <button type="button" className="btn-ghost" style={{ width: "100%", marginTop: 6 }} onClick={notify} disabled={!data.waitlist}>대기자에게 출시 알림 보내기</button>
          {msg && <p className="subtle" style={{ margin: "6px 0 0" }}>{msg}</p>}
        </>
      )}
    </Card>
  );
}

// 베타 의견·오류(supabase/beta.sql beta_inbox) — 운영자만. 오류는 메시지별로 묶여 온다
function BetaInbox() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    supabase.rpc("beta_inbox", { p_days: 30 }).then(({ data, error }) => setData(error ? { error: error.message } : data));
  }, []);
  const KIND = { bug: "버그", wish: "바람", good: "좋아요" };
  const when = (t) => String(t).slice(5, 16).replace("T", " ").replace("-", "/");
  return (
    <Card>
      {!data ? <p className="subtle" style={{ margin: 0 }}>불러오는 중…</p> : data.error ? <p className="subtle" style={{ margin: 0 }}>아직 표가 없어요 — supabase/beta.sql을 실행해 주세요. ({data.error})</p> : (
        <>
          <div className="faint" style={{ margin: "0 0 6px" }}>의견 {data.feedback.length}건</div>
          {data.feedback.length === 0 && <p className="subtle" style={{ margin: "0 0 10px" }}>아직 없어요.</p>}
          {data.feedback.map((f) => (
            <div key={f.id} style={{ borderTop: "1px solid var(--border)", padding: "8px 0" }}>
              <div style={{ fontSize: 13.5 }}><b>{KIND[f.kind] || f.kind}</b> · <span className="faint">{when(f.created_at)} · {f.ver} · {f.path}</span></div>
              <div style={{ whiteSpace: "pre-wrap", margin: "4px 0" }}>{f.text}</div>
              {f.shot && (open === f.id ? <img src={f.shot} alt="" style={{ width: "100%", borderRadius: 8 }} onClick={() => setOpen(null)} /> : <button type="button" className="link-btn" onClick={() => setOpen(f.id)}>스크린샷 보기</button>)}
              <div className="faint" style={{ fontSize: 11.5 }}>{f.ua}</div>
            </div>
          ))}
          <div className="faint" style={{ margin: "12px 0 6px" }}>오류 {data.errors.reduce((a, e) => a + n(e.n), 0)}건 · 종류 {data.errors.length}</div>
          {data.errors.map((e) => (
            <details key={e.msg} style={{ borderTop: "1px solid var(--border)", padding: "6px 0", fontSize: 13.5 }}>
              <summary><b>{n(e.n)}번</b> · {n(e.people)}명 · {when(e.last)} · {e.ver} — {e.msg}</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 11.5, margin: "6px 0 0" }}>{`${e.path}\n${e.stack || ""}`}</pre>
            </details>
          ))}
        </>
      )}
    </Card>
  );
}
