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
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import { sendTelegramMessage } from "../lib/integrations";
import { getAiClient, isAiConfigured } from "../lib/integrations/aiClient";
import { notify } from "../lib/services/notifications";
import { sendPushToAdmin } from "../lib/services/pushService";
import { emitToAll } from "../lib/wsManager";

const router: IRouter = Router();

// Background AI first-responder. Fires after ticket creation. Never blocks the response.
async function tryAiFirstReply(ticketId: number, subject: string, category: string, username: string, body: string) {
  if (!isAiConfigured()) return;
  try {
    const r = await Promise.race([
      getAiClient().chat.completions.create({
        model: "gpt-5-nano",
        max_completion_tokens: 380,
        messages: [
          {
            role: "system",
            content:
              "أنت OVELIN AI، المساعد التلقائي للدعم. أجب على سؤال العميل بدقة وودّ بالعربية الفصحى. ابدأ بـ '🤖 رد آلي:' ثم انتقل لسطر جديد. إذا كان السؤال يحتاج تدخّلاً بشرياً (مثل: استرجاع، شكوى، تعديل طلب، خطأ في الدفع) قل ذلك صراحةً وأخبر العميل أن الدعم البشري سيرد قريباً. كن مختصراً (3-5 أسطر).",
          },
          {
            role: "user",
            content: `موضوع التذكرة: ${subject}\nالفئة: ${category}\n\nالعميل ${username} يسأل:\n${body}`,
          },
        ],
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000)),
    ]);
    const out = ((r as any).choices[0]?.message?.content ?? "").trim();
    if (!out) return;
    const ticketRows = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.id, ticketId))
      .limit(1);
    const t = ticketRows[0];
    if (!t) return;
    await db.insert(supportMessagesTable).values({
      ticketId,
      sender: "admin",
      authorName: "OVELIN AI",
      body: out,
      isAiGenerated: true,
    });
    await db
      .update(supportTicketsTable)
      .set({
        unreadForUser: sql`${supportTicketsTable.unreadForUser} + 1`,
        firstReplyAt: t.firstReplyAt ?? new Date(),
        lastAdminAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(supportTicketsTable.id, ticketId));
    await notify(t.userId, "support", "رد فوري من الدعم", `OVELIN AI ردّ على تذكرتك #${ticketId}`, `/support/${ticketId}`);
  } catch (e) {
    console.warn("AI first reply failed:", (e as any)?.message);
  }
}

// Sentiment quick-tag at creation time (no AI cost — heuristic)
function detectUrgent(text: string): boolean {
  const lower = text.toLowerCase();
  const urgentWords = [
    "عاجل",
    "ضروري",
    "خسرت",
    "انسحب",
    "نصب",
    "احتيال",
    "مشكلة كبير",
    "ما وصل",
    "ضايع",
    "اختراق",
    "هكر",
    "خصم بدون",
    "استرجاع",
    "refund",
    "urgent",
    "scam",
  ];
  return urgentWords.some((w) => lower.includes(w));
}

router.get("/support/tickets", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const list = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.userId, user.id))
      .orderBy(desc(supportTicketsTable.updatedAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/support/tickets", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { subject, category, message } = req.body as {
      subject?: string;
      category?: string;
      message?: string;
    };
    const s = (subject ?? "").trim();
    const m = (message ?? "").trim();
    if (s.length < 3 || m.length < 1) {
      res.status(400).json({ error: "الموضوع والرسالة مطلوبة" });
      return;
    }
    const urgent = detectUrgent(s + "\n" + m);
    const inserted = await db
      .insert(supportTicketsTable)
      .values({
        userId: user.id,
        subject: s,
        category: category || "general",
        status: "open",
        priority: urgent ? "urgent" : "normal",
        unreadForAdmin: 1,
        aiSentiment: urgent ? "urgent" : null,
      })
      .returning();
    const ticket = inserted[0]!;
    await db.insert(supportMessagesTable).values({
      ticketId: ticket.id,
      sender: "user",
      authorName: user.username,
      body: m,
    });
    sendTelegramMessage(
      `🎫 <b>تذكرة دعم جديدة #${ticket.id}</b>\nالمستخدم: ${user.username}\nالموضوع: ${s}\n${urgent ? "🚨 <b>عاجلة</b>\n" : ""}`,
    ).catch(() => {});
    sendPushToAdmin({
      title: urgent ? "🚨 تذكرة عاجلة!" : "🎫 تذكرة دعم جديدة",
      body: `${user.username}: ${s}`,
      url: "/admin",
      tag: `support-${ticket.id}`,
    }).catch(() => {});
    // Fire AI first-responder in background — don't await
    tryAiFirstReply(ticket.id, s, category || "general", user.username, m).catch(() => {});
    emitToAll("admin:badge_update", { tab: "support" });
    res.json({ id: ticket.id, success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/support/unread-count", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db
      .select({
        status: supportTicketsTable.status,
        priority: supportTicketsTable.priority,
        unread: supportTicketsTable.unreadForUser,
      })
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.userId, user.id));
    let count = 0;
    let openCount = 0;
    let waitingUserCount = 0;
    let urgentCount = 0;
    let resolvedCount = 0;
    for (const r of rows) {
      count += Number(r.unread ?? 0);
      if (r.status === "open") openCount++;
      else if (r.status === "waiting_user") waitingUserCount++;
      else if (r.status === "resolved") resolvedCount++;
      if (r.priority === "urgent" && r.status !== "closed") urgentCount++;
    }
    res.json({
      count,
      openCount,
      waitingUserCount,
      urgentCount,
      resolvedCount,
      totalCount: rows.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/support/tickets/:id", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    const rows = await db
      .select()
      .from(supportTicketsTable)
      .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, user.id)))
      .limit(1);
    const ticket = rows[0];
    if (!ticket) {
      res.status(404).json({ error: "التذكرة غير موجودة" });
      return;
    }
    const messages = await db
      .select()
      .from(supportMessagesTable)
      .where(eq(supportMessagesTable.ticketId, id))
      .orderBy(asc(supportMessagesTable.createdAt));
    if (ticket.unreadForUser > 0) {
      await db
        .update(supportTicketsTable)
        .set({ unreadForUser: 0 })
        .where(eq(supportTicketsTable.id, id));
    }
    res.json({ ticket, messages });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/support/tickets/:id/messages", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    const { body } = req.body as { body?: string };
    const b = (body ?? "").trim();
    if (!b) {
      res.status(400).json({ error: "الرسالة مطلوبة" });
      return;
    }
    const rows = await db
      .select()
      .from(supportTicketsTable)
      .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, user.id)))
      .limit(1);
    const ticket = rows[0];
    if (!ticket) {
      res.status(404).json({ error: "التذكرة غير موجودة" });
      return;
    }
    if (ticket.status === "closed") {
      res.status(400).json({ error: "التذكرة مغلقة" });
      return;
    }
    await db.insert(supportMessagesTable).values({
      ticketId: id,
      sender: "user",
      authorName: user.username,
      body: b,
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
    emitToAll("admin:badge_update", { tab: "support" });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/support/tickets/:id/close", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    await db
      .update(supportTicketsTable)
      .set({ status: "closed", resolvedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(supportTicketsTable.id, id), eq(supportTicketsTable.userId, user.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
