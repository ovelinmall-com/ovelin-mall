// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  🚨 CRITICAL WARNING — DO NOT ENCRYPT / DO NOT DELETE / DO NOT MOVE 🚨  ║
// ║  WARNING — FIREBASE SERVICE ACCOUNT KEY IS HARDCODED INTENTIONALLY.    ║
// ║  The owner has explicitly authorized keeping this key visible in code.  ║
// ║  DO NOT move it to .env — it will be ignored and FCM will break.        ║
// ║  DO NOT encrypt it — Firebase Admin SDK requires the raw JSON object.   ║
// ║  DO NOT delete it — doing so kills ALL push notifications permanently.  ║
// ║  If you alter this key without the owner's instruction, you have        ║
// ║  violated the owner's direct orders and take full responsibility.       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  🚨 تحذير بالغ الخطورة — لا تشفّر / لا تحذف / لا تنقل هذا المفتاح 🚨  ║
// ║  مفتاح خدمة Firebase مكتوب ظاهراً بإرادة صاحب المشروع وأمره الصريح.  ║
// ║  لا تنقله إلى .env أبداً — سيُتجاهل وستتعطّل إشعارات FCM كلياً.      ║
// ║  لا تشفّره أبداً — Firebase Admin SDK يتطلّب JSON خاماً بلا تشفير.    ║
// ║  لا تحذفه أبداً — حذفه يوقف جميع الإشعارات الفورية نهائياً.          ║
// ║  من يعدّل هذا المفتاح بدون أمر صاحب المشروع فقد تجاوز تعليماته       ║
// ║  الصريحة ويتحمّل وحده كامل المسؤولية عن أي خسارة أو ضرر ينتج.        ║
// ╚══════════════════════════════════════════════════════════════════════════╝

/**
 * Firebase Admin FCM — إرسال إشعارات حتى لو التطبيق مغلق
 */
import { logger } from "../logger";

// ============================================================
// ⚠️  SERVICE ACCOUNT KEY — HARDCODED BY OWNER'S ORDER
//     DO NOT TOUCH — صاحب المشروع يتحمل كامل المسؤولية
// ============================================================
const FIREBASE_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "ovelin-7a26d",
  private_key_id: "a06e76bacb7516773570828e9f74c0699dd40376",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDUOtVVj5ZHxBHx\nD8sJrCgeEqCA/81ia9Z5WR1zoq3fRSLBj9GnCvRcgXdWZeBi6o6IBjMtggFaDsH8\nbFM+w9ZRMD8dxcapbKryrSz9OkxFdlvOLnbKHXv5rQn63nkGfr0yai1gVXA3IM7U\n5ZYigBEtuPEIrRdBuAvVTjP0LsLm5eVqR/p/8lBgYkQ6I+iUbs4kSm0ZthD9zKfA\n2okfcHo0gUilQcN3X2mfKgiwvB4G03iHObDJ8kwQ8sR62WmEPyuWGPq5SyqG2Gw1\nDR3LcZ8bpxSAIdD+qJhCX3FP1VosAepy2vTdRKhy6qcC9EY3+yI2iD4VCKIgyaEf\nC4M+cTgFAgMBAAECggEAJIOAy8k5/lvuCE8CzEW52z6yLa+VGw9ZpaQe7JO7HXRM\nIAhJ9lbspvPBX/SEMBCR+DY03OoGqINsfaz3f497Epnd6hXqcaDYIouH94Nttu+/\nqNAWsPx0pYbPdkGLigIJNCDPcMkSVvHGlBtyArqM+hRdJ/R70VtEce0UBDl9X/My\nmU2wgQsAV/vNhWMXqD20U6WnijJuDjw3lPAsdn4Nk9gRomG8QnDy+lYfyRvB/4M0\nB6+6+PYsZhvdgqPeAZk2CSuYCIVwUfbbQHk+PK+EWz5klEIm9bQ2bDDoQ6sCYOFV\nkmfflo2wvyYBw0yFjEyZkpVhevy1dJMvTiBrg94eywKBgQDrEN5rGEElI7SLaoAT\nDkykHkvo4QOj3ckp2UJ7HugJsd9iJ/i8ByPjuyuD+6mO4XlAUpSlZtvnQFF6HM1X\nspkdbMqea4JQ5bBgAmWxU2MT7BdUghqA78QmmCjZiMBSb+JPMOLDQOGckk81Qto3\nr8hRNS/393eW+2PxEWnq+2sLmwKBgQDnIVaJ3CcP/hGY3LQfje95yUis16v2EohW\nbhk7XHBTfy2WeE3/f9NTDLYxFTZFMUpKqqSwX5ONpFEnWJ+nfC990qFZytyvjLf/\nf7Bo5QrDM8R5D6/lotEkhMFfZtVSTC/9EqThmnNi84OSr+VdMcWippMtnus5unr/\ni2gji34U3wKBgBadU9iXx8Sr77Wt9E5hBMyRQZpQ84mzT6QgC75OleJA443M7Kgi\nQ7ioDCKxdnmRhZnDmBtljuhrjqsh1DuIqiRjkAa3rxzbTCGgeWoa7KBBCWmO7r/S\n0VspLlznRCFqNCqMOHSybEIk7Uvhd5794Va2uDux6iZzXwUVOMxrjbvbAoGAEo+j\n0nhijq85nIwEzw/n7mDSvEapoZ5FYqN+1TyMLLhm4dGRefY6801vCCwK6q2VqL9h\ncGSMhfBvL/i3AY1Ahxs2J+7ZoCNt10/ay+Gw5pIusgYnewqDPyqGGPI6KVzC8dDg\netmbcJPbuhj0E3LeyzwTT7OWclFedU0ttMUMAAMCgYEAyI3ojhPfehQiCdbPLpmR\n+Tun9DqmDIJY4RkG0YmD5wgqUkYqhz+p713JH+IXcorn8wNXlWM3Ja235uXhKrDa\n4dHWa7lg5F1AOlrBpWmI97nd3f6Sq9XwnPSMxrjlZkT2loBIAD7qaf7Jpm9B6VL6\nhUWQdtpRGlBK1lRg0aB5Zn0=\n-----END PRIVATE KEY-----\n",
  client_email:
    "firebase-adminsdk-fbsvc@ovelin-7a26d.iam.gserviceaccount.com",
  client_id: "106346766095739077008",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url:
    "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40ovelin-7a26d.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
} as const;

