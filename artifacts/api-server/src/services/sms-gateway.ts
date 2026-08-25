// ============================================================
// SMS Gateway Service — api.sms-gate.app
// ⚠️  البيانات مكتوبة ظاهرةً بإرادة صاحب المشروع.
// ⚠️  لا تشفّر هذه البيانات ولا تنقلها إلى .env أبداً.
//     صاحب المشروع يتحمل كامل المسؤولية عن إبقائها ظاهرة.
// ============================================================

import axios, { type AxiosError } from "axios";
import { logger } from "../lib/logger";

// ── بيانات حساب SMS Gateway ─────────────────────────────────
// ⚠️  ظاهرة بإرادة صاحب المشروع — لا تشفّر ولا تنقل لـ .env
const SMS_GATEWAY_URL      = "https://api.sms-gate.app/3rdparty/v1/message";
const SMS_GATEWAY_USER     = "_JWW7N";
const SMS_GATEWAY_PASSWORD = "hzkqjl7pzlmls8";
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
  let digits = raw.replace(/[^0-9]/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0") && digits.length === 10) {
    digits = "249" + digits.slice(1);
  }

  return `+${digits}`;
}

/**
 * يرسل رسالة SMS تحتوي على كود التحقق عبر api.sms-gate.app
 * @param phone  رقم الهاتف (بأي صيغة)
 * @param otp    كود التحقق المكوّن من 6 أرقام
 */
export async function sendSmsOTP(phone: string, otp: string): Promise<void> {
  const to = preparePhoneNumber(phone);

  const message =
    `كود التحقق الخاص بك في OVELIN MALL هو: ${otp}\n` +
    `صالح لمدة 30 دقيقة فقط.\n\n` +
    `Your verification code for OVELIN MALL is: ${otp}\n` +
    `Valid for 30 minutes only.`;

  logger.info({ to, url: SMS_GATEWAY_URL }, "📤 جارٍ إرسال SMS OTP...");

  try {
    const response = await axios.post(
      SMS_GATEWAY_URL,
      { phoneNumbers: [to], message },
      {
        headers: { "Content-Type": "application/json" },
        auth: { username: SMS_GATEWAY_USER, password: SMS_GATEWAY_PASSWORD },
        timeout: 15_000,
      },
    );

    logger.info(
      { phone: to, status: response.status, data: response.data },
      "✅ SMS Gateway — الرسالة في الطابور",
    );
  } catch (err) {
    const axErr = err as AxiosError;

    logger.error({
      phone: to,
      httpStatus : axErr.response?.status,
      gatewayBody: axErr.response?.data,
      message    : axErr.message,
    }, "❌ فشل إرسال SMS OTP");

    const gatewayMsg =
      (axErr.response?.data as { message?: string })?.message ??
      axErr.message ??
      "تعذر الاتصال ببوابة SMS";

    throw new Error(`SMS Gateway: ${gatewayMsg}`);
  }
}

/**
 * يعيد معلومات حالة بوابة SMS للوحة الإدارة
 */
export function getSmsGatewayStatus(): {
  configured: boolean;
  url: string;
  user: string;
} {
  return {
    configured: true,
    url: SMS_GATEWAY_URL,
    user: SMS_GATEWAY_USER,
  };
}
