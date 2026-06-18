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
import { db, supportTicketsTable, supportMessagesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

// CSAT — submit satisfaction rating after ticket resolved/closed
router.post("/support/tickets/:id/csat", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    const { score, comment } = req.body as { score?: number; comment?: string };
    const s = Number(score);
    if (!Number.isFinite(s) || s < 1 || s > 5) {
      res.status(400).json({ error: "تقييم غير صالح" });
      return;
    }
    const rows = await db
      .select()
      .from(supportTicketsTable)
      .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, user.id)))
      .limit(1);
    const ticket = rows[0];
    if (!ticket) {
      res.status(404).json({ error: "غير موجودة" });
      return;
    }
    await db
      .update(supportTicketsTable)
      .set({
        csat: Math.round(s),
        csatComment: (comment ?? "").toString().slice(0, 500) || null,
        updatedAt: new Date(),
      })
      .where(eq(supportTicketsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// Upload attachment as data-url message (small files only)
router.post("/support/tickets/:id/attach", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    const { dataUrl, caption } = req.body as { dataUrl?: string; caption?: string };
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      res.status(400).json({ error: "ملف غير صالح" });
      return;
    }
    if (dataUrl.length > 1500000) {
      res.status(400).json({ error: "حجم الملف كبير جداً (الحد ~1MB)" });
      return;
    }
    const rows = await db
      .select()
      .from(supportTicketsTable)
      .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, user.id)))
      .limit(1);
    const ticket = rows[0];
    if (!ticket) {
      res.status(404).json({ error: "غير موجودة" });
      return;
    }
    await db.insert(supportMessagesTable).values({
      ticketId: id,
      sender: "user",
      authorName: user.username,
      body: caption?.toString().slice(0, 500) || "📎 مرفق",
      attachmentUrl: dataUrl,
    });
    await db
      .update(supportTicketsTable)
      .set({
        unreadForAdmin: ticket.unreadForAdmin + 1,
        lastUserAt: new Date(),
        updatedAt: new Date(),
        status: "open",
      })
      .where(eq(supportTicketsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
