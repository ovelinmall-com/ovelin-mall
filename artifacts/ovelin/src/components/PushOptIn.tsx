/**
 * PushOptIn — تسجيل إشعارات الهاتف
 *
 * يدعم 3 بيئات:
 *  1. متصفح عادي (Chrome/Firefox) — Web Push عبر FCM + Service Worker
 *  2. PWA مثبّت — نفس المتصفح لكن كـ تطبيق
 *  3. median.co APK — OneSignal bridge (gonative_onesignal_info)
 *
 * دورة حياة التوكن الكاملة:
 *  [Token Generated] → [Token Saved Locally] → [Token Sent To Server]
 *  → [Token Saved In Database] → [Token Linked To User] → [Notification Sent]
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { getFirebaseMessaging, getToken, onMessage, FCM_VAPID_KEY } from "@/lib/firebase";

const BASE = import.meta.env.BASE_URL;
const SW_PATH  = `${BASE}firebase-messaging-sw.js`;
const SW_SCOPE = BASE || "/";
const LOG = "[PushOptIn]";

// ── Helpers ─────────────────────────────────────────────────────────────────

function toAbsoluteUrl(path: string): string {
  if (!path) return `${window.location.origin}/icon-512.png`;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function isMedianApp(): boolean {
  return (
    /GoNativeAndroid|GoNativeiOS|median/i.test(navigator.userAgent) ||
    typeof (window as any).gonative !== "undefined" ||
    typeof (window as any).median !== "undefined"
  );
}

function logStep(step: string, detail?: string, ok = true) {
  const icon = ok ? "✅" : "❌";
  const msg = detail ? `${icon} ${step}: ${detail}` : `${icon} ${step}`;
  if (ok) {
    console.info(LOG, msg);
  } else {
    console.warn(LOG, msg);
  }
}

// ── حفظ التوكنز في السيرفر ──────────────────────────────────────────────────

export async function saveOnesignalPlayerId(playerId: string): Promise<boolean> {
  logStep("Token Sent To Server (OneSignal)", playerId.slice(0, 12) + "…");
  try {
    const r = await fetch(`${BASE}api/push/onesignal-player`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (r.ok) {
      localStorage.setItem("ovelin_onesignal_player_id", playerId);
      localStorage.removeItem("ovelin_pending_player_id");
      logStep("Token Saved In Database (OneSignal)", playerId.slice(0, 12) + "…");
      logStep("Token Linked To User (OneSignal)", "DB updated");
      return true;
    }
    const txt = await r.text().catch(() => "");
    logStep("Token Sent To Server (OneSignal)", `Server rejected — HTTP ${r.status}: ${txt.slice(0, 80)}`, false);
    return false;
  } catch (err: any) {
    logStep("Token Sent To Server (OneSignal)", `Network error: ${err?.message}`, false);
    return false;
  }
}

export async function saveFcmToken(token: string): Promise<boolean> {
  logStep("Token Sent To Server (FCM)", token.slice(0, 20) + "…");
  try {
    const r = await fetch(`${BASE}api/push/fcm-token`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (r.ok) {
      localStorage.setItem("ovelin_fcm_token", token);
      localStorage.removeItem("ovelin_pending_fcm_token");
      logStep("Token Saved In Database (FCM)", token.slice(0, 20) + "…");
      logStep("Token Linked To User (FCM)", "DB updated");
      return true;
    }
    const txt = await r.text().catch(() => "");
    logStep("Token Sent To Server (FCM)", `Server rejected — HTTP ${r.status}: ${txt.slice(0, 80)}`, false);
    return false;
  } catch (err: any) {
    logStep("Token Sent To Server (FCM)", `Network error: ${err?.message}`, false);
    return false;
  }
}

// ── مزامنة localStorage → السيرفر (بعد تسجيل الدخول) ─────────────────────

/**
 * يقرأ الـ player_id / fcm_token من localStorage ويرسلها للسيرفر.
 * يراجع كلاً من:
 *   - ovelin_pending_*  (مخزّنة قبل تسجيل الدخول من index.html bridge)
 *   - ovelin_onesignal_player_id / ovelin_fcm_token (مخزّنة من جلسة سابقة)
 */
