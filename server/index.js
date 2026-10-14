import path from "path";
import os from "os";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import express from "express";
import cors from "cors";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { getBreedAppearance } from "../src/data/breedAppearance.js";

config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });

const PORT = process.env.PORT || 8787;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "[server] ANTHROPIC_API_KEY가 설정되지 않았어요. server/.env에 키를 넣어주세요 (server/.env.example 참고)."
  );
}
if (!process.env.GEMINI_API_KEY) {
  console.warn("[server] GEMINI_API_KEY가 설정되지 않았어요. 영상 분석 기능(활동 상태 확인)은 동작하지 않아요.");
}

const client = new Anthropic();
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

// 영상은 Gemini Files API로 먼저 업로드하고 참조(URI)로만 넘기므로, JSON 인라인 방식의
// 100MB 안팎 제약 없이 훨씬 큰 파일(최대 500MB)을 받을 수 있다.
const upload = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const SAFETY_RULES = `당신은 반려견 보호자를 돕는 케어 어시스턴트입니다. 다음 원칙을 반드시 지키세요.
- 질병을 확정 진단하지 않습니다.
- 임의의 약물이나 복용량을 제시하지 않습니다.
- 근거 없는 치료법을 권하지 않습니다.
- 응급 가능성이 있는 증상(구토, 설사, 무기력, 경련 등 지속/악화)에는 반드시 동물병원 진료를 권합니다.
- 사용자가 제공하지 않은 정보를 사실처럼 가정하지 않습니다.
- 답변은 한국어로, 2~4문장 내로 간결하고 실용적으로 작성합니다.`;

function buildSystemPrompt(dogContext) {
  const { name, breed, gender, weight, ageLabel, allergies, notes } = dogContext || {};
  const genderLabel = gender === "male" ? "수컷" : gender === "female" ? "암컷" : gender;
  const appearance = getBreedAppearance(breed);
  const lines = [
    SAFETY_RULES,
    "",
    "현재 상담 중인 강아지 정보:",
    `이름: ${name || "알 수 없음"}`,
    `견종: ${breed || "알 수 없음"}`,
    `나이: ${ageLabel || "알 수 없음"}`,
    genderLabel ? `성별: ${genderLabel}` : null,
    weight ? `체중: ${weight}kg` : null,
    allergies ? `알레르기: ${allergies}` : null,
    notes ? `특이사항: ${notes}` : null,
    appearance.brachycephalic ? "참고: 단두종(코가 짧은 견종)으로 호흡기 이슈에 취약할 수 있음" : null,
    appearance.sizeCategory === "large" ? "참고: 대형견으로 관절(고관절/팔꿈치) 이슈에 취약할 수 있음" : null,
  ].filter(Boolean);
  return lines.join("\n");
}

