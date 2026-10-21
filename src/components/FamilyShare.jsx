import { useCallback, useEffect, useState } from "react";
import { acceptInvite, createInvite, leavePet, listMembers, removeMember, savedInvite } from "../services/sync/family";
import { setActiveDogId } from "../services/dogRepository";
import { syncNow } from "../services/sync";
import { LoginSheet, useSyncStatus } from "./AccountCard";

// 설정의 "가족 공유" 카드 — 지금 보고 있는 강아지 기준. 로그인 전에는 로그인 안내를 보여 준다.
// 보호자: 초대 코드 만들기·복사·공유·새로 만들기, 가족 내보내기 / 가족: 목록 보기, 나가기.
// 이 강아지의 가족 목록. 백업·실시간 맞추기가 끝날 때마다(lastSyncedAt) 다시 불러온다. members: null = 불러오는 중
export function useMembers(dogId) {
  const { user, lastSyncedAt } = useSyncStatus();
  const [members, setMembers] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setMembers(await listMembers(dogId));
      setError("");
    } catch (err) {
      // 서버에 가족 공유 기능(supabase/schema.sql)이 아직 없으면 그렇다고 알려 준다
      setError(/schema cache|could not find|does not exist/i.test(err.message) ? "서버에 가족 공유 기능이 아직 설정되지 않았어요. 관리자가 supabase/schema.sql을 실행해야 해요." : err.message);
      setMembers([]);
    }
  }, [dogId]);
  useEffect(() => {
    if (user) load();
    else setMembers(null);
  }, [user, load, lastSyncedAt]);
  return { members, error, reload: load };
}

// 프로필 이름 아래 표시: 다른 가족과 연동된 강아지면 "가족 공유 중 · 누구와"
export function FamilyBadge({ dogId }) {
  const { members } = useMembers(dogId);
  const others = (members || []).filter((m) => !m.is_me);
  if (!others.length) return null;
  return (
    <div className="faint" style={{ marginTop: 6, fontSize: 13 }}>
      👨‍👩‍👧 가족 공유 중 · {others.map((m) => `${label(m)}${m.role === "owner" ? "(보호자)" : ""}`).join(", ")}
    </div>
  );
}

