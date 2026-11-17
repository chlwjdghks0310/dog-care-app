import { useEffect, useRef, useState } from "react";
import Ico from "../components/Ico";
import { getPermission, isNotificationSupported, requestPermission } from "../services/notifications";
import { fetchStatus, setWaitlist, redeem, shrinkPhoto, startJob, refreshJob, pickCandidate, regenCandidates, retryRender, getCharacter, clearCharacterOutputs, isWorking, STYLE_LABEL } from "../services/character";

// 우리 아이 캐릭터(11/17): 설정 → 우리 강아지 → "우리 아이 캐릭터". 문은 잠겨 있고(곧 출시) 초대 코드를 쓴 강아지만 만든다.
// 흐름: 잠김(알림 대기·코드) → 그림체·사진·동의 → 후보 4장 중 고르기 → 영상 만드는 중 → 완성(홈 강아지가 바뀜)
const SAMPLE = { "3d": "/character/sample-3d.jpg", hand: "/character/sample-hand.jpg" };

export default function Character({ dog }) {
  const [st, setSt] = useState(null); // 서버 status
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const load = async () => {
    try { setSt(await fetchStatus(dog.id)); setErr(""); }
    catch (e) { setErr(e.message); setSt((s) => s || { offline: true, job: getCharacter(dog.id)?.job || null }); }
  };
  useEffect(() => { load(); }, [dog.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // 만드는 중이면 30초마다, 앱으로 돌아올 때도 새로 묻는다
  const job = st?.job;
  useEffect(() => {
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

  return (
    <div className="char" style={{ display: "grid", gap: 14, padding: "4px 0 24px" }}>
      {err && <p className="error-text" role="alert">{err}</p>}
      {!unlocked && <Locked dog={dog} st={st} setSt={setSt} act={act} busy={busy} />}
      {unlocked && (!job || ["done", "failed"].includes(job.status)) && <Form dog={dog} job={job} st={st} setSt={setSt} act={act} busy={busy} />}
      {unlocked && isWorking(job) && <Working job={job} onRefresh={act(() => refreshJob(dog.id).then((j) => setSt((s) => ({ ...s, job: j }))))} busy={busy} />}
      {unlocked && job?.status === "pick" && <Pick dog={dog} job={job} setSt={setSt} act={act} busy={busy} />}
    </div>
  );
}

function Intro() {
  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <figure className="char-sample"><img src={SAMPLE["3d"]} alt="말랑 3D 예시" /><figcaption>말랑 3D</figcaption></figure>
        <figure className="char-sample"><img src={SAMPLE.hand} alt="그림일기 예시" /><figcaption>그림일기</figcaption></figure>
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
        사진 2~4장이면 우리 아이가 앱 속 캐릭터가 돼요. 홈 화면에서 꼬리를 흔들며 기다리고, 물어볼 땐 엎드려서 고민해요. 그림체는 둘 중 하나를 골라요.
      </p>
    </div>
  );
}

function Locked({ dog, st, setSt, act, busy }) {
  const [code, setCode] = useState("");
  const canPush = isNotificationSupported();
  const toggleWait = act(async (on) => {
    if (on && getPermission() !== "granted") { const p = await requestPermission(); if (p !== "granted") throw new Error("알림을 켜야 출시 소식을 보내 드릴 수 있어요"); }
    const r = await setWaitlist(dog.id, on);
    setSt((s) => ({ ...s, waiting: r.waiting }));
  });
  const useCode = act(async () => {
    if (!code.trim()) throw new Error("코드를 넣어 주세요");
    await redeem(dog.id, code.trim());
    setSt(await fetchStatus(dog.id));
  });
  return (
    <>
      <div className="chip" style={{ justifySelf: "start" }}>곧 출시</div>
      <Intro />
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <label className="sg-row" style={{ border: 0, padding: 0, justifyContent: "space-between" }}>
          <span><b>출시되면 알려 주세요</b><br /><span className="muted" style={{ fontSize: 13 }}>{canPush ? "열리는 날 알림 한 번만 보내요" : "알림을 쓸 수 있는 홈 화면 앱에서 켤 수 있어요"}</span></span>
          <input type="checkbox" role="switch" className="switch" checked={Boolean(st.waiting)} disabled={!canPush || busy || st.offline} onChange={(e) => toggleWait(e.target.checked)} aria-label="출시되면 알려 주세요" />
        </label>
      </div>
      <div className="card" style={{ display: "grid", gap: 8 }}>
        <b>초대 코드가 있어요</b>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="char-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="예: MC-XXXX-00" autoCapitalize="characters" autoCorrect="off" spellCheck={false} style={{ flex: 1 }} />
          <button type="button" className="btn-primary" style={{ flex: "0 0 auto", width: "auto", padding: "0 18px" }} onClick={useCode} disabled={busy || st.offline}>쓰기</button>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>베타 테스터에게 드린 코드예요. 강아지 한 마리에 한 번 써요.</span>
      </div>
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
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <img src={outputs.poster} alt="" style={{ width: 84, height: 84, objectFit: "contain" }} />
            <div style={{ flex: 1 }}>
              <b>{dog.name} 캐릭터가 홈 화면에 있어요</b>
              <div className="muted" style={{ fontSize: 13 }}>{STYLE_LABEL[outputs.style]} · {outputs.preset ? "선물 코드로 받음" : String(outputs.madeAt).slice(0, 10)}</div>
            </div>
          </div>
          <button type="button" className="btn-ghost" onClick={() => (clearCharacterOutputs(dog.id), setSt((s) => ({ ...s })))}>기본 강아지로 돌리기</button>
        </div>
      )}
      {job?.status === "failed" && (
        <div className="card" style={{ display: "grid", gap: 8 }}>
          <p className="error-text" style={{ margin: 0 }}>지난번 만들기가 실패했어요. 사진은 지웠어요.</p>
          {job.picked ? (
            <>
              <span className="muted" style={{ fontSize: 13 }}>고른 설정화는 남아 있어요. 움직임 만들기만 다시 할 수 있어요.</span>
              <button type="button" className="btn-primary" onClick={act(async () => { const j = await retryRender(dog.id); setSt((s) => ({ ...s, job: j })); })} disabled={busy}>움직임만 다시 만들기</button>
            </>
          ) : <span className="muted" style={{ fontSize: 13 }}>아래에서 다시 시도해 주세요.</span>}
        </div>
      )}
      {!outputs && <Intro />}
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <b>1. 그림체</b>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {["hand", "3d"].map((k) => (
            <button key={k} type="button" className={`char-style${style === k ? " on" : ""}`} onClick={() => setStyle(k)} aria-pressed={style === k}>
              <img src={SAMPLE[k]} alt="" /><span>{STYLE_LABEL[k]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <b>2. 사진 2~4장</b>
        <span className="muted" style={{ fontSize: 13 }}>정면 얼굴 1장 + 앉은 전신 1장이면 가장 잘 닮아요. 밝은 곳, 혼자 나온 사진으로요. 위치 정보 등은 보내기 전에 지워요.</span>
        <div className="char-photos">
          {files.map((f, i) => (
            <div key={f.url} className="char-photo"><img src={f.url} alt={`사진 ${i + 1}`} /><button type="button" aria-label="빼기" onClick={() => remove(i)}><Ico name="x" size={14} /></button></div>
          ))}
          {files.length < 4 && (
            <button type="button" className="char-photo add" onClick={() => inputRef.current?.click()} disabled={busy}><Ico name="imagePlus" size={26} /><span>{files.length ? "더 넣기" : "사진 고르기"}</span></button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
      </div>
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <b>3. 확인</b>
        <label className="char-check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /><span>저는 만 18세 이상이에요(캐릭터 기능은 성인만 쓸 수 있어요)</span></label>
        <label className="char-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>사진이 캐릭터를 만들기 위해 미국의 AI 서비스(Google·Runway)로 전송되는 데 동의해요. 만든 뒤 사진은 바로 지워요. 시작한 뒤에는 취소할 수 없어요.</span></label>
      </div>
      <button type="button" className="btn-primary" onClick={go} disabled={busy || st.offline || !st.ready}>{busy ? "보내는 중…" : outputs ? "새로 만들기" : "만들기 시작"}</button>
      {!st.ready && !st.offline && <p className="muted" style={{ fontSize: 13, margin: 0 }}>지금은 서버 준비 중이라 만들 수 없어요.</p>}
      <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>후보 4장이 나오면 알림으로 알려 드려요(10분쯤). 하나 고르면 움직이는 모습 2가지(기다리기·고민하기)를 만들어요(15분쯤).</p>
    </>
  );
}

function Working({ job, onRefresh, busy }) {
  return (
    <div className="card" style={{ display: "grid", gap: 10, textAlign: "center", padding: 22 }}>
      <span className="avatar-loading" role="img" aria-label="만드는 중" style={{ justifySelf: "center" }}><Ico name="paw" size={36} /></span>
      <b>{job.status === "render" ? "움직임을 만드는 중" : job.status === "sheet" ? "설정화를 그리는 중" : "순서를 기다리는 중"}</b>
      <span className="muted" style={{ fontSize: 13.5 }}>{job.step}</span>
      <span className="muted" style={{ fontSize: 12.5 }}>앱을 닫아도 계속 만들어요. 끝나면 알림으로 알려 드려요.</span>
      <button type="button" className="btn-ghost" onClick={onRefresh} disabled={busy}>새로고침</button>
    </div>
  );
}

function Pick({ dog, job, setSt, act, busy }) {
  const [sel, setSel] = useState(job.picked || 0);
  const choose = act(async () => { if (!sel) throw new Error("하나 골라 주세요"); const j = await pickCandidate(dog.id, sel); setSt((s) => ({ ...s, job: j })); });
  const again = act(async () => { const j = await regenCandidates(dog.id); setSt((s) => ({ ...s, job: j })); });
  return (
    <>
      <div className="card" style={{ display: "grid", gap: 10 }}>
        <b>가장 {dog.name}다운 아이를 골라 주세요</b>
        <div className="char-cands">
          {job.candidates.map((u, i) => (
            <button key={u} type="button" className={`char-cand${sel === i + 1 ? " on" : ""}`} onClick={() => setSel(i + 1)} aria-pressed={sel === i + 1}>
              <img src={u} alt={`후보 ${i + 1}`} /><span>{i + 1}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn-primary" onClick={choose} disabled={busy || !sel}>이 아이로 만들기</button>
        <button type="button" className="btn-ghost" onClick={again} disabled={busy || !job.regenLeft}>{job.regenLeft ? `다시 뽑기 (${job.regenLeft}번 남음)` : "다시 뽑기를 다 썼어요"}</button>
        <span className="muted" style={{ fontSize: 12.5 }}>고르면 움직이는 모습 2가지를 만들어요(15분쯤). 그 뒤엔 바꿀 수 없어요.</span>
      </div>
    </>
  );
}