const BEHAVIOR_REFERENCE = `아래는 실제 수의행동학·동물복지·수의임상 분야에서 현장에 널리 쓰이는 공개된 평가 도구다. 이 기준으로만 판단하고, 여기 없는 내용을 추측하지 않는다. 아주 사소해 보이는 몸짓도 [1][2]에 해당하면 의미 있는 신호이니 놓치지 말고 짚어준다.

[1] 캐닌 사다리(Ladder of Aggression, Kendal Shepherd) — 스트레스가 커질 때 나타나는 순서:
하품 → 입술 핥기 → 눈 깜빡임/시선 피하기 → 몸 돌리기 → 느려짐/웅크림/얼어붙음 → (여기서 신호가 무시되면) 으르렁거림 → 스냅(무는 시늉) → 물기.
초기 신호(하품~얼어붙음)는 "지금 불편하니 거리를 달라"는 뜻이며, 이 단계에서 자극을 줄여주면 대부분 진정된다.

[2] 진정 신호(Calming Signals, Turid Rugaas 분류 — 개 행동학 훈련 교육 현장에서 널리 쓰이는 공개 체계) — 스트레스까지는 아니어도 "불편함/화해 의도"를 나타내는 미세 신호: 하품, 입술/코 핥기, 눈 피하기, 몸을 옆으로 돌리기, 냄새 맡는 척하기, 천천히 움직이기, 앉거나 엎드리기, 반원을 그리며 다가가기, 얼어붙기, 털기(몸 전체를 흔드는 행동, 긴장이 풀릴 때도 나타남).

[3] 일반적 스트레스 신호(AVSAB 계열 자료 기반): 몸이 경직됨, 자세를 낮춤, 꼬리를 내림, 앞발을 드는 행동, 과도한 헐떡임, 하품, 낑낑거림.

[4] 파행(다리 절뚝임) 등급 (수의 정형외과 0~5단계):
0~1: 정상적으로 걸음 / 2: 걸을 때 약간 절뚝임 / 3: 걸을 때 중등도로 절뚝임 / 4: 걸을 때 심하게 절뚝임 / 5: 일어나길 꺼리고 몇 걸음 이상 걷지 않으려 함.

[5] 열사병(Heat Stroke) 위험 신호 — 응급 (AVMA/수의응급의학 자료 기반):
멎지 않는 심한 헐떡임, 끈적한 침 흘림, 안절부절못함, 방향감각 상실, 잇몸이 선홍색이거나 창백/푸르스름함, 쓰러짐, 구토, 경련.
체온이 40°C(104°F)를 넘으면 응급이며 15~30분 안에 치명적일 수 있다.

[6] 눈/귀/피부 이상 신호 (일반 수의 안과·피부과 공개 자료 기반):
눈 - 충혈, 눈곱/분비물 과다, 뿌옇게 흐림, 한쪽을 계속 찡그리거나 과도하게 깜빡임(결막염·각막 손상·백내장 등의 신호일 수 있음).
귀 - 냄새, 갈색/검은 분비물, 머리를 자주 흔들거나 긁음(외이염 신호일 수 있음).
피부/피모 - 붉은 반점, 탈모, 과도하게 핥거나 긁는 부위, 딱지나 각질(알레르기·핫스팟·기생충 가능성 신호일 수 있음).

[7] 신체충실지수(Body Condition Score, 1~9점, WSAVA 공개 평가 도구) 약식 기준:
갈비뼈가 쉽게 만져지고 위에서 봤을 때 허리라인이 보이면 4~5점(이상적). 갈비뼈가 두꺼운 지방층에 덮여 잘 안 만져지고 허리라인이 없으면 과체중 쪽. 갈비뼈·척추·골반뼈가 두드러지게 보이면 저체중 쪽.`;

const PERSONA_INSTRUCTIONS = `대화창에서는 수의학 정보를 전달하는 어시스턴트가 아니라, "강아지 본인"이 자기 보호자에게 직접 말을 거는 것처럼 답하세요.
- "저는", "제가" 같은 사람 존댓말 대신, 강아지가 보호자에게(마치 가족에게 말하듯) 귀엽고 다정한 반말/구어체를 씁니다. 예: "나 오늘 산책 나가고 싶어!", "그건 나도 잘 모르겠어, 병원 선생님한테 물어봐 줄래?"
- 안전 원칙(진단 금지, 임의 투약 금지, 응급 시 병원 권유 등)은 말투만 바뀔 뿐 절대 느슨해지지 않습니다. 병원에 가야 하는 상황이면 캐릭터를 유지하면서도 명확히 병원 방문을 권해야 합니다. 예: "나 지금 좀 이상한 것 같아... 정확히는 모르겠지만 병원 선생님한테 꼭 데려가 줘!"
- 이모지를 가끔(문장당 0~1개) 자연스럽게 섞어도 좋습니다.

답변 형식(가시성이 중요합니다 — 반드시 지키세요):
- 첫 줄에는 가장 중요한 핵심 한 문장만 짧고 굵게 말합니다 (15~30자 내외, 헤드라인처럼). 예: "나 지금 산책 가야 할 시간이야!"
- 그 다음 반드시 빈 줄(줄바꿈 두 번)을 넣습니다.
- 그 아래에 이유/부가 설명을 2~4문장으로 이어서 씁니다.
- 절대 첫 줄에 부가 설명까지 욱여넣지 마세요. 핵심 문장 → 빈 줄 → 부가 설명, 이 순서를 항상 지킵니다.`;

function buildChatSystemPrompt(dogContext) {
  return [PERSONA_INSTRUCTIONS, "", buildSystemPrompt(dogContext)].join("\n");
}

const FECAL_CHART = `퓨리나 대변 점수표(Purina Fecal Scoring Chart, 1~7점, 임상 통용 평가 도구):
1점: 매우 단단하고 건조한 알갱이 형태, 배출이 어려울 수 있음
2점(이상적): 단단하지만 딱딱하지 않고, 마디가 있으며 집었을 때 거의 흔적이 남지 않음
3~4점: 통나무 모양, 마디가 거의 없고 집었을 때 약간의 흔적이 남음
5~6점: 부드럽고 쌓인 형태, 집었을 때 뚜렷한 흔적이 남음
7점: 물처럼 흐르는 형태, 형태가 없음`;

