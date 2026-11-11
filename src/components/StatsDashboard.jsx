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
  const mk = (list, col) => { const base = sum(list, "사용자(명)"); return { pct: base ? Math.round((sum(list, col) / base) * 100) : null, base }; };
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

function Tile({ label, value, sub }) {
  return (
    <div style={{ background: "var(--accent-soft)", borderRadius: 12, padding: "10px 12px" }}>
      <div className="faint" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25 }}>{value.toLocaleString()}</div>
      {sub && <div className="faint" style={{ fontSize: 11.5 }}>{sub}</div>}
    </div>
  );
}

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
    const row = (bySource[name] ||= { name, web: 0, open: 0, inst: 0 });
    if (s["무엇"] === "홈페이지 방문") row.web += n(s["횟수"]);
    if (s["무엇"] === "앱 처음 열기") row.open += n(s["횟수"]);
    if (s["무엇"] === "홈 화면 앱 처음 열기") (row.open += n(s["횟수"]), (row.inst += n(s["횟수"])));
  }
  const sources = Object.values(bySource).sort((a, b) => b.open + b.web - (a.open + a.web));
  const yesterday = rows[1] || null;
  const ret = retentionSummary(data?.retention || []);

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
          {/* 1. 오늘 — 기기 수 기준, 어제와 비교 */}
          <div className="h2" style={{ marginTop: 14 }}>오늘 <span className="faint" style={{ fontWeight: 400, fontSize: 12.5 }}>· 기기 수(한 기기는 하루 1번)</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Tile label="앱을 연 기기" value={n(today["앱 사용자(명)"])} sub={`어제 ${n(yesterday?.["앱 사용자(명)"])}${delta(n(today["앱 사용자(명)"]), yesterday ? n(yesterday["앱 사용자(명)"]) : null)} · 홈 화면 앱 ${n(today["홈 화면 앱 사용자(명)"])}`} />
            <Tile label="오늘 처음 연 기기" value={n(today["앱 처음 연 횟수"])} sub={`그중 홈 화면 설치 ${n(today["그중 홈 화면 앱"])}`} />
            <Tile label="로그인 기기" value={n(today["로그인 사용자(명)"])} sub={`안 한 기기 ${n(today["로그인 안 한 사용자(명)"])} · 누적 계정 ${n(today["누적 가입(명)"])}`} />
            <Tile label="홈페이지 방문 기기" value={n(today["홈페이지 방문자(명)"])} sub={`열람 ${n(today["홈페이지 방문(회)"])}회 · 앱 버튼 ${n(today["앱 버튼 누름(회)"])}회`} />
          </div>

          {/* 2. 베타 핵심 지표 — 목표 대비 */}
          <div className="h2" style={{ marginTop: 16 }}>베타 핵심 지표 <span className="faint" style={{ fontWeight: 400, fontSize: 12.5 }}>· 기간이 다 지난 기기만</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Goal label="7일째에도 쓰나 (2~7일 안 재방문)" r={ret.d7} goal={50} />
            <Goal label="30일째에도 쓰나 (28~35일 재방문)" r={ret.d30} goal={30} />
            <Goal label="첫 주에 하루 체크 한 번이라도" r={ret.check7} goal={70} note="핵심 행동" />
            <Tile label={`${days}일 새로 들어온 기기`} value={sum(rows, "앱 처음 연 횟수")} sub={`홈 화면 설치 ${sum(rows, "그중 홈 화면 앱")} · 설치율 ${sum(rows, "앱 처음 연 횟수") ? Math.round((sum(rows, "그중 홈 화면 앱") / sum(rows, "앱 처음 연 횟수")) * 100) : 0}%`} />
          </div>

          {/* 3. 추이 */}
          <Bars rows={rows} k="앱 사용자(명)" label="날짜별 앱을 연 기기" />
          <Bars rows={rows} k="홈 화면 앱 사용자(명)" label="날짜별 홈 화면 앱으로 연 기기" />

          {/* 4. 유입 → 설치 */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="h2">어디서 왔나 → 설치했나 ({days}일)</div>
            {sources.length ? (
              <Table cols={[["경로", (r) => r.name], ["홈페이지 열람(회)", (r) => r.web], ["앱 처음 연 기기", (r) => r.open], ["홈 화면 설치", (r) => r.inst], ["설치율", (r) => (r.open ? `${Math.round((r.inst / r.open) * 100)}%` : "—")]]} rows={sources} />
            ) : (
              <p className="subtle" style={{ margin: 0 }}>아직 기록이 없어요.</p>
            )}
            <p className="faint" style={{ margin: "6px 0 0", fontSize: 11.5 }}>경로 = 링크의 ?from= 꼬리표(threads·insta·kakao·beta…) 또는 넘어온 사이트. "바로 들어옴"은 주소를 직접 친 경우예요.</p>
          </div>

          {/* 5. 날짜별 */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="h2">날짜별 <span className="faint" style={{ fontWeight: 400, fontSize: 12.5 }}>· 기기 수</span></div>
            <Table
              cols={[
                ["날짜", (r) => md(r["날짜"])],
                ["앱 연 기기", (r) => n(r["앱 사용자(명)"])],
                ["홈 화면 앱", (r) => n(r["홈 화면 앱 사용자(명)"])],
                ["처음 연 기기", (r) => n(r["앱 처음 연 횟수"])],
                ["로그인", (r) => n(r["로그인 사용자(명)"])],
                ["말로 기록(회)", (r) => n(r["AI 채팅(회)"])],
                ["새 계정", (r) => n(r["새 가입(명)"])],
              ]}
              rows={rows}
            />
          </div>

          {/* 6. 코호트 */}
          <div className="card" style={{ marginTop: 12 }}>
            <div className="h2">처음 연 날 기준 — 다시 왔나</div>
            <p className="faint" style={{ margin: "0 0 6px", fontSize: 11.5 }}>그날 처음 앱을 연 기기들이 이후에 다시 열었는지. 칸 = 기기 수(비율). 아직 안 지난 기간은 비어 있어요.</p>
            {data.retention?.length ? (
              <Table
                cols={[
                  ["처음 연 날", (r) => md(r["처음 쓴 날"])],
                  ["기기", (r) => n(r["사용자(명)"])],
                  ["가족 집", (r) => (r["가족 집 강아지(명)"] == null ? "—" : n(r["가족 집 강아지(명)"]))],
                  ["다음 날", (r) => pct(r["다음 날 다시(명)"], r["사용자(명)"])],
                  ["2~7일", (r) => pct(r["2~7일 안에 다시(명)"], r["사용자(명)"])],
                  ["8~30일", (r) => pct(r["8~30일 안에 다시(명)"], r["사용자(명)"])],
                  ["28~35일", (r) => pct(r["28~35일 다시(명)"], r["사용자(명)"])],
                  ["첫주 체크", (r) => pct(r["첫 7일 하루 체크(명)"], r["사용자(명)"])],
                ]}
                rows={data.retention.filter((r) => r["처음 쓴 날"] >= since)}
              />
            ) : (
              <p className="subtle" style={{ margin: 0 }}>아직 기록이 없어요.</p>
            )}
          </div>

          {/* 7. 용어 */}
          <div className="card" style={{ marginTop: 12, fontSize: 12.5 }}>
            <div className="h2">읽는 법</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li><b>기기</b> = 사람이 아니라 브라우저 저장소 하나. 같은 사람의 아이폰 앱·사파리·맥은 각각 1기기. 하루에 몇 번 열어도 1.</li>
              <li><b>(회)</b> = 누를 때마다 센 횟수. 같은 사람이 열 번 누르면 10.</li>
              <li><b>처음 연 기기</b> = 그 기기에서 생전 처음 연 날 1번. 앱을 지웠다 깔면 새 기기로 세요.</li>
              <li><b>재방문 %</b>는 기간이 다 지난 기기만 모아 계산해요. 베타 목표: 7일 50%, 30일 30%.</li>
              <li>운영자 기기는 설정 → "이 기기는 통계에서 빼기"를 켜면 이 숫자에 안 들어가요. 개발 중 컴퓨터와 자동 점검은 처음부터 빠져 있어요.</li>
            </ul>
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
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 11.5, margin: "6px 0 0" }}>{`${e.path}\n${e.stack || ""}`}</pre>
            </details>
          ))}
        </>
      )}
    </div>
  );
}
