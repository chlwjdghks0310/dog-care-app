import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { API_BASE } from "../services/aiClient";
import { ensureAIConsent } from "../services/aiConsent";
import { readJSON, writeJSON } from "../services/storage";

// 비서 입력창 🎤 — 시리처럼: 누르면 듣기 화면이 뜨고, 말하는 동안 단어가 바로바로 보이고, 말을 멈추면 저절로 끝난다.
// ① 브라우저 음성 인식(아이폰 사파리는 시리와 같은 애플 엔진, 무료)을 먼저 쓰고,
// ② 막힌 기기(아이폰 홈 화면 앱 등)는 마이크 소리를 0.1초 조각으로 서버(/api/voice-live → Gemini Transcribe Live)에 흘려보내 실시간으로 받아쓴다.
//    ①을 시도하는 동안의 소리도 모아 두어, ②로 넘어가도 처음 말한 단어가 사라지지 않는다.
// ③ 실시간 연결이 안 되면 모아 둔 소리를 한 번에 받아쓴다(/api/transcribe).
// 끝나면 onText로 받아쓴 글(입력창에 적혀 있던 글 + 말한 내용)을 넘긴다 — 비서는 바로 질문으로 보낸다(시리처럼).
const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const MODE_KEY = "dogcare-voice-mode-v1"; // 브라우저 인식이 이 기기에서 안 됐으면 값이 생긴다 — 다음부턴 바로 ②
const RATE = 16000;
const MAX_MS = 60_000;
// 받아쓰기 AI는 무음에서도 문장을 지어낼 수 있다(일괄 받아쓰기에서 확인) → 소리 크기로 말소리를 확인한 뒤에만 보낸다
const VOICE_RMS = 0.02; // 이보다 크면 말소리로 친다(약 -34dB)
const MIN_VOICED_MS = 300;
const END_SILENCE_MS = 2500; // 말한 뒤 이만큼 조용하면 끝 — 1.5초는 말하다 잠깐 생각하는 사이에 끊겼다
const NO_SPEECH_MS = 8000; // 처음부터 이만큼 아무 말이 없으면 끝
const SR_GRACE_MS = 2000; // 브라우저 인식이 이 안에 글자를 못 주면 ②로
const WORKLET = `registerProcessor("pcm-tap", class extends AudioWorkletProcessor {
  process(inputs) { const ch = inputs[0] && inputs[0][0]; if (ch) this.port.postMessage(ch.slice(0)); return true; }
});`;

const wsBase = () => API_BASE.replace(/^http/, "ws");
const isIOSApp = () => /iPhone|iPad|iPod/.test(navigator.userAgent) && (navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches);

// 마이크 한 번 허용하면 계속 쓰게: 아이폰은 마이크를 끌 때마다(트랙 종료) 다음에 또 허용을 묻는다.
// 그래서 받은 마이크를 잠시 살려 두고 다시 쓴다 — 안 쓰는 동안은 소리를 끄고(enabled=false), 3분 동안 안 쓰거나 앱을 내리면 놓아준다.
// ponytail: 아이폰이 앱을 완전히 껐다 켜면 한 번 더 묻는 건 웹앱에서 막을 수 없다(기기 설정의 몫)
let micStream = null;
let micTimer = null;
async function getMic() {
  clearTimeout(micTimer);
  if (micStream?.getAudioTracks().some((t) => t.readyState === "live")) {
    micStream.getAudioTracks().forEach((t) => (t.enabled = true));
    return micStream;
  }
  micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  return micStream;
}
function releaseMicLater() {
  micStream?.getAudioTracks().forEach((t) => (t.enabled = false));
  clearTimeout(micTimer);
  micTimer = setTimeout(releaseMic, 3 * 60_000);
}
function releaseMic() {
  clearTimeout(micTimer);
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
}
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && releaseMic());

