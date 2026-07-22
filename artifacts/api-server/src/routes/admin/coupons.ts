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
import { db, couponsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { audit } from "../../lib/services/auditLog";

const router: IRouter = Router();

router.get("/admin/coupons", requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(couponsTable).orderBy(desc(couponsTable.createdAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/coupons", requireAdmin, async (req, res) => {
  try {
    const body = req.body as any;
    if (!body?.code || !body?.type || body?.value == null) {
      res.status(400).json({ error: "بيانات ناقصة" });
      return;
    }
    const inserted = await db
      .insert(couponsTable)
      .values({
        code: String(body.code).trim().toUpperCase(),
        description: body.description ?? "",
        type: body.type,
        value: String(body.value),
        maxUses: Number(body.maxUses ?? 0),
        minOrder: String(body.minOrder ?? "0"),
        applyToCategory: body.applyToCategory || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        active: body.active ?? true,
      })
      .returning();
    await audit("admin", "create_coupon", "coupons", inserted[0]!.id);
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/admin/coupons/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as any;
    const set: any = {};
    for (const k of ["description", "type", "applyToCategory"]) {
      if (body[k] != null) set[k] = body[k];
    }
    if (body.code) set.code = String(body.code).trim().toUpperCase();
    if (body.value != null) set.value = String(body.value);
    if (body.maxUses != null) set.maxUses = Number(body.maxUses);
    if (body.minOrder != null) set.minOrder = String(body.minOrder);
    if (typeof body.active === "boolean") set.active = body.active;
    if (body.expiresAt !== undefined) set.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const updated = await db.update(couponsTable).set(set).where(eq(couponsTable.id, id)).returning();
    if (!updated[0]) {
      res.status(404).json({ error: "غير موجود" });
      return;
    }
    await audit("admin", "update_coupon", "coupons", id, set);
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/admin/coupons/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(couponsTable).where(eq(couponsTable.id, id));
    await audit("admin", "delete_coupon", "coupons", id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
