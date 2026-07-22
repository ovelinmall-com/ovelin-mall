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
import { db, productsTable, bannersTable, ratingsTable, usersTable, settingsTable, productCodesTable } from "@workspace/db";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getCategoriesWithCounts } from "../lib/services/categories";

const router: IRouter = Router();

router.get("/categories", async (_req, res) => {
  try {
    const list = await getCategoriesWithCounts();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/products", async (req, res) => {
  try {
    const { category, platform, search, sort } = req.query as Record<string, string | undefined>;
    const conds: any[] = [eq(productsTable.active, true)];
    if (category) conds.push(eq(productsTable.category, category));
    if (platform) conds.push(eq(productsTable.platform, platform));
    if (search) {
      conds.push(
        or(
          ilike(productsTable.name, `%${search}%`),
          ilike(productsTable.description, `%${search}%`),
        )!,
      );
    }
    let orderBy: any = [desc(productsTable.sortOrder), desc(productsTable.salesCount)];
    if (sort === "price_asc") orderBy = [asc(productsTable.price)];
    else if (sort === "price_desc") orderBy = [desc(productsTable.price)];
    else if (sort === "rating") orderBy = [desc(productsTable.ratingAvg), desc(productsTable.ratingCount)];
    else if (sort === "newest") orderBy = [desc(productsTable.createdAt)];

    const list = await db
      .select()
      .from(productsTable)
      .where(and(...conds))
      .orderBy(...orderBy)
      .limit(400);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "id غير صالح" });
      return;
    }
    const rows = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "المنتج غير موجود" });
      return;
    }
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/banners", async (_req, res) => {
  try {
    const list = await db
      .select()
      .from(bannersTable)
      .where(eq(bannersTable.active, true))
      .orderBy(desc(bannersTable.sortOrder));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/products/:id/ratings", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "id غير صالح" });
      return;
    }
    const rows = await db
      .select({
        id: ratingsTable.id,
        username: usersTable.username,
        stars: ratingsTable.stars,
        comment: ratingsTable.comment,
        verified: ratingsTable.verified,
        createdAt: ratingsTable.createdAt,
      })
      .from(ratingsTable)
      .leftJoin(usersTable, eq(usersTable.id, ratingsTable.userId))
      .where(eq(ratingsTable.productId, id))
      .orderBy(desc(ratingsTable.createdAt))
      .limit(100);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// Returns the current price version timestamp — clients poll this to detect reprice events
router.get("/catalog/version", async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "priceVersion")).limit(1);
    const version = rows[0]?.value ?? "0";
    res.json({ version });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// أكواد فري فاير المباشرة — قائمة عامة مع عدد الأكواد المتاحة
router.get("/ff-code-products", async (_req, res) => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.platform, "Free Fire"),
          eq(productsTable.category, "ff-direct-code"),
          eq(productsTable.active, true),
        ),
      )
      .orderBy(asc(productsTable.price));

    const counts = await db
      .select({
        productId: productCodesTable.productId,
        available: sql<number>`count(*)::int`,
      })
      .from(productCodesTable)
      .where(eq(productCodesTable.status, "available"))
      .groupBy(productCodesTable.productId);

    const countMap = new Map(counts.map((c) => [c.productId, c.available]));
    res.json(products.map((p) => ({ ...p, available: countMap.get(p.id) ?? 0 })));
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
