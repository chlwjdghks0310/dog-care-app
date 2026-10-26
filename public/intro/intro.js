// 소개 페이지 동작: 모바일 메뉴 펼치기, 앱 안 브라우저(카카오톡 등) 안내. CSP 때문에 인라인 대신 파일로.
document.documentElement.classList.add("js"); // JS가 있을 때만 패널을 숨겨 두고 휴대폰에서 연다(없으면 차례로 보임)

(function () {
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("nav");
  function set(open) {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  }
  btn.addEventListener("click", function () { set(!nav.classList.contains("open")); });
  nav.addEventListener("click", function (e) { if (e.target.tagName === "A") set(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });

  // 앱 안 브라우저면 안내 띠(앱의 InstallGate와 같은 판별). 카카오톡은 바깥 브라우저로 바로 열 수 있다
  var ua = navigator.userAgent;
  var name = /KAKAOTALK/i.test(ua) ? "카카오톡" : /NAVER\(inapp/i.test(ua) ? "네이버" : /Instagram/i.test(ua) ? "인스타그램" : /FBAN|FBAV/i.test(ua) ? "페이스북" : /Line\//i.test(ua) ? "라인" : "";
  if (!name) return;
  var bar = document.getElementById("inapp");
  document.getElementById("inapp-name").textContent = name;
  bar.hidden = false;
  var url = location.origin + "/intro/";
  var open = document.getElementById("inapp-open");
  if (name === "카카오톡") open.addEventListener("click", function () { location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(url); });
  else open.hidden = true;
  document.getElementById("inapp-copy").addEventListener("click", function (e) {
    var b = e.currentTarget;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
      function () { b.textContent = "복사했어요 ✓"; },
      function () { window.prompt("이 주소를 복사해 주세요", url); }
    );
  });
})();

// 누르면 바뀌는 휴대폰: 탭을 누르면 휴대폰 화면이 그 기능으로 부드럽게 바뀌고, 휴대폰이 살짝 커졌다가 설명 창이 떠오른다(비서 강아지가 말풍선으로 설명).
// "휴대폰으로 돌아가기"(또는 Esc)를 누르면 닫히고 그 탭으로 포커스가 돌아간다. ←/→/Home/End는 화면만 바꾸고, Enter·누르기로 연다.
(function () {
  var hero = document.querySelector(".hero");
  var demo = document.getElementById("demo");
  var screens = Array.prototype.slice.call(document.querySelectorAll(".screens .scr"));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.hots [role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });
  if (!hero || !demo || !tabs.length) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var current = 0;
  var timer = null;
  demo.dataset.cur = "assistant";

  function select(i, focus) {
    current = (i + tabs.length) % tabs.length;
    tabs.forEach(function (t, k) {
      t.setAttribute("aria-selected", String(k === current));
      t.tabIndex = k === current ? 0 : -1;
    });
    screens.forEach(function (img, k) { img.classList.toggle("on", k === current); });
    demo.dataset.cur = tabs[current].id.slice(4); // 옆에 떠 있는 말풍선도 그 기능 것으로
    demo.classList.add("tried"); // 한 번 눌러 보면 "눌러 보세요" 표시는 사라진다
    if (focus) tabs[current].focus();
  }

  function open(i) {
    select(i);
    clearTimeout(timer);
    demo.classList.add("launch");
    timer = setTimeout(function () {
      demo.classList.remove("launch");
      panels.forEach(function (p, k) { p.classList.toggle("on", k === current); });
      hero.classList.add("open");
      var panel = panels[current];
      // 떠오르는 애니메이션(transform)에 영향받지 않게 움직이지 않는 감싸개(#svcs)로 스크롤 — 위 여백은 CSS scroll-padding-top(머리글 높이)
      document.getElementById("svcs").scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      panel.focus({ preventScroll: true });
    }, reduce ? 0 : 480);
  }

  function close() {
    clearTimeout(timer);
    panels.forEach(function (p) { p.classList.remove("on"); });
    hero.classList.remove("open");
    demo.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    tabs[current].focus({ preventScroll: true });
  }

  tabs.forEach(function (t, k) {
    t.addEventListener("click", function () { open(k); });
    t.addEventListener("keydown", function (e) {
      var map = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
      if (e.key in map) { e.preventDefault(); select(map[e.key], true); }
    });
  });
  panels.forEach(function (p) {
    p.querySelector(".svc-back").addEventListener("click", close);
    p.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  });
  document.querySelectorAll('a[href="#demo"]').forEach(function (a) {
    a.addEventListener("click", function () { if (hero.classList.contains("open")) close(); });
  });
})();
