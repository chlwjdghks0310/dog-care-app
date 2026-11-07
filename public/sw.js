// 인터넷 없이 앱을 열면 보여 줄 안내 페이지를 저장해 둔다.
// 앱 파일(/assets/ — 이름에 내용 해시가 붙어 바뀌면 이름도 바뀜)은 한 번 받으면 저장해 두고 다시 쓴다 → 두 번째 열 때부터 빠르게.
// 화면(HTML)은 지금처럼 늘 새로 받아서 업데이트는 바로 반영된다(새 HTML이 새 이름의 파일을 부름).
const OFFLINE_CACHE = "mungcare-offline-v2"; // 안내 페이지를 바꾸면 숫자를 올려 새로 받게
const ASSET_CACHE = "mungcare-assets-v1";
const SHELL_CACHE = "mungcare-shell-v1"; // 마지막으로 연 앱 화면(HTML) — 인터넷이 없을 때 이걸로 앱을 연다(기록은 폰에 있으니 그대로 쓸 수 있게)
const ASSET_MAX = 80; // ponytail: 오래된 파일은 개수로만 정리(먼저 넣은 것부터) — 용량 기준이 필요하면 그때
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((c) => c.add(new Request(OFFLINE_URL, { cache: "reload" }))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE && k !== ASSET_CACHE && k !== SHELL_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// 화면을 여는 요청(앱 켜기·새로고침)만: 인터넷이 안 되면 안내 페이지. 나머지 요청은 손대지 않는다.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "GET" && url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((c) =>
        c.match(event.request).then(
          (hit) =>
            hit ||
            fetch(event.request).then((res) => {
              if (res.ok && !(res.headers.get("content-type") || "").includes("text/html")) {
                c.put(event.request, res.clone());
                c.keys().then((keys) => keys.length > ASSET_MAX && Promise.all(keys.slice(0, keys.length - ASSET_MAX).map((k) => c.delete(k))));
              }
              return res;
            })
        )
      )
    );
    return;
  }
  if (event.request.mode !== "navigate") return;
  // 화면: 늘 인터넷에서 새로 받고(업데이트 바로 반영), 앱 화면이면 받아 둔다. 인터넷이 없으면 받아 둔 앱 화면 → 없으면(처음·홈페이지) 안내 페이지
  const isApp = url.pathname === "/" || url.pathname === "/index.html";
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (isApp && res.ok && (res.headers.get("content-type") || "").includes("text/html")) {
          const copy = res.clone(); // 사본은 바로 만든다(브라우저가 원본을 먼저 읽으면 나중엔 못 만듦)
          caches.open(SHELL_CACHE).then((c) => c.put("/", copy));
        }
        return res;
      })
      .catch(() => (isApp ? caches.open(SHELL_CACHE).then((c) => c.match("/")).then((hit) => hit || caches.match(OFFLINE_URL)) : caches.match(OFFLINE_URL)))
  );
});

// 서버가 보낸 웹 푸시를 받아서 실제 알림으로 띄운다 — 브라우저(탭)가 닫혀 있어도
// 서비스워커는 OS가 대신 깨워주기 때문에 이 부분만은 동작한다.
// 소리는 휴대폰 알림음, 진동은 휴대폰 설정을 따른다(silent: false). 안드로이드는 vibrate 패턴도 쓴다.
self.addEventListener("push", (event) => {
  let data = { title: "🐾 멍케어", body: "새 알림이 있어요." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // JSON이 아니면 기본 문구를 그대로 쓴다.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, { body: data.body, icon: "/icon-192.png?v=6", vibrate: [400, 150, 400, 150, 400], silent: false, data: { url: data.url } })
  );
});

// 알림을 탭하면 이미 열려 있는 탭이 있으면 그걸 포커스하고(약 알림이면 그 복용 건 주소를 앱에 전달), 없으면 그 주소로 새로 연다.
// 알림을 눌렀다고 복용 완료로 기록하지는 않는다.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients[0].postMessage({ type: "open-url", url });
        return clients[0].focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
