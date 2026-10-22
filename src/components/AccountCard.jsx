import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { deleteAccount, getSyncStatus, onSyncStatus, signOut, syncNow } from "../services/sync";
import PrivacyPolicy from "./PrivacyPolicy";

// 설정의 "백업·로그인" 카드. Supabase가 설정돼 있을 때만 보인다(src/services/supabase.js).
// 로그인은 선택 — 안 해도 앱은 지금처럼 폰에만 저장한다.
export default function AccountCard() {
  const status = useSyncStatus();
  const [loginOpen, setLoginOpen] = useState(false);
  if (!status.enabled) return null;
  const name = status.user?.user_metadata?.name || status.user?.user_metadata?.full_name || status.user?.email || "로그인됨";
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="h2">백업·로그인</div>
      {status.user ? (
        <>
          <p className="subtle" style={{ margin: "0 0 4px" }}>
            <b style={{ color: "var(--text)" }}>{name}</b>(으)로 로그인했어요.
          </p>
          <p className="faint" style={{ margin: "0 0 12px" }}>
            {status.syncing ? "백업하는 중…" : status.error || (status.lastSyncedAt ? `마지막 백업 ${new Date(status.lastSyncedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}` : "곧 백업할게요.")}
          </p>
          {status.blocked?.length > 0 && (
            <p className="error-text" style={{ margin: "0 0 12px" }}>
              강아지 {status.blocked.length}마리는 다른 계정에 이미 백업돼 있어서 이 계정으로는 백업하지 않았어요. 처음 로그인했던 방법(카카오 또는 이메일)으로 로그인해 주세요.
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-ghost small" disabled={status.syncing} onClick={() => syncNow()}>
              지금 백업
            </button>
            <button
              type="button"
              className="btn-ghost small"
              onClick={() => window.confirm("로그아웃할까요? 이 폰의 기록은 그대로 남아요.") && signOut()}
            >
              로그아웃
            </button>
          </div>
          <LoginMethods user={status.user} />
          <DeleteAccount />
        </>
      ) : (
        <>
          <p className="subtle" style={{ margin: "0 0 12px" }}>
            로그인하면 기록이 서버에 백업돼서 폰을 바꿔도 그대로 불러올 수 있어요. 지금 폰의 기록은 지워지지 않아요.
          </p>
          <button type="button" className="btn-primary" onClick={() => setLoginOpen(true)}>
            로그인하고 백업하기
          </button>
        </>
      )}
      {loginOpen && <LoginSheet onClose={() => setLoginOpen(false)} />}
    </div>
  );
}

// 로그인 방법 연결: 한 계정에 카카오와 이메일을 둘 다 붙여 두면 어느 쪽으로 로그인해도 같은 기록이 열린다.
// 연결은 본인 확인을 거친다 — 카카오는 카카오 로그인, 이메일은 그 주소로 온 6자리 코드.
function LoginMethods({ user }) {
  const providers = new Set((user.identities || []).map((i) => i.provider));
  const hasKakao = providers.has("kakao");
  const hasEmail = Boolean(user.email);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(false);

  async function run(fn, done) {
    setBusy(true);
    setMsg("");
    try {
      const { error } = await fn();
      if (error) throw error;
      done?.();
    } catch (err) {
      setMsg(authMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const linkKakao = () => run(() => supabase.auth.linkIdentity({ provider: "kakao", options: { redirectTo: location.origin } }));
  const sendCode = () => run(() => supabase.auth.updateUser({ email: email.trim() }), () => setSent(true));
  const verify = () => run(() => supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "email_change" }), () => (setOpen(false), setMsg("이메일을 연결했어요.")));

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>로그인 방법</div>
      <p className="faint" style={{ margin: "0 0 8px" }}>
        카카오 {hasKakao ? "✓ 연결됨" : "–"} · 이메일 {hasEmail ? `✓ ${user.email}` : "–"}
      </p>
      {!hasKakao && (
        <button type="button" className="btn-ghost small" disabled={busy} onClick={linkKakao} style={{ marginRight: 8 }}>
          카카오 연결하기
        </button>
      )}
      {!hasEmail && !open && (
        <button type="button" className="btn-ghost small" disabled={busy} onClick={() => setOpen(true)}>
          이메일 연결하기
        </button>
      )}
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {!sent ? (
            <>
              <input className="es-input" type="email" inputMode="email" autoComplete="email" placeholder="연결할 이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} style={{ fontSize: 16 }} />
              <button type="button" className="btn-ghost small" disabled={busy || !EMAIL_RE.test(email.trim())} onClick={sendCode}>
                {busy ? "보내는 중…" : "인증 코드 받기"}
              </button>
            </>
          ) : (
            <>
              <CodeInput value={code} onChange={setCode} />
              <button type="button" className="btn-primary" disabled={busy || code.length !== 6} onClick={verify}>
                {busy ? "확인하는 중…" : "이메일 연결"}
              </button>
            </>
          )}
        </div>
      )}
      {msg && <p className="faint" style={{ margin: "8px 0 0" }}>{msg}</p>}
    </div>
  );
}