async function flushPendingRegistrations(): Promise<void> {
  console.info(LOG, "🔄 flushPendingRegistrations — checking localStorage...");

  const pendingPlayerId = localStorage.getItem("ovelin_pending_player_id");
  const pendingFcmToken = localStorage.getItem("ovelin_pending_fcm_token");
  const savedPlayerId   = localStorage.getItem("ovelin_onesignal_player_id");
  const savedFcmToken   = localStorage.getItem("ovelin_fcm_token");

  console.info(LOG, "📋 localStorage state:", {
    "pending_player_id":  pendingPlayerId ? pendingPlayerId.slice(0, 12) + "…" : "null",
    "saved_player_id":    savedPlayerId   ? savedPlayerId.slice(0, 12) + "…"   : "null",
    "pending_fcm_token":  pendingFcmToken ? pendingFcmToken.slice(0, 20) + "…" : "null",
    "saved_fcm_token":    savedFcmToken   ? savedFcmToken.slice(0, 20) + "…"   : "null",
  });

  const playerIdToSync = pendingPlayerId ?? savedPlayerId;
  const fcmTokenToSync = pendingFcmToken ?? savedFcmToken;

  if (playerIdToSync) {
    logStep("Token Saved Locally (OneSignal)", playerIdToSync.slice(0, 12) + "… found in localStorage");
    await saveOnesignalPlayerId(playerIdToSync);
  } else {
    console.info(LOG, "ℹ️ No OneSignal player_id in localStorage — waiting for bridge callback");
  }

  if (fcmTokenToSync) {
    logStep("Token Saved Locally (FCM)", fcmTokenToSync.slice(0, 20) + "… found in localStorage");
    await saveFcmToken(fcmTokenToSync);
  } else {
    console.info(LOG, "ℹ️ No FCM token in localStorage — will try to generate one");
  }
}

// ── median.co: استدعاء الجسر بشكل نشط ─────────────────────────────────────

/**
 * ⚠️ مهم جداً: Median.co يستدعي الـ callbacks بواسطة اسم الدالة كـ STRING
 * وليس بتمرير function object مباشرة.
 * الشكل الصحيح: { callback: 'gonative_onesignal_info' }
 * الشكل الخاطئ: { callback: function(info) {...} }
 *
 * الدوال المسجّلة على window في index.html:
 *   - gonative_onesignal_info
 *   - median_push_registration
 *   - gonative_firebase_token
 *   - ovelin_push_permission_cb
 */
