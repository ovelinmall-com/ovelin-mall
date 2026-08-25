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
import { db, fraudFlagsTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

router.get("/admin/fraud", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: fraudFlagsTable.id,
        userId: fraudFlagsTable.userId,
        username: usersTable.username,
        ip: fraudFlagsTable.ip,
        reason: fraudFlagsTable.reason,
        severity: fraudFlagsTable.severity,
        details: fraudFlagsTable.details,
        resolved: fraudFlagsTable.resolved,
        resolvedBy: fraudFlagsTable.resolvedBy,
        createdAt: fraudFlagsTable.createdAt,
      })
      .from(fraudFlagsTable)
      .leftJoin(usersTable, eq(usersTable.id, fraudFlagsTable.userId))
      .orderBy(desc(fraudFlagsTable.createdAt))
      .limit(200);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/fraud/:id/resolve", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.update(fraudFlagsTable).set({ resolved: true, resolvedBy: "admin" }).where(eq(fraudFlagsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/fraud/:id/block-user", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const flag = await db.select().from(fraudFlagsTable).where(eq(fraudFlagsTable.id, id)).limit(1);
    if (!flag[0] || !flag[0].userId) {
      res.status(404).json({ error: "المستخدم غير موجود في الإنذار" });
      return;
    }
    await db.update(usersTable).set({ isBlocked: true }).where(eq(usersTable.id, flag[0].userId));
    await db.update(fraudFlagsTable).set({ resolved: true, resolvedBy: "admin-block" }).where(eq(fraudFlagsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