// 계정 삭제 — 앱 안에서 바로(앱스토어·구글 플레이 필수). 두 번 확인한다
function DeleteAccount() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function run() {
    if (!window.confirm("계정을 삭제할까요?\n\n· 서버에 백업된 기록과 로그인 정보가 지워지고 되돌릴 수 없어요.\n· 가족과 함께 쓰던 강아지는 가족에게 넘어가 가족의 기록으로 남아요.\n· 이 폰에 있는 내 강아지 기록은 남아요(앱을 지우면 함께 지워져요).")) return;
    if (!window.confirm("정말 삭제할까요? 되돌릴 수 없어요.")) return;
    setBusy(true);
    setMsg("");
    try {
      await deleteAccount();
      window.alert("계정을 삭제했어요.");
    } catch (err) {
      setMsg(err.message);
      setBusy(false);
    }
  }
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
      <button type="button" className="btn-ghost small" disabled={busy} onClick={run} style={{ color: "var(--danger)" }}>
        {busy ? "삭제하는 중…" : "계정 삭제"}
      </button>
      {msg && <p className="error-text" style={{ margin: "8px 0 0" }}>{msg}</p>}
    </div>
  );
}

export function useSyncStatus() {
  const [status, setStatus] = useState(getSyncStatus);
  useEffect(() => onSyncStatus(setStatus), []);
  return status;
}

