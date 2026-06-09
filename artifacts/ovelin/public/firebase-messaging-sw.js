/* ============================================================
   Firebase Cloud Messaging — Service Worker
   يشتغل في الخلفية حتى لو التطبيق مغلق تماماً
   ============================================================ */
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

/* ---- الأيقونة المدورة — يُرسم canvas دائري في الذاكرة ---- */
async function getRoundIcon(src) {
  try {
    const res  = await fetch(src);
    const blob = await res.blob();
    const bmp  = await createImageBitmap(blob);
    const size = 192;
    const canvas = new OffscreenCanvas(size, size);
    const ctx    = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(bmp, 0, 0, size, size);
    const out  = await canvas.convertToBlob({ type: "image/png" });
    return URL.createObjectURL(out);
  } catch {
    return src;
  }
}

/* ---- إشعار في الخلفية (التطبيق مغلق أو في علامة تبويب أخرى) ---- */
messaging.onBackgroundMessage(async (payload) => {
  const data  = payload.data  ?? {};
  const notif = payload.notification ?? {};

  const title = data.title ?? notif.title ?? "Ovelin Mall";
  const body  = data.body  ?? notif.body  ?? "";
  const url   = data.url   ?? "/";
  const tag   = data.tag   ?? "ovelin";
  const rawIcon = data.icon ?? "/icon-512.png";

  const roundIcon = await getRoundIcon(rawIcon).catch(() => rawIcon);

  await self.registration.showNotification(title, {
    body,
    icon:  roundIcon,
    badge: "/icon-192.png",
    image: rawIcon,
    tag,
    renotify:            true,
    requireInteraction:  false,
    silent:              false,
    vibrate:             [200, 100, 200],
    timestamp:           Date.now(),
    dir:                 "rtl",
    lang:                "ar",
    data:                { url },
  });
});

/* ---- نقر على الإشعار: افتح/ركّز الصفحة ---- */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((cs) => {
        const existing = cs.find((c) => "focus" in c);
        if (existing) {
          existing.navigate?.(url);
          return existing.focus();
        }
        return clients.openWindow(url);
      })
  );
});
