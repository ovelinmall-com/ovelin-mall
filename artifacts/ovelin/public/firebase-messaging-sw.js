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

/**
 * بناء URL مطلق من المسار.
 * نظام إشعارات الهاتف (OS) لا يستطيع قراءة مسارات نسبية أو blob:// URLs.
 * يجب دائماً استخدام https:// كاملاً.
 */
function toAbsoluteUrl(path) {
  if (!path) return self.location.origin + "/icon-512.png";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return self.location.origin + (path.startsWith("/") ? path : "/" + path);
}

/* ---- مفتاح IndexedDB لتخزين عدد الإشعارات غير المقروءة ---- */
const DB_NAME  = "ovelin-badge";
const DB_STORE = "badge";
const DB_KEY   = "count";

async function getDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function getBadgeCount() {
  try {
    const db  = await getDb();
    return new Promise((resolve) => {
      const tx  = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(DB_KEY);
      req.onsuccess = () => resolve(req.result ?? 0);
      req.onerror   = () => resolve(0);
    });
  } catch { return 0; }
}

async function incrementBadgeCount() {
  try {
    const db  = await getDb();
    return new Promise((resolve) => {
      const tx    = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      const get   = store.get(DB_KEY);
      get.onsuccess = () => {
        const next = (get.result ?? 0) + 1;
        store.put(next, DB_KEY);
        resolve(next);
      };
      get.onerror = () => resolve(1);
    });
  } catch { return 1; }
}

/* ---- إشعار في الخلفية (التطبيق مغلق أو في علامة تبويب أخرى) ---- */
messaging.onBackgroundMessage(async (payload) => {
  const data  = payload.data  ?? {};
  const notif = payload.notification ?? {};

  const title = data.title ?? notif.title ?? "Ovelin Mall";
  const body  = data.body  ?? notif.body  ?? "";
  const url   = data.url   ?? "/";
  const tag   = data.tag   ?? "ovelin";

  // ✅ مسارات مطلقة — blob:// URLs لا تعمل في إشعارات نظام التشغيل
  const icon      = toAbsoluteUrl(data.icon ?? notif.icon ?? "/icon-512.png");
  const badgeIcon = toAbsoluteUrl("/icon-192.png");

  // ✅ تحديث رقم أيقونة التطبيق (Badging API)
  try {
    const count = await incrementBadgeCount();
    if ("setAppBadge" in navigator) {
      await navigator.setAppBadge(count);
    }
  } catch { /* الجهاز لا يدعم Badge API */ }

  await self.registration.showNotification(title, {
    body,
    icon,
    badge:               badgeIcon,
    image:               icon,
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

/* ---- نقر على الإشعار: افتح/ركّز الصفحة + امسح رقم الأيقونة ---- */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // ✅ امسح الرقم من أيقونة التطبيق عند النقر
  event.waitUntil(
    (async () => {
      try {
        if ("clearAppBadge" in navigator) await navigator.clearAppBadge();
        const db    = await getDb();
        const tx    = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put(0, DB_KEY);
      } catch { /* ignore */ }

      const url    = event.notification.data?.url ?? "/";
      const absUrl = url.startsWith("http") ? url : self.location.origin + url;
      const cs     = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = cs.find((c) => "focus" in c);
      if (existing) {
        existing.navigate?.(absUrl);
        return existing.focus();
      }
      return clients.openWindow(absUrl);
    })()
  );
});
