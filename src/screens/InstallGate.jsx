import { useEffect, useState } from "react";
import DogAvatarVideo from "../components/DogAvatarVideo";
import Ico from "../components/Ico";
import { browserTargets, openLabel } from "../utils/openBrowser";

// 처음 시작 전 "홈 화면에 설치" 안내 — 휴대폰 브라우저로 열었으면 설치한 앱에서 시작하게 한다(건너뛰기 없음).
// 설치 확인 = 홈 화면 아이콘으로 열면(standalone) 이 화면이 안 나온다. 안드로이드 크롬은 설치 버튼(beforeinstallprompt)을 바로 띄운다.
export const isStandalone = () => window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
const ua = () => navigator.userAgent;
export const isIOS = () => /iPhone|iPad|iPod/.test(ua()) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/.test(ua());
const inApp = () => (/KAKAOTALK/i.test(ua()) ? "카카오톡" : /NAVER\(inapp/i.test(ua()) ? "네이버" : /Instagram/i.test(ua()) ? "인스타그램" : /FBAN|FBAV/i.test(ua()) ? "페이스북" : /Line\//i.test(ua()) ? "라인" : /DaumApps/i.test(ua()) ? "다음" : /GSA\//.test(ua()) ? "구글 앱" : "");
const isSamsung = () => /SamsungBrowser/i.test(ua());
// 휴대폰 브라우저로 열었고 아직 설치한 앱이 아니면 안내가 필요하다(컴퓨터는 안내 없이 바로)
export const needsInstall = () => (isIOS() || isAndroid()) && !isStandalone();

// 안드로이드 크롬의 설치 창은 페이지를 연 직후 한 번만 온다 — 앱이 그리기 전에 받아 둔다(main.jsx에서 import)
let deferred = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e;
  window.dispatchEvent(new Event("mungcare-installable"));
});

// 사파리 공유 버튼·크롬 점 세 개 모양(설명 속 그림)
const ShareGlyph = () => (
  <svg className="ig-glyph" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="공유 버튼">
    <path d="M12 2v13" /><path d="m16 6-4-4-4 4" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
  </svg>
);
const PlusGlyph = () => (
  <svg className="ig-glyph" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M8 12h8" /><path d="M12 8v8" />
  </svg>
);
const DotsGlyph = () => (
  <svg className="ig-glyph" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-label="메뉴 버튼">
    <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
  </svg>
);

const IOS_STEPS = [
  [<>사파리에서 <b>공유 버튼</b> <ShareGlyph /> 누르기 <span className="faint">(안 보이면 <b>⋯</b> 메뉴 → 공유)</span></>],
  [<>목록을 내려서 <b>홈 화면에 추가</b> <PlusGlyph /> 누르기</>],
  [<><b>웹 앱으로 열기</b>가 켜져 있으면 그대로 두고, 오른쪽 위 <b>추가</b> 누르기</>],
  [<>홈 화면에 생긴 <b>멍케어 아이콘</b>으로 열기</>],
];
const ANDROID_STEPS = (samsung) =>
  samsung
    ? [[<>아래쪽 <b>메뉴(≡)</b> 누르기 <span className="faint">(버전에 따라 도구 안)</span></>], [<><b>현재 페이지 추가</b> → <b>홈 화면</b> → <b>추가</b></>], [<>홈 화면에 생긴 <b>멍케어 아이콘</b>으로 열기</>]]
    : [[<>오른쪽 위 <b>점 세 개</b> <DotsGlyph /> 누르기</>], [<><b>설치 및 바로가기 만들기</b> → <b>설치</b> <span className="faint">(기기에 따라 "앱 설치"·"홈 화면에 추가")</span></>], [<>홈 화면에 생긴 <b>멍케어 아이콘</b>으로 열기</>]];

