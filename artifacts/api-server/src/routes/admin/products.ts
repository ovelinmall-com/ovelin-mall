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
import { db, productsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { audit } from "../../lib/services/auditLog";

const router: IRouter = Router();

router.get("/admin/products", requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(productsTable).orderBy(desc(productsTable.sortOrder), desc(productsTable.id));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/products", requireAdmin, async (req, res) => {
  try {
    const body = req.body as any;
    if (!body?.name || !body?.price || !body?.category) {
      res.status(400).json({ error: "بيانات مطلوبة ناقصة" });
      return;
    }
    const inserted = await db
      .insert(productsTable)
      .values({
        name: body.name,
        description: body.description ?? "",
        price: String(body.price),
        oldPrice: body.oldPrice != null ? String(body.oldPrice) : null,
        category: body.category,
        platform: body.platform ?? null,
        quantity: body.quantity != null ? String(body.quantity) : null,
        deliveryTime: body.deliveryTime ?? null,
        imageUrl: body.imageUrl ?? null,
        badge: body.badge ?? null,
        active: body.active ?? true,
        sortOrder: body.sortOrder ?? 0,
      })
      .returning();
    await audit("admin", "create_product", "products", inserted[0]!.id);
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as any;
    const set: any = {};
    for (const k of ["name", "description", "category", "platform", "deliveryTime", "imageUrl", "badge"]) {
      if (body[k] != null) set[k] = body[k];
    }
    if (body.price != null) set.price = String(body.price);
    if (body.oldPrice != null) set.oldPrice = String(body.oldPrice) || null;
    if (body.quantity != null) set.quantity = String(body.quantity);
    if (typeof body.active === "boolean") set.active = body.active;
    if (body.sortOrder != null) set.sortOrder = Number(body.sortOrder);
    const updated = await db.update(productsTable).set(set).where(eq(productsTable.id, id)).returning();
    if (!updated[0]) {
      res.status(404).json({ error: "غير موجود" });
      return;
    }
    await audit("admin", "update_product", "products", id, set);
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/admin/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(productsTable).where(eq(productsTable.id, id));
    await audit("admin", "delete_product", "products", id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
