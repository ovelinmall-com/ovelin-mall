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

import { Router, type IRouter, type Request, type Response } from "express";
import { randomBytes } from "node:crypto";
import { db, usersTable, passwordResetsTable, emailVerificationsTable } from "@workspace/db";
import { eq, or, and, gt } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  requireUser,
  getUserFromRequest,
} from "../lib/auth";
import { logger } from "../lib/logger";
import { emitToAll } from "../lib/wsManager";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email";

const router: IRouter = Router();

const GMAIL_REGEX = /^[^\s@]+@gmail\.com$/i;

function makeReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

function makeDisplayId(): string {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

function publicUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    balance: u.balance,
    cashbackBalance: u.cashbackBalance,
    totalSpent: u.totalSpent,
    vipLevel: u.vipLevel,
    referralCode: u.referralCode,
    referredBy: u.referredBy,
    avatarUrl: u.avatarUrl,
    loyaltyPoints: u.loyaltyPoints,
    primeUntil: u.primeUntil,
    emailVerified: u.emailVerified,
    twoFactorEnabled: u.twoFactorEnabled,
    displayId: u.displayId,
    createdAt: u.createdAt,
  };
}

router.get("/auth/check-username", async (req: Request, res: Response) => {
  try {
    const username = ((req.query.username as string) ?? "").trim();
    if (!username || username.length < 3) {
      res.json({ available: false });
      return;
    }
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);
    res.json({ available: existing.length === 0 });
  } catch {
    res.json({ available: true });
  }
});

