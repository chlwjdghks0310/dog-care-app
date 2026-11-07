import { useEffect, useRef, useState } from "react";
import { recordFromText } from "../services/aiClient";
import DailyCheck, { dailyPending, dailySummaryLines, UsualNote } from "../components/DailyCheck";
import { createPortal } from "react-dom";
import NotifyAsk, { notifyAskPending } from "../components/NotifyAsk";
import { getSignals } from "../services/signals";
import { isMilestone, togetherDays } from "../services/shareCard";
import OutingCard from "../components/OutingCard";
import { getFoodStock, stockLabel } from "../services/foodStock";
import { josa } from "../utils/text";
import { applyAppActions, applyConfirmedAction, saveAskedExpense } from "../services/appActions";
import { getCategories } from "../services/expenses";
import { getRecords, deleteRecord } from "../services/records";
import { isEmergency, findInfo, looksLikeQuestion } from "../services/infoSearch";
import { EMERGENCY } from "../data/emergency";
import { GUIDEBOOK_CHAPTERS, GUIDEBOOK_URL } from "../data/guidebookChapters";
import DogAvatarVideo from "../components/DogAvatarVideo";
import ThinkingBubble from "../components/ThinkingBubble";
import SpeechBubble from "../components/SpeechBubble";
import DogReaction from "../components/DogReaction";
import Ico from "../components/Ico";
import { quickParse } from "../services/quickParse";
import { getWeightRecords, deleteWeightRecord } from "../services/weightLog";
import { syncPushAlarms } from "../services/notifications";
import { todayKey } from "../utils/date";
import { calculateAge, formatAge } from "../utils/age";
import VoiceButton from "../components/VoiceButton";
import { getTodaySummary } from "../services/todaySummary";
import { getFirstSteps, markFirstSteps } from "../services/firstSteps";

// 첫 화면 = 말로 기록하기(2026-11, AI 질문 답변은 끝냄). 보호자가 한 말 → 가장 가벼운 AI가 기록으로 바꿈 → 앱이 확인 후 저장.
// 질문이면 AI를 부르지 않고, 응급 단어면 응급 카드, 아니면 우리 정보 카드·가이드북에서 찾아 보여 준다(src/services/infoSearch.js).
// 예시는 누르면 보내지 않고 입력칸에 채운다(예시를 눌렀다고 가짜 기록이 생기지 않게)
const RECORD_EXAMPLES = ["산책 30분 했어", "아침 사료 다 먹었어", "몸무게 3.2kg", "사료 3만 원 샀어"];
const IDLE_HEIGHT = 290;
const CORNER_SIZE = 76;
// 기록 중 왼쪽 위 강아지: 노치/상태바(safe-area-inset-top) 바로 아래까지 올려 기록 칸을 넓게
const CORNER_TOP = "calc(8px + env(safe-area-inset-top, 0px))";
const chapterOf = (c) => GUIDEBOOK_CHAPTERS.find((x) => x.chapter === c);

