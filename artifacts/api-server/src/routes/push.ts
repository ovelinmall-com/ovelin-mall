// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { Router, type IRouter } from "express";
import { db, pushSubscriptionsTable, fcmTokensTable, onesignalPlayersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import { getVapidPublicKey, sendPushToUser, traceAndSendToUser } from "../lib/services/pushService";

const router: IRouter = Router();

/* ---------- VAPID public key (legacy web-push) ---------- */
router.get("/push/public-key", (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(503).json({ error: "نظام الإشعارات لم يُهيّأ بعد" });
    return;
  }
  res.json({ publicKey: key });
});

/* ---------- تسجيل FCM token ---------- */
router.post("/push/fcm-token", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { token } = req.body as { token?: string };
    if (!token) {
      res.status(400).json({ error: "token مطلوب" });
      return;
    }
    const ua = req.headers["user-agent"] ?? null;

    // upsert: أدخل أو حدّث إذا وُجد
    const existing = await db
      .select()
      .from(fcmTokensTable)
      .where(eq(fcmTokensTable.token, token))
      .limit(1);

    if (existing[0]) {
      await db
        .update(fcmTokensTable)
        .set({ userId: user.id, userAgent: ua, updatedAt: new Date() })
        .where(eq(fcmTokensTable.token, token));
    } else {
      await db.insert(fcmTokensTable).values({
        userId: user.id,
        token,
        userAgent: ua as string | null,
      });
    }

    req.log.info({ userId: user.id }, "تم تسجيل FCM token");
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "فشل تسجيل FCM token");
    res.status(500).json({ error: err?.message ?? "فشل التسجيل" });
  }
});

/* ---------- حذف كل اشتراكات VAPID للمستخدم (APK mode) ---------- */
router.delete("/push/vapid-unsubscribe", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, user.id));
    req.log.info({ userId: user.id }, "[VAPID] حُذفت كل اشتراكات VAPID للمستخدم (APK mode)");
    res.json({ ok: true });
  } catch (err: any) {
    req.log.warn({ err }, "[VAPID] فشل حذف اشتراكات VAPID");
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

/* ---------- اشتراك VAPID قديم (احتياطي) ---------- */
router.post("/push/subscribe", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { endpoint, keys, userAgent } = req.body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
      userAgent?: string;
    };
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "بيانات الاشتراك غير مكتملة" });
      return;
    }
    const existing = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint))
      .limit(1);
    if (existing[0]) {
      await db
        .update(pushSubscriptionsTable)
        .set({ userId: user.id, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent ?? null })
        .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    } else {
      await db.insert(pushSubscriptionsTable).values({
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent ?? null,
      });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل التسجيل" });
  }
});

