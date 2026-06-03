// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { Router, type IRouter } from "express";
import {
  db,
  referralWithdrawalsTable,
  referralsTable,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import { notify } from "../lib/services/notifications";

const router: IRouter = Router();

const VALID_METHODS = ["okash", "mycash", "binance", "sudanese", "zain", "mtn"] as const;
const MOBILE_METHODS = ["sudanese", "zain", "mtn"];
const MIN_WITHDRAW = 2000;

async function getReferralBalance(userId: number) {
  const rows = await db
    .select({ earned: referralsTable.earned, signupBonus: referralsTable.signupBonus })
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, userId));
  const total = rows.reduce((s, r) => s + Number(r.earned) + Number(r.signupBonus), 0);

  const wRows = await db
    .select({ s: sql<string>`coalesce(sum(amount::numeric), 0)::text` })
    .from(referralWithdrawalsTable)
    .where(
      and(
        eq(referralWithdrawalsTable.userId, userId),
        inArray(referralWithdrawalsTable.status, ["pending", "approved"]),
      ),
    );
  const withdrawn = Number(wRows[0]?.s ?? "0");
  const available = Math.max(0, total - withdrawn);
  return { total, withdrawn, available };
}

router.get("/wallet/referral-balance", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { total, withdrawn, available } = await getReferralBalance(user.id);
    res.json({
      total: total.toFixed(2),
      withdrawn: withdrawn.toFixed(2),
      available: available.toFixed(2),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/wallet/referral-withdraw", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { method, amount, phoneNumber, accountNumber, accountName } = req.body as {
      method: string;
      amount: string;
      phoneNumber?: string;
      accountNumber?: string;
      accountName?: string;
    };

    if (!VALID_METHODS.includes(method as any)) {
      res.status(400).json({ error: "طريقة دفع غير صالحة" });
      return;
    }

    const amt = Number(amount);
    if (!amt || amt < MIN_WITHDRAW) {
      res.status(400).json({ error: `الحد الأدنى للسحب ${MIN_WITHDRAW.toLocaleString()} ج.س` });
      return;
    }

    const isMobile = MOBILE_METHODS.includes(method);
    if (isMobile && !phoneNumber?.trim()) {
      res.status(400).json({ error: "رقم الهاتف مطلوب" });
      return;
    }
    if (!isMobile && (!accountNumber?.trim() || !accountName?.trim())) {
      res.status(400).json({ error: "بيانات الحساب مطلوبة" });
      return;
    }

    const { available } = await getReferralBalance(user.id);
    if (amt > available) {
      res.status(400).json({ error: "رصيد الإحالة غير كافٍ للسحب" });
      return;
    }

    await db.insert(referralWithdrawalsTable).values({
      userId: user.id,
      method,
      phoneNumber: isMobile ? phoneNumber!.trim() : null,
      accountNumber: !isMobile ? accountNumber!.trim() : null,
      accountName: !isMobile ? accountName!.trim() : null,
      amount: amt.toFixed(2),
      referralBalanceSnapshot: available.toFixed(2),
      status: "pending",
    });

    await notify(
      user.id,
      "wallet",
      "تم استلام طلب السحب",
      `طلب سحب ${amt.toLocaleString()} ج.س من رصيد الإحالة قيد المراجعة — سيتم المعالجة خلال 24 ساعة.`,
      "/wallet",
    );

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/wallet/referral-withdrawals/my", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db
      .select()
      .from(referralWithdrawalsTable)
      .where(eq(referralWithdrawalsTable.userId, user.id))
      .orderBy(desc(referralWithdrawalsTable.createdAt))
      .limit(50);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
