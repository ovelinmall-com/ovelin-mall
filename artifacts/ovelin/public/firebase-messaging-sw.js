// firebase-messaging-sw.js
// Service Worker لاستقبال إشعارات Push في الخلفية (FCM) + دعم VAPID Web Push
// هذا الملف لازم يبقى في جذر public/ بهذا الاسم بالضبط.

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCjeZbaraXNeKyeW73KBFLWDX3YRLgPZqc",
  authDomain: "ovelin-7a26d.firebaseapp.com",
  projectId: "ovelin-7a26d",
  storageBucket: "ovelin-7a26d.firebasestorage.app",
  messagingSenderId: "786618250840",
  appId: "1:786618250840:web:5a7529bb53f22230b3bc2d",
});

const messaging = firebase.messaging();

// ── إشعارات FCM في الخلفية (التطبيق/الصفحة مغلقة) ──────────────────────────
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notif = payload.notification || {};

  const title = data.title || notif.title || "Ovelin Mall";
  const body = data.body || notif.body || "";
  const icon = data.icon || "/icon-512.png";
  const badge = data.badge || "/icon-badge.png";
  const tag = data.tag || "ovelin";
  const url = data.url || "/";

  self.registration.showNotification(title, {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: false,
    silent: false,
    vibrate: [0, 200, 100, 200],
    timestamp: Date.now(),
    dir: "rtl",
    lang: "ar",
    data: { url },
    actions: [
      { action: "open", title: "فتح التطبيق" },
      { action: "dismiss", title: "تجاهل" },
    ],
  });
});

// ── دعم VAPID Web Push الخام (احتياطي — عند عدم توفر رسالة FCM) ───────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return; // يترك المعالجة لـ onBackgroundMessage أعلاه إن كانت رسالة FCM قياسية
  }

  const title = payload.title || "Ovelin Mall";
  const url = payload.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: payload.icon || "/icon-512.png",
      badge: payload.badge || "/icon-badge.png",
      tag: payload.tag || "ovelin",
      renotify: true,
      requireInteraction: false,
      silent: false,
      vibrate: [0, 200, 100, 200],
      timestamp: Date.now(),
      dir: "rtl",
      lang: "ar",
      data: { url },
      actions: [
        { action: "open", title: "فتح التطبيق" },
        { action: "dismiss", title: "تجاهل" },
      ],
    }),
  );
});

// ── الضغط على الإشعار: فتح/تركيز نافذة التطبيق على الرابط المطلوب ─────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
