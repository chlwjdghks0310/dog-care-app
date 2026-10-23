import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { deleteAccount, getSyncStatus, onSyncStatus, signOut, syncNow } from "../services/sync";
import PrivacyPolicy from "./PrivacyPolicy";
import Ico from "./Ico";

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
  return (
    <BottomSheet title="로그인하고 백업하기" onClose={onClose}>
      <LoginForm />
      <PolicyLine verb="로그인하면" />
    </BottomSheet>
  );
}

// 밑에서 올라오는 시트(로그인·이메일·게스트 안내에서 같이 씀)
export function BottomSheet({ title, onClose, children }) {
  return createPortal(
    <div className="es-backdrop" style={{ zIndex: 150 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="es-sheet" role="dialog" aria-label={title}>
        <div className="es-top">
          <span className="es-title">{title}</span>
          <button type="button" className="es-x" aria-label="닫기" onClick={onClose}>
            <Ico name="x" size={16} />
          </button>
        </div>
        <div className="es-scroll" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>{children}</div>
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
  if (/signups not allowed|user not found/i.test(m)) return "이 이메일로는 시작할 수 없어요. 주소를 다시 확인해 주세요.";
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
// 첫 화면은 버튼 두 개만. 이메일은 누르면 EmailLogin으로(onEmail을 주면 그쪽 — 온보딩은 밑에서 올라오는 시트).
export function LoginForm({ onEmail }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(takeRedirectError);
  const [emailOpen, setEmailOpen] = useState(false);
  async function kakao() {
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: location.origin } });
    if (err) setError(authMessage(err));
    setBusy(false);
  }
  if (emailOpen) return <EmailLogin onBack={() => setEmailOpen(false)} />;
  return (
    <div className="login-buttons">
      <button type="button" className="btn-primary login-kakao" disabled={busy} onClick={kakao}>
        <KakaoMark /> 카카오 로그인
      </button>
      <button type="button" className="btn-ghost login-email" disabled={busy} onClick={() => (onEmail ? onEmail() : setEmailOpen(true))}>
        <Ico name="mail" size={18} /> 이메일로 계속하기
      </button>
      {error && <div className="error-text">{error}</div>}
    </div>
  );
}

// 카카오 말풍선 심볼(카카오 로그인 버튼 가이드: 노란 바탕 #FEE500, 검정 심볼·글자, 모서리 12px, 문구 "카카오 로그인")
const KakaoMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#000" d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.66 6.77-.2.75-.73 2.7-.84 3.12-.13.52.19.51.4.37.17-.11 2.62-1.78 3.68-2.5.69.1 1.39.15 2.1.15 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
  </svg>
);

// 이메일 로그인: 이메일 → 6자리 코드 한 흐름(가입·로그인을 나누지 않음 — 처음이면 자동 가입). 비밀번호 없이 매번 메일 코드로 확인
export function EmailLogin({ onBack }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0); // 코드 다시 받기까지 남은 초
  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);
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
  const sendCode = async () => {
    if (await run(() => supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } }))) (setSent(true), setWait(60));
  };
  const verify = () => run(() => supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" }));
  return (
    <div className="login-buttons">
      {!sent ? (
        <>
          <input className="es-input" type="email" inputMode="email" autoComplete="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} style={{ fontSize: 16 }} />
          <button type="button" className="btn-primary" disabled={busy || !EMAIL_RE.test(email.trim())} onClick={sendCode}>
            {busy ? "보내는 중…" : "인증 코드 받기"}
          </button>
          <p className="faint" style={{ margin: 0, textAlign: "center" }}>비밀번호 없이, 메일로 온 6자리 코드로 계속해요. 처음이면 바로 가입돼요.</p>
        </>
      ) : (
        <>
          <p className="subtle" style={{ margin: 0 }}>
            <b>{email.trim()}</b>로 보낸 6자리 코드를 적어 주세요. 메일이 안 보이면 스팸함도 확인해 주세요.
          </p>
          <CodeInput value={code} onChange={setCode} />
          <button type="button" className="btn-primary" disabled={busy || code.length !== 6} onClick={verify}>
            {busy ? "확인하는 중…" : "계속하기"}
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-ghost small" disabled={busy || wait > 0} onClick={sendCode} style={{ flex: 1 }}>
              {wait > 0 ? `${wait}초 뒤 다시 받기` : "코드 다시 받기"}
            </button>
            <button type="button" className="btn-ghost small" disabled={busy} onClick={() => (setSent(false), setCode(""))} style={{ flex: 1 }}>
              이메일 바꾸기
            </button>
          </div>
        </>
      )}
      {error && <div className="error-text">{error}</div>}
      {onBack && (
        <button type="button" className="link-btn" style={{ alignSelf: "center" }} onClick={onBack}>
          ← 다른 방법으로
        </button>
      )}
    </div>
  );
}

// 하단 한 줄: 계속하면 처리방침에 동의 + 누르면 처리방침
export function PolicyLine({ verb = "계속하면" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <p className="faint login-policy">
        {verb}{" "}
        <button type="button" className="link-btn" onClick={() => setOpen(true)}>
          개인정보 처리방침
        </button>
        에 동의한 것으로 봐요
      </p>
      {open && <PrivacyPolicy onClose={() => setOpen(false)} />}
    </>
  );
}
