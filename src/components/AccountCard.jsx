import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { getSyncStatus, onSyncStatus, signOut, syncNow } from "../services/sync";
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

export function useSyncStatus() {
  const [status, setStatus] = useState(getSyncStatus);
  useEffect(() => onSyncStatus(setStatus), []);
  return status;
}

// 로그인: 카카오(앱 밖 카카오 화면을 거쳐 돌아옴) 또는 이메일 6자리 코드(앱 안에서 끝남 — 홈 화면 앱에서도 안전)
export function LoginSheet({ onClose }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const status = useSyncStatus();

  useEffect(() => {
    if (status.user) onClose();
  }, [status.user, onClose]);

  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      const { error: err } = await fn();
      if (err) throw err;
      return true;
    } catch (err) {
      const offline = err instanceof TypeError || /fetch|network/i.test(err.message || "");
      setError(offline ? "서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요." : err.message || "다시 시도해 주세요.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const kakao = () => run(() => supabase.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo: location.origin } }));
  const sendCode = async () => (await run(() => supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } }))) && setSent(true);
  const verify = () => run(() => supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" }));
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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
          <button type="button" className="btn-primary" disabled={busy} onClick={kakao} style={{ background: "#FEE500", color: "#191600", boxShadow: "none" }}>
            카카오로 계속하기
          </button>
          <div className="faint" style={{ textAlign: "center" }}>또는 이메일로</div>
          {!sent ? (
            <>
              <input className="es-input" type="email" inputMode="email" autoComplete="email" placeholder="이메일 주소" value={email} onChange={(e) => setEmail(e.target.value)} style={{ fontSize: 16 }} />
              <button type="button" className="btn-ghost" disabled={busy || !emailOk} onClick={sendCode}>
                {busy ? "보내는 중…" : "인증 코드 받기"}
              </button>
            </>
          ) : (
            <>
              <p className="subtle" style={{ margin: 0 }}>
                <b>{email.trim()}</b>로 보낸 6자리 코드를 적어 주세요. 메일이 안 보이면 스팸함도 확인해 주세요.
              </p>
              <input
                className="es-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="인증 코드 6자리"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{ fontSize: 20, letterSpacing: "0.3em", textAlign: "center" }}
              />
              <button type="button" className="btn-primary" disabled={busy || code.length !== 6} onClick={verify}>
                {busy ? "확인하는 중…" : "로그인"}
              </button>
              <button type="button" className="btn-ghost small" disabled={busy} onClick={() => (setSent(false), setCode(""))}>
                이메일 다시 적기
              </button>
            </>
          )}
          {error && <div className="error-text">{error}</div>}
          <p className="faint" style={{ margin: 0 }}>
            로그인하면 강아지 기록(프로필·건강 기록·일정·가계부·약)이 서버에 저장돼요. 화면 테마와 AI 대화 내용은 이 폰에만 남아요.{" "}
            <button type="button" onClick={() => setPrivacyOpen(true)} style={{ background: "none", border: "none", padding: 0, color: "var(--accent-strong)", textDecoration: "underline", font: "inherit" }}>
              개인정보 처리방침
            </button>
          </p>
        </div>
      </div>
      {privacyOpen && <PrivacyPolicy onClose={() => setPrivacyOpen(false)} />}
    </div>,
    document.body
  );
}
