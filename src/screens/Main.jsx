import { useEffect, useRef, useState } from "react";
import { askAI, analyzeBehavior } from "../services/aiClient";
import { imageForAI } from "../utils/image";
import { josa, splitHeadline } from "../utils/text";
import { getChatMemory, rememberChat, noteChatResult } from "../services/chatMemory";
import { applyAppActions, applyConfirmedAction } from "../services/appActions";
import { renderEmphasized } from "../components/RichText";
import DogAvatarVideo from "../components/DogAvatarVideo";
import ThinkingBubble from "../components/ThinkingBubble";
import SpeechBubble from "../components/SpeechBubble";
import AiAnswer from "../components/AiAnswer";
import Ico from "../components/Ico";
import VoiceButton from "../components/VoiceButton";

const CHAT_MODES = [
  // hello: 첫 화면 말풍선의 자기소개(고른 강아지마다 다름). {name}은 강아지 이름 + 받침이면 "이"(여름 → 여름이, 여르 → 여르)
  { key: "bordercollie", ico: "book", name: "보더콜리", hello: "반가워! 꼼꼼 박사 보더콜리야 🐕\n자료를 찾아보고 차근차근 자세히 알려 줄게.\n대신 조금 오래 걸릴 수 있어!", pending: "자료 찾아보는 중이야… 조금만 기다려 줘!" },
  { key: "pomeranian", ico: "zap", name: "포메라니안", hello: "안녕! 난 포메라니안이야 🐶\n{name} 얘기라면 뭐든 물어봐!\n핵심만 콕콕 빠르게 알려 줄게!", pending: "음… 생각 중이야…" },
  { key: "retriever", ico: "chatHeart", name: "리트리버", hello: "안녕안녕! 수다쟁이 리트리버야 🦮\n오늘 있었던 일, 나한테 다 얘기해 줘!\n꼬리 흔들면서 들을게 🐾", pending: "꼬리 흔들면서 생각 중…" },
];
// 버튼 순서: 보더콜리 · 포메라니안(가운데) · 리트리버. 앱을 새로 켜면 항상 포메라니안으로 시작. 쓰는 동안(탭 이동 등)에만 고른 모드를 기억한다.
const CHAT_MODE_KEY = "dogcare-chat-mode-v1";
const loadChatMode = () => {
  try { return sessionStorage.getItem(CHAT_MODE_KEY); } catch { return null; }
};
const saveChatMode = (key) => {
  try { sessionStorage.setItem(CHAT_MODE_KEY, key); } catch { /* 저장 못 해도 동작엔 문제 없음 */ }
};
// 대화 스타일을 바꾸면 그 강아지가 먼저 인사하며 자기 특징을 알려 준다(고정 문구 — AI에 보내지 않음).
// 첫 줄은 크게, 나머지는 작게 보인다.
const CHAT_MODE_INTROS = {
  pomeranian:
    "안녕! 난 포메라니안이야 🐶\n궁금한 건 **핵심만 빠르고 짧게** 알려 줄게!\n바쁠 때나 간단히 확인하고 싶을 때 나를 불러 줘. 더 자세히 알고 싶으면 보더콜리한테 물어봐도 좋아!",
  bordercollie:
    "안녕! 난 꼼꼼 박사 보더콜리야 🐕\n여러 자료를 **직접 찾아보고 자세하게** 설명해 줄게!\n확인하는 방법, 생각할 수 있는 원인, 집에서 해 볼 것, 병원에 가야 하는 기준까지 차근차근 알려 줘. 대신 자료를 찾느라 **조금 오래 걸릴 수 있어.**",
  retriever:
    "안녕! 난 수다쟁이 리트리버야 🦮\n**네 이야기를 들어 주고 같이 노는 걸** 제일 좋아해!\n심심할 때, 오늘 있었던 일을 말하고 싶을 때 언제든 말 걸어 줘. 꼬리 흔들면서 기다릴게!",
};
const findChatMode = (key) => CHAT_MODES.find((m) => m.key === key) || CHAT_MODES.find((m) => m.key === "pomeranian");
// 첫 화면 추천 질문 — 눌러서 바로 물어보기(기록 근거로 답하는 것들)
const SUGGESTIONS = ["오늘 뭐 챙겨야 해?", "이번 주 기록 정리해 줘", "밥은 얼마나 줘야 해?", "다음 일정 뭐야?"];

