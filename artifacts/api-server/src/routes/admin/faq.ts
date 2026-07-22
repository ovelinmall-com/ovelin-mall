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
import { db, faqTable, faqFeedbackTable } from "@workspace/db";
import { asc, desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

router.get("/admin/faq/analytics", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: faqTable.id,
        question: faqTable.question,
        category: faqTable.category,
        active: faqTable.active,
      })
      .from(faqTable)
      .orderBy(asc(faqTable.sortOrder), asc(faqTable.id));

    const counts = await db
      .select({
        faqId: faqFeedbackTable.faqId,
        helpful: faqFeedbackTable.helpful,
        c: sql<number>`count(*)::int`,
      })
      .from(faqFeedbackTable)
      .groupBy(faqFeedbackTable.faqId, faqFeedbackTable.helpful);

    const map: Record<number, { up: number; down: number }> = {};
    for (const r of counts) {
      const id = r.faqId;
      if (!map[id]) map[id] = { up: 0, down: 0 };
      if (r.helpful) map[id].up = Number(r.c);
      else map[id].down = Number(r.c);
    }

    const enriched = rows.map((r) => {
      const m = map[r.id] ?? { up: 0, down: 0 };
      const total = m.up + m.down;
      const score = total > 0 ? Math.round((m.up / total) * 100) : null;
      return {
        id: r.id,
        question: r.question,
        category: r.category,
        active: r.active,
        upvotes: m.up,
        downvotes: m.down,
        total,
        helpfulPct: score,
      };
    });

    const totalUp = enriched.reduce((s, r) => s + r.upvotes, 0);
    const totalDown = enriched.reduce((s, r) => s + r.downvotes, 0);
    const totalAll = totalUp + totalDown;
    const overallPct = totalAll
      ? Math.round((totalUp / totalAll) * 100)
      : null;

    res.json({
      summary: {
        totalArticles: rows.length,
        totalFeedback: totalAll,
        upvotes: totalUp,
        downvotes: totalDown,
        helpfulPct: overallPct,
      },
      articles: enriched.sort((a, b) => b.total - a.total),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
