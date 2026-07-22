// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { db, usersTable, blockedPhonesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendWhatsAppOTP, getWhatsAppStatus } from "../services/whatsapp-gateway.js";
import {
  otpStore,
  verifiedPhones,
  normalizePhone,
  generateOTP,
} from "../lib/otp-store.js";
import { logger } from "../lib/logger";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

// ── Rate Limiters ─────────────────────────────────────────────
const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: "عدد كبير من الطلبات — انتظر قليلاً وأعد المحاولة" },
  keyGenerator: (req) => {
    const phone = (req.body as { phone?: string })?.phone ?? "";
    return phone ? `snd:${normalizePhone(phone)}` : `snd:unknown`;
  },
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
router.post("/auth/send-otp", sendOtpLimiter, async (req: Request, res: Response) => {
  try {
    const { phone } = (req.body ?? {}) as { phone?: string };

    if (!phone) {
      res.status(400).json({ error: "رقم الهاتف مطلوب" });
      return;
    }

    const normalized = normalizePhone(phone);
    if (normalized.length < 9 || normalized.length > 15) {
      res.status(400).json({ error: "رقم هاتف غير صالح" });
      return;
    }

    // ── فحص الحظر في قاعدة البيانات ──────────────────────────
    const blocked = await db
      .select()
      .from(blockedPhonesTable)
      .where(eq(blockedPhonesTable.phone, normalized))
      .limit(1);
    if (blocked[0]) {
      res.status(403).json({ error: "هذا الرقم محظور ولا يمكن استخدامه للتسجيل" });
      return;
    }

    // ── فحص إذا الرقم مسجّل مسبقاً ──────────────────────────
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, normalized))
      .limit(1);
    if (existing[0]) {
      res.status(409).json({ error: "هذا الرقم مسجل بالفعل" });
      return;
    }

    // ── فحص مدة الانتظار بين الإرسالات (دقيقة واحدة) ──────────
    const existingOtp = otpStore.get(normalized);
    const RESEND_COOLDOWN_MS = 60_000; // دقيقة واحدة
    if (existingOtp && Date.now() - existingOtp.sentAt < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((existingOtp.sentAt + RESEND_COOLDOWN_MS - Date.now()) / 1000);
      res.status(429).json({ error: `انتظر ${waitSec} ثانية قبل إعادة الإرسال` });
      return;
    }

    // ── توليد OTP وإرساله ─────────────────────────────────────
    const code = generateOTP();
    const now  = Date.now();

    // أرسل الرسالة أولاً — احفظ في المخزن فقط بعد نجاح الإرسال
    await sendWhatsAppOTP(normalized, code);

    otpStore.set(normalized, {
      code,
      sentAt: now,
      expiresAt: now + 30 * 60_000,
      attempts: 0,
    });

    logger.info({ phone: normalized }, "📱 تم إرسال WhatsApp OTP");
    res.json({ success: true, message: "تم إرسال الكود عبر واتساب" });

  } catch (err) {
    logger.error({ err }, "فشل إرسال SMS OTP");
    const msg = err instanceof Error ? err.message : "تعذر إرسال الكود";
    res.status(503).json({ error: msg });
  }
});

// POST /api/auth/verify-otp
router.post("/auth/verify-otp", verifyOtpLimiter, async (req: Request, res: Response) => {
  try {
    const { phone, code } = (req.body ?? {}) as {
      phone?: string;
      code?: string;
    };

    if (!phone || !code) {
      res.status(400).json({ error: "رقم الهاتف والكود مطلوبان" });
      return;
    }

    const normalized = normalizePhone(phone);

    // ── فحص الحظر ─────────────────────────────────────────────
    const blocked = await db
      .select()
      .from(blockedPhonesTable)
      .where(eq(blockedPhonesTable.phone, normalized))
      .limit(1);
    if (blocked[0]) {
      res.status(403).json({ error: "هذا الرقم محظور" });
      return;
    }

    const entry = otpStore.get(normalized);

    if (!entry) {
      res.status(400).json({
        error: "الكود غير موجود أو انتهت صلاحيته — أرسل كوداً جديداً",
      });
      return;
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(normalized);
      res.status(400).json({
        error: "انتهت صلاحية الكود — أرسل كوداً جديداً",
      });
      return;
    }

    entry.attempts++;
    if (entry.attempts > 5) {
      otpStore.delete(normalized);
      res.status(429).json({
        error: "تجاوزت عدد المحاولات — أرسل كوداً جديداً",
      });
      return;
    }

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

    setTimeout(() => verifiedPhones.delete(normalized), 10 * 60_000);

    logger.info({ phone: normalized }, "✅ تم التحقق من OTP بنجاح");
    res.json({ verified: true, success: true, message: "تم التحقق بنجاح" });

  } catch (err) {
    logger.error({ err }, "فشل التحقق من OTP");
    res.status(500).json({ error: "خطأ في التحقق" });
  }
});

// GET /api/admin/whatsapp-status — محمي بصلاحية الأدمن فقط
router.get("/admin/whatsapp-status", requireAdmin, (_req: Request, res: Response) => {
  const status = getWhatsAppStatus();
  // لا نُعيد الكود كاملاً — نُشير فقط هل هو متاح أم لا
  res.json({
    connected: status.connected,
    phone: status.phone,
    awaitingPairing: !!status.pairingCode,
  });
});

export default router;
