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
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import { Router, type IRouter } from "express";
import { db, usersTable, ordersTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats/overview", async (_req, res) => {
  try {
    const [u] = await db.select({ c: sql<number>`count(*)::int` }).from(usersTable);
    const [o] = await db.select({ c: sql<number>`count(*)::int` }).from(ordersTable);
    const [d] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "delivered"));
    const platRows = await db
      .selectDistinct({ p: productsTable.platform })
      .from(productsTable);
    const platforms = platRows.filter((r) => r.p && r.p.trim()).length;
    res.json({
      totalUsers: Number(u?.c ?? 0),
      totalOrders: Number(o?.c ?? 0),
      totalDelivered: Number(d?.c ?? 0),
      platforms,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
