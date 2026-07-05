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
import { db, flashSalesTable, productsTable } from "@workspace/db";
import { and, desc, eq, gt } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

router.get("/admin/flash-sales", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: flashSalesTable.id,
        productId: flashSalesTable.productId,
        productName: productsTable.name,
        discount_pct: flashSalesTable.discountPct,
        starts_at: flashSalesTable.startsAt,
        ends_at: flashSalesTable.endsAt,
        active: flashSalesTable.active,
        totalSold: flashSalesTable.totalSold,
        maxQty: flashSalesTable.maxQty,
        createdAt: flashSalesTable.createdAt,
      })
      .from(flashSalesTable)
      .leftJoin(productsTable, eq(productsTable.id, flashSalesTable.productId))
      .orderBy(desc(flashSalesTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/flash-sales", requireAdmin, async (req, res) => {
  try {
    const { productId, discountPct, durationMinutes, maxQty } = req.body as {
      productId: number;
      discountPct: number;
      durationMinutes: number;
      maxQty?: number;
    };
    if (!productId || !discountPct || !durationMinutes) {
      res.status(400).json({ error: "بيانات مطلوبة ناقصة" });
      return;
    }
    const endsAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    const inserted = await db
      .insert(flashSalesTable)
      .values({
        productId,
        discountPct,
        endsAt,
        maxQty: maxQty ?? 0,
        active: true,
      })
      .returning();
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/admin/flash-sales/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.update(flashSalesTable).set({ active: false }).where(eq(flashSalesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