const RED_FLAGS = `다음이 보이면 반드시 "즉시 동물병원 방문"을 권고하세요: 혈변(선명한 피 또는 검붉은 피), 검은 타르색 변(흑변), 점액이 과도함, 기생충(하얀 알갱이/실 모양)이 육안으로 보임, 아주 심한 악취를 동반한 급격한 변화.`;

function buildPhotoAnalysisSystemPrompt(dogContext) {
  return [
    "당신은 반려견 보호자를 돕는 케어 어시스턴트입니다. 사용자가 강아지의 변(대변) 사진을 보내면 아래 기준으로 참고 소견을 제공합니다.",
    "",
    FECAL_CHART,
    "",
    RED_FLAGS,
    "",
    "반드시 지킬 원칙:",
    "- 질병을 확정 진단하지 않습니다. 이 분석은 참고용 소견이며 수의사의 진단을 대신하지 않습니다.",
    "- 사진에서 실제로 관찰되는 특징만 설명합니다 (색상, 굳기로 보이는 정도, 표면 상태 등).",
    "- 임의의 약물이나 복용량을 제시하지 않습니다.",
    "- 답변은 한국어로, 다음 4개 항목을 순서대로 짧게 작성합니다: '관찰된 특징', '추정 점수(1~7점)', '일반적인 의미', '권장 조치'. 위 레드플래그에 해당하면 '권장 조치'에 즉시 병원 방문을 명시합니다.",
    "- 강아지 사진이 아니거나 상태를 판별하기 어려운 사진이면, 억지로 추정하지 말고 다시 촬영해달라고 안내합니다.",
    "",
    buildSystemPrompt(dogContext),
  ].join("\n");
}

// 메인 채팅에서 "아무 사진"이나 보내는 경우용 — 변 사진으로 단정하지 않고, 사진에 보이는
// 자세/표정/눈·귀·피부/걸음걸이(서 있는 모습으로 유추 가능한 범위)/대변 등 무엇이든 그 자리에서
// 관련된 공개 기준을 찾아 설명한다. 변 사진이면 FECAL_CHART까지 같이 참고한다.
// 분석 결과 중 가장 중요한 한 군데만 **별표 두 개**로 감싸 강조해 달라는 공통 규칙.
// 프런트(Main.jsx)가 이 마커를 읽어서 그 부분만 굵고 진한 색 글자로 바꿔 보여준다.
const EMPHASIS_RULE =
  "- 가장 중요한 한 가지(병원에 가야 하는 경고가 있으면 그 경고, 없으면 가장 핵심적인 소견)는 문장 하나만 **별표 두 개로 감싸서** 강조합니다. 두 군데 이상 강조하지 않습니다.";

function buildGeneralPhotoAnalysisSystemPrompt(dogContext) {
  return [
    PERSONA_INSTRUCTIONS,
    "",
    "단, 지금은 사용자가 보낸 사진을 분석하는 상황입니다. 사진에 실제로 보이는 것(자세, 표정, 눈/귀/피부, 걸음걸이를 유추할 수 있는 자세, 또는 대변 등 무엇이든)을 아래 공개된 평가 기준으로 설명하세요. 사진 내용을 미리 변이나 특정 상태로 단정하지 않고, 보이는 그대로 관찰합니다.",
    "",
    BEHAVIOR_REFERENCE,
    "",
    FECAL_CHART,
    "",
    RED_FLAGS,
    "",
    "반드시 지킬 원칙:",
    "- 질병이나 행동 문제를 확정 진단하지 않습니다. 이 분석은 참고 소견이며 수의사·훈련사의 판단을 대신하지 않습니다.",
    "- 사진에서 실제로 보이는 것만 근거로 설명하고, 보이지 않는 것은 추측하지 않습니다. 아무리 사소해 보이는 신호(하품, 시선 피하기, 살짝 핥는 입술 등)도 보이면 놓치지 말고 짚어줍니다.",
    "- 임의의 약물이나 치료법을 제시하지 않습니다.",
    "- 부가 설명 안에는 '관찰된 모습'(사진에서 보이는 것 전부), '가장 가까운 신호 분류'(위 [1]~[7] 또는 대변 기준 중 해당하는 것, 없으면 '특이 신호 없음'), '가능한 의미/이유', '지금 해볼 수 있는 것'을 자연스러운 문장으로 녹여서 담습니다. 레드플래그·열사병·4~5등급 파행·응급성 눈 이상에 해당하면 즉시 병원 방문을 명확히 말합니다.",
    EMPHASIS_RULE,
    "- 강아지 사진이 아니거나 무엇을 보여주려는 건지 판별하기 어려우면, 억지로 추정하지 말고 다시 찍어달라고 안내합니다.",
    "",
    buildSystemPrompt(dogContext),
  ].join("\n");
}

