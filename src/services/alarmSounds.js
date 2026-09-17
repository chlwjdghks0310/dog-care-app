// 실제 녹음 파일이 아니라 Web Audio API로 그 자리에서 합성하는 알람음이다.
// "강아지 짖는 소리"는 진짜 녹음이 아니라 비슷한 느낌을 내는 합성음(근사치)이다.
// 브라우저는 사용자 제스처 없이 오디오 재생을 막기 때문에, 버튼 클릭 등 사용자 동작 안에서
// resumeAudioContext()를 먼저 호출해 둬야 나중에 타이머로 울릴 때도 소리가 난다.
let ctx = null;

function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function resumeAudioContext() {
  const c = getContext();
  if (c.state === "suspended") c.resume();
}

function noiseBuffer(c, durationSec) {
  const buffer = c.createBuffer(1, c.sampleRate * durationSec, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function playTone(c, { freq, start, duration, type = "sine", peak = 0.25, endFreq }) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.02, duration / 4));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playBark(c, start, { baseFreq = 550, endFreq = 140, duration = 0.16, peak = 0.35 } = {}) {
  playTone(c, { freq: baseFreq, endFreq, start, duration, type: "sawtooth", peak });
  const noise = c.createBufferSource();
  noise.buffer = noiseBuffer(c, duration);
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(peak * 0.3, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.6);
  noise.connect(noiseGain).connect(c.destination);
  noise.start(start);
}

const SOUNDS = {
  "beep-classic": {
    label: "클래식 비프",
    group: "기본",
    play: () => {
      const c = getContext();
      const now = c.currentTime;
      for (let i = 0; i < 4; i++) playTone(c, { freq: 880, start: now + i * 0.3, duration: 0.15, type: "square", peak: 0.2 });
    },
  },
  "beep-urgent": {
    label: "긴급 알람",
    group: "기본",
    play: () => {
      const c = getContext();
      const now = c.currentTime;
      for (let i = 0; i < 6; i++) {
        playTone(c, { freq: i % 2 === 0 ? 1000 : 700, start: now + i * 0.15, duration: 0.12, type: "square", peak: 0.25 });
      }
    },
  },
  chime: {
    label: "차임벨",
    group: "기본",
    play: () => {
      const c = getContext();
      const now = c.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        playTone(c, { freq, start: now + i * 0.18, duration: 0.5, type: "sine", peak: 0.2 });
      });
    },
  },
  "bark-single": {
    label: "짧은 멍",
    group: "강아지 소리",
    play: () => {
      const c = getContext();
      playBark(c, c.currentTime);
    },
  },
  "bark-triple": {
    label: "멍멍멍",
    group: "강아지 소리",
    play: () => {
      const c = getContext();
      const now = c.currentTime;
      [0, 0.22, 0.44].forEach((offset) => playBark(c, now + offset));
    },
  },
  "bark-low": {
    label: "낮은 멍",
    group: "강아지 소리",
    play: () => {
      const c = getContext();
      playBark(c, c.currentTime, { baseFreq: 320, endFreq: 80, duration: 0.28, peak: 0.4 });
    },
  },
};

export const ALARM_SOUND_LIST = Object.entries(SOUNDS).map(([id, s]) => ({ id, label: s.label, group: s.group }));

export function playAlarmSound(id) {
  resumeAudioContext();
  const sound = SOUNDS[id] || SOUNDS["beep-classic"];
  sound.play();
}
