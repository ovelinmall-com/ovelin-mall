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
import { db, bannersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { audit } from "../../lib/services/auditLog";

const router: IRouter = Router();

router.get("/admin/banners", requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(bannersTable).orderBy(desc(bannersTable.sortOrder));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/banners", requireAdmin, async (req, res) => {
  try {
    const body = req.body as any;
    if (!body?.title) {
      res.status(400).json({ error: "العنوان مطلوب" });
      return;
    }
    const inserted = await db
      .insert(bannersTable)
      .values({
        title: body.title,
        subtitle: body.subtitle ?? "",
        imageUrl: body.imageUrl || null,
        link: body.link || null,
        bgColor: body.bgColor ?? "from-pink-500 via-fuchsia-500 to-rose-600",
        active: body.active ?? true,
        sortOrder: Number(body.sortOrder ?? 0),
      })
      .returning();
    await audit("admin", "create_banner", "banners", inserted[0]!.id);
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/admin/banners/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as any;
    const set: any = {};
    for (const k of ["title", "subtitle", "imageUrl", "link", "bgColor"]) {
      if (body[k] != null) set[k] = body[k];
    }
    if (typeof body.active === "boolean") set.active = body.active;
    if (body.sortOrder != null) set.sortOrder = Number(body.sortOrder);
    const updated = await db.update(bannersTable).set(set).where(eq(bannersTable.id, id)).returning();
    if (!updated[0]) {
      res.status(404).json({ error: "غير موجود" });
      return;
    }
    await audit("admin", "update_banner", "banners", id, set);
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/admin/banners/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(bannersTable).where(eq(bannersTable.id, id));
    await audit("admin", "delete_banner", "banners", id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
