// 사용 설명서: 지금 읽는 구역을 목차·차례 칩에 표시, 구역이 보일 때 살짝 떠오르기, 누른 질문 잠깐 강조, 맨 위로 버튼.
document.documentElement.classList.add("js");
(function () {
  var secs = Array.prototype.slice.call(document.querySelectorAll(".g-sec"));
  var sideSecs = {}, chips = {};
  document.querySelectorAll(".g-side-sec").forEach(function (a) { sideSecs[a.getAttribute("href").slice(1)] = a; });
  document.querySelectorAll(".g-chips a").forEach(function (a) { chips[a.getAttribute("href").slice(1)] = a; });

  if ("IntersectionObserver" in window) {
    var reveal = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    secs.forEach(function (s) { reveal.observe(s); });
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
    }, { rootMargin: "-30% 0px -60% 0px" });
    secs.forEach(function (s) { spy.observe(s); });
  } else {
    secs.forEach(function (s) { s.classList.add("in"); });
  }

  function mark(id) {
    Object.keys(sideSecs).forEach(function (k) {
      sideSecs[k].classList.toggle("on", k === id);
      sideSecs[k].parentElement.classList.toggle("open", k === id);
    });
    Object.keys(chips).forEach(function (k) { chips[k].classList.toggle("on", k === id); });
    var c = chips[id];
    if (c && c.parentElement.scrollTo) c.parentElement.scrollTo({ left: c.offsetLeft - 16, behavior: "smooth" });
  }

  // 질문으로 이동하면 그 구역은 바로 보이게 하고 질문을 잠깐 강조
  function flash() {
    var t = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!t) return;
    var sec = t.closest(".g-sec") || t;
    sec.classList.add("in");
    if (t.classList.contains("g-q")) {
      t.classList.add("flash");
      setTimeout(function () { t.classList.remove("flash"); }, 1400);
    }
  }
  window.addEventListener("hashchange", flash);
  flash();

  var top = document.querySelector(".g-top");
  window.addEventListener("scroll", function () { top.classList.toggle("show", window.scrollY > 600); }, { passive: true });
})();
