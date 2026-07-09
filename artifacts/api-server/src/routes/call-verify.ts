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
 * هذا يمنع أي عميل من ربط التحقق برقم مختلف عبر تعديل query param.
 */
const sessionPhoneMap = new Map<string, string>();

// تنظيف دوري للجلسات المنتهية (كل 5 دقائق)
setInterval(() => {
  // لا نعرف الـ expiresAt هنا، لكن الـ CallVerify يرجع expired:true فور الانتهاء
  // نمسح المفاتيح التي تجاوزت 20 دقيقة (أمان)
}, 5 * 60_000);

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
 * يفتح جلسة تحقق — يرجع رقم الاتصال والـ sessionId
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

    const session = await startCallSession(normalized);

    // ✅ احفظ الربط بين الجلسة والرقم في server-side موثوق
    sessionPhoneMap.set(session.sessionId, normalized);
    // أزل الجلسة بعد 20 دقيقة (expiresIn يكون عادةً 900 ثانية = 15 دقيقة)
    setTimeout(() => sessionPhoneMap.delete(session.sessionId), 20 * 60_000);

    logger.info({ phone: normalized, sessionId: session.sessionId }, "📞 جلسة تحقق بالاتصال بدأت");

    res.json({
      sessionId: session.sessionId,
      callNumber: session.callNumber,
      expiresIn: session.expiresIn,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "فشل إنشاء جلسة CallVerify");
    // DEBUG: نكشف الخطأ الحقيقي مؤقتاً للتشخيص
    res.status(500).json({ error: "تعذر بدء التحقق — حاول مجدداً", _debug: errMsg });
  }
});

/**
 * GET /api/auth/call-verify/poll/:sessionId
 * يُوكّل الاستعلام لخدمة CallVerify (long-poll حتى 25 ثانية)
 * عند التحقق يُضيف الرقم المُخزَّن server-side لـ verifiedPhones
 */
router.get("/auth/call-verify/poll/:sessionId", async (req: Request, res: Response) => {
  // ضمان أن sessionId سلسلة نصية (يتجنب string | string[])
  const rawId = req.params["sessionId"];
  const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!sessionId) {
    res.status(400).json({ error: "sessionId مطلوب" });
    return;
  }

  // ✅ الرقم من الخريطة الموثوقة على الـ server — لا من الـ client
  const trustedPhone = sessionPhoneMap.get(sessionId);
  if (!trustedPhone) {
    // الجلسة غير معروفة أو انتهت صلاحيتها
    res.json({ verified: false, expired: true, phone: null, remainingSeconds: 0 });
    return;
  }

  try {
    // long-poll حقيقي: نلوف كل ثانية حتى 28 ثانية
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
        // AbortError من timeout الـ loop — نكمل
        if (!(loopErr instanceof Error && loopErr.name === "AbortError")) throw loopErr;
      } finally {
        clearTimeout(loopTimer);
      }

      // خروج فوري عند التحقق أو الانتهاء
      if (status.verified || status.expired) break;

      // ليس verified بعد — انتظر ثانية قبل الاستعلام التالي
      await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
    }

    // عند التحقق الناجح: سجّل الرقم الموثوق كمُتحقَّق
    if (status.verified) {
      verifiedPhones.add(trustedPhone);
      setTimeout(() => verifiedPhones.delete(trustedPhone), 10 * 60_000);
      sessionPhoneMap.delete(sessionId);
      logger.info({ phone: trustedPhone }, "✅ تم التحقق بالاتصال بنجاح");
    }

    if (status.expired) {
      sessionPhoneMap.delete(sessionId);
    }

    res.json(status);
  } catch (err: unknown) {
    logger.error({ err }, "فشل poll CallVerify");
    res.status(500).json({ error: "تعذر الاستعلام — حاول مجدداً" });
  }
});

export default router;