router.post("/push/unsubscribe", requireUser, async (req, res) => {
  try {
    const { endpoint } = req.body as { endpoint?: string };
    if (!endpoint) {
      res.status(400).json({ error: "endpoint مطلوب" });
      return;
    }
    await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * تسجيل External User ID في OneSignal (يربط الجهاز بـ userId بدون player_id)
 * يُستدعى عند كل تسجيل دخول من PushOptIn → registerExternalUserId()
 * ───────────────────────────────────────────────────────────────────────── */
router.post("/push/register-external-id", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { externalUserId } = req.body as { externalUserId?: string };

    // احفظ الربط في DB (بشكل تجريبي — OneSignal يربطه داخلياً عبر SDK)
    // هنا نسجّل فقط أن المستخدم طلب الربط (للتتبع)
    req.log.info(
      { userId: user.id, username: user.username, externalUserId, ua: req.headers["user-agent"]?.slice(0, 80) },
      "[ExternalID] 🔗 تم استلام طلب تسجيل external_user_id"
    );

    res.json({ ok: true, userId: user.id, externalUserId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

/* ---------- تسجيل OneSignal Player ID (Median.co APK) ---------- */
router.post("/push/onesignal-player", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { playerId } = req.body as { playerId?: string };
    if (!playerId) {
      res.status(400).json({ error: "playerId مطلوب" });
      return;
    }
    const ua = req.headers["user-agent"] ?? null;

    const existing = await db
      .select()
      .from(onesignalPlayersTable)
      .where(eq(onesignalPlayersTable.playerId, playerId))
      .limit(1);

    if (existing[0]) {
      await db
        .update(onesignalPlayersTable)
        .set({ userId: user.id, userAgent: ua as string | null, updatedAt: new Date() })
        .where(eq(onesignalPlayersTable.playerId, playerId));
    } else {
      await db.insert(onesignalPlayersTable).values({
        userId: user.id,
        playerId,
        userAgent: ua as string | null,
      });
    }

    req.log.info({ userId: user.id }, "تم تسجيل OneSignal player_id");
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "فشل تسجيل OneSignal player_id");
    res.status(500).json({ error: err?.message ?? "فشل التسجيل" });
  }
});

/* ---------- اختبار الإشعار (للمستخدم) ---------- */
router.post("/push/test", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { sent } = await sendPushToUser(user.id, {
      title: "OVELIN — اختبار الإشعارات ✅",
      body: "تم تفعيل الإشعارات بنجاح! ستصلك تنبيهات الطلبات والشحنات هنا.",
      url: "/notifications",
      tag: "test",
    });
    res.json({ success: true, sent });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

/* ---------- تشخيص إشعارات الأدمن ---------- */
router.get("/admin/push-diagnostic", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;

    // اقرأ إعدادات OneSignal من DB
    const { db: dbInst, settingsTable } = await import("@workspace/db");
    const rows = await dbInst.select().from(settingsTable);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    const appId      = map["onesignalAppId"]?.trim()      ?? "";
    const restApiKey = map["onesignalRestApiKey"]?.trim()  ?? "";

    // عدد الـ player IDs المسجلة لهذا المستخدم
    const playerRows = await db
      .select({ playerId: onesignalPlayersTable.playerId })
      .from(onesignalPlayersTable)
      .where(eq(onesignalPlayersTable.userId, user.id));

    // عدد FCM tokens
    const fcmRows = await db
      .select({ token: fcmTokensTable.token })
      .from(fcmTokensTable)
      .where(eq(fcmTokensTable.userId, user.id));

    // اختبر اتصال OneSignal API (إذا كانت الإعدادات موجودة)
    let onesignalApiOk: boolean | null = null;
    let onesignalApiError: string | null = null;
    if (appId && restApiKey) {
      try {
        const r = await fetch(`https://onesignal.com/api/v1/apps/${appId}`, {
          headers: { Authorization: `Key ${restApiKey}` },
        });
        onesignalApiOk = r.ok;
        if (!r.ok) {
          const txt = await r.text();
          onesignalApiError = `HTTP ${r.status}: ${txt.slice(0, 120)}`;
        }
      } catch (e: any) {
        onesignalApiOk = false;
        onesignalApiError = e?.message ?? "خطأ شبكة";
      }
    }

    res.json({
      userId: user.id,
      onesignal: {
        appIdSet:      Boolean(appId),
        restKeySet:    Boolean(restApiKey),
        apiConnected:  onesignalApiOk,
        apiError:      onesignalApiError,
        playerIds:     playerRows.map(r => r.playerId),
      },
      fcm: {
        tokens: fcmRows.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

/* ---------- إرسال إشعار تجريبي للأدمن مع تفاصيل ---------- */
router.post("/admin/push-test-now", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;

    const results: Record<string, any> = {};

    // 1. OneSignal — أرسل لـ All subscribers
    try {
      const { sendOnesignalToAll } = await import("../lib/services/onesignalService");
      const r = await sendOnesignalToAll({
        title: "🔔 اختبار Ovelin",
        body:  "وصلك هذا الإشعار! الإشعارات تعمل بشكل صحيح ✅",
        tag:   "diag-test",
      });
      results.onesignalAll = r;
    } catch (e: any) {
      results.onesignalAll = { error: e?.message };
    }

    // 2. OneSignal — أرسل لهذا المستخدم تحديداً
    try {
      const { sendOnesignalToUser } = await import("../lib/services/onesignalService");
      const r = await sendOnesignalToUser(user.id, {
        title: "🔔 اختبار Ovelin (لك)",
        body:  "إشعار مباشر لحسابك ✅",
        tag:   "diag-test-user",
      });
      results.onesignalUser = r;
    } catch (e: any) {
      results.onesignalUser = { error: e?.message };
    }

    // 3. FCM
    try {
      const fcmRows = await db
        .select({ token: fcmTokensTable.token })
        .from(fcmTokensTable)
        .where(eq(fcmTokensTable.userId, user.id));
      if (fcmRows.length > 0) {
        const { sendFcmToTokens } = await import("../lib/services/fcmService");
        const r = await sendFcmToTokens(fcmRows.map(r => r.token), {
          title: "🔔 اختبار FCM",
          body:  "FCM يعمل ✅",
          tag:   "diag-fcm",
        });
        results.fcm = r;
      } else {
        results.fcm = { skipped: true, reason: "لا يوجد FCM token مسجل لهذا المستخدم" };
      }
    } catch (e: any) {
      results.fcm = { error: e?.message };
    }

    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

/* ────────────────────────────────────────────────────────────────────────
 * تتبع شامل + إرسال فعلي لكل قناة (VAPID + FCM + OneSignal) لهذا المستخدم
 * ──────────────────────────────────────────────────────────────────────── */
router.post("/admin/push-trace", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const trace = await traceAndSendToUser(user.id, {
      title: "🔬 Ovelin — تتبع إشعار",
      body: `اختبار لكل قنوات الإشعار لحسابك (${user.username ?? user.id}) — ${new Date().toLocaleTimeString("ar")}`,
      url: "/notifications",
      tag: "push-trace",
    });
    res.json({ ok: true, trace });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل التتبع" });
  }
});

/* ────────────────────────────────────────────────────────────────────────────
 * /push/debug-status — دورة حياة التوكن الكاملة للمستخدم الحالي
 * ────────────────────────────────────────────────────────────────────────── */
router.get("/push/debug-status", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;

    // FCM tokens
    const fcmRows = await db
      .select()
      .from(fcmTokensTable)
      .where(eq(fcmTokensTable.userId, user.id));

    // OneSignal players
    const osRows = await db
      .select()
      .from(onesignalPlayersTable)
      .where(eq(onesignalPlayersTable.userId, user.id));

    // VAPID subscriptions
    const vapidRows = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, user.id));

    // Check FCM Admin SDK status
    const { isFcmReady } = await import("../lib/services/fcmService");
    const { isOnesignalReady } = await import("../lib/services/onesignalService");
    const osReady = await isOnesignalReady().catch(() => false);

    res.json({
      userId:   user.id,
      username: user.username ?? null,
      email:    user.email    ?? null,

      channels: {
        onesignal: {
          count:       osRows.length,
          configured:  osReady,
          tokens: osRows.map(r => ({
            playerId:    r.playerId,
            shortId:     r.playerId.slice(0, 12) + "…",
            userAgent:   r.userAgent ?? null,
            createdAt:   r.createdAt,
            updatedAt:   r.updatedAt,
          })),
          lastUpdated: osRows.length
            ? osRows.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).updatedAt
            : null,
          status: osRows.length > 0 ? "ok" : "missing",
          diagnosis: osRows.length > 0
            ? "player_id مسجّل — الإشعارات مفعّلة"
            : "لا يوجد player_id — تأكد أن OneSignal مُفعَّل في Median Dashboard",
        },
        fcm: {
          count:       fcmRows.length,
          configured:  isFcmReady(),
          tokens: fcmRows.map(r => ({
            shortToken:  r.token.slice(0, 20) + "…",
            userAgent:   r.userAgent ?? null,
            createdAt:   r.createdAt,
            updatedAt:   r.updatedAt,
          })),
          lastUpdated: fcmRows.length
            ? fcmRows.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).updatedAt
            : null,
          status: fcmRows.length > 0 ? "ok" : "missing",
          diagnosis: !isFcmReady()
            ? "Firebase Admin SDK غير مُهيّأ"
            : fcmRows.length > 0
              ? "FCM token مسجّل — الإشعارات مفعّلة"
              : "لا يوجد FCM token — يجب منح إذن الإشعارات في المتصفح",
        },
        vapid: {
          count:       vapidRows.length,
          subscriptions: vapidRows.map(r => ({
            shortEndpoint: r.endpoint.slice(-30),
            userAgent:     r.userAgent ?? null,
            createdAt:     r.createdAt,
          })),
          status: vapidRows.length > 0 ? "ok" : "missing",
        },
      },

      summary: {
        hasAnyToken: fcmRows.length > 0 || osRows.length > 0 || vapidRows.length > 0,
        readyChannels: [
          ...(osRows.length  > 0 ? ["onesignal"] : []),
          ...(fcmRows.length > 0 ? ["fcm"]        : []),
          ...(vapidRows.length > 0 ? ["vapid"]    : []),
        ],
        nextStep: osRows.length === 0 && fcmRows.length === 0 && vapidRows.length === 0
          ? "لا يوجد أي token — يجب فتح التطبيق ومنح إذن الإشعارات أولاً"
          : "الإشعارات مفعّلة — يمكنك إرسال إشعار تجريبي",
      },

      checklist: {
        step1_token_generated:     fcmRows.length > 0 || osRows.length > 0,
        step2_token_saved_locally: null,
        step3_token_sent_to_server: fcmRows.length > 0 || osRows.length > 0,
        step4_token_in_database:   fcmRows.length > 0 || osRows.length > 0,
        step5_token_linked_to_user: fcmRows.length > 0 || osRows.length > 0,
        step6_notification_can_send: (fcmRows.length > 0 && isFcmReady()) || osRows.length > 0 || vapidRows.length > 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * اختبار حقيقي عبر external_user_id — يُحاكي إشعار طلب شحن للأدمن
 * ───────────────────────────────────────────────────────────────────────── */
router.post("/admin/push-test-external", requireUser, async (req, res) => {
  try {
    const { OWNER_EMAIL } = await import("../lib/auth");
    const { usersTable: ut } = await import("@workspace/db");
    const { or, eq: eqFn, sql: sqlFn } = await import("drizzle-orm");
    const { sendOnesignalToExternalUser } = await import("../lib/services/onesignalService");

    // ابحث عن الأدمن — ORDER BY يضمن إعادة "skandar" أولاً دائماً
    const adminRows = await db
      .select({ id: ut.id, username: ut.username })
      .from(ut)
      .where(or(eqFn(ut.email, OWNER_EMAIL), eqFn(ut.username, "skandar"), eqFn(ut.username, "admin")))
      .orderBy(sqlFn`CASE WHEN ${ut.email} = ${OWNER_EMAIL} THEN 0 WHEN ${ut.username} = 'skandar' THEN 1 ELSE 2 END`)
      .limit(1);

    const admin = adminRows[0];
    if (!admin) {
      res.status(404).json({ error: "لم يُعثر على حساب الأدمن" });
      return;
    }

    const started = Date.now();
    const payload = {
      title: "🧪 اختبار طلب شحن — External ID",
      body: `محمد — 500.00 ج.س عبر زين كاش (اختبار external_id ✅)`,
      url: "/admin",
      tag: "live-test-extid",
    };

    // جرّب بالـ userId
    const r1 = await sendOnesignalToExternalUser(String(admin.id), payload);
    // جرّب بالـ username
    const r2 = await sendOnesignalToExternalUser(admin.username, payload);

    res.json({
      ok: true,
      elapsed: Date.now() - started,
      adminId: admin.id,
      adminUsername: admin.username,
      byUserId:   r1,
      byUsername: r2,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل الاختبار" });
  }
});

/* ─────────────────────────────────────────────────────────────────────────
 * اختبار فوري — يرسل إشعار طلب شحن حقيقي للأدمن ويقيس وقت الاستجابة
 * يُستخدم من تاب "إشعارات" في لوحة الأدمن
 * ───────────────────────────────────────────────────────────────────────── */
router.post("/admin/push-live-test", requireUser, async (req, res) => {
  try {
    const { sendPushToUser } = await import("../lib/services/pushService");
    const { usersTable: ut } = await import("@workspace/db");
    const { or, eq: eqFn, sql: sqlFn } = await import("drizzle-orm");
    const OWNER_EMAIL = "skandarabdoalatif@gmail.com";

    // ابحث عن الأدمن — ORDER BY يضمن إعادة "skandar" أولاً دائماً
    const adminRows = await db
      .select({ id: ut.id, username: ut.username })
      .from(ut)
      .where(or(eqFn(ut.email, OWNER_EMAIL), eqFn(ut.username, "skandar"), eqFn(ut.username, "admin")))
      .orderBy(sqlFn`CASE WHEN ${ut.email} = ${OWNER_EMAIL} THEN 0 WHEN ${ut.username} = 'skandar' THEN 1 ELSE 2 END`)
      .limit(1);

    const admin = adminRows[0];
    if (!admin) {
      res.status(404).json({ error: "لم يُعثر على حساب الأدمن في قاعدة البيانات" });
      return;
    }

    const started = Date.now();
    const result = await sendPushToUser(admin.id, {
      title: "🧪 اختبار — طلب شحن جديد",
      body:  "محمد — 500.00 ج.س عبر زين كاش (اختبار حقيقي ✅)",
      url:   "/admin",
      tag:   "live-test-deposit",
    });
    const elapsed = Date.now() - started;
    res.json({ ok: true, elapsed, adminId: admin.id, adminUsername: admin.username, result });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل الاختبار" });
  }
});

export default router;
