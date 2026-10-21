import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { API_BASE } from "../services/aiClient";
import { readJSON, writeJSON } from "../services/storage";

// 비서 입력창 🎤 — 시리처럼: 누르면 듣기 화면이 뜨고, 말하는 동안 단어가 바로 보이고, 말을 멈추면 저절로 끝난다.
// ① 브라우저 음성 인식(무료·실시간)과 ② 녹음을 함께 시작한다. 브라우저 인식이 글자를 주면 그걸 쓰고 녹음은 버린다.
//    안 되는 기기(아이폰 홈 화면 앱 등)는 녹음을 2초마다 서버(/api/transcribe)로 보내 그때까지 말한 걸 보여 주고, 끝나면 한 번 더 받아쓴다.
// 끝나면 바로 보내지 않고 입력창에 채워서, 확인·수정한 뒤 보내게 한다.
const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const MODE_KEY = "dogcare-voice-mode-v1"; // 브라우저 인식이 이 기기에서 안 됐으면 "record" — 다음부턴 녹음만
const MAX_MS = 60_000;
// 받아쓰기 AI는 무음·잡음에서도 문장을 지어낸다(테스트에서 확인) → 소리 크기를 재서 말소리가 없으면 서버로 보내지 않는다
const VOICE_RMS = 0.02; // 이보다 크면 말소리로 친다(약 -34dB)
const MIN_VOICED_MS = 300;
const END_SILENCE_MS = 1500; // 말한 뒤 이만큼 조용하면 끝(시리처럼)
const NO_SPEECH_MS = 5000; // 처음부터 이만큼 아무 말이 없으면 끝
const PARTIAL_EVERY_MS = 2000; // 녹음 방식: 이 간격으로 중간 받아쓰기

