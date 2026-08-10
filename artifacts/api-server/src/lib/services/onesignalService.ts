import { db, settingsTable, onesignalPlayersTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { logger } from "../logger";

export type OnesignalPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

// الحساب الإداري الوحيد المستهدف بإشعارات الأدمن.
// نحلّ المعرّف من البريد بدلاً من افتراض أن رقم المستخدم سيظل 1.
export const ADMIN_EMAIL = "skandarabdoalatif@gmail.com";

export async function getAdminExternalId(): Promise<string | null> {
  const rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, ADMIN_EMAIL))
    .limit(1);
  return rows[0] ? String(rows[0].id) : null;
}

async function getOnesignalConfig(): Promise<{ appId: string; restApiKey: string; siteUrl?: string } | null> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  const appId = map["onesignalAppId"]?.trim();
  const restApiKey = map["onesignalRestApiKey"]?.trim();
  if (!appId || !restApiKey) return null;
  const siteUrl = map["siteUrl"]?.trim() || undefined;
  return { appId, restApiKey, siteUrl };
}

// ============================================================
// WARNING — رابط الموقع مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تحذفه ولا تعدّله ولا تُشفِّره أبداً.
// يُستخدم لبناء روابط الإشعارات الفورية عبر OneSignal.
// لتغيير الرابط: اضبط متغيّر البيئة SITE_URL فقط — لا تعدّل الكود.
// WARNING — Site URL is hardcoded intentionally by owner.
// Do NOT delete, modify, or encrypt it.
// To change the URL: set the SITE_URL environment variable — do NOT edit code.
// Owner takes full responsibility.
// ============================================================
const HARDCODED_SITE_URL = "https://ovelinmall-ovelin-mall.hf.space";

/**
 * يحصل على النطاق الأساسي للتطبيق لبناء URLs مطلقة.
 * الأولوية: siteUrl من DB → SITE_URL → REPLIT_DOMAINS → fallback ثابت
 */
function getAppOrigin(siteUrl?: string): string {
  if (siteUrl) return siteUrl.replace(/\/$/, "");
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const domains = process.env.REPLIT_DOMAINS ?? "";
  const first = domains.split(",")[0]?.trim();
  if (first) return `https://${first}`;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) return `https://${devDomain}`;
  return HARDCODED_SITE_URL;
}

/**
 * يحوّل URL نسبياً إلى مطلق باستخدام نطاق التطبيق.
 * هذا ضروري لكي يفتح الضغط على الإشعار التطبيق (Median APK) لا المتصفح.
 */
