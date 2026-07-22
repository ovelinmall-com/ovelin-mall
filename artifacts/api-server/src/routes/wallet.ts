// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import { Router, type IRouter } from "express";
import multer from "multer";
import {
  db,
  transactionsTable,
  usersTable,
  transfersTable,
  settingsTable,
  depositRequestsTable,
} from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";

import {
  adjustBalance,
  safeDebit,
  recordTransaction,
  vipFromTotalSpent,
  InsufficientFundsError,
} from "../lib/services/wallet";
import { notify } from "../lib/services/notifications";
import { sendPushToAdmin } from "../lib/services/pushService";
import { emitToAll } from "../lib/wsManager";
import { audit } from "../lib/services/auditLog";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router: IRouter = Router();

async function getSetting(key: string, def: string): Promise<string> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return rows[0]?.value ?? def;
}

router.get("/wallet", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const totalDepositsRow = await db
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
    const totalDeposits = totalDepositsRow[0]?.s ?? "0";
    const total = Number(user.totalSpent);
    const { current, next, nextAt } = vipFromTotalSpent(total);
    res.json({
      balance: user.balance,
      cashbackBalance: user.cashbackBalance,
      totalDeposits,
      totalSpent: user.totalSpent,
      vipLevel: current,
      nextVipLevel: next ?? null,
      nextVipAt: nextAt != null ? nextAt.toFixed(2) : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/wallet/transactions", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const list = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, user.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(100);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/wallet/deposit", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { amount, method, receiptPath } = req.body as {
      amount?: string;
      method?: string;
      receiptPath?: string;
    };

    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      res.status(400).json({ error: "أدخل مبلغاً صحيحاً" });
      return;
    }
    if (!method) {
      res.status(400).json({ error: "اختر طريقة الدفع" });
      return;
    }
    const isValidReceipt =
      receiptPath &&
      (
        receiptPath.startsWith("/api/uploads/receipts/") ||
        receiptPath.startsWith("/objects/")
      );
    if (!isValidReceipt) {
      res.status(400).json({ error: "يلزم رفع صورة الإيصال أولاً" });
      return;
    }

    const [dreq] = await db.insert(depositRequestsTable).values({
      userId: user.id,
      method,
      amount: a.toFixed(2),
      receiptUrl: receiptPath,
    }).returning();
    await notify(user.id, "deposit", "طلب شحن قيد المراجعة", `طلب شحن بقيمة ${a.toFixed(2)} ج.س قيد المراجعة`, "/wallet");
    req.log.info({ userId: user.id, username: user.username, amount: a, depositId: dreq.id }, "🔔 إرسال إشعار push للأدمن — deposit");
    sendPushToAdmin({
      title: "طلب شحن جديد",
      body: `${user.username} — ${a.toFixed(2)} ج.س عبر ${method}`,
      url: "/admin?tab=deposit-requests",
      tag: `deposit-${dreq.id}`,
    }).catch((err) => {
      req.log.warn({ err: err?.message }, "❌ فشل إشعار الأدمن عند طلب الشحن");
    });
    await audit(user.username, "request_deposit", "deposit_requests", dreq.id, { amount: a, method });
    emitToAll("admin:badge_update", { tab: "deposit-requests" });
    res.json({ id: dreq.id, status: "pending" });
  } catch (err: any) {
    req.log.error({ err, msg: err?.message }, "deposit error");
    res.status(500).json({ error: err?.message || "تعذّر إرسال الطلب" });
  }
});

router.post("/wallet/withdraw", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { amount, method, destination } = req.body as {
      amount?: string;
      method?: string;
      destination?: string;
    };
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      res.status(400).json({ error: "أدخل مبلغاً صحيحاً" });
      return;
    }
    if (!method || !destination?.trim()) {
      res.status(400).json({ error: "اختر طريقة السحب وجهة الاستلام" });
      return;
    }
    const minStr = await getSetting("minWithdraw", "5");
    const min = Number(minStr) || 0;
    if (a < min) {
      res.status(400).json({ error: `الحد الأدنى للسحب ${min.toFixed(2)}` });
      return;
    }
    try {
      await safeDebit(user.id, "balance", a);
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        res.status(400).json({ error: "الرصيد غير كافٍ" });
        return;
      }
      throw err;
    }
    const id = await recordTransaction(user.id, "withdraw", -a, "pending", method, destination, {
      destination,
    });
    const rows = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    await notify(user.id, "withdraw", "طلب سحب قيد المراجعة", `طلب سحب بقيمة ${a.toFixed(2)} قيد المراجعة`, "/wallet");
    req.log.info({ userId: user.id, username: user.username, amount: a, txId: id }, "🔔 إرسال إشعار push للأدمن — withdraw");
    sendPushToAdmin({
      title: "طلب سحب جديد",
      body: `${user.username} — ${a.toFixed(2)} ج.س عبر ${method}`,
      url: "/admin?tab=referral-withdrawals",
      tag: `withdraw-${id}`,
    }).catch((err) => {
      req.log.warn({ err: err?.message }, "❌ فشل إشعار الأدمن عند طلب السحب");
    });
    await audit(user.username, "request_withdraw", "transactions", id, { amount: a, method });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/wallet/transfer", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { toUsername, amount, note } = req.body as {
      toUsername?: string;
      amount?: string;
      note?: string;
    };
    const target = (toUsername ?? "").trim();
    const a = Number(amount);
    if (!target) {
      res.status(400).json({ error: "اسم المستلم مطلوب" });
      return;
    }
    if (target === user.username) {
      res.status(400).json({ error: "لا يمكن التحويل لنفس الحساب" });
      return;
    }
    if (!Number.isFinite(a) || a <= 0) {
      res.status(400).json({ error: "أدخل مبلغاً صحيحاً" });
      return;
    }
    const targetRows = await db.select().from(usersTable).where(eq(usersTable.username, target)).limit(1);
    const recipient = targetRows[0];
    if (!recipient) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    try {
      await safeDebit(user.id, "balance", a);
    } catch {
      res.status(400).json({ error: "الرصيد غير كافٍ" });
      return;
    }
    await adjustBalance(recipient.id, "balance", a);
    const id = await recordTransaction(user.id, "transfer_out", -a, "completed", null, `to ${recipient.username}`);
    await recordTransaction(recipient.id, "transfer_in", a, "completed", null, `from ${user.username}`);
    await db.insert(transfersTable).values({
      fromUserId: user.id,
      toUserId: recipient.id,
      amount: a.toFixed(2),
      fee: "0",
      note: note?.trim() || null,
    });
    await notify(recipient.id, "transfer", "حوالة جديدة", `استلمت ${a.toFixed(2)} من ${user.username}`, "/wallet");
    const rows = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    await audit(user.username, "transfer", "transactions", id, { to: recipient.username, amount: a });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