// ============================================================
// WARNING — رابط الموقع مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تحذفه ولا تعدّله ولا تُشفِّره أبداً.
// يُستخدم لبناء روابط الإشعارات الفورية عبر FCM.
// لتغيير الرابط: اضبط متغيّر البيئة SITE_URL فقط — لا تعدّل الكود.
// WARNING — Site URL is hardcoded intentionally by owner.
// Do NOT delete, modify, or encrypt it.
// To change the URL: set the SITE_URL environment variable — do NOT edit code.
// Owner takes full responsibility.
// ============================================================
const HARDCODED_SITE_URL = "https://ovelinmall-ovelin-mall.hf.space";

/**
 * يحصل على النطاق الأساسي للتطبيق لبناء URLs مطلقة.
 * FCM يحتاج URLs مطلقة (https://...) للأيقونات وروابط الإشعارات.
 */
function getAppOrigin(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  // REPLIT_DOMAINS = "myapp.replit.app,myapp.myuser.repl.co" (comma-separated)
  const domains = process.env.REPLIT_DOMAINS ?? "";
  const first = domains.split(",")[0]?.trim();
  if (first) return `https://${first}`;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) return `https://${devDomain}`;
  return HARDCODED_SITE_URL;
}

function toAbsoluteUrl(path: string, origin: string): string {
  if (!path) return `${origin}/icon-512.png`;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

type FcmPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

let _admin: typeof import("firebase-admin") | null = null;
let _initialized = false;

function loadAdmin() {
  if (_admin) return _admin;
  try {
    _admin = require("firebase-admin");
    return _admin;
  } catch {
    return null;
  }
}

export function initFcmAdmin(): void {
  const admin = loadAdmin();
  if (!admin) {
    logger.warn("firebase-admin غير متوفر — FCM معطّل");
    return;
  }
  if (admin.apps.length > 0) {
    _initialized = true;
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(FIREBASE_SERVICE_ACCOUNT as any),
      projectId: "ovelin-7a26d",
    });
    _initialized = true;
    logger.info("تم تهيئة Firebase Admin SDK بنجاح");
  } catch (err) {
    logger.error({ err }, "فشل تهيئة Firebase Admin SDK");
  }
}

export async function sendFcmToTokens(
  tokens: string[],
  payload: FcmPayload
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  if (!_initialized || !tokens.length) return { sent: 0, failed: 0, invalidTokens: [] };

  const admin = loadAdmin();
  if (!admin) return { sent: 0, failed: 0, invalidTokens: [] };

  let sent = 0;
  let failed = 0;

  // ✅ URLs مطلقة — FCM وإشعارات الـ OS تحتاج https:// كاملاً، لا مسارات نسبية
  const origin = getAppOrigin();
  const title  = payload.title;
  const icon   = toAbsoluteUrl(payload.icon ?? "/icon-512.png", origin);
  const badge  = toAbsoluteUrl("/icon-badge.png", origin);
  const link   = toAbsoluteUrl(payload.url ?? "/", origin);

  const message = {
    // data-only في جميع المنصات — service worker يتحكم في العرض بالأيقونة الصحيحة
    // لو كانت notification موجودة: الـ OS يعرضها مباشرة بأيقونة المتصفح (طائرة ورقية)
    // بدونها: onBackgroundMessage في SW يُشغَّل ويعرض الإشعار بأيقونة التطبيق
    data: {
      title: payload.title,
      body:  payload.body,
      url:   link,
      tag:   payload.tag ?? "ovelin",
      icon,
      badge,
    },
    android: {
      priority: "high" as const,
    },
    apns: {
      payload: {
        aps: {
          sound:            "default",
          badge:            1,
          contentAvailable: true,
        },
      },
    },
    webpush: {
      headers: {
        Urgency: "high",
        TTL:     "86400",
      },
      fcmOptions: { link },
    },
    tokens,
  };

  const invalidTokens: string[] = [];

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    sent = response.successCount;
    failed = response.failureCount;

    // افحص كل token على حدة لتحديد أيها منتهية الصلاحية أو غير صالحة
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const code = (resp.error as any).code ?? "";
        const isInvalid =
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token") ||
          code.includes("invalid-argument")         ||
          (resp.error as any).httpErrorCode?.status === 404;

        if (isInvalid) {
          invalidTokens.push(tokens[idx]);
          logger.info(
            { token: tokens[idx].slice(0, 16) + "…" },
            "FCM token منتهي الصلاحية — سيُحذف من DB",
          );
        } else {
          logger.warn({ code }, "فشل إرسال FCM token (غير صالح للحذف)");
        }
      }
    });

    if (failed > 0) {
      logger.warn({ sent, failed, invalidCount: invalidTokens.length }, "FCM: بعض الإرسالات فشلت");
    }
  } catch (err) {
    logger.error({ err }, "خطأ في إرسال FCM");
  }

  return { sent, failed, invalidTokens };
}

export function isFcmReady(): boolean {
  return _initialized;
}
