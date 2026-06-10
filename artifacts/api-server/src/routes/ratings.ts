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
import { db, ratingsTable, productsTable, ordersTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

router.post("/products/:id/ratings", requireUser, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const user = (req as any).user;
    const { stars, comment } = req.body as { stars?: number; comment?: string };
    const s = Number(stars);
    if (!Number.isFinite(s) || s < 1 || s > 5) {
      res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5" });
      return;
    }

    // Verified buyer if any delivered order on this product
    const orders = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, user.id),
          eq(ordersTable.productId, productId),
          eq(ordersTable.status, "delivered"),
        ),
      )
      .limit(1);
    const verified = !!orders[0];

    const existing = await db
      .select()
      .from(ratingsTable)
      .where(and(eq(ratingsTable.userId, user.id), eq(ratingsTable.productId, productId)))
      .limit(1);

    let row;
    if (existing[0]) {
      const updated = await db
        .update(ratingsTable)
        .set({ stars: s, comment: (comment ?? "").trim(), verified })
        .where(eq(ratingsTable.id, existing[0].id))
        .returning();
      row = updated[0];
    } else {
      const inserted = await db
        .insert(ratingsTable)
        .values({
          userId: user.id,
          productId,
          stars: s,
          comment: (comment ?? "").trim(),
          verified,
        })
        .returning();
      row = inserted[0];
    }

    // Recompute aggregate
    const agg = await db
      .select({
        avg: sql<string>`coalesce(avg(${ratingsTable.stars}), 0)::numeric(3,2)`,
        cnt: sql<number>`count(*)::int`,
      })
      .from(ratingsTable)
      .where(eq(ratingsTable.productId, productId));
    await db
      .update(productsTable)
      .set({
        ratingAvg: String(agg[0]?.avg ?? "0"),
        ratingCount: Number(agg[0]?.cnt ?? 0),
      })
      .where(eq(productsTable.id, productId));

    res.json({
      id: row!.id,
      username: user.username,
      stars: row!.stars,
      comment: row!.comment,
      verified: row!.verified,
      createdAt: row!.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