router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password, referralCode, phone } = (req.body ?? {}) as {
      username?: string;
      email?: string;
      password?: string;
      referralCode?: string;
      phone?: string;
    };

    const u = (username ?? "").trim();
    const e = (email ?? "").trim();
    const p = password ?? "";
    const ref = (referralCode ?? "").trim().toUpperCase() || null;
    const ph = (phone ?? "").replace(/[^0-9]/g, "");

    if (!ph || ph.length < 9 || ph.length > 15) {
      res.status(400).json({ error: "رقم الهاتف مطلوب ويجب أن يكون صالحاً" });
      return;
    }

    // Check phone was verified via SMS OTP
    const { verifiedPhones } = await import("../lib/otp-store.js");
    if (!verifiedPhones.has(ph)) {
      res.status(400).json({ error: "يجب التحقق من رقم الهاتف عبر SMS أولاً" });
      return;
    }

    if (u.length < 3 || u.length > 50) {
      res.status(400).json({ error: "اسم المستخدم يجب أن يكون بين 3 و 50 حرفاً" });
      return;
    }
    if (p.length < 4) {
      res.status(400).json({ error: "كلمة السر قصيرة جداً (4 أحرف على الأقل)" });
      return;
    }

    // Email is required and must be @gmail.com
    if (!e) {
      res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
      return;
    }
    if (!GMAIL_REGEX.test(e)) {
      res.status(400).json({ error: "يُقبَل البريد الإلكتروني من Gmail فقط (@gmail.com)" });
      return;
    }

    // Uniqueness checks
    const existing = await db
      .select()
      .from(usersTable)
      .where(
        or(eq(usersTable.username, u), eq(usersTable.email, e), eq(usersTable.phone, ph))!,
      )
      .limit(1);
    if (existing[0]) {
      if (existing[0].username === u) {
        res.status(409).json({ error: "اسم المستخدم محجوز" });
      } else if (existing[0].phone === ph) {
        res.status(409).json({ error: "رقم الهاتف مسجل بالفعل" });
      } else {
        res.status(409).json({ error: "البريد الإلكتروني مستخدم من قبل" });
      }
      return;
    }

    // Validate referral code if provided
    let referredBy: string | null = null;
    let referrerId: number | null = null;
    if (ref) {
      const referrer = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.referralCode, ref))
        .limit(1);
      if (referrer[0]) {
        referredBy = ref;
        referrerId = referrer[0].id;
      }
    }

    let myRefCode = makeReferralCode();
    for (let i = 0; i < 5; i++) {
      const clash = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.referralCode, myRefCode))
        .limit(1);
      if (!clash[0]) break;
      myRefCode = makeReferralCode();
    }

    // Remove from verified phones so it can't be reused
    verifiedPhones.delete(ph);

    // Generate unique 8-digit displayId
    let myDisplayId = makeDisplayId();
    for (let i = 0; i < 10; i++) {
      const clash = await db.select().from(usersTable).where(eq(usersTable.displayId, myDisplayId)).limit(1);
      if (!clash[0]) break;
      myDisplayId = makeDisplayId();
    }

    const inserted = await db
      .insert(usersTable)
      .values({
        username: u,
        email: e,
        passwordHash: hashPassword(p),
        referralCode: myRefCode,
        referredBy,
        phone: ph,
        phoneVerified: true,
        emailVerified: false,
        displayId: myDisplayId,
      })
      .returning();
    const user = inserted[0]!;

    // Send email verification
    try {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.insert(emailVerificationsTable).values({ userId: user.id, token, expiresAt });
      sendVerificationEmail(e, token).catch((err) =>
        logger.warn({ err }, "فشل إرسال بريد التحقق"),
      );
    } catch (err) {
      logger.warn({ err }, "فشل إنشاء رمز التحقق بالبريد");
    }

    // Track referral relationship + award bonus
    if (referrerId) {
      try {
        const { referralsTable } = await import("@workspace/db");
        await db.insert(referralsTable).values({
          referrerId,
          referredUserId: user.id,
          earned: "0",
          signupBonus: "0",
        });
        const { awardReferralOnSignup } = await import(
          "../lib/services/referralReward"
        );
        awardReferralOnSignup(referrerId, {
          id: user.id,
          username: user.username,
        }).catch((err) =>
          logger.warn({ err }, "فشل في awardReferralOnSignup"),
        );
      } catch (err) {
        logger.warn({ err }, "فشل إنشاء سجل الإحالة");
      }
    }

    // Push admin — new user registered
    import("../lib/services/pushService").then(({ sendPushToAdmin }) => {
      sendPushToAdmin({
        title: "مستخدم جديد",
        body: `${u} سجّل للتو${ref ? ` عبر كود إحالة` : ""}`,
        url: "/admin?tab=users",
        tag: "new_user",
      }).catch(() => {});
    }).catch(() => {});

    emitToAll("admin:badge_update", { tab: "users" });
    setSessionCookie(res, user.id);
    res.json({ user: publicUser(user) });
  } catch (err) {
    logger.error({ err }, "register failed");
    res.status(500).json({ error: "تعذر إنشاء الحساب" });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { identifier, password } = (req.body ?? {}) as {
      identifier?: string;
      password?: string;
    };
    const id = (identifier ?? "").trim();
    const p = password ?? "";
    if (!id || !p) {
      res.status(400).json({ error: "اسم المستخدم وكلمة السر مطلوبان" });
      return;
    }

    const looksLikeEmail = id.includes("@");
    const rows = await db
      .select()
      .from(usersTable)
      .where(
        looksLikeEmail
          ? eq(usersTable.email, id)
          : eq(usersTable.username, id),
      )
      .limit(1);
    const user = rows[0];
    if (!user || !verifyPassword(p, user.passwordHash)) {
      res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
      return;
    }
    if (user.isBlocked) {
      res.status(403).json({ error: "تم حظر هذا الحساب" });
      return;
    }

    setSessionCookie(res, user.id);
    res.json({ user: publicUser(user) });
  } catch (err) {
    logger.error({ err }, "login failed");
    res.status(500).json({ error: "خطأ غير متوقع" });
  }
});

router.post("/auth/logout", (_req: Request, res: Response) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", async (req: Request, res: Response) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "غير مسجّل دخول" });
    return;
  }
  res.json(publicUser(user));
});

