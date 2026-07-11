// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { Router, type IRouter } from "express";
import { db, depositRequestsTable, usersTable, transactionsTable } from "@workspace/db";
import { desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { adjustBalance, recordTransaction } from "../../lib/services/wallet";
import { notifyAndPush } from "../../lib/services/notifications";
import { audit } from "../../lib/services/auditLog";

const router: IRouter = Router();

router.get("/admin/deposit-requests/pending-count", requireAdmin, async (_req, res) => {
  try {
    const r = await db
      .select({ c: sql<number>`coalesce(count(*), 0)::int` })
      .from(depositRequestsTable)
      .where(eq(depositRequestsTable.status, "pending"));
    res.json({ count: Number(r[0]?.c ?? 0) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/admin/deposit-requests", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: depositRequestsTable.id,
        userId: depositRequestsTable.userId,
        username: usersTable.username,
        email: usersTable.email,
        phone: usersTable.phone,
        method: depositRequestsTable.method,
        amount: depositRequestsTable.amount,
        receiptUrl: depositRequestsTable.receiptUrl,
        status: depositRequestsTable.status,
        rejectionReason: depositRequestsTable.rejectionReason,
        transactionId: depositRequestsTable.transactionId,
        createdAt: depositRequestsTable.createdAt,
      })
      .from(depositRequestsTable)
      .leftJoin(usersTable, eq(usersTable.id, depositRequestsTable.userId))
      .orderBy(desc(depositRequestsTable.createdAt))
      .limit(200);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/deposit-requests/:id/approve", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db
      .select()
      .from(depositRequestsTable)
      .leftJoin(usersTable, eq(usersTable.id, depositRequestsTable.userId))
      .where(eq(depositRequestsTable.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const dreq = row.deposit_requests;
    if (dreq.status !== "pending") {
      res.status(400).json({ error: "تمت معالجة هذا الطلب مسبقاً" });
      return;
    }

    const amount = Number(dreq.amount);
    await adjustBalance(dreq.userId, "balance", amount);
    const txId = await recordTransaction(dreq.userId, "deposit", amount, "completed", dreq.method, `طلب شحن #${id}`);

    await db
      .update(depositRequestsTable)
      .set({ status: "approved", transactionId: txId, updatedAt: new Date() })
      .where(eq(depositRequestsTable.id, id));

    const user = row.users;
    notifyAndPush(
      dreq.userId,
      "deposit",
      "تم اعتماد طلب الشحن",
      `تم إضافة ${amount.toFixed(2)} ج.س لمحفظتك عبر ${dreq.method}`,
      "/wallet",
      "deposit",
    );
    await audit("admin", "approve_deposit", "deposit_requests", id, { amount, method: dreq.method, userId: dreq.userId });

    res.json({ success: true, amount, username: user?.username });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/deposit-requests/:id/reject", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { reason } = req.body as { reason?: string };

    const rows = await db
      .select()
      .from(depositRequestsTable)
      .where(eq(depositRequestsTable.id, id))
      .limit(1);

    const dreq = rows[0];
    if (!dreq) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    if (dreq.status !== "pending") {
      res.status(400).json({ error: "تمت معالجة هذا الطلب مسبقاً" });
      return;
    }

    await db
      .update(depositRequestsTable)
      .set({ status: "rejected", rejectionReason: reason?.trim() || "رُفض الطلب", updatedAt: new Date() })
      .where(eq(depositRequestsTable.id, id));

    notifyAndPush(
      dreq.userId,
      "deposit",
      "تم رفض طلب الشحن",
      reason?.trim()
        ? `تم رفض طلب الشحن بقيمة ${Number(dreq.amount).toFixed(2)} ج.س — السبب: ${reason.trim()}`
        : `تم رفض طلب الشحن بقيمة ${Number(dreq.amount).toFixed(2)} ج.س`,
      "/wallet",
      "deposit",
    );
    await audit("admin", "reject_deposit", "deposit_requests", id, { reason, userId: dreq.userId });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
