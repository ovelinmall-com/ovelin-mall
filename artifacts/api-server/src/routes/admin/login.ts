// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSessionCookie,
  getUserFromRequest,
  requireAdmin,
  setSessionCookie,
  OWNER_EMAIL,
} from "../../lib/auth";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

async function getOwnerUser(): Promise<typeof usersTable.$inferSelect | null> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, OWNER_EMAIL))
    .limit(1);
  return rows[0] ?? null;
}

// دخول تلقائي (GET) — legacy
router.get("/admin/open", async (_req, res) => {
  try {
    const owner = await getOwnerUser();
    if (!owner) {
      res.status(404).json({ error: "حساب صاحب الموقع غير مسجّل بعد — سجّل الدخول بالحساب العادي أولاً" });
      return;
    }
    setSessionCookie(res, owner.id);
    res.json({ ok: true, username: owner.username });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل الدخول" });
  }
});

// دخول تلقائي (POST) — يُستدعى من زر لوحة الإدارة في صفحة الحساب
// يتحقق أن المستخدم الحالي هو صاحب الموقع ثم يُنشئ جلسة أدمن
router.post("/admin/auto-login", async (req, res) => {
  try {
    const currentUser = await getUserFromRequest(req);
    if (!currentUser) {
      res.status(401).json({ error: "سجّل دخول أولاً" });
      return;
    }
    if (currentUser.email !== OWNER_EMAIL) {
      res.status(403).json({ error: "هذا الدخول حصري لصاحب الموقع" });
      return;
    }
    setSessionCookie(res, currentUser.id);
    res.json({ ok: true, username: currentUser.username });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل الدخول" });
  }
});

router.post("/admin/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/admin/me", requireAdmin, (req, res) => {
  const user = (req as any).adminUser;
  res.json({ id: user.id, username: user.username, email: user.email });
});

export default router;