function pollMedianBridge(attempt = 1): void {
  console.info(LOG, `🔄 pollMedianBridge attempt #${attempt}`);

  // تحديث callbacks بدوال تمرّر للسيرفر مباشرة (بعد تسجيل الدخول)
  (window as any).gonative_onesignal_info = (r: Record<string, any>) => {
    console.info(LOG, "🔔 gonative_onesignal_info (React handler, full):", JSON.stringify(r));
    // OneSignal SDK v5+ uses onesignalId/subscriptionId — support all field names
    const playerId = r?.onesignalId ?? r?.subscriptionId ?? r?.userId ?? r?.playerId ?? r?.id;
    const pushToken = r?.pushToken ?? r?.token ?? r?.fcmToken ?? r?.registrationId;
    if (playerId) saveOnesignalPlayerId(String(playerId)).catch(() => {});
    if (pushToken) saveFcmToken(String(pushToken)).catch(() => {});
    if (!playerId && !pushToken) {
      console.warn(LOG, "⚠️ gonative_onesignal_info: no player_id found. Full:", JSON.stringify(r));
    }
  };
  (window as any).median_onesignal_info  = (window as any).gonative_onesignal_info;

  (window as any).gonative_registration = (r: { registrationId?: string }) => {
    console.info(LOG, "🔔 gonative_registration (React handler):", r);
    if (r?.registrationId) saveFcmToken(r.registrationId).catch(() => {});
  };
  (window as any).gonative_firebase_token = (r: { token?: string }) => {
    console.info(LOG, "🔔 gonative_firebase_token (React handler):", r);
    if (r?.token) saveFcmToken(r.token).catch(() => {});
  };
  (window as any).median_push_registration = (r: { token?: string; registrationId?: string }) => {
    console.info(LOG, "🔔 median_push_registration (React handler):", r);
    const t = r?.token ?? r?.registrationId;
    if (t) saveFcmToken(t).catch(() => {});
  };
  (window as any).ovelin_push_permission_cb = (r: any) => {
    console.info(LOG, "🔔 ovelin_push_permission_cb (React handler, full):", JSON.stringify(r));
    const pushToken = r?.token ?? r?.pushToken ?? r?.fcmToken ?? r?.registrationId;
    const playerId  = r?.playerId ?? r?.onesignalId ?? r?.subscriptionId ?? r?.userId ?? r?.id;
    if (pushToken) saveFcmToken(String(pushToken)).catch(() => {});
    if (playerId)  saveOnesignalPlayerId(String(playerId)).catch(() => {});
  };

  // استدعاء نشط للجسر بالشكل الصحيح (string callback name)
  try {
    const gn = (window as any).gonative || (window as any).median;
    if (!gn) {
      console.warn(LOG, "⚠️ gonative/median bridge not available on attempt #" + attempt);
      return;
    }

    console.info(LOG, "✅ Bridge found:", Object.keys(gn).slice(0, 10).join(", "));

    if (typeof gn?.onesignal?.onesignalInfo === "function") {
      console.info(LOG, "📡 Calling gonative.onesignal.onesignalInfo (string callback)...");
      gn.onesignal.onesignalInfo({ callback: "gonative_onesignal_info" });
    } else {
      console.warn(LOG, "⚠️ gonative.onesignal.onesignalInfo not available");
    }

    if (typeof gn?.push?.getPermissionStatus === "function") {
      console.info(LOG, "📡 Calling gonative.push.getPermissionStatus...");
      gn.push.getPermissionStatus({ callback: "ovelin_push_permission_cb" });
    }

    if (typeof gn?.push?.requestPermission === "function") {
      console.info(LOG, "📡 Calling gonative.push.requestPermission...");
      gn.push.requestPermission({ callback: "ovelin_push_permission_cb" });
    }

    if (typeof gn?.push?.getToken === "function") {
      console.info(LOG, "📡 Calling gonative.push.getToken...");
      gn.push.getToken({ callback: "ovelin_push_permission_cb" });
    }

    if (typeof gn?.nativebridge?.firebaseToken === "function") {
      console.info(LOG, "📡 Calling gonative.nativebridge.firebaseToken...");
      gn.nativebridge.firebaseToken({ callback: "gonative_firebase_token" });
    }

  } catch (err: any) {
    console.warn(LOG, "❌ Bridge call error:", err?.message ?? err);
  }
}

// ── Web Push (متصفح عادي / PWA) ──────────────────────────────────────────

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  console.info(LOG, "📡 Registering Service Worker:", SW_PATH);
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) {
    console.info(LOG, "✅ Service Worker already registered");
    return existing;
  }
  const reg = await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
  await navigator.serviceWorker.ready;
  console.info(LOG, "✅ Service Worker registered successfully");
  return reg;
}

async function getFcmToken(): Promise<string | null> {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      logStep("Token Generated (FCM)", "Firebase Messaging not initialized — check firebase.ts", false);
      return null;
    }
    console.info(LOG, "📡 Requesting FCM token via VAPID...");
    const reg = await registerServiceWorker();
    await navigator.serviceWorker.ready;
    const token = (await getToken(messaging, { vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: reg })) ?? null;
    if (token) {
      logStep("Token Generated (FCM)", token.slice(0, 20) + "…");
    } else {
      logStep("Token Generated (FCM)", "getToken returned null — verify VAPID key in Firebase Console → Project Settings → Cloud Messaging", false);
    }
    return token;
  } catch (err: any) {
    const code = err?.code ?? "";
    logStep("Token Generated (FCM)", `Error: ${code || err?.message}`, false);
    if (code === "messaging/token-subscribe-failed") {
      console.error(LOG, "💡 Hint: VAPID key mismatch — check Firebase Console → Project Settings → Cloud Messaging → Web Push certificates");
    }
    if (code === "messaging/permission-blocked") {
      console.error(LOG, "💡 Hint: Notification permission blocked by user — must re-enable in browser settings");
    }
    return null;
  }
}

