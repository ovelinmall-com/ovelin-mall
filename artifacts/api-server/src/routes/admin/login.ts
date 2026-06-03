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
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSessionCookie,
  hashPassword,
  requireAdmin,
  setSessionCookie,
  verifyPassword,
  verifySessionToken,
} from "../../lib/auth";

const router: IRouter = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123";

async function ensureAdminUser(): Promise<typeof usersTable.$inferSelect> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, "admin"))
    .limit(1);
  if (rows[0]) {
    await db
      .update(usersTable)
      .set({
        passwordHash: hashPassword(ADMIN_PASSWORD),
        ...(ADMIN_EMAIL ? { email: ADMIN_EMAIL } : {}),
      })
      .where(eq(usersTable.id, rows[0].id));
    const updated = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, rows[0].id))
      .limit(1);
    return updated[0]!;
  }
  const inserted = await db
    .insert(usersTable)
    .values({
      username: "admin",
      email: ADMIN_EMAIL || null,
      passwordHash: hashPassword(ADMIN_PASSWORD),
      referralCode: "ADMIN001",
    })
    .returning();
  return inserted[0]!;
}

router.post("/admin/login", async (req, res) => {
  try {
    const { email, password, username } = req.body as {
      email?: string;
      password?: string;
      username?: string;
    };

    if (!password) {
      res.status(400).json({ error: "كلمة السر مطلوبة" });
      return;
    }

    // Support legacy password-only login (direct admin password check)
    if (!email && !username) {
      if (password !== ADMIN_PASSWORD) {
        res.status(401).json({ error: "كلمة المرور غير صحيحة" });
        return;
      }
      const adminUser = await ensureAdminUser();
      setSessionCookie(res, adminUser.id);
      res.json({ ok: true, username: adminUser.username });
      return;
    }

    // Email-based login: find user by email
    if (email) {
      const rows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      const user = rows[0];

      // Verify user exists and has admin privileges
      if (!user || user.username !== "admin") {
        res.status(403).json({ error: "هذا الحساب ليس له صلاحية الوصول للوحة الإدارة" });
        return;
      }

      // Verify password against stored hash
      const valid =
        user.passwordHash && verifyPassword(password, user.passwordHash);

      // Also allow the raw ADMIN_PASSWORD as fallback
      if (!valid && password !== ADMIN_PASSWORD) {
        res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
        return;
      }

      setSessionCookie(res, user.id);
      res.json({ ok: true, username: user.username });
      return;
    }

    res.status(400).json({ error: "بيانات الدخول غير كاملة" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل الدخول" });
  }
});

router.post("/admin/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// دخول تلقائي للأدمن — يعمل فقط إذا كان المستخدم الحالي هو صاحب الموقع
const OWNER_EMAIL = "skandarabdoalatif@gmail.com";

router.post("/admin/auto-login", async (req, res) => {
  try {
    // استرجع الجلسة الحالية للمستخدم العادي
    const token = req.cookies?.["ovelin_admin"] as string | undefined;
    const userId = token ? verifySessionToken(token) : null;

    if (!userId) {
      res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
      return;
    }

    // تحقق من أن المستخدم الحالي هو صاحب الموقع
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    const currentUser = rows[0];

    if (!currentUser || currentUser.email !== OWNER_EMAIL) {
      res.status(403).json({ error: "غير مسموح" });
      return;
    }

    // ابحث عن مستخدم الأدمن وسجّل الدخول باسمه
    const adminRows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, "admin"))
      .limit(1);

    const adminUser = adminRows[0] ?? (await ensureAdminUser());
    setSessionCookie(res, adminUser.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل الدخول التلقائي" });
  }
});

router.get("/admin/me", requireAdmin, (req, res) => {
  const user = (req as any).adminUser;
  res.json({ id: user.id, username: user.username });
});

export default router;
