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
import { db, supportTicketsTable, supportMessagesTable, usersTable } from "@workspace/db";
import { and, asc, desc, eq, sql, ilike, or } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { notifyAndPush } from "../../lib/services/notifications";
import { audit } from "../../lib/services/auditLog";

const router: IRouter = Router();

router.get("/admin/support/tickets", requireAdmin, async (req, res) => {
  try {
    const status = (req.query.status as string | undefined)?.trim();
    const priority = (req.query.priority as string | undefined)?.trim();
    const assignedTo = (req.query.assignedTo as string | undefined)?.trim();
    const tag = (req.query.tag as string | undefined)?.trim();
    const search = (req.query.search as string | undefined)?.trim();
    const conds: any[] = [];
    if (status && status !== "all") conds.push(eq(supportTicketsTable.status, status));
    if (priority && priority !== "all") conds.push(eq(supportTicketsTable.priority, priority));
    if (assignedTo === "unassigned") conds.push(sql`${supportTicketsTable.assignedTo} IS NULL`);
    else if (assignedTo) conds.push(eq(supportTicketsTable.assignedTo, assignedTo));
    if (tag) conds.push(sql`${supportTicketsTable.tags} ? ${tag}`);
    if (search) {
      conds.push(
        or(
          ilike(supportTicketsTable.subject, `%${search}%`),
          ilike(usersTable.username, `%${search}%`),
        )!,
      );
    }
    const q = db
      .select({
        id: supportTicketsTable.id,
        userId: supportTicketsTable.userId,
        username: usersTable.username,
        subject: supportTicketsTable.subject,
        category: supportTicketsTable.category,
        status: supportTicketsTable.status,
        priority: supportTicketsTable.priority,
        unreadForAdmin: supportTicketsTable.unreadForAdmin,
        lastUserAt: supportTicketsTable.lastUserAt,
        lastAdminAt: supportTicketsTable.lastAdminAt,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
        assignedTo: supportTicketsTable.assignedTo,
        tags: supportTicketsTable.tags,
        aiSentiment: supportTicketsTable.aiSentiment,
        csat: supportTicketsTable.csat,
        firstReplyAt: supportTicketsTable.firstReplyAt,
        resolvedAt: supportTicketsTable.resolvedAt,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(usersTable.id, supportTicketsTable.userId));
    const list = conds.length
      ? await q.where(and(...conds)).orderBy(desc(supportTicketsTable.updatedAt))
      : await q.orderBy(desc(supportTicketsTable.updatedAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/admin/support/unread-count", requireAdmin, async (_req, res) => {
  try {
    const r = await db
      .select({ c: sql<number>`coalesce(sum(unread_for_admin), 0)::int` })
      .from(supportTicketsTable);
    res.json({ count: Number(r[0]?.c ?? 0) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/admin/support/tickets/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db
      .select({
        id: supportTicketsTable.id,
        userId: supportTicketsTable.userId,
        username: usersTable.username,
        userEmail: usersTable.email,
        userVip: usersTable.vipLevel,
        userBalance: usersTable.balance,
        subject: supportTicketsTable.subject,
        category: supportTicketsTable.category,
        status: supportTicketsTable.status,
        priority: supportTicketsTable.priority,
        unreadForAdmin: supportTicketsTable.unreadForAdmin,
        lastUserAt: supportTicketsTable.lastUserAt,
        lastAdminAt: supportTicketsTable.lastAdminAt,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
        assignedTo: supportTicketsTable.assignedTo,
        tags: supportTicketsTable.tags,
        aiSummary: supportTicketsTable.aiSummary,
        aiSentiment: supportTicketsTable.aiSentiment,
        csat: supportTicketsTable.csat,
        csatComment: supportTicketsTable.csatComment,
        firstReplyAt: supportTicketsTable.firstReplyAt,
        resolvedAt: supportTicketsTable.resolvedAt,
      })
      .from(supportTicketsTable)
      .leftJoin(usersTable, eq(usersTable.id, supportTicketsTable.userId))
      .where(eq(supportTicketsTable.id, id))
      .limit(1);
    const ticket = rows[0];
    if (!ticket) {
      res.status(404).json({ error: "غير موجودة" });
      return;
    }
    const messages = await db
      .select()
      .from(supportMessagesTable)
      .where(eq(supportMessagesTable.ticketId, id))
      .orderBy(asc(supportMessagesTable.createdAt));
    if (ticket.unreadForAdmin > 0) {
      await db
        .update(supportTicketsTable)
        .set({ unreadForAdmin: 0 })
        .where(eq(supportTicketsTable.id, id));
    }
    res.json({ ticket, messages });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/admin/support/tickets/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, priority } = req.body as { status?: string; priority?: string };
    const set: any = { updatedAt: new Date() };
    if (status) {
      set.status = status;
      if (status === "resolved" || status === "closed") {
        set.resolvedAt = new Date();
      }
    }
    if (priority) set.priority = priority;
    await db.update(supportTicketsTable).set(set).where(eq(supportTicketsTable.id, id));
    await audit("admin", "update_ticket", "support_tickets", id, set);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/support/tickets/:id/reply", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { body, authorName, attachmentUrl } = req.body as {
      body?: string;
      authorName?: string;
      attachmentUrl?: string;
    };
    const b = (body ?? "").trim();
    if (!b && !attachmentUrl) {
      res.status(400).json({ error: "الرسالة مطلوبة" });
      return;
    }
    const rows = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id)).limit(1);
    const ticket = rows[0];
    if (!ticket) {
      res.status(404).json({ error: "غير موجودة" });
      return;
    }
    const att = attachmentUrl && attachmentUrl.startsWith("data:") && attachmentUrl.length < 1500000
      ? attachmentUrl
      : null;
    await db.insert(supportMessagesTable).values({
      ticketId: id,
      sender: "admin",
      authorName: (authorName ?? "الدعم").toString().slice(0, 64),
      body: b || "📎 مرفق",
      attachmentUrl: att,
    });
    await db
      .update(supportTicketsTable)
      .set({
        unreadForUser: ticket.unreadForUser + 1,
        lastAdminAt: new Date(),
        firstReplyAt: ticket.firstReplyAt ?? new Date(),
        updatedAt: new Date(),
        status: ticket.status === "closed" ? "open" : ticket.status,
      })
      .where(eq(supportTicketsTable.id, id));
    notifyAndPush(ticket.userId, "support", "رد جديد من الدعم", `تذكرة #${id}: ${ticket.subject}`, `/support/${id}`, "support_reply");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// مسح كل إشعارات الدعم للأدمن دفعة واحدة
router.post("/admin/support/mark-all-read", requireAdmin, async (_req, res) => {
  try {
    await db
      .update(supportTicketsTable)
      .set({ unreadForAdmin: 0 })
      .where(sql`${supportTicketsTable.unreadForAdmin} > 0`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