export default function VoiceButton({ getText, onText, onError, disabled, hints = [] }) {
  const [state, setState] = useState("idle"); // idle | listening | transcribing
  const [live, setLive] = useState(""); // 듣는 중 보여 줄 글자
  const orbRef = useRef(null);
  const ref = useRef({});

  useEffect(() => () => cancel(), []);

  const join = (base, add) => (base && add ? `${base.trimEnd()} ${add}` : base || add);

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

  // 0.1초마다 소리 크기: 동그라미 크기, 말소리 시간, 끝 감지(말한 뒤 조용함)
  function startMeter(r) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume?.();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(r.stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      r.voicedMs = 0;
      r.quietMs = 0;
      r.meter = {
        ctx,
        timer: setInterval(() => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += v * v;
          const rms = Math.sqrt(sum / buf.length);
          if (orbRef.current) orbRef.current.style.transform = `scale(${1 + Math.min(0.6, rms * 8)})`;
          if (rms > VOICE_RMS) {
            r.voicedMs += 100;
            r.quietMs = 0;
          } else r.quietMs += 100;
          if (r.voicedMs >= MIN_VOICED_MS && r.quietMs >= END_SILENCE_MS) stop();
          else if (r.voicedMs < MIN_VOICED_MS && Date.now() - r.startedAt > NO_SPEECH_MS) stop();
        }, 100),
      };
    } catch {
      r.meter = null;
    }
  }
  function stopMeter(r) {
    if (!r.meter?.timer) return;
    clearInterval(r.meter.timer);
    r.meter.timer = null;
    r.meter.ctx.close?.().catch?.(() => {});
  }

  async function start() {
    onError("");
    setLive("");
    const r = (ref.current = { base: getText(), heard: false, discard: false, startedAt: Date.now() });
    const useSR = SR && readJSON(MODE_KEY, null) !== "record";
    setState("listening");
    if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        r.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const type = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
        r.type = type;
        r.recorder = new MediaRecorder(r.stream, type ? { mimeType: type } : undefined);
        r.chunks = [];
        r.recorder.ondataavailable = (e) => e.data.size && r.chunks.push(e.data);
        r.recorder.onstop = () => {
          r.stream.getTracks().forEach((t) => t.stop());
          stopMeter(r);
          clearInterval(r.partialTimer);
          if (r.discard) return;
          if (r.meter && r.voicedMs < MIN_VOICED_MS) {
            setState("idle");
            return onError("말소리가 들리지 않았어요. 마이크 가까이에서 다시 말해 주세요.");
          }
          transcribe(new Blob(r.chunks, { type: r.recorder.mimeType || type || "audio/mp4" }));
        };
        r.recorder.start(1000); // 1초마다 조각 → 중간 받아쓰기에 쓴다
        startMeter(r);
      } catch {
        if (!useSR) {
          setState("idle");
          return onError("마이크를 쓸 수 없어요. 설정에서 마이크 권한을 허용해 주세요.");
        }
      }
    }
    if (r.finished) return; // 마이크 허용을 기다리는 동안 취소됨
    if (useSR) {
      try {
        const rec = new SR();
        rec.lang = "ko-KR";
        rec.interimResults = true;
        rec.continuous = false;
        rec.onresult = (e) => {
          r.heard = true;
          clearInterval(r.partialTimer); // 브라우저 인식이 들리기 시작했으면 서버 중간 받아쓰기는 그만(비용 없음)
          r.srText = [...e.results].map((x) => x[0].transcript).join("");
          setLive(r.srText);
        };
        rec.onend = () => {
          // 글자를 받았거나 사용자가 멈췄으면 마무리. 아무것도 못 듣고 혼자 끝났으면(막힌 기기) 녹음으로 계속
          if (r.heard || r.stopping || !r.recorder) finish();
          else {
            r.recognition = null;
            startPartials(r);
          }
        };
        rec.start();
        r.recognition = rec;
        // 2.5초가 지나도 브라우저 인식이 아무 글자도 못 주면, 기다리지 않고 녹음 중간 받아쓰기도 시작(조용히 막힌 기기)
        setTimeout(() => !r.heard && !r.finished && startPartials(r), 2500);
      } catch {
        r.recognition = null;
      }
    }
    if (!r.recognition && !r.recorder) {
      setState("idle");
      return onError("이 기기에서는 음성 입력을 쓸 수 없어요. 키보드의 🎤 받아쓰기를 이용해 주세요.");
    }
    if (!r.recognition) startPartials(r);
    r.timer = setTimeout(stop, MAX_MS);
  }

  // 녹음 방식에서 "말하는 동안 단어가 보이게": 2초마다 지금까지의 녹음을 받아써서 보여 준다(말소리가 늘었을 때만)
  // ponytail: 매번 처음부터 다시 받아써서 비용이 말한 길이의 약 2~3배(10초 말하기 ≈ 1원). 더 줄이려면 Gemini Live 같은 스트리밍 API
  function startPartials(r) {
    if (!r.recorder || r.partialTimer) return;
    let lastVoiced = 0;
    r.partialTimer = setInterval(async () => {
      if (r.finished || r.partialBusy || !r.chunks.length) return;
      if (r.meter && (r.voicedMs < MIN_VOICED_MS || r.voicedMs === lastVoiced)) return;
      lastVoiced = r.voicedMs;
      r.partialBusy = true;
      try {
        const text = await postAudio(new Blob(r.chunks, { type: r.recorder.mimeType || r.type || "audio/mp4" }));
        if (!r.finished && text) setLive(text);
      } catch {
        // 중간 받아쓰기는 실패해도 괜찮다(끝나고 한 번 더 받아쓴다)
      } finally {
        r.partialBusy = false;
      }
    }, PARTIAL_EVERY_MS);
  }

  // 사용자가 동그라미를 누름·말을 멈춤·1분 지남
  function stop() {
    const r = ref.current;
    if (r.stopping || r.finished) return;
    r.stopping = true;
    if (!r.recognition) return finish();
    r.recognition.stop();
    // 멈추라고 해도 끝났다는 신호(onend)를 안 주는 기기가 있다 → 1.5초 뒤엔 그냥 마무리
    setTimeout(finish, 1500);
  }

  function finish() {
    const r = ref.current;
    if (r.finished) return;
    r.finished = true;
    clearTimeout(r.timer);
    r.recognition?.abort?.();
    r.recognition = null;
    if (r.heard) {
      // 브라우저 인식이 글자를 줬다 → 녹음은 버린다(서버 비용 없음)
      r.discard = true;
      if (r.recorder?.state === "recording") r.recorder.stop();
      r.stream?.getTracks().forEach((t) => t.stop());
      stopMeter(r);
      onText(join(r.base, r.srText));
      setState("idle");
    } else if (r.recorder?.state === "recording") {
      r.recorder.stop(); // onstop → 마지막 받아쓰기
    } else {
      setState("idle");
      onError("음성을 알아듣지 못했어요. 다시 눌러 말해 주세요.");
    }
  }

  // 취소(바깥 누르기·✕): 아무것도 넣지 않는다
  function cancel() {
    const r = ref.current;
    r.finished = true;
    r.discard = true;
    clearTimeout(r.timer);
    clearInterval(r.partialTimer);
    r.recognition?.abort?.();
    if (r.recorder?.state === "recording") r.recorder.stop();
    r.stream?.getTracks().forEach((t) => t.stop());
    stopMeter(r);
    setState("idle");
  }

  async function transcribe(blob) {
    if (blob.size < 1000) return setState("idle"); // 너무 짧음(바로 눌렀다 뗌)
    setState("transcribing");
    try {
      const text = await postAudio(blob);
      if (ref.current.discard) return; // 받아쓰는 동안 취소됨
      if (text) {
        onText(join(ref.current.base, text));
        if (SR) writeJSON(MODE_KEY, "record"); // 말이 있었는데 브라우저 인식은 못 들었다 → 이 기기는 다음부터 녹음만
      } else onError("말소리가 들리지 않았어요. 다시 눌러 말해 주세요.");
    } catch (err) {
      onError(err.message || "음성을 글자로 바꾸지 못했어요. 인터넷 연결을 확인해 주세요.");
    } finally {
      setState("idle");
    }
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
