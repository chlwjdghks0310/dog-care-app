// 스토어 앱(Capacitor) 카카오 로그인: 앱 안 브라우저로 카카오 화면을 열고, 끝나면 kr.meongcare.app://login 주소로 앱에 돌아온다.
// Supabase 대시보드 Authentication → URL Configuration → Redirect URLs에 이 주소가 등록돼 있어야 한다.
import { isNative } from "./native";
import { supabase } from "./supabase";
import { toast } from "./toast";

export const NATIVE_REDIRECT = "kr.meongcare.app://login";
export const oauthRedirect = () => (isNative() ? NATIVE_REDIRECT : location.origin);

// 돌아온 주소(#access_token=…&refresh_token=… 또는 ?error_description=…)에서 필요한 값만 꺼낸다
export function parseReturn(url) {
  const i = url.search(/[?#]/);
  const p = new URLSearchParams(i < 0 ? "" : url.slice(i + 1).replace("#", "&"));
  return { access_token: p.get("access_token"), refresh_token: p.get("refresh_token"), error: p.get("error_description") };
}

// 설정 화면에선 토스트로, 첫 시작 화면(토스트가 없음)에선 로그인 버튼 아래 문구로(LoginForm이 듣는다)
function fail(text) {
  toast(text);
  window.dispatchEvent(new CustomEvent("dogcare-login-error", { detail: text }));
}

export async function openOAuth(url) {
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
}

export async function initNativeAuth() {
  if (!isNative() || !supabase) return;
  const [{ App }, { Browser }] = await Promise.all([import("@capacitor/app"), import("@capacitor/browser")]);
  App.addListener("appUrlOpen", async ({ url }) => {
    if (!url?.startsWith(NATIVE_REDIRECT)) return;
    Browser.close().catch(() => {}); // 안드로이드는 닫기가 없어 오류가 나지만 이미 앱으로 돌아와 있다
    const r = parseReturn(url);
    if (r.access_token && r.refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
      if (error) fail("로그인하지 못했어요. 다시 시도해 주세요.");
    } else if (r.error) fail(`로그인하지 못했어요: ${r.error}`);
  });
}
