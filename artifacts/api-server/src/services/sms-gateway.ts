// ============================================================
// SMS Gateway Service — sms-gate.app
// رابط الـ API مكتوب ظاهراً بإرادة صاحب المشروع.
// أنا أتحمل كامل المسؤولية عن إبقائه ظاهراً هنا.
// ============================================================

import axios, { type AxiosError } from "axios";
import { logger } from "../lib/logger";

// ── إعدادات SMS Gateway ──────────────────────────────────────
// رابط الـ API الرسمي لـ sms-gate.app (نسخة third-party)
const SMS_GATEWAY_URL =
  process.env["SMS_GATEWAY_URL"] ??
  "https://api.sms-gate.app/3rdparty/v1/message";

// اسم المستخدم وكلمة المرور من تطبيق SMS Gateway على الأندرويد
const SMS_GATEWAY_USER     = process.env["SMS_GATEWAY_USER"]     ?? "";
const SMS_GATEWAY_PASSWORD = process.env["SMS_GATEWAY_PASSWORD"] ?? "";
// ─────────────────────────────────────────────────────────────

/**
 * ينظّف رقم الهاتف ويضمن وجود رمز الدولة مع +
 * أمثلة:
 *   "0912345678"     → "+249912345678"  (سوداني محلي)
 *   "249912345678"   → "+249912345678"  (سوداني بدون +)
 *   "+249912345678"  → "+249912345678"  (صحيح بالفعل)
 *   "00249912345678" → "+249912345678"  (صيغة 00)
 */
function preparePhoneNumber(raw: string): string {
  // إزالة كل شيء عدا الأرقام
  let digits = raw.replace(/[^0-9]/g, "");

  // صيغة 00XXX → نزيل الصفرين في البداية
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  // رقم سوداني محلي يبدأ بـ 0 وطوله 10 أرقام → نضيف 249
  else if (digits.startsWith("0") && digits.length === 10) {
    digits = "249" + digits.slice(1);
  }

  return `+${digits}`;
}

/**
 * يرسل رسالة SMS إلى رقم هاتف معيّن عبر SMS Gateway
 * @param phone  رقم الهاتف (بأي صيغة — سيُنظَّف تلقائياً)
 * @param otp    كود التحقق المكوّن من 6 أرقام
 */
export async function sendSmsOTP(phone: string, otp: string): Promise<void> {
  // تنظيف الرقم والتأكد من وجود كود الدولة
  const to = preparePhoneNumber(phone);

  // نحصل على أول نطاق من REPLIT_DOMAINS لدعم Web OTP API (قراءة تلقائية على Android)
  const domain = (process.env["REPLIT_DOMAINS"] ?? "").split(",")[0]?.trim() || "ovelin.replit.app";
  const message = `كود التحقق الخاص بك في OVELIN هو: ${otp}\nصالح لمدة 5 دقائق فقط.\n\n@${domain} #${otp}`;

  // إذا لم تُضبَط بيانات الاعتماد — نطبع الكود في السجلات للاختبار فقط
  if (!SMS_GATEWAY_USER || !SMS_GATEWAY_PASSWORD) {
    logger.warn("SMS_GATEWAY_USER / SMS_GATEWAY_PASSWORD غير مضبوطَين — الرسالة لم تُرسَل");
    logger.info({ phone: to, otp }, "🔑 [DEV] كود OTP للاختبار فقط");
    return;
  }

  logger.info({ to, url: SMS_GATEWAY_URL }, "📤 جارٍ إرسال SMS OTP...");

  try {
    const response = await axios.post(
      SMS_GATEWAY_URL,
      {
        // الحقل الرسمي لـ sms-gate.app هو phoneNumbers (مصفوفة)
        phoneNumbers: [to],
        message,
      },
      {
        headers: { "Content-Type": "application/json" },
        // Basic Auth من بيانات تطبيق SMS Gateway
        auth: {
          username: SMS_GATEWAY_USER,
          password: SMS_GATEWAY_PASSWORD,
        },
        timeout: 15_000,
      },
    );

    // نسجّل الاستجابة الكاملة للتشخيص
    logger.info(
      { phone: to, status: response.status, data: response.data },
      "✅ SMS Gateway قبل الطلب — الرسالة في الطابور",
    );

  } catch (err) {
    const axErr = err as AxiosError;

    // نسجّل تفاصيل الخطأ الكاملة من SMS Gateway
    logger.error({
      phone: to,
      httpStatus : axErr.response?.status,
      gatewayBody: axErr.response?.data,
      message    : axErr.message,
    }, "❌ فشل إرسال SMS OTP");

    // نرسل رسالة خطأ واضحة للمستخدم
    const gatewayMsg =
      (axErr.response?.data as { message?: string })?.message ??
      axErr.message ??
      "تعذر الاتصال ببوابة SMS";

    throw new Error(`SMS Gateway: ${gatewayMsg}`);
  }
}

/**
 * يتحقق من أن بيانات SMS Gateway مضبوطة ويعيد معلومات الحالة
 */
export function getSmsGatewayStatus(): {
  configured: boolean;
  url: string;
  user: string;
} {
  return {
    configured: !!(SMS_GATEWAY_USER && SMS_GATEWAY_PASSWORD),
    url: SMS_GATEWAY_URL,
    user: SMS_GATEWAY_USER ? `${SMS_GATEWAY_USER.slice(0, 3)}***` : "(غير مضبوط)",
  };
}
