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
  usersTable,
  settingsTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { adjustBalance } from "../lib/services/wallet";
import { requireUser } from "../lib/auth";
import { notify } from "../lib/services/notifications";
import { sendPushToAdmin } from "../lib/services/pushService";
import { emitToAll } from "../lib/wsManager";

const router: IRouter = Router();

const VALID_METHODS = ["okash", "mycash", "binance", "sudanese", "zain", "mtn"] as const;
const MOBILE_METHODS = ["sudanese", "zain", "mtn"];

async function getMinWithdraw(): Promise<number> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, "minReferralWithdraw")).limit(1);
  const v = Number(rows[0]?.value ?? "2000");
  return isNaN(v) || v <= 0 ? 2000 : v;
}

async function getReferralBalance(userId: number) {
  const rows = await db
    .select({ cashbackBalance: usersTable.cashbackBalance })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const available = Math.max(0, Math.round(Number(rows[0]?.cashbackBalance ?? 0)));
  return { available };
}

router.get("/wallet/referral-balance", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { available } = await getReferralBalance(user.id);
    res.json({
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
    const MIN_WITHDRAW = await getMinWithdraw();
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
      amount: String(amt),
      referralBalanceSnapshot: String(available),
      // status uses DB default "pending" — do NOT pass explicitly to avoid Drizzle param ordering bug
    });

    await notify(
      user.id,
      "wallet",
      "تم استلام طلب السحب",
      `طلب سحب ${amt.toLocaleString()} ج.س من رصيد الإحالة قيد المراجعة — سيتم المعالجة خلال 24 ساعة.`,
      "/wallet",
    );

    // Push للأدمن — طلب سحب إحالة جديد
    sendPushToAdmin({
      title: "💸 طلب سحب إحالة جديد",
      body: `${user.username} — ${amt.toLocaleString()} ج.س عبر ${method}`,
      url: "/admin",
      tag: `ref-withdraw-new`,
    }).catch(() => {});

    emitToAll("admin:badge_update", { tab: "referral-withdrawals" });
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
