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
import { db, postsTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/posts", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.published, true))
      .orderBy(desc(postsTable.pinned), desc(postsTable.sortOrder), desc(postsTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/posts/:slug", async (req, res) => {
  try {
    const slug = req.params.slug;
    const rows = await db
      .select()
      .from(postsTable)
      .where(and(eq(postsTable.slug, slug), eq(postsTable.published, true)))
      .limit(1);
    if (!rows.length) {
      res.status(404).json({ error: "المنشور غير موجود" });
      return;
    }
    await db
      .update(postsTable)
      .set({ views: sql`${postsTable.views} + 1` })
      .where(eq(postsTable.id, rows[0].id));
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
