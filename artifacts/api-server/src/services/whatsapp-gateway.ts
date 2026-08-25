// ============================================================
// WhatsApp Gateway — Green API (green-api.com)
// بديل Baileys — لا مشاكل IP — يعمل مع الأرقام الشخصية
// ⚠️  بيانات الاتصال تُقرأ من متغيرات البيئة:
//     GREENAPI_INSTANCE_ID  و  GREENAPI_API_TOKEN
// ============================================================

import axios, { type AxiosError } from "axios";
import { logger } from "../lib/logger.js";

const INSTANCE_ID = process.env["GREENAPI_INSTANCE_ID"] ?? "";
const API_TOKEN   = process.env["GREENAPI_API_TOKEN"]   ?? "";
const BASE_URL    = `https://api.green-api.com/waInstance${INSTANCE_ID}`;

/** هل البيانات مضبوطة؟ */
export function isWhatsAppConfigured(): boolean {
  return Boolean(INSTANCE_ID && API_TOKEN);
}

/** حالة الـ instance في Green API */
export async function getWhatsAppStatus(): Promise<{
  configured: boolean;
  stateInstance?: string;
  error?: string;
}> {
  if (!isWhatsAppConfigured()) {
    return { configured: false, error: "GREENAPI_INSTANCE_ID / GREENAPI_API_TOKEN غير مضبوطتَين" };
  }
  try {
    const res = await axios.get(
      `${BASE_URL}/getStateInstance/${API_TOKEN}`,
      { timeout: 10_000 },
    );
    return { configured: true, stateInstance: res.data?.stateInstance };
  } catch (err) {
    const msg = (err as AxiosError).message;
    return { configured: true, error: msg };
  }
}

/**
 * يُرسل رسالة واتساب عبر Green API
 * @param phone  رقم المستلم (بأي صيغة)
 * @param otp    كود التحقق المكوّن من 6 أرقام
 */
export async function sendWhatsAppOTP(
  phone: string,
  otp: string,
): Promise<void> {
  if (!isWhatsAppConfigured()) {
    throw new Error(
      "WhatsApp غير مهيّأ — أضف GREENAPI_INSTANCE_ID و GREENAPI_API_TOKEN كـ Secrets في Replit",
    );
  }

  // تحويل الرقم لصيغة chatId المطلوبة لـ Green API
  const digits = phone.replace(/[^0-9]/g, "");
  const chatId = `${digits}@c.us`;

  const message =
    `🛒 *OVELIN MALL*\n\n` +
    `كود التحقق الخاص بك:\n\n` +
    `*━━━━━━  ${otp}  ━━━━━━*\n\n` +
    `⏱ صالح لمدة *30 دقيقة* فقط.\n` +
    `🔒 لا تشارك هذا الكود مع أحد.\n\n` +
    `──────────────────────\n` +
    `_Your verification code: *${otp}*_\n` +
    `_Valid for 30 minutes. Do not share._`;

  try {
    const res = await axios.post(
      `${BASE_URL}/sendMessage/${API_TOKEN}`,
      { chatId, message },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15_000,
      },
    );

    logger.info(
      { to: digits, idMessage: res.data?.idMessage },
      "✅ تم إرسال OTP عبر WhatsApp (Green API)",
    );
  } catch (err) {
    const axErr = err as AxiosError;
    logger.error(
      {
        to: digits,
        status: axErr.response?.status,
        data:   axErr.response?.data,
      },
      "❌ فشل إرسال WhatsApp OTP",
    );
    throw new Error(
      `WhatsApp: ${(axErr.response?.data as any)?.message ?? axErr.message}`,
    );
  }
}

/** تهيئة — تطبع حالة الاتصال عند بدء الخادم */
export async function initWhatsApp(): Promise<void> {
  if (!isWhatsAppConfigured()) {
    logger.warn(
      "\n" +
      "═══════════════════════════════════════════════════════════════\n" +
      "⚠️  WhatsApp OTP غير مفعّل — مفاتيح Green API ناقصة\n" +
      "───────────────────────────────────────────────────────────────\n" +
      "  أضف هذين المتغيّرَين كـ Secrets في Replit:\n" +
      "    • GREENAPI_INSTANCE_ID   (مثال: 1101234567)\n" +
      "    • GREENAPI_API_TOKEN     (مثال: abc123...)\n" +
      "  ثم أعد تشغيل السيرفر.\n" +
      "═══════════════════════════════════════════════════════════════",
    );
    return;
  }

  try {
    const status = await getWhatsAppStatus();
    if (status.stateInstance === "authorized") {
      logger.info(
        "╔══════════════════════════════════════════════════╗\n" +
        "║  ✅ WhatsApp جاهز! (Green API — authorized)     ║\n" +
        "╚══════════════════════════════════════════════════╝",
      );
    } else {
      logger.warn(
        { stateInstance: status.stateInstance },
        "⚠️ WhatsApp instance موجود لكن حالته ليست authorized — تحقق من Green API Dashboard",
      );
    }
  } catch (err) {
    logger.error({ err }, "❌ فشل فحص حالة WhatsApp عند بدء التشغيل");
  }
}
