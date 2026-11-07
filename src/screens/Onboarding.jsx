import { useEffect, useRef, useState } from "react";
import { createDog } from "../models/dog";
import { getDogs, saveDog, setActiveDogId } from "../services/dogRepository";
import { addWeightRecord } from "../services/weightLog";
import { BREEDS } from "../data/breeds";
import { josa, nameCall } from "../utils/text";
import { todayKey } from "../utils/date";
import { localNow } from "../services/records";
import DogAvatarVideo from "../components/DogAvatarVideo";
import { BottomSheet, EmailLogin, LoginForm, LoginSheet, PolicyLine, useSyncStatus } from "../components/AccountCard";
import SpeechBubble from "../components/SpeechBubble";
import { supabase } from "../services/supabase";
import { readJSON, writeJSON } from "../services/storage";
import { acceptInvite } from "../services/sync/family";

import Ico from "../components/Ico";
// 첫 실행 온보딩: ① 로그인(또는 로그인 없이) → ② 앱 소개 2장(옆으로 넘김) → ③ 강아지 정보를 한 화면에 하나씩(이름 아래 가족 초대 코드) → ④ 인사. 알림 허락은 첫 하루 체크 뒤(NotifyAsk).
// 로그인해서 서버에 강아지가 있으면 App이 바로 앱 화면으로 넘긴다(dogcare-synced). 게스트도 나중에 설정에서 로그인할 수 있다.
// 도중에 앱을 꺼도 이어서 하도록 진행 상태를 저장하고(PROGRESS_KEY), 강아지가 저장되면 지운다.
// skipIntro: 강아지를 모두 지운 뒤 다시 등록할 때는 소개를 건너뛴다.
// 소개는 2장(방향 A, 2026-11-07): NN/g 실험 — 소개를 건너뛴 쪽이 성공률·쉬움 점수가 더 높음, Apple HIG — 짧고 건너뛸 수 있게.
// 한 장 = 한 약속, 그림 속 내용은 "예시"로 표시, 마지막 버튼은 첫 행동. 근거: ../자료용/자료/2026-11-07-온보딩-2장.md
// 빠진 내용은 제자리에서 안내: 말로 기록=입력줄 예시, 출처=정보 카드·수치마다, 손동작=도움말
const SLIDES = [
  { title: "“평소엔 어땠어요?”", text: "병원에서 이 질문을 받으면\n멍케어를 보여 주세요." },
  { title: "하루 10초, 다른 날만", text: "평소와 같으면 한 번만 누르고, 다르면 그것만.\n말로 해도 알아서 기록해요." },
];
const SLIDE_VISUALS = [VetMock, DailyMock];


const PROGRESS_KEY = "dogcare-onboarding-v1";
const loadProgress = () => readJSON(PROGRESS_KEY, null) || {};
const saveProgress = (patch) => writeJSON(PROGRESS_KEY, { ...loadProgress(), ...patch });
const clearProgress = () => writeJSON(PROGRESS_KEY, null);

export default function Onboarding({ onRegistered, skipIntro = false }) {
  const [phase, setPhase] = useState(() => (skipIntro ? "setup" : loadProgress().phase || (supabase ? "login" : "intro")));
  const { user } = useSyncStatus();
  // 로그인 화면에서 로그인됨(카카오에서 돌아와 앱이 새로 켜진 경우 포함) → 소개로
  const current = phase === "login" && user ? "intro" : phase;
  useEffect(() => {
    if (!skipIntro) saveProgress({ phase: current });
  }, [current, skipIntro]);
  const done = (dog) => (clearProgress(), onRegistered(dog));
  if (current === "login") return <Login onGuest={() => setPhase("intro")} />;
  if (current === "intro") return <Intro onDone={() => setPhase("setup")} />;
  return <Setup onRegistered={done} restore={!skipIntro} />;
}

