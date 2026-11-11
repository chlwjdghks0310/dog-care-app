import Ico from "./Ico";
import { readJSON, writeJSON } from "../services/storage";
import { getSyncStatus } from "../services/sync/index";
import { getRecords } from "../services/records";
import { todayKey, toDateKey, addDays } from "../utils/date";

// 백업(로그인) 권유 말풍선(11/11, 첫 화면에서 로그인 벽·경고 시트를 뺀 대신): 로그인 안 한 사람에게
// 기록이 좀 쌓였을 때 — 처음 연 지 3일째부터, 또는 사진을 넣은 뒤 — 묻고, [다음에]면 7일 뒤 한 번 더. 두 번 [다음에]면 더 안 묻는다(사용자 결정 11/11)
const KEY = "dogcare-backup-ask-v1"; // { since: 처음 본 날, askedAt: 마지막으로 [다음에] 누른 날, asks: [다음에] 누른 횟수, done: 그만 묻기 }
const MAX_ASKS = 2, GAP_DAYS = 7;
const laterOk = (s) => (s.asks || 0) < MAX_ASKS && !(s.askedAt && s.askedAt > toDateKey(addDays(new Date(), -GAP_DAYS)));
const state = () => readJSON(KEY, null) || {};
const hasPhoto = (dog) => Boolean(dog.photo) || getRecords(dog.id).some((r) => r.photos?.length);

const TEST_ALWAYS = true; // ★ 테스트용(11/11 사용자 요청): 로그인·날짜 조건 없이 바로 띄움 — 확인 뒤 false로 되돌리기
export function backupAskPending(dog) {
  if (TEST_ALWAYS) return laterOk(state());
  if (getSyncStatus().user) return false;
  const s = state();
  if (!s.since) {
    writeJSON(KEY, { since: todayKey() });
    return false;
  }
  if (s.done || !laterOk(s)) return false;
  return s.since <= toDateKey(addDays(new Date(), -3)) || hasPhoto(dog);
}

export default function BackupAsk({ dog, onBackup, onDone }) {
  const later = () => (writeJSON(KEY, { ...state(), askedAt: todayKey(), asks: (state().asks || 0) + 1 }), onDone());
  const go = () => (writeJSON(KEY, { ...state(), askedAt: todayKey(), asks: (state().asks || 0) + 1 }), onBackup());
  return (
    <span className="summary dc-ask">
      <span className="summary-open">
        <span className="summary-role">기록 친구 · {dog.name}</span>
        기록이 쌓였네! 백업해 둘까?
      </span>
      <span className="summary-more">폰을 바꾸거나 앱을 지워도 기록이 남고, 가족과 같이 볼 수도 있어</span>
      <span className="dc-btns">
        <button type="button" className="dc-usual" onClick={go}><Ico name="lock" size={16} /> 백업하기</button>
        <button type="button" className="dc-diff" onClick={later}>다음에</button>
      </span>
    </span>
  );
}