// 로그인 시트(설정에서 열림). 내용은 LoginForm — 온보딩 로그인 화면도 같은 걸 쓴다
export function LoginSheet({ onClose }) {
  const status = useSyncStatus();
  useEffect(() => {
    if (status.user) onClose();
  }, [status.user, onClose]);
  return createPortal(
    <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label="로그인">
        <div className="es-top">
          <span className="es-title">로그인하고 백업하기</span>
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="es-scroll" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
          <LoginForm />
        </div>
      </div>
    </div>,
    document.body
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Supabase 오류를 쉬운 말로
function authMessage(err) {
  const m = err?.message || "";
  if (err instanceof TypeError || /fetch|network/i.test(m)) return "서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.";
  if (/signups not allowed|user not found/i.test(m)) return "가입된 이메일이 아니에요. '이메일로 회원가입'을 눌러 주세요.";
  if (/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(m)) return "코드가 맞지 않거나 시간이 지났어요. 코드를 다시 받아 주세요.";
  if (/rate limit|security purposes|too many/i.test(m)) return "요청이 너무 잦아요. 잠시 뒤에 다시 시도해 주세요.";
  if (/already (been )?(registered|linked|exists)|identity.*(exists|linked)/i.test(m)) return "이미 다른 계정에서 쓰고 있어요. 그 계정으로 로그인해 주세요.";
  if (/manual linking/i.test(m)) return "로그인 방법 연결이 아직 켜져 있지 않아요(관리자 설정 필요).";
  return m || "다시 시도해 주세요.";
}

function CodeInput({ value, onChange }) {
  return (
    <input
      className="es-input"
      inputMode="numeric"
      autoComplete="one-time-code"
      placeholder="인증 코드 6자리"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      style={{ fontSize: 20, letterSpacing: "0.3em", textAlign: "center" }}
    />
  );
}

// 카카오 로그인에서 돌아왔는데 실패했으면 주소에 오류가 붙어 온다 → 한 번 보여 주고 주소는 깨끗이
function takeRedirectError() {
  const params = new URLSearchParams(location.search + "&" + location.hash.slice(1));
  const desc = params.get("error_description");
  if (!desc) return "";
  history.replaceState(null, "", location.pathname);
  return `로그인하지 못했어요: ${desc.replace(/\+/g, " ")}`;
}

// 로그인: 카카오(앱 밖 카카오 화면을 거쳐 돌아옴) 또는 이메일 6자리 코드(앱 안에서 끝남 — 홈 화면 앱에서도 안전).
// 이메일은 비밀번호 없이 매번 메일로 온 코드로 확인한다 → 가입이 곧 이메일 인증이고, 비밀번호 재설정이 필요 없다.
// 회원가입은 새 계정을 만들고, 로그인은 이미 가입한 이메일만 받는다(오타로 새 계정이 생기지 않게).
export function LoginForm() {
  const [mode, setMode] = useState(null); // null | "signup" | "login"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(takeRedirectError);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      const { error: err } = await fn();
      if (err) throw err;
      return true;
    } catch (err) {
      setError(authMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const kakao = () => run(() => supabase.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: location.origin } }));
  const sendCode = async () => (await run(() => supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: mode === "signup" } }))) && setSent(true);
  const verify = () => run(() => supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" }));
  const reset = () => (setMode(null), setSent(false), setCode(""), setError(""));

  return (
    <>
      <button type="button" className="btn-primary" disabled={busy} onClick={kakao} style={{ background: "#FEE500", color: "#191600", boxShadow: "none" }}>
        카카오로 계속하기
      </button>
      {!mode ? (
        <>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => setMode("signup")}>
            이메일로 회원가입
          </button>
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => setMode("login")}>
            이메일 계정으로 로그인
          </button>
        </>
      ) : !sent ? (
        <>
          <div className="faint" style={{ textAlign: "center" }}>{mode === "signup" ? "이메일로 회원가입" : "이메일 계정으로 로그인"}</div>
          <input className="es-input" type="email" inputMode="email" autoComplete="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} style={{ fontSize: 16 }} />
          <button type="button" className="btn-ghost" disabled={busy || !EMAIL_RE.test(email.trim())} onClick={sendCode}>
            {busy ? "보내는 중…" : "인증 코드 받기"}
          </button>
          <button type="button" className="btn-ghost small" disabled={busy} onClick={reset}>
            뒤로
          </button>
        </>
      ) : (
        <>
          <p className="subtle" style={{ margin: 0 }}>
            <b>{email.trim()}</b>로 보낸 6자리 코드를 적어 주세요. 메일이 안 보이면 스팸함도 확인해 주세요.
          </p>
          <CodeInput value={code} onChange={setCode} />
          <button type="button" className="btn-primary" disabled={busy || code.length !== 6} onClick={verify}>
            {busy ? "확인하는 중…" : mode === "signup" ? "가입하고 시작하기" : "로그인"}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-ghost small" disabled={busy} onClick={sendCode} style={{ flex: 1 }}>
              코드 다시 받기
            </button>
            <button type="button" className="btn-ghost small" disabled={busy} onClick={() => (setSent(false), setCode(""))} style={{ flex: 1 }}>
              이메일 다시 적기
            </button>
          </div>
        </>
      )}
      {error && <div className="error-text">{error}</div>}
      <p className="faint" style={{ margin: 0 }}>
        로그인하면 강아지 기록(프로필·건강 기록·일정·가계부·약)이 서버에 저장돼요. 화면 테마와 AI 대화 내용은 이 폰에만 남아요.{" "}
        <button type="button" onClick={() => setPrivacyOpen(true)} style={{ background: "none", border: "none", padding: 0, color: "var(--accent-strong)", textDecoration: "underline", font: "inherit" }}>
          개인정보 처리방침
        </button>
      </p>
      {privacyOpen && <PrivacyPolicy onClose={() => setPrivacyOpen(false)} />}
    </>
  );
}