function buildBehaviorAnalysisSystemPrompt(dogContext) {
  return [
    PERSONA_INSTRUCTIONS,
    "",
    "단, 지금은 사용자가 보낸 영상을 분석하는 상황입니다. 아래 공개된 평가 기준으로만 참고 소견을 말하세요.",
    "",
    BEHAVIOR_REFERENCE,
    "",
    "반드시 지킬 원칙:",
    "- 질병이나 특정 행동 문제를 확정 진단하지 않습니다. 이 분석은 참고 소견이며 수의사·훈련사의 판단을 대신하지 않습니다.",
    "- 영상에서 실제로 관찰되는 자세·표정·걸음걸이·소리(짖음/낑낑거림 등 들리는 경우) 등만 근거로 설명하고, 보이지 않는 것은 추측하지 않습니다. 아무리 사소해 보이는 몸짓(하품, 핥기, 시선 피하기 등)도 놓치지 말고 짚어줍니다.",
    "- 임의의 약물이나 치료법을 제시하지 않습니다.",
    "- 부가 설명 안에는 '관찰된 모습'(영상에서 보이는 자세/행동/걸음걸이/표정 하나하나), '가장 가까운 신호 분류'(위 [1]~[7] 중 해당하는 것 전부, 없으면 '특이 신호 없음'), '가능한 이유 몇 가지', '지금 해볼 수 있는 대안 2~3가지'를 자연스러운 문장으로 녹여서 담습니다. [5] 열사병 신호나 [4]의 4~5등급 파행, [6]의 응급성 눈 이상이 보이면 즉시 병원 방문을 맨 먼저 명확히 말합니다.",
    EMPHASIS_RULE,
    "- 강아지가 잘 안 보이거나 상태를 판별하기 어려우면, 억지로 추정하지 말고 더 잘 보이는 영상으로 다시 찍어달라고 안내합니다.",
    "",
    buildSystemPrompt(dogContext),
  ].join("\n");
}

app.post("/api/ask", async (req, res) => {
  const { dogContext, question, history } = req.body || {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "question is required" });
  }

  try {
    const messages = [
      ...(Array.isArray(history) ? history : []).map((m) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      })),
      { role: "user", content: question },
    ];

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "medium" },
      system: buildChatSystemPrompt(dogContext),
      messages,
    });

    if (response.stop_reason === "refusal") {
      return res.json({
        answer: "이 질문에는 답변드리기 어려워요. 다르게 표현해서 다시 물어봐 주세요.",
      });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    res.json({ answer: textBlock?.text ?? "답변을 생성하지 못했어요." });
  } catch (err) {
    console.error("[server] Claude API error:", err.message);
    res.status(502).json({ error: "AI 서버 호출에 실패했어요." });
  }
});

app.post("/api/analyze-photo", async (req, res) => {
  const { dogContext, imageBase64, mediaType } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ error: "imageBase64 is required" });
  }
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const type = allowedTypes.includes(mediaType) ? mediaType : "image/jpeg";

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "medium" },
      system: buildPhotoAnalysisSystemPrompt(dogContext),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: type, data: imageBase64 } },
            { type: "text", text: "이 사진을 보고 위 기준에 따라 참고 소견을 알려주세요." },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return res.json({ answer: "이 사진은 분석하기 어려워요. 변이 잘 보이는 사진으로 다시 찍어주세요." });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    res.json({ answer: textBlock?.text ?? "분석 결과를 생성하지 못했어요." });
  } catch (err) {
    console.error("[server] Claude vision API error:", err.message);
    res.status(502).json({ error: "AI 서버 호출에 실패했어요." });
  }
});

