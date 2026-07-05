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
import { db, giftCardsTable, usersTable } from "@workspace/db";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import {
  adjustBalance,
  safeDebit,
  recordTransaction,
} from "../lib/services/wallet";
import { audit } from "../lib/services/auditLog";
import { notify } from "../lib/services/notifications";

const router: IRouter = Router();

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let part = (): string =>
    Array.from({ length: 4 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join("");
  return `OVELIN-${part()}-${part()}`;
}

function statusOf(g: { redeemedAt: Date | null; expiresAt: Date | null }) {
  if (g.redeemedAt) return "redeemed";
  if (g.expiresAt && new Date(g.expiresAt) < new Date()) return "expired";
  return "active";
}

router.get("/giftcards/my", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db
      .select()
      .from(giftCardsTable)
      .where(
        or(
          eq(giftCardsTable.createdByUserId, user.id),
          eq(giftCardsTable.redeemedByUserId, user.id),
        ),
      )
      .orderBy(desc(giftCardsTable.createdAt))
      .limit(100);
    res.json(
      rows.map((g) => ({
        id: g.id,
        code: g.code,
        amount: g.amount,
        message: g.message,
        createdAt: g.createdAt,
        redeemedAt: g.redeemedAt,
        expiresAt: g.expiresAt,
        status: statusOf(g),
        owned: g.createdByUserId === user.id,
      })),
    );
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/giftcards", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { amount, message } = req.body as {
      amount?: string | number;
      message?: string;
    };
    const a = Number(amount);
    if (!Number.isFinite(a) || a < 1) {
      res.status(400).json({ error: "الحد الأدنى لبطاقة الهدية $1" });
      return;
    }
    if (a > 1000) {
      res.status(400).json({ error: "الحد الأقصى $1000" });
      return;
    }
    try {
      await safeDebit(user.id, "balance", a);
    } catch {
      res.status(400).json({ error: "الرصيد غير كافٍ" });
      return;
    }
    await recordTransaction(
      user.id,
      "gift_out",
      -a,
      "completed",
      null,
      "إنشاء بطاقة هدية",
    );
    let code = genCode();
    // ensure uniqueness
    for (let i = 0; i < 5; i++) {
      const exists = await db
        .select({ id: giftCardsTable.id })
        .from(giftCardsTable)
        .where(eq(giftCardsTable.code, code))
        .limit(1);
      if (!exists.length) break;
      code = genCode();
    }
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const inserted = await db
      .insert(giftCardsTable)
      .values({
        code,
        amount: a.toFixed(2),
        createdByUserId: user.id,
        message: (message ?? "").toString().trim().slice(0, 200) || null,
        expiresAt: expires,
      })
      .returning();
    await audit(user.username, "giftcard.create", "gift_cards", inserted[0].id, {
      amount: a,
    });
    res.json({ success: true, code, id: inserted[0].id });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/giftcards/redeem", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const code = String((req.body as any)?.code ?? "").trim().toUpperCase();
    if (!code) {
      res.status(400).json({ error: "أدخل الكود" });
      return;
    }
    const rows = await db
      .select()
      .from(giftCardsTable)
      .where(eq(giftCardsTable.code, code))
      .limit(1);
    const card = rows[0];
    if (!card) {
      res.status(404).json({ error: "كود غير صحيح" });
      return;
    }
    if (card.redeemedAt) {
      res.status(400).json({ error: "البطاقة مُستلمة سابقاً" });
      return;
    }
    if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
      res.status(400).json({ error: "البطاقة منتهية الصلاحية" });
      return;
    }
    if (card.createdByUserId === user.id) {
      res.status(400).json({ error: "لا يمكنك استلام بطاقتك الخاصة" });
      return;
    }
    const a = Number(card.amount);
    await adjustBalance(user.id, "balance", a);
    await recordTransaction(
      user.id,
      "gift_in",
      a,
      "completed",
      card.code,
      "استلام بطاقة هدية",
    );
    await db
      .update(giftCardsTable)
      .set({ redeemedByUserId: user.id, redeemedAt: new Date() })
      .where(eq(giftCardsTable.id, card.id));
    if (card.createdByUserId) {
      await notify(
        card.createdByUserId,
        "gift",
        "🎁 تم استلام بطاقتك",
        `قام @${user.username} باستلام بطاقتك بقيمة $${a.toFixed(2)}`,
        "/transfers",
      );
    }
    await audit(user.username, "giftcard.redeem", "gift_cards", card.id, {
      amount: a,
    });
    res.json({ success: true, amount: a.toFixed(2) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
