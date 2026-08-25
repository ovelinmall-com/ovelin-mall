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
import { db, usersTable, sessionsTable, loginEventsTable } from "@workspace/db";
import { eq, desc, and, gt } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import { hashPassword } from "../lib/auth";

const router: IRouter = Router();

// ── GET /api/preferences ──────────────────────────────────────────────────────
router.get("/preferences", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    res.json({
      hasPin: !!user.withdrawPinHash,
      dailySpendLimit: user.dailySpendLimit && Number(user.dailySpendLimit) > 0
        ? user.dailySpendLimit
        : null,
      monthlySpendLimit: user.monthlySpendLimit && Number(user.monthlySpendLimit) > 0
        ? user.monthlySpendLimit
        : null,
      notifyOrders: user.notifyPush ?? true,
      notifyPromos: user.notifyWhatsapp ?? false,
      notifyDeposits: user.notifyEmail ?? true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── POST /api/preferences ─────────────────────────────────────────────────────
router.post("/preferences", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const body = req.body as {
      notifyOrders?: boolean;
      notifyPromos?: boolean;
      notifyDeposits?: boolean;
    };
    const set: any = {};
    if (typeof body.notifyOrders === "boolean") set.notifyPush = body.notifyOrders;
    if (typeof body.notifyPromos === "boolean") set.notifyWhatsapp = body.notifyPromos;
    if (typeof body.notifyDeposits === "boolean") set.notifyEmail = body.notifyDeposits;
    if (Object.keys(set).length > 0) {
      await db.update(usersTable).set(set).where(eq(usersTable.id, user.id));
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── POST /api/security/pin ────────────────────────────────────────────────────
router.post("/security/pin", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { pin } = req.body as { pin?: string };
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      res.status(400).json({ error: "الـ PIN يجب أن يكون 4-6 أرقام" });
      return;
    }
    const pinHash = hashPassword(pin);
    await db.update(usersTable).set({ withdrawPinHash: pinHash }).where(eq(usersTable.id, user.id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── DELETE /api/security/pin ──────────────────────────────────────────────────
router.delete("/security/pin", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    await db.update(usersTable).set({ withdrawPinHash: null }).where(eq(usersTable.id, user.id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── POST /api/security/limits ─────────────────────────────────────────────────
router.post("/security/limits", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { daily, monthly } = req.body as { daily?: string; monthly?: string };
    const set: any = {};
    if (daily !== undefined) {
      set.dailySpendLimit = daily && Number(daily) > 0 ? String(Number(daily).toFixed(2)) : "0";
    }
    if (monthly !== undefined) {
      set.monthlySpendLimit = monthly && Number(monthly) > 0 ? String(Number(monthly).toFixed(2)) : "0";
    }
    if (Object.keys(set).length > 0) {
      await db.update(usersTable).set(set).where(eq(usersTable.id, user.id));
    }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── GET /api/sessions ─────────────────────────────────────────────────────────
router.get("/sessions", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const now = new Date();
    const rows = await db
      .select()
      .from(sessionsTable)
      .where(and(eq(sessionsTable.userId, user.id), gt(sessionsTable.expiresAt, now)))
      .orderBy(desc(sessionsTable.lastSeenAt))
      .limit(20);

    const currentIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? null;
    const currentUa = req.headers["user-agent"] ?? null;

    // If no sessions in DB, return the current request as a virtual session
    if (rows.length === 0) {
      return res.json([
        {
          id: "current",
          userAgent: currentUa,
          ip: currentIp,
          lastSeenAt: now.toISOString(),
          createdAt: now.toISOString(),
          current: true,
        },
      ]);
    }

    const result = rows.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      current: s.ip === currentIp && s.userAgent === currentUa,
    }));

    // Ensure at least one is flagged as current
    const hasCurrent = result.some((s) => s.current);
    if (!hasCurrent && result.length > 0) result[0]!.current = true;

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── DELETE /api/sessions/:id ──────────────────────────────────────────────────
router.delete("/sessions/:id", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = String(req.params["id"] ?? "");
    if (id === "current") {
      res.status(400).json({ error: "لا يمكن إنهاء الجلسة الحالية من هنا" });
      return;
    }
    await db
      .delete(sessionsTable)
      .where(and(eq(sessionsTable.id, id), eq(sessionsTable.userId, Number(user.id))));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ── GET /api/login-history ────────────────────────────────────────────────────
router.get("/login-history", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db
      .select()
      .from(loginEventsTable)
      .where(eq(loginEventsTable.userId, user.id))
      .orderBy(desc(loginEventsTable.createdAt))
      .limit(20);

    const result = rows.map((e) => ({
      id: e.id,
      event: e.success ? "login" : "login",
      ip: e.ip,
      userAgent: e.userAgent,
      ok: e.success,
      createdAt: e.createdAt.toISOString(),
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
