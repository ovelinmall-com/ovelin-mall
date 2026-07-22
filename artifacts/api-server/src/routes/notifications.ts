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
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq, sql, like } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/notifications", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const list = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, user.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/notifications/unread-count", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const r = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));
    res.json({ count: Number(r[0]?.c ?? 0) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/notifications/read-all", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/notifications/:id/read", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// Returns unread counts per section (for nav badges)
router.get("/notifications/badge-counts", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const unread = await db
      .select({ link: notificationsTable.link, type: notificationsTable.type })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));

    const counts = { orders: 0, wallet: 0, support: 0, referrals: 0 };
    for (const n of unread) {
      const link = n.link ?? "";
      const type = n.type ?? "";
      if (link.startsWith("/orders") || type === "order") counts.orders++;
      else if (link.startsWith("/wallet") || type === "deposit" || type === "wallet") counts.wallet++;
      else if (link.startsWith("/support") || type === "support") counts.support++;
      else if (link.startsWith("/referrals") || type === "referral_reward") counts.referrals++;
    }
    res.json(counts);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// Mark all notifications for a section as read (by link prefix OR by type)
router.post("/notifications/mark-section-read", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { section } = req.body as { section: string };

    const sectionConfig: Record<string, { prefix: string; types: string[] }> = {
      orders:   { prefix: "/orders",   types: ["order", "order_update"] },
      wallet:   { prefix: "/wallet",   types: ["deposit", "wallet", "withdrawal"] },
      support:  { prefix: "/support",  types: ["support", "support_reply"] },
      referrals:{ prefix: "/referrals",types: ["referral_reward", "referral"] },
    };

    const cfg = sectionConfig[section];
    if (!cfg) {
      res.status(400).json({ error: "قسم غير معروف" });
      return;
    }

    const { or } = await import("drizzle-orm");

    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.userId, user.id),
          eq(notificationsTable.isRead, false),
          or(
            like(notificationsTable.link, `${cfg.prefix}%`),
            ...cfg.types.map(t => eq(notificationsTable.type, t)),
          ),
        ),
      );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
