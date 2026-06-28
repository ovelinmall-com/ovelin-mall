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
import { db, transactionsTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { adjustBalance } from "../../lib/services/wallet";
import { notify } from "../../lib/services/notifications";
import { audit } from "../../lib/services/auditLog";

const router: IRouter = Router();

router.get("/admin/transactions", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: transactionsTable.id,
        userId: transactionsTable.userId,
        username: usersTable.username,
        type: transactionsTable.type,
        amount: transactionsTable.amount,
        method: transactionsTable.method,
        reference: transactionsTable.reference,
        status: transactionsTable.status,
        createdAt: transactionsTable.createdAt,
      })
      .from(transactionsTable)
      .leftJoin(usersTable, eq(usersTable.id, transactionsTable.userId))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(500);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/admin/transactions/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body as { status?: string };
    if (!status) {
      res.status(400).json({ error: "الحالة مطلوبة" });
      return;
    }
    const old = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id)).limit(1);
    const tx = old[0];
    if (!tx) {
      res.status(404).json({ error: "غير موجود" });
      return;
    }
    const updated = await db
      .update(transactionsTable)
      .set({ status })
      .where(eq(transactionsTable.id, id))
      .returning();

    // Apply balance changes when transitioning to completed for deposit
    const amount = Number(tx.amount);
    if (status === "completed" && tx.status !== "completed") {
      if (tx.type === "deposit" && amount > 0) {
        await adjustBalance(tx.userId, "balance", amount);
        await notify(tx.userId, "deposit", "تم اعتماد طلب الشحن", `أُضيف ${amount.toFixed(2)} لمحفظتك`, "/wallet");
      }
      if (tx.type === "withdraw") {
        await notify(tx.userId, "withdraw", "تم تنفيذ السحب", `تم إرسال ${Math.abs(amount).toFixed(2)} لجهة السحب`, "/wallet");
      }
    }
    if ((status === "rejected" || status === "cancelled") && tx.status === "pending") {
      // Restore balance for withdraw rejections
      if (tx.type === "withdraw" && amount < 0) {
        await adjustBalance(tx.userId, "balance", Math.abs(amount));
        await notify(tx.userId, "withdraw", "تم رفض طلب السحب", `أعيد ${Math.abs(amount).toFixed(2)} لمحفظتك`, "/wallet");
      }
      if (tx.type === "deposit") {
        await notify(tx.userId, "deposit", "تم رفض طلب الشحن", "تواصل مع الدعم لمزيد من المعلومات", "/wallet");
      }
    }

    await audit("admin", "update_transaction", "transactions", id, { status });
    const u = await db.select().from(usersTable).where(eq(usersTable.id, tx.userId)).limit(1);
    const t = updated[0]!;
    res.json({
      id: t.id,
      userId: t.userId,
      username: u[0]?.username ?? "",
      type: t.type,
      amount: t.amount,
      method: t.method,
      reference: t.reference,
      status: t.status,
      createdAt: t.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