// 아무 샘플레이트 → 16kHz 16비트(선형 보간)
function toPcm16(float32, fromRate) {
  const ratio = fromRate / RATE;
  const out = new Int16Array(Math.floor(float32.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const x = i * ratio;
    const a = float32[Math.floor(x)] || 0;
    const b = float32[Math.min(float32.length - 1, Math.floor(x) + 1)] || 0;
    const v = Math.max(-1, Math.min(1, a + (b - a) * (x - Math.floor(x))));
    out[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  return out;
}

// 모아 둔 PCM → WAV(일괄 받아쓰기용)
function toWav(chunks) {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const buf = new DataView(new ArrayBuffer(44 + len * 2));
  const w = (o, str) => [...str].forEach((ch, i) => buf.setUint8(o + i, ch.charCodeAt(0)));
  w(0, "RIFF"); buf.setUint32(4, 36 + len * 2, true); w(8, "WAVEfmt "); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true);
  buf.setUint32(24, RATE, true); buf.setUint32(28, RATE * 2, true); buf.setUint16(32, 2, true); buf.setUint16(34, 16, true); w(36, "data"); buf.setUint32(40, len * 2, true);
  let o = 44;
  for (const c of chunks) for (const v of c) (buf.setInt16(o, v, true), (o += 2));
  return new Blob([buf], { type: "audio/wav" });
}

export default function VoiceButton({ getText, onText, onError, disabled, hints = [] }) {
  const [state, setState] = useState("idle"); // idle | listening | transcribing
  const [live, setLive] = useState(""); // 듣는 중 보여 줄 글자
  const orbRef = useRef(null);
  const ref = useRef({});

  useEffect(() => () => cancel(), []);

  const join = (base, add) => (base && add ? `${base.trimEnd()} ${add}` : base || add);
  const liveText = (r) => [...r.finals, r.interim].filter(Boolean).join(" ");

  // 마이크 소리 조각마다: 동그라미 크기·말소리 시간·끝 감지, 16kHz로 바꿔 모으고(실시간 연결 중이면 바로 보냄)
  function onAudio(r, float32) {
    if (r.finished) return;
    let sum = 0;
    for (const v of float32) sum += v * v;
    const rms = Math.sqrt(sum / float32.length);
    const ms = (float32.length / r.ctx.sampleRate) * 1000;
    if (orbRef.current) orbRef.current.style.transform = `scale(${1 + Math.min(0.6, rms * 8)})`;
    if (rms > VOICE_RMS) (r.voicedMs += ms), (r.quietMs = 0);
    else r.quietMs += ms;
    const pcm = toPcm16(float32, r.ctx.sampleRate);
    r.pcm.push(pcm);
    if (r.ws?.readyState === 1 && r.streaming) r.ws.send(pcm.buffer);
    if (r.wantLive && !r.ws && r.voicedMs >= 100) openLive(r); // 말이 시작돼야 연결(조용한 소리에 요금이 나가지 않게)
    if (r.voicedMs >= MIN_VOICED_MS && r.quietMs >= END_SILENCE_MS) stop();
    else if (r.voicedMs < MIN_VOICED_MS && Date.now() - r.startedAt > NO_SPEECH_MS) stop();
  }

  async function startCapture(r) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    r.ctx = new Ctx(); // 누른 순간 만들어야 아이폰에서 소리가 막히지 않는다
    r.ctx.resume?.();
    r.stream = await getMic();
    if (r.finished) return;
    const src = r.ctx.createMediaStreamSource(r.stream);
    if (r.ctx.audioWorklet) {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await r.ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(r.ctx, "pcm-tap");
      node.port.onmessage = (e) => onAudio(r, e.data);
      src.connect(node);
      r.node = node;
    } else {
      // 오래된 기기: ScriptProcessor(곧 없어질 방식이지만 아직 동작)
      const node = r.ctx.createScriptProcessor(2048, 1, 1);
      node.onaudioprocess = (e) => onAudio(r, e.inputBuffer.getChannelData(0).slice(0));
      src.connect(node);
      node.connect(r.ctx.destination);
      r.node = node;
    }
  }

  function stopCapture(r) {
    r.node?.disconnect?.();
    if (r.stream) releaseMicLater(); // 끄지 않고 잠시 살려 둔다(다음에 다시 묻지 않게)
    r.ctx?.close?.().catch?.(() => {});
    r.node = r.stream = null;
  }

  // ② 실시간 받아쓰기 연결: 열리면 지금까지 모은 소리를 먼저 보내고, 이후 조각은 바로바로
  function openLive(r) {
    if (r.ws || r.finished) return;
    const ws = new WebSocket(`${wsBase()}/api/voice-live?hints=${encodeURIComponent(hints.join(","))}`);
    ws.binaryType = "arraybuffer";
    r.ws = ws;
    ws.onopen = () => {
      for (const c of r.pcm) ws.send(c.buffer);
      r.streaming = true;
      if (r.stopping) ws.send(JSON.stringify({ end: true }));
    };
    ws.onmessage = (e) => {
      let m = {};
      try {
        m = JSON.parse(e.data);
      } catch {}
      if (m.interim != null) r.interim = m.interim;
      if (m.final) (r.finals.push(m.final), (r.interim = ""));
      if (m.error) r.liveFailed = true;
      if (!r.heard && (m.interim || m.final)) setLive(liveText(r));
      if (m.final && r.stopping) finish(); // 멈춘 뒤 마지막 확정 결과가 오면 끝
    };
    ws.onerror = () => (r.liveFailed = true);
    ws.onclose = () => {
      if (!r.finals.length && !r.interim) r.liveFailed = true;
      if (r.stopping) finish();
    };
  }

  async function start() {
    onError("");
    try {
      await ensureAIConsent(); // 받아쓰기는 소리를 Google로 보낼 수 있어서 처음 한 번 묻는다
    } catch (err) {
      return onError(err.message);
    }
    setLive("");
    const r = (ref.current = { base: getText(), heard: false, finals: [], interim: "", pcm: [], voicedMs: 0, quietMs: 0, startedAt: Date.now() });
    setState("listening");
    try {
      await startCapture(r);
    } catch {
      stopCapture(r);
      if (!SR) {
        setState("idle");
        return onError("마이크를 쓸 수 없어요. 설정에서 마이크 권한을 허용해 주세요.");
      }
    }
    if (r.finished) return; // 마이크 허용을 기다리는 동안 취소됨
    // 아이폰 홈 화면 앱은 브라우저 인식이 막혀 있고 별도 허용 창까지 떠서 건너뛴다 → 마이크 허용 한 번만
    const useSR = SR && !readJSON(MODE_KEY, null) && !isIOSApp();
    if (useSR) {
      try {
        const rec = new SR();
        rec.lang = "ko-KR";
        rec.interimResults = true;
        rec.continuous = Boolean(r.ctx); // 잠깐 멈춰도 브라우저가 혼자 끝내지 않게 — 끝은 위의 소리 크기 감지(END_SILENCE_MS)가 정한다
        rec.onresult = (e) => {
          r.heard = true;
          r.srText = [...e.results].map((x) => x[0].transcript).join(" ").replace(/\s+/g, " ").trim(); // 계속 듣기면 문장 조각이 여러 개
          setLive(r.srText);
        };
        rec.onend = () => {
          r.recognition = null;
          if (r.heard || r.stopping || !r.ctx) finish();
          else r.wantLive = true; // 아무것도 못 듣고 혼자 끝남(막힌 기기) → ②
        };
        rec.start();
        r.recognition = rec;
        setTimeout(() => !r.heard && !r.finished && (r.wantLive = true), SR_GRACE_MS);
      } catch {
        r.recognition = null;
      }
    }
    if (!r.recognition) r.wantLive = true;
    if (!r.recognition && !r.ctx) {
      setState("idle");
      return onError("이 기기에서는 음성 입력을 쓸 수 없어요. 키보드의 🎤 받아쓰기를 이용해 주세요.");
    }
    r.timer = setTimeout(stop, MAX_MS);
  }

  // 말을 멈춤·동그라미 누름·1분 지남
  function stop() {
    const r = ref.current;
    if (r.stopping || r.finished) return;
    r.stopping = true;
    stopCapture(r);
    if (r.recognition && (r.heard || !r.ws)) {
      r.recognition.stop();
      setTimeout(finish, 1500); // 멈추라고 해도 onend를 안 주는 기기가 있다
      return;
    }
    if (r.ws?.readyState === 1) {
      r.ws.send(JSON.stringify({ end: true }));
      if (r.finals.length && !r.interim) return finish(); // 이미 다 확정됐다 → 바로 끝(시리처럼 빠르게)
      setTimeout(finish, 2500); // 마지막 확정 결과를 기다린다
    } else if (r.ws?.readyState === 0) setTimeout(finish, 3000);
    else finish();
  }

  async function finish() {
    const r = ref.current;
    if (r.finished) return;
    r.finished = true;
    clearTimeout(r.timer);
    r.recognition?.abort?.();
    stopCapture(r);
    const ws = r.ws;
    r.ws = null;
    if (ws && ws.readyState <= 1) ws.close();
    let text = r.heard ? r.srText : liveText(r);
    if (!text && r.voicedMs >= MIN_VOICED_MS && r.pcm.length) {
      // ③ 실시간이 안 됐다 → 모아 둔 소리를 한 번에 받아쓴다
      setState("transcribing");
      try {
        text = await postAudio(toWav(r.pcm));
      } catch (err) {
        if (!r.discard) onError(err.message || "음성을 글자로 바꾸지 못했어요. 인터넷 연결을 확인해 주세요.");
      }
    }
    if (r.discard) return setState("idle");
    if (text) {
      onText(join(r.base, text));
      if (!r.heard && SR) writeJSON(MODE_KEY, "live"); // 브라우저 인식이 못 들은 기기 → 다음부턴 바로 ②
    } else if (r.voicedMs < MIN_VOICED_MS) onError("말소리가 들리지 않았어요. 마이크 가까이에서 다시 말해 주세요.");
    else if (!r.discard) onError("음성을 알아듣지 못했어요. 다시 눌러 말해 주세요.");
    setState("idle");
  }

  async function postAudio(blob) {
    const audio = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(",")[1]);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const res = await fetch(`${API_BASE}/api/transcribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio, mimeType: blob.type, hints }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "음성을 글자로 바꾸지 못했어요.");
    return data.text || "";
  }

  // 취소(바깥 누르기·✕): 아무것도 넣지 않는다
  function cancel() {
    const r = ref.current;
    r.discard = true;
    r.finished = true;
    clearTimeout(r.timer);
    r.recognition?.abort?.();
    stopCapture(r);
    if (r.ws && r.ws.readyState <= 1) r.ws.close();
    setState("idle");
  }

  const open = state !== "idle";
  return (
    <>
      <button type="button" onClick={() => state === "idle" && start()} disabled={disabled || open} className="voice-btn" aria-label="말로 입력하기">
        🎤
      </button>
      {open &&
        createPortal(
          <div className="voice-sheet-back" onClick={(e) => e.target === e.currentTarget && cancel()}>
            <div className="voice-sheet" role="dialog" aria-label="음성 입력">
              <button type="button" className="voice-x" aria-label="취소" onClick={cancel}>
                ✕
              </button>
              <div className={`voice-live${live ? "" : " empty"}`} aria-live="polite">
                {live || (state === "transcribing" ? "글자로 바꾸는 중…" : "듣고 있어요…")}
              </div>
              <button type="button" className={`voice-orb${state === "transcribing" ? " busy" : ""}`} onClick={stop} aria-label="말하기 끝내기" disabled={state === "transcribing"}>
                <span ref={orbRef} className="voice-orb-glow" aria-hidden="true" />
                <span className="voice-orb-core" aria-hidden="true">🎤</span>
              </button>
              <div className="faint" style={{ fontSize: 13 }}>{state === "transcribing" ? "잠시만요" : "말을 멈추면 저절로 끝나요 · 동그라미를 누르면 바로 끝"}</div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
