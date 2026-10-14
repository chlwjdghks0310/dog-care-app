import { useEffect, useMemo, useRef, useState } from "react";
import { calculateAge } from "../utils/age";
import { todayKey } from "../utils/date";
import { getTodayChecklist } from "../services/careEngine";
import { getDogGreeting } from "../data/ageFlavorText";
import { askAI, analyzeGeneralPhoto, analyzeBehavior } from "../services/aiClient";
import { splitHeadline } from "../utils/text";
import DogAvatarVideo from "../components/DogAvatarVideo";
import ThinkingBubble from "../components/ThinkingBubble";
import SpeechBubble from "../components/SpeechBubble";

const IDLE_HEIGHT = 340;
const CORNER_SIZE = 76;
// 말풍선이 들어갈 공간을 위쪽에 남겨두기 위해 화면 맨 위보다 조금 내리고,
// 노치/상태바(safe-area-inset-top)가 있는 폰에서는 그만큼 더 내린다.
const CORNER_TOP = "calc(56px + env(safe-area-inset-top, 0px))";

// AI 답변 속 **강조** 표시를 굵고 진한 색 글자로 바꿔서, 중요한 부분만 폰트가 달라 보이게 한다.
function renderEmphasized(text) {
  if (!text) return text;
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} style={{ color: "var(--accent-strong)", fontWeight: 800 }}>
        {part}
      </strong>
    ) : (
      part
    )
  );
}

