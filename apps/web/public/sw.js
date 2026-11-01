/*
 * 휴대폰 앱(PWA) 서비스 워커 (2026-11-01).
 * 화면을 기기에 저장(캐시)하지 않는다 - 늘 최신 사이트를 그대로 보여 준다.
 * 매일 아침 "오늘의 운세" 알림(push)을 받아 띄우고, 누르면 그 화면을 연다 (2026-11-01 유샘).
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch (e) {
    msg = { body: event.data ? event.data.text() : "" };
  }
  const title = msg.title || "오늘의 운세";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: msg.body || "오늘의 운세를 열어 보세요.",
      icon: msg.icon,
      badge: msg.icon,
      tag: msg.tag || "daily",
      renotify: false,
      data: { url: msg.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          return c.focus().then(() => ("navigate" in c ? c.navigate(url) : undefined));
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
