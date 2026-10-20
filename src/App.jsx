import { Fragment, Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { getDogs, deleteDog, getActiveDogId, setActiveDogId } from "./services/dogRepository";
import { getTodayChecklist } from "./services/careEngine";
import { checkAndNotify, checkCustomAlarms, checkFeedingSoakReminders, checkMedAlarms, registerServiceWorker, syncPushAlarms } from "./services/notifications";
import { getFeedingSettings } from "./services/feedingSettings";
import { getCustomSchedules } from "./services/customSchedules";
import { syncEventAlarms } from "./services/calendarEvents";
import { getSoakGuidance } from "./data/feedingGuide";
import { calculateAge } from "./utils/age";
import { todayKey } from "./utils/date";
import BottomNav, { TABS } from "./components/BottomNav";
import Onboarding from "./screens/Onboarding";
import DogRegister from "./screens/DogRegister";
import Home from "./screens/Home";
import ThisWeek from "./screens/ThisWeek";
import Calendar from "./screens/Calendar";
import Info from "./screens/Info";
import Profile from "./screens/Profile";
import HealthHub from "./screens/HealthHub";
import HealthCheck from "./screens/HealthCheck";
import BehaviorCheck from "./screens/BehaviorCheck";
import FeedingPlan from "./screens/FeedingPlan";
import AlarmSettings from "./screens/AlarmSettings";
import Contact from "./screens/Contact";
import Help from "./screens/Help";
import WeightTracker from "./screens/WeightTracker";
import Budget from "./screens/Budget";
import Medications from "./screens/Medications";
import VetSummary from "./screens/VetSummary";
import Records from "./screens/Records";
import VitalDetail from "./screens/VitalDetail";
import DogSwitcherSheet from "./components/DogSwitcherSheet";
import SwipeBack from "./components/SwipeBack";
import { applyTheme, getTheme } from "./services/themeSettings";

const PARENT_TAB = {
  week: "home",
  weight: "home",
  meds: "home",
  feeding: "home",
  alarms: "home",
  info: "home",
  health: "home",
  "health-stool": "home",
  "health-behavior": "home",
  "add-dog": "profile",
  contact: "profile",
  vet: "profile",
  records: "profile",
  vital: "profile",
  "records-new": "profile",
  help: "profile",
};
// 세부 화면에서 뒤로 갔을 때(뒤로 버튼·오른쪽 스와이프) 돌아갈 화면
const BACK_OF = { ...PARENT_TAB, "health-stool": "health", "health-behavior": "health" };

// 메인 화면은 three.js(3D 아바타)를 포함해 번들이 커서, 실제로 탭을 열 때만 불러온다.
const Main = lazy(() => import("./screens/Main"));

// 렌더링 전에 바로 적용해서 기본 테마가 잠깐 보였다가 바뀌는 깜빡임을 막는다.
applyTheme(getTheme());

export default function App() {
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState("onboarding");
  const [tab, setTab] = useState("profile"); // 앱을 열면 프로필부터
  const [mainResetSignal, setMainResetSignal] = useState(0);
  const [dogSwitcherOpen, setDogSwitcherOpen] = useState(false);
  const [medFocus, setMedFocus] = useState(null);
  const [recordsOpts, setRecordsOpts] = useState({}); // 전체 기록을 열 때 고른 종류 / 바로 적을 종류
  const [vitalMetric, setVitalMetric] = useState(null); // 복용 알림을 눌러 들어왔을 때 보여 줄 복용 건

  // 메인 탭이 이미 열려 있는 상태에서 메인을 또 누르면(채팅 중이어도) 메인 화면으로 리셋한다.
  function handleTabChange(key) {
    if (key === "main" && tab === "main") {
      setMainResetSignal((s) => s + 1);
    }
    setTab(key);
  }

  // 하단 탭(TABS) 안에서 들어가는 세부 화면들 — 같은 페이지 칸에 그려지고, 하단 탭 표시도 부모를 따른다.
  const pageKey = PARENT_TAB[tab] || tab;
  const pageIndex = TABS.findIndex((t) => t.key === pageKey);
  const pagerRef = useRef(null);
  const touchingRef = useRef(false);
  const settleTimerRef = useRef(null);
  const [pageVersion, setPageVersion] = useState(0);

  useEffect(() => setPageVersion((v) => v + 1), [pageKey]);

  // 탭을 눌러 바꾸면 그 페이지로 바로 이동(손가락으로 끄는 중엔 건드리지 않음)
  useLayoutEffect(() => {
    const el = pagerRef.current;
    const page = el?.children[pageIndex];
    if (!page || touchingRef.current) return;
    if (Math.abs(el.scrollLeft - page.offsetLeft) > 2) el.scrollTo({ left: page.offsetLeft });
  }, [pageIndex, loading, route]); // 로딩/등록이 끝나 페이저가 처음 그려질 때도 첫 탭(프로필) 위치로

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
  const [visibleIndex, setVisibleIndex] = useState(pageIndex);
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
    // 앱이 이미 켜져 있을 때 알림을 누르면 서비스워커가 주소를 보내 준다
    const onMessage = (e) => e.data?.type === "open-url" && openFromUrl(e.data.url);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, []);

  // 앱이 켜져 있는 동안, 등록된 모든 강아지의 오늘 일정 권장 시간대가 되면 알림을 띄운다
  // (지금 화면에 보여주고 있는 강아지만이 아니라 전부 다).
  useEffect(() => {
    if (!dog) return;
    registerServiceWorker();
    const timer = setInterval(() => {
      const dateKey = todayKey();
      for (const d of getDogs()) {
        checkAndNotify(d, getTodayChecklist(d, dateKey), dateKey);
        const feedingSettings = getFeedingSettings(d.id);
        if (feedingSettings.times.length > 0) {
          const age = calculateAge(d.birthDate);
          const soak = getSoakGuidance(age.ageInWeeks);
          checkFeedingSoakReminders(d, feedingSettings.times, soak.needed === true, dateKey);
        }
        checkCustomAlarms(getCustomSchedules(d.id), dateKey);
        checkMedAlarms(d, dateKey);
      }
    }, 30 * 1000);
    // 앱을 열 때와 백그라운드로 보낼 때마다 최신 알람 목록을 서버에 보내, 앱이 꺼져 있어도 서버가 푸시를 쏘게 한다.
    for (const d of getDogs()) syncEventAlarms(d.id); // 반복 일정 알림을 다음 회차로
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
        onOpenWeek={() => setTab("week")}
        onOpenHealth={() => setTab("health")}
        onOpenFeeding={() => setTab("feeding")}
        onOpenAlarms={() => setTab("alarms")}
        onOpenInfo={() => setTab("info")}
        onOpenWeight={() => setTab("weight")}
        onOpenMeds={() => setTab("meds")}
        onOpenMain={() => handleTabChange("main")}
      />
    ),
    week: () => <ThisWeek dog={dog} onBack={() => setTab("home")} onOpenMain={() => handleTabChange("main")} />,
    weight: () => <WeightTracker dog={dog} onUpdateDog={setActiveDog} onBack={() => setTab("home")} />,
    meds: () => <Medications key={medFocus} dog={dog} focusDose={medFocus} onBack={() => (setMedFocus(null), setTab("home"))} />,
    feeding: () => <FeedingPlan dog={dog} onBack={() => setTab("home")} />,
    alarms: () => <AlarmSettings dog={dog} onBack={() => setTab("home")} />,
    info: () => <Info dog={dog} onBack={() => setTab("home")} />,
    health: () => (
      <HealthHub
        dog={dog}
        onBack={() => setTab("home")}
        onOpenStool={() => setTab("health-stool")}
        onOpenBehavior={() => setTab("health-behavior")}
      />
    ),
    "health-stool": () => <HealthCheck dog={dog} onBack={() => setTab("health")} />,
    "health-behavior": () => <BehaviorCheck dog={dog} onBack={() => setTab("health")} />,
  };
  const profileScreens = {
    profile: () => (
      <Profile
        dog={dog}
        onOpenContact={() => setTab("contact")}
        onOpenHelp={() => setTab("help")}
        onOpenVet={() => setTab("vet")}
        onOpenVital={(m) => (setVitalMetric(m), setTab("vital"))}
        onOpenRecords={(types) => (setRecordsOpts({ types }), setTab("records"))}
        onNewRecord={(type) => (setRecordsOpts({ type }), setTab("records-new"))}
        onOpenWeight={() => setTab("weight")}
        onOpenMeds={() => setTab("meds")}
        onOpenCalendar={() => setTab("calendar")}
        onUpdateDog={setActiveDog}
        onDeleteCurrent={handleDeleteCurrentDog}
        onDeleteAll={handleDeleteAllDogs}
        onAddDog={() => setTab("add-dog")}
      />
    ),
    "add-dog": () => <DogRegister onRegistered={handleAddDog} onCancel={() => setTab("profile")} />,
    vet: () => <VetSummary dog={dog} onBack={() => setTab("profile")} />,
    records: () => <Records key={`list-${recordsOpts.types?.join() || ""}`} dog={dog} initialTypes={recordsOpts.types} onBack={() => setTab("profile")} onOpenMeds={() => setTab("meds")} />,
    "records-new": () => <Records key={`new-${recordsOpts.type || ""}`} dog={dog} startNew startType={recordsOpts.type} onBack={() => setTab("profile")} onOpenMeds={() => setTab("meds")} />,
    vital: () => <VitalDetail key={vitalMetric} dog={dog} metric={vitalMetric} onBack={() => setTab("profile")} onOpenWeight={() => setTab("weight")} />,
    contact: () => <Contact onBack={() => setTab("profile")} />,
    help: () => <Help onBack={() => setTab("profile")} />,
  };
  // 세부 화면이면 오른쪽으로 밀어 뒤로 갈 수 있게 감싼다(아래에 돌아갈 화면을 깔아 둠)
  function renderStack(screens, root) {
    if (!screens[tab] || tab === root) return screens[root]();
    return (
      <SwipeBack key={tab} onBack={() => setTab(BACK_OF[tab])} renderUnderlay={screens[BACK_OF[tab]]}>
        {screens[tab]()}
      </SwipeBack>
    );
  }
  const inSubScreen = Boolean(PARENT_TAB[tab]);
  const pages = {
    // 메인은 채팅 상태가 유지되도록 다시 그리지 않는다. 나머지는 탭을 옮길 때마다 새로 그려 다른 탭에서 바뀐 내용이 반영되게 한다.
    main: (
      <Suspense fallback={<div className="screen subtle">불러오는 중…</div>}>
        <Main dog={dog} resetSignal={mainResetSignal} />
      </Suspense>
    ),
    home: <Fragment key={pageVersion}>{renderStack(homeScreens, "home")}</Fragment>,
    calendar: <Calendar key={pageVersion} dog={dog} />,
    budget: <Budget key={`${dog.id}-${pageVersion}`} dog={dog} />,
    profile: <Fragment key={pageVersion}>{renderStack(profileScreens, "profile")}</Fragment>,
  };

  return (
    <div className="app-shell">
      {/* 인스타그램처럼 옆으로 밀면 옆 탭이 같이 끌려 나온다(브라우저 기본 가로 스크롤 + 스냅이라 손가락 속도·관성이 폰 그대로).
          화면 사이 틈(gap)으로 두 화면이 구분된다. */}
      <div ref={pagerRef} className={`pager${inSubScreen ? " locked" : ""}`} onScroll={handlePagerScroll} onTouchStart={() => (touchingRef.current = true)} onTouchEnd={handlePagerTouchEnd} onTouchCancel={handlePagerTouchEnd}>
        {TABS.map((t) => (
          <div key={t.key} className={`pager-page${inSubScreen && t.key === pageKey ? " has-stack" : ""}`} aria-hidden={t.key !== pageKey}>
            {pages[t.key]}
          </div>
        ))}
      </div>
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

