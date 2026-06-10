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
  statusComponentsTable,
  prizeDrawsTable,
  prizeTicketsTable,
  achievementsTable,
  userAchievementsTable,
  faqTable,
  travelDestinationsTable,
  travelBookingsTable,
  giftCardsTable,
  notificationsTable,
  usersTable,
} from "@workspace/db";
import { asc, desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { notifyAndPush } from "../../lib/services/notifications";

const router: IRouter = Router();

function nanoid(len = 16) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// ═══════════════════════════════════════════
// Status Components
// ═══════════════════════════════════════════

router.get("/admin/status-components", requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(statusComponentsTable).orderBy(asc(statusComponentsTable.sortOrder), asc(statusComponentsTable.id));
    res.json(list);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.post("/admin/status-components", requireAdmin, async (req, res) => {
  try {
    const { name, description, status, sortOrder } = req.body as any;
    if (!name) { res.status(400).json({ error: "الاسم مطلوب" }); return; }
    const inserted = await db.insert(statusComponentsTable).values({
      name,
      description: description ?? "",
      status: status ?? "operational",
      sortOrder: Number(sortOrder ?? 0),
    }).returning();
    res.json(inserted[0]);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.patch("/admin/status-components/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as any;
    const set: any = { updatedAt: new Date() };
    if (body.name != null) set.name = body.name;
    if (body.description != null) set.description = body.description;
    if (body.status != null) set.status = body.status;
    if (body.sortOrder != null) set.sortOrder = Number(body.sortOrder);
    const updated = await db.update(statusComponentsTable).set(set).where(eq(statusComponentsTable.id, id)).returning();
    if (!updated[0]) { res.status(404).json({ error: "غير موجود" }); return; }
    res.json(updated[0]);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.delete("/admin/status-components/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(statusComponentsTable).where(eq(statusComponentsTable.id, id));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

// ═══════════════════════════════════════════
// Prize Draws
// ═══════════════════════════════════════════

router.get("/admin/prize-draws", requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(prizeDrawsTable).orderBy(desc(prizeDrawsTable.createdAt));
    res.json(list);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.post("/admin/prize-draws", requireAdmin, async (req, res) => {
  try {
    const body = req.body as any;
    if (!body.title || !body.prizeName) { res.status(400).json({ error: "العنوان واسم الجائزة مطلوبان" }); return; }
    const inserted = await db.insert(prizeDrawsTable).values({
      title: body.title,
      description: body.description ?? "",
      prizeName: body.prizeName,
      prizeValue: String(body.prizeValue ?? "0"),
      ticketsPerSpend: String(body.ticketsPerSpend ?? "10"),
      startsAt: body.startsAt ? new Date(body.startsAt) : new Date(),
      endsAt: new Date(body.endsAt ?? Date.now() + 7 * 86400000),
      status: body.status ?? "active",
      bgColor: body.bgColor ?? "from-amber-400 via-pink-500 to-rose-600",
      active: body.active !== false,
    }).returning();
    res.json(inserted[0]);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.post("/admin/prize-draws/:id/draw-winner", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const tickets = await db.select().from(prizeTicketsTable).where(eq(prizeTicketsTable.drawId, id));
    if (tickets.length === 0) { res.status(400).json({ error: "لا توجد تذاكر في هذا السحب" }); return; }
    const winner = tickets[Math.floor(Math.random() * tickets.length)]!;
    const updated = await db.update(prizeDrawsTable)
      .set({ winnerUserId: winner.userId, status: "completed" })
      .where(eq(prizeDrawsTable.id, id))
      .returning();
    notifyAndPush(winner.userId, "prize", "مبروك! فزت بالسحب", `لقد فزت بجائزة السحب #${id}`, "/prizes", "prize");
    res.json({ winner: { userId: winner.userId, ticketCode: winner.ticketCode }, draw: updated[0] });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.delete("/admin/prize-draws/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(prizeDrawsTable).where(eq(prizeDrawsTable.id, id));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

// ═══════════════════════════════════════════
// Achievements
// ═══════════════════════════════════════════

router.get("/admin/achievements", requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(achievementsTable).orderBy(asc(achievementsTable.sortOrder), asc(achievementsTable.id));
    const shaped = list.map((a) => ({
      ...a,
      title: a.name,
      points: a.rewardPoints,
    }));
    res.json(shaped);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.post("/admin/achievements", requireAdmin, async (req, res) => {
  try {
    const body = req.body as any;
    if (!body.code || !body.title) { res.status(400).json({ error: "الكود والعنوان مطلوبان" }); return; }
    const inserted = await db.insert(achievementsTable).values({
      code: body.code,
      name: body.title ?? body.name,
      description: body.description ?? "",
      icon: body.icon ?? "🏆",
      rewardPoints: Number(body.points ?? body.rewardPoints ?? 50),
      rewardBalance: String(body.rewardBalance ?? "0"),
      tier: body.tier ?? "bronze",
      active: body.active !== false,
      sortOrder: Number(body.sortOrder ?? 0),
    }).returning();
    res.json({ ...inserted[0], title: inserted[0]!.name, points: inserted[0]!.rewardPoints });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.post("/admin/achievements/:id/grant/:userId", requireAdmin, async (req, res) => {
  try {
    const achievementId = Number(req.params.id);
    const userId = Number(req.params.userId);
    if (!userId || !achievementId) { res.status(400).json({ error: "بيانات غير صالحة" }); return; }
    const existing = await db.select().from(userAchievementsTable)
      .where(sql`${userAchievementsTable.userId} = ${userId} and ${userAchievementsTable.achievementId} = ${achievementId}`)
      .limit(1);
    if (existing[0]) { res.status(400).json({ error: "المستخدم حصل على هذا الإنجاز بالفعل" }); return; }
    await db.insert(userAchievementsTable).values({ userId, achievementId });
    const ach = await db.select().from(achievementsTable).where(eq(achievementsTable.id, achievementId)).limit(1);
    if (ach[0]) {
      notifyAndPush(userId, "achievement", `فتحت إنجاز جديد: ${ach[0].name}`, ach[0].description, "/achievements", "achievement");
    }
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.delete("/admin/achievements/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(achievementsTable).where(eq(achievementsTable.id, id));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

// ═══════════════════════════════════════════
// FAQ CRUD
// ═══════════════════════════════════════════

router.get("/admin/faq", requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(faqTable).orderBy(asc(faqTable.sortOrder), asc(faqTable.id));
    res.json(list);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.post("/admin/faq", requireAdmin, async (req, res) => {
  try {
    const body = req.body as any;
    if (!body.question || !body.answer) { res.status(400).json({ error: "السؤال والجواب مطلوبان" }); return; }
    const inserted = await db.insert(faqTable).values({
      question: body.question,
      answer: body.answer,
      category: body.category ?? "general",
      sortOrder: Number(body.sortOrder ?? 0),
      active: body.active !== false,
    }).returning();
    res.json(inserted[0]);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.patch("/admin/faq/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body as any;
    const set: any = {};
    if (body.question != null) set.question = body.question;
    if (body.answer != null) set.answer = body.answer;
    if (body.category != null) set.category = body.category;
    if (body.sortOrder != null) set.sortOrder = Number(body.sortOrder);
    if (typeof body.active === "boolean") set.active = body.active;
    const updated = await db.update(faqTable).set(set).where(eq(faqTable.id, id)).returning();
    if (!updated[0]) { res.status(404).json({ error: "غير موجود" }); return; }
    res.json(updated[0]);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.delete("/admin/faq/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(faqTable).where(eq(faqTable.id, id));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

// ═══════════════════════════════════════════
// Travel Destinations & Bookings
// ═══════════════════════════════════════════

router.get("/admin/travel-destinations", requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(travelDestinationsTable).orderBy(asc(travelDestinationsTable.sortOrder), asc(travelDestinationsTable.id));
    const shaped = list.map((d) => ({ ...d, imageUrl: d.image, cashCost: d.cashCost, durationDays: null }));
    res.json(shaped);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.post("/admin/travel-destinations", requireAdmin, async (req, res) => {
  try {
    const body = req.body as any;
    if (!body.name) { res.status(400).json({ error: "الاسم مطلوب" }); return; }
    const inserted = await db.insert(travelDestinationsTable).values({
      name: body.name,
      country: body.country ?? "",
      description: body.description ?? "",
      image: body.imageUrl || body.image || null,
      pointsCost: Number(body.pointsCost ?? 1000),
      cashCost: String(body.cashCost ?? "0"),
      highlights: Array.isArray(body.highlights) ? body.highlights : [],
      active: body.active !== false,
      sortOrder: Number(body.sortOrder ?? 0),
    }).returning();
    res.json({ ...inserted[0], imageUrl: inserted[0]!.image });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.delete("/admin/travel-destinations/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(travelDestinationsTable).where(eq(travelDestinationsTable.id, id));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.get("/admin/travel-bookings", requireAdmin, async (_req, res) => {
  try {
    const list = await db
      .select({
        id: travelBookingsTable.id,
        userId: travelBookingsTable.userId,
        destinationId: travelBookingsTable.destinationId,
        pointsUsed: travelBookingsTable.pointsUsed,
        travellerName: travelBookingsTable.travellerName,
        contact: travelBookingsTable.contact,
        preferredDate: travelBookingsTable.preferredDate,
        status: travelBookingsTable.status,
        notes: travelBookingsTable.notes,
        totalCost: travelBookingsTable.pointsUsed,
        travelers: sql<number>`1`,
        createdAt: travelBookingsTable.createdAt,
      })
      .from(travelBookingsTable)
      .orderBy(desc(travelBookingsTable.createdAt));
    res.json(list);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.patch("/admin/travel-bookings/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body as { status?: string };
    const set: any = {};
    if (status) set.status = status;
    const updated = await db.update(travelBookingsTable).set(set).where(eq(travelBookingsTable.id, id)).returning();
    if (!updated[0]) { res.status(404).json({ error: "غير موجود" }); return; }
    res.json(updated[0]);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

// ═══════════════════════════════════════════
// Gift Cards (admin)
// ═══════════════════════════════════════════

router.get("/admin/gift-cards", requireAdmin, async (_req, res) => {
  try {
    const list = await db.select().from(giftCardsTable).orderBy(desc(giftCardsTable.createdAt)).limit(200);
    res.json(list);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.post("/admin/gift-cards", requireAdmin, async (req, res) => {
  try {
    const { amount, message, expiresInDays, recipientUserId } = req.body as any;
    if (!amount) { res.status(400).json({ error: "المبلغ مطلوب" }); return; }
    const code = "GC-" + nanoid(12);
    const expiresAt = expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 86400000) : null;
    const inserted = await db.insert(giftCardsTable).values({
      code,
      amount: String(amount),
      message: message || null,
      expiresAt: expiresAt ?? undefined,
      redeemedByUserId: recipientUserId ? Number(recipientUserId) : null,
    }).returning();
    if (recipientUserId) {
      notifyAndPush(Number(recipientUserId), "gift", "حصلت على بطاقة هدية", `قيمتها ${amount} ج.س — كود: ${code}`, "/wallet", "gift");
    }
    res.json(inserted[0]);
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

router.delete("/admin/gift-cards/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(giftCardsTable).where(eq(giftCardsTable.id, id));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

// ═══════════════════════════════════════════
// Notify User (admin broadcast / targeted)
// ═══════════════════════════════════════════

router.post("/admin/notify-user", requireAdmin, async (req, res) => {
  try {
    const { userId, title, body: bodyText, url } = req.body as {
      userId?: number | null;
      title: string;
      body: string;
      url?: string;
    };
    if (!title || !bodyText) { res.status(400).json({ error: "العنوان والنص مطلوبان" }); return; }

    const link = url ?? "/";
    const payload = { title, body: bodyText, url: link, tag: "admin-broadcast" };

    if (userId) {
      notifyAndPush(userId, "admin", title, bodyText, link, "admin-broadcast");
      res.json({ sent: 1 });
    } else {
      // إرسال لكل المستخدمين غير المحجوبين — in-app + push
      const users = await db.select({ id: usersTable.id }).from(usersTable).where(sql`${usersTable.isBlocked} = false`);
      let sent = 0;
      for (const u of users) {
        try {
          notifyAndPush(u.id, "admin", title, bodyText, link, "admin-broadcast");
          sent++;
        } catch { /* skip failed */ }
      }
      res.json({ sent });
    }
  } catch (err: any) { res.status(500).json({ error: err?.message ?? "فشل" }); }
});

export default router;
