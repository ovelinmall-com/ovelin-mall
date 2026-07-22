// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { Router, type IRouter } from "express";
import { db, referralWithdrawalsTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { notifyAndPush } from "../../lib/services/notifications";
import { adjustBalance } from "../../lib/services/wallet";

const router: IRouter = Router();

router.get("/admin/referral-withdrawals", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: referralWithdrawalsTable.id,
        userId: referralWithdrawalsTable.userId,
        username: usersTable.username,
        method: referralWithdrawalsTable.method,
        phoneNumber: referralWithdrawalsTable.phoneNumber,
        accountNumber: referralWithdrawalsTable.accountNumber,
        accountName: referralWithdrawalsTable.accountName,
        amount: referralWithdrawalsTable.amount,
        referralBalanceSnapshot: referralWithdrawalsTable.referralBalanceSnapshot,
        status: referralWithdrawalsTable.status,
        adminNotes: referralWithdrawalsTable.adminNotes,
        createdAt: referralWithdrawalsTable.createdAt,
      })
      .from(referralWithdrawalsTable)
      .leftJoin(usersTable, eq(usersTable.id, referralWithdrawalsTable.userId))
      .orderBy(desc(referralWithdrawalsTable.createdAt))
      .limit(500);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/admin/referral-withdrawals/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, adminNotes } = req.body as { status?: string; adminNotes?: string };

    if (!status) {
      res.status(400).json({ error: "الحالة مطلوبة" });
      return;
    }

    const old = await db
      .select()
      .from(referralWithdrawalsTable)
      .where(eq(referralWithdrawalsTable.id, id))
      .limit(1);
    const item = old[0];
    if (!item) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }

    await db
      .update(referralWithdrawalsTable)
      .set({ status, ...(adminNotes !== undefined ? { adminNotes } : {}) })
      .where(eq(referralWithdrawalsTable.id, id));

    if (status === "approved" && item.status !== "approved") {
      // خصم المبلغ من رصيد الإحالة عند الموافقة
      await adjustBalance(item.userId, "cashbackBalance", -Number(item.amount));
      notifyAndPush(
        item.userId,
        "wallet",
        "تمت الموافقة على طلب السحب",
        `تمت الموافقة على طلب سحب ${Number(item.amount).toLocaleString()} ج.س من رصيد إحالتك وسيتم التحويل قريباً.`,
        "/wallet",
        `ref-withdraw-approved-${id}`,
      );
    } else if (status === "rejected" && item.status === "pending") {
      notifyAndPush(
        item.userId,
        "wallet",
        "تم رفض طلب السحب",
        `تم رفض طلب السحب الخاص بك.${adminNotes ? ` السبب: ${adminNotes}` : ""}`,
        "/wallet",
        `ref-withdraw-rejected-${id}`,
      );
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