export default function InstallGate() {
  const [os, setOs] = useState(isAndroid() ? "android" : "ios");
  const [canPrompt, setCanPrompt] = useState(Boolean(deferred));
  const [installed, setInstalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const app = inApp();

  useEffect(() => {
    const ready = () => setCanPrompt(true);
    const done = () => setInstalled(true);
    window.addEventListener("mungcare-installable", ready);
    window.addEventListener("appinstalled", done);
    return () => (window.removeEventListener("mungcare-installable", ready), window.removeEventListener("appinstalled", done));
  }, []);

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice.catch(() => ({}));
    deferred = null;
    setCanPrompt(false);
    if (outcome === "accepted") setInstalled(true);
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.origin);
      setCopied(true);
    } catch {
      window.prompt("이 주소를 복사해 주세요", location.origin);
    }
  }
  // 앱 안 브라우저: 휴대폰에 맞는 브라우저 열기 버튼들(지금 앱은 빼고). 1.5초 뒤에도 그대로면 주소 복사 안내
  const here = app === "네이버" ? "naver" : app === "구글 앱" ? "google" : "";
  const targets = app ? browserTargets(location.origin, ua()).filter((t) => t.id !== here) : [];
  const [openFailed, setOpenFailed] = useState(false);
  const watchOpen = () => setTimeout(() => !document.hidden && setOpenFailed(true), 1500);

  const steps = os === "ios" ? IOS_STEPS : ANDROID_STEPS(isSamsung());

  return (
    <div className="onb ig">
      <div className="ig-scroll">
        <div className="onb-speech">{installed ? "설치됐어! 홈 화면에서 만나자 🐾" : "홈 화면에 나를 데려가 줘!"}</div>
        <DogAvatarVideo state="idle" height={130} breed="pomeranian" />
        <div className="onb-title" style={{ marginTop: 6 }}>멍케어를 홈 화면에 설치해 주세요</div>

        {installed ? (
          <div className="onb-mock ig-card">
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              홈 화면에 생긴 <b>멍케어 아이콘</b>을 눌러 열어 주세요. 이 창은 닫아도 돼요.
            </p>
          </div>
        ) : app ? (
          <div className="onb-mock ig-card">
            <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>
              <b>{app}</b> 안에서는 설치할 수 없어요. 아래 브라우저로 열어 주세요. 설치는 {os === "ios" ? "사파리" : "크롬·삼성 인터넷"}에서 가장 확실해요.
              {(app === "인스타그램" || app === "페이스북") && " 오른쪽 위 ⋯ → '외부 브라우저에서 열기'가 가장 확실해요."}
            </p>
            {targets.map((t, i) => (
              <a key={t.id} href={t.href} onClick={watchOpen} className={i ? "btn-ghost" : "btn-primary"} style={{ display: "block", textAlign: "center", marginBottom: 8, textDecoration: "none" }}>
                {openLabel(t.label)}
              </a>
            ))}
            {openFailed && <p className="subtle" style={{ margin: "0 0 8px" }}>안 열리면 아래 [주소 복사하기]를 누르고 {os === "ios" ? "사파리" : "크롬"} 주소창에 붙여 넣어 주세요.</p>}
            <button type="button" className="btn-ghost" style={{ width: "100%" }} onClick={copyLink}>
              {copied ? "주소를 복사했어요 ✓ 브라우저에 붙여 넣어 주세요" : "주소 복사하기"}
            </button>
          </div>
        ) : (
          <>
            <div className="ig-tabs" role="tablist" aria-label="휴대폰 종류">
              {[["ios", "아이폰"], ["android", "안드로이드"]].map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={os === id} className={`seg${os === id ? " on" : ""}`} onClick={() => setOs(id)}>
                  {label}
                </button>
              ))}
            </div>
            {os === "android" && canPrompt ? (
              <button type="button" className="btn-primary ig-install" onClick={install}>
                <Ico name="arrowDown" size={18} /> 홈 화면에 설치하기
              </button>
            ) : (
              <ol className="onb-mock ig-steps">
                {os === "ios" && /CriOS|FxiOS|EdgiOS|NAVER|Whale/.test(ua()) && (
                  <li className="ig-note">사파리에서 여는 게 가장 확실해요. 주소를 복사해 사파리에 붙여 넣어 주세요.</li>
                )}
                {steps.map(([text], i) => (
                  <li key={i}>
                    <span className="ig-num">{i + 1}</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        <div className="onb-mock ig-why">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>왜 설치해야 하나요?</div>
          {[
            ["bell", "밥·약·병원 일정 알림이 와요", "아이폰은 홈 화면에 설치한 앱에서만 알림을 받을 수 있어요"],
            ["lock", "기록이 한곳에 이어져요", "브라우저에서 적은 기록은 설치한 앱으로 옮겨지지 않아서, 처음부터 앱에서 시작해요"],
            ["zap", "앱처럼 바로 열려요", "주소창 없이 전체 화면으로, 아이콘 한 번에"],
          ].map(([ico, head, sub]) => (
            <div key={head} className="onb-mock-row">
              <span style={{ width: 28, textAlign: "center", color: "var(--accent-strong)" }}><Ico name={ico} size={18} /></span>
              <span style={{ flex: 1, lineHeight: 1.35 }}>
                <b style={{ fontSize: 14 }}>{head}</b>
                <div className="faint" style={{ fontSize: 12.5 }}>{sub}</div>
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="faint ig-foot">설치한 뒤 홈 화면 아이콘으로 열면 이 안내 없이 바로 시작돼요.</p>
    </div>
  );
}