// 로그인 첫 화면: 강아지 + 한 줄 인사, 버튼은 카카오·이메일 두 개만. 이메일과 "로그인 없이"는 밑에서 올라오는 시트로
function Login({ onGuest }) {
  const [sheet, setSheet] = useState(null); // null | "email" | "guest"
  return (
    <div className="onb">
      <div className="login-hero">
        <SpeechBubble>안녕! 나랑 같이 시작해 볼래? 🐾</SpeechBubble>
        <DogAvatarVideo state="idle" height={210} breed="pomeranian" />
        <div className="onb-title" style={{ marginBottom: 6 }}>멍케어</div>
        <p className="onb-text" style={{ margin: "0 auto" }}>우리 아이 기록·알림·일정을 한곳에</p>
      </div>
      <div className="login-bottom">
        <LoginForm onEmail={() => setSheet("email")} />
        <button type="button" className="link-btn login-guest" onClick={() => setSheet("guest")}>
          로그인 없이 둘러보기
        </button>
        <PolicyLine />
      </div>
      {sheet === "email" && (
        <BottomSheet title="이메일로 계속하기" onClose={() => setSheet(null)}>
          <EmailLogin />
        </BottomSheet>
      )}
      {sheet === "guest" && (
        <BottomSheet title="로그인 없이 시작할까요?" onClose={() => setSheet(null)}>
          <ul className="login-guest-list">
            <li><Ico name="lock" size={18} className="cat-ico tone-teal" /> 기록은 이 폰에만 저장돼요</li>
            <li><Ico name="alert" size={18} className="cat-ico tone-rose" /> 앱을 지우거나 폰을 바꾸면 기록이 사라질 수 있어요</li>
            <li><Ico name="users" size={18} className="cat-ico tone-violet" /> 가족과 함께 보려면 로그인이 필요해요</li>
            <li><Ico name="settings" size={18} className="cat-ico tone-blue" /> 나중에 설정에서 언제든 로그인할 수 있어요</li>
          </ul>
          <button type="button" className="btn-primary" onClick={onGuest}>
            그래도 시작하기
          </button>
          <button type="button" className="btn-ghost" onClick={() => setSheet(null)}>
            로그인할게요
          </button>
        </BottomSheet>
      )}
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

// 1장: 병원용 기록 한 장(예시) — 하루 체크가 모여 "평소엔요?"에 답이 된다
function VetMock() {
  return (
    <div className="onb-mock" style={{ textAlign: "left" }}>
      <Example />
      <div style={{ fontWeight: 800, marginBottom: 8 }}><Ico name="clipboard" size={16} /> 병원용 기록</div>
      <div className="onb-mock-row"><Ico name="check" size={15} className="cat-ico tone-teal" /><span style={{ flex: 1 }}>최근 30일 — 평소 26일 · 다른 날 4일</span></div>
      <div className="onb-mock-row"><Ico name="bowl" size={15} className="cat-ico tone-rose" /><span style={{ flex: 1 }}>밥 남긴 날 3일째 (11/3부터)</span></div>
      <div className="onb-mock-row"><Ico name="scales" size={15} className="cat-ico tone-blue" /><span style={{ flex: 1 }}>몸무게 2.4 → 3.0kg</span></div>
      <div className="faint" style={{ fontSize: 12, marginTop: 8 }}>진단하지 않아요 · 참고 수치엔 수의학 자료 출처를 밝혀요</div>
    </div>
  );
}

// 2장: 강아지가 묻는 하루 체크(예시) + 말로 기록
function DailyMock() {
  return (
    <div style={{ width: "100%", maxWidth: 300 }}>
      <div className="onb-mock">
        <Example />
        <div style={{ fontWeight: 800, marginBottom: 10 }}>오늘 나 어땠어?</div>
        <div className="dc-btns">
          <span className="dc-usual" aria-hidden="true"><Ico name="check" size={16} /> 평소와 같아요</span>
          <span className="dc-diff" aria-hidden="true">다른 게 있었어요</span>
        </div>
      </div>
      <div className="onb-bubble me" style={{ marginTop: 12 }}>산책 30분 했어</div>
    </div>
  );
}

// ── 강아지 정보: 한 화면에 질문 하나 ──
// 알림 허락은 첫 하루 체크 뒤 오늘 탭 말풍선에서 묻는다(NotifyAsk)
const STEPS = ["name", "breed", "birthDate", "gender", "weight", "done"];
const QUESTION_STEPS = 5; // 진행 막대에 보이는 질문 수(name~weight)

function Setup({ onRegistered, restore }) {
  const saved = restore ? loadProgress() : {};
  const [step, setStep] = useState(saved.step || 0);
  const [form, setForm] = useState(saved.form || { name: "", breed: "", birthDate: "", ageEstimated: false, gender: "", neutered: false, weight: "" });
  const [breedQuery, setBreedQuery] = useState("");
  const [invite, setInvite] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [dog, setDog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { user } = useSyncStatus();
  const key = STEPS[step];
  const name = form.name.trim();
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const joining = key === "name" && invite.trim().length > 0;

  // 강아지를 저장하기 전(이름~몸무게)까지만 이어 하기용으로 저장. 저장한 뒤엔 App이 앱 화면으로 연다
  useEffect(() => {
    if (restore && STEPS.indexOf(key) <= STEPS.indexOf("weight")) saveProgress({ step, form });
  }, [restore, step, form, key]);

  // 초대 코드로 가족 강아지와 연결: 서버가 코드를 확인하고 가족으로 넣으면, 그 강아지 기록 전체를 받아 와 바로 연다(새 강아지는 만들지 않음)
  async function joinFamily() {
    setInviteError("");
    if (!user) {
      setInviteError("초대 코드로 연결하려면 먼저 로그인해 주세요.");
      setLoginOpen(true);
      return;
    }
    setBusy(true);
    try {
      const petId = await acceptInvite(invite);
      setActiveDogId(petId);
      const joined = getDogs().find((d) => d.id === petId);
      if (joined) onRegistered(joined);
      else setInviteError("연결됐어요! 다만 보호자 폰에서 아직 강아지 정보가 백업되지 않았어요. 보호자가 앱을 한 번 열면 자동으로 나타나요.");
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const valid = {
    name: name.length > 0,
    breed: Boolean(form.breed),
    birthDate: Boolean(form.birthDate) && form.birthDate <= todayKey(),
    gender: Boolean(form.gender),
    weight: !form.weight || (Number(form.weight) > 0 && Number(form.weight) < 120), // 프로필 편집과 같은 범위
  }[key];

  function next() {
    if (key === "weight") {
      // 필수 정보가 다 모였으니 여기서 저장
      const created = createDog(form);
      saveDog(created);
      if (created.weight) addWeightRecord(created.id, { weightKg: created.weight, measuredAt: `${localNow()}:00`, note: "처음 등록" });
      setDog(created);
      if (restore) clearProgress();
    }
    setStep((s) => s + 1);
  }



  const QUESTIONS = {
    name: "안녕! 내 이름은 뭐야?",
    breed: `나는 ${name}! 무슨 견종이야?`,
    birthDate: `${name} 생일은 언제야?`,
    gender: `${josa(name, "은", "는")} 남자야, 여자야?`,
    weight: `지금 ${name} 몸무게는 얼마야?`,
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
        {step > 0 && key !== "done" ? (
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
              onKeyDown={(e) => e.key === "Enter" && valid && !joining && next()}
              placeholder="예: 콩이"
              maxLength={20}
            />
          )}
          {key === "name" && supabase && (
            <div style={{ marginTop: 18, textAlign: "left" }}>
              <label htmlFor="onb-invite" style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
                가족 초대 코드 <span className="faint">(선택)</span>
              </label>
              <input
                id="onb-invite"
                value={invite}
                onChange={(e) => (setInvite(e.target.value.toUpperCase()), setInviteError(""))}
                placeholder="가족에게 받은 초대 코드를 입력해 주세요"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={12}
                style={{ letterSpacing: invite ? "0.15em" : undefined }}
              />
              <p className="faint" style={{ margin: "6px 0 0" }}>초대 코드가 있으신가요? 입력하면 가족이 관리 중인 강아지와 연결할 수 있어요.</p>
              {inviteError && <p className="error-text" style={{ marginTop: 6 }}>{inviteError}</p>}
            </div>
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
              <input value={breedQuery} onChange={(e) => setBreedQuery(e.target.value)} placeholder="견종 검색 (예: 푸들)" />
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
              <label className="rec-check" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={Boolean(form.ageEstimated)} onChange={(e) => update("ageEstimated", e.target.checked)} />
                정확하지 않은 추정 날짜예요
              </label>
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
              {form.weight && !valid && <p className="error-text" style={{ marginTop: 6 }}>0.1~120kg 사이로 적어 주세요.</p>}
              <p className="faint" style={{ marginTop: 6 }}>모르면 건너뛰어도 돼요. 사료·알레르기 같은 정보는 나중에 우리 아이 탭에서 적을 수 있어요.</p>
            </>
          )}

        </div>
      </div>

      <div className="onb-bottom">
        {key === "done" ? (
          <button type="button" className="btn-primary" onClick={() => onRegistered(dog)}>
            {josa(name, "이랑", "랑")} 시작하기
          </button>
        ) : (
          <>
            {joining ? (
              <button type="button" className="btn-primary" disabled={busy} onClick={joinFamily}>
                {busy ? "확인하는 중…" : "가족 강아지와 연결하기"}
              </button>
            ) : (
              <button type="button" className="btn-primary" disabled={!valid} onClick={next}>
                다음
              </button>
            )}
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

