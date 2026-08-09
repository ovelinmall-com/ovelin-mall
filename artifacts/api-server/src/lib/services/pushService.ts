// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Supabase PostgreSQL
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
import { db, settingsTable, pushSubscriptionsTable, fcmTokensTable, onesignalPlayersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import { sendFcmToTokens, isFcmReady } from "./fcmService";
import {
  getAdminExternalId,
  sendOnesignalToExternalUser,
  sendOnesignalToUser,
  sendOnesignalToAll,
} from "./onesignalService";
export { sendOnesignalToAll };

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
 * أرسل إشعار الأدمن إلى External ID المرتبط بالحساب الإداري.
 * يُحلّ المعرّف من البريد الإداري في قاعدة البيانات حتى لا يعتمد
 * الإرسال على رقم مستخدم ثابت قابل للتغيّر.
 */
export async function sendPushToAdmin(payload: PushPayload): Promise<void> {
  const startMs = Date.now();
  try {
    const externalId = await getAdminExternalId();
    if (!externalId) {
      logger.warn({ email: "skandarabdoalatif@gmail.com" },
        "[Admin Push] لم يتم العثور على حساب الأدمن");
      return;
    }
    logger.info({ externalId, title: payload.title },
      "[Admin Push] إرسال إلى OneSignal External ID");
    const result = await sendOnesignalToExternalUser(externalId, payload);

    const elapsed = Date.now() - startMs;
    logger.info({ externalId, result, elapsed, title: payload.title },
      "[Admin Push] ✅ انتهى إرسال إشعار الأدمن");

  } catch (err) {
    logger.warn({ err, elapsed: Date.now() - startMs }, "[Admin Push] ❌ فشل عام في إرسال إشعار push للأدمن");
  }
}

export async function sendPushToUser(
  userId: number,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!initialized) await initPush();
  let sent = 0;
  let removed = 0;

  /* ---- 0. OneSignal (APK via Median.co) ---- */
  try {
    const os = await sendOnesignalToUser(userId, payload);
    sent += os.sent;
    // إذا لم يُرسَل عبر player_id (لا يوجد مسجّل) جرّب external_id fallback
    if (os.sent === 0) {
      try {
        const { sendOnesignalToExternalUser } = await import("./onesignalService");
        const extResult = await sendOnesignalToExternalUser(String(userId), payload);
        sent += extResult.sent;
        if (extResult.sent > 0) {
          logger.info({ userId, sent: extResult.sent }, "[Push] ✅ External ID fallback نجح");
        }
      } catch (extErr) {
        logger.warn({ extErr, userId }, "[Push] External ID fallback فشل");
      }
    }
  } catch (err) {
    logger.warn({ err, userId }, "فشل إرسال OneSignal");
  }

  /* ---- 1. FCM (احتياطي فقط إذا لم يُرسَل عبر OneSignal — لمنع التكرار) ---- */
  if (isFcmReady() && sent === 0) {
    try {
      const fcmRows = await db
        .select({ token: fcmTokensTable.token })
        .from(fcmTokensTable)
        .where(eq(fcmTokensTable.userId, userId));
      const tokens = fcmRows.map((r) => r.token);
      if (tokens.length > 0) {
        const result = await sendFcmToTokens(tokens, payload);
        sent += result.sent;

        // احذف tokens المنتهية الصلاحية من DB فوراً لمنع تراكمها
        if (result.invalidTokens.length > 0) {
          for (const token of result.invalidTokens) {
            try {
              await db.delete(fcmTokensTable).where(eq(fcmTokensTable.token, token));
              removed++;
            } catch (delErr) {
              logger.warn({ delErr }, "فشل حذف FCM token منتهي الصلاحية");
            }
          }
          logger.info({ removed: result.invalidTokens.length, userId }, "تم حذف FCM tokens منتهية الصلاحية");
        }
      }
    } catch (err) {
      logger.warn({ err, userId }, "فشل إرسال FCM");
    }
  }

  /* ---- 2. VAPID Web Push (احتياطي فقط إذا لم يُرسَل عبر OneSignal أو FCM — لمنع التكرار) ---- */
  if (sent > 0) {
    return { sent, removed };
  }
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

/* ─────────────────────────────────────────────────────────────────────────
 * traceAndSendToUser — نفس sendPushToUser لكن مع نتائج تفصيلية لكل قناة
 * ───────────────────────────────────────────────────────────────────────── */
export interface PushChannelTrace {
  tokenCount: number;
  sent: number;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  details?: Array<{ id: string; status: "sent" | "gone" | "error"; error?: string; code?: number }>;
}

export interface PushTraceResult {
  userId: number;
  ts: string;
  channels: {
    onesignal: PushChannelTrace;
    fcm: PushChannelTrace & { invalidRemoved?: number };
    vapid: PushChannelTrace;
  };
}

export async function traceAndSendToUser(
  userId: number,
  payload: PushPayload,
): Promise<PushTraceResult> {
  if (!initialized) await initPush();

  const trace: PushTraceResult = {
    userId,
    ts: new Date().toISOString(),
    channels: {
      onesignal: { tokenCount: 0, sent: 0, details: [] },
      fcm:       { tokenCount: 0, sent: 0, invalidRemoved: 0, details: [] },
      vapid:     { tokenCount: 0, sent: 0, details: [] },
    },
  };

  /* ── OneSignal ── */
  try {
    const osRows = await db
      .select({ playerId: onesignalPlayersTable.playerId })
      .from(onesignalPlayersTable)
      .where(eq(onesignalPlayersTable.userId, userId));
    trace.channels.onesignal.tokenCount = osRows.length;
    if (osRows.length === 0) {
      trace.channels.onesignal.skipped = true;
      trace.channels.onesignal.skipReason = "لا يوجد player_id مسجل لهذا المستخدم";
    } else {
      const os = await sendOnesignalToUser(userId, payload);
      trace.channels.onesignal.sent = os.sent;
      if (os.failed && os.failed > 0) {
        trace.channels.onesignal.error = `${os.failed} جهاز فشل الإرسال إليه`;
      }
    }
  } catch (err: any) {
    trace.channels.onesignal.error = err?.message ?? "خطأ غير معروف";
    logger.warn({ err, userId }, "[TRACE] OneSignal فشل");
  }

  /* ── FCM ── */
  try {
    const fcmRows = await db
      .select({ token: fcmTokensTable.token })
      .from(fcmTokensTable)
      .where(eq(fcmTokensTable.userId, userId));
    trace.channels.fcm.tokenCount = fcmRows.length;
    if (!isFcmReady()) {
      trace.channels.fcm.skipped = true;
      trace.channels.fcm.skipReason = "FCM Admin SDK غير مُهيّأ";
    } else if (fcmRows.length === 0) {
      trace.channels.fcm.skipped = true;
      trace.channels.fcm.skipReason = "لا يوجد FCM token مسجل لهذا المستخدم";
    } else {
      const result = await sendFcmToTokens(fcmRows.map(r => r.token), payload);
      trace.channels.fcm.sent = result.sent;
      for (const t of result.invalidTokens) {
        try { await db.delete(fcmTokensTable).where(eq(fcmTokensTable.token, t)); } catch { /* ignore */ }
        (trace.channels.fcm.invalidRemoved as number)++;
      }
    }
  } catch (err: any) {
    trace.channels.fcm.error = err?.message ?? "خطأ غير معروف";
    logger.warn({ err, userId }, "[TRACE] FCM فشل");
  }

  /* ── VAPID ── */
  try {
    const subs = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId));
    trace.channels.vapid.tokenCount = subs.length;
    if (subs.length === 0) {
      trace.channels.vapid.skipped = true;
      trace.channels.vapid.skipReason = "لا يوجد VAPID subscription مسجل";
    } else {
      const data = JSON.stringify(payload);
      await Promise.all(subs.map(async (s) => {
        const id = s.endpoint.slice(-30);
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            data,
          );
          trace.channels.vapid.sent++;
          trace.channels.vapid.details!.push({ id, status: "sent" });
        } catch (err: any) {
          const code: number = err?.statusCode ?? 0;
          if (code === 410 || code === 404) {
            await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, s.endpoint)).catch(() => {});
            trace.channels.vapid.details!.push({ id, status: "gone", code });
          } else {
            trace.channels.vapid.details!.push({ id, status: "error", error: err?.message ?? "خطأ", code });
          }
        }
      }));
    }
  } catch (err: any) {
    trace.channels.vapid.error = err?.message ?? "خطأ غير معروف";
    logger.warn({ err, userId }, "[TRACE] VAPID فشل");
  }

  logger.info({ trace }, "[TRACE] push trace مكتمل");
  return trace;
}