export default function Main({ dog, resetSignal, onReadingChange, onOpenToday, onOpenFeeding, onOpenWeight, onOpenVet }) {
  const [, refresh] = useState(0); // 첫 걸음 "다음에 할게" 뒤 다시 그리기
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState("idle"); // 'idle' | 'chat'
  const [input, setInput] = useState("");
  const inputRef = useRef("");
  const inputElRef = useRef(null);
  // 입력칸은 글이 길어지면 5줄까지 늘어난다
  useEffect(() => {
    const el = inputElRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + el.offsetHeight - el.clientHeight, 132)}px`; // 테두리까지 더해 빈 칸이 44px
  }, [input]);
  inputRef.current = input; // 🎤가 말하기 시작할 때의 입력 내용에 이어 붙이도록
  const [pending, setPending] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  // 보내는 중인지 바로 알기 위한 표시 — state(pending)는 다음 그리기 때 바뀌어서, 빠르게 여러 번 누르면 요청이 여러 개 나갔다
  const busyRef = useRef(false);
  const [avatarState, setAvatarState] = useState("idle");
  const talkTimerRef = useRef(null);
  const abortRef = useRef(null);
  // 기록 읽기: 목록을 아래로 스크롤하면 안내문·하단 탭을 내려 숨기고, 위로 스크롤하면 다시 보인다
  const [reading, setReading] = useState(false);

  useEffect(() => () => clearTimeout(talkTimerRef.current), []);

  // 강아지를 바꾸면 화면을 비운다(앞 강아지 기록 결과가 섞이지 않게)
  const dogIdRef = useRef(dog.id);
  useEffect(() => {
    if (dogIdRef.current === dog.id) return;
    dogIdRef.current = dog.id;
    goHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dog.id]);

  // 메인 탭을 이미 보고 있는 상태에서 메인을 다시 누르면 첫 화면으로 돌아간다.
  useEffect(() => {
    if (resetSignal) goHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  // 메인 화면으로 돌아가면 목록을 비우고 처음부터. 진행 중이던 요청은 도착해도 버린다(chatSessionRef).
  const chatSessionRef = useRef(0);
  function goHome() {
    chatSessionRef.current += 1;
    abortRef.current?.abort();
    setMessages([]);
    setVoiceError("");
    busyRef.current = false;
    setPending(false);
    setAvatarState("idle");
    setMode("idle");
    setReading(false);
  }

  // 새 메시지·"정리 중": 맨 아래로, 결과 카드는 첫 줄이 맨 위에 오게
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

  // 고치기·지우기 확인 버튼 — 누른 결과를 그 자리에 남긴다
  function resolveConfirm(msgIndex, j, ok) {
    const action = messages[msgIndex]?.records?.confirm?.[j];
    if (!action || action.status) return;
    const status = ok ? applyConfirmedAction(dog, action) || "이미 없거나 고칠 수 없는 기록이에요." : "취소했어요.";
    setMessages((list) =>
      list.map((m, i) =>
        i === msgIndex ? { ...m, records: { ...m.records, confirm: m.records.confirm.map((c, k) => (k === j ? { ...c, status } : c)) } } : m
      )
    );
  }

  // 지출의 분류를 보호자가 골랐을 때 — 저장하고 그 자리에 결과를 남긴다
  function resolveAsk(msgIndex, j, categoryId) {
    const ask = messages[msgIndex]?.records?.ask?.[j];
    if (!ask || ask.status) return;
    const status = categoryId ? saveAskedExpense(dog, ask, categoryId) || "저장하지 못했어요." : "기록하지 않았어요.";
    if (categoryId) markFirstSteps(dog.id, { chat: true });
    setMessages((list) =>
      list.map((m, i) => (i === msgIndex ? { ...m, records: { ...m.records, ask: m.records.ask.map((c, k) => (k === j ? { ...c, status } : c)) } } : m))
    );
  }

  function speak() {
    setAvatarState("talking");
    clearTimeout(talkTimerRef.current);
    talkTimerRef.current = setTimeout(() => setAvatarState("idle"), 1600);
  }

  // 질문으로 보이면: 응급 단어 → 응급 카드, 아니면 우리 자료(정보 카드·가이드북)에서 찾기. AI는 부르지 않는다.
  const infoMessage = (said) => {
    const hit = isEmergency(said);
    return { role: "ai", kind: "info", said, emergency: hit ? EMERGENCY : null, situation: hit ? EMERGENCY.situations.find((x) => x.keywords.includes(hit))?.line : null, results: findInfo(said) };
  };

  // 보내기: 🎤 음성 인식이 끝나도 바로 이리로(듣는 동안 화면이 바뀌어도 최신 send를 쓰도록 ref로)
  const sendRef = useRef(null);
  sendRef.current = (text) => send(text);
  function send(text) {
    const said = text.trim();
    if (!said || busyRef.current) return; // 보내는 중엔 무시 → 버튼 여러 번 눌러도 요청 하나
    setMode("chat");
    setMessages((m) => [...m, { role: "user", text: said }]);
    setInput("");
    setVoiceError("");
    if (isEmergency(said) || looksLikeQuestion(said)) {
      setMessages((m) => [...m, infoMessage(said)]);
      speak();
      return;
    }
    // 자주 쓰는 짧은 말은 AI 없이 바로 저장 + [되돌리기](비용 0원) — 애매하면 지금처럼 AI로
    const local = quickParse(said, todayKey());
    if (local) {
      const before = new Set(getRecords(dog.id).map((r) => r.id));
      const beforeW = new Set(getWeightRecords(dog.id).map((r) => r.id));
      const records = applyAppActions(dog, local);
      if (records.done.length) {
        markFirstSteps(dog.id, { chat: true });
        const added = getRecords(dog.id).filter((r) => !before.has(r.id));
        const addedW = getWeightRecords(dog.id).filter((r) => !beforeW.has(r.id)).map((r) => r.id);
        setMessages((m) => [...m, { role: "ai", kind: "record", records, reacted: added.slice(-1)[0] || null, undo: { recs: added.map((r) => r.id), weights: addedW } }]);
        speak();
        return;
      }
    }
    run(said);
  }

  // 실패한 요청은 같은 내용으로 다시 보낸다
  function retry(index) {
    const said = messages[index]?.retry;
    if (!said || busyRef.current) return;
    setMessages((m) => m.filter((_, i) => i !== index));
    run(said);
  }

  async function run(said) {
    busyRef.current = true;
    setPending(true);
    setAvatarState("thinking");
    const controller = new AbortController();
    abortRef.current = controller;
    const session = chatSessionRef.current;
    try {
      const before = new Set(getRecords(dog.id).map((r) => r.id));
      const { actions, question, reply } = await recordFromText(dog, said, { signal: controller.signal });
      if (session !== chatSessionRef.current) return; // 그사이 메인 화면으로 돌아감
      if (!actions.length) {
        setMessages((m) => [...m, question ? infoMessage(said) : { role: "ai", kind: "more", text: reply || "무엇을 기록할지 조금 더 자세히 말해 줘!" }]);
      } else {
        const records = applyAppActions(dog, actions);
        if (records.done.length) markFirstSteps(dog.id, { chat: true }); // 첫 걸음 ③ "말로 기록해 보기" 완료
        // 새로 생긴 기록에 강아지가 한마디(걱정되는 기록이 있으면 그걸 먼저)
        const added = getRecords(dog.id).filter((r) => !before.has(r.id));
        setMessages((m) => [...m, { role: "ai", kind: "record", records, reacted: added.slice(-1)[0] || null }]);
      }
      speak();
    } catch (err) {
      if (session !== chatSessionRef.current) return;
      const text =
        err.name === "AbortError" ? "보내기를 취소했어!" : err instanceof TypeError ? "인터넷에 연결하지 못했어. 연결을 확인하고 다시 시도해 줘!" : err.message || "기록을 정리하지 못했어. 다시 시도해 줘!";
      setMessages((m) => [...m, { role: "ai", error: true, text, retry: err.status === 429 ? null : said }]);
      setAvatarState("idle");
    } finally {
      if (session === chatSessionRef.current) {
        busyRef.current = false;
        abortRef.current = null;
        setPending(false);
      }
    }
  }

  const [usualOpen, setUsualOpen] = useState(false); // 첫 걸음 "평소 모습 적어 두기" 창
  const [dcOpen, setDcOpen] = useState(false); // 하루 체크 고르기 창이 열려 있는 동안(다시 그려져도 창 유지)
  const isChat = mode === "chat";

  return (
    <div
      className="screen"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        // 첫 화면은 페이지 전체가 위아래로 움직이지 않게 고정 — 기록 목록만 안에서 스크롤
        overflow: "hidden",
        overscrollBehavior: "none",
        minHeight: 0,
        transition: "padding-bottom 0.28s ease",
        padding: isChat
          ? `calc(${CORNER_TOP} + ${CORNER_SIZE + 8}px) 16px ${reading ? "calc(12px + env(safe-area-inset-bottom, 0px))" : "12px"}` // 탭을 숨기면 아이폰 홈 막대만큼 띄움
          : "calc(56px + env(safe-area-inset-top, 0px)) 16px 20px",
      }}
    >
      {usualOpen &&
        createPortal(
          <div className="es-backdrop" onClick={(e) => e.target === e.currentTarget && setUsualOpen(false)}>
            <div className="es-sheet" role="dialog" aria-label="평소 모습">
              <div className="es-top">
                <button type="button" className="es-x" aria-label="닫기" onClick={() => setUsualOpen(false)}>✕</button>
                <div className="es-title">{dog.name} 평소 모습</div>
                <span style={{ width: 36 }} />
              </div>
              <div className="es-scroll" style={{ padding: "4px 16px 20px" }}>
                <p className="subtle" style={{ margin: "0 0 10px" }}>밥·변·산책·기운이 평소 어떤지 한두 줄로 적어 두면, 다른 날을 고를 때 비교하기 쉽고 병원용 기록에도 들어가요.</p>
                <UsualNote dog={dog} startEditing onSaved={() => (setUsualOpen(false), refresh((n) => n + 1))} />
              </div>
            </div>
          </div>,
          document.body
        )}
      {!isChat && (
        <div style={{ marginBottom: 16 }}>
          {/* 처음 쓰는 사람도 하루 체크부터(첫 기록까지 1분) → 첫 체크 뒤 한 번 알림 묻기 → 첫 걸음 → 오늘 요약 */}
          {dailyPending(dog.id) || dcOpen ? (
            <SpeechBubble>
              <DailyCheck dog={dog} onChange={() => refresh((n) => n + 1)} onSheetChange={setDcOpen} />
            </SpeechBubble>
          ) : notifyAskPending(dog.id) ? (
            <SpeechBubble>
              <NotifyAsk dog={dog} onDone={() => refresh((n) => n + 1)} />
            </SpeechBubble>
          ) : getFirstSteps(dog.id).show ? (
            <SpeechBubble>
              <FirstSteps
                dog={dog}
                onWeight={onOpenWeight}
                onUsual={() => setUsualOpen(true)}
                onVet={onOpenVet}
                onLater={() => (markFirstSteps(dog.id, { dismissed: true }), refresh((n) => n + 1))}
              />
            </SpeechBubble>
          ) : (
            <button type="button" className="summary-bubble" onClick={onOpenToday}>
              <SpeechBubble>
                <TodaySummary dog={dog} />
              </SpeechBubble>
            </button>
          )}
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
        <DogAvatarVideo state={avatarState} height={isChat ? CORNER_SIZE : "100%"} breed="pomeranian" />
      </div>

      {isChat && avatarState === "thinking" && <ThinkingBubble top={`calc(${CORNER_TOP} + 26px)`} />}

      {isChat && (
        <div ref={chatListRef} onScroll={handleChatScroll} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", overscrollBehavior: "contain", paddingBottom: 12 }}>
          {messages.map((m, i) => {
            if (m.role === "user") return <div key={i} className="rec-said">{m.text}</div>;
            if (m.error) {
              return (
                <div key={i} className="rec-card rec-error">
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>앗, 기록하지 못했어</div>
                  <div style={{ whiteSpace: "pre-line" }}>{m.text}</div>
                  {m.retry && (
                    <button type="button" className="btn-ghost small" style={{ marginTop: 8 }} disabled={pending} onClick={() => retry(i)}>
                      다시 시도
                    </button>
                  )}
                </div>
              );
            }
            if (m.kind === "info") return <InfoAnswer key={i} msg={m} dog={dog} />;
            if (m.kind === "more") return <div key={i} className="rec-card">{m.text}</div>;
            return (
              <div key={i} className="rec-card">
                {m.records.done.length > 0 && (
                  <div className="rec-done">
                    <strong><Ico name="note" size={15} /> 앱에 기록했어요</strong>
                    {m.records.done.map((r) => (
                      <div key={r}>{r}</div>
                    ))}
                  </div>
                )}
                {m.records.confirm?.map((c, j) => (
                  <div key={j} className="rec-confirm">
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
                {m.records.ask?.map((a, j) => (
                  <div key={`ask${j}`} className="ask-card">
                    <div style={{ fontWeight: 700, marginBottom: 2 }}><Ico name="wallet" size={15} /> 어느 분류로 적을까요?</div>
                    <div style={{ marginBottom: 8 }}>{a.title} · {a.amount.toLocaleString("ko-KR")}원 · {a.fixed ? `매달 ${a.day}일` : a.date.slice(5).replace("-", "/")}</div>
                    {a.status ? (
                      <div className="faint">{a.status}</div>
                    ) : (
                      <div className="chip-wrap">
                        {getCategories().map((c) => (
                          <button key={c.id} type="button" className="chip cat-chip" style={{ "--ev": c.color, fontSize: 13, padding: "5px 10px" }} onClick={() => resolveAsk(i, j, c.id)}>
                            {c.name}
                          </button>
                        ))}
                        <button type="button" className="link-btn" style={{ margin: 0 }} onClick={() => resolveAsk(i, j, null)}>기록 안 함</button>
                      </div>
                    )}
                  </div>
                ))}
                {m.records.failed > 0 && <div className="faint" style={{ marginTop: 6 }}>기록하지 못한 내용이 있어요. 조금 더 자세히 말해 주세요.</div>}
                {m.undo && (
                  <button type="button" className="link-btn" style={{ margin: "4px 0 0" }} onClick={() => {
                    m.undo.recs.forEach((id) => deleteRecord(dog.id, id));
                    m.undo.weights.forEach((id) => deleteWeightRecord(dog.id, id));
                    syncPushAlarms();
                    setMessages((list) => list.map((x, k) => (k === i ? { role: "ai", kind: "more", text: "되돌렸어요. 다시 말해 주세요!" } : x)));
                  }}>
                    <Ico name="arrowDown" size={14} /> 되돌리기
                  </button>
                )}
                {m.reacted && <DogReaction dog={dog} rec={m.reacted} onClose={() => setMessages((list) => list.map((x, k) => (k === i ? { ...x, reacted: null } : x)))} />}
              </div>
            );
          })}
          {pending && (
            <div className="faint" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 10 }}>
              기록으로 정리하는 중…
              <button type="button" className="btn-ghost" style={{ padding: "2px 12px", fontSize: 12 }} onClick={() => abortRef.current?.abort()}>
                취소
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: isChat ? "0 0 auto" : 1 }} />

      {/* 말풍선이 첫 걸음·하루 체크를 묻는 동안엔 오늘 할 일로 가는 줄을 따로 */}
      {!isChat && (getFirstSteps(dog.id).show || dailyPending(dog.id) || notifyAskPending(dog.id)) && <TodayTasksRow dog={dog} onOpen={onOpenToday} />}

      {/* 처음 쓰는 사람(첫 걸음 말풍선)에겐 외출 카드는 첫 걸음을 마친 뒤에 — 첫 화면 칸 줄이기 */}
      {!isChat && !getFirstSteps(dog.id).show && (
        <div style={{ marginTop: 10, flexShrink: 0 }}>
          <OutingCard dog={dog} onChecked={() => refresh((n) => n + 1)} />
        </div>
      )}

      <div className={`collapse-y${isChat && reading ? " collapsed" : ""}`}><div>
        <div className="chat-suggest" style={{ marginTop: 12 }} aria-label="이렇게 말해 보세요">
          {RECORD_EXAMPLES.map((q) => (
            <button key={q} type="button" className="record-example" disabled={pending} onClick={() => (setInput(q), inputElRef.current?.focus())}>
              <Ico name="pencil" size={14} /> {q}
            </button>
          ))}
        </div>
      </div></div>

      {voiceError && <div className="error-text" style={{ marginTop: 8 }}>{voiceError}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 8 }}
      >
        <textarea
          ref={inputElRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Enter는 보내기, Shift+Enter는 줄바꿈(한글 조합 중 Enter는 무시)
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
          aria-label="기록할 내용"
          placeholder="말하거나 적어 주세요 (예: 산책 30분)"
          className="rec-input"
        />
        <VoiceButton getText={() => inputRef.current} onText={(t) => sendRef.current(t)} onError={setVoiceError} disabled={pending} hints={[dog.name, dog.breed].filter(Boolean)} />
        <button
          type="submit"
          className="btn-primary"
          style={{ width: 44, height: 44, minHeight: 44, padding: 0, borderRadius: "50%", fontSize: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          disabled={pending}
          aria-label="기록하기"
        >
          <Ico name="paw" size={22} />
        </button>
      </form>
    </div>
  );
}

// 질문에 대한 안내: 응급이면 응급 카드가 먼저, 그다음 우리 정보 카드·가이드북. 진단·판단 없이 일반 참고 + 병원 안내만.
function InfoAnswer({ msg, dog }) {
  const { emergency, situation, results, said } = msg;
  return (
    <div className="rec-card">
      {emergency && (
        <div className="info-emergency" role="alert">
          <div className="info-emergency-title"><Ico name="alert" size={18} /> {emergency.title}</div>
          {situation && <div style={{ fontWeight: 700, marginBottom: 6 }}>{situation}</div>}
          <div style={{ whiteSpace: "pre-line" }}>{emergency.message}</div>
          <div className="info-actions">
            {emergency.actions.map((a) => (
              <a key={a.url} className="btn-primary" href={a.url} target="_blank" rel="noopener">{a.label}</a>
            ))}
          </div>
        </div>
      )}
      {!emergency && <p className="info-lead">질문에는 답하지 않지만, 멍케어 자료에서 관련 내용을 찾아봤어요.</p>}
      {results.map((r) =>
        r.type === "card" ? <InfoCard key={r.card.id} card={r.card} /> : <GuideLink key={r.chapter.chapter} chapter={r.chapter} />
      )}
      {!emergency && !results.length && <p className="info-lead">아직 준비된 자료가 없어요. 걱정되면 동물병원에 물어보세요. 기록할 내용이었다면 "산책 30분 했어"처럼 말해 주세요.</p>}
      {said && <AskOutside dog={dog} question={said} urgent={Boolean(emergency)} />}
      <p className="faint" style={{ margin: "8px 0 0", fontSize: 12 }}>일반적인 참고 정보예요. 우리 아이 상태는 동물병원에서 확인해 주세요.</p>
    </div>
  );
}

function InfoCard({ card }) {
  const ch = card.guidebook && chapterOf(card.guidebook.chapter);
  return (
    <div className="info-card">
      <div className="info-card-title">{card.title}</div>
      <p>{card.summary}</p>
      <ul>{card.points.map((p) => <li key={p}>{p}</li>)}</ul>
      {card.vetWhen?.length > 0 && (
        <div className="info-vet">
          <b>이럴 땐 병원에 연락해 보세요</b>
          <ul>{card.vetWhen.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      <div className="info-links">
        {card.blogUrl && <a href={card.blogUrl} target="_blank" rel="noopener">블로그에서 자세히 보기 ›</a>}
        {ch && <GuideLink chapter={ch} inline />}
      </div>
      {card.sources?.length > 0 && (
        <div className="faint info-sources">
          출처: {card.sources.map((s, k) => <span key={s.url}>{k > 0 && " · "}<a href={s.url} target="_blank" rel="noopener">{s.name}</a></span>)}
        </div>
      )}
    </div>
  );
}

function GuideLink({ chapter, inline }) {
  const href = `${GUIDEBOOK_URL}${chapter.page ? `#page=${chapter.page}` : ""}`;
  return (
    <a className={inline ? undefined : "info-guide"} href={href} target="_blank" rel="noopener">
      <Ico name="book" size={14} /> 가이드북 {chapter.chapter} {chapter.title} 보기 ›
    </a>
  );
}

// 첫 화면 말풍선: 우리 강아지가 오늘 요약을 말해 준다(남은 할 일·다음 약·7일 안 일정). 기록된 것만, 판단 없이
// 오늘 할 일(옛 체크리스트 탭)로 가는 한 줄 — 처음 쓰는 사람(첫 걸음 말풍선)도 늘 보이게
function TodayTasksRow({ dog, onOpen }) {
  const t = getTodaySummary(dog);
  const left = t.tasksLeft.length;
  return (
    <button type="button" className="card today-row" onClick={onOpen}>
      <Ico name="checklist" size={20} className="cat-ico tone-blue" />
      <span style={{ flex: 1, textAlign: "left", fontWeight: 600 }}>
        {left ? `오늘 할 일 ${left}개 남았어요` : t.tasksTotal ? "오늘 할 일을 다 했어요" : "오늘 할 일 보기"}
      </span>
      <span className="faint" aria-hidden="true">›</span>
    </button>
  );
}

function TodaySummary({ dog }) {
  const t = getTodaySummary(dog);
  const together = togetherDays(dog);
  const lines = [...getSignals(dog).filter((s) => !(s.id === "med" && t.checkDoses)).map((s) => ["alert", "rose", s.text]) /* 약은 아래 '약 기록 확인' 줄과 겹치면 뺌 */, ...(isMilestone(together) ? [["heartPlain", "rose", `오늘 함께한 지 ${together}일이야! 우리 아이 → 이번 주 리포트에서 기념 카드를 만들 수 있어`]] : []), ...dailySummaryLines(dog.id)];
  if (t.tasksLeft.length) lines.push(["checklist", "blue", `할 일 ${t.tasksLeft.length}개 남았어 · ${t.tasksLeft.slice(0, 2).join(", ")}${t.tasksLeft.length > 2 ? " 외" : ""}`]);
  else if (t.tasksTotal) lines.push(["checklist", "blue", "오늘 할 일은 다 했어! 최고야"]);
  if (t.checkDoses) lines.push(["pill", "teal", `약 먹인 기록 ${t.checkDoses}개를 확인해 줘`]);
  else if (t.nextDose) lines.push(["pill", "teal", `${t.nextDose.time} ${t.nextDose.name} ${t.nextDose.dose} 먹을 차례야`]);
  const food = getFoodStock(dog);
  if (food && food.daysLeft <= 5) lines.push(["bowl", "rose", stockLabel(food)]);
  if (t.nextEvent) lines.push(["calendar", "violet", `${t.nextEvent.days === 0 ? `오늘${t.nextEvent.time ? ` ${t.nextEvent.time}` : ""}` : `${t.nextEvent.days}일 뒤`} ${t.nextEvent.title}`]);
  return (
    <span className="summary">
      <span className="summary-open">
        <span className="summary-role">기록 친구 · {dog.name}</span>
        말로 하면 내가 기록해 줄게 ✍️
      </span>
      {lines.length ? (
        // 작은 화면에서 말풍선이 길어지면 아래 입력칸이 밀려나서 4줄까지만(점검 11/7, 아이폰 SE)
        [...lines.slice(0, 4), ...(lines.length > 4 ? [["checklist", "blue", `그 밖에 ${lines.length - 4}개 — 눌러서 오늘 할 일에서 보기`]] : [])].map(([ico, tone, text]) => (
          <span key={text} className="summary-line">
            <Ico name={ico} size={16} className={`cat-ico tone-${tone}`} />
            <span>{text}</span>
          </span>
        ))
      ) : (
        <span className="summary-line">오늘은 특별히 챙길 게 없어. 오늘 있었던 일 말해 줘!</span>
      )}
      {/* 누르면 오늘 할 일로 간다는 걸 보이게(사용자 요청 11/7) — 말풍선 전체가 버튼 */}
      <span className="summary-go" aria-hidden="true"><Ico name="checklist" size={15} /> 오늘 할 일 보기 <span>›</span></span>
    </span>
  );
}

// 처음 쓰는 사람: 말풍선이 "첫 걸음 3가지"를 말한다. 한 것은 ✓(실제 기록으로 판단), 누르면 그 화면으로
// 첫 걸음(병원 수첩에 맞춤, 11/7): 몸무게 · 평소 모습(다른 날과 비교할 기준) · 병원용 기록 미리 보기(이렇게 쌓여요)
function FirstSteps({ dog, onWeight, onUsual, onVet, onLater }) {
  const { steps } = getFirstSteps(dog.id);
  const items = [
    ["weight", "scales", "blue", "지금 몸무게 적기", onWeight],
    ["usual", "pencil", "teal", "평소 모습 적어 두기", onUsual],
    ["vet", "clipboard", "rose", "병원용 기록 미리 보기", onVet],
  ];
  return (
    <span className="summary">
      <span className="summary-open">{josa(dog.name, "이랑", "랑")} 처음 만났네! 이것부터 해 볼까?</span>
      {items.map(([key, ico, tone, label, onClick]) => (
        <button key={key} type="button" className={`first-step${steps[key] ? " done" : ""}`} onClick={onClick}>
          <span className="first-check" aria-hidden="true">{steps[key] && <Ico name="check" size={16} />}</span>
          <Ico name={ico} size={16} className={`cat-ico tone-${tone}`} />
          <span style={{ flex: 1 }}>{label}</span>
          {!steps[key] && <span className="faint" aria-hidden="true">›</span>}
        </button>
      ))}
      <button type="button" className="link-btn summary-more" onClick={onLater}>다음에 할게</button>
    </span>
  );
}

// 더 묻고 싶으면 ChatGPT로 넘기기(멍케어 비용 0원, 사용자 결정 11/7 A안). 보호자가 누를 때만 열고, 이름은 넣지 않는다(견종·나이·몸무게만).
// 응급 단어가 보이면 이 버튼 대신 병원 연락 안내만 보여 준다.
function AskOutside({ dog, question, urgent }) {
  const age = dog.birthDate ? formatAge(calculateAge(dog.birthDate)) : "";
  const prompt = `강아지 정보: ${[dog.breed, age, dog.weight ? `${dog.weight}kg` : ""].filter(Boolean).join(", ")}\n질문: ${question.split(dog.name).join("우리 강아지")}\n\n${urgent ? "응급일 수 있어요. 지금 해야 할 일과 병원에 전화할 때 알려 줄 정보를 먼저 짧게 알려 주세요. " : ""}수의사 진단이 아닌 일반 정보로 쉽게 답해 주고, 바로 병원에 가야 하는 신호가 있으면 먼저 알려 주세요.`;
  return (
    <div className="ask-out">
      <a className="btn-ghost small" href={`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`} target="_blank" rel="noopener noreferrer">
        <Ico name="chatHeart" size={15} /> ChatGPT에 물어보기
      </a>
      <span className="faint">{urgent ? "응급일 수 있어요 — 병원 전화가 먼저예요. ChatGPT 답은 전화를 기다리는 동안 참고만 해 주세요." : "멍케어 밖 AI예요. 답은 참고만 하고, 걱정되면 병원에 물어보세요."}</span>
    </div>
  );
}
