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
import { db, usersTable, ordersTable, transactionsTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  try {
    const [u] = await db.select({ c: sql<number>`count(*)::int` }).from(usersTable);
    const [o] = await db.select({ c: sql<number>`count(*)::int` }).from(ordersTable);
    const [pend] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "pending"));
    const [done] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "delivered"));
    const [rev] = await db
      .select({ s: sql<string>`coalesce(sum(${ordersTable.finalPrice}::numeric), 0)::text` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "delivered"));
    const [pendDeps] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(transactionsTable)
      .where(and(eq(transactionsTable.type, "deposit"), eq(transactionsTable.status, "pending")));
    const recent = await db
      .select({
        id: ordersTable.id,
        userId: ordersTable.userId,
        username: usersTable.username,
        productId: ordersTable.productId,
        productName: ordersTable.productName,
        price: ordersTable.price,
        finalPrice: ordersTable.finalPrice,
        couponCode: ordersTable.couponCode,
        targetInfo: ordersTable.targetInfo,
        notes: ordersTable.notes,
        status: ordersTable.status,
        proofUrl: ordersTable.proofUrl,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .leftJoin(usersTable, eq(usersTable.id, ordersTable.userId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(10);
    res.json({
      totalUsers: Number(u?.c ?? 0),
      totalOrders: Number(o?.c ?? 0),
      pendingOrders: Number(pend?.c ?? 0),
      completedOrders: Number(done?.c ?? 0),
      totalRevenue: rev?.s ?? "0",
      pendingDeposits: Number(pendDeps?.c ?? 0),
      recentOrders: recent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