// 메인 채팅(아바타)에서 보내는 사진용 — 변 사진 전용 프롬프트와 분리해, 무엇이든 사진에 보이는 대로 분석한다.
app.post("/api/analyze-general-photo", async (req, res) => {
  const { dogContext, imageBase64, mediaType } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ error: "imageBase64 is required" });
  }
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const type = allowedTypes.includes(mediaType) ? mediaType : "image/jpeg";

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "medium" },
      system: buildGeneralPhotoAnalysisSystemPrompt(dogContext),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: type, data: imageBase64 } },
            { type: "text", text: "이 사진을 보고 위 기준에 따라 참고 소견을 알려주세요." },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return res.json({ answer: "이 사진은 분석하기 어려워요. 더 잘 보이는 사진으로 다시 찍어주세요." });
    }

    const textBlock = response.content.find((b) => b.type === "text");
    res.json({ answer: textBlock?.text ?? "분석 결과를 생성하지 못했어요." });
  } catch (err) {
    console.error("[server] Claude vision API error:", err.message);
    res.status(502).json({ error: "AI 서버 호출에 실패했어요." });
  }
});

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini가 일시적으로 과부하(503 UNAVAILABLE)일 때 몇 초 간격으로 재시도한다.
async function generateContentWithRetry(params, retries = 2, delayMs = 3000) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await gemini.models.generateContent(params);
    } catch (err) {
      const isUnavailable = err.status === 503 || /UNAVAILABLE|overloaded|high demand/i.test(err.message || "");
      if (!isUnavailable || attempt >= retries) throw err;
      console.warn(`[server] Gemini 503, retrying in ${delayMs}ms (attempt ${attempt + 1}/${retries})`);
      await sleep(delayMs);
    }
  }
}

app.post("/api/analyze-behavior", upload.single("video"), async (req, res) => {
  if (!gemini) {
    return res.status(503).json({ error: "GEMINI_API_KEY가 설정되지 않아 영상 분석을 쓸 수 없어요." });
  }
  if (!req.file) {
    return res.status(400).json({ error: "video file is required" });
  }
  let dogContext = {};
  try {
    dogContext = req.body.dogContext ? JSON.parse(req.body.dogContext) : {};
  } catch {
    // dogContext 파싱 실패 시 컨텍스트 없이 진행
  }
  const type = ALLOWED_VIDEO_TYPES.includes(req.file.mimetype) ? req.file.mimetype : "video/mp4";

  try {
    let uploaded = await gemini.files.upload({ file: req.file.path, config: { mimeType: type } });
    while (uploaded.state === "PROCESSING") {
      await sleep(1500);
      uploaded = await gemini.files.get({ name: uploaded.name });
    }
    if (uploaded.state === "FAILED") {
      return res.json({ answer: "영상 업로드/처리에 실패했어요. 다른 영상으로 다시 시도해 주세요." });
    }

    const response = await generateContentWithRetry({
      model: "gemini-3.8-flash",
      contents: [
        { fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType } },
        { text: "이 영상을 보고 위 기준에 따라 참고 소견을 알려주세요." },
      ],
      config: {
        systemInstruction: buildBehaviorAnalysisSystemPrompt(dogContext),
        maxOutputTokens: 1024,
      },
    });

    const text = response.text;
    if (!text) {
      return res.json({ answer: "이 영상은 분석하기 어려워요. 강아지가 잘 보이는 영상으로 다시 찍어주세요." });
    }
    res.json({ answer: text });
  } catch (err) {
    console.error("[server] Gemini video API error:", err.message);
    const isUnavailable = err.status === 503 || /UNAVAILABLE|overloaded|high demand/i.test(err.message || "");
    const isQuotaExceeded = err.status === 429 || /RESOURCE_EXHAUSTED|quota exceeded/i.test(err.message || "");
    let error = "AI 서버 호출에 실패했어요.";
    if (isQuotaExceeded) {
      error = "오늘 영상 분석 사용량을 다 썼어요(무료 요금제 하루 한도). 내일 다시 시도하거나 Gemini API 요금제를 올려주세요.";
    } else if (isUnavailable) {
      error = "Gemini 서버가 일시적으로 혼잡해요. 잠시 후 다시 시도해 주세요.";
    }
    res.status(502).json({ error });
  } finally {
    fs.unlink(req.file.path).catch(() => {});
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "영상이 너무 커요 (최대 500MB)." });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`[server] AI proxy listening on http://localhost:${PORT}`);
});
