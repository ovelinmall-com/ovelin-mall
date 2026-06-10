/**
 * PushOptIn — تسجيل إشعارات Firebase FCM
 * يطلب الإذن فوراً عند تسجيل الدخول، ويجدّد الـ token تلقائياً.
 */
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getFirebaseMessaging, getToken, onMessage, FCM_VAPID_KEY } from "@/lib/firebase";

const SW_PATH = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;

/**
 * تحويل مسار نسبي إلى URL مطلق.
 * blob:// URLs لا تعمل في إشعارات نظام التشغيل — يجب دائماً https://.
 */
function toAbsoluteUrl(path: string): string {
  if (!path) return `${window.location.origin}/icon-512.png`;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH, { scope: "/" });
}

async function getFcmToken(): Promise<string | null> {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) return null;
    const reg = await registerServiceWorker();
    await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    return token ?? null;
  } catch (err) {
    console.warn("[FCM] فشل الحصول على الـ token:", err);
    return null;
  }
}

async function saveFcmToken(token: string): Promise<void> {
  const cached = localStorage.getItem("ovelin_fcm_token");
  if (cached === token) return;
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}api/push/fcm-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (r.ok) {
      localStorage.setItem("ovelin_fcm_token", token);
    }
  } catch {
    /* silent */
  }
}

async function setupFCM(): Promise<void> {
  // بيئات لا تدعم الإشعارات أصلاً — نتجاهل بصمت
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

  let perm = Notification.permission;

  // طلب الإذن فقط إذا لم يُحسم بعد
  if (perm === "default") {
    perm = await Notification.requestPermission();
  }

  if (perm !== "granted") return;

  const token = await getFcmToken();
  if (!token) return;

  await saveFcmToken(token);

  // استمع للإشعارات عندما التطبيق مفتوح في الواجهة (foreground)
  const messaging = getFirebaseMessaging();
  if (messaging) {
    onMessage(messaging, async (payload) => {
      if (Notification.permission !== "granted") return;

      const data  = payload.data  ?? {};
      const notif = payload.notification ?? {};
      const title = data.title ?? notif.title ?? "Ovelin Mall";
      const body  = data.body  ?? notif.body  ?? "";
      const url   = data.url   ?? "/";
      const tag   = data.tag   ?? "ovelin";

      // ✅ مسارات مطلقة — blob:// URLs لا تعمل في إشعارات الـ OS
      const icon  = toAbsoluteUrl(data.icon ?? notif.icon ?? "/icon-512.png");
      const badge = toAbsoluteUrl("/icon-192.png");

      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification(title, {
          body,
          icon,
          badge,
          image: icon,
          tag,
          renotify:           true,
          requireInteraction: false,
          silent:             false,
          vibrate:            [200, 100, 200],
          timestamp:          Date.now(),
          dir:                "rtl",
          lang:               "ar",
          data:               { url },
        } as NotificationOptions);
      } catch (err) {
        console.warn("[FCM] فشل عرض الإشعار:", err);
      }
    });
  }
}

export function PushOptIn() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    // أعطِ الصفحة ثانيتين لتكتمل قبل طلب الإذن
    const t = setTimeout(() => {
      setupFCM().catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [user?.id]);

  return null;
}
