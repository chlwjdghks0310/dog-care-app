import { useState } from "react";
import Ico from "./Ico";
import { BottomSheet, LoginSheet, useSyncStatus } from "./AccountCard";
import { isNative } from "../services/native";
import { readJSON, writeJSON } from "../services/storage";
import { todayKey, toDateKey, addDays } from "../utils/date";

// 스토어 앱이 나온 뒤, 홈 화면 앱(웹)을 쓰는 사람에게: "새 앱으로 옮기기 전에 로그인(백업)부터".
// 홈 화면 앱과 스토어 앱은 저장 공간이 달라서, 백업 없이 옮기면 새 앱은 빈 상태로 시작한다(기록·사진은 로그인하면 서버에 올라가 있다).
// 스토어 주소를 채우기 전에는 아무것도 보여 주지 않는다 — 출시하는 날 STORE 두 줄만 채운다.
export const STORE = { ios: "", android: "" }; // 예: https://apps.apple.com/kr/app/id… / https://play.google.com/store/apps/details?id=kr.meongcare.app
const KEY = "dogcare-store-move-v1"; // { later: 마지막으로 [나중에] 누른 날 }
const GAP_DAYS = 7;
export const storeLink = (ua = navigator.userAgent) => (/iPhone|iPad|iPod/.test(ua) ? STORE.ios : /Android/.test(ua) ? STORE.android : "");

export default function StoreMove() {
  const link = isNative() ? "" : storeLink();
  const [open, setOpen] = useState(() => Boolean(link) && !((readJSON(KEY, null)?.later || "") > toDateKey(addDays(new Date(), -GAP_DAYS))));
  const [login, setLogin] = useState(false);
  const { user } = useSyncStatus();
  if (!open) return null;
  const later = () => (writeJSON(KEY, { later: todayKey() }), setOpen(false));
  if (login) return <LoginSheet onClose={() => setLogin(false)} />;
  return (
    <BottomSheet title="멍케어 앱이 나왔어요" onClose={later}>
      <p className="subtle" style={{ margin: "0 0 12px" }}>스토어에서 받는 앱은 지금 쓰는 홈 화면 앱과 저장 공간이 달라요. 아래 순서대로 하면 기록과 사진이 그대로 옮겨져요.</p>
      <div className="px-feat"><Ico name={user ? "check" : "lock"} size={34} /><div className="px-feat-body"><div className="px-feat-title">1. 먼저 백업</div><div className="px-feat-desc">{user ? "로그인돼 있어요. 기록과 사진이 서버에 백업돼 있어요." : "로그인하면 기록과 사진이 서버에 백업돼요. 로그인 없이 옮기면 새 앱은 빈 상태로 시작해요."}</div></div></div>
      {!user && <button type="button" className="btn-primary" style={{ width: "100%", margin: "8px 0" }} onClick={() => setLogin(true)}>로그인해서 백업하기</button>}
      <div className="px-feat"><Ico name="tap" size={34} /><div className="px-feat-body"><div className="px-feat-title">2. 새 앱 받기</div><div className="px-feat-desc">받은 뒤 첫 화면의 [쓰던 기록 불러오기]로 같은 방법으로 로그인하면 기록이 그대로 나타나요.</div></div></div>
      <a className={user ? "btn-primary" : "btn-ghost"} style={{ display: "block", textAlign: "center", width: "100%", margin: "8px 0", boxSizing: "border-box" }} href={link} target="_blank" rel="noopener noreferrer">스토어에서 받기</a>
      <div className="px-feat"><Ico name="house" size={34} /><div className="px-feat-body"><div className="px-feat-title">3. 확인한 뒤 정리</div><div className="px-feat-desc">새 앱에 기록이 보이는 걸 확인한 다음에 이 홈 화면 앱을 지워 주세요. 알림은 새 앱에서 한 번 다시 켜야 해요.</div></div></div>
      <button type="button" className="btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={later}>나중에</button>
    </BottomSheet>
  );
}
