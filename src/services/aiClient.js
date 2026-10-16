import { getWeightRecords } from "./weightLog";
import { calculateAge, formatAge } from "../utils/age";
import { answerQuestion } from "./mockAI";

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

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
    // 프로필에 적은 내용 전부 + 최근 체중 변화 — AI가 이걸 보고 우리 강아지에 맞춰 답한다
    birthDate: dog.birthDate,
    neutered: dog.neutered,
    food: dog.food,
    adoptionDate: dog.adoptionDate,
    weightHistory: getWeightRecords(dog.id)
      .slice(-6)
      .map((r) => `${r.measuredAt.slice(0, 10)} ${r.weightKg}kg`),
  };
}

// 실제 Claude API 프록시(server/)에 먼저 물어보고, 서버가 꺼져있거나 오류가 나면
// 규칙 기반 mock 응답으로 조용히 대체한다 (UI가 끊기지 않도록).
export async function askAI(dog, question, history, mode) {
  try {
    const res = await fetch(`${API_BASE}/api/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dogContext: toDogContext(dog), question, history, mode }),
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

// 메인 채팅(아바타)에서 보내는 사진용 — 변 사진으로 단정하지 않고 사진에 보이는 대로 분석한다.
// (HealthCheck 화면의 "변 상태 확인"은 여전히 위 analyzePhoto를 그대로 쓴다.)
export async function analyzeGeneralPhoto(dog, file, signal, mode) {
  const imageBase64 = await fileToBase64(file);
  const res = await fetch(`${API_BASE}/api/analyze-general-photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dogContext: toDogContext(dog), imageBase64, mediaType: file.type, mode }),
    signal,
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
export async function analyzeBehavior(dog, file, signal, mode) {
  const formData = new FormData();
  if (mode) formData.append("mode", mode);
  formData.append("video", file);
  formData.append("dogContext", JSON.stringify(toDogContext(dog)));

  const res = await fetch(`${API_BASE}/api/analyze-behavior`, {
    method: "POST",
    body: formData,
    signal,
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
