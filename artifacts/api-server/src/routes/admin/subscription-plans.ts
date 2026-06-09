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
  usersTable,
} from "@workspace/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

// ─── GET /api/admin/subscription-plans ──────────────────────────────────────
router.get("/admin/subscription-plans", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: subscriptionPlansTable.id,
        productId: subscriptionPlansTable.productId,
        productName: productsTable.name,
        productPlatform: productsTable.platform,
        name: subscriptionPlansTable.name,
        description: subscriptionPlansTable.description,
        intervalDays: subscriptionPlansTable.intervalDays,
        price: subscriptionPlansTable.price,
        discountPct: subscriptionPlansTable.discountPct,
        active: subscriptionPlansTable.active,
        sortOrder: subscriptionPlansTable.sortOrder,
      })
      .from(subscriptionPlansTable)
      .leftJoin(productsTable, eq(productsTable.id, subscriptionPlansTable.productId))
      .orderBy(asc(subscriptionPlansTable.sortOrder), asc(subscriptionPlansTable.id));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─── POST /api/admin/subscription-plans ─────────────────────────────────────
router.post("/admin/subscription-plans", requireAdmin, async (req, res) => {
  try {
    const { productId, name, description, intervalDays, price, discountPct, sortOrder } = req.body as any;
    if (!productId || !name || !price) {
      res.status(400).json({ error: "بيانات مطلوبة ناقصة" });
      return;
    }
    const inserted = await db
      .insert(subscriptionPlansTable)
      .values({
        productId: Number(productId),
        name,
        description: description ?? "",
        intervalDays: Number(intervalDays ?? 30),
        price: String(price),
        discountPct: Number(discountPct ?? 0),
        sortOrder: Number(sortOrder ?? 0),
      })
      .returning();
    const product = await db
      .select({ name: productsTable.name, platform: productsTable.platform })
      .from(productsTable)
      .where(eq(productsTable.id, inserted[0]!.productId))
      .limit(1);
    res.json({ ...inserted[0], productName: product[0]?.name ?? "", productPlatform: product[0]?.platform ?? "" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─── PUT /api/admin/subscription-plans/:id ──────────────────────────────────
router.put("/admin/subscription-plans/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, intervalDays, price, discountPct, sortOrder } = req.body as any;
    if (!name || !price) {
      res.status(400).json({ error: "الاسم والسعر مطلوبان" });
      return;
    }
    const updated = await db
      .update(subscriptionPlansTable)
      .set({
        name,
        description: description ?? "",
        intervalDays: Number(intervalDays ?? 30),
        price: String(price),
        discountPct: Number(discountPct ?? 0),
        sortOrder: Number(sortOrder ?? 0),
      })
      .where(eq(subscriptionPlansTable.id, id))
      .returning();
    if (!updated[0]) {
      res.status(404).json({ error: "الخطة غير موجودة" });
      return;
    }
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل التعديل" });
  }
});

// ─── PATCH /api/admin/subscription-plans/:id/toggle ─────────────────────────
router.patch("/admin/subscription-plans/:id/toggle", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db
      .select({ active: subscriptionPlansTable.active })
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, id))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "الخطة غير موجودة" });
      return;
    }
    const newActive = !rows[0].active;
    await db
      .update(subscriptionPlansTable)
      .set({ active: newActive })
      .where(eq(subscriptionPlansTable.id, id));
    res.json({ id, active: newActive });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─── DELETE /api/admin/subscription-plans/:id ───────────────────────────────
router.delete("/admin/subscription-plans/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─── GET /api/admin/subscriptions — all user subscriptions ──────────────────
router.get("/admin/subscriptions", requireAdmin, async (req, res) => {
  try {
    const { status, planId } = req.query as Record<string, string | undefined>;
    const conds: any[] = [];
    if (status) conds.push(eq(subscriptionsTable.status, status));
    if (planId) conds.push(eq(subscriptionsTable.planId, Number(planId)));

    const rows = await db
      .select({
        id: subscriptionsTable.id,
        userId: subscriptionsTable.userId,
        username: usersTable.username,
        phone: usersTable.phone,
        planId: subscriptionsTable.planId,
        planName: subscriptionPlansTable.name,
        productName: productsTable.name,
        productPlatform: productsTable.platform,
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
      .leftJoin(usersTable, eq(usersTable.id, subscriptionsTable.userId))
      .leftJoin(subscriptionPlansTable, eq(subscriptionPlansTable.id, subscriptionsTable.planId))
      .leftJoin(productsTable, eq(productsTable.id, subscriptionPlansTable.productId))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(subscriptionsTable.createdAt))
      .limit(500);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─── GET /api/admin/subscriptions/stats ─────────────────────────────────────
router.get("/admin/subscriptions/stats", requireAdmin, async (_req, res) => {
  try {
    const statsRows = await db
      .select({
        status: subscriptionsTable.status,
        count: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(${subscriptionPlansTable.price}::numeric), 0)::text`,
      })
      .from(subscriptionsTable)
      .leftJoin(subscriptionPlansTable, eq(subscriptionPlansTable.id, subscriptionsTable.planId))
      .groupBy(subscriptionsTable.status);

    const result = {
      active: 0, cancelled: 0, expired: 0,
      totalRevenue: "0", activeRevenue: "0",
    };
    for (const row of statsRows) {
      if (row.status === "active") { result.active = row.count; result.activeRevenue = row.revenue; }
      else if (row.status === "cancelled") result.cancelled = row.count;
      else if (row.status === "expired") result.expired = row.count;
      result.totalRevenue = String(Number(result.totalRevenue) + Number(row.revenue));
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─── PATCH /api/admin/subscriptions/:id — update status ─────────────────────
router.patch("/admin/subscriptions/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body as { status: string };
    const updated = await db
      .update(subscriptionsTable)
      .set({
        status,
        ...(status === "cancelled" ? { cancelledAt: new Date(), autoRenew: false } : {}),
      })
      .where(eq(subscriptionsTable.id, id))
      .returning();
    if (!updated[0]) {
      res.status(404).json({ error: "الاشتراك غير موجود" });
      return;
    }
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
