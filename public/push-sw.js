// public/push-sw.js — Round 28x.193 (admin web push).
//
// Pulled into the main Workbox service worker via `importScripts` (see
// vite.config.ts) — a second SW can't share the scope, so push handling
// rides inside the one SW the app already registers.
//
// Payload contract (see notifyAdminPushOnBooking in functions/src/index.ts):
//   { title: string, body: string, url?: string, tag?: string }
// Anything malformed still shows a generic notification — a push the admin
// granted permission for must never be silently dropped, and Chrome
// penalises push events that show nothing.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "SunRed";
  const options = {
    body: data.body || "",
    icon: "/images/icon/pwa-icon-192.png",
    badge: "/images/icon/pwa-icon-192.png",
    tag: data.tag || "sunred-admin",
    data: { url: data.url || "/admin/bookings" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin/bookings";
  event.waitUntil(
    (async () => {
      const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const win of wins) {
        // Reuse an open SunRed tab if there is one — focus beats spawning
        // a second copy of the admin app.
        if ("focus" in win) {
          await win.focus();
          if ("navigate" in win) await win.navigate(url);
          return;
        }
      }
      await clients.openWindow(url);
    })(),
  );
});
