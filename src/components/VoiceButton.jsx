import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../services/aiClient";
import { readJSON, writeJSON } from "../services/storage";

// 비서 입력창 🎤: 누르면 ① 브라우저 음성 인식(무료·말하는 동안 글자가 바로 보임)과 ② 녹음을 함께 시작한다.
// 브라우저 인식이 글자를 주면 그걸 쓰고 녹음은 버린다. 글자를 못 주면(아이폰 홈 화면 앱처럼 막혔거나 조용히 실패)
// 녹음을 서버(/api/transcribe)로 보내 받아쓴다 — 말한 내용이 사라지지 않게.
// 어느 쪽이든 바로 보내지 않고 입력창에 채워서, 확인·수정한 뒤 보내게 한다.
const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
const MODE_KEY = "dogcare-voice-mode-v1"; // 브라우저 인식이 이 기기에서 안 됐으면 "record" — 다음부턴 녹음만
const MAX_MS = 60_000;
// 받아쓰기 AI는 무음·잡음에서도 문장을 지어낸다(테스트에서 확인) → 녹음 중 소리 크기를 재서, 말소리가 이만큼도 없으면 서버로 보내지 않는다
const VOICE_RMS = 0.02; // 이보다 크면 말소리로 친다(약 -34dB)
const MIN_VOICED_MS = 300;

export default function VoiceButton({ getText, onText, onError, disabled, hints = [] }) {
  const [state, setState] = useState("idle"); // idle | listening | transcribing
  const ref = useRef({});

  useEffect(() => () => cleanup(), []);

  function cleanup() {
    const r = ref.current;
    stopMeter(r);
    r.recognition?.abort?.();
    r.discard = true;
    if (r.recorder?.state === "recording") r.recorder.stop();
    r.stream?.getTracks().forEach((t) => t.stop());
    clearTimeout(r.timer);
  }

  // 0.1초마다 소리 크기(RMS)를 재서 말소리가 난 시간을 더한다
  function startMeter(r) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume?.();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(r.stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      r.voicedMs = 0;
      r.meter = { ctx, timer: setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        if (Math.sqrt(sum / buf.length) > VOICE_RMS) r.voicedMs += 100;
      }, 100) };
    } catch {
      r.meter = null;
    }
  }
  function stopMeter(r) {
    if (!r.meter) return;
    clearInterval(r.meter.timer);
    r.meter.ctx.close?.().catch?.(() => {});
    r.meter.timer = null;
  }

  const join = (base, add) => (base && add ? `${base.trimEnd()} ${add}` : base || add);

  async function start() {
    onError("");
    const r = (ref.current = { base: getText(), heard: false, discard: false });
    const useSR = SR && readJSON(MODE_KEY, null) !== "record";
    // 녹음(대비용). 마이크를 못 쓰면 브라우저 인식만으로 시도
    if (navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined") {
      try {
        r.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const type = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
        r.recorder = new MediaRecorder(r.stream, type ? { mimeType: type } : undefined);
        r.chunks = [];
        r.recorder.ondataavailable = (e) => e.data.size && r.chunks.push(e.data);
        r.recorder.onstop = () => {
          r.stream.getTracks().forEach((t) => t.stop());
          stopMeter(r);
          if (r.discard) return;
          // 소리 크기를 잴 수 있었는데 말소리가 거의 없었다 → 보내지 않는다(잴 수 없는 기기면 그냥 보낸다)
          if (r.meter && r.voicedMs < MIN_VOICED_MS) {
            setState("idle");
            return onError("말소리가 들리지 않았어요. 마이크 가까이에서 다시 말해 주세요.");
          }
          transcribe(new Blob(r.chunks, { type: r.recorder.mimeType || type || "audio/mp4" }));
        };
        r.recorder.start();
        startMeter(r);
      } catch {
        if (!useSR) return onError("마이크를 쓸 수 없어요. 설정에서 마이크 권한을 허용해 주세요.");
      }
    }
    if (useSR) {
      try {
        const rec = new SR();
        rec.lang = "ko-KR";
        rec.interimResults = true;
        rec.continuous = false;
        rec.onresult = (e) => {
          r.heard = true;
          onText(join(r.base, [...e.results].map((x) => x[0].transcript).join("")));
        };
        rec.onend = () => {
          // 글자를 받았거나 사용자가 멈췄으면 마무리. 아무것도 못 듣고 혼자 끝났으면(막힌 기기) 녹음은 사용자가 멈출 때까지 계속
          if (r.heard || r.stopping || !r.recorder) finish();
          else r.recognition = null;
        };
        rec.start();
        r.recognition = rec;
      } catch {
        r.recognition = null;
      }
    }
    if (!r.recognition && !r.recorder) return onError("이 기기에서는 음성 입력을 쓸 수 없어요. 키보드의 🎤 받아쓰기를 이용해 주세요.");
    r.timer = setTimeout(stop, MAX_MS);
    setState("listening");
  }

  // 사용자가 다시 누름·1분 지남 → 브라우저 인식이 있으면 그쪽을 멈추고(onend → finish), 없으면 바로 마무리
  function stop() {
    const r = ref.current;
    r.stopping = true;
    if (!r.recognition) return finish();
    r.recognition.stop();
    // 브라우저 인식이 멈추라고 해도 끝났다는 신호(onend)를 안 주는 기기가 있다 → 1.5초 뒤엔 그냥 마무리(버튼이 '듣는 중'에 갇히지 않게)
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
      setState("idle");
    } else if (r.recorder?.state === "recording") {
      r.recorder.stop(); // onstop → 서버 받아쓰기
    } else {
      setState("idle");
      onError("음성을 알아듣지 못했어요. 다시 눌러 말해 주세요.");
    }
  }

  async function transcribe(blob) {
    if (blob.size < 1000) return setState("idle"); // 너무 짧음(바로 눌렀다 뗌)
    setState("transcribing");
    try {
      const audio = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(",")[1]);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
      const res = await fetch(`${API_BASE}/api/transcribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio, mimeType: blob.type, hints }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      if (data.text) {
        onText(join(getText(), data.text));
        if (SR) writeJSON(MODE_KEY, "record"); // 말이 있었는데 브라우저 인식은 못 들었다 → 이 기기는 다음부터 녹음만
      } else onError("말소리가 들리지 않았어요. 다시 눌러 말해 주세요.");
    } catch (err) {
      onError(err.message || "음성을 글자로 바꾸지 못했어요. 인터넷 연결을 확인해 주세요.");
    } finally {
      setState("idle");
    }
  }

  const active = state === "listening";
  return (
    <button
      type="button"
      onClick={() => (active ? stop() : state === "idle" && start())}
      disabled={disabled || state === "transcribing"}
      className={`voice-btn${active ? " on" : ""}`}
      aria-label={active ? "말하기 끝내기" : state === "transcribing" ? "글자로 바꾸는 중" : "말로 입력하기"}
      aria-pressed={active}
    >
      {state === "transcribing" ? "…" : active ? "■" : "🎤"}
    </button>
  );
}
