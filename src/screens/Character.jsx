import { useEffect, useRef, useState } from "react";
import Ico from "../components/Ico";
import PawProgress from "../components/PawProgress";
import { getPermission, isNotificationSupported, requestPermission } from "../services/notifications";
import { fetchStatus, setWaitlist, redeem, shrinkPhoto, startJob, refreshJob, pickCandidate, regenCandidates, retryRender, addExtra, getCharacter, clearCharacterOutputs, isWorking, isExtraWorking, STYLE_LABEL } from "../services/character";

// 우리 아이 캐릭터(11/17): 설정 → 우리 강아지 → "우리 아이 캐릭터". 문은 잠겨 있고(곧 출시) 초대 코드를 쓴 강아지만 만든다.
// 흐름: 잠김(알림 대기·코드) → 그림체·사진·동의 → 후보 4장 중 고르기 → 영상 만드는 중 → 완성(홈 강아지가 바뀜) → 부가 동작
// 11/18 다시 짬(사용자: 폰에서 잘림·AI티·아이콘 겹침): 캐릭터=video 스티커, 단계마다 다른 스티커(사진 image·고르기 tap·홈 house), 부가 동작도 각각(party·moon·meal·walk)
const SAMPLE = { "3d": "/character/sample-3d.jpg", hand: "/character/sample-hand.jpg" };

import { rewardsOf, claimExtra } from "../services/stamps";
import { EXTRA_KINDS, EXTRA_META, getExtraPrefs, setExtraPref } from "../services/characterPrefs";
import Checkout from "./Checkout";
import { recordBetaCharacter, CATALOG, won } from "../services/billing";

export default function Character({ dog }) {
  // 서버에 묻는 동안 마지막으로 알던 상태를 먼저 보여 준다(토큰·플러스·작업이 폰에 있음). 처음이면 "불러오는 중"
  const [st, setSt] = useState(() => { const c = getCharacter(dog.id); return c && (c.token || c.job) ? { offline: true, cached: true, access: Boolean(c.token), plus: Boolean(c.plus), job: c.job || null } : null; }); // 서버 status
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const load = async () => {
    try { setSt(await fetchStatus(dog.id)); setErr(""); }
    catch (e) { setErr(e.message); setSt((s) => s || { offline: true, job: getCharacter(dog.id)?.job || null }); }
  };
  useEffect(() => { load(); }, [dog.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const job = st?.job;
  useEffect(() => { // 만드는 중이면 30초마다, 앱으로 돌아올 때도 새로 묻는다
    clearInterval(timer.current);
    if (!isWorking(job)) return;
    const poll = () => refreshJob(dog.id).then((j) => j && setSt((s) => ({ ...s, job: j }))).catch(() => {});
    timer.current = setInterval(poll, 30_000);
    document.addEventListener("visibilitychange", poll);
    return () => { clearInterval(timer.current); document.removeEventListener("visibilitychange", poll); };
  }, [job?.status, dog.id]);

  const act = (fn) => async (...a) => { if (busy) return; setBusy(true); setErr(""); try { await fn(...a); } catch (e) { setErr(e.message || "실패했어요"); } finally { setBusy(false); } };

  if (!st) return <p className="muted" style={{ padding: 16 }}>불러오는 중…</p>;
  const unlocked = st.open || st.access;
  const stage = !unlocked ? "locked" : isWorking(job) && !isExtraWorking(job) ? "working" : job?.status === "pick" ? "pick" : "form";

  return (
    <div className="px">
      <header className="px-hero">
        <Ico name="video" size={48} />
        <div>
          <div className="h1" style={{ margin: 0 }}>우리 아이 캐릭터</div>
          <p className="px-lead">사진 2~4장이면 {dog.name}가 앱 속 캐릭터가 돼요. 홈 화면에서 꼬리 흔들며 기다리고, 물어볼 땐 엎드려서 고민해요.</p>
        </div>
      </header>
      {err && <p className="error-text" role="alert" style={{ margin: 0 }}>{err}</p>}
      {stage === "locked" && <Locked dog={dog} st={st} setSt={setSt} act={act} busy={busy} />}
      {stage === "form" && <Form dog={dog} job={job} st={st} setSt={setSt} act={act} busy={busy} />}
      {stage === "working" && <Working job={job} onRefresh={act(() => refreshJob(dog.id).then((j) => setSt((s) => ({ ...s, job: j }))))} busy={busy} />}
      {stage === "pick" && <Pick dog={dog} job={job} setSt={setSt} act={act} busy={busy} />}
    </div>
  );
}

function Samples() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <figure className="char-sample"><img src={SAMPLE.hand} alt="그림일기 예시" /><figcaption>그림일기</figcaption></figure>
      <figure className="char-sample"><img src={SAMPLE["3d"]} alt="말랑 3D 예시" /><figcaption>말랑 3D</figcaption></figure>
    </div>
  );
}
function Steps() {
  return (
    <div className="px-steps">
      <div className="px-step"><Ico name="image" size={30} /><b>사진 2~4장</b><span className="px-dim">정면 + 앉은 전신</span></div>
      <div className="px-step"><Ico name="tap" size={30} /><b>후보 4장 중 고르기</b><span className="px-dim">10분쯤 뒤 알림</span></div>
      <div className="px-step"><Ico name="house" size={30} /><b>홈 화면에 등장</b><span className="px-dim">15분쯤 뒤 알림</span></div>
    </div>
  );
}

