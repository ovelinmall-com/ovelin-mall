/**
 * PushOptIn — تسجيل إشعارات Firebase FCM
 * يطلب الإذن فوراً عند تسجيل الدخول، ويجدّد الـ token تلقائياً.
 */
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { getFirebaseMessaging, getToken, onMessage, FCM_VAPID_KEY } from "@/lib/firebase";

const SW_PATH = "/firebase-messaging-sw.js";
const TOKEN_KEY = "ovelin_fcm_token";

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
  const cached = localStorage.getItem(TOKEN_KEY);
  if (cached === token) return; // لم يتغيّر
  try {
    const r = await fetch("/api/push/fcm-token", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (r.ok) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  } catch {
    /* silent */
  }
}

async function setupFCM(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

  let perm = Notification.permission;

  if (perm === "default") {
    perm = await Notification.requestPermission();
  }

  if (perm !== "granted") return;

  const token = await getFcmToken();
  if (!token) return;

  await saveFcmToken(token);

  // استمع للإشعارات في الواجهة (عندما التطبيق مفتوح)
  // نُظهر نوتيفيكيشن نظام حقيقي حتى لو التطبيق شاشة أمامية
  const messaging = getFirebaseMessaging();
  if (messaging) {
    onMessage(messaging, async (payload) => {
      if (Notification.permission !== "granted") return;
      const data  = payload.data  ?? {};
      const notif = payload.notification ?? {};
      const title    = data.title ?? notif.title ?? "Ovelin Mall";
      const body     = data.body  ?? notif.body  ?? "";
      const url      = data.url   ?? "/";
      const tag      = data.tag   ?? "ovelin";
      const rawIcon  = data.icon  ?? "/icon-512.png";

      // أيقونة مدورة مطابقة للخلفية
      let icon = rawIcon;
      try {
        const res  = await fetch(rawIcon);
        const blob = await res.blob();
        const bmp  = await createImageBitmap(blob);
        const size = 192;
        const canvas = new OffscreenCanvas(size, size);
        const ctx    = canvas.getContext("2d")!;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(bmp, 0, 0, size, size);
        const out = await canvas.convertToBlob({ type: "image/png" });
        icon = URL.createObjectURL(out);
      } catch { /* fallback to raw */ }

      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, {
        body,
        icon,
        badge:              "/icon-192.png",
        image:              rawIcon,
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
