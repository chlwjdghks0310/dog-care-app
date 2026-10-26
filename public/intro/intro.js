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

// 누르면 움직이는 휴대폰: 탭을 누르면 휴대폰 화면이 그 기능으로 넘어가고(0.35초), 이어서 설명 패널이 휴대폰 자리에서 열리듯 커진다.
// "휴대폰으로 돌아가기"를 누르면 닫히고 그 탭으로 포커스가 돌아간다. ←/→/Home/End로 탭 이동(화면만 넘김), Enter·누르기로 열기.
(function () {
  var hero = document.querySelector(".hero");
  var strip = document.getElementById("strip");
  var phone = document.querySelector(".demo-phone");
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.hots [role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });
  var hint = document.querySelector(".demo-hint");
  if (!hero || !strip || !tabs.length) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SLIDE = reduce ? 0 : 360;
  var current = 0;
  var timer = null;

  function select(i, focus) {
    current = (i + tabs.length) % tabs.length;
    tabs.forEach(function (t, k) {
      t.setAttribute("aria-selected", String(k === current));
      t.tabIndex = k === current ? 0 : -1;
    });
    strip.style.transform = "translateX(" + -current * 100 + "%)";
    if (focus) tabs[current].focus();
    if (hint) hint.hidden = true;
  }

  function open(i) {
    select(i);
    clearTimeout(timer);
    timer = setTimeout(function () {
      var from = phone.getBoundingClientRect();
      panels.forEach(function (p, k) { p.classList.toggle("on", k === current); });
      hero.classList.add("open");
      var panel = panels[current];
      var to = panel.getBoundingClientRect();
      if (!reduce) {
        // 휴대폰이 있던 자리에서 시작해 패널 전체로 펼쳐진다
        var t = Math.max(0, from.top - to.top), l = Math.max(0, from.left - to.left);
        var r = Math.max(0, to.right - from.right), b = Math.max(0, to.bottom - from.bottom);
        panel.style.transition = "none";
        panel.style.clipPath = "inset(" + t + "px " + r + "px " + b + "px " + l + "px round 28px)";
        panel.getBoundingClientRect();
        panel.style.transition = "";
        panel.style.clipPath = "inset(0 0 0 0 round 28px)";
      }
      panel.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      panel.focus({ preventScroll: true });
    }, SLIDE);
  }

  function close() {
    clearTimeout(timer);
    panels.forEach(function (p) { p.classList.remove("on"); p.style.clipPath = ""; });
    hero.classList.remove("open");
    document.getElementById("demo").scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
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
  // 위쪽 "기능" 메뉴·"휴대폰으로 둘러보기"를 누르면 패널이 열려 있어도 휴대폰으로
  document.querySelectorAll('a[href="#demo"]').forEach(function (a) {
    a.addEventListener("click", function () { if (hero.classList.contains("open")) close(); });
  });
})();
