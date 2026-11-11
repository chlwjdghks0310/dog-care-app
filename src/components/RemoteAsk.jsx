import Ico from "./Ico";
import { useMembers } from "./FamilyShare";
import { useSyncStatus } from "./AccountCard";

// 비동거 보호자(강아지가 가족 집에 있음, dog.living === "family")의 첫 말풍선(11/12):
// 하루 체크는 시킬 수 없으니 "가족을 초대해서 가족이 체크하면 알려 줄게"로. 가족이 연결되면 요약 말풍선(TodaySummary)로 넘어간다.
export function useRemoteState(dog) {
  const { user } = useSyncStatus();
  const { members } = useMembers(dog.id);
  const remote = dog.living === "family";
  const connected = Boolean(user) && (members?.length || 0) >= 2;
  return { remote, connected, user };
}

export default function RemoteAsk({ dog, user, onInvite }) {
  return (
    <span className="summary dc-ask">
      <span className="summary-open">
        <span className="summary-role">기록 친구 · {dog.name}</span>
        {user ? "가족을 초대해 줘!" : "나는 가족 집에 있지?"}
      </span>
      <span className="summary-more">{user ? "가족이 하루 체크를 하면, 다른 게 있는 날만 내가 알려 줄게" : "로그인하고 가족을 초대하면, 가족이 체크하고 나는 소식을 전해 줄게"}</span>
      <span className="dc-btns">
        <button type="button" className="dc-usual" onClick={onInvite}><Ico name="users" size={16} /> {user ? "초대 코드 만들기" : "로그인하고 초대하기"}</button>
      </span>
    </span>
  );
}
