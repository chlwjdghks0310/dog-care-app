import { calculateAge, formatAge } from "../utils/age";
import { answerQuestion } from "./mockAI";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

function toDogContext(dog) {
  const age = calculateAge(dog.birthDate);
  return {
    name: dog.name,
    breed: dog.breed,
    gender: dog.gender,
    weight: dog.weight,
    allergies: dog.allergies,
    notes: dog.notes,
    ageLabel: formatAge(age),
  };
}

// 실제 Claude API 프록시(server/)에 먼저 물어보고, 서버가 꺼져있거나 오류가 나면
// 규칙 기반 mock 응답으로 조용히 대체한다 (UI가 끊기지 않도록).
export async function askAI(dog, question, history) {
  try {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dogContext: toDogContext(dog), question, history }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    return { answer: data.answer, source: "ai" };
  } catch {
    return { answer: answerQuestion(dog, question), source: "mock" };
  }
}

// 사진 분석은 신뢰할 만한 mock 대체 결과가 있을 수 없으므로(건강 관련 허위 안심/허위 경고 위험),
// 서버 연결 실패 시 mock으로 조용히 대체하지 않고 에러를 그대로 알린다.
export async function analyzePhoto(dog, file) {
  const imageBase64 = await fileToBase64(file);
  const res = await fetch(`${API_BASE}/api/analyze-photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dogContext: toDogContext(dog), imageBase64, mediaType: file.type }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `status ${res.status}`);
  }
  const data = await res.json();
  return data.answer;
}

// 영상 분석은 Gemini(구글)로 처리한다 — 영상을 통째로 이해할 수 있어 프레임 추출이 필요 없다.
// 큰 영상도 받을 수 있도록 base64 JSON이 아니라 multipart 파일 업로드로 전송한다.
// 사진 분석과 마찬가지로 mock 대체 없이 실패를 그대로 알린다.
export async function analyzeBehavior(dog, file) {
  const formData = new FormData();
  formData.append("video", file);
  formData.append("dogContext", JSON.stringify(toDogContext(dog)));

  const res = await fetch(`${API_BASE}/api/analyze-behavior`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `status ${res.status}`);
  }
  const data = await res.json();
  return data.answer;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