function Locked({ dog, st, setSt, act, busy }) {
  const [code, setCode] = useState("");
  const [checkout, setCheckout] = useState(false);
  const canPush = isNotificationSupported();
  const toggleWait = act(async (on) => {
    if (on && getPermission() !== "granted") { const p = await requestPermission(); if (p !== "granted") throw new Error("알림을 켜야 출시 소식을 보내 드릴 수 있어요"); }
    const r = await setWaitlist(dog.id, on);
    setSt((s) => ({ ...s, waiting: r.waiting }));
  });
  const useCode = act(async () => {
    if (!code.trim()) throw new Error("코드를 넣어 주세요");
    await redeem(dog.id, code.trim());
    recordBetaCharacter(dog.id, code.trim());
    setSt(await fetchStatus(dog.id));
  });
  return (
    <>
      <section className="px-card">
        <div className="px-sec">곧 출시 · 두 가지 그림체 중 하나를 골라요</div>
        <Samples />
        <Steps />
        <button type="button" className="btn-primary" style={{ width: "100%" }} onClick={() => setCheckout(true)}>단품으로 갖기 · {won(CATALOG.char_basic.price)}부터</button>
        <p className="px-note">기본 {won(CATALOG.char_basic.price)} · 정성 {won(CATALOG.char_premium.price)} · 다른 그림체 +{won(CATALOG.char_style.price)}. 연간 플러스엔 기본 1번이 들어 있어요.</p>
      </section>
      {checkout && <Checkout dog={dog} intent="character" plus={Boolean(st?.plus)} onClose={() => setCheckout(false)} onChanged={() => fetchStatus(dog.id).then(setSt).catch(() => {})} onOpenCharacter={() => setCheckout(false)} />}
      <section className="px-card">
        <label className="px-switch">
          <Ico name="bell" size={38} />
          <div className="px-feat-body">
            <div className="px-feat-title">출시되면 알려 주세요</div>
            <div className="px-feat-desc">{canPush ? "열리는 날 알림 한 번만 보내요" : "알림을 쓸 수 있는 홈 화면 앱에서 켤 수 있어요"}</div>
          </div>
          <input type="checkbox" role="switch" className="switch" checked={Boolean(st.waiting)} disabled={!canPush || busy || st.offline} onChange={(e) => toggleWait(e.target.checked)} aria-label="출시되면 알려 주세요" />
        </label>
      </section>
      <section className="px-card">
        <div className="px-feat"><Ico name="lock" size={38} /><div className="px-feat-body"><div className="px-feat-title">초대 코드가 있어요</div><div className="px-feat-desc">베타 테스터에게 드린 코드예요. 강아지 한 마리에 한 번 써요.</div></div></div>
        <input className="char-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MC-XXXX-XXXX" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
        <button type="button" className="btn-primary" onClick={useCode} disabled={busy || st.offline}>{busy ? "확인 중…" : "코드 쓰기"}</button>
      </section>
    </>
  );
}