function toAbsoluteUrl(url: string | undefined, siteUrl?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const origin = getAppOrigin(siteUrl);
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * الحقول المشتركة لكل إشعار — تصميم احترافي عصري
 * بدون large_icon → أندرويد يستخدم أيقونة التطبيق تلقائياً بشكل دائري
 * android_accent_color = لون العلامة التجارية (وردي/روز)
 */
function buildNotificationFields(payload: OnesignalPayload, appId: string, siteUrl?: string) {
  const absoluteUrl = toAbsoluteUrl(payload.url, siteUrl);
  const origin = getAppOrigin(siteUrl);
  const iconUrl = `${origin}/icon-512.png`;

  return {
    app_id: appId,
    headings: { en: payload.title, ar: payload.title },
    contents: { en: payload.body,  ar: payload.body  },
    // URL مطلق لكي يفتح الإشعار التطبيق (Median webview) لا المتصفح
    ...(absoluteUrl ? { url: absoluteUrl } : {}),
    ...(payload.tag ? { collapse_id: payload.tag } : {}),

    // ── الأيقونة ───────────────────────────────────────────────────
    // large_icon = الدائرة على يمين الإشعار في Samsung/أندرويد
    // يستخدم نطاق REPLIT_DOMAINS الحالي (ثابت لكل المشروع)
    large_icon: iconUrl,

    // ── ألوان العلامة التجارية ──────────────────────────────────────
    android_accent_color: "FFFF0066", // ARGB — لون العلامة التجارية الوردي
    android_led_color:    "FFFF0066", // LED مطابق للعلامة التجارية

    // ── أولوية قصوى لأندرويد ──────────────────────────────────────
    priority:             10,         // 10 = أعلى أولوية في OneSignal
    android_visibility:   1,          // public — يظهر على شاشة القفل
    ttl:                  259200,     // 3 أيام

    // ── iOS ────────────────────────────────────────────────────────
    ios_badgeType:  "Increase",
    ios_badgeCount: 1,
  };
}

// Sync check — callers that just need a best-effort boolean use this.
export function isOnesignalConfigured(): boolean {
  return true;
}

export async function isOnesignalReady(): Promise<boolean> {
  const cfg = await getOnesignalConfig();
  return Boolean(cfg?.appId && cfg?.restApiKey);
}

export async function sendOnesignalToPlayers(
  subscriptionIds: string[],
  payload: OnesignalPayload,
): Promise<{ sent: number; failed: number }> {
  if (!subscriptionIds.length) return { sent: 0, failed: 0 };
  const cfg = await getOnesignalConfig();
  if (!cfg) return { sent: 0, failed: 0 };

  try {
    const body = {
      ...buildNotificationFields(payload, cfg.appId, cfg.siteUrl),
      // OneSignal SDK v5 returns a subscription ID. The old
      // include_player_ids field only accepts legacy player IDs and
      // rejects SDK v5 subscriptions even when they are registered.
      include_subscription_ids: subscriptionIds,
    };

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${cfg.restApiKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      // Keep the raw response for diagnostics below.
    }

    // OneSignal POST response may omit "recipients" (returns just {id}).
    // If the request succeeded and no errors, treat all subscriptions as queued.
    const invalidSubscriptionIds: string[] = [
      ...(Array.isArray(data.errors?.invalid_subscription_ids)
        ? data.errors.invalid_subscription_ids
        : []),
      ...(Array.isArray(data.errors?.invalid_player_ids)
        ? data.errors.invalid_player_ids
        : []),
    ];
    const hasErrors =
      (Array.isArray(data.errors) && data.errors.length > 0) ||
      (data.errors && typeof data.errors === "object" &&
        Object.keys(data.errors).length > 0);

    const errorText = JSON.stringify(data.errors ?? text);
    const allSubscriptionsInactive =
      /all included players are not subscribed/i.test(errorText);
    const subscriptionsToRemove = allSubscriptionsInactive
      ? subscriptionIds
      : invalidSubscriptionIds;

    // OneSignal returns HTTP 200 for some delivery errors, including the
    // common "All included players are not subscribed" response. Never treat
    // that response as a successful send: otherwise FCM/VAPID fallback is
    // skipped and stale IDs remain in the database forever.
    if (!res.ok || hasErrors) {
      if (subscriptionsToRemove.length > 0) {
        await Promise.all(
          subscriptionsToRemove.map(async (subscriptionId) => {
            try {
              await db
                .delete(onesignalPlayersTable)
                .where(eq(onesignalPlayersTable.playerId, subscriptionId));
            } catch (delErr) {
              logger.warn(
                { delErr, subscriptionId },
                "فشل حذف OneSignal subscription ID من DB",
              );
            }
          }),
        );
      }

      logger.warn(
        {
          status: res.status,
          error: errorText.slice(0, 500),
          failed: subscriptionIds.length,
          cleaned: subscriptionsToRemove.length,
        },
        "OneSignal delivery failed",
      );
      return { sent: 0, failed: subscriptionIds.length };
    }

    // OneSignal may return `{ id, errors: {} }` or omit `recipients` for a
    // queued notification. An empty errors object is success, not failure.
    // Treat the request as queued unless OneSignal explicitly reported an
    // invalid target/error; otherwise the caller incorrectly falls back to
    // another channel and can create duplicate notifications.
    const sent = data.recipients != null && Number(data.recipients) > 0
      ? Number(data.recipients)
      : subscriptionIds.length;
    const failed = subscriptionIds.length - sent;

    // احذف معرّفات الاشتراك غير الصالحة التي يُعيدها OneSignal في حقل errors
    if (invalidSubscriptionIds.length > 0) {
      logger.info(
        { invalidSubscriptionIds },
        "OneSignal: subscription IDs غير صالحة — سيُحذفون من DB",
      );
      for (const subscriptionId of invalidSubscriptionIds) {
        try {
          await db
            .delete(onesignalPlayersTable)
            .where(eq(onesignalPlayersTable.playerId, subscriptionId));
        } catch (delErr) {
          logger.warn({ delErr, subscriptionId }, "فشل حذف OneSignal subscription ID من DB");
        }
      }
    }

    logger.info(
      { notificationId: data.id, sent, failed, cleaned: invalidSubscriptionIds.length },
      "تم إرسال OneSignal notifications",
    );
    return { sent, failed };
  } catch (err) {
    logger.error({ err }, "خطأ في إرسال OneSignal notification");
    return { sent: 0, failed: subscriptionIds.length };
  }
}

export async function sendOnesignalToUser(
  userId: number,
  payload: OnesignalPayload,
): Promise<{ sent: number; failed: number }> {
  const rows = await db
    .select({ playerId: onesignalPlayersTable.playerId })
    .from(onesignalPlayersTable)
    .where(eq(onesignalPlayersTable.userId, userId));

  const subscriptionIds = rows.map((r) => r.playerId);
  if (!subscriptionIds.length) return { sent: 0, failed: 0 };
  return sendOnesignalToPlayers(subscriptionIds, payload);
}

/**
 * يرسل إلى أحدث اشتراك فقط. مفيد للحساب الإداري لأن إعادة تثبيت الـAPK
 * تترك أحياناً اشتراكات قديمة صالحة في قاعدة البيانات، وإرسالها كلها قد
 * يجعل OneSignal يضع الإشعار على جهاز قديم بدلاً من الجهاز الحالي.
 */
export async function sendOnesignalToLatestUser(
  userId: number,
  payload: OnesignalPayload,
): Promise<{ sent: number; failed: number }> {
  const rows = await db
    .select({ playerId: onesignalPlayersTable.playerId })
    .from(onesignalPlayersTable)
    .where(eq(onesignalPlayersTable.userId, userId))
    .orderBy(desc(onesignalPlayersTable.updatedAt), desc(onesignalPlayersTable.createdAt))
    .limit(1);

  return sendOnesignalToPlayers(rows.map((row) => row.playerId), payload);
}

/**
 * يُرسِل إشعاراً لمستخدم عبر external_user_id (معرّف خارجي = userId من DB).
 * هذا هو الأسلوب الموثوق مع OneSignal SDK v5 عوضاً عن player_ids.
 * يُستخدَم كـ fallback عندما لا يوجد player_id مسجَّل لهذا المستخدم.
 */
export async function sendOnesignalToExternalUser(
  externalUserId: string,
  payload: OnesignalPayload,
): Promise<{ sent: number; failed: number; method: string }> {
  const cfg = await getOnesignalConfig();
  if (!cfg) return { sent: 0, failed: 0, method: "no_config" };

  try {
    const body = {
      ...buildNotificationFields(payload, cfg.appId, cfg.siteUrl),
      // OneSignal API v1: target by external user ID
      include_aliases: { external_id: [externalUserId] },
      target_channel: "push",
    };

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${cfg.restApiKey}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { /* ignore */ }

    if (!res.ok) {
      logger.warn({ status: res.status, text: text.slice(0, 300), externalUserId }, "OneSignal external_id API error");
      return { sent: 0, failed: 1, method: "external_id" };
    }

    const sent = data.recipients ?? (data.errors ? 0 : 1);
    logger.info({ notificationId: data.id, sent, externalUserId }, "OneSignal: إرسال عبر external_id");
    return { sent, failed: 0, method: "external_id" };
  } catch (err) {
    logger.error({ err, externalUserId }, "خطأ في إرسال OneSignal بـ external_id");
    return { sent: 0, failed: 1, method: "external_id" };
  }
}

export async function sendOnesignalToAll(
  payload: OnesignalPayload,
): Promise<{ sent: number; failed: number }> {
  const cfg = await getOnesignalConfig();
  if (!cfg) return { sent: 0, failed: 0 };

  try {
    const body = {
      ...buildNotificationFields(payload, cfg.appId, cfg.siteUrl),
      included_segments: ["All"],
    };

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${cfg.restApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, text }, "OneSignal broadcast API error");
      return { sent: 0, failed: 0 };
    }

    const data: any = await res.json();
    const sent = data.recipients ?? 0;
    logger.info({ sent }, "تم إرسال OneSignal broadcast لجميع المشتركين");
    return { sent, failed: 0 };
  } catch (err) {
    logger.error({ err }, "خطأ في إرسال OneSignal broadcast");
    return { sent: 0, failed: 0 };
  }
}
