import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSwipeClose } from "./SwipeBack";
import { supabase } from "../services/supabase";
import { LoginForm } from "./AccountCard";

// 운영자용 이용 통계(설정 → 이용 통계). 숫자는 Supabase analytics_dashboard()가 준다 —
// analytics_admins 표에 든 계정만 볼 수 있다(supabase/analytics.sql ④). 이름·이메일 같은 개인정보는 없다.
const n = (v) => Number(v) || 0;
const sum = (rows, k) => rows.reduce((a, r) => a + n(r[k]), 0);
const SOURCE_NAME = { "": "바로 들어옴", "바로 들어옴": "바로 들어옴", blog: "블로그", naver: "네이버", threads: "스레드", instagram: "인스타그램", insta: "인스타그램", qr: "QR", google: "구글", kakao: "카카오", daum: "다음", littly: "프로필 링크(litt.ly)" };
const md = (d) => String(d).slice(5, 10).replace("-", "/");
// "3 (25%)" — 칸이 없으면(서버 SQL을 아직 다시 안 돌림) "—"
const pct = (v, all) => (v == null ? "—" : `${n(v)}${n(all) ? ` (${Math.round((n(v) / n(all)) * 100)}%)` : ""}`);
// 지원사업·회사에 보여 줄 한 줄: 기간이 다 지난 사람만 모아 7일·30일 유지율(아직 안 지난 날짜는 빼야 숫자가 정직)
function retentionSummary(rows, today = new Date()) {
  const age = (d) => Math.floor((today - new Date(`${d}T00:00:00+09:00`)) / 86400000);
  const sum = (list, col) => list.reduce((t, r) => t + n(r[col]), 0);
  const d7 = rows.filter((r) => age(r["처음 쓴 날"]) >= 8);
  const d30 = rows.filter((r) => age(r["처음 쓴 날"]) >= 36 && r["28~35일 다시(명)"] != null);
  const rate = (list, col) => (sum(list, "사용자(명)") ? `${Math.round((sum(list, col) / sum(list, "사용자(명)")) * 100)}% (${sum(list, "사용자(명)")}명 중)` : "아직 기간이 안 지남");
  return { d7: rate(d7, "2~7일 안에 다시(명)"), d30: rate(d30, "28~35일 다시(명)") };
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

function Tile({ label, value, sub }) {
  return (
    <div style={{ background: "var(--accent-soft)", borderRadius: 12, padding: "10px 12px" }}>
      <div className="faint" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>{value.toLocaleString()}</div>
      {sub && <div className="faint" style={{ fontSize: 11.5 }}>{sub}</div>}
    </div>
  );
}

function Bars({ rows, k, label }) {
  const max = Math.max(1, ...rows.map((r) => n(r[k])));
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="h2">{label}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 110, marginTop: 6 }} role="img" aria-label={`${label} 날짜별 막대`}>
        {[...rows].reverse().map((r) => (
          <div key={r["날짜"]} title={`${md(r["날짜"])} ${n(r[k])}`} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", height: "100%" }}>
            <span style={{ fontSize: 9.5, color: "var(--text-faint)" }}>{n(r[k]) || ""}</span>
            <div style={{ width: "100%", height: `${(n(r[k]) / max) * 85}%`, minHeight: n(r[k]) ? 3 : 0, background: "var(--accent)", borderRadius: 3 }} />
          </div>
        ))}
      </div>
      <div className="faint" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}>
        <span>{rows.length ? md(rows[rows.length - 1]["날짜"]) : ""}</span>
        <span>{rows.length ? md(rows[0]["날짜"]) : ""}</span>
      </div>
    </div>
  );
}

