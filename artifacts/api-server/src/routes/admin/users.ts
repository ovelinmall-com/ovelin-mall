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
import { db, usersTable, ordersTable, transactionsTable, sessionsTable, referralsTable, supportTicketsTable, supportMessagesTable } from "@workspace/db";
import { desc, eq, or, sql, max, inArray, and } from "drizzle-orm";
import { hashPassword, requireAdmin } from "../../lib/auth";
import { audit } from "../../lib/services/auditLog";
import { getOnlineUsersMap, emitToUser } from "../../lib/wsManager";
import { notifyAndPush } from "../../lib/services/notifications";

const router: IRouter = Router();

router.get("/admin/users", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: usersTable.id,
        displayId: usersTable.displayId,
        username: usersTable.username,
        email: usersTable.email,
        balance: usersTable.balance,
        cashbackBalance: usersTable.cashbackBalance,
        referralCode: usersTable.referralCode,
        referredBy: usersTable.referredBy,
        totalSpent: usersTable.totalSpent,
        vipLevel: usersTable.vipLevel,
        isBlocked: usersTable.isBlocked,
        createdAt: usersTable.createdAt,
        totalOrders: sql<number>`(select count(*) from orders where orders.user_id = users.id)::int`,
        referralCount: sql<number>`(select count(*) from referrals where referrals.referrer_id = users.id)::int`,
        lastSeen: sql<string | null>`(select max(last_seen_at) from sessions where sessions.user_id = users.id)`,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { balance, cashbackBalance, email, isBlocked, vipLevel } = req.body as {
      balance?: string;
      cashbackBalance?: string;
      email?: string;
      isBlocked?: boolean;
      vipLevel?: string;
    };
    const set: any = {};
    if (balance != null) set.balance = String(balance);
    if (cashbackBalance != null) set.cashbackBalance = String(cashbackBalance);
    if (email != null) set.email = email || null;
    if (typeof isBlocked === "boolean") set.isBlocked = isBlocked;
    if (vipLevel) set.vipLevel = vipLevel;
    const updated = await db.update(usersTable).set(set).where(eq(usersTable.id, id)).returning();
    const u = updated[0];
    if (!u) {
      res.status(404).json({ error: "غير موجود" });
      return;
    }
    const totalRows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(eq(ordersTable.userId, id));
    await audit("admin", "update_user", "users", id, set);
    if (balance != null || cashbackBalance != null) {
      emitToUser(id, "wallet_update", {
        balance: u.balance,
        cashbackBalance: u.cashbackBalance,
      });
    }
    res.json({
      id: u.id,
      displayId: u.displayId,
      username: u.username,
      email: u.email,
      balance: u.balance,
      cashbackBalance: u.cashbackBalance,
      referralCode: u.referralCode,
      referredBy: u.referredBy,
      totalSpent: u.totalSpent,
      vipLevel: u.vipLevel,
      isBlocked: u.isBlocked,
      totalOrders: Number(totalRows[0]?.c ?? 0),
      createdAt: u.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword || newPassword.length < 4) {
      res.status(400).json({ error: "كلمة سر قصيرة" });
      return;
    }
    await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, id));
    await audit("admin", "reset_user_password", "users", id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// البحث عن مستخدم عبر displayId
router.get("/admin/users/by-display-id/:displayId", requireAdmin, async (req, res) => {
  try {
    const did = (req.params.displayId as string).trim();
    const rows = await db
      .select({
        id: usersTable.id,
        displayId: usersTable.displayId,
        username: usersTable.username,
        email: usersTable.email,
        balance: usersTable.balance,
        cashbackBalance: usersTable.cashbackBalance,
        referralCode: usersTable.referralCode,
        totalSpent: usersTable.totalSpent,
        vipLevel: usersTable.vipLevel,
        isBlocked: usersTable.isBlocked,
        createdAt: usersTable.createdAt,
        totalOrders: sql<number>`(select count(*) from orders where orders.user_id = users.id)::int`,
      })
      .from(usersTable)
      .where(or(eq(usersTable.displayId, did), eq(usersTable.referralCode, did.toUpperCase())))
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// شحن رصيد مباشرة عبر displayId
router.post("/admin/users/topup-by-display-id", requireAdmin, async (req, res) => {
  try {
    const { displayId, amount, note } = req.body as { displayId?: string; amount?: string; note?: string };
    if (!displayId || !amount) {
      res.status(400).json({ error: "displayId والمبلغ مطلوبان" });
      return;
    }
    const bonus = Number(amount);
    if (!isFinite(bonus) || bonus <= 0) {
      res.status(400).json({ error: "مبلغ غير صالح" });
      return;
    }
    const userRows = await db.select().from(usersTable).where(eq(usersTable.displayId, displayId.trim())).limit(1);
    const user = userRows[0];
    if (!user) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    const newBalance = (Number(user.balance) + bonus).toFixed(2);
    await db.update(usersTable).set({ balance: newBalance }).where(eq(usersTable.id, user.id));
    await db.insert(transactionsTable).values({
      userId: user.id,
      type: "deposit",
      amount: bonus.toFixed(2),
      meta: note ?? `شحن يدوي من الأدمن عبر ID`,
      reference: `admin-topup-${displayId}`,
      status: "completed",
    });
    await audit("admin", "topup_by_display_id", "users", user.id, { displayId, amount, note });
    res.json({ success: true, username: user.username, newBalance });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─── المستخدمون النشطون الآن عبر WebSocket ────────────────────────────────────
router.get("/admin/active-users", requireAdmin, async (_req, res) => {
  try {
    const onlineMap = getOnlineUsersMap();
    const userIds = Array.from(onlineMap.keys());
    if (userIds.length === 0) {
      res.json({ users: [], total: 0, mobile: 0, desktop: 0 });
      return;
    }
    const rows = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        displayId: usersTable.displayId,
      })
      .from(usersTable)
      .where(inArray(usersTable.id, userIds));
    const users = rows.map((u) => ({
      userId: u.id,
      username: u.username,
      displayId: u.displayId,
      platform: onlineMap.get(u.id) ?? "browser",
    }));
    const apk = users.filter((u) => u.platform === "apk").length;
    const browser = users.filter((u) => u.platform === "browser").length;
    res.json({ users, total: users.length, apk, browser });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─── فتح دردشة مع مستخدم — تُظهر الرسالة في قسم الدعم لديه ─────────────────
router.post("/admin/users/:id/open-chat", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { message } = req.body as { message?: string };
    if (!message?.trim()) {
      res.status(400).json({ error: "الرسالة مطلوبة" });
      return;
    }
    const userRows = await db.select({ id: usersTable.id, username: usersTable.username })
      .from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!userRows[0]) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    // ابحث عن تذكرة مفتوحة موجودة
    const existing = await db.select({ id: supportTicketsTable.id })
      .from(supportTicketsTable)
      .where(and(eq(supportTicketsTable.userId, id), eq(supportTicketsTable.status, "open")))
      .orderBy(desc(supportTicketsTable.createdAt))
      .limit(1);
    let ticketId: number;
    if (existing[0]) {
      ticketId = existing[0].id;
    } else {
      const [ticket] = await db.insert(supportTicketsTable).values({
        userId: id,
        subject: "رسالة من فريق Ovelin Mall",
        category: "general",
        status: "open",
        unreadForUser: 0,
        unreadForAdmin: 0,
      }).returning({ id: supportTicketsTable.id });
      ticketId = ticket.id;
    }
    await db.insert(supportMessagesTable).values({
      ticketId,
      sender: "admin",
      authorName: "فريق Ovelin Mall",
      body: message.trim(),
    });
    await db.update(supportTicketsTable).set({
      unreadForUser: sql`${supportTicketsTable.unreadForUser} + 1`,
      lastAdminAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(supportTicketsTable.id, ticketId));
    notifyAndPush(
      id,
      "support",
      "💬 رسالة جديدة من الإدارة",
      message.trim().slice(0, 80),
      "/support",
      `admin-chat-${ticketId}`,
    );
    res.json({ ok: true, ticketId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
