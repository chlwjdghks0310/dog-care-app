self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// 서버가 보낸 웹 푸시를 받아서 실제 알림으로 띄운다 — 브라우저(탭)가 닫혀 있어도
// 서비스워커는 OS가 대신 깨워주기 때문에 이 부분만은 동작한다.
self.addEventListener("push", (event) => {
  let data = { title: "🐾 멍케어", body: "새 알림이 있어요." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // JSON이 아니면 기본 문구를 그대로 쓴다.
  }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/favicon.svg", vibrate: [400, 150, 400, 150, 400] }));
});

// 알림을 탭하면 이미 열려 있는 탭이 있으면 그걸 포커스하고, 없으면 새로 연다.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("/");
    })
  );
});
