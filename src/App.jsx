import { Fragment, Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { getDogs, deleteDog, getActiveDogId, setActiveDogId } from "./services/dogRepository";
import { getTodayChecklist } from "./services/careEngine";
import { checkAndNotify, checkCustomAlarms, checkFeedingSoakReminders, checkMedAlarms, registerServiceWorker, syncPushAlarms } from "./services/notifications";
import { getFeedingSettings } from "./services/feedingSettings";
import { allowed } from "./services/notifPrefs";
import { getCustomSchedules } from "./services/customSchedules";
import { syncEventAlarms } from "./services/calendarEvents";
import { applyFixedExpenses } from "./services/expenses";
import { getSoakGuidance } from "./data/feedingGuide";
import { calculateAge } from "./utils/age";
import { todayKey } from "./utils/date";
import BottomNav, { TABS } from "./components/BottomNav";
import Onboarding from "./screens/Onboarding";
import InstallGate, { needsInstall } from "./screens/InstallGate";
import DogRegister from "./screens/DogRegister";
import Home from "./screens/Home";
import Puppy100 from "./screens/Puppy100";
import ThisWeek from "./screens/ThisWeek";
import Calendar from "./screens/Calendar";
import Info from "./screens/Info";
import Profile from "./screens/Profile";
import HealthHub from "./screens/HealthHub";
import HealthCheck from "./screens/HealthCheck";
import BehaviorCheck from "./screens/BehaviorCheck";
import FeedingPlan from "./screens/FeedingPlan";
import AlarmSettings from "./screens/AlarmSettings";
import WeightTracker from "./screens/WeightTracker";
import Budget from "./screens/Budget";
import Medications from "./screens/Medications";
import VetSummary from "./screens/VetSummary";
import WeeklyReport from "./screens/WeeklyReport";
import Records from "./screens/Records";
import { dateAt } from "./services/records";
import Gallery from "./screens/Gallery";
import VitalDetail from "./screens/VitalDetail";
import DogSwitcherSheet from "./components/DogSwitcherSheet";
import SwipeBack from "./components/SwipeBack";
import PullToRefresh from "./components/PullToRefresh";
import { applyTheme, applyColor } from "./services/themeSettings";
import { startSync, syncNow } from "./services/sync";
import { isEditing } from "./services/beta";
import WhatsNew from "./components/WhatsNew";
import ErrorBoundary from "./components/ErrorBoundary";

const PARENT_TAB = {
  home: "main", // 오늘 할 일(옛 체크리스트 탭)은 오늘 탭 안으로
  week: "main",
  feeding: "main",
  alarms: "main",
  info: "main",
  puppy: "main", // 퍼피 100일 훈련 화면(11/9) — 오늘 탭 띠에서 열림
  health: "hospital", // 건강 체크(변·컨디션)는 병원 탭에서(사용자 요청 11/7)
  "health-stool": "hospital",
  "health-behavior": "hospital",
  "records-new": "records",
  "records-meds": "records",
  "records-gallery": "records", // 기록 탭에서 연 성장 추억 — 나가면 기록 화면으로(11/7)
  "records-feeding": "records", // 식사 기록 → 사료 계산기(사용자 제안 11/7) // 새 기록 → 복약도 기록 탭 안에서(사용자 요청 11/7 — 다른 종류처럼 뒤로 가면 종류 고르기로)
  vet: "hospital",
  budget: "hospital",
  "add-dog": "profile",
  gallery: "profile", // 아이 갤러리(11/7)
  weight: "profile",
  meds: "profile",
  report: "profile",
  vital: "profile",
};
// 세부 화면에서 뒤로 갔을 때(뒤로 버튼·오른쪽 스와이프) 돌아갈 화면
const MAIN_SUB = ["week", "feeding", "alarms", "info"];
const BACK_OF = { ...PARENT_TAB, "records-meds": "records-new", "records-gallery": "records-new", "records-feeding": "records-new", ...Object.fromEntries(MAIN_SUB.map((k) => [k, "home"])), "health-stool": "health", "health-behavior": "health" };

// 메인 화면은 three.js(3D 아바타)를 포함해 번들이 커서, 실제로 탭을 열 때만 불러온다.
const Main = lazy(() => import("./screens/Main"));

// 렌더링 전에 바로 적용해서 기본 테마가 잠깐 보였다가 바뀌는 깜빡임을 막는다.
applyColor();
applyTheme();

export default function App() {
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState("onboarding");
  const [tab, _setTab] = useState("main"); // 앱을 열면 비서부터(말풍선에 오늘 요약, 누르면 프로필)
  const [mainResetSignal, setMainResetSignal] = useState(0);
  const [chatReading, setChatReading] = useState(false); // 비서 답변을 읽느라 아래로 스크롤하면 하단 탭을 내려 화면을 넓게
  const [dogSwitcherOpen, setDogSwitcherOpen] = useState(false);
  const [medFocus, setMedFocus] = useState(null);
  const [recordsOpts, setRecordsOpts] = useState({}); // 전체 기록을 열 때 고른 종류 / 바로 적을 종류
  // 뒤로 가면 보던 자리로(11/10): 세부 화면을 열면 탭 화면이 사라져 스크롤이 0으로 돌아가므로, 스크롤할 때마다 위치를 기억해 두고 돌아오면 되돌린다
  const scrollPosRef = useRef({});
  // 화면을 바꾸기 직전(아직 DOM이 그대로일 때) 모든 탭 페이지의 스크롤 위치를 저장한다
  const setTab = useCallback((next) => {
    // 실제로 스크롤되는 건 페이지 안의 .screen(탭 화면)이라 그것부터 본다
    for (const pg of document.querySelectorAll(".pager-page")) {
      const el = [...pg.querySelectorAll(".screen"), pg].find((x) => x.scrollTop > 0);
      if (el) scrollPosRef.current[pg.dataset.tab] = el.scrollTop;
    }
    _setTab(next);
  }, []);
  useLayoutEffect(() => {
    if (PARENT_TAB[tab]) return;
    const pg = pagerRef.current?.querySelector(`.pager-page[data-tab="${tab}"]`);
    const y = scrollPosRef.current[tab];
    if (!pg || !(y > 0)) return;
    // 화면이 처음엔 짧게 그려졌다가(사진·달력이 뒤늦게 자리 잡음) 길어지므로, 높이가 바뀔 때마다 다시 맞추고 한 번 맞으면 그만둔다(최대 1.5초)
    let done = false;
    const apply = () => {
      if (done) return;
      const el = pg.querySelector(".screen") || pg;
      el.scrollTop = y;
      if (Math.abs(el.scrollTop - y) < 2) done = true;
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    const watch = () => { const el = pg.querySelector(".screen"); if (ro && el) { ro.disconnect(); ro.observe(el); for (const c of el.children) ro.observe(c); } };
    watch();
    const mo = new MutationObserver(() => (watch(), apply()));
    mo.observe(pg, { childList: true, subtree: true });
    const timers = [60, 200, 500, 900].map((ms) => setTimeout(apply, ms));
    const stop = setTimeout(() => (done = true, ro?.disconnect(), mo.disconnect()), 1500);
    return () => (done = true, ro?.disconnect(), mo.disconnect(), timers.forEach(clearTimeout), clearTimeout(stop));
  }, [tab]);
  const [vitalMetric, setVitalMetric] = useState(null);
  const [vetDocSignal, setVetDocSignal] = useState(0);
  // 인터넷 연결(비행기 모드 등) — 끊기면 위에 한 줄 안내. 기록은 원래 폰에 저장돼서 그대로 쓴다
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => (window.removeEventListener("online", on), window.removeEventListener("offline", off));
  }, []);
  const [vetFrom, setVetFrom] = useState("hospital"); // 병원용 기록을 연 곳(주간 리포트·우리 아이·병원) — 뒤로 가면 거기로
  const openVet = (from) => (setVetFrom(from), setTab("vet"));
  // 어디서나 + 버튼(QuickAddFab)
  const quickAdd = (kind) =>
    kind === "check" ? setTab("main") : kind === "record" ? (setRecordsOpts({}), setTab("records-new")) : kind === "doc" ? (setVetDocSignal((n) => n + 1), setTab("hospital")) : setTab("weight"); // 병원 다녀온 뒤 알림으로 열리면 진료 정리 창을 띄운다 // 복용 알림을 눌러 들어왔을 때 보여 줄 복용 건

  // 메인 탭이 이미 열려 있는 상태에서 메인을 또 누르면(채팅 중이어도) 메인 화면으로 리셋한다.
  function handleTabChange(key) {
    // 하단 탭을 눌렀다는 건 손가락이 화면(페이저)에 없다는 뜻 — 새로고침 중 화면이 다시 그려져 '손 뗌'을 놓친 경우에도 탭 이동이 막히지 않게(11/7 버그)
    touchingRef.current = false;
    if (key === "main" && tab === "main") {
      setMainResetSignal((s) => s + 1);
    }
    if (key === "records") setRecordsOpts({}); // 기록 탭을 직접 누르면 고른 종류 없이 전체 기록
    if ((PARENT_TAB[tab] || tab) === key) alignPager(); // 이미 그 탭이면 화면 위치만 다시 맞춘다(하단 탭과 화면이 어긋났을 때 눌러서 바로잡기)
    setTab(key);
  }

  // 하단 탭(TABS) 안에서 들어가는 세부 화면들 — 같은 페이지 칸에 그려지고, 하단 탭 표시도 부모를 따른다.
  const pageKey = PARENT_TAB[tab] || tab;
  const pageIndex = TABS.findIndex((t) => t.key === pageKey);
  const pagerRef = useRef(null);
  const touchingRef = useRef(false);
  const settleTimerRef = useRef(null);
  const [pageVersion, setPageVersion] = useState(0);
  // 11/11 점검 #3: 자정을 넘겨 돌아오면 어제 날짜로 동작하던 것 → 날짜가 바뀌면(적는 중이 아닐 때) 화면을 새로 그린다
  const dayRef = useRef(todayKey());
  useEffect(() => {
    const check = () => {
      if (todayKey() === dayRef.current || isEditing()) return;
      dayRef.current = todayKey();
      setPageVersion((v) => v + 1);
    };
    const id = setInterval(check, 60 * 1000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("pageshow", check);
    return () => (clearInterval(id), document.removeEventListener("visibilitychange", check), window.removeEventListener("pageshow", check));
  }, []);
  // 11/11 점검 #4: 저장 실패(개인정보 모드·용량 초과)를 한 줄로 알린다
  const [storageWarn, setStorageWarn] = useState(false);
  useEffect(() => {
    let t;
    const on = () => (setStorageWarn(true), clearTimeout(t), (t = setTimeout(() => setStorageWarn(false), 6000)));
    window.addEventListener("dogcare-storage-error", on);
    return () => (clearTimeout(t), window.removeEventListener("dogcare-storage-error", on));
  }, []);

  useEffect(() => {
    setPageVersion((v) => v + 1);
    window.scrollTo(0, 0); // 혹시 문서가 밀려 있었어도(키보드 등) 다른 탭 위쪽이 잘리지 않게
  }, [pageKey]);

  const [visibleIndex, setVisibleIndex] = useState(pageIndex);
  // 보이는 화면을 현재 탭 위치에 맞춘다(손가락으로 끄는 중엔 건드리지 않음). 하단 탭 표시도 같이 맞춘다.
  // 아이폰은 앱을 켤 때 위치 지정을 무시하거나, 와이파이가 끊겼다 붙어 화면이 다시 그려질 때 위치를 맨 앞(비서)으로 되돌릴 때가 있어
  // — 하단 탭은 프로필인데 화면은 비서가 되는 문제 — 켤 때·돌아올 때·연결이 바뀔 때·크기가 바뀔 때마다 다시 맞춘다.
  const pageIndexRef = useRef(pageIndex);
  pageIndexRef.current = pageIndex;
  const alignPager = useCallback(() => {
    const el = pagerRef.current;
    const page = el?.children[pageIndexRef.current];
    if (!page || touchingRef.current) return;
    if (Math.abs(el.scrollLeft - page.offsetLeft) > 2) el.scrollLeft = page.offsetLeft;
    setVisibleIndex(pageIndexRef.current);
  }, []);
  useLayoutEffect(alignPager, [pageIndex, loading, route, pageVersion, alignPager]);
  useEffect(() => {
    const el = pagerRef.current;
    if (!el) return;
    // 처음 몇 프레임은 레이아웃이 덜 잡혀 무시될 수 있어 여러 번
    const frames = [requestAnimationFrame(() => requestAnimationFrame(alignPager))];
    const timers = [100, 400, 1000].map((ms) => setTimeout(alignPager, ms));
    const onVisible = () => document.visibilityState === "visible" && alignPager();
    const events = ["resize", "orientationchange", "online", "offline", "pageshow", "dogcare-synced"];
    events.forEach((e) => window.addEventListener(e, alignPager));
    document.addEventListener("visibilitychange", onVisible);
    const ro = new ResizeObserver(alignPager);
    ro.observe(el);
    // 손 뗌은 화면 어디서든 받는다: 당겨서 새로고침하면 손가락 아래 화면이 새로 그려져 페이저가 touchend를 못 받는 일이 있다
    const release = () => (touchingRef.current = false);
    window.addEventListener("touchend", release, true);
    window.addEventListener("touchcancel", release, true);
    return () => {
      frames.forEach(cancelAnimationFrame);
      timers.forEach(clearTimeout);
      events.forEach((e) => window.removeEventListener(e, alignPager));
      document.removeEventListener("visibilitychange", onVisible);
      ro.disconnect();
      window.removeEventListener("touchend", release, true);
      window.removeEventListener("touchcancel", release, true);
    };
  }, [loading, route, alignPager]);

  // 스와이프가 멈추면(스냅 완료) 보이는 페이지를 현재 탭으로
  function settlePage() {
    clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      const el = pagerRef.current;
      if (!el || touchingRef.current || el.children.length < 2) return;
      const step = el.children[1].offsetLeft - el.children[0].offsetLeft;
      const key = TABS[Math.max(0, Math.min(TABS.length - 1, Math.round(el.scrollLeft / step)))].key;
      setTab((cur) => ((PARENT_TAB[cur] || cur) === key ? cur : key));
    }, 120);
  }
  // 하단 탭 표시는 끄는 도중에도 화면 절반을 넘는 순간 바로 바뀌게
  function handlePagerScroll() {
    const el = pagerRef.current;
    if (el && el.children.length > 1) setVisibleIndex(Math.round(el.scrollLeft / (el.children[1].offsetLeft - el.children[0].offsetLeft)));
    settlePage();
  }
  function handlePagerTouchEnd() {
    touchingRef.current = false;
    settlePage();
  }

  // 화면에 보여줄 강아지를 바꿀 때마다(전환·추가·수정) 항상 이 함수로 통일한다 —
  // "마지막으로 보던 강아지"가 새로고침 후에도 그대로 유지되도록 같이 저장해준다.
  function setActiveDog(d) {
    setDog(d);
    if (d) setActiveDogId(d.id);
  }

  // 아래로 당겨 새로고침: 로그인했으면 이 폰 기록을 백업하고 가족이 적은 기록을 받아 온 뒤, 열려 있는 강아지 화면을 다시 그린다
  async function handleRefresh() {
    await syncNow();
    const fresh = getDogs().find((d) => d.id === dog?.id);
    if (fresh) setDog(fresh);
    touchingRef.current = false;
    setPageVersion((v) => v + 1);
  }

  // 강아지 추가 — 기존 강아지는 그대로 두고 새 강아지를 등록한 뒤, 그 강아지로 바로 전환한다.
  function handleAddDog(newDog) {
    setActiveDog(newDog);
    setTab("profile");
  }

  // 지금 보고 있는 강아지만 삭제 — 남은 강아지가 있으면 그중 하나로 전환, 없으면 등록 화면으로.
  function handleDeleteCurrentDog() {
    const remaining = getDogs().filter((d) => d.id !== dog.id);
    deleteDog(dog.id);
    if (remaining.length > 0) {
      setActiveDog(remaining[0]);
      setTab("main");
    } else {
      setDog(null);
      setActiveDogId(null);
      setTab("main");
      setRoute("register");
    }
  }

  // 전체 삭제 — 등록된 강아지를 전부 지우고 등록 화면으로 돌아간다(기존 "로그아웃"에 해당).
  function handleDeleteAllDogs() {
    for (const d of getDogs()) deleteDog(d.id);
    setDog(null);
    setActiveDogId(null);
    setTab("main");
    setRoute("register");
  }

  // 등록된 강아지들 중 다음 강아지로 순서대로 토글한다(바텀내비 프로필 빠르게 두 번 탭).
  function handleToggleNextDog() {
    const dogs = getDogs();
    if (dogs.length < 2) return;
    const idx = dogs.findIndex((d) => d.id === dog.id);
    const next = dogs[(idx + 1) % dogs.length];
    // 인스타그램 계정 전환처럼 지금 화면은 왼쪽으로 밀려나고 다음 강아지 화면이 오른쪽에서 들어온다.
    // View Transitions(iOS 18+ 사파리)로 이전·다음 화면을 함께 움직이고, 없으면 새 화면만 오른쪽에서 밀어 넣는다.
    if (document.startViewTransition) {
      document.startViewTransition(() => flushSync(() => setActiveDog(next)));
    } else {
      setActiveDog(next);
      pagerRef.current?.animate([{ transform: "translateX(100%)" }, { transform: "translateX(0)" }], { duration: 320, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    }
  }

  function handleBottomNavLongPress(key) {
    if (key === "profile") setDogSwitcherOpen(true);
  }

  function handleBottomNavDoubleTap(key) {
    if (key === "profile") handleToggleNextDog();
  }

  // 복용 알림 주소(/?dog=..&dose=..)로 열리면 그 강아지의 약 관리 화면, 해당 복용 건으로
  function openFromUrl(url) {
    const params = new URL(url, location.origin).searchParams;
    // 저녁 체크인 알림(/?checkin=1) → 비서 첫 화면에서 체크인 창
    if (params.get("checkin")) {
      setTab("main");
      return true;
    }
    // 병원 전날 알림(/?vet=1) → 병원용 기록, 다녀온 뒤 알림(/?vetdoc=1) → 병원 탭 진료 정리
    if (params.get("vet") || params.get("vetdoc")) {
      const d = getDogs().find((x) => x.id === params.get("dog"));
      if (d) setActiveDog(d);
      if (params.get("vetdoc")) setVetDocSignal((n) => n + 1);
      setTab(params.get("vet") ? "vet" : "hospital");
      return true;
    }
    // 주간 리포트 알림(/?report=1&dog=..) → 그 강아지의 이번 주 리포트
    if (params.get("report")) {
      const d = getDogs().find((x) => x.id === params.get("dog"));
      if (d) setActiveDog(d);
      setTab("report");
      return true;
    }
    const target = getDogs().find((d) => d.id === params.get("dog"));
    if (!target || !params.get("dose")) return false;
    setActiveDog(target);
    setMedFocus(params.get("dose"));
    setTab("meds");
    return true;
  }

  useEffect(() => {
    const dogs = getDogs();
    if (dogs.length > 0) {
      const activeId = getActiveDogId();
      setActiveDog(dogs.find((d) => d.id === activeId) || dogs[0]);
      setRoute("app");
      if (openFromUrl(location.href)) history.replaceState(null, "", "/");
    }
    setLoading(false);
    // 로그인했으면 서버와 기록 맞추기 시작. 다른 폰(가족·새 폰)에서 받은 게 있으면 화면을 새로 그린다
    startSync();
    const onSynced = () => {
      const list = getDogs();
      if (!list.length) {
        // 가족 공유에서 나가거나 내보내져 남은 강아지가 없으면 등록 화면으로(로그인 직후 빈 계정이면 그대로 둠)
        setDog((cur) => {
          if (cur) setRoute("register");
          return null;
        });
        return;
      }
      // 초대 코드로 막 연결한 강아지가 있으면 그 강아지(setActiveDogId)를 먼저 보여 준다
      setDog((cur) => list.find((d) => d.id === getActiveDogId()) || list.find((d) => d.id === cur?.id) || list[0]);
      setRoute("app");
      // 적는 중(기록 폼·글자 입력 중·시트 열림)이면 새로 그리지 않는다 — 탭을 바꾸면 어차피 pageKey effect가 새로 그린다
      if (isEditing()) return;
      setPageVersion((v) => v + 1);
    };
    window.addEventListener("dogcare-synced", onSynced);
    // 앱이 이미 켜져 있을 때 알림을 누르면 서비스워커가 주소를 보내 준다
    const onMessage = (e) => e.data?.type === "open-url" && openFromUrl(e.data.url);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("dogcare-synced", onSynced);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, []);

  // 앱이 켜져 있는 동안, 등록된 모든 강아지의 오늘 일정 권장 시간대가 되면 알림을 띄운다
  // (지금 화면에 보여주고 있는 강아지만이 아니라 전부 다).
  useEffect(() => {
    if (!dog) return;
    registerServiceWorker();
    const timer = setInterval(() => {
      const dateKey = todayKey();
      const now = new Date().toTimeString().slice(0, 5);
      const on = (cat) => allowed(cat, now); // 알림 종류·조용한 시간(알림·알람 설정)
      for (const d of getDogs()) {
        if (on("care")) checkAndNotify(d, getTodayChecklist(d, dateKey), dateKey);
        const feedingSettings = getFeedingSettings(d.id);
        if (on("meal") && feedingSettings.times.length > 0) {
          const age = calculateAge(d.birthDate);
          const soak = getSoakGuidance(age.ageInWeeks);
          checkFeedingSoakReminders(d, feedingSettings.times, soak.needed === true, dateKey);
        }
        if (on("custom")) checkCustomAlarms(d, getCustomSchedules(d.id), dateKey);
        if (on("med")) checkMedAlarms(d, dateKey);
      }
    }, 30 * 1000);
    // 앱을 열 때와 백그라운드로 보낼 때마다 최신 알람 목록을 서버에 보내, 앱이 꺼져 있어도 서버가 푸시를 쏘게 한다.
    for (const d of getDogs()) syncEventAlarms(d.id); // 반복 일정 알림을 다음 회차로
    for (const d of getDogs()) applyFixedExpenses(d.id, todayKey()); // 매달 나가는 돈(등록한 것) — 날이 된 회차를 가계부에 기록
    syncPushAlarms();
    const onVisibility = () => document.visibilityState === "hidden" && syncPushAlarms({ beacon: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dog]);

  if (loading) return null;

  if (route === "onboarding") {
    // 휴대폰 브라우저로 처음 열었으면 먼저 홈 화면 설치(설치한 앱으로 열면 안 나옴)
    if (needsInstall())
      return (
        <div className="app-shell">
          <InstallGate />
        </div>
      );
    return (
      <div className="app-shell">
        <Onboarding
          onRegistered={(newDog) => {
            setActiveDog(newDog);
            setRoute("app");
          }}
        />
      </div>
    );
  }

  if (route === "register") {
    return (
      <div className="app-shell">
        <Onboarding
          skipIntro
          onRegistered={(newDog) => {
            setActiveDog(newDog);
            setRoute("app");
          }}
        />
      </div>
    );
  }

  const homeScreens = {
    home: () => (
      <Home
        dog={dog}
        onBack={() => setTab("main")}
        onOpenWeek={() => setTab("week")}
        onOpenFeeding={() => setTab("feeding")}
        onOpenAlarms={() => setTab("alarms")}
        onOpenInfo={() => setTab("info")}
      />
    ),
    week: () => <ThisWeek dog={dog} onBack={() => setTab("home")} onOpenMain={() => setTab("main")} />,
    feeding: () => <FeedingPlan dog={dog} onBack={() => setTab("home")} />,
    alarms: () => <AlarmSettings dog={dog} onBack={() => setTab("home")} />,
    info: () => <Info dog={dog} onBack={() => setTab("home")} />,
    puppy: () => <Puppy100 dog={dog} onBack={() => setTab("main")} />,
  };
  const profileScreens = {
    profile: () => (
      <Profile
        dog={dog}
        onQuickAdd={quickAdd}
        onOpenGallery={() => setTab("gallery")}
        onOpenVet={() => openVet("profile")}
        onOpenReport={() => setTab("report")}
        onOpenVital={(m) => (setVitalMetric(m), setTab("vital"))}
        onOpenRecords={(types) => (setRecordsOpts({ types }), setTab("records"))}
        onNewRecord={(type) => (type === "media" ? setTab("gallery") : (setRecordsOpts({ type, back: "profile" }), setTab("records-new")))}
        onOpenWeight={() => setTab("weight")}
        onOpenMeds={() => setTab("meds")}
        onOpenCalendar={() => setTab("hospital")}
        onUpdateDog={setActiveDog}
        onDeleteCurrent={handleDeleteCurrentDog}
        onDeleteAll={handleDeleteAllDogs}
        onDogRegistered={handleAddDog}
      />
    ),
    gallery: () => <Gallery dog={dog} onUpdateDog={setActiveDog} onBack={() => setTab("profile")} />,
    weight: () => <WeightTracker dog={dog} onUpdateDog={setActiveDog} onBack={() => setTab("profile")} />,
    meds: () => <Medications key={medFocus} dog={dog} focusDose={medFocus} onBack={() => (setMedFocus(null), setTab("profile"))} />,
    "add-dog": () => <DogRegister onRegistered={handleAddDog} onCancel={() => setTab("profile")} />,
    vet: () => <VetSummary dog={dog} onBack={() => setTab("profile")} />,
    report: () => <WeeklyReport dog={dog} onBack={() => setTab("profile")} onOpenVet={() => openVet("report")} />,
    vital: () => <VitalDetail key={vitalMetric} dog={dog} metric={vitalMetric} onBack={() => setTab("profile")} onOpenWeight={() => setTab("weight")} onRecord={(type) => (setRecordsOpts({ type, back: "vital" }), setTab("records-new"))} />,
  };
  // 새 기록: 종류 고르기에서 고른 기록이면 뒤로 = 종류 고르기로(복약·성장 추억과 같게, 11/7)
  const recordsBack = () => (recordsOpts.picked ? setRecordsOpts((o) => ({ ...o, type: undefined, picked: false })) : recordsOpts.back ? handleTabChange(recordsOpts.back) : setTab("records"));
  const recordScreens = {
    records: () => <Records key={`list-${recordsOpts.types?.join() || ""}`} dog={dog} initialTypes={recordsOpts.types} onOpenMeds={() => (setRecordsOpts((o) => ({ ...o, medsFrom: "records" })), setTab("records-meds"))} onOpenVital={(m) => (setVitalMetric(m), setTab("vital"))} onNew={(date) => (setRecordsOpts(date ? { prefill: { at: dateAt(date) } } : {}), setTab("records-new"))} onQuickAdd={quickAdd} onOpenGallery={() => (setRecordsOpts((o) => ({ ...o, galleryFrom: "records" })), setTab("records-gallery"))} />,
    "records-new": () => <Records key={`new-${recordsOpts.type || ""}`} dog={dog} startNew startType={recordsOpts.type} prefill={recordsOpts.prefill} backLabel={recordsOpts.picked ? "← 종류 고르기로" : recordsOpts.back === "hospital" ? "← 병원으로" : recordsOpts.back === "profile" ? "← 우리 아이로" : recordsOpts.back === "vital" ? "← 건강 수치로" : "← 기록으로"} onBack={recordsBack} onPickType={(t) => setRecordsOpts((o) => ({ ...o, type: t, picked: true }))} onOpenMeds={() => (setRecordsOpts((o) => ({ ...o, medsFrom: "records-new" })), setTab("records-meds"))} onOpenFeeding={() => (setRecordsOpts((o) => ({ ...o, type: "meal" })), setTab("records-feeding"))} onOpenGallery={() => (setRecordsOpts((o) => ({ ...o, galleryFrom: "records-new" })), setTab("records-gallery"))} />,
    "records-feeding": () => <FeedingPlan dog={dog} backLabel="← 식사 기록으로" onBack={() => setTab("records-new")} />,
    "records-gallery": () => <Gallery dog={dog} onUpdateDog={setActiveDog} backLabel={recordsOpts.galleryFrom === "records" ? "← 기록으로" : "← 종류 고르기로"} onBack={() => setTab(recordsOpts.galleryFrom || "records-new")} />,
    "records-meds": () => <Medications dog={dog} backLabel={recordsOpts.medsFrom === "records" ? "← 기록으로" : "← 종류 고르기로"} onBack={() => setTab(recordsOpts.medsFrom || "records-new")} />,
  };
  const hospitalScreens = {
    hospital: () => <Calendar dog={dog} onQuickAdd={quickAdd} vetDocSignal={vetDocSignal} onVetDocHandled={() => setVetDocSignal(0)} onRecordVisit={(prefill) => (setRecordsOpts({ type: "vet", prefill, back: "hospital" }), setTab("records-new"))} onOpenVet={() => openVet("hospital")} onOpenBudget={() => setTab("budget")} onOpenHealth={() => setTab("health")} />,
    vet: () => <VetSummary dog={dog} backLabel={{ report: "← 이번 주 리포트로", profile: "← 우리 아이로", main: "← 오늘로" }[vetFrom] || "← 병원으로"} onBack={() => setTab(vetFrom)} />,
    health: () => (
      <HealthHub
        dog={dog}
        onBack={() => setTab("hospital")}
        onOpenStool={() => setTab("health-stool")}
        onOpenBehavior={() => setTab("health-behavior")}
      />
    ),
    "health-stool": () => <HealthCheck dog={dog} onBack={() => setTab("health")} />,
    "health-behavior": () => <BehaviorCheck dog={dog} onBack={() => setTab("health")} />,
    budget: () => <Budget dog={dog} onBack={() => setTab("hospital")} />,
  };
  // 세부 화면이면 오른쪽으로 밀어 뒤로 갈 수 있게 감싼다(아래에 돌아갈 화면을 깔아 둠)
  function renderStack(screens, root) {
    if (!screens[tab] || tab === root) return screens[root]();
    return (
      <SwipeBack key={tab} onBack={() => (tab === "records-new" ? recordsBack() : tab === "records-meds" && recordsOpts.medsFrom ? setTab(recordsOpts.medsFrom) : tab === "records-gallery" && recordsOpts.galleryFrom ? setTab(recordsOpts.galleryFrom) : tab === "vet" ? setTab(vetFrom) : setTab(BACK_OF[tab]))} renderUnderlay={screens[BACK_OF[tab]]}>
        {screens[tab]()}
      </SwipeBack>
    );
  }
  const inSubScreen = Boolean(PARENT_TAB[tab]);
  const pages = {
    // 메인은 채팅 상태가 유지되도록 다시 그리지 않는다. 나머지는 탭을 옮길 때마다 새로 그려 다른 탭에서 바뀐 내용이 반영되게 한다.
    // 오늘 탭: 비서는 세부 화면(오늘 할 일 등)을 여는 동안에도 숨겨 둔 채 살려 둔다(3D·말로 기록 내용 유지)
    main: (
      <>
        {/* 세부 화면(오늘 할 일 등)은 오늘 화면 위에 겹쳐 그려서, 밀어서 뒤로 갈 때 아래에 오늘 화면이 보인다 */}
        <div style={{ display: "contents" }}>
          <Suspense fallback={<div className="screen subtle">불러오는 중…</div>}>
            <Main dog={dog} resetSignal={mainResetSignal} onReadingChange={setChatReading} onOpenToday={() => setTab("home")} onOpenPuppy={() => setTab("puppy")} onOpenVet={() => openVet("main")} onOpenFeeding={() => setTab("feeding")} onOpenWeight={() => setTab("weight")} />
          </Suspense>
        </div>
        {homeScreens[tab] && <Fragment key={`${dog.id}-${pageVersion}`}>{tab === "home" ? <SwipeBack key="home" onBack={() => setTab("main")} renderUnderlay={() => null}>{homeScreens.home()}</SwipeBack> : renderStack(homeScreens, "home")}</Fragment>}
      </>
    ),
    // 강아지를 바꾸면(dog.id) 화면을 새로 그려 앞 강아지의 상태(숨긴 할 일·수치 칸 등)가 남지 않게
    records: <Fragment key={`${dog.id}-${pageVersion}`}>{renderStack(recordScreens, "records")}</Fragment>,
    hospital: <Fragment key={`${dog.id}-${pageVersion}`}>{renderStack(hospitalScreens, "hospital")}</Fragment>,
    profile: <Fragment key={`${dog.id}-${pageVersion}`}>{renderStack(profileScreens, "profile")}</Fragment>,
  };

  return (
    <div className={`app-shell${online ? "" : " is-offline"}${chatReading && TABS[visibleIndex]?.key === "main" ? " reading" : ""}`}>
      {/* 인스타그램처럼 옆으로 밀면 옆 탭이 같이 끌려 나온다(브라우저 기본 가로 스크롤 + 스냅이라 손가락 속도·관성이 폰 그대로).
          화면 사이 틈(gap)으로 두 화면이 구분된다. */}
      <div ref={pagerRef} className={`pager${inSubScreen ? " locked" : ""}`} onScroll={handlePagerScroll} onTouchStart={() => (touchingRef.current = true)} onTouchEnd={handlePagerTouchEnd} onTouchCancel={handlePagerTouchEnd}>
        {TABS.map((t) => (
          <div key={t.key} data-tab={t.key} className={`pager-page${inSubScreen && t.key === pageKey ? " has-stack" : ""}`} aria-hidden={t.key !== pageKey}>
            <ErrorBoundary>{pages[t.key]}</ErrorBoundary>
          </div>
        ))}
      </div>
      {/* 비서(채팅) 화면은 대화 스크롤과 겹치지 않게 빼고, 나머지 화면은 맨 위에서 당기면 새로고침 */}
      <WhatsNew />
      {storageWarn && <div className="whats-new" role="alert" onClick={() => setStorageWarn(false)}><b>저장하지 못했어요</b> · 저장 공간이 부족하거나 개인정보 보호 모드예요. 설정 → 백업·로그인에서 백업해 두세요</div>}
      {!online && <div className="offline-bar" role="status">인터넷이 없어요 · 기록은 이 폰에 저장돼요. 말로 기록·진료 정리·백업은 연결되면 돼요</div>}
      <PullToRefresh targetRef={pagerRef} onRefresh={handleRefresh} isBlocked={(page) => page.closest('[data-tab="main"]')} />
      <BottomNav
        active={TABS[visibleIndex]?.key || pageKey}
        onChange={handleTabChange}
        onItemLongPress={handleBottomNavLongPress}
        onItemDoubleTap={handleBottomNavDoubleTap}
      />
      {dogSwitcherOpen && (
        <DogSwitcherSheet
          dogs={getDogs()}
          activeDogId={dog.id}
          onSelect={(d) => {
            setActiveDog(d);
            setDogSwitcherOpen(false);
          }}
          onAddDog={() => {
            setDogSwitcherOpen(false);
            setTab("add-dog");
          }}
          onClose={() => setDogSwitcherOpen(false)}
        />
      )}
    </div>
  );
}

