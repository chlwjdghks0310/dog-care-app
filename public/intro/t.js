// 이용 통계: 홈페이지 방문·앱 버튼·가이드북 받기 횟수와 어디서 왔는지만 센다(이름·이메일 없음). CSP 때문에 파일로.
// 앱(src/services/analytics.js)과 같은 키(mc-vid 기기 번호, mc-src 처음 들어온 경로)를 쓴다 — 같은 주소라 저장소를 같이 쓴다.
(function () {
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === "1") return;
  if (!/(^|\.)meongcare\.kr$|onrender\.com$/.test(location.hostname)) return; // 내 컴퓨터에서 고칠 땐 보내지 않음
  var API = "https://dog-care-app.onrender.com/api/t";
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var vid = get("mc-vid");
  if (!vid) set("mc-vid", (vid = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + String(Math.random()).slice(2)));
  // 어디서 왔나: ?from= → utm_source → 눌러 온 사이트(앱 pickSource와 같은 규칙)
  var q = new URLSearchParams(location.search);
  var src = (q.get("from") || q.get("utm_source") || "").toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 40);
  var referrer = document.referrer;
  try { referrer = sessionStorage.getItem("mc-ref") || referrer; sessionStorage.removeItem("mc-ref"); } catch (e) {} // meongcare.kr/ 에서 넘어온 경우(index.html)
  if (!src && referrer) {
    try {
      var ref = new URL(referrer).hostname.replace(/^www\.|^m\./, "");
      if (ref !== location.hostname) {
        var known = [["naver", "naver"], ["instagram", "instagram"], ["threads", "threads"], ["kakao", "kakao"], ["google", "google"], ["daum", "daum"], ["litt.ly", "littly"], ["facebook", "facebook"], ["youtube", "youtube"]];
        src = ref.slice(0, 40);
        for (var i = 0; i < known.length; i++) if (ref.indexOf(known[i][0]) >= 0) { src = known[i][1]; break; }
      }
    } catch (e) {}
  }
  if (src && !get("mc-src")) set("mc-src", src); // 처음 들어온 경로를 기억 → 앱을 처음 열 때 같이 센다
  if (!src) src = get("mc-src") || "";
  function send(e) {
    var data = JSON.stringify({ e: e, s: src, v: vid, p: location.pathname.indexOf("/guide") >= 0 ? "guide" : location.pathname.indexOf("/resources") >= 0 ? "resources" : "intro" });
    if (!(navigator.sendBeacon && navigator.sendBeacon(API, new Blob([data], { type: "text/plain" })))) {
      fetch(API, { method: "POST", headers: { "Content-Type": "text/plain" }, body: data, keepalive: true }).catch(function () {});
    }
  }
  send("page");
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (/^\/\?app/.test(href)) send("cta");
    else if (/\.pdf(\?|$)/.test(href)) send("download");
  });
})();
