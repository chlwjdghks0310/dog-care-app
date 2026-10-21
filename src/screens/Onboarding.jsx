import { useRef, useState } from "react";
import { createDog } from "../models/dog";
import { saveDog } from "../services/dogRepository";
import { addWeightRecord } from "../services/weightLog";
import { BREEDS } from "../data/breeds";
import { isPushSupported, subscribeToPush } from "../services/notifications";
import { josa, nameCall } from "../utils/text";
import { todayKey } from "../utils/date";
import DogAvatarVideo from "../components/DogAvatarVideo";
import { LoginForm, LoginSheet, useSyncStatus } from "../components/AccountCard";
import { supabase } from "../services/supabase";

// 첫 실행 온보딩: ① 앱 소개 4장(옆으로 넘김) → ② 로그인 또는 게스트 → ③ 강아지 정보를 한 화면에 하나씩 → ④ 알림 켜기 → ⑤ 인사.
// 로그인해서 서버에 강아지가 있으면 App이 바로 앱 화면으로 넘긴다(dogcare-synced). 게스트도 나중에 설정에서 로그인할 수 있다.
// skipIntro: 강아지를 모두 지운 뒤 다시 등록할 때는 소개를 건너뛴다.
// 소개는 가르치기보다 "가치 보여 주기"(NN/g·Apple HIG 참고, ../자료용/자료/2026-10-20-온보딩-레퍼런스.md):
// 4장, 한 장 = 한 가지, 제목 짧게·설명 두 줄 안쪽, 그림 속 내용은 "예시"로 표시(실제 기록처럼 보이지 않게), 마지막 버튼은 첫 행동으로.
const SLIDES = [
  { title: "우리 강아지와 대화해요", text: "궁금한 걸 물으면 우리 아이에 맞춰 답해요.\n말투는 세 가지 중에 골라요." },
  { title: "사진·영상도 봐 줘요", text: "찍어 보내면 보이는 걸 정리하고\n이어서 물어볼 질문도 골라 줘요." },
  { title: "말만 하면 기록 끝", text: "“산책 30분 했어” 한마디면\n가계부·일정·체중·약까지 알아서 적어요." },
  { title: "기록과 할 일을 한눈에", text: "건강 수치는 프로필에 모이고\n밥·산책·약 시간엔 알림이 와요." },
];
const SLIDE_VISUALS = [ModesMock, PhotoMock, ChatMock, CareMock];

const isStandalone = () => window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

export default function Onboarding({ onRegistered, skipIntro = false }) {
  const [phase, setPhase] = useState(skipIntro ? "setup" : "intro");
  const { user } = useSyncStatus();
  // 로그인됨(카카오에서 돌아와 앱이 새로 켜진 경우 포함) → 소개·로그인은 건너뛴다
  if (phase === "setup" || user) return <Setup onRegistered={onRegistered} />;
  if (phase === "intro") return <Intro onDone={() => setPhase(supabase ? "login" : "setup")} />;
  return <Login onGuest={() => setPhase("setup")} />;
}

function Login({ onGuest }) {
  return (
    <div className="onb">
      <div className="onb-setup" style={{ textAlign: "center" }}>
        <img src="/icon-192.png?v=5" alt="" width="72" height="72" style={{ borderRadius: 18, margin: "auto auto 14px", display: "block", flexShrink: 0 }} />
        <div className="onb-title">우리 아이 기록, 안전하게 보관해요</div>
        <p className="onb-text">로그인하면 폰을 바꿔도 기록을 그대로 불러오고{"\n"}가족과 함께 볼 수 있어요.</p>
        <div className="onb-login">
          <LoginForm />
        </div>
        <button type="button" className="btn-ghost" onClick={onGuest} style={{ marginTop: 18 }}>
          로그인 없이 시작하기
        </button>
        <p className="faint" style={{ margin: "8px 4px auto", paddingBottom: 12 }}>
          게스트는 기록이 이 폰에만 저장돼요. 앱을 지우거나 폰을 바꾸면 기록이 사라지고, 가족과 공유할 수 없어요. 나중에 설정에서 언제든 로그인할 수 있어요.
        </p>
      </div>
    </div>
  );
}