function Table({ cols, rows }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 6 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, whiteSpace: "nowrap" }}>
        <thead>
          <tr>{cols.map(([label], i) => <th key={label} style={{ textAlign: i ? "right" : "left", padding: "6px 6px", borderBottom: "1px solid var(--border)", fontWeight: 600 }}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, j) => (
            <tr key={j}>{cols.map(([label, get], i) => <td key={label} style={{ textAlign: i ? "right" : "left", padding: "6px 6px", borderBottom: "1px solid var(--border)" }}>{get(r)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StatsDashboard({ onClose }) {
  const swipeClose = useSwipeClose(onClose);
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setError("");
    supabase
      .rpc("analytics_dashboard", { p_days: 30 })
      .then(({ data, error }) => alive && (error ? setError(error.code === "42501" ? "운영자 계정으로 로그인해야 볼 수 있어요." : "통계를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.") : setData(data)));
    return () => {
      alive = false;
    };
  }, [reload]);

  const all = data?.report || [];
  const rows = all.slice(0, days);
  const today = rows[0] || {};
  const since = rows.length ? rows[rows.length - 1]["날짜"] : "";
  const srcRows = (data?.sources || []).filter((s) => s["날짜"] >= since);
  const bySource = {};
  for (const s of srcRows) {
    const name = SOURCE_NAME[s["어디서"]] || s["어디서"];
    const row = (bySource[name] ||= { name, web: 0, open: 0 });
    if (s["무엇"] === "홈페이지 방문") row.web += n(s["횟수"]);
    if (String(s["무엇"]).includes("앱 처음 열기")) row.open += n(s["횟수"]);
  }
  const sources = Object.values(bySource).sort((a, b) => b.web + b.open - (a.web + a.open));
  const funnel = [
    ["홈페이지 방문자", sum(rows, "홈페이지 방문자(명)")],
    ["앱 버튼 누름", sum(rows, "앱 버튼 누름(회)")],
    ["앱 처음 열기", sum(rows, "앱 처음 연 횟수")],
    ["그중 홈 화면 앱", sum(rows, "그중 홈 화면 앱")],
    ["새 가입", sum(rows, "새 가입(명)")],
  ];
  const fmax = Math.max(1, ...funnel.map(([, v]) => v));

  return createPortal(
    <div className="settings-sheet" role="dialog" aria-label="이용 통계" style={{ zIndex: 130 }} {...(onClose && swipeClose)}>
      <div className="settings-head">
        <div className="h1" style={{ margin: 0 }}>이용 통계</div>
        {onClose && <button type="button" className="btn-ghost" onClick={onClose}>닫기</button>}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {[7, 30].map((d) => (
          <button key={d} type="button" className={days === d ? "btn-primary" : "btn-ghost"} style={{ width: "auto", flex: "none", minHeight: 36, padding: "0 14px", margin: 0 }} onClick={() => setDays(d)} aria-pressed={days === d}>
            최근 {d}일
          </button>
        ))}
        <button type="button" className="btn-ghost" style={{ minHeight: 36, padding: "0 12px", marginLeft: "auto" }} onClick={() => setReload((x) => x + 1)}>새로고침</button>
      </div>

      {error && <div className="card" style={{ marginTop: 12 }}>{error}</div>}
      {!data && !error && <div className="card subtle" style={{ marginTop: 12 }}>불러오는 중…</div>}

      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            <Tile label="오늘 앱 사용자" value={n(today["앱 사용자(명)"])} sub={`로그인 ${n(today["로그인 사용자(명)"])} · 안 함 ${n(today["로그인 안 한 사용자(명)"])}`} />
            <Tile label="오늘 홈페이지 방문자" value={n(today["홈페이지 방문자(명)"])} sub={`방문 ${n(today["홈페이지 방문(회)"])}회`} />
            <Tile label={`${days}일 앱 처음 연 횟수`} value={sum(rows, "앱 처음 연 횟수")} sub={`홈 화면 앱 ${sum(rows, "그중 홈 화면 앱")}`} />
            <Tile label={`${days}일 말로 기록`} value={sum(rows, "AI 채팅(회)")} sub={`로그인 안 함 ${sum(rows, "그중 로그인 안 함(회)")}회`} />
            <Tile label="누적 가입" value={n(today["누적 가입(명)"])} sub={`${days}일 새 가입 ${sum(rows, "새 가입(명)")}`} />
            <Tile label={`${days}일 AI 오류`} value={sum(rows, "AI 오류(회)")} sub="0이 정상" />
          </div>

          <Bars rows={rows} k="앱 사용자(명)" label="날짜별 앱 사용자(명)" />
          <Bars rows={rows} k="홈페이지 방문자(명)" label="날짜별 홈페이지 방문자(명)" />

          <div className="card" style={{ marginTop: 12 }}>
            <div className="h2">들어와서 가입까지 ({days}일 합계)</div>
            {funnel.map(([label, v]) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "104px 1fr 40px", alignItems: "center", gap: 8, margin: "6px 0", fontSize: 13 }}>
                <span>{label}</span>
                <div style={{ height: 12, borderRadius: 4, background: "var(--accent)", width: `${(v / fmax) * 100}%`, minWidth: v ? 4 : 0 }} />
                <span style={{ textAlign: "right", fontWeight: 700 }}>{v}</span>
              </div>
            ))}
            <p className="faint" style={{ margin: "6px 0 0", fontSize: 11.5 }}>날짜별 사람 수를 더한 값이라 같은 사람이 여러 날 오면 여러 번 들어가요.</p>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="h2">어디서 왔나 ({days}일)</div>
            {sources.length ? (
              <Table cols={[["경로", (r) => r.name], ["홈페이지 방문", (r) => r.web], ["앱 처음 열기", (r) => r.open]]} rows={sources} />
            ) : (
              <p className="subtle" style={{ margin: 0 }}>아직 기록이 없어요.</p>
            )}
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="h2">날짜별</div>
            <Table
              cols={[
                ["날짜", (r) => md(r["날짜"])],
                ["홈페이지", (r) => n(r["홈페이지 방문자(명)"])],
                ["처음 열기", (r) => n(r["앱 처음 연 횟수"])],
                ["앱 사용자", (r) => n(r["앱 사용자(명)"])],
                ["로그인", (r) => n(r["로그인 사용자(명)"])],
                ["비로그인", (r) => n(r["로그인 안 한 사용자(명)"])],
                ["말로 기록", (r) => n(r["AI 채팅(회)"])],
                ["가입", (r) => n(r["새 가입(명)"])],
              ]}
              rows={rows}
            />
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <div className="h2">다시 왔나</div>
            {data.retention?.length > 0 && (() => {
              const r = retentionSummary(data.retention);
              return <p className="subtle" style={{ margin: "0 0 8px" }}>7일 안에 다시: <b>{r.d7}</b> · 4~5주째에도: <b>{r.d30}</b></p>;
            })()}
            {data.retention?.length ? (
              <Table
                cols={[
                  ["처음 쓴 날", (r) => md(r["처음 쓴 날"])],
                  ["사용자", (r) => n(r["사용자(명)"])],
                  ["다음 날", (r) => n(r["다음 날 다시(명)"])],
                  ["2~7일", (r) => n(r["2~7일 안에 다시(명)"])],
                  ["8~30일", (r) => n(r["8~30일 안에 다시(명)"])],
                  ["28~35일", (r) => pct(r["28~35일 다시(명)"], r["사용자(명)"])],
                  ["첫주 체크", (r) => pct(r["첫 7일 하루 체크(명)"], r["사용자(명)"])],
                  ["5주째 체크", (r) => pct(r["28~35일 하루 체크(명)"], r["사용자(명)"])],
                ]}
                rows={data.retention.filter((r) => r["처음 쓴 날"] >= since)}
              />
            ) : (
              <p className="subtle" style={{ margin: 0 }}>아직 기록이 없어요.</p>
            )}
          </div>

          <BetaInbox />

          <button type="button" className="btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={() => download(all)}>
            최근 30일 표 파일로 받기 (CSV · 엑셀)
          </button>
          <p className="faint" style={{ fontSize: 11.5, textAlign: "center" }}>통계를 넣은 날(11/2)부터 쌓여요. 가입 수는 그 전 기록도 들어가요.</p>
        </>
      )}
    </div>,
    document.body
  );
}

// 통계 전용 주소 meongcare.kr/?stats (main.jsx) — 컴퓨터 브라우저에서 즐겨찾기해 두고 본다.
// 로그인 안 했으면 로그인부터(이메일 코드 로그인은 이 화면 안에서 끝남). 운영자가 아니면 숫자 대신 안내가 나온다.
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
    <div className="card" style={{ marginTop: 12 }}>
      <div className="h2">베타 의견·오류 (30일)</div>
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
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 11.5, margin: "6px 0 0" }}>{e.path}\n{e.stack}</pre>
            </details>
          ))}
        </>
      )}
    </div>
  );
}
