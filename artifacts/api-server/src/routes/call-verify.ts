import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { startCallSession, pollCallSession } from "../lib/callVerifyService";
import { verifiedPhones, normalizePhone } from "../lib/otp-store.js";
import { db, blockedPhonesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/**
 * خريطة server-side موثوقة: sessionId → normalizedPhone
 */
const sessionPhoneMap = new Map<string, string>();

/**
 * جلسات نشطة per-phone — تمنع فتح جلسة جديدة إذا كانت هناك جلسة لم تنتهِ بعد
 * للرقم نفسه (حالة: المستخدم يعود لتعديل بيانات دون تغيير الرقم ثم يضغط إنشاء حساب)
 */
interface ActiveSession {
  sessionId: string;
  callNumber: string;
  expiresAt: number;
}
const phoneActiveSession = new Map<string, ActiveSession>();

const startLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: "عدد كبير من الطلبات — انتظر قليلاً وأعد المحاولة" },
  keyGenerator: (req) => {
    const phone = (req.body as { phone?: string })?.phone ?? "";
    return phone ? `cv:${normalizePhone(phone)}` : `cv:unknown`;
  },
});

/**
 * POST /api/auth/call-verify/start
 * يفتح جلسة تحقق — يرجع رقم الاتصال والـ sessionId.
 * إن كانت هناك جلسة نشطة لنفس الرقم يُعيد نفس الجلسة مع الوقت المتبقي.
 */
router.post("/auth/call-verify/start", startLimiter, async (req: Request, res: Response) => {
  try {
    const { phone } = (req.body ?? {}) as { phone?: string };

    if (!phone) {
      res.status(400).json({ error: "رقم الهاتف مطلوب" });
      return;
    }

    const normalized = normalizePhone(phone);
    if (normalized.length < 7 || normalized.length > 15) {
      res.status(400).json({ error: "رقم هاتف غير صالح" });
      return;
    }

    // فحص الحظر
    const blocked = await db
      .select()
      .from(blockedPhonesTable)
      .where(eq(blockedPhonesTable.phone, normalized))
      .limit(1);
    if (blocked[0]) {
      res.status(403).json({ error: "هذا الرقم محظور" });
      return;
    }

    // فحص التسجيل المسبق
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.phone, normalized))
      .limit(1);
    if (existing[0]) {
      res.status(409).json({ error: "هذا الرقم مسجل بالفعل" });
      return;
    }

    // ── إعادة الجلسة النشطة إن وُجدت ──────────────────────────────────────
    const active = phoneActiveSession.get(normalized);
    if (active && active.expiresAt > Date.now()) {
      const remainingSeconds = Math.ceil((active.expiresAt - Date.now()) / 1000);
      if (!sessionPhoneMap.has(active.sessionId)) {
        sessionPhoneMap.set(active.sessionId, normalized);
      }
      logger.info(
        { phone: normalized, sessionId: active.sessionId, remainingSeconds },
        "♻️  إعادة استخدام جلسة تحقق نشطة"
      );
      res.json({
        sessionId: active.sessionId,
        callNumber: active.callNumber,
        expiresIn: remainingSeconds,
      });
      return;
    }

    // ── فتح جلسة جديدة ─────────────────────────────────────────────────────
    const session = await startCallSession(normalized);

    sessionPhoneMap.set(session.sessionId, normalized);
    setTimeout(() => sessionPhoneMap.delete(session.sessionId), 20 * 60_000);

    const expiresAt = Date.now() + session.expiresIn * 1000;
    phoneActiveSession.set(normalized, {
      sessionId: session.sessionId,
      callNumber: session.callNumber,
      expiresAt,
    });
    setTimeout(() => {
      const cur = phoneActiveSession.get(normalized);
      if (cur?.sessionId === session.sessionId) phoneActiveSession.delete(normalized);
    }, session.expiresIn * 1000 + 30_000);

    logger.info({ phone: normalized, sessionId: session.sessionId }, "📞 جلسة تحقق بالاتصال بدأت");

    res.json({
      sessionId: session.sessionId,
      callNumber: session.callNumber,
      expiresIn: session.expiresIn,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "فشل إنشاء جلسة CallVerify");
    res.status(500).json({ error: errMsg || "تعذر بدء التحقق — حاول مجدداً" });
  }
});

/**
 * GET /api/auth/call-verify/poll/:sessionId
 */
router.get("/auth/call-verify/poll/:sessionId", async (req: Request, res: Response) => {
  const rawId = req.params["sessionId"];
  const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!sessionId) {
    res.status(400).json({ error: "sessionId مطلوب" });
    return;
  }

  const trustedPhone = sessionPhoneMap.get(sessionId);
  if (!trustedPhone) {
    res.json({ verified: false, expired: true, phone: null, remainingSeconds: 0 });
    return;
  }

  try {
    const deadline = Date.now() + 28_000;
    let status: Awaited<ReturnType<typeof pollCallSession>> = {
      verified: false,
      expired: false,
      phone: null,
      remainingSeconds: 0,
    };

    while (Date.now() < deadline) {
      const ac = new AbortController();
      const loopTimer = setTimeout(() => ac.abort(), 5_000);

      try {
        status = await pollCallSession(sessionId, ac.signal);
      } catch (loopErr: unknown) {
        if (!(loopErr instanceof Error && loopErr.name === "AbortError")) throw loopErr;
      } finally {
        clearTimeout(loopTimer);
      }

      if (status.verified || status.expired) break;
      await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
    }

    if (status.verified) {
      verifiedPhones.add(trustedPhone);
      setTimeout(() => verifiedPhones.delete(trustedPhone), 10 * 60_000);
      sessionPhoneMap.delete(sessionId);
      const cur = phoneActiveSession.get(trustedPhone);
      if (cur?.sessionId === sessionId) phoneActiveSession.delete(trustedPhone);
      logger.info({ phone: trustedPhone }, "✅ تم التحقق بالاتصال بنجاح");
    }

    if (status.expired) {
      sessionPhoneMap.delete(sessionId);
      const cur = phoneActiveSession.get(trustedPhone);
      if (cur?.sessionId === sessionId) phoneActiveSession.delete(trustedPhone);
    }

    res.json(status);
  } catch (err: unknown) {
    logger.error({ err }, "فشل poll CallVerify");
    res.status(500).json({ error: "تعذر الاستعلام — حاول مجدداً" });
  }
});

export default router;
