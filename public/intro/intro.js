// 소개 페이지 동작: 모바일 메뉴 펼치기, 앱 안 브라우저(카카오톡 등) 안내. CSP 때문에 인라인 대신 파일로.
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