async function setupWebPush(): Promise<void> {
  console.info(LOG, "🌐 setupWebPush — browser/PWA mode");

  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    logStep("Token Generated (FCM)", "serviceWorker or Notification API not supported in this environment", false);
    return;
  }

  let perm = Notification.permission;
  console.info(LOG, "🔐 Notification permission:", perm);

  if (perm === "default") {
    console.info(LOG, "📡 Requesting notification permission...");
    perm = await Notification.requestPermission();
    console.info(LOG, "🔐 Permission result:", perm);
  }

  if (perm !== "granted") {
    logStep("Token Generated (FCM)", `Permission not granted: ${perm}`, false);
    return;
  }

  let token: string | null = null;
  for (let i = 1; i <= 3; i++) {
    console.info(LOG, `📡 FCM token attempt ${i}/3...`);
    token = await getFcmToken();
    if (token) break;
    if (i < 3) await new Promise(r => setTimeout(r, i * 1500));
  }

  if (!token) {
    logStep("Token Generated (FCM)", "Failed after 3 attempts", false);
    return;
  }

  await saveFcmToken(token);

  const messaging = getFirebaseMessaging();
  if (!messaging) return;

  onMessage(messaging, async (payload) => {
    if (Notification.permission !== "granted") return;
    const data  = payload.data ?? {};
    const notif = payload.notification ?? {};
    const title = data.title ?? (notif as any).title ?? "Ovelin Mall";
    const icon  = toAbsoluteUrl(data.icon ?? (notif as any).icon ?? "/icon-512.png");
    const badge = toAbsoluteUrl("/icon-192.png");
    logStep("Notification Sent To Token", `Foreground notification: "${title}"`);
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body:               data.body ?? (notif as any).body ?? "",
        icon, badge,
        tag:                data.tag ?? "ovelin",
        renotify:           true,
        requireInteraction: false,
        silent:             false,
        vibrate:            [0, 200, 100, 200],
        timestamp:          Date.now(),
        dir:                "rtl",
        lang:               "ar",
        data:               { url: data.url ?? "/" },
        actions: [
          { action: "open",    title: "فتح التطبيق" },
          { action: "dismiss", title: "تجاهل"       },
        ],
      } as NotificationOptions);
    } catch (err) {
      console.warn(LOG, "⚠️ Failed to show foreground notification:", err);
    }
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export function PushOptIn() {
  const { user } = useAuth();
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bridgeRetryCountRef = useRef(0);

  useEffect(() => {
    if (!user) return;

    console.info(LOG, `🚀 User logged in: ${user.username ?? user.id} — starting push registration`);
    console.info(LOG, "🔍 Environment:", {
      isMedianApp: isMedianApp(),
      userAgent: navigator.userAgent.slice(0, 80),
      hasGonative: !!(window as any).gonative,
      hasMedian: !!(window as any).median,
      notificationSupported: "Notification" in window,
      serviceWorkerSupported: "serviceWorker" in navigator,
    });

    // Step 1: flush any tokens already in localStorage (from index.html bridge or prev session)
    flushPendingRegistrations().catch(() => {});

    // Step 2: poll median bridge (re-registers callbacks + actively requests tokens)
    pollMedianBridge(1);

    // Step 3: retry bridge polling every 5 seconds for 3 minutes
    // This handles cases where the bridge initializes late after the webview loads
    retryIntervalRef.current = setInterval(() => {
      bridgeRetryCountRef.current++;
      const hasSavedToken = !!(
        localStorage.getItem("ovelin_onesignal_player_id") ||
        localStorage.getItem("ovelin_fcm_token") ||
        localStorage.getItem("ovelin_pending_player_id") ||
        localStorage.getItem("ovelin_pending_fcm_token")
      );

      if (hasSavedToken) {
        // Already have a token — flush to server in case DB lost it, then stop retrying
        console.info(LOG, `✅ Token found in localStorage — flushing to server (retry #${bridgeRetryCountRef.current})`);
        flushPendingRegistrations().catch(() => {});
        if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
        return;
      }

      if (bridgeRetryCountRef.current >= 36) {
        // 3 minutes elapsed — give up
        console.warn(LOG, "⏱️ Bridge retry timeout (3min) — no token received");
        if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
        return;
      }

      console.info(LOG, `🔄 No token yet — polling bridge (retry #${bridgeRetryCountRef.current})`);
      pollMedianBridge(bridgeRetryCountRef.current + 1);
    }, 5000);

    // Step 4: if browser/PWA (not APK), set up Web Push FCM
    const webPushTimer = setTimeout(() => {
      if (!isMedianApp()) {
        console.info(LOG, "🌐 Browser/PWA mode — setting up Web Push FCM");
        setupWebPush().catch((err) => console.warn(LOG, "setupWebPush error:", err));
      } else {
        console.info(LOG, "📱 Median APK mode — skipping Web Push (using native push)");
      }
    }, 2000);

    return () => {
      clearTimeout(webPushTimer);
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [user?.id]);

  return null;
}