export default function Main({ dog, resetSignal }) {
  const [dateKey, setDateKey] = useState(todayKey());
  const [checklist, setChecklist] = useState([]);
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("idle"); // 'idle' | 'chat'
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingKind, setPendingKind] = useState(null); // 'text' | 'media' | null — 취소 버튼은 media일 때만 보여준다
  const [avatarState, setAvatarState] = useState("idle");
  const talkTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const key = todayKey();
      setDateKey((prev) => (prev === key ? prev : key));
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setChecklist(getTodayChecklist(dog, dateKey));
  }, [dog, dateKey]);

  useEffect(() => () => clearTimeout(talkTimerRef.current), []);

  // 메인 탭을 이미 보고 있는 상태에서 메인을 다시 누르면 채팅 중이어도 메인 화면으로 돌아간다.
  useEffect(() => {
    if (resetSignal) setMode("idle");
  }, [resetSignal]);

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(
    () => () => {
      messagesRef.current.forEach((m) => m.mediaUrl && URL.revokeObjectURL(m.mediaUrl));
    },
    []
  );

  const age = useMemo(() => calculateAge(dog.birthDate, new Date(dateKey)), [dog.birthDate, dateKey]);
  const greeting = useMemo(
    () => getDogGreeting(dog.name, age.ageInWeeks, checklist, dateKey),
    [dog.name, age.ageInWeeks, checklist, dateKey]
  );

  function speak(answerLength) {
    setAvatarState("talking");
    const talkDuration = Math.min(4000, Math.max(1200, answerLength * 45));
    clearTimeout(talkTimerRef.current);
    talkTimerRef.current = setTimeout(() => setAvatarState("idle"), talkDuration);
  }

  async function send(text) {
    const question = text.trim();
    if (!question || pending) return;
    const history = messages;
    setMode("chat");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setPending(true);
    setPendingKind("text");
    setAvatarState("thinking");

    const { answer, source } = await askAI(dog, question, history);
    setMessages((m) => [...m, { role: "ai", text: answer, mock: source === "mock" }]);
    setPending(false);
    setPendingKind(null);
    speak(answer.length);
  }

  async function handleCapture(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || pending) return;
    const isVideo = file.type.startsWith("video/");
    // 영상은 채팅에 미리보기를 띄우지 않으므로 사진만 URL을 만든다.
    const mediaUrl = isVideo ? null : URL.createObjectURL(file);
    setMode("chat");
    setMessages((m) => [
      ...m,
      { role: "user", text: isVideo ? "🎥 영상을 보냈어요" : "📷 사진을 보냈어요", mediaUrl, mediaType: isVideo ? "video" : "image" },
    ]);
    setPending(true);
    setPendingKind("media");
    setAvatarState("thinking");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const answer = isVideo
        ? await analyzeBehavior(dog, file, controller.signal)
        : await analyzeGeneralPhoto(dog, file, controller.signal);
      setMessages((m) => [...m, { role: "ai", text: answer, mediaUrl, mediaType: isVideo ? "video" : "image" }]);
      speak(answer.length);
    } catch (err) {
      // 서버까지는 연결됐는데 분석 자체가 실패한 경우(Gemini 과부하/쿼터 초과 등)엔
      // 서버가 알려준 구체적인 이유(err.message)를 그대로 보여준다 — 원인을 뭉뚱그려
      // "서버 연결 실패"로만 보여주면 실제로는 연결이 멀쩡한데도 헷갈리게 된다.
      // fetch 자체가 실패한 경우(TypeError)만 진짜 "서버에 연결 못 했어"로 보여준다.
      let text;
      if (err.name === "AbortError") {
        text = "분석을 취소했어!";
      } else if (err instanceof TypeError) {
        text = "서버 연결 실패!\n\nAI 서버에 연결하지 못했어. 서버가 켜져 있는지 확인해줘!";
      } else {
        text = `분석을 못 했어!\n\n${err.message}`;
      }
      setMessages((m) => [...m, { role: "ai", text, mock: true }]);
      setAvatarState("idle");
    } finally {
      abortRef.current = null;
      setPending(false);
      setPendingKind(null);
    }
  }

  const isChat = mode === "chat";

  return (
    <div
      className="screen"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        padding: isChat
          ? `calc(${CORNER_TOP} + ${CORNER_SIZE + 12}px) 16px 16px`
          : "calc(56px + env(safe-area-inset-top, 0px)) 16px 20px",
      }}
    >
      {!isChat && (
        <div style={{ marginBottom: 16 }}>
          <SpeechBubble>{greeting}</SpeechBubble>
        </div>
      )}

      <div
        onClick={() => isChat && setMode("idle")}
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
          flexShrink: 0,
          zIndex: 5,
        }}
      >
        <DogAvatarVideo state={avatarState} height={isChat ? CORNER_SIZE : IDLE_HEIGHT} />
      </div>

      {isChat && avatarState === "thinking" && <ThinkingBubble top={CORNER_TOP} />}

      {isChat && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", paddingBottom: 12 }}>
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
                  {m.mediaUrl && m.mediaType === "image" && (
                    <img src={m.mediaUrl} alt="보낸 사진" style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 6, display: "block" }} />
                  )}
                  {m.text}
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
                {m.mediaUrl && m.mediaType === "image" && (
                  <img src={m.mediaUrl} alt="분석한 사진" style={{ maxWidth: 140, borderRadius: 10, marginBottom: 10, display: "block" }} />
                )}
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.35, marginBottom: detail ? 6 : 0 }}>
                  {renderEmphasized(headline)}
                </div>
                {detail && (
                  <div style={{ fontSize: 14, color: "var(--text-soft)", lineHeight: 1.5 }}>{renderEmphasized(detail)}</div>
                )}
                {m.mock && <div className="faint" style={{ marginTop: 6 }}>(AI 서버 연결 안 됨)</div>}
              </div>
            );
          })}
          {pending && (
            <div className="faint" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 10 }}>
              음... 생각 중이야…
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{ display: "flex", gap: 8, marginTop: 12 }}
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
          }}
          aria-label="사진/영상 보내기"
        >
          📷
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleCapture} style={{ display: "none" }} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="나한테 물어봐!"
          style={{
            flex: 1,
            height: 44,
            border: "1px solid var(--border)",
            borderRadius: 22,
            padding: "0 16px",
            fontSize: 16,
            outline: "none",
            background: "var(--surface)",
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          style={{ width: 44, height: 44, padding: 0, borderRadius: "50%", fontSize: 18, flexShrink: 0 }}
          disabled={pending}
          aria-label="전송"
        >
          🐾
        </button>
      </form>
      <p className="faint" style={{ textAlign: "center", marginTop: 8, marginBottom: 0 }}>
        진단·처방을 대신하지 않아요. 응급 상황이면 병원에 문의하세요.
      </p>
    </div>
  );
}
