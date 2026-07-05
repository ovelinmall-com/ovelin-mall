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
import {
  db,
  supportTicketsTable,
  supportMessagesTable,
  supportInternalNotesTable,
  supportTemplatesTable,
  supportAgentsTable,
  usersTable,
} from "@workspace/db";
import { and, asc, desc, eq, sql, gte } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { audit } from "../../lib/services/auditLog";
import { notify } from "../../lib/services/notifications";
import { getAiClient, isAiConfigured } from "../../lib/integrations/aiClient";

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────────
//  Internal notes (admin-only, never seen by user)
// ─────────────────────────────────────────────────────────────────

router.get("/admin/support/tickets/:id/notes", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const list = await db
      .select()
      .from(supportInternalNotesTable)
      .where(eq(supportInternalNotesTable.ticketId, id))
      .orderBy(asc(supportInternalNotesTable.createdAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/support/tickets/:id/notes", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { body, authorName } = req.body as { body?: string; authorName?: string };
    const b = (body ?? "").trim();
    if (!b) {
      res.status(400).json({ error: "النص مطلوب" });
      return;
    }
    const inserted = await db
      .insert(supportInternalNotesTable)
      .values({
        ticketId: id,
        authorName: (authorName ?? "admin").toString().slice(0, 64),
        body: b,
      })
      .returning();
    await audit("admin", "add_note", "support_tickets", id, { len: b.length });
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/admin/support/notes/:noteId", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.noteId);
    await db.delete(supportInternalNotesTable).where(eq(supportInternalNotesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  Quick reply templates
// ─────────────────────────────────────────────────────────────────

router.get("/admin/support/templates", requireAdmin, async (_req, res) => {
  try {
    const list = await db
      .select()
      .from(supportTemplatesTable)
      .orderBy(asc(supportTemplatesTable.sortOrder), asc(supportTemplatesTable.id));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/support/templates", requireAdmin, async (req, res) => {
  try {
    const { title, body, category, shortcut, sortOrder } = req.body as any;
    const t = String(title ?? "").trim();
    const b = String(body ?? "").trim();
    if (!t || !b) {
      res.status(400).json({ error: "العنوان والنص مطلوبان" });
      return;
    }
    const inserted = await db
      .insert(supportTemplatesTable)
      .values({
        title: t,
        body: b,
        category: String(category ?? "general").slice(0, 32),
        shortcut: shortcut ? String(shortcut).slice(0, 16) : null,
        sortOrder: Number(sortOrder) || 0,
      })
      .returning();
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/admin/support/templates/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, body, category, shortcut, sortOrder } = req.body as any;
    const set: any = {};
    if (title !== undefined) set.title = String(title);
    if (body !== undefined) set.body = String(body);
    if (category !== undefined) set.category = String(category);
    if (shortcut !== undefined) set.shortcut = shortcut ? String(shortcut) : null;
    if (sortOrder !== undefined) set.sortOrder = Number(sortOrder) || 0;
    await db.update(supportTemplatesTable).set(set).where(eq(supportTemplatesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/admin/support/templates/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(supportTemplatesTable).where(eq(supportTemplatesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  Agents
// ─────────────────────────────────────────────────────────────────

router.get("/admin/support/agents", requireAdmin, async (_req, res) => {
  try {
    const list = await db
      .select()
      .from(supportAgentsTable)
      .where(eq(supportAgentsTable.active, true))
      .orderBy(asc(supportAgentsTable.id));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/support/agents", requireAdmin, async (req, res) => {
  try {
    const { username, displayName, avatarUrl } = req.body as any;
    const u = String(username ?? "").trim();
    const d = String(displayName ?? "").trim();
    if (!u || !d) {
      res.status(400).json({ error: "البيانات ناقصة" });
      return;
    }
    try {
      const inserted = await db
        .insert(supportAgentsTable)
        .values({
          username: u.slice(0, 64),
          displayName: d,
          avatarUrl: avatarUrl ? String(avatarUrl) : null,
        })
        .returning();
      res.json(inserted[0]);
    } catch (err: any) {
      // Likely duplicate username — re-activate
      if (String(err?.message ?? "").includes("unique")) {
        await db
          .update(supportAgentsTable)
          .set({ active: true, displayName: d, avatarUrl: avatarUrl ? String(avatarUrl) : null })
          .where(eq(supportAgentsTable.username, u));
        const rows = await db
          .select()
          .from(supportAgentsTable)
          .where(eq(supportAgentsTable.username, u))
          .limit(1);
        res.json(rows[0]);
        return;
      }
      throw err;
    }
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/admin/support/agents/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    // Soft delete (deactivate) so existing assignedTo references stay valid
    await db
      .update(supportAgentsTable)
      .set({ active: false })
      .where(eq(supportAgentsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  Assign / tags
// ─────────────────────────────────────────────────────────────────

router.post("/admin/support/tickets/:id/assign", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { assignedTo } = req.body as { assignedTo?: string | null };
    const v = assignedTo ? String(assignedTo).slice(0, 64) : null;
    await db
      .update(supportTicketsTable)
      .set({ assignedTo: v, updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, id));
    await audit("admin", "assign_ticket", "support_tickets", id, { assignedTo: v });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/support/tickets/:id/tags", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { tags } = req.body as { tags?: string[] };
    const arr = Array.isArray(tags)
      ? tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 12)
      : [];
    await db
      .update(supportTicketsTable)
      .set({ tags: arr, updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, id));
    res.json({ success: true, tags: arr });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  AI helpers — summary, sentiment, suggested reply
// ─────────────────────────────────────────────────────────────────

async function loadConversation(ticketId: number): Promise<{ ticket: any; messages: any[] }> {
  const rows = await db
    .select({
      id: supportTicketsTable.id,
      userId: supportTicketsTable.userId,
      username: usersTable.username,
      subject: supportTicketsTable.subject,
      category: supportTicketsTable.category,
      status: supportTicketsTable.status,
      priority: supportTicketsTable.priority,
      tags: supportTicketsTable.tags,
      aiSummary: supportTicketsTable.aiSummary,
      aiSentiment: supportTicketsTable.aiSentiment,
    })
    .from(supportTicketsTable)
    .leftJoin(usersTable, eq(usersTable.id, supportTicketsTable.userId))
    .where(eq(supportTicketsTable.id, ticketId))
    .limit(1);
  const ticket = rows[0];
  const messages = await db
    .select()
    .from(supportMessagesTable)
    .where(eq(supportMessagesTable.ticketId, ticketId))
    .orderBy(asc(supportMessagesTable.createdAt));
  return { ticket, messages };
}

router.post("/admin/support/tickets/:id/ai-summary", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isAiConfigured()) {
      res.status(400).json({ error: "AI غير مفعّل" });
      return;
    }
    const { ticket, messages } = await loadConversation(id);
    if (!ticket) {
      res.status(404).json({ error: "غير موجودة" });
      return;
    }
    const transcript = messages
      .map((m) => `[${m.sender}] ${m.authorName}: ${m.body}`)
      .join("\n");
    const r = await Promise.race([
      getAiClient().chat.completions.create({
        model: "gpt-5-nano",
        max_completion_tokens: 280,
        messages: [
          {
            role: "system",
            content:
              "أنت مساعد مدير دعم فني في OVELIN. لخّص محادثة الدعم في 3-4 أسطر بالعربية الفصحى: المشكلة، الإجراء المتخذ، الحالة الحالية، التوصية. ثم أعطِ سطراً ثانياً يبدأ بـ [SENTIMENT]: واحدة من (positive|neutral|negative|urgent).",
          },
          { role: "user", content: `الموضوع: ${ticket.subject}\nالفئة: ${ticket.category}\n\n${transcript}` },
        ],
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000)),
    ]);
    const out = (r as any).choices[0]?.message?.content ?? "";
    const lines = out.split("\n").map((s: string) => s.trim()).filter(Boolean);
    const sentLine = lines.find((l: string) => l.startsWith("[SENTIMENT]")) || "";
    const sentiment =
      (sentLine.match(/\b(positive|neutral|negative|urgent)\b/i)?.[1]?.toLowerCase() as
        | "positive"
        | "neutral"
        | "negative"
        | "urgent"
        | undefined) ?? "neutral";
    const summary = lines.filter((l: string) => !l.startsWith("[SENTIMENT]")).join("\n");
    await db
      .update(supportTicketsTable)
      .set({
        aiSummary: summary,
        aiSentiment: sentiment,
        priority: sentiment === "urgent" ? "urgent" : ticket.priority,
        updatedAt: new Date(),
      })
      .where(eq(supportTicketsTable.id, id));
    res.json({ summary, sentiment });
  } catch (err: any) {
    console.error("ai-summary error", err);
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/support/tickets/:id/ai-suggest", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isAiConfigured()) {
      res.status(400).json({ error: "AI غير مفعّل" });
      return;
    }
    const { ticket, messages } = await loadConversation(id);
    if (!ticket) {
      res.status(404).json({ error: "غير موجودة" });
      return;
    }
    const transcript = messages
      .map((m) => `[${m.sender}] ${m.authorName}: ${m.body}`)
      .join("\n");
    const r = await Promise.race([
      getAiClient().chat.completions.create({
        model: "gpt-5-nano",
        max_completion_tokens: 320,
        messages: [
          {
            role: "system",
            content:
              "أنت موظف دعم فني محترف في OVELIN (متجر خدمات رقمية). اقترح رداً واحداً مهذباً وودوداً بالعربية الفصحى يحلّ المشكلة بأسرع شكل أو يطلب المعلومة الناقصة فقط. لا تكتب توقيعاً، ولا تكتب تحية إذا سبقتها تحية. كن موجزاً (3-6 أسطر).",
          },
          { role: "user", content: `الموضوع: ${ticket.subject}\nالفئة: ${ticket.category}\n\n${transcript}\n\nاكتب الرد المقترح فقط:` },
        ],
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000)),
    ]);
    const out = (r as any).choices[0]?.message?.content ?? "";
    res.json({ suggestion: out.trim() });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  Analytics
// ─────────────────────────────────────────────────────────────────

router.get("/admin/support/analytics", requireAdmin, async (req, res) => {
  try {
    const days = Math.min(180, Math.max(7, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Ticket counts by status
    const byStatus = await db
      .select({
        status: supportTicketsTable.status,
        count: sql<number>`count(*)::int`,
      })
      .from(supportTicketsTable)
      .where(gte(supportTicketsTable.createdAt, since))
      .groupBy(supportTicketsTable.status);

    // Daily new tickets
    const dailyRows = await db.execute(
      sql.raw(`
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
          count(*)::int as count
        FROM support_tickets
        WHERE created_at >= '${since.toISOString()}'
        GROUP BY 1 ORDER BY 1
      `),
    );
    const daily = ((dailyRows as any).rows ?? dailyRows) as any[];

    // Avg first reply time (minutes)
    const replyRow = await db.execute(
      sql.raw(`
        SELECT
          COALESCE(EXTRACT(EPOCH FROM AVG(first_reply_at - created_at))/60, 0)::float as avg_first_reply_minutes,
          COUNT(*) FILTER (WHERE first_reply_at IS NOT NULL)::int as replied_count
        FROM support_tickets
        WHERE created_at >= '${since.toISOString()}'
      `),
    );
    const replyStats = ((replyRow as any).rows ?? replyRow)[0] ?? {};

    // Avg resolution time (hours)
    const resRow = await db.execute(
      sql.raw(`
        SELECT
          COALESCE(EXTRACT(EPOCH FROM AVG(resolved_at - created_at))/3600, 0)::float as avg_resolve_hours,
          COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::int as resolved_count
        FROM support_tickets
        WHERE created_at >= '${since.toISOString()}'
      `),
    );
    const resStats = ((resRow as any).rows ?? resRow)[0] ?? {};

    // CSAT
    const csatRow = await db.execute(
      sql.raw(`
        SELECT
          COALESCE(AVG(csat), 0)::float as avg_csat,
          COUNT(*) FILTER (WHERE csat IS NOT NULL)::int as csat_count
        FROM support_tickets
        WHERE created_at >= '${since.toISOString()}'
      `),
    );
    const csatStats = ((csatRow as any).rows ?? csatRow)[0] ?? {};

    // Top categories
    const byCategory = await db
      .select({
        category: supportTicketsTable.category,
        count: sql<number>`count(*)::int`,
      })
      .from(supportTicketsTable)
      .where(gte(supportTicketsTable.createdAt, since))
      .groupBy(supportTicketsTable.category);

    const total = byStatus.reduce((a, b) => a + Number(b.count), 0);

    res.json({
      days,
      total,
      byStatus,
      byCategory,
      daily: daily.map((d: any) => ({ day: d.day, count: Number(d.count) })),
      avgFirstReplyMinutes: Number(replyStats.avg_first_reply_minutes ?? 0),
      repliedCount: Number(replyStats.replied_count ?? 0),
      avgResolveHours: Number(resStats.avg_resolve_hours ?? 0),
      resolvedCount: Number(resStats.resolved_count ?? 0),
      avgCsat: Number(csatStats.avg_csat ?? 0),
      csatCount: Number(csatStats.csat_count ?? 0),
    });
  } catch (err: any) {
    console.error("support analytics error", err);
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  Public to admin: AI first responder (called server-side after ticket
//  creation but exposed here for retry from admin UI)
// ─────────────────────────────────────────────────────────────────

router.post("/admin/support/tickets/:id/ai-first-reply", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isAiConfigured()) {
      res.status(400).json({ error: "AI غير مفعّل" });
      return;
    }
    const { ticket, messages } = await loadConversation(id);
    if (!ticket) {
      res.status(404).json({ error: "غير موجودة" });
      return;
    }
    const firstUserMsg = messages.find((m) => m.sender === "user");
    if (!firstUserMsg) {
      res.status(400).json({ error: "لا توجد رسالة" });
      return;
    }
    const r = await Promise.race([
      getAiClient().chat.completions.create({
        model: "gpt-5-nano",
        max_completion_tokens: 380,
        messages: [
          {
            role: "system",
            content:
              "أنت OVELIN AI، المساعد التلقائي للدعم. أجب على سؤال العميل بدقة وودّ بالعربية الفصحى. ابدأ بـ '🤖 رد آلي:' ثم انتقل لسطر جديد. إذا كان السؤال يحتاج تدخّلاً بشرياً (مثل: استرجاع، شكوى، تعديل طلب) قل ذلك صراحةً وأخبر العميل أن الدعم البشري سيرد قريباً. كن مختصراً (3-5 أسطر).",
          },
          {
            role: "user",
            content: `موضوع التذكرة: ${ticket.subject}\nالفئة: ${ticket.category}\n\nالعميل ${ticket.username} يسأل:\n${firstUserMsg.body}`,
          },
        ],
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000)),
    ]);
    const out = ((r as any).choices[0]?.message?.content ?? "").trim();
    if (!out) {
      res.status(500).json({ error: "لم يردّ المساعد" });
      return;
    }
    await db.insert(supportMessagesTable).values({
      ticketId: id,
      sender: "admin",
      authorName: "OVELIN AI",
      body: out,
      isAiGenerated: true,
    });
    await db
      .update(supportTicketsTable)
      .set({
        unreadForUser: sql`${supportTicketsTable.unreadForUser} + 1`,
        firstReplyAt: ticket.firstReplyAt ?? new Date(),
        lastAdminAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(supportTicketsTable.id, id));
    await notify(ticket.userId, "support", "رد فوري من الدعم", `OVELIN AI ردّ على تذكرتك #${id}`, `/support/${id}`);
    res.json({ success: true, body: out });
  } catch (err: any) {
    console.error("ai-first-reply error", err);
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