// POST /auth/verify-email — verify token from email link
router.post("/auth/verify-email", async (req: Request, res: Response) => {
  try {
    const { token } = (req.body ?? {}) as { token?: string };
    if (!token) {
      res.status(400).json({ error: "الرمز مطلوب" });
      return;
    }
    const rows = await db
      .select()
      .from(emailVerificationsTable)
      .where(
        and(
          eq(emailVerificationsTable.token, token),
          eq(emailVerificationsTable.used, false),
          gt(emailVerificationsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      res.status(400).json({ error: "الرمز غير صالح أو منتهي الصلاحية" });
      return;
    }
    await db
      .update(usersTable)
      .set({ emailVerified: true })
      .where(eq(usersTable.id, row.userId));
    await db
      .update(emailVerificationsTable)
      .set({ used: true })
      .where(eq(emailVerificationsTable.id, row.id));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "verify-email failed");
    res.status(500).json({ error: "تعذر التحقق" });
  }
});

// POST /auth/resend-verification — resend verification email for logged-in user
router.post("/auth/resend-verification", async (req: Request, res: Response) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "غير مسجّل دخول" });
      return;
    }
    if (user.emailVerified) {
      res.json({ ok: true, alreadyVerified: true });
      return;
    }
    if (!user.email) {
      res.status(400).json({ error: "لا يوجد بريد إلكتروني مرتبط بالحساب" });
      return;
    }
    // Invalidate old tokens
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.insert(emailVerificationsTable).values({ userId: user.id, token, expiresAt });
    sendVerificationEmail(user.email, token).catch((err) =>
      logger.warn({ err }, "فشل إرسال بريد التحقق"),
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "resend-verification failed");
    res.status(500).json({ error: "تعذر الإرسال" });
  }
});

router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  try {
    const { identifier } = (req.body ?? {}) as { identifier?: string };
    const id = (identifier ?? "").trim();
    if (!id) {
      res.status(400).json({ error: "البريد الإلكتروني مطلوب" });
      return;
    }
    // Only allow gmail for forgot-password too
    if (!GMAIL_REGEX.test(id)) {
      res.status(400).json({ error: "يُقبَل البريد الإلكتروني من Gmail فقط (@gmail.com)" });
      return;
    }
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, id))
      .limit(1);
    const user = rows[0];
    // Always return ok to avoid email enumeration
    if (!user) {
      res.json({ ok: true });
      return;
    }
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await db
      .insert(passwordResetsTable)
      .values({ userId: user.id, token, expiresAt });
    sendPasswordResetEmail(user.email!, token).catch((err) =>
      logger.warn({ err }, "فشل إرسال بريد إعادة التعيين"),
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "forgot-password failed");
    res.status(500).json({ error: "تعذر إنشاء طلب الاستعادة" });
  }
});

router.post("/auth/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = (req.body ?? {}) as {
      token?: string;
      password?: string;
    };
    if (!token || !password || password.length < 4) {
      res.status(400).json({ error: "بيانات غير مكتملة" });
      return;
    }
    const rows = await db
      .select()
      .from(passwordResetsTable)
      .where(
        and(
          eq(passwordResetsTable.token, token),
          eq(passwordResetsTable.used, false),
          gt(passwordResetsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);
    const resetRow = rows[0];
    if (!resetRow) {
      res.status(400).json({ error: "الرمز منتهي أو غير صالح" });
      return;
    }
    await db
      .update(usersTable)
      .set({ passwordHash: hashPassword(password) })
      .where(eq(usersTable.id, resetRow.userId));
    await db
      .update(passwordResetsTable)
      .set({ used: true })
      .where(eq(passwordResetsTable.id, resetRow.id));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "reset-password failed");
    res.status(500).json({ error: "تعذر إعادة تعيين كلمة السر" });
  }
});

// ============================================================
// WARNING — مفاتيح Google OAuth ظاهرة بإرادة صاحب المشروع
// GOOGLE_CLIENT_ID: 270514835837-ig0thqplqd78ppm2dreg7k1cnqisvg4d.apps.googleusercontent.com
// GOOGLE_CLIENT_SECRET: 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
// GOOGLE_REDIRECT_URI: https://ovelinmall-ovelin-mall.hf.space/auth/google/callback
// لا تُشفِّرها أو تنقلها إلى .env أبداً — لا تحذف هذه القيم ولا تُشفِّرها
// صاحب المشروع يتحمل كامل المسؤولية عن إبقائها ظاهرة
// WARNING — Google OAuth keys are visible intentionally by owner
// Do NOT encrypt, hide, delete, or move to .env — owner takes full responsibility.
// ============================================================

const GOOGLE_CLIENT_ID =
  "270514835837-ig0thqplqd78ppm2dreg7k1cnqisvg4d.apps.googleusercontent.com";