export default function FamilyShare({ dog }) {
  const { enabled, user } = useSyncStatus();
  const [loginOpen, setLoginOpen] = useState(false);
  const { members, error, reload: load } = useMembers(dog.id);
  const [invite, setInvite] = useState(() => savedInvite(dog.id));
  const [busy, setBusy] = useState(false);
  const [actMsg, setMsg] = useState("");
  const msg = actMsg || error;

  if (!enabled) return null;
  if (!user)
    return (
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="h2">가족 공유 · {dog.name}</div>
        <p className="subtle" style={{ margin: "0 0 12px" }}>로그인하면 초대 코드를 만들어 가족과 {dog.name} 기록을 함께 볼 수 있어요.</p>
        <button type="button" className="btn-ghost" onClick={() => setLoginOpen(true)}>
          로그인하고 가족 초대하기
        </button>
        {loginOpen && <LoginSheet onClose={() => setLoginOpen(false)} />}
      </div>
    );
  const me = members?.find((m) => m.is_me);
  const isOwner = me?.role === "owner";

  async function act(fn) {
    setBusy(true);
    setMsg("");
    try {
      await fn();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }
  const makeCode = () => {
    if (invite && !window.confirm("새 코드를 만들면 지금 코드는 더 이상 쓸 수 없어요. 새로 만들까요?")) return;
    act(async () => setInvite(await createInvite(dog.id)));
  };
  const shareText = () => `멍케어에서 ${dog.name} 기록을 같이 봐요!\n초대 코드: ${invite.code}\n앱에 로그인한 뒤 설정(☰)의 '초대 코드 받기'에 입력해 주세요. (${fmt(invite.expires_at)}까지)\n${location.origin}`;
  const copy = () => act(async () => (await navigator.clipboard.writeText(invite.code), setMsg("코드를 복사했어요.")));
  const share = () =>
    act(async () => {
      if (navigator.share) await navigator.share({ text: shareText() }).catch((e) => e.name !== "AbortError" && Promise.reject(e));
      else await navigator.clipboard.writeText(shareText()), setMsg("초대 메시지를 복사했어요. 카카오톡에 붙여 넣어 보내 주세요.");
    });
  const kick = (m) => window.confirm(`${label(m)}님을 ${dog.name} 가족 공유에서 내보낼까요? 바로 기록을 볼 수 없게 돼요.`) && act(async () => (await removeMember(dog.id, m.user_id), await load()));
  const leave = () => window.confirm(`${dog.name} 가족 공유에서 나갈까요? 이 폰에서만 사라지고, 다른 가족의 기록은 그대로 남아요.`) && act(() => leavePet(dog.id));

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="h2">가족 공유 · {dog.name}</div>
      {members === null ? (
        <p className="faint" style={{ margin: 0 }}>불러오는 중…</p>
      ) : !me && error ? null : !me ? (
        <>
          <p className="subtle" style={{ margin: "0 0 10px" }}>{dog.name} 기록을 먼저 백업하면 가족을 초대할 수 있어요.</p>
          <button type="button" className="btn-ghost small" disabled={busy} onClick={() => syncNow()}>
            지금 백업
          </button>
        </>
      ) : (
        <>
          {isOwner && (
            <div style={{ marginBottom: 14 }}>
              <p className="subtle" style={{ margin: "0 0 10px" }}>
                초대 코드를 받은 가족이 설정의 '초대 코드 받기'에 입력하면, {dog.name}의 체중·건강·일정·가계부·약 기록을 함께 보고 적을 수 있어요.
              </p>
              {invite ? (
                <>
                  <div className="family-code" aria-label={`초대 코드 ${invite.code}`}>{invite.code}</div>
                  <p className="faint" style={{ margin: "6px 0 10px", textAlign: "center" }}>
                    {fmt(invite.expires_at)}까지 · 최대 5명 · 새로 만들면 이 코드는 못 써요
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn-primary" disabled={busy} onClick={share} style={{ flex: 2 }}>
                      공유하기
                    </button>
                    <button type="button" className="btn-ghost" disabled={busy} onClick={copy} style={{ flex: 1 }}>
                      복사
                    </button>
                  </div>
                  <button type="button" className="btn-ghost small" disabled={busy} onClick={makeCode} style={{ marginTop: 8 }}>
                    새 코드 만들기
                  </button>
                </>
              ) : (
                <button type="button" className="btn-primary" disabled={busy} onClick={makeCode}>
                  {busy ? "만드는 중…" : "초대 코드 만들기"}
                </button>
              )}
            </div>
          )}
          <div style={{ fontWeight: 700, marginBottom: 6 }}>함께하는 가족 {members.length}명</div>
          {members.map((m) => (
            <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <span style={{ flex: 1 }}>
                {label(m)}
                {m.is_me && <span className="faint"> (나)</span>}
              </span>
              <span className="chip" style={{ fontSize: 12, padding: "2px 8px" }}>{m.role === "owner" ? "보호자" : "가족"}</span>
              {isOwner && !m.is_me && m.role !== "owner" && (
                <button type="button" className="btn-ghost small" disabled={busy} onClick={() => kick(m)}>
                  내보내기
                </button>
              )}
            </div>
          ))}
          {!isOwner && (
            <button type="button" className="btn-ghost small" disabled={busy} onClick={leave} style={{ marginTop: 10 }}>
              가족 공유에서 나가기
            </button>
          )}
        </>
      )}
      {msg && <p className="faint" style={{ margin: "10px 0 0" }}>{msg}</p>}
      <JoinFamily />
    </div>
  );
}

// 초대 코드 받기: 가족에게 받은 코드를 넣으면 그 강아지가 내 강아지들 옆에 한 마리 더 생긴다(지금 강아지는 그대로).
// 서버가 코드를 확인해 가족으로 넣고 → 그 강아지 기록 전체를 받아 오면 App이 새 강아지 화면으로 바꾼다(dogcare-synced)
function JoinFamily() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function join() {
    setBusy(true);
    setMsg("");
    try {
      const petId = await acceptInvite(code);
      setActiveDogId(petId);
      setCode("");
      setMsg("연결됐어요! 가족 강아지가 내 강아지 목록에 추가됐어요.");
      window.dispatchEvent(new Event("dogcare-synced")); // 이미 연결돼 있던 코드여도 그 강아지로 화면을 바꾼다
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>초대 코드 받기</div>
      <p className="faint" style={{ margin: "0 0 8px" }}>가족에게 받은 코드를 넣으면 그 강아지가 추가돼요. 지금 강아지 기록은 그대로예요.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="es-input"
          value={code}
          onChange={(e) => (setCode(e.target.value.toUpperCase()), setMsg(""))}
          placeholder="초대 코드 8자리"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          style={{ flex: 1, minWidth: 0, fontSize: 16, letterSpacing: code ? "0.15em" : undefined }}
        />
        <button type="button" className="btn-primary" disabled={busy || code.replace(/[^A-Z0-9]/g, "").length < 8} onClick={join} style={{ width: "auto", padding: "0 18px" }}>
          {busy ? "확인 중…" : "연결"}
        </button>
      </div>
      {msg && <p className="faint" style={{ margin: "8px 0 0" }}>{msg}</p>}
    </div>
  );
}

const label = (m) => m.display_name || (m.role === "owner" ? "보호자" : "가족");
const fmt = (iso) => new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
