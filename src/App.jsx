import { Suspense, lazy, useEffect, useState } from "react";
import { getDogs } from "./services/dogRepository";
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
import Info from "./screens/Info";
import Profile from "./screens/Profile";
import HealthHub from "./screens/HealthHub";
import HealthCheck from "./screens/HealthCheck";
import BehaviorCheck from "./screens/BehaviorCheck";
import FeedingPlan from "./screens/FeedingPlan";
import AlarmSettings from "./screens/AlarmSettings";

// 메인 화면은 three.js(3D 아바타)를 포함해 번들이 커서, 실제로 탭을 열 때만 불러온다.
const Main = lazy(() => import("./screens/Main"));

export default function App() {
  const [dog, setDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState("onboarding");
  const [tab, setTab] = useState("main");

  useEffect(() => {
    const dogs = getDogs();
    if (dogs.length > 0) {
      setDog(dogs[0]);
      setRoute("app");
    }
    setLoading(false);
  }, []);

  // 앱이 켜져 있는 동안, 오늘 일정의 권장 시간대가 되면 알림을 띄운다.
  useEffect(() => {
    if (!dog) return;
    registerServiceWorker();
    const timer = setInterval(() => {
      const dateKey = todayKey();
      checkAndNotify(dog, getTodayChecklist(dog, dateKey), dateKey);
      const feedingSettings = getFeedingSettings(dog.id);
      if (feedingSettings.times.length > 0) {
        const age = calculateAge(dog.birthDate);
        const soak = getSoakGuidance(age.ageInWeeks);
        checkFeedingSoakReminders(dog, feedingSettings.times, soak.needed === true, dateKey);
      }
      checkCustomAlarms(getCustomSchedules(dog.id), dateKey);
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
            setDog(newDog);
            setRoute("app");
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      {tab === "main" && (
        <Suspense fallback={<div className="screen subtle">불러오는 중…</div>}>
          <Main dog={dog} />
        </Suspense>
      )}
      {tab === "home" && (
        <Home
          dog={dog}
          onOpenWeek={() => setTab("week")}
          onOpenHealth={() => setTab("health")}
          onOpenFeeding={() => setTab("feeding")}
          onOpenAlarms={() => setTab("alarms")}
          onOpenInfo={() => setTab("info")}
          onUpdateDog={setDog}
        />
      )}
      {tab === "week" && <ThisWeek dog={dog} />}
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
      {tab === "profile" && <Profile dog={dog} />}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