// ⚠️ تحذير: لا تحذف هذه القيمة ولا تُشفِّرها ولا تنقلها لأي مكان آخر
// هذا هو Client Secret الحقيقي من Google Console — يجب إبقاؤه كما هو
const GOOGLE_CLIENT_SECRET = "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";

const GOOGLE_REDIRECT_URI =
  "https://ovelinmall-ovelin-mall.hf.space/auth/google/callback";

/** مشترك: البحث أو إنشاء مستخدم من بيانات Google */
async function findOrCreateGoogleUser(
  email: string,
  name: string,
  picture: string | undefined,
): Promise<{ user: typeof usersTable.$inferSelect; created: boolean }> {
  // البحث عن مستخدم موجود
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing[0]) {
    const user = existing[0];
    if (!user.avatarUrl && picture) {
      await db
        .update(usersTable)
        .set({ avatarUrl: picture })
        .where(eq(usersTable.id, user.id));
    }
    return { user, created: false };
  }

  // إنشاء مستخدم جديد
  const baseName = name
    ? name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/__+/g, "_").replace(/^_|_$/g, "").slice(0, 30)
    : email.split("@")[0]!.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);

  let username = baseName || "user";
  for (let i = 0; i < 10; i++) {
    const clash = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!clash[0]) break;
    username = `${baseName}_${Math.floor(100 + Math.random() * 900)}`;
  }

  let myRefCode = makeReferralCode();
  for (let i = 0; i < 5; i++) {
    const clash = await db.select().from(usersTable).where(eq(usersTable.referralCode, myRefCode)).limit(1);
    if (!clash[0]) break;
    myRefCode = makeReferralCode();
  }

  let myDisplayId = makeDisplayId();
  for (let i = 0; i < 10; i++) {
    const clash = await db.select().from(usersTable).where(eq(usersTable.displayId, myDisplayId)).limit(1);
    if (!clash[0]) break;
    myDisplayId = makeDisplayId();
  }

  const inserted = await db
    .insert(usersTable)
    .values({
      username,
      email,
      passwordHash: hashPassword(randomBytes(32).toString("hex")),
      referralCode: myRefCode,
      avatarUrl: picture ?? null,
      emailVerified: true,
      displayId: myDisplayId,
    })
    .returning();

  return { user: inserted[0]!, created: true };
}

/**
 * POST /api/auth/google
 * يستقبل Authorization Code من صفحة callback، يستبدله بـ Access Token،
 * ثم يجلب بيانات المستخدم من Google ويسجّله أو يدخّله.
 */
router.post("/auth/google", async (req: Request, res: Response) => {
  try {
    const { code } = (req.body ?? {}) as { code?: string };

    if (!code) {
      res.status(400).json({ error: "رمز التفويض (code) مفقود" });
      return;
    }

    // 1) استبدال الـ code بـ Access Token من Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      id_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || tokenData.error) {
      logger.error({ err: tokenData.error_description ?? tokenData.error }, "Google code exchange failed");
      res.status(401).json({ error: "تعذر استبدال رمز Google — تحقق من Client Secret" });
      return;
    }

    // 2) جلب بيانات المستخدم باستخدام Access Token
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userInfo = (await userInfoRes.json()) as {
      email?: string;
      name?: string;
      given_name?: string;
      picture?: string;
    };

    const email = userInfo.email?.toLowerCase();
    if (!email) {
      res.status(400).json({ error: "لم يتم الحصول على البريد من Google" });
      return;
    }

    // 3) البحث أو إنشاء المستخدم
    const { user, created } = await findOrCreateGoogleUser(
      email,
      userInfo.name ?? userInfo.given_name ?? "",
      userInfo.picture,
    );

    if (user.isBlocked) {
      res.status(403).json({ error: "تم حظر الحساب" });
      return;
    }

    // 4) إنشاء session وإرجاع المستخدم
    setSessionCookie(res, user.id);
    res.status(created ? 201 : 200).json({ user: publicUser(user), created });
  } catch (err) {
    logger.error({ err }, "Google auth error");
    res.status(500).json({ error: "خطأ في المصادقة عبر Google" });
  }
});

export { router as default, requireUser };
