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
  ordersTable,
  transactionsTable,
  notificationsTable,
  referralsTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import { hashPassword, verifyPassword } from "../lib/auth";
import { vipFromTotalSpent } from "../lib/services/wallet";
import { audit } from "../lib/services/auditLog";

const router: IRouter = Router();

function publicUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    balance: u.balance,
    cashbackBalance: u.cashbackBalance,
    totalSpent: u.totalSpent,
    vipLevel: u.vipLevel,
    referralCode: u.referralCode,
    referredBy: u.referredBy,
    avatarUrl: u.avatarUrl,
    loyaltyPoints: u.loyaltyPoints,
    createdAt: u.createdAt,
  };
}

router.get("/account/dashboard", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const recentOrders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, user.id))
      .orderBy(desc(ordersTable.createdAt))
      .limit(5);
    const recentTransactions = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, user.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(5);
    const unreadCount = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));
    const refRows = await db
      .select({
        c: sql<number>`count(*)::int`,
        e: sql<string>`coalesce(sum(${referralsTable.earned}::numeric), 0)::text`,
      })
      .from(referralsTable)
      .where(eq(referralsTable.referrerId, user.id));

    const totalDeposits = await db
      .select({
        s: sql<string>`coalesce(sum(amount::numeric), 0)::text`,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, user.id),
          eq(transactionsTable.type, "deposit"),
          eq(transactionsTable.status, "completed"),
        ),
      );

    const total = Number(user.totalSpent);
    const { current, next, nextAt } = vipFromTotalSpent(total);
    res.json({
      user: publicUser(user),
      wallet: {
        balance: user.balance,
        cashbackBalance: user.cashbackBalance,
        totalDeposits: totalDeposits[0]?.s ?? "0",
        totalSpent: user.totalSpent,
        vipLevel: current,
        nextVipLevel: next ?? null,
        nextVipAt: nextAt != null ? nextAt.toFixed(2) : null,
      },
      recentOrders,
      recentTransactions,
      unreadNotifications: Number(unreadCount[0]?.c ?? 0),
      referralStats: {
        count: Number(refRows[0]?.c ?? 0),
        earned: refRows[0]?.e ?? "0",
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/account/activity", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, user.id))
      .orderBy(desc(ordersTable.createdAt))
      .limit(20);
    const txns = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, user.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(20);
    const items = [
      ...orders.map((o) => ({
        id: `order-${o.id}`,
        kind: "order",
        title: `طلب — ${o.productName}`,
        description: `الحالة: ${o.status}`,
        amount: o.finalPrice,
        status: o.status,
        createdAt: o.createdAt,
      })),
      ...txns.map((t) => ({
        id: `txn-${t.id}`,
        kind: "transaction",
        title: `معاملة — ${t.type}`,
        description: t.reference ?? "",
        amount: t.amount,
        status: t.status,
        createdAt: t.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(items.slice(0, 30));
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/account/change-password", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };
    if (!currentPassword || !newPassword || newPassword.length < 4) {
      res.status(400).json({ error: "بيانات غير مكتملة" });
      return;
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      res.status(401).json({ error: "كلمة السر الحالية غير صحيحة" });
      return;
    }
    await db.update(usersTable).set({ passwordHash: hashPassword(newPassword) }).where(eq(usersTable.id, user.id));
    await audit(user.username, "change_password", "users", user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/account/profile", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { email } = req.body as { email?: string };
    const e = email?.trim();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
      return;
    }
    const updated = await db
      .update(usersTable)
      .set({ email: e || null })
      .where(eq(usersTable.id, user.id))
      .returning();
    res.json(publicUser(updated[0]!));
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
