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
import rateLimit from "express-rate-limit";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendSmsOTP, getSmsGatewayStatus } from "../services/sms-gateway.js";
import {
  otpStore,
  verifiedPhones,
  normalizePhone,
  generateOTP,
} from "../lib/otp-store.js";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ── Rate Limiters ─────────────────────────────────────────────
// حماية endpoint إرسال OTP: 5 طلبات كحد أقصى كل 10 دقائق لكل رقم هاتف
const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 دقائق
  max: 5,                    // 5 طلبات
  standardHeaders: true,
  legacyHeaders: false,
  // نعطّل تحقق IPv6 لأننا نستخدم رقم الهاتف كمفتاح وليس الـ IP
  validate: { xForwardedForHeader: false },
  message: { error: "عدد كبير من الطلبات — انتظر 10 دقائق وأعد المحاولة" },
  keyGenerator: (req) => {
    // المفتاح = رقم الهاتف (الأفضل للحماية من الـ spam)
    const phone = (req.body as { phone?: string })?.phone ?? "";
    return phone ? `snd:${normalizePhone(phone)}` : `snd:unknown`;
  },
});

// حماية endpoint التحقق من OTP: 10 محاولات كل 15 دقيقة لكل رقم هاتف
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 10,                   // 10 محاولات
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: "تجاوزت الحد المسموح — انتظر 15 دقيقة وأعد المحاولة" },
  keyGenerator: (req) => {
    const phone = (req.body as { phone?: string })?.phone ?? "";
    return phone ? `ver:${normalizePhone(phone)}` : `ver:unknown`;
  },
});
// ─────────────────────────────────────────────────────────────

// POST /api/auth/send-otp
// يولّد OTP ويرسله عبر SMS Gateway
router.post("/auth/send-otp", sendOtpLimiter, async (req: Request, res: Response) => {
  try {
    const { phone } = (req.body ?? {}) as { phone?: string };

    // التحقق من وجود رقم الهاتف
    if (!phone) {
      res.status(400).json({ error: "رقم الهاتف مطلوب" });
      return;
    }

    // تنظيف الرقم (إزالة كل شيء غير أرقام)
    const normalized = normalizePhone(phone);
    if (normalized.length < 9 || normalized.length > 15) {
      res.status(400).json({ error: "رقم هاتف غير صالح" });
      return;
    }

    // التحقق من أن الرقم غير مسجّل مسبقاً
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, normalized))
      .limit(1);
    if (existing[0]) {
      res.status(409).json({ error: "هذا الرقم مسجل بالفعل" });
      return;
    }

    // منع إعادة الإرسال قبل مرور دقيقة
    const existingOtp = otpStore.get(normalized);
    if (existingOtp && existingOtp.expiresAt - 240_000 > Date.now()) {
      res.status(429).json({ error: "انتظر دقيقة قبل إعادة الإرسال" });
      return;
    }

    // توليد OTP عشوائي مكوّن من 6 أرقام
    const code = generateOTP();

    // تخزين OTP مؤقتاً لمدة 5 دقائق
    otpStore.set(normalized, {
      code,
      expiresAt: Date.now() + 5 * 60_000, // 5 دقائق
      attempts: 0,
    });

    // إرسال OTP عبر SMS Gateway
    await sendSmsOTP(normalized, code);

    logger.info({ phone: normalized }, "📱 تم إرسال SMS OTP");
    res.json({ success: true, message: "تم إرسال الكود عبر SMS" });

  } catch (err) {
    logger.error({ err }, "فشل إرسال SMS OTP");
    const msg = err instanceof Error ? err.message : "تعذر إرسال الكود";
    res.status(503).json({ error: msg });
  }
});

// POST /api/auth/verify-otp
// يتحقق من صحة OTP المُدخَل
router.post("/auth/verify-otp", verifyOtpLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, code } = (req.body ?? {}) as {
      phone?: string;
      code?: string;
    };

    // التحقق من وجود البيانات
    if (!phone || !code) {
      res.status(400).json({ error: "رقم الهاتف والكود مطلوبان" });
      return;
    }

    const normalized = normalizePhone(phone);
    const entry = otpStore.get(normalized);

    // لا يوجد OTP لهذا الرقم
    if (!entry) {
      res.status(400).json({
        error: "الكود غير موجود أو انتهت صلاحيته — أرسل كوداً جديداً",
      });
      return;
    }

    // انتهت صلاحية الـ OTP (5 دقائق)
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(normalized);
      res.status(400).json({
        error: "انتهت صلاحية الكود — أرسل كوداً جديداً",
      });
      return;
    }

    // عدّ المحاولات الخاطئة (حد أقصى 5)
    entry.attempts++;
    if (entry.attempts > 5) {
      otpStore.delete(normalized);
      res.status(429).json({
        error: "تجاوزت عدد المحاولات — أرسل كوداً جديداً",
      });
      return;
    }

    // التحقق من الكود
    if (entry.code !== code.trim()) {
      const remaining = 5 - entry.attempts;
      res.status(400).json({
        error: `الكود غير صحيح (${remaining} محاولة متبقية)`,
      });
      return;
    }

    // ✅ الكود صحيح
    otpStore.delete(normalized);
    verifiedPhones.add(normalized);

    // نسمح باستخدام هذا الرقم للتسجيل لمدة 10 دقائق فقط
    setTimeout(() => verifiedPhones.delete(normalized), 10 * 60_000);

    logger.info({ phone: normalized }, "✅ تم التحقق من OTP بنجاح");
    res.json({ verified: true, success: true, message: "تم التحقق بنجاح" });

  } catch (err) {
    logger.error({ err }, "فشل التحقق من OTP");
    res.status(500).json({ error: "خطأ في التحقق" });
  }
});

// GET /api/admin/sms-gateway-status — حالة SMS Gateway (للأدمن فقط)
router.get("/admin/sms-gateway-status", (_req: Request, res: Response) => {
  res.json(getSmsGatewayStatus());
});

export default router;
