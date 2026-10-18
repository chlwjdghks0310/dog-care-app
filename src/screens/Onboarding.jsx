import { useRef, useState } from "react";
import { createDog } from "../models/dog";
import { saveDog } from "../services/dogRepository";
import { addWeightRecord } from "../services/weightLog";
import { BREEDS } from "../data/breeds";
import { isPushSupported, subscribeToPush } from "../services/notifications";
import { josa, nameCall } from "../utils/text";
import { todayKey } from "../utils/date";
import DogAvatarVideo from "../components/DogAvatarVideo";

// 첫 실행 온보딩: ① 앱 소개 3장(옆으로 넘김) → ② 강아지 정보를 한 화면에 하나씩 → ③ 알림 켜기 → ④ 인사.
// skipIntro: 강아지를 모두 지운 뒤 다시 등록할 때는 소개를 건너뛴다.
const SLIDES = [
  { title: "우리 강아지가 직접 말해 줘요", text: "궁금한 걸 물어보면 AI 강아지가 우리 아이 정보에 맞춰 답해 줘요." },
  { title: "오늘 챙길 일을 알려 줘요", text: "나이·견종에 맞춘 할 일과 밥·산책 시간을 알림으로 챙겨 줘요." },
  { title: "말만 하면 기록돼요", text: "채팅으로 말하면 가계부·일정·체중에 알아서 적어 줘요." },
];

const isStandalone = () => window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);

export default function Onboarding({ onRegistered, skipIntro = false }) {
  const [phase, setPhase] = useState(skipIntro ? "setup" : "intro");
  return phase === "intro" ? <Intro onDone={() => setPhase("setup")} /> : <Setup onRegistered={onRegistered} />;
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
            <div className="onb-visual">{i === 0 ? <DogAvatarVideo state="idle" height={220} breed="pomeranian" /> : i === 1 ? <ChecklistMock /> : <ChatMock />}</div>
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
          {last ? "시작하기" : "다음"}
        </button>
      </div>
    </div>
  );
}

function ChecklistMock() {
  return (
    <div className="onb-mock">
      {[
        ["밥 주기", "08:00", true],
        ["산책", "18:00", false],
        ["양치", "21:00", false],
      ].map(([t, time, done]) => (
        <div key={t} className="onb-mock-row">
          <span className={`onb-check${done ? " on" : ""}`}>{done ? "✓" : ""}</span>
          <span style={{ flex: 1, textDecoration: done ? "line-through" : "none", color: done ? "var(--text-faint)" : "var(--text)" }}>{t}</span>
          <span className="faint">⏰ {time}</span>
        </div>
      ))}
    </div>
  );
}

function ChatMock() {
  return (
    <div className="onb-mock" style={{ background: "transparent", boxShadow: "none", border: "none" }}>
      <div className="onb-bubble me">오늘 사료 3만원 샀어</div>
      <div className="onb-bubble ai">
        가계부에 적어 뒀어!
        <div className="onb-record">📝 사료 30,000원 · 오늘</div>
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
