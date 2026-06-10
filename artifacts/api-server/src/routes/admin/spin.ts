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
import { db, spinPrizesTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

router.get("/admin/spin/prizes", requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(spinPrizesTable).orderBy(asc(spinPrizesTable.sortOrder), asc(spinPrizesTable.id));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/spin/prizes", requireAdmin, async (req, res) => {
  try {
    const body = req.body as any;
    if (!body?.label) {
      res.status(400).json({ error: "العنوان مطلوب" });
      return;
    }
    const inserted = await db
      .insert(spinPrizesTable)
      .values({
        label: body.label,
        type: body.type ?? "balance",
        value: String(body.value ?? "0"),
        couponCode: body.couponCode || null,
        weight: Number(body.weight ?? 10),
        color: body.color ?? "#ec4899",
        icon: body.icon ?? "gift",
        active: body.active !== false,
        sortOrder: Number(body.sortOrder ?? 0),
      })
      .returning();
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.put("/admin/spin/prizes/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as any;
    const set: any = {};
    if (body.label != null) set.label = body.label;
    if (body.type != null) set.type = body.type;
    if (body.value != null) set.value = String(body.value);
    if (body.weight != null) set.weight = Number(body.weight);
    if (body.color != null) set.color = body.color;
    if (body.couponCode != null) set.couponCode = body.couponCode || null;
    if (typeof body.active === "boolean") set.active = body.active;
    if (body.sortOrder != null) set.sortOrder = Number(body.sortOrder);
    const updated = await db.update(spinPrizesTable).set(set).where(eq(spinPrizesTable.id, id)).returning();
    if (!updated[0]) { res.status(404).json({ error: "غير موجود" }); return; }
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/admin/spin/prizes/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(spinPrizesTable).where(eq(spinPrizesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
