// 앱 안 브라우저(카카오톡·네이버·인스타 등)에서 다른 브라우저로 열기 — 휴대폰·앱에 맞는 버튼 목록을 만든다.
// 앱 설치 안내 화면(InstallGate)에서만 쓴다.
// install: 그 브라우저에서 홈 화면 설치가 되는지(true/false/null=확인 못 함) — 설명 문구에만 쓴다.
export function browserTargets(url, ua) {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua));
  const android = /Android/.test(ua);
  const rest = url.replace(/^https?:\/\//, "");
  const enc = encodeURIComponent(url);
  const list = [];
  // 앱이 공식으로 열어 주는 방법이 있으면 맨 앞에(그 휴대폰의 기본 브라우저로 열린다)
  if (/KAKAOTALK/i.test(ua)) list.push({ id: "default", label: "기본 브라우저", href: `kakaotalk://web/openExternal?url=${enc}` });
  if (/Line\//i.test(ua)) list.push({ id: "default", label: "기본 브라우저", href: `${url}${url.includes("?") ? "&" : "?"}openExternalBrowser=1` });
  if (ios) {
    list.push(
      { id: "safari", label: "사파리", href: `x-safari-https://${rest}`, install: true },
      { id: "chrome", label: "크롬", href: `googlechromes://${rest}`, install: true },
      { id: "naver", label: "네이버", href: `naversearchapp://inappbrowser?url=${enc}&target=new&version=6`, install: null },
      { id: "google", label: "구글", href: `googleapp://open-url?url=${enc}`, install: null }
    );
  } else if (android) {
    const intent = (pkg) => `intent://${rest}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${enc};end`;
    list.push(
      { id: "chrome", label: "크롬", href: intent("com.android.chrome"), install: true },
      { id: "samsung", label: "삼성 인터넷", href: intent("com.sec.android.app.sbrowser"), install: true },
      { id: "naver", label: "네이버", href: intent("com.nhn.android.search"), install: null },
      { id: "google", label: "구글", href: intent("com.google.android.googlequicksearchbox"), install: null }
    );
  }
  return list;
}

// 버튼 글자: "크롬으로 열기", "사파리로 열기"(받침이 없거나 ㄹ이면 "로")
export function openLabel(label) {
  const jong = (label.charCodeAt(label.length - 1) - 0xac00) % 28;
  return `${label}${jong === 0 || jong === 8 ? "로" : "으로"} 열기`;
}