function Form({ dog, job, st, setSt, act, busy }) {
  const [style, setStyle] = useState(job?.style || "hand");
  const [files, setFiles] = useState([]); // { blob, url }
  const [adult, setAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const inputRef = useRef(null);
  const outputs = getCharacter(dog.id)?.outputs;
  const addFiles = act(async (list) => {
    const next = [];
    for (const f of [...list].slice(0, 4 - files.length)) { const blob = await shrinkPhoto(f); next.push({ blob, url: URL.createObjectURL(blob) }); }
    setFiles((cur) => [...cur, ...next].slice(0, 4));
  });
  const remove = (i) => setFiles((cur) => { URL.revokeObjectURL(cur[i].url); return cur.filter((_, k) => k !== i); });
  const go = act(async () => {
    if (files.length < 2) throw new Error("사진을 2장 이상 골라 주세요");
    if (!adult || !consent) throw new Error("두 가지에 동의해 주세요");
    const j = await startJob(dog.id, { style, blobs: files.map((f) => f.blob) });
    setSt((s) => ({ ...s, job: j }));
  });
  return (
    <>
      {outputs && (
        <section className="px-card">
          <div className="px-feat">
            <img src={outputs.poster} alt="" style={{ width: 72, height: 72, objectFit: "contain", flexShrink: 0 }} />
            <div className="px-feat-body">
              <div className="px-feat-title">{dog.name} 캐릭터가 홈 화면에 있어요</div>
              <div className="px-feat-desc">{STYLE_LABEL[outputs.style]} · {outputs.preset ? "선물 코드로 받음" : String(outputs.madeAt).slice(0, 10)}</div>
            </div>
          </div>
          <Extras dog={dog} job={job} outputs={outputs} setSt={setSt} act={act} busy={busy} />
          <button type="button" className="btn-ghost" onClick={() => (clearCharacterOutputs(dog.id), setSt((s) => ({ ...s })))}>기본 강아지로 돌리기</button>
        </section>
      )}
      {job?.status === "failed" && (
        <section className="px-card">
          <div className="px-feat"><Ico name="alert" size={38} /><div className="px-feat-body"><div className="px-feat-title">지난번 만들기가 실패했어요</div><div className="px-feat-desc">사진은 지웠어요. {job.picked ? "고른 설정화는 남아 있어서 움직임만 다시 만들 수 있어요." : "아래에서 다시 시도해 주세요."}</div></div></div>
          {job.picked && <button type="button" className="btn-primary" onClick={act(async () => { const j = await retryRender(dog.id); setSt((s) => ({ ...s, job: j })); })} disabled={busy}>움직임만 다시 만들기</button>}
        </section>
      )}
      {!outputs && <section className="px-card"><Samples /><Steps /></section>}

      <section className="px-card">
        <div className="px-feat"><Ico name="pencil" size={38} /><div className="px-feat-body"><div className="px-feat-title"><span className="px-num">1</span>그림체</div><div className="px-feat-desc">둘 중 하나. 나중에 다른 그림체를 더할 수 있어요.</div></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {["hand", "3d"].map((k) => (
            <button key={k} type="button" className={`char-style${style === k ? " on" : ""}`} onClick={() => setStyle(k)} aria-pressed={style === k}>
              <img src={SAMPLE[k]} alt="" /><span>{STYLE_LABEL[k]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="px-card">
        <div className="px-feat"><Ico name="image" size={38} /><div className="px-feat-body"><div className="px-feat-title"><span className="px-num">2</span>사진 2~4장</div><div className="px-feat-desc">정면 얼굴 1장 + 앉은 전신 1장이면 가장 잘 닮아요. 밝은 곳, 혼자 나온 사진. 위치 정보는 보내기 전에 지워요.</div></div></div>
        <div className="px-photos">
          {files.map((f, i) => (
            <div key={f.url} className="char-photo"><img src={f.url} alt={`사진 ${i + 1}`} /><button type="button" aria-label="빼기" onClick={() => remove(i)}><Ico name="x" size={14} /></button></div>
          ))}
          {files.length < 4 && (
            <button type="button" className="char-photo add" onClick={() => inputRef.current?.click()} disabled={busy}><Ico name="imagePlus" size={22} /><span>{files.length ? "더 넣기" : "사진 고르기"}</span></button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
      </section>

      <section className="px-card">
        <div className="px-feat"><Ico name="checklist" size={38} /><div className="px-feat-body"><div className="px-feat-title"><span className="px-num">3</span>확인</div></div></div>
        <label className="char-check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /><span>저는 만 19세 이상이에요(캐릭터 기능은 성인만 쓸 수 있어요)</span></label>
        <label className="char-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>사진이 캐릭터를 만들기 위해 미국의 AI 서비스(Google·Runway)로 전송되는 데 동의해요. 만든 뒤 사진은 바로 지워요. 시작한 뒤에는 취소할 수 없어요.</span></label>
      </section>
      <button type="button" className="btn-primary" onClick={go} disabled={busy || st.offline || !st.ready}>{busy ? "보내는 중…" : outputs ? "새로 만들기" : "만들기 시작"}</button>
      {!st.ready && !st.offline && <p className="px-note">지금은 서버 준비 중이라 만들 수 없어요.</p>}
      <p className="px-note">후보 4장(10분쯤) → 하나 고르면 기본 움직임 2가지(15분쯤) → 그 뒤 부가 동작 세 편(기쁨·밥 기다림·졸림)을 더할 수 있어요. 단계마다 알림으로 알려 드려요.</p>
    </>
  );
}

// 부가 동작(정성 상품 = 기쁨·밥 기다림·졸림 세 편, 베타는 무료). 줄마다 "언제 나오나" 설명 + 켜기 + 조정(11/20 사용자). 선물 캐릭터도 조정만은 된다
function Extras({ dog, job, outputs, setSt, act, busy }) {
  const have = outputs?.extras || job?.outputs?.extras || {};
  const pending = job?.outputs?.pendingExtra;
  const canMake = Boolean(job?.outputs?.green); // 서버가 만든 캐릭터만 새 동작을 만들 수 있다(선물은 파일로 받음)
  const n = EXTRA_KINDS.filter((k) => have[k]).length;
  const reward = rewardsOf(dog.id); // 스탬프 배지 5개 = 부가 동작 1편(11/19)
  const [prefs, setPrefs] = useState(() => getExtraPrefs(dog.id));
  const set = (k, patch) => setPrefs(setExtraPref(dog.id, k, patch));
  const add = (kind) => act(async () => { const j = await addExtra(dog.id, kind); if (reward.extrasLeft > 0) claimExtra(dog.id); setSt((s) => ({ ...s, job: j })); });
  const Seg = ({ k, field, opts, fmt = (v) => v }) => (
    <div className="chip-wrap" style={{ margin: 0, gap: 4 }}>{opts.map((v) => <button key={v} type="button" className={`seg${prefs[k][field] === v ? " on" : ""}`} style={{ padding: "5px 0", fontSize: 12.5 }} aria-pressed={prefs[k][field] === v} onClick={() => set(k, { [field]: v })}>{fmt(v)}</button>)}</div>
  );
  return (
    <div style={{ display: "grid", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
      <div className="px-sec">부가 동작 {n}/3 <span className="px-dim">· 상황에 맞춰 홈 화면에서 움직여요 · 여기서 켜고 끄고 시간을 맞춰요</span></div>
      {canMake && reward.extrasLeft > 0 && <p className="px-note" style={{ margin: 0 }}>🏅 하루 체크 배지 {reward.badges}개 — 부가 동작 {reward.extrasLeft}편을 받을 수 있어요. 아래 [만들기]</p>}
      {EXTRA_KINDS.map((k) => {
        const m = EXTRA_META[k], p = prefs[k], done = Boolean(have[k]);
        return (
          <div key={k} className="char-extra">
            <div className="px-feat">
              <Ico name={m.ico} size={30} />
              <div className="px-feat-body"><div className="px-feat-title" style={{ fontSize: 15 }}>{m.label}</div><div className="px-feat-desc" style={{ fontSize: 13 }}>{m.how(p)}</div></div>
              {done ? <Ico name="check" size={22} style={{ color: "var(--accent-strong)", alignSelf: "center" }} />
                : pending === k ? <span style={{ alignSelf: "center" }}><PawProgress progress={job.progress} size={40} stroke={4} percent="none" label={`${m.label} 만드는 중`} /></span>
                : canMake ? <button type="button" className="btn-ghost small" style={{ alignSelf: "center" }} onClick={add(k)} disabled={busy || Boolean(pending) || n >= 3}>만들기</button>
                : <span className="px-dim" style={{ alignSelf: "center", whiteSpace: "nowrap" }}>준비 중</span>}
            </div>
            <div className="char-extra-ctl">
              <label className="char-extra-on"><input type="checkbox" role="switch" className="switch" checked={p.on} onChange={(e) => set(k, { on: e.target.checked })} aria-label={`${m.label} 켜기`} /><span>{p.on ? "켬" : "끔"}</span></label>
              {k === "happy" && <Seg k="happy" field="sec" opts={[3, 6, 10]} fmt={(v) => `${v}초`} />}
              {k === "meal" && <Seg k="meal" field="win" opts={[15, 30, 60]} fmt={(v) => `앞뒤 ${v}분`} />}
              {k === "sleepy" && <div className="char-extra-time"><input type="time" value={p.from} onChange={(e) => e.target.value && set("sleepy", { from: e.target.value })} aria-label="졸림 시작" /><span>~</span><input type="time" value={p.to} onChange={(e) => e.target.value && set("sleepy", { to: e.target.value })} aria-label="졸림 끝" /></div>}
            </div>
          </div>
        );
      })}
      {pending && <p className="px-note">{job.step} · 끝나면 알림으로 알려 드려요</p>}
      {job?.error && !pending && <p className="error-text" style={{ margin: 0, fontSize: 12.5 }}>{job.step}</p>}
      {!canMake && n < 3 && <p className="px-note" style={{ margin: 0 }}>선물 캐릭터의 남은 동작은 준비되면 넣어 드려요.</p>}
    </div>
  );
}

const STAGES = ["후보 그리기", "고르기", "움직임 만들기", "완성"];
function Working({ job, onRefresh, busy }) {
  const title = job.status === "render" ? "움직임을 만드는 중" : job.status === "sheet" ? "설정화를 그리는 중" : "순서를 기다리는 중";
  const cur = ["picked", "render"].includes(job.status) ? 2 : 0; // pick 상태는 다른 화면
  const p = job.progress;
  // 이 단계가 보통 얼마나 걸리고 지금 얼마나 지났나(1초마다). 예상의 2배를 넘으면 "조금 더 걸리고 있어요"
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const elapsed = p ? Math.max(0, (now - new Date(p.since || now).getTime()) / 1000) : 0;
  const usual = p ? Math.max(1, Math.round((p.secs || 60) / 60)) : null;
  const late = p && elapsed > (p.secs || 60) * 2;
  const mins = Math.floor(elapsed / 60), secs = Math.floor(elapsed % 60);
  // [새로고침] 티 내기: 누르면 "확인 중…", 끝나면 게이지가 한 번 반짝 + "방금 확인했어요 · 시각" 3초
  const [checked, setChecked] = useState(null);
  const [bump, setBump] = useState(false);
  const refresh = async () => { await onRefresh(); setChecked(new Date()); setBump(true); setTimeout(() => setBump(false), 500); setTimeout(() => setChecked(null), 3000); };
  return (
    <section className="px-card" style={{ textAlign: "center", padding: 22 }}>
      <div className={bump ? "pawp-bump-host bump" : ""}><PawProgress progress={job.progress} label={title} /></div>
      <div className="px-feat-title" style={{ marginTop: 10 }}>{title}</div>
      <p className="px-feat-desc" style={{ margin: 0 }}>{job.step}</p>
      {p && <p className="px-note" style={{ margin: 0 }}>이 단계는 보통 {usual}분 · 지금 {mins > 0 ? `${mins}분 ` : ""}{secs}초 지남{late ? " · 조금 더 걸리고 있어요. 서버는 계속 일하고 있어요" : ""}</p>}
      <ol className="px-stages" aria-label="진행 단계">
        {STAGES.map((s, i) => <li key={s} className={i < cur ? "done" : i === cur ? "cur" : ""}><span className="px-stage-dot">{i < cur ? "✓" : i + 1}</span>{s}</li>)}
      </ol>
      <p className="px-note">앱을 닫아도 계속 만들어요. 30초마다 서버에 묻고, 끝나면 알림으로 알려 드려요.</p>
      <button type="button" className="btn-ghost" onClick={refresh} disabled={busy}>{busy ? "확인 중…" : "지금 확인하기"}</button>
      {checked && <p className="px-note" style={{ margin: 0, color: "var(--accent-strong)" }}>방금 확인했어요 · {checked.toTimeString().slice(0, 5)}</p>}
    </section>
  );
}

function Pick({ dog, job, setSt, act, busy }) {
  const [sel, setSel] = useState(job.picked || 0);
  const choose = act(async () => { if (!sel) throw new Error("하나 골라 주세요"); const j = await pickCandidate(dog.id, sel); setSt((s) => ({ ...s, job: j })); });
  const again = act(async () => { const j = await regenCandidates(dog.id); setSt((s) => ({ ...s, job: j })); });
  return (
    <section className="px-card">
      <div className="px-feat"><Ico name="tap" size={38} /><div className="px-feat-body"><div className="px-feat-title">가장 {dog.name}다운 아이를 골라 주세요</div><div className="px-feat-desc">고르면 기본 움직임 2가지를 만들어요(15분쯤). 그 뒤엔 바꿀 수 없어요.</div></div></div>
      <div className="char-cands">
        {job.candidates.map((u, i) => (
          <button key={u} type="button" className={`char-cand${sel === i + 1 ? " on" : ""}`} onClick={() => setSel(i + 1)} aria-pressed={sel === i + 1}>
            <img src={u} alt={`후보 ${i + 1}`} /><span>{i + 1}</span>
          </button>
        ))}
      </div>
      <button type="button" className="btn-primary" onClick={choose} disabled={busy || !sel}>이 아이로 만들기</button>
      <button type="button" className="btn-ghost" onClick={again} disabled={busy || !job.regenLeft}>{job.regenLeft ? `다시 뽑기 (${job.regenLeft}번 남음)` : "다시 뽑기를 다 썼어요"}</button>
    </section>
  );
}
