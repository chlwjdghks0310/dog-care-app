import { getWeightRecords } from "./weightLog";
import { buildAppSnapshot } from "./appSnapshot";
import { getCategories } from "./expenses";
import { calculateAge, formatAge } from "../utils/age";
import { sanitizeStructured, structureAnswer } from "../utils/aiAnswer";
import { ensureAIConsent } from "./aiConsent";
import { trackHeaders } from "./analytics";
import { toDateKey } from "../utils/date";

// env?.: 노드로 테스트를 돌릴 땐 import.meta.env가 없다
export const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:8787";

// 요약을 만들다 오류가 나도 채팅은 되게
function safeSnapshot(dog) {
  try {
    return buildAppSnapshot(dog);
  } catch {
    return "";
  }
}

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
    appData: safeSnapshot(dog),
  };
}

// 서버가 준 블록 구조를 검사하고, 없거나 망가졌으면 글에서 다시 만든다(화면이 깨지지 않게).
function withStructure(data) {
  const answer = typeof data?.answer === "string" && data.answer.trim() ? data.answer : "답변을 생성하지 못했어요.";
  return { answer, structured: sanitizeStructured(data?.structured) || structureAnswer(answer) };
}

// 말로 기록하기: 보호자가 한 말을 서버(가장 가벼운 AI)가 앱 기록 동작(actions)으로 바꿔 돌려준다. 저장은 앱이 확인 후(appActions).
// question=true면 기록이 아니라 질문 — 화면이 우리 자료(정보 카드·가이드북)로 안내한다. 하루 한도를 넘으면 status 429.
export async function recordFromText(dog, text, { signal } = {}) {
  await ensureAIConsent(); // 처음 한 번: 외부 AI로 보내도 되는지 묻는다(거절하면 아무것도 안 보냄)
  const res = await fetch(`${API_BASE}/api/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...trackHeaders() },
    body: JSON.stringify({ dogContext: toDogContext(dog), text, categories: getCategories().map((c) => c.name) }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "기록을 정리하지 못했어요. 다시 시도해 주세요."), { status: res.status });
  return { actions: Array.isArray(data.actions) ? data.actions : [], question: data.question === true, reply: typeof data.reply === "string" ? data.reply : "" };
}

// 사진 분석도 실패하면 대체 결과 없이 에러를 그대로 알린다(건강 관련 허위 안심/허위 경고 위험).
export async function analyzePhoto(dog, file, question) {
  await ensureAIConsent();
  const imageBase64 = await fileToBase64(file);
  const res = await fetch(`${API_BASE}/api/analyze-photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...trackHeaders() },
    body: JSON.stringify({ dogContext: toDogContext(dog), imageBase64, mediaType: file.type, question }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `status ${res.status}`);
  }
  const data = await res.json();
  return data.answer;
}

// 통합 기록 "사진으로 채우기" — 보이는 것만 정해진 칸으로 받는다. 실패하면 그대로 오류(대체 결과 없음).
export async function quickStoolCheck(dog, imageBase64, signal) {
  await ensureAIConsent();
  const res = await fetch(`${API_BASE}/api/quick-stool`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...trackHeaders() },
    body: JSON.stringify({ dogContext: toDogContext(dog), imageBase64, mediaType: "image/jpeg" }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "사진을 분석하지 못했어요. 다시 시도해 주세요.");
  return data.result;
}

// 사료 이름 → 열량·성분(서버가 웹 검색). 반환: { info, sources }
export async function findFoodInfo(name, signal) {
  await ensureAIConsent();
  const res = await fetch(`${API_BASE}/api/food-info`, { method: "POST", headers: { "Content-Type": "application/json", ...trackHeaders() }, body: JSON.stringify({ name }), signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "사료 정보를 찾지 못했어요. 다시 시도해 주세요.");
  return data;
}

// 사료 봉투 사진 → 적힌 열량·성분(검색 없이 읽기만). 반환: label
export async function readFoodLabel(imageBase64, signal) {
  await ensureAIConsent();
  const res = await fetch(`${API_BASE}/api/food-label`, { method: "POST", headers: { "Content-Type": "application/json", ...trackHeaders() }, body: JSON.stringify({ imageBase64, mediaType: "image/jpeg" }), signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "사진을 읽지 못했어요. 다시 시도해 주세요.");
  return data.label;
}

// 영상 분석은 Gemini(구글)로 처리한다 — 영상을 그대로 넘기면 Gemini가 1초에 약 1장씩 장면을 나눠 보고 소리도 듣는다.
// 큰 영상도 받을 수 있도록 base64 JSON이 아니라 multipart 파일 업로드로 전송한다.
// 사진 분석과 마찬가지로 mock 대체 없이 실패를 그대로 알린다.
// onProgress(0~1): 올리는 진행률(fetch는 업로드 진행률을 못 줘서 XHR을 쓴다). 다 올라가면 1 → 그 뒤는 분석 대기.
export async function analyzeBehavior(dog, file, signal, mode, { question, onProgress } = {}) {
  await ensureAIConsent();
  const formData = new FormData();
  if (mode) formData.append("mode", mode);
  if (question) formData.append("question", question);
  formData.append("video", file);
  formData.append("dogContext", JSON.stringify(toDogContext(dog)));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/analyze-behavior`);
    Object.entries(trackHeaders()).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.upload.onload = () => onProgress?.(1);
    xhr.onload = () => {
      const data = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300) resolve(withStructure(data));
      else reject(new Error(data.error || (xhr.status === 413 ? "영상이 너무 커요." : `status ${xhr.status}`)));
    };
    // fetch처럼 연결 실패는 TypeError, 취소는 AbortError로 맞춰 화면이 같은 문구를 쓰게 한다
    xhr.onerror = () => reject(new TypeError("network"));
    xhr.onabort = () => reject(new DOMException("aborted", "AbortError"));
    if (signal) {
      if (signal.aborted) return reject(new DOMException("aborted", "AbortError"));
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(formData);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 진료 정리: 병원 서류 사진(base64 최대 3장)·들은 설명 → 진료 기록 칸. 반환: doc(서버 vet_doc)
export async function readVetDoc({ images = [], text = "" }, signal) {
  await ensureAIConsent();
  const res = await fetch(`${API_BASE}/api/vet-doc`, { method: "POST", headers: { "Content-Type": "application/json", ...trackHeaders() }, body: JSON.stringify({ images, text, today: toDateKey(new Date()) }), signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "정리하지 못했어요. 다시 시도해 주세요.");
  return data.doc;
}
