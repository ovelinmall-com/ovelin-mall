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
import { db, abTestsTable, abAssignmentsTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

router.get("/admin/abtests", requireAdmin, async (_req, res) => {
  try {
    const tests = await db.select().from(abTestsTable).orderBy(desc(abTestsTable.createdAt));

    const result = await Promise.all(
      tests.map(async (t) => {
        const breakdown = await db
          .select({
            variant: abAssignmentsTable.variant,
            total: sql<number>`count(*)::int`,
            conversions: sql<number>`sum(case when ${abAssignmentsTable.converted} then 1 else 0 end)::int`,
          })
          .from(abAssignmentsTable)
          .where(eq(abAssignmentsTable.testKey, t.key))
          .groupBy(abAssignmentsTable.variant);

        const variantMap = (t.variants as string[]).map((v) => {
          const found = breakdown.find((b) => b.variant === v);
          return { variant: v, total: Number(found?.total ?? 0), conversions: Number(found?.conversions ?? 0) };
        });

        return { ...t, breakdown: variantMap };
      }),
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/abtests", requireAdmin, async (req, res) => {
  try {
    const { key, description, variants, active } = req.body as {
      key: string;
      description?: string;
      variants?: string[];
      active?: boolean;
    };
    if (!key) { res.status(400).json({ error: "المفتاح مطلوب" }); return; }
    const inserted = await db
      .insert(abTestsTable)
      .values({
        key,
        description: description ?? "",
        variants: variants ?? ["A", "B"],
        active: active !== false,
      })
      .returning();
    res.json({ ...inserted[0], breakdown: [] });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/admin/abtests/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as any;
    const set: any = {};
    if (body.description != null) set.description = body.description;
    if (Array.isArray(body.variants)) set.variants = body.variants;
    if (typeof body.active === "boolean") set.active = body.active;
    const updated = await db.update(abTestsTable).set(set).where(eq(abTestsTable.id, id)).returning();
    if (!updated[0]) { res.status(404).json({ error: "غير موجود" }); return; }
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/admin/abtests/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(abTestsTable).where(eq(abTestsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
