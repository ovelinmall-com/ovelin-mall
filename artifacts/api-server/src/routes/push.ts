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
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import { Router, type IRouter } from "express";
import { db, pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import { getVapidPublicKey, sendPushToUser } from "../lib/services/pushService";

const router: IRouter = Router();

router.get("/push/public-key", (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) {
    res.status(503).json({ error: "نظام الإشعارات لم يُهيّأ بعد" });
    return;
  }
  res.json({ publicKey: key });
});

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
        .set({
          userId: user.id,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: userAgent ?? null,
        })
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
    await db
      .delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/push/test", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { sent } = await sendPushToUser(user.id, {
      title: "OVELIN — اختبار الإشعارات",
      body: "تم تفعيل الإشعارات بنجاح! ستصلك تنبيهات الإحالات والطلبات هنا.",
      url: "/notifications",
      tag: "test",
    });
    res.json({ success: true, sent });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
