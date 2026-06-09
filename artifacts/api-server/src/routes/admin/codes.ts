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
import { db, productCodesTable, productsTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { audit } from "../../lib/services/auditLog";

const router: IRouter = Router();

// Stats per product (available + sold + reserved counts)
router.get("/admin/codes/stats", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        productId: productCodesTable.productId,
        status: productCodesTable.status,
        c: sql<number>`count(*)::int`,
      })
      .from(productCodesTable)
      .groupBy(productCodesTable.productId, productCodesTable.status);

    type Stat = { productId: number; available: number; sold: number; reserved: number };
    const map = new Map<number, Stat>();
    for (const r of rows) {
      const s = map.get(r.productId) ?? { productId: r.productId, available: 0, sold: 0, reserved: 0 };
      if (r.status === "available") s.available = Number(r.c);
      else if (r.status === "sold") s.sold = Number(r.c);
      else if (r.status === "reserved") s.reserved = Number(r.c);
      map.set(r.productId, s);
    }
    res.json(Array.from(map.values()));
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// List codes for a product
router.get("/admin/products/:id/codes", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "id غير صالح" });
      return;
    }
    const status = (req.query.status as string | undefined)?.trim();
    const conds: any[] = [eq(productCodesTable.productId, id)];
    if (status && ["available", "reserved", "sold"].includes(status)) {
      conds.push(eq(productCodesTable.status, status));
    }
    const rows = await db
      .select()
      .from(productCodesTable)
      .where(and(...conds))
      .orderBy(desc(productCodesTable.createdAt))
      .limit(1000);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// Bulk add codes to a product (paste many separated by newlines, commas, or spaces)
router.post("/admin/products/:id/codes", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "id غير صالح" });
      return;
    }
    const product = (
      await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1)
    )[0];
    if (!product) {
      res.status(404).json({ error: "المنتج غير موجود" });
      return;
    }

    const body = req.body as { codes?: string | string[]; note?: string };
    let raw: string[] = [];
    if (Array.isArray(body.codes)) raw = body.codes;
    else if (typeof body.codes === "string")
      raw = body.codes.split(/[\r\n,;\t ]+/);
    else {
      res.status(400).json({ error: "أدخل أكواد للإضافة" });
      return;
    }

    const codes = Array.from(
      new Set(raw.map((s) => String(s ?? "").trim()).filter((s) => s.length > 0)),
    );
    if (codes.length === 0) {
      res.status(400).json({ error: "لم يتم إدخال أكواد صالحة" });
      return;
    }
    if (codes.length > 5000) {
      res.status(400).json({ error: "عدد الأكواد كبير جداً (حد أقصى 5000 دفعة واحدة)" });
      return;
    }

    const inserted = await db
      .insert(productCodesTable)
      .values(
        codes.map((code) => ({
          productId: id,
          code,
          note: body.note?.trim() || null,
          status: "available" as const,
        })),
      )
      .returning({ id: productCodesTable.id });

    await audit("admin", "add_codes", "product_codes", id, {
      count: inserted.length,
      productName: product.name,
    });
    res.json({ added: inserted.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// Delete a code (only if available)
router.delete("/admin/codes/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "id غير صالح" });
      return;
    }
    const row = (
      await db
        .select()
        .from(productCodesTable)
        .where(eq(productCodesTable.id, id))
        .limit(1)
    )[0];
    if (!row) {
      res.status(404).json({ error: "غير موجود" });
      return;
    }
    if (row.status === "sold") {
      res.status(400).json({ error: "لا يمكن حذف كود تم بيعه" });
      return;
    }
    await db.delete(productCodesTable).where(eq(productCodesTable.id, id));
    await audit("admin", "delete_code", "product_codes", id, { productId: row.productId });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// Bulk delete all available codes for a product
router.delete("/admin/products/:id/codes", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "id غير صالح" });
      return;
    }
    const result = await db
      .delete(productCodesTable)
      .where(
        and(
          eq(productCodesTable.productId, id),
          eq(productCodesTable.status, "available"),
        ),
      )
      .returning({ id: productCodesTable.id });
    await audit("admin", "bulk_delete_codes", "product_codes", id, { count: result.length });
    res.json({ deleted: result.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