// 첨부 제한 — 사진은 앱에서 줄여 보내고, 영상은 서버를 거쳐 Gemini로 간다(서버 한도 500MB보다 작게 잡음)
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 30 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 180;

// 영상 길이(초). 못 읽으면 null — 그때는 크기 제한만 본다.
function videoDuration(url) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : null);
    v.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 4000);
    v.src = url;
  });
}

const IDLE_HEIGHT = 290;
const CORNER_SIZE = 76;
// 채팅 중 왼쪽 위 강아지: 노치/상태바(safe-area-inset-top) 바로 아래까지 올려 답변 칸을 넓게
const CORNER_TOP = "calc(8px + env(safe-area-inset-top, 0px))";

// AI 답변 속 **강조** 표시를 굵고 진한 색 글자로 바꿔서, 중요한 부분만 폰트가 달라 보이게 한다.

export default function Main({ dog, resetSignal, onReadingChange }) {
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("idle"); // 'idle' | 'chat'
  const [chatMode, setChatMode] = useState(() => findChatMode(loadChatMode()).key);
  const [input, setInput] = useState("");
  const inputRef = useRef("");
  inputRef.current = input; // 🎤가 말하기 시작할 때의 입력 내용에 이어 붙이도록
  const [pending, setPending] = useState(false);
  const [pendingKind, setPendingKind] = useState(null); // 'text' | 'media' | null — 취소 버튼은 media일 때만 보여준다
  const [attachments, setAttachments] = useState([]); // 보내기 전 첨부 [{ id, kind: 'image'|'video', file, url }]
  const [attachError, setAttachError] = useState("");
  const [progress, setProgress] = useState(null); // 영상: { phase: 'upload', pct } → { phase: 'analyze' }
  // 이번 대화에서 마지막으로 보낸 사진(줄인 것) — 후속 질문 때 다시 붙여 AI가 사진을 다시 볼 수 있게(원본 재업로드 없음)
  const contextImagesRef = useRef([]);
  // 보내는 중인지 바로 알기 위한 표시 — state(pending)는 다음 그리기 때 바뀌어서, 빠르게 여러 번 누르면 요청이 여러 개 나갔다
  const busyRef = useRef(false);
  const [avatarState, setAvatarState] = useState("idle");
  const talkTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);
  // 답변 읽기: 대화를 아래로 스크롤하면 말투 버튼·안내문·하단 탭을 내려 숨기고, 위로 스크롤하면 다시 보인다
  const [reading, setReading] = useState(false);

  useEffect(() => () => clearTimeout(talkTimerRef.current), []);

  // 메인 탭을 이미 보고 있는 상태에서 메인을 다시 누르면 채팅 중이어도 메인 화면으로 돌아간다.
  useEffect(() => {
    if (resetSignal) goHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(
    () => () => {
      messagesRef.current.forEach((m) => m.media?.forEach((x) => URL.revokeObjectURL(x.url)));
    },
    []
  );


  // 메인 화면으로 돌아가면 대화를 비우고 처음부터. 진행 중이던 답변은 도착해도 버린다(chatSessionRef).
  const chatSessionRef = useRef(0);
  function goHome() {
    chatSessionRef.current += 1;
    abortRef.current?.abort();
    messagesRef.current.forEach((m) => m.media?.forEach((x) => URL.revokeObjectURL(x.url)));
    setMessages([]);
    attachments.forEach((a) => URL.revokeObjectURL(a.url));
    setAttachments([]);
    setAttachError("");
    contextImagesRef.current = [];
    setProgress(null);
    busyRef.current = false;
    setPending(false);
    setPendingKind(null);
    setAvatarState("idle");
    setMode("idle");
    setReading(false);
  }

  // 새 메시지·"생각 중": 질문과 생각 중은 맨 아래로, AI 답변은 답변 첫 줄이 맨 위에 오게(긴 답을 처음부터 읽도록)
  const chatListRef = useRef(null);
  const scrollState = useRef({ top: 0, quietUntil: 0 });
  useEffect(() => {
    const list = chatListRef.current;
    if (!list) return;
    scrollState.current.quietUntil = Date.now() + 800; // 앱이 움직인 스크롤은 숨기기·보이기 판단에 쓰지 않는다
    const last = list.lastElementChild;
    const answer = !pending && messages[messages.length - 1]?.role === "ai" && last;
    const top = answer ? list.scrollTop + last.getBoundingClientRect().top - list.getBoundingClientRect().top - 8 : list.scrollHeight;
    list.scrollTo({ top, behavior: "smooth" });
  }, [messages, pending, mode]);

  // 보호자가 직접 스크롤: 아래로 읽어 내려가면 숨기고, 위로 올리면(또는 맨 위면) 다시 보인다
  function handleChatScroll(e) {
    const el = e.currentTarget;
    const st = scrollState.current;
    const top = Math.min(Math.max(el.scrollTop, 0), el.scrollHeight - el.clientHeight); // 끝에서 튕기는 움직임은 무시
    const d = top - st.top;
    st.top = top;
    if (Date.now() < st.quietUntil) return;
    const next = top <= 2 ? false : d > 6 ? true : d < -6 ? false : reading;
    if (next !== reading) {
      setReading(next);
      st.quietUntil = Date.now() + 350; // 접히는 동안 칸 높이가 바뀌며 생기는 스크롤로 다시 뒤집히지 않게
    }
  }
  useEffect(() => onReadingChange?.(mode === "chat" && reading), [mode, reading, onReadingChange]);

  // 채팅의 고치기·지우기 확인 버튼 — 누른 결과를 그 자리에 남긴다
  function resolveConfirm(msgIndex, j, ok) {
    const action = messages[msgIndex]?.records?.confirm?.[j];
    if (!action || action.status) return;
    const status = ok ? applyConfirmedAction(dog, action) || "이미 없거나 고칠 수 없는 기록이에요." : "취소했어요.";
    const verb = action.type === "delete_record" ? "지우기" : "고치기";
    noteChatResult(dog.id, ok ? `보호자가 [${verb}]를 눌렀음 → ${status} (${action.summary})` : `보호자가 ${verb}를 취소함 — 다시 제안하지 말 것 (${action.summary})`);
    setMessages((list) =>
      list.map((m, i) =>
        i === msgIndex ? { ...m, records: { ...m.records, confirm: m.records.confirm.map((c, k) => (k === j ? { ...c, status } : c)) } } : m
      )
    );
  }

  function speak(answerLength) {
    setAvatarState("talking");
    const talkDuration = Math.min(4000, Math.max(1200, answerLength * 45));
    clearTimeout(talkTimerRef.current);
    talkTimerRef.current = setTimeout(() => setAvatarState("idle"), talkDuration);
  }

  // 보내기: 글만, 사진(여러 장)+글, 영상+글 모두 여기로. 후속 질문 버튼도 같은 길로 실제 질문을 보낸다.
  // 🎤 음성 인식이 끝나면 바로 질문으로 보낸다(시리처럼). 듣는 동안 화면이 바뀌어도 최신 send를 쓰도록 ref로
  const sendRef = useRef(null);
  sendRef.current = (text) => send(text);
  function send(text, files = attachments) {
    const question = text.trim();
    if ((!question && !files.length) || busyRef.current) return; // 보내는 중엔 무시 → 버튼 여러 번 눌러도 요청 하나
    setMode("chat");
    setMessages((m) => [...m, { role: "user", text: question, media: files.map((a) => ({ kind: a.kind, url: a.url })) }]);
    setInput("");
    setAttachments([]);
    setAttachError("");
    run({ question, files });
  }

  // 실패한 요청은 같은 내용으로 다시 보낸다(첨부 파일은 메모리에 그대로 있음)
  function retry(index) {
    const req = messages[index]?.retry;
    if (!req || busyRef.current) return;
    setMessages((m) => m.filter((_, i) => i !== index));
    run(req);
  }

  async function run(req) {
    const { question, files } = req;
    const video = files.find((a) => a.kind === "video");
    const images = files.filter((a) => a.kind === "image");
    // 화면의 대화는 메인으로 가면 지워지지만, AI는 강아지별로 저장해 둔 최근 대화를 계속 기억한다
    const history = getChatMemory(dog.id);
    busyRef.current = true;
    setPending(true);
    setPendingKind(files.length ? "media" : "text");
    setAvatarState("thinking");
    const controller = new AbortController();
    abortRef.current = controller;
    const session = chatSessionRef.current;

    try {
      let result;
      let memoryQuestion = question;
      if (video) {
        setProgress({ phase: "upload", pct: 0 });
        result = await analyzeBehavior(dog, video.file, controller.signal, chatMode, {
          question,
          onProgress: (pct) => session === chatSessionRef.current && setProgress(pct >= 1 ? { phase: "analyze" } : { phase: "upload", pct }),
        });
        contextImagesRef.current = []; // 영상 내용은 답변 글(본 것 정리)로 이어서 기억한다
        memoryQuestion = `(영상을 보내서 분석을 부탁함)${question ? ` ${question}` : ""}`;
      } else if (images.length) {
        const prepared = await Promise.all(images.map((a) => imageForAI(a.file))).catch(() => {
          throw new Error("사진을 읽지 못했어요. 다른 사진으로 다시 시도해 주세요.");
        });
        result = await askAI(dog, question, history, chatMode, { images: prepared, signal: controller.signal });
        contextImagesRef.current = prepared;
        memoryQuestion = `(사진 ${prepared.length}장을 보내서 분석을 부탁함)${question ? ` ${question}` : ""}`;
      } else {
        const ctx = contextImagesRef.current;
        result = await askAI(dog, question, history, chatMode, ctx.length ? { images: ctx, imagesAreContext: true, signal: controller.signal } : { signal: controller.signal });
      }
      const { answer, structured, actions } = result;
      // AI가 "기록해 줘"를 알아들었으면 앱(가계부·일정표·체중·체크리스트·알람)에 실제로 저장
      const records = actions?.length ? applyAppActions(dog, actions) : null;
      rememberChat(dog.id, memoryQuestion, answer);
      const notes = [
        ...(records?.done || []).map((r) => `기록 완료: ${r}`),
        ...(records?.confirm || []).map((c) => `${c.type === "delete_record" ? "지우기" : "고치기"} 버튼 띄움(보호자 확인 기다림): ${c.summary}`),
        ...(records?.failed ? ["일부 기록 실패(형식이 맞지 않음)"] : []),
      ];
      if (notes.length) noteChatResult(dog.id, notes.join(" / "));
      if (session !== chatSessionRef.current) return; // 그사이 메인 화면으로 돌아감
      setMessages((m) => [...m, { role: "ai", text: answer, structured, chatMode, records, fromVideo: Boolean(video) }]);
      speak(answer.length);
    } catch (err) {
      // 서버까지는 연결됐는데 분석 자체가 실패한 경우(Gemini 과부하/쿼터 초과 등)엔 서버가 알려준 이유를 그대로 보여준다.
      // fetch 자체가 실패한 경우(TypeError)만 진짜 "서버에 연결 못 했어"로 보여준다.
      if (session !== chatSessionRef.current) return;
      let text;
      if (err.name === "AbortError") text = "보내기를 취소했어!";
      else if (err instanceof TypeError) text = "AI 서버에 연결하지 못했어. 인터넷 연결을 확인하고 다시 시도해 줘!";
      else text = err.message || "답을 만들지 못했어. 다시 시도해 줘!";
      setMessages((m) => [...m, { role: "ai", error: true, text, retry: req }]);
      setAvatarState("idle");
    } finally {
      if (session === chatSessionRef.current) {
        busyRef.current = false;
        abortRef.current = null;
        setPending(false);
        setPendingKind(null);
        setProgress(null);
      }
    }
  }

  // 사진·영상 고르기 → 보내기 전 미리보기에 담는다. 영상은 한 번에 1개(사진과 섞지 않음), 사진은 최대 4장.
  async function handlePick(e) {
    const picked = [...(e.target.files || [])];
    e.target.value = "";
    if (!picked.length || pending) return;
    setAttachError("");
    const pickedVideo = picked.find((f) => f.type.startsWith("video/"));
    if (pickedVideo) {
      if (pickedVideo.size > MAX_VIDEO_BYTES) return setAttachError("영상이 너무 커요(200MB까지). 짧게 잘라서 보내 주세요.");
      const url = URL.createObjectURL(pickedVideo);
      const seconds = await videoDuration(url);
      if (seconds && seconds > MAX_VIDEO_SECONDS) {
        URL.revokeObjectURL(url);
        return setAttachError("영상은 3분까지 보낼 수 있어요. 보여 주고 싶은 부분만 잘라서 보내 주세요.");
      }
      attachments.forEach((a) => URL.revokeObjectURL(a.url));
      setAttachments([{ id: url, kind: "video", file: pickedVideo, url }]);
      if (picked.length > 1) setAttachError("영상은 한 번에 1개만 보낼 수 있어서 영상만 담았어요.");
      return;
    }
    const keep = attachments.filter((a) => a.kind === "image");
    attachments.filter((a) => a.kind === "video").forEach((a) => URL.revokeObjectURL(a.url));
    const images = picked.filter((f) => f.type.startsWith("image/") && f.size <= MAX_IMAGE_BYTES);
    const room = Math.max(0, MAX_IMAGES - keep.length);
    if (images.length < picked.length) setAttachError("사진이 아니거나 너무 큰 파일은 뺐어요.");
    else if (images.length > room) setAttachError(`사진은 한 번에 ${MAX_IMAGES}장까지 보낼 수 있어요.`);
    const added = images.slice(0, room).map((f) => {
      const url = URL.createObjectURL(f);
      return { id: url, kind: "image", file: f, url };
    });
    setAttachments([...keep, ...added]);
  }

  function removeAttachment(id) {
    setAttachments((list) => {
      list.filter((a) => a.id === id).forEach((a) => URL.revokeObjectURL(a.url));
      return list.filter((a) => a.id !== id);
    });
    setAttachError("");
  }

  const isChat = mode === "chat";

  return (
    <div
      className="screen"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        // 비서 화면은 페이지 전체가 위아래로 움직이지 않게 고정 — 대화 목록만 안에서 스크롤
        overflow: "hidden",
        overscrollBehavior: "none",
        minHeight: 0,
        transition: "padding-bottom 0.28s ease",
        padding: isChat
          ? `calc(${CORNER_TOP} + ${CORNER_SIZE + 8}px) 16px ${reading ? "calc(12px + env(safe-area-inset-bottom, 0px))" : "12px"}` // 탭을 숨기면 아이폰 홈 막대만큼 띄움
          : "calc(56px + env(safe-area-inset-top, 0px)) 16px 20px",
      }}
    >
      {!isChat && (
        <div style={{ marginBottom: 16 }}>
          <SpeechBubble>{findChatMode(chatMode).hello.replace("{name}", josa(dog.name, "이", ""))}</SpeechBubble>
        </div>
      )}

      <div
        onClick={() => isChat && goHome()}
        style={{
          position: isChat ? "absolute" : "relative",
          top: isChat ? CORNER_TOP : undefined,
          left: isChat ? 12 : undefined,
          width: isChat ? CORNER_SIZE : "100%",
          height: isChat ? CORNER_SIZE : IDLE_HEIGHT,
          borderRadius: isChat ? "50%" : 24,
          overflow: "hidden",
          background: isChat ? "var(--surface)" : "transparent",
          border: isChat ? "2px solid var(--accent-soft)" : "none",
          boxShadow: isChat ? "var(--shadow)" : "none",
          cursor: isChat ? "pointer" : "default",
          transition: "all 0.35s ease",
          // 메인 화면에서는 폰 화면이 작으면 강아지가 줄어들어 페이지가 넘치지 않게(최소 100px)
          flexShrink: isChat ? 0 : 1,
          minHeight: isChat ? undefined : 100,
          zIndex: 5,
        }}
      >
        <DogAvatarVideo state={avatarState} height={isChat ? CORNER_SIZE : "100%"} breed={chatMode} />
      </div>

      {isChat && avatarState === "thinking" && <ThinkingBubble top={`calc(${CORNER_TOP} + 26px)`} />}

      {isChat && (
        <div ref={chatListRef} onScroll={handleChatScroll} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", overscrollBehavior: "contain", paddingBottom: 12 }}>
          {messages.map((m, i) => {
            if (m.role === "user") {
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: "flex-end",
                    background: "var(--accent-soft)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "9px 13px",
                    maxWidth: "85%",
                    fontSize: 14.5,
                    boxShadow: "var(--shadow)",
                  }}
                >
                  {m.media?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: m.text ? 6 : 0 }}>
                      {m.media.map((x) =>
                        x.kind === "video" ? (
                          <video key={x.url} src={x.url} muted playsInline preload="metadata" controls style={{ width: "100%", maxHeight: 220, borderRadius: 10 }} />
                        ) : (
                          <img key={x.url} src={x.url} alt="보낸 사진" style={{ width: m.media.length > 1 ? 96 : "100%", height: m.media.length > 1 ? 96 : "auto", objectFit: "cover", borderRadius: 10, display: "block" }} />
                        )
                      )}
                    </div>
                  )}
                  {m.text}
                </div>
              );
            }

            if (m.error) {
              return (
                <div key={i} style={{ alignSelf: "flex-start", maxWidth: "92%", padding: "12px 14px", borderRadius: 16, background: "var(--danger-bg)", fontSize: 14.5, lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>앗, 답을 못 받았어</div>
                  <div style={{ whiteSpace: "pre-line" }}>{m.text}</div>
                  {m.retry && (
                    <button type="button" className="btn-ghost small" style={{ marginTop: 8 }} disabled={pending} onClick={() => retry(i)}>
                      다시 시도
                    </button>
                  )}
                </div>
              );
            }

            const { headline, detail } = splitHeadline(m.text);
            return (
              <div
                key={i}
                style={{
                  alignSelf: "flex-start",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "14px 16px",
                  maxWidth: "92%",
                  boxShadow: "var(--shadow)",
                }}
              >
                {m.chatMode && (
                  <div className="faint" style={{ marginBottom: 6 }}>
                    <Ico name={findChatMode(m.chatMode).ico} size={13} /> {findChatMode(m.chatMode).name}
                  </div>
                )}
                {m.structured ? (
                  <AiAnswer structured={m.structured} onFollowUp={(q) => send(q, [])} followUpDisabled={pending} />
                ) : (
                  <>
                    <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.35, marginBottom: detail ? 6 : 0 }}>{renderEmphasized(headline)}</div>
                    {detail && <div style={{ fontSize: 14, color: "var(--text-soft)", lineHeight: 1.5, whiteSpace: "pre-line" }}>{renderEmphasized(detail)}</div>}
                  </>
                )}
                {m.fromVideo && (
                  <div className="faint" style={{ marginTop: 8 }}>영상은 1초에 약 1장씩 장면을 나눠 보고 소리를 함께 들어 분석해요. 아주 빠른 움직임은 놓칠 수 있어요.</div>
                )}
                {m.records?.done.length > 0 && (
                  <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, background: "var(--accent-soft)", fontSize: 13, lineHeight: 1.6 }}>
                    <strong><Ico name="note" size={15} /> 앱에 기록했어요</strong>
                    {m.records.done.map((r) => (
                      <div key={r}>{r}</div>
                    ))}
                  </div>
                )}
                {m.records?.confirm?.map((c, j) => (
                  <div key={j} style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 13, lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      {c.type === "delete_record" ? <><Ico name="trash" size={15} /> 이 기록을 지울까요?</> : <><Ico name="pencil" size={15} /> 이렇게 고칠까요?</>}
                    </div>
                    <div style={{ marginBottom: 8 }}>{c.summary}</div>
                    {c.status ? (
                      <div className="faint">{c.status}</div>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="btn-primary" style={{ flex: 1, minHeight: 40, padding: "8px 0" }} onClick={() => resolveConfirm(i, j, true)}>
                          {c.type === "delete_record" ? "지우기" : "고치기"}
                        </button>
                        <button type="button" className="btn-ghost" style={{ flex: 1, padding: "8px 0" }} onClick={() => resolveConfirm(i, j, false)}>
                          취소
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {m.records?.failed > 0 && <div className="faint" style={{ marginTop: 6 }}>기록하지 못한 내용이 있어요. 조금 더 자세히 말해 주세요.</div>}
              </div>
            );
          })}
          {pending && (
            <div className="faint" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 10 }}>
              {progress?.phase === "upload"
                ? `영상 올리는 중… ${Math.round(progress.pct * 100)}%`
                : progress?.phase === "analyze"
                  ? "영상 보는 중… 1분쯤 걸릴 수 있어"
                  : findChatMode(chatMode).pending}
              {pendingKind === "media" && (
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "2px 12px", fontSize: 12 }}
                  onClick={() => abortRef.current?.abort()}
                >
                  취소
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ flex: isChat ? "0 0 auto" : 1 }} />

      <div className={`collapse-y${isChat && reading ? " collapsed" : ""}`}><div>
      {!isChat && (
        <div className="chat-suggest" style={{ marginTop: 12 }} aria-label="추천 질문">
          {SUGGESTIONS.map((q) => (
            <button key={q} type="button" disabled={pending} onClick={() => send(q, [])}>
              {q}
            </button>
          ))}
        </div>
      )}
      <div role="radiogroup" aria-label="채팅 스타일" style={{ display: "flex", gap: 6, marginTop: isChat ? 12 : 6 }}>
        {CHAT_MODES.map((cm) => {
          const selected = chatMode === cm.key;
          return (
            <button
              key={cm.key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={pending}
              onClick={() => {
                if (cm.key === chatMode) return;
                setChatMode(cm.key);
                saveChatMode(cm.key);
                // 인사말은 채팅 중일 때만 — 메인 화면에서는 스타일만 바뀐다
                if (isChat) setMessages((m) => [...m, { role: "ai", text: CHAT_MODE_INTROS[cm.key], chatMode: cm.key, intro: true }]);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "6px 4px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: selected ? 700 : 500,
                border: selected ? "2px solid var(--accent)" : "1px solid var(--border)",
                background: selected ? "var(--accent-soft)" : "var(--surface)",
                color: selected ? "var(--accent-strong)" : "var(--text-soft)",
                whiteSpace: "nowrap",
              }}
            >
              <Ico name={cm.ico} size={15} /> {cm.name}
            </button>
          );
        })}
      </div>
      </div></div>

      {(attachments.length > 0 || attachError) && (
        <div style={{ marginTop: 10 }}>
          {attachments.length > 0 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 6 }} aria-label="보낼 사진·영상">
              {attachments.map((a) => (
                <div key={a.id} style={{ position: "relative", flexShrink: 0 }}>
                  {a.kind === "video" ? (
                    <video src={a.url} muted playsInline preload="metadata" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12, background: "#000", display: "block" }} />
                  ) : (
                    <img src={a.url} alt="보낼 사진" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12, display: "block" }} />
                  )}
                  {a.kind === "video" && <span style={{ position: "absolute", left: 4, bottom: 4, color: "#fff" }}><Ico name="video" size={14} /></span>}
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    aria-label={a.kind === "video" ? "영상 빼기" : "사진 빼기"}
                    style={{ position: "absolute", top: -6, right: -6, width: 24, height: 24, borderRadius: "50%", border: "none", background: "var(--text)", color: "#fff", fontSize: 13, lineHeight: "24px", padding: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          {attachError && <div className="error-text" style={{ marginTop: 6 }}>{attachError}</div>}
          {attachments.length > 0 && !attachError && (
            <div className="faint" style={{ marginTop: 4 }}>궁금한 걸 같이 적어도 되고, 그냥 보내도 분석해 줘요.</div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{ display: "flex", gap: 8, marginTop: 8 }}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={pending}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            fontSize: 18,
            flexShrink: 0,
            boxShadow: "var(--shadow)",
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="사진/영상 보내기"
        >
          <Ico name="camera" size={20} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handlePick} style={{ display: "none" }} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={attachments.length ? "궁금한 점(안 적어도 돼요)" : "나한테 물어봐!"}
          style={{
            flex: 1,
            minWidth: 0, // 입력창은 기본 최소 너비가 있어 좁은 화면(확대 모드 320px)에서 전송 버튼을 밀어냄
            height: 44,
            border: "1px solid var(--border)",
            borderRadius: 22,
            padding: "0 16px",
            fontSize: 16,
            outline: "none",
            background: "var(--surface)",
          }}
        />
        <VoiceButton getText={() => inputRef.current} onText={(t) => sendRef.current(t)} onError={setAttachError} disabled={pending} hints={[dog.name, dog.breed].filter(Boolean)} />
        <button
          type="submit"
          className="btn-primary"
          style={{ width: 44, height: 44, minHeight: 44, padding: 0, borderRadius: "50%", fontSize: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          disabled={pending}
          aria-label="전송"
        >
          <Ico name="paw" size={22} />
        </button>
      </form>
      <div className={`collapse-y${isChat && reading ? " collapsed" : ""}`}><div>
        <p className="faint" style={{ textAlign: "center", marginTop: 8, marginBottom: 0 }}>
          진단·처방을 대신하지 않아요. 응급 상황이면 병원에 문의하세요.
        </p>
      </div></div>
    </div>
  );
}