function Intro({ onDone }) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  function next() {
    if (last) return onDone();
    const el = trackRef.current;
    el.scrollTo({ left: el.clientWidth * (index + 1), behavior: "smooth" });
  }

  return (
    <div className="onb">
      <div className="onb-top">
        <button type="button" className="onb-skip" onClick={onDone}>
          건너뛰기
        </button>
      </div>
      <div ref={trackRef} className="onb-track" onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {SLIDES.map((s, i) => (
          <div key={i} className="onb-slide">
            <div className="onb-visual">{(() => { const Visual = SLIDE_VISUALS[i]; return <Visual />; })()}</div>
            <div className="onb-title">{s.title}</div>
            <p className="onb-text">{s.text}</p>
          </div>
        ))}
      </div>
      <div className="onb-dots" aria-hidden="true">
        {SLIDES.map((_, i) => (
          <span key={i} className={i === index ? "on" : ""} />
        ))}
      </div>
      <div className="onb-bottom">
        <button type="button" className="btn-primary" onClick={next}>
          {last ? "우리 아이 소개하기" : "다음"}
        </button>
      </div>
    </div>
  );
}

const Example = () => <div className="onb-example">예시 화면</div>;

function ModesMock() {
  return (
    <div style={{ width: "100%", maxWidth: 300 }}>
      <DogAvatarVideo state="idle" height={110} breed="pomeranian" />
      <div className="onb-mock" style={{ marginTop: 6, padding: "6px 14px" }}>
        {[
          ["🐶", "포메라니안", "핵심만 빠르게"],
          ["🐕", "보더콜리", "자료 찾아 꼼꼼하게"],
          ["🦮", "리트리버", "수다 친구처럼"],
        ].map(([icon, name, desc]) => (
          <div key={name} className="onb-mock-row">
            <span style={{ fontSize: 20 }}>{icon}</span>
            <b style={{ minWidth: 76 }}>{name}</b>
            <span className="subtle" style={{ fontSize: 14 }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoMock() {
  return (
    <div className="onb-mock" style={{ textAlign: "left" }}>
      <Example />
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <div className="onb-photo">🐶</div>
        <div style={{ fontWeight: 800, lineHeight: 1.4 }}>사진에서 본 걸 정리했어!</div>
      </div>
      <div className="onb-section">👀 사진에서 본 것</div>
      <div className="onb-section caution">🏥 이럴 땐 병원에</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        <span className="onb-followup">집에서 확인할 것은?</span>
        <span className="onb-followup">병원 가야 할 때는?</span>
      </div>
    </div>
  );
}

function ChatMock() {
  return (
    <div className="onb-mock" style={{ background: "transparent", boxShadow: "none", border: "none" }}>
      <Example />
      <div className="onb-bubble me">산책 30분 했어. 사료도 3만원에 샀어</div>
      <div className="onb-bubble ai">
        둘 다 적어 뒀어!
        <div className="onb-record">🐾 산책 30분 · 건강 기록</div>
        <div className="onb-record">💰 사료 30,000원 · 가계부</div>
      </div>
    </div>
  );
}

function CareMock() {
  return (
    <div style={{ width: "100%", maxWidth: 300 }}>
      <div className="onb-notice">
        <span style={{ fontSize: 20 }}>🔔</span>
        <div style={{ textAlign: "left", lineHeight: 1.4 }}>
          <b>멍케어</b>
          <div className="subtle" style={{ fontSize: 14 }}>산책 갈 시간이에요!</div>
        </div>
      </div>
      <div className="onb-mock">
        <Example />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 4 }}>
          {[
            ["⚖️", "몸무게"],
            ["💧", "물"],
            ["🦮", "산책"],
          ].map(([icon, label]) => (
            <div key={label} className="onb-tile">
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        {[
          ["밥 주기", "08:00", true],
          ["산책", "18:00", false],
        ].map(([t, time, done]) => (
          <div key={t} className="onb-mock-row">
            <span className={`onb-check${done ? " on" : ""}`}>{done ? "✓" : ""}</span>
            <span style={{ flex: 1, textAlign: "left", textDecoration: done ? "line-through" : "none", color: done ? "var(--text-faint)" : "var(--text)" }}>{t}</span>
            <span className="faint">⏰ {time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 강아지 정보: 한 화면에 질문 하나 ──
const STEPS = ["name", "breed", "birthDate", "gender", "weight", "notify", "done"];
const QUESTION_STEPS = 5; // 진행 막대에 보이는 질문 수(name~weight)

function Setup({ onRegistered }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", breed: "", birthDate: "", gender: "", neutered: false, weight: "" });
  const [breedQuery, setBreedQuery] = useState("");
  const [dog, setDog] = useState(null);
  const [notifyStatus, setNotifyStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { user } = useSyncStatus();
  const key = STEPS[step];
  const name = form.name.trim();
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const valid = {
    name: name.length > 0,
    breed: Boolean(form.breed),
    birthDate: Boolean(form.birthDate) && form.birthDate <= todayKey(),
    gender: Boolean(form.gender),
    weight: !form.weight || Number(form.weight) > 0,
  }[key];

  function next() {
    if (key === "weight") {
      // 필수 정보가 다 모였으니 여기서 저장 — 알림 켜기가 이 강아지의 알람까지 서버에 등록하도록
      const created = createDog(form);
      saveDog(created);
      if (created.weight) addWeightRecord(created.id, { weightKg: created.weight, measuredAt: `${todayKey()}T12:00:00`, note: "처음 등록" });
      setDog(created);
    }
    setStep((s) => s + 1);
  }

  async function enablePush() {
    setBusy(true);
    setNotifyStatus("");
    try {
      await subscribeToPush();
      setNotifyStatus("ok");
      setTimeout(() => setStep((s) => s + 1), 700);
    } catch (err) {
      setNotifyStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  const QUESTIONS = {
    name: "안녕! 내 이름은 뭐야?",
    breed: `나는 ${name}! 무슨 견종이야?`,
    birthDate: `${name} 생일은 언제야?`,
    gender: `${josa(name, "은", "는")} 남자야, 여자야?`,
    weight: `지금 ${name} 몸무게는 얼마야?`,
    notify: "밥·산책 시간을 알림으로 알려 줄까?",
    done: `안녕! 나 ${nameCall(name)}.\n앞으로 잘 부탁해!`,
  };

  const filteredBreeds = BREEDS.filter((b) => b.includes(breedQuery.trim())).slice(0, 24);
  const chip = (selected) => ({
    border: "1px solid var(--border)",
    background: selected ? "var(--accent-soft)" : "var(--surface)",
    color: selected ? "var(--accent-strong)" : "var(--text)",
    fontWeight: selected ? 700 : 500,
  });

  return (
    <div className="onb">
      <div className="onb-top">
        {step > 0 && key !== "done" && key !== "notify" ? (
          <button type="button" className="onb-skip" onClick={back}>
            ← 이전
          </button>
        ) : (
          <span />
        )}
        {step < QUESTION_STEPS && (
          <div className="onb-progress" aria-label={`${step + 1}/${QUESTION_STEPS}`}>
            <div style={{ width: `${((step + 1) / QUESTION_STEPS) * 100}%` }} />
          </div>
        )}
      </div>

      <div className="onb-setup">
        <div className="onb-speech">{QUESTIONS[key]}</div>
        <DogAvatarVideo state="idle" height={key === "done" ? 240 : 150} breed="pomeranian" />

        <div className="onb-answer">
          {key === "name" && (
            <input
              autoFocus
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && valid && next()}
              placeholder="예: 콩이"
              maxLength={20}
            />
          )}
          {/* 새 폰: 로그인하면 서버의 기록을 받아 오고, 받은 강아지가 있으면 App이 바로 앱 화면으로 넘긴다(dogcare-synced) */}
          {key === "name" && supabase && !user && (
            <button type="button" className="onb-skip" style={{ display: "block", margin: "14px auto 0", textDecoration: "underline" }} onClick={() => setLoginOpen(true)}>
              예전에 쓰던 기록이 있나요? 로그인해서 불러오기
            </button>
          )}
          {loginOpen && <LoginSheet onClose={() => setLoginOpen(false)} />}

          {key === "breed" && (
            <>
              <input value={breedQuery} onChange={(e) => setBreedQuery(e.target.value)} placeholder="🔍 견종 검색 (예: 푸들)" />
              <div className="onb-chips">
                {filteredBreeds.map((b) => (
                  <button key={b} type="button" className="chip" style={chip(form.breed === b)} onClick={() => update("breed", b)}>
                    {b}
                  </button>
                ))}
                {filteredBreeds.length === 0 && <span className="faint">목록에 없으면 "믹스견"을 골라 주세요.</span>}
              </div>
            </>
          )}

          {key === "birthDate" && (
            <>
              <input type="date" value={form.birthDate} max={todayKey()} onChange={(e) => update("birthDate", e.target.value)} />
              <p className="faint" style={{ marginTop: 6 }}>정확히 모르면 대략적인 날짜도 괜찮아요. 나이에 맞는 케어를 알려 드려요.</p>
            </>
          )}

          {key === "gender" && (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  ["male", "남자 ♂"],
                  ["female", "여자 ♀"],
                ].map(([g, label]) => (
                  <button key={g} type="button" className="chip" style={{ ...chip(form.gender === g), flex: 1, padding: "12px 0" }} onClick={() => update("gender", g)}>
                    {label}
                  </button>
                ))}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <input type="checkbox" checked={form.neutered} onChange={(e) => update("neutered", e.target.checked)} style={{ width: 18, height: 18 }} />
                중성화 했어요
              </label>
            </>
          )}

          {key === "weight" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="number" inputMode="decimal" step="0.1" value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="예: 3.2" />
                <span style={{ fontWeight: 700 }}>kg</span>
              </div>
              <p className="faint" style={{ marginTop: 6 }}>모르면 건너뛰어도 돼요. 사료·알레르기 같은 정보는 나중에 프로필에서 적을 수 있어요.</p>
            </>
          )}

          {key === "notify" && <NotifyStep busy={busy} status={notifyStatus} onEnable={enablePush} />}
        </div>
      </div>

      <div className="onb-bottom">
        {key === "notify" ? (
          <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={() => setStep((s) => s + 1)}>
            나중에 할게요
          </button>
        ) : key === "done" ? (
          <button type="button" className="btn-primary" onClick={() => onRegistered(dog)}>
            {josa(name, "이랑", "랑")} 시작하기
          </button>
        ) : (
          <>
            <button type="button" className="btn-primary" disabled={!valid} onClick={next}>
              다음
            </button>
            {key === "weight" && !form.weight && (
              <button type="button" className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={next}>
                건너뛰기
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// 아이폰은 홈 화면에 추가한 앱에서만 푸시가 와서, 사파리로 열었으면 설치 방법부터 안내한다.
function NotifyStep({ busy, status, onEnable }) {
  if (isIOS() && !isStandalone()) {
    return (
      <div className="onb-mock" style={{ textAlign: "left", lineHeight: 1.7 }}>
        <strong>아이폰은 홈 화면에 추가해야 알림이 와요</strong>
        <div>1. 사파리 아래쪽 공유 버튼 <b>⬆︎</b> 누르기</div>
        <div>2. <b>홈 화면에 추가</b> 누르기</div>
        <div>3. 홈 화면의 멍케어로 열고 알림 켜기</div>
      </div>
    );
  }
  if (!isPushSupported()) return <p className="faint">이 브라우저는 알림을 지원하지 않아요. 나중에 다른 브라우저에서 켤 수 있어요.</p>;
  return (
    <>
      <button type="button" className="btn-primary" onClick={onEnable} disabled={busy || status === "ok"}>
        {status === "ok" ? "알림이 켜졌어요 ✓" : busy ? "켜는 중…" : "🔔 알림 켜기"}
      </button>
      {status && status !== "ok" && <p className="error-text" style={{ marginTop: 8 }}>{status}</p>}
    </>
  );
}
