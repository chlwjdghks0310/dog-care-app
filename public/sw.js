// 인터넷 없이 앱을 열면 보여 줄 안내 페이지 하나만 저장해 둔다(앱 파일은 저장하지 않아 업데이트는 그대로 바로 반영).
const OFFLINE_CACHE = "mungcare-offline-v2"; // 안내 페이지를 바꾸면 숫자를 올려 새로 받게
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(OFFLINE_CACHE).then((c) => c.add(new Request(OFFLINE_URL, { cache: "reload" }))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// 화면을 여는 요청(앱 켜기·새로고침)만: 인터넷이 안 되면 안내 페이지. 나머지 요청은 손대지 않는다.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
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
