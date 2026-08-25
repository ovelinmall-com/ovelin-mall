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
import { db, postsTable } from "@workspace/db";
import { asc, desc, eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

function toSlug(title: string): string {
  return title
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FF\w-]/g, "")
    .slice(0, 200)
    + "-" + Date.now();
}

router.get("/admin/posts", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(postsTable)
      .orderBy(desc(postsTable.pinned), desc(postsTable.sortOrder), desc(postsTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/posts", requireAdmin, async (req, res) => {
  try {
    const b = req.body as any;
    if (!b.title) { res.status(400).json({ error: "العنوان مطلوب" }); return; }
    const slug = b.slug?.trim() || toSlug(b.title);
    const [row] = await db.insert(postsTable).values({
      title: b.title,
      slug,
      summary: b.summary ?? "",
      body: b.body ?? "",
      imageUrl: b.imageUrl ?? null,
      category: b.category ?? "عام",
      tags: Array.isArray(b.tags) ? b.tags : [],
      published: !!b.published,
      pinned: !!b.pinned,
      sortOrder: Number(b.sortOrder) || 0,
    }).returning();
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.put("/admin/posts/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "id غير صحيح" }); return; }
    const b = req.body as any;
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (b.title !== undefined) updates.title = b.title;
    if (b.slug !== undefined) updates.slug = b.slug;
    if (b.summary !== undefined) updates.summary = b.summary;
    if (b.body !== undefined) updates.body = b.body;
    if (b.imageUrl !== undefined) updates.imageUrl = b.imageUrl;
    if (b.category !== undefined) updates.category = b.category;
    if (b.tags !== undefined) updates.tags = b.tags;
    if (b.published !== undefined) updates.published = !!b.published;
    if (b.pinned !== undefined) updates.pinned = !!b.pinned;
    if (b.sortOrder !== undefined) updates.sortOrder = Number(b.sortOrder);
    const [row] = await db.update(postsTable).set(updates).where(eq(postsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "المنشور غير موجود" }); return; }
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/admin/posts/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "id غير صحيح" }); return; }
    await db.delete(postsTable).where(eq(postsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
