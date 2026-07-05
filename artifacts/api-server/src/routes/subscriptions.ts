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
import {
  db,
  subscriptionPlansTable,
  subscriptionsTable,
  productsTable,
  transactionsTable,
  usersTable,
} from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

// ─── GET /api/subscription-plans — public list of active plans ──────────────
router.get("/subscription-plans", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: subscriptionPlansTable.id,
        productId: subscriptionPlansTable.productId,
        productName: productsTable.name,
        imageUrl: productsTable.imageUrl,
        name: subscriptionPlansTable.name,
        description: subscriptionPlansTable.description,
        intervalDays: subscriptionPlansTable.intervalDays,
        price: subscriptionPlansTable.price,
        discountPct: subscriptionPlansTable.discountPct,
        sortOrder: subscriptionPlansTable.sortOrder,
      })
      .from(subscriptionPlansTable)
      .leftJoin(productsTable, eq(productsTable.id, subscriptionPlansTable.productId))
      .where(
        and(
          eq(subscriptionPlansTable.active, true),
          eq(productsTable.active, true),
        ),
      )
      .orderBy(asc(subscriptionPlansTable.sortOrder), asc(subscriptionPlansTable.id));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل تحميل الخطط" });
  }
});

// ─── GET /api/subscriptions/my — user's own subscriptions ───────────────────
router.get("/subscriptions/my", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db
      .select({
        id: subscriptionsTable.id,
        planId: subscriptionsTable.planId,
        planName: subscriptionPlansTable.name,
        productName: productsTable.name,
        productId: subscriptionPlansTable.productId,
        imageUrl: productsTable.imageUrl,
        platform: productsTable.platform,
        price: subscriptionPlansTable.price,
        intervalDays: subscriptionPlansTable.intervalDays,
        status: subscriptionsTable.status,
        autoRenew: subscriptionsTable.autoRenew,
        targetInfo: subscriptionsTable.targetInfo,
        nextBillingAt: subscriptionsTable.nextBillingAt,
        lastBilledAt: subscriptionsTable.lastBilledAt,
        createdAt: subscriptionsTable.createdAt,
        cancelledAt: subscriptionsTable.cancelledAt,
      })
      .from(subscriptionsTable)
      .leftJoin(subscriptionPlansTable, eq(subscriptionPlansTable.id, subscriptionsTable.planId))
      .leftJoin(productsTable, eq(productsTable.id, subscriptionPlansTable.productId))
      .where(eq(subscriptionsTable.userId, user.id))
      .orderBy(desc(subscriptionsTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل تحميل الاشتراكات" });
  }
});

// ─── POST /api/subscriptions/subscribe ──────────────────────────────────────
router.post("/subscriptions/subscribe", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { planId, targetInfo } = req.body as { planId: number; targetInfo: string };

    if (!planId || !targetInfo?.trim()) {
      res.status(400).json({ error: "يرجى تحديد الخطة ومعلومات الهدف" });
      return;
    }

    const plans = await db
      .select()
      .from(subscriptionPlansTable)
      .where(and(eq(subscriptionPlansTable.id, Number(planId)), eq(subscriptionPlansTable.active, true)))
      .limit(1);
    const plan = plans[0];
    if (!plan) {
      res.status(404).json({ error: "الخطة غير موجودة أو غير متاحة" });
      return;
    }

    const balance = Number(user.balance);
    const price = Number(plan.price);
    if (balance < price) {
      res.status(402).json({ error: `رصيدك غير كافٍ. المطلوب: ${price.toFixed(2)} ج.س، رصيدك: ${balance.toFixed(2)} ج.س` });
      return;
    }

    await db
      .update(usersTable)
      .set({ balance: String((balance - price).toFixed(2)) })
      .where(eq(usersTable.id, user.id));

    const nextBillingAt = new Date(Date.now() + plan.intervalDays * 24 * 60 * 60 * 1000);
    const inserted = await db
      .insert(subscriptionsTable)
      .values({
        userId: user.id,
        planId: plan.id,
        status: "active",
        autoRenew: true,
        targetInfo: targetInfo.trim(),
        nextBillingAt,
        lastBilledAt: new Date(),
      })
      .returning();

    await db.insert(transactionsTable).values({
      userId: user.id,
      type: "subscription",
      amount: String(price),
      method: "wallet",
      reference: `sub-${inserted[0]!.id}`,
      status: "completed",
      meta: JSON.stringify({ planId: plan.id, planName: plan.name, subscriptionId: inserted[0]!.id }),
    });

    res.json({ subscription: inserted[0], message: "تم الاشتراك بنجاح" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل الاشتراك" });
  }
});

// ─── POST /api/subscriptions/:id/cancel ─────────────────────────────────────
router.post("/subscriptions/:id/cancel", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);

    const rows = await db
      .select()
      .from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, user.id)))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({ error: "الاشتراك غير موجود" });
      return;
    }

    await db
      .update(subscriptionsTable)
      .set({ status: "cancelled", cancelledAt: new Date(), autoRenew: false })
      .where(eq(subscriptionsTable.id, id));

    res.json({ success: true, message: "تم إلغاء الاشتراك" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل الإلغاء" });
  }
});

// ─── POST /api/subscriptions/:id/toggle-renew ───────────────────────────────
router.post("/subscriptions/:id/toggle-renew", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);

    const rows = await db
      .select()
      .from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, user.id)))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({ error: "الاشتراك غير موجود" });
      return;
    }

    const newVal = !rows[0].autoRenew;
    await db
      .update(subscriptionsTable)
      .set({ autoRenew: newVal })
      .where(eq(subscriptionsTable.id, id));

    res.json({ success: true, autoRenew: newVal });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─── GET /api/subscriptions/:id — single subscription detail ────────────────
router.get("/subscriptions/:id", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);

    const rows = await db
      .select({
        id: subscriptionsTable.id,
        planId: subscriptionsTable.planId,
        planName: subscriptionPlansTable.name,
        productName: productsTable.name,
        productId: subscriptionPlansTable.productId,
        imageUrl: productsTable.imageUrl,
        price: subscriptionPlansTable.price,
        intervalDays: subscriptionPlansTable.intervalDays,
        status: subscriptionsTable.status,
        autoRenew: subscriptionsTable.autoRenew,
        targetInfo: subscriptionsTable.targetInfo,
        nextBillingAt: subscriptionsTable.nextBillingAt,
        createdAt: subscriptionsTable.createdAt,
      })
      .from(subscriptionsTable)
      .leftJoin(subscriptionPlansTable, eq(subscriptionPlansTable.id, subscriptionsTable.planId))
      .leftJoin(productsTable, eq(productsTable.id, subscriptionPlansTable.productId))
      .where(and(eq(subscriptionsTable.id, id), eq(subscriptionsTable.userId, user.id)))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({ error: "الاشتراك غير موجود" });
      return;
    }
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
