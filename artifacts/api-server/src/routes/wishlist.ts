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
import { db, wishlistTable, productsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/wishlist", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db
      .select({ p: productsTable })
      .from(wishlistTable)
      .innerJoin(productsTable, eq(productsTable.id, wishlistTable.productId))
      .where(eq(wishlistTable.userId, user.id))
      .orderBy(desc(wishlistTable.createdAt));
    res.json(rows.map((r) => r.p));
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/wishlist/:productId", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const productId = Number(req.params.productId);
    if (!Number.isFinite(productId)) {
      res.status(400).json({ error: "id غير صالح" });
      return;
    }
    await db
      .insert(wishlistTable)
      .values({ userId: user.id, productId })
      .onConflictDoNothing();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/wishlist/:productId", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const productId = Number(req.params.productId);
    await db
      .delete(wishlistTable)
      .where(and(eq(wishlistTable.userId, user.id), eq(wishlistTable.productId, productId)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
