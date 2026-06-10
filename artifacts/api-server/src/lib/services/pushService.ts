// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Neon PostgreSQL
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

/**
 * ============================================================
 * Push Notifications — إشعارات شريط الهاتف
 * ============================================================
 * طبقتان للإرسال:
 *  1. Firebase FCM  (الأولوية) — يشتغل حتى لو التطبيق مغلق
 *  2. Web Push/VAPID (احتياطي) — للمتصفحات الداعمة
 */
import webpush from "web-push";
import { db, settingsTable, pushSubscriptionsTable, fcmTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import { sendFcmToTokens, isFcmReady } from "./fcmService";

let initialized = false;
let publicKey: string | null = null;

async function getOrCreateVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
  subject: string;
}> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  let pub = map["vapidPublicKey"];
  let priv = map["vapidPrivateKey"];
  const subject = map["vapidSubject"] || "mailto:admin@ovelin.app";

  if (!pub || !priv) {
    const generated = webpush.generateVAPIDKeys();
    pub = generated.publicKey;
    priv = generated.privateKey;
    await db.insert(settingsTable).values({ key: "vapidPublicKey", value: pub }).onConflictDoNothing();
    await db.insert(settingsTable).values({ key: "vapidPrivateKey", value: priv }).onConflictDoNothing();
    await db.insert(settingsTable).values({ key: "vapidSubject", value: subject }).onConflictDoNothing();
    logger.info("تم توليد مفاتيح VAPID جديدة وحُفظت في قاعدة البيانات");
  }
  return { publicKey: pub, privateKey: priv, subject };
}

export async function initPush(): Promise<void> {
  if (initialized) return;
  try {
    const { publicKey: pub, privateKey, subject } = await getOrCreateVapidKeys();
    webpush.setVapidDetails(subject, pub, privateKey);
    publicKey = pub;
    initialized = true;
    logger.info("تم تهيئة نظام Web Push");
  } catch (err) {
    logger.error({ err }, "فشل تهيئة نظام Web Push");
  }
}

export function getVapidPublicKey(): string | null {
  return publicKey;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * أرسل إشعار للأدمن (OWNER_EMAIL) عبر FCM + VAPID
 */
export async function sendPushToAdmin(payload: PushPayload): Promise<void> {
  if (!initialized) await initPush();
  try {
    const { OWNER_EMAIL } = await import("../auth");
    const { usersTable: ut } = await import("@workspace/db");
    const { eq: eqFn } = await import("drizzle-orm");
    const adminRows = await db
      .select({ id: ut.id })
      .from(ut)
      .where(eqFn(ut.email, OWNER_EMAIL))
      .limit(1);
    const adminId = adminRows[0]?.id;
    if (adminId) {
      await sendPushToUser(adminId, payload);
    }
  } catch (err) {
    logger.warn({ err }, "فشل إرسال إشعار push للأدمن");
  }
}

export async function sendPushToUser(
  userId: number,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!initialized) await initPush();
  let sent = 0;
  let removed = 0;

  /* ---- 1. FCM (يشتغل حتى لو التطبيق مغلق) ---- */
  if (isFcmReady()) {
    try {
      const fcmRows = await db
        .select({ token: fcmTokensTable.token })
        .from(fcmTokensTable)
        .where(eq(fcmTokensTable.userId, userId));
      const tokens = fcmRows.map((r) => r.token);
      if (tokens.length > 0) {
        const result = await sendFcmToTokens(tokens, payload);
        sent += result.sent;
      }
    } catch (err) {
      logger.warn({ err, userId }, "فشل إرسال FCM");
    }
  }

  /* ---- 2. VAPID Web Push (احتياطي) ---- */
  try {
    const subs = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId));

    const data = JSON.stringify(payload);

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            data,
          );
          sent++;
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            try {
              await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, s.endpoint));
              removed++;
            } catch { /* ignore */ }
          } else {
            logger.warn({ err, endpoint: s.endpoint }, "فشل إرسال VAPID push");
          }
        }
      }),
    );
  } catch (err) {
    logger.error({ err, userId }, "خطأ عام في VAPID sendPushToUser");
  }

  return { sent, removed };
}
