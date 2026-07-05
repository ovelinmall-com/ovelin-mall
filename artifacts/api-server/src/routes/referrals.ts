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
import { db, referralsTable, usersTable, transactionsTable, settingsTable } from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";

async function getSetting(key: string, def: string): Promise<string> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return rows[0]?.value ?? def;
}

const router: IRouter = Router();

router.get("/referrals/me", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const [rows, commPctStr, signupBonusStr, referralEnabledStr] = await Promise.all([
      db
        .select({
          id: referralsTable.id,
          username: usersTable.username,
          joinedAt: usersTable.createdAt,
          earned: referralsTable.earned,
          signupBonus: referralsTable.signupBonus,
        })
        .from(referralsTable)
        .innerJoin(usersTable, eq(usersTable.id, referralsTable.referredUserId))
        .where(eq(referralsTable.referrerId, user.id))
        .orderBy(desc(referralsTable.createdAt)),
      getSetting("referralCommissionPct", "5"),
      getSetting("referralSignupBonus", "0"),
      getSetting("referralEnabled", "true"),
    ]);
    const totalEarned = rows.reduce((s, r) => s + Number(r.earned), 0);
    const signupBonusTotal = rows.reduce((s, r) => s + Number(r.signupBonus), 0);
    res.json({
      referralCode: user.referralCode,
      referralLink: `?ref=${user.referralCode}`,
      totalReferrals: rows.length,
      totalEarned: totalEarned.toFixed(2),
      signupBonusTotal: signupBonusTotal.toFixed(2),
      commissionPct: commPctStr,
      signupBonusAmount: signupBonusStr,
      referralEnabled: referralEnabledStr === "true",
      referrals: rows.map((r) => ({
        username: r.username,
        joinedAt: r.joinedAt,
        earned: r.earned,
        signupBonus: r.signupBonus,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/referrals/leaderboard", async (_req, res) => {
  try {
    const rows = await db
      .select({
        username: usersTable.username,
        count: sql<number>`count(${referralsTable.id})::int`,
        earned: sql<string>`coalesce(sum(${referralsTable.earned}::numeric), 0)::text`,
      })
      .from(referralsTable)
      .innerJoin(usersTable, eq(usersTable.id, referralsTable.referrerId))
      .groupBy(usersTable.username)
      .orderBy(sql`count(${referralsTable.id}) desc`)
      .limit(20);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/referrals/earnings", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const list = await db
      .select()
      .from(transactionsTable)
      .where(and(eq(transactionsTable.userId, user.id), eq(transactionsTable.type, "referral")))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(50);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let thisMonth = 0;
    let lastMonth = 0;
    let allTime = 0;
    for (const t of list) {
      const a = Number(t.amount);
      allTime += a;
      const d = new Date(t.createdAt);
      if (d >= monthStart) thisMonth += a;
      else if (d >= lastMonthStart) lastMonth += a;
    }
    // Monthly aggregation last 6 months
    const monthly: Array<{ month: string; total: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const sum = list
        .filter((t) => {
          const td = new Date(t.createdAt);
          return td >= d && td < next;
        })
        .reduce((s, t) => s + Number(t.amount), 0);
      monthly.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        total: sum.toFixed(2),
      });
    }
    res.json({
      thisMonth: thisMonth.toFixed(2),
      lastMonth: lastMonth.toFixed(2),
      allTime: allTime.toFixed(2),
      recent: list.slice(0, 20).map((t) => ({
        id: t.id,
        fromUsername: (t.reference ?? "").replace(/^from\s+/, ""),
        amount: t.amount,
        orderId: null,
        createdAt: t.createdAt,
      })),
      monthly,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
