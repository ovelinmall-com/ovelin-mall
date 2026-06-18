import { db, settingsTable, onesignalPlayersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";

export type OnesignalPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

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

/**
 * يحصل على النطاق الأساسي للتطبيق لبناء URLs مطلقة.
 * الأولوية: siteUrl من DB → REPLIT_DOMAINS → fallback ثابت
 */
function getAppOrigin(siteUrl?: string): string {
  if (siteUrl) return siteUrl.replace(/\/$/, "");
  const domains = process.env.REPLIT_DOMAINS ?? "";
  const first = domains.split(",")[0]?.trim();
  if (first) return `https://${first}`;
  return "https://ovelin.replit.app";
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
  playerIds: string[],
  payload: OnesignalPayload,
): Promise<{ sent: number; failed: number }> {
  if (!playerIds.length) return { sent: 0, failed: 0 };
  const cfg = await getOnesignalConfig();
  if (!cfg) return { sent: 0, failed: 0 };

  try {
    const body = {
      ...buildNotificationFields(payload, cfg.appId, cfg.siteUrl),
      include_player_ids: playerIds,
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
      logger.warn({ status: res.status, text }, "OneSignal API error");
      return { sent: 0, failed: playerIds.length };
    }

    const data: any = await res.json();

    // OneSignal POST response may omit "recipients" (returns just {id, external_id}).
    // If the request succeeded and no errors, treat all playerIds as queued.
    const invalidPlayerIds: string[] = data.errors?.invalid_player_ids ?? [];
    const hasErrors = Array.isArray(data.errors) && data.errors.length > 0 && typeof data.errors[0] === "string";

    const sent = hasErrors
      ? 0
      : data.recipients != null
        ? data.recipients
        : playerIds.length - invalidPlayerIds.length;
    const failed = playerIds.length - sent;

    // احذف player_ids غير الصالحة التي يُعيدها OneSignal في حقل errors
    if (invalidPlayerIds.length > 0) {
      logger.info({ invalidPlayerIds }, "OneSignal: player_ids غير صالحة — سيُحذفون من DB");
      for (const pid of invalidPlayerIds) {
        try {
          await db.delete(onesignalPlayersTable).where(eq(onesignalPlayersTable.playerId, pid));
        } catch (delErr) {
          logger.warn({ delErr, pid }, "فشل حذف OneSignal player_id من DB");
        }
      }
    }

    logger.info({ notificationId: data.id, sent, failed, cleaned: invalidPlayerIds.length }, "تم إرسال OneSignal notifications");
    return { sent, failed };
  } catch (err) {
    logger.error({ err }, "خطأ في إرسال OneSignal notification");
    return { sent: 0, failed: playerIds.length };
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

  const playerIds = rows.map((r) => r.playerId);
  if (!playerIds.length) return { sent: 0, failed: 0 };
  return sendOnesignalToPlayers(playerIds, payload);
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
