import { Suspense, lazy, useEffect, useState } from "react";
import { getDogs, deleteDog, getActiveDogId, setActiveDogId } from "./services/dogRepository";
import { getTodayChecklist } from "./services/careEngine";
import { checkAndNotify, checkCustomAlarms, checkFeedingSoakReminders, registerServiceWorker } from "./services/notifications";
import { getFeedingSettings } from "./services/feedingSettings";
import { getCustomSchedules } from "./services/customSchedules";
import { getSoakGuidance } from "./data/feedingGuide";
import { calculateAge } from "./utils/age";
import { todayKey } from "./utils/date";
import BottomNav from "./components/BottomNav";
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
import DogSwitcherSheet from "./components/DogSwitcherSheet";
import { applyTheme, getTheme } from "./services/themeSettings";

// 메인 화면은 three.js(3D 아바타)를 포함해 번들이 커서, 실제로 탭을 열 때만 불러온다.
const Main = lazy(() => import("./screens/Main"));

// 렌더링 전에 바로 적용해서 기본 테마가 잠깐 보였다가 바뀌는 깜빡임을 막는다.
applyTheme(getTheme());

export default function App() {
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState("onboarding");
  const [tab, setTab] = useState("main");
  const [mainResetSignal, setMainResetSignal] = useState(0);
  const [dogSwitcherOpen, setDogSwitcherOpen] = useState(false);

  // 메인 탭이 이미 열려 있는 상태에서 메인을 또 누르면(채팅 중이어도) 메인 화면으로 리셋한다.
  function handleTabChange(key) {
    if (key === "main" && tab === "main") {
      setMainResetSignal((s) => s + 1);
    }
    setTab(key);
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
    setActiveDog(dogs[(idx + 1) % dogs.length]);
  }

  function handleBottomNavLongPress(key) {
    if (key === "profile") setDogSwitcherOpen(true);
  }

  function handleBottomNavDoubleTap(key) {
    if (key === "profile") handleToggleNextDog();
  }

  useEffect(() => {
    const dogs = getDogs();
    if (dogs.length > 0) {
      const activeId = getActiveDogId();
      setActiveDog(dogs.find((d) => d.id === activeId) || dogs[0]);
      setRoute("app");
    }
    setLoading(false);
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
      }
    }, 30 * 1000);
    return () => clearInterval(timer);
  }, [dog]);

  if (loading) return null;

  if (route === "onboarding") {
    return (
      <div className="app-shell">
        <Onboarding onStart={() => setRoute("register")} />
      </div>
    );
  }

  if (route === "register") {
    return (
      <div className="app-shell">
        <DogRegister
          onRegistered={(newDog) => {
            setActiveDog(newDog);
            setRoute("app");
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* 다른 탭으로 옮겨도 채팅 상태가 유지되도록 언마운트하지 않고 숨김 처리만 한다. */}
      <div style={{ display: tab === "main" ? "flex" : "none", flexDirection: "column", flex: 1, minHeight: 0 }}>
        <Suspense fallback={<div className="screen subtle">불러오는 중…</div>}>
          <Main dog={dog} resetSignal={mainResetSignal} />
        </Suspense>
      </div>
      {tab === "home" && (
        <Home
          dog={dog}
          onOpenWeek={() => setTab("week")}
          onOpenHealth={() => setTab("health")}
          onOpenFeeding={() => setTab("feeding")}
          onOpenAlarms={() => setTab("alarms")}
          onOpenInfo={() => setTab("info")}
          onOpenWeight={() => setTab("weight")}
          onOpenMain={() => handleTabChange("main")}
        />
      )}
      {tab === "week" && <ThisWeek dog={dog} onBack={() => setTab("home")} onOpenMain={() => handleTabChange("main")} />}
      {tab === "weight" && <WeightTracker dog={dog} onUpdateDog={setActiveDog} onBack={() => setTab("home")} />}
      {tab === "calendar" && <Calendar dog={dog} />}
      {tab === "feeding" && <FeedingPlan dog={dog} onBack={() => setTab("home")} />}
      {tab === "alarms" && <AlarmSettings dog={dog} onBack={() => setTab("home")} />}
      {tab === "info" && <Info dog={dog} onBack={() => setTab("home")} />}
      {tab === "health" && (
        <HealthHub
          dog={dog}
          onBack={() => setTab("home")}
          onOpenStool={() => setTab("health-stool")}
          onOpenBehavior={() => setTab("health-behavior")}
        />
      )}
      {tab === "health-stool" && <HealthCheck dog={dog} onBack={() => setTab("health")} />}
      {tab === "health-behavior" && <BehaviorCheck dog={dog} onBack={() => setTab("health")} />}
      {tab === "profile" && (
        <Profile
          dog={dog}
          onOpenContact={() => setTab("contact")}
          onOpenHelp={() => setTab("help")}
          onUpdateDog={setActiveDog}
          onDeleteCurrent={handleDeleteCurrentDog}
          onDeleteAll={handleDeleteAllDogs}
          onAddDog={() => setTab("add-dog")}
        />
      )}
      {tab === "add-dog" && <DogRegister onRegistered={handleAddDog} onCancel={() => setTab("profile")} />}
      {tab === "contact" && <Contact onBack={() => setTab("profile")} />}
      {tab === "help" && <Help onBack={() => setTab("profile")} />}
      <BottomNav
        active={tab}
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
