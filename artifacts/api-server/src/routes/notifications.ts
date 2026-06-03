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
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/notifications", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const list = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, user.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/notifications/unread-count", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const r = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));
    res.json({ count: Number(r[0]?.c ?? 0) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/notifications/read-all", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/notifications/:id/read", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
