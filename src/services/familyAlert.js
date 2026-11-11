// 가족에게 한 줄 알림(11/12, 비동거 보호자용): 하루 체크에서 "다른 게 있었어요"를 고르면 같은 강아지를 공유하는 다른 폰에 푸시 한 줄.
// 평소와 같을 땐 보내지 않는다(조용히). 로그인 안 했거나 서버가 못 보내도 기록은 이미 저장돼 있으니 조용히 실패.
import { supabase } from "./supabase";

const API = import.meta.env?.VITE_API_BASE || "http://localhost:8787";

export async function alertFamily(dog, body) {
  try {
    if (!supabase) return;
    const session = (await supabase.auth.getSession().catch(() => null))?.data?.session;
    if (!session?.access_token) return;
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
    const endpoint = (await reg?.pushManager?.getSubscription().catch(() => null))?.endpoint; // 내 폰은 빼고
    await fetch(`${API}/api/push/family-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: session.access_token, petId: dog.id, title: `🐾 ${dog.name}`, body: String(body).slice(0, 200), endpoint }),
      keepalive: true,
    });
  } catch {
    /* 알림만 못 간 것 */
  }
}
