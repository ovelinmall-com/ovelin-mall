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
import { db, transfersTable, usersTable, transactionsTable } from "@workspace/db";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import {
  adjustBalance,
  safeDebit,
  recordTransaction,
} from "../lib/services/wallet";
import { audit } from "../lib/services/auditLog";
import { notify } from "../lib/services/notifications";

const router: IRouter = Router();

router.get("/transfers", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const fromUser = { id: usersTable.id, username: usersTable.username };
    const rows = await db
      .select({
        id: transfersTable.id,
        fromUserId: transfersTable.fromUserId,
        toUserId: transfersTable.toUserId,
        amount: transfersTable.amount,
        fee: transfersTable.fee,
        note: transfersTable.note,
        createdAt: transfersTable.createdAt,
      })
      .from(transfersTable)
      .where(
        or(
          eq(transfersTable.fromUserId, user.id),
          eq(transfersTable.toUserId, user.id),
        ),
      )
      .orderBy(desc(transfersTable.createdAt))
      .limit(100);

    const ids = Array.from(
      new Set(rows.flatMap((r) => [r.fromUserId, r.toUserId])),
    );
    const usersMap: Record<number, string> = {};
    if (ids.length) {
      const us = await db
        .select({ id: usersTable.id, username: usersTable.username })
        .from(usersTable)
        .where(sql`${usersTable.id} = ANY(${ids})`);
      for (const u of us) usersMap[u.id] = u.username;
    }

    res.json(
      rows.map((r) => ({
        id: r.id,
        fromUserId: r.fromUserId,
        toUserId: r.toUserId,
        amount: r.amount,
        fee: r.fee,
        message: r.note,
        createdAt: r.createdAt,
        fromUsername: usersMap[r.fromUserId] ?? `#${r.fromUserId}`,
        toUsername: usersMap[r.toUserId] ?? `#${r.toUserId}`,
      })),
    );
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/transfers", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { toUsername, amount, message } = req.body as {
      toUsername?: string;
      amount?: string | number;
      message?: string;
    };
    const target = String(toUsername ?? "").trim();
    const a = Number(amount);
    if (!target) {
      res.status(400).json({ error: "اسم المستخدم مطلوب" });
      return;
    }
    if (target === user.username) {
      res.status(400).json({ error: "لا يمكن التحويل لنفس الحساب" });
      return;
    }
    if (!Number.isFinite(a) || a < 0.5) {
      res.status(400).json({ error: "الحد الأدنى للتحويل $0.5" });
      return;
    }
    const recipientRows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, target))
      .limit(1);
    const recipient = recipientRows[0];
    if (!recipient) {
      res.status(404).json({ error: "المستخدم المستلم غير موجود" });
      return;
    }
    try {
      await safeDebit(user.id, "balance", a);
    } catch {
      res.status(400).json({ error: "الرصيد غير كافٍ" });
      return;
    }
    await adjustBalance(recipient.id, "balance", a);
    const noteText = (message ?? "").toString().trim().slice(0, 200) || null;
    await recordTransaction(
      user.id,
      "transfer_out",
      -a,
      "completed",
      null,
      noteText ? `to ${recipient.username} • ${noteText}` : `to ${recipient.username}`,
    );
    await recordTransaction(
      recipient.id,
      "transfer_in",
      a,
      "completed",
      null,
      noteText ? `from ${user.username} • ${noteText}` : `from ${user.username}`,
    );
    const inserted = await db
      .insert(transfersTable)
      .values({
        fromUserId: user.id,
        toUserId: recipient.id,
        amount: a.toFixed(2),
        fee: "0",
        note: noteText,
      })
      .returning();
    await notify(
      recipient.id,
      "transfer",
      "حوالة جديدة 💸",
      `استلمت $${a.toFixed(2)} من @${user.username}` +
        (noteText ? ` — "${noteText}"` : ""),
      "/transfers",
    );
    await audit(user.username, "transfer", "transfers", inserted[0].id, {
      to: recipient.username,
      amount: a,
    });
    res.json({ success: true, id: inserted[0].id });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
