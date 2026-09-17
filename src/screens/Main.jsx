import { useEffect, useMemo, useRef, useState } from "react";
import { calculateAge } from "../utils/age";
import { todayKey } from "../utils/date";
import { getTodayChecklist } from "../services/careEngine";
import { getDogGreeting } from "../data/ageFlavorText";
import { askAI, analyzePhoto, analyzeBehavior } from "../services/aiClient";
import { getAverageColorFromDataUrl } from "../utils/color";
import { splitHeadline } from "../utils/text";
import DogAvatar3D from "../components/DogAvatar3D";

const IDLE_HEIGHT = 440;
const CORNER_SIZE = 76;

export default function Main({ dog }) {
  const [dateKey, setDateKey] = useState(todayKey());
  const [checklist, setChecklist] = useState([]);
  const [photoColor, setPhotoColor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("idle"); // 'idle' | 'chat'
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [avatarState, setAvatarState] = useState("idle");
  const talkTimerRef = useRef(null);
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    if (!dog.photo) {
      setPhotoColor(null);
      return;
    }
    getAverageColorFromDataUrl(dog.photo).then(setPhotoColor).catch(() => setPhotoColor(null));
  }, [dog.photo]);

  useEffect(() => () => clearTimeout(talkTimerRef.current), []);

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
    setAvatarState("thinking");

    const { answer, source } = await askAI(dog, question, history);
    setMessages((m) => [...m, { role: "ai", text: answer, mock: source === "mock" }]);
    setPending(false);
    speak(answer.length);
  }

  async function handleCapture(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || pending) return;
    const isVideo = file.type.startsWith("video/");
    const mediaUrl = URL.createObjectURL(file);
    setMode("chat");
    setMessages((m) => [
      ...m,
      { role: "user", text: isVideo ? "🎥 영상을 보냈어요" : "📷 사진을 보냈어요", mediaUrl, mediaType: isVideo ? "video" : "image" },
    ]);
    setPending(true);
    setAvatarState("thinking");

    try {
      const answer = isVideo ? await analyzeBehavior(dog, file) : await analyzePhoto(dog, file);
      setMessages((m) => [...m, { role: "ai", text: answer, mediaUrl, mediaType: isVideo ? "video" : "image" }]);
      speak(answer.length);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "ai", text: "서버 연결 실패!\n\nAI 서버에 연결하지 못했어. 서버가 켜져 있는지 확인해줘!", mock: true },
      ]);
      setAvatarState("idle");
    } finally {
      setPending(false);
    }
  }

  const isChat = mode === "chat";

  return (
    <div className="screen" style={{ position: "relative", display: "flex", flexDirection: "column", padding: isChat ? "84px 16px 16px" : "20px 16px" }}>
      <div
        onClick={() => isChat && setMode("idle")}
        style={{
          position: isChat ? "absolute" : "relative",
          top: isChat ? 12 : undefined,
          left: isChat ? 12 : undefined,
          width: isChat ? CORNER_SIZE : "100%",
          height: isChat ? CORNER_SIZE : IDLE_HEIGHT,
          borderRadius: isChat ? "50%" : 24,
          overflow: "hidden",
          background: "var(--surface)",
          border: isChat ? "2px solid var(--accent-soft)" : "none",
          boxShadow: isChat ? "var(--shadow)" : "none",
          cursor: isChat ? "pointer" : "default",
          transition: "all 0.35s ease",
          flexShrink: 0,
          zIndex: 5,
        }}
      >
        <DogAvatar3D breed={dog.breed} state={avatarState} photoColor={photoColor} height={isChat ? CORNER_SIZE : IDLE_HEIGHT} />
      </div>

      {!isChat && (
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, lineHeight: 1.5 }}>{greeting}</p>
        </div>
      )}

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
                  {m.mediaUrl && m.mediaType === "video" && (
                    <video src={m.mediaUrl} muted style={{ maxWidth: "100%", borderRadius: 10, marginBottom: 6, display: "block" }} />
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
                {m.mediaUrl && m.mediaType === "video" && (
                  <video src={m.mediaUrl} muted style={{ maxWidth: 140, borderRadius: 10, marginBottom: 10, display: "block" }} />
                )}
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.35, marginBottom: detail ? 6 : 0 }}>{headline}</div>
                {detail && <div style={{ fontSize: 14, color: "var(--text-soft)", lineHeight: 1.5 }}>{detail}</div>}
                {m.mock && <div className="faint" style={{ marginTop: 6 }}>(AI 서버 연결 안 됨)</div>}
              </div>
            );
          })}
          {pending && <div className="faint" style={{ alignSelf: "flex-start" }}>음... 생각 중이야…</div>}
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
          aria-label="사진/영상 촬영"
        >
          📷
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" capture="environment" onChange={handleCapture} style={{ display: "none" }} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="나한테 물어봐!"
          style={{
            flex: 1,
            border: "1px solid var(--border)",
            borderRadius: 22,
            padding: "0 16px",
            fontSize: 15,
            outline: "none",
            background: "var(--surface)",
          }}
        />
        <button type="submit" className="btn-primary" style={{ width: "auto", padding: "0 18px", borderRadius: 22 }} disabled={pending}>
          전송
        </button>
      </form>
      <p className="faint" style={{ textAlign: "center", marginTop: 8, marginBottom: 0 }}>
        진단·처방을 대신하지 않아요. 응급 상황이면 병원에 문의하세요.
      </p>
    </div>
  );
}
