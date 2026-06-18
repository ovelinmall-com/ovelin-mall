import nodemailer from "nodemailer";
import { logger } from "./logger";
import { sendEmail as sendSmtpEmail, isEmailConfigured } from "./integrations/email";

// بريد الإرسال — ظاهر بإرادة صاحب المشروع
const SENDER_EMAIL = "ovelinmall@gmail.com";
const SENDER_NAME = "OVELIN MALL";

function getGmailTransporter() {
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: SENDER_EMAIL, pass },
  });
}

function siteUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0]!.trim()}`;
  return "http://localhost:20220";
}

/**
 * إرسال إيميل — يحاول Gmail أولاً ثم SMTP integration كبديل
 */
async function send(to: string, subject: string, html: string): Promise<void> {
  // محاولة 1: Gmail مباشرة عبر app password
  const gmailTransporter = getGmailTransporter();
  if (gmailTransporter) {
    try {
      await gmailTransporter.sendMail({ from: `${SENDER_NAME} <${SENDER_EMAIL}>`, to, subject, html });
      logger.info({ to, subject }, "✉️ إيميل أُرسل عبر Gmail");
      return;
    } catch (err) {
      logger.error({ err, to, subject }, "❌ فشل إرسال إيميل عبر Gmail — جارٍ المحاولة عبر SMTP");
    }
  }

  // محاولة 2: SMTP integration (من إعدادات الأدمن)
  if (isEmailConfigured()) {
    const result = await sendSmtpEmail({ to, subject, html });
    if (result.ok) {
      logger.info({ to, subject }, "✉️ إيميل أُرسل عبر SMTP integration");
      return;
    }
    logger.error({ error: result.error, to, subject }, "❌ فشل إرسال إيميل عبر SMTP integration");
  }

  // لا يوجد نظام إيميل مضبوط
  logger.warn(
    { to, subject },
    "⚠️ لم يُرسَل الإيميل — لا يوجد GMAIL_APP_PASSWORD ولا SMTP مضبوط. " +
    "اضبط GMAIL_APP_PASSWORD في Secrets أو اضبط SMTP من لوحة الإدارة."
  );
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${siteUrl()}/verify-email?token=${token}`;
  await send(
    to,
    "تأكيد بريدك الإلكتروني في OVELIN MALL",
    `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#fff5f7;padding:32px;border-radius:16px">
      <h2 style="color:#be185d;text-align:center">مرحباً بك في OVELIN MALL</h2>
      <p style="color:#4b5563;text-align:center">اضغط على الزر أدناه لتأكيد بريدك الإلكتروني</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${link}" style="background:linear-gradient(to right,#ec4899,#e11d48);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:16px">
          تأكيد البريد الإلكتروني
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center">الرابط صالح لمدة 24 ساعة فقط</p>
      <p style="color:#9ca3af;font-size:11px;text-align:center">إذا لم تسجّل في OVELIN MALL، تجاهل هذا البريد</p>
    </div>
    `
  );
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${siteUrl()}/reset-password?token=${token}`;
  await send(
    to,
    "إعادة تعيين كلمة المرور — OVELIN MALL",
    `
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#fff5f7;padding:32px;border-radius:16px">
      <h2 style="color:#be185d;text-align:center">إعادة تعيين كلمة المرور</h2>
      <p style="color:#4b5563;text-align:center">تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك في OVELIN MALL</p>
      <div style="text-align:center;margin:32px 0">
        <a href="${link}" style="background:linear-gradient(to right,#ec4899,#e11d48);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:16px">
          إعادة تعيين كلمة المرور
        </a>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center">الرابط صالح لمدة 30 دقيقة فقط</p>
      <p style="color:#9ca3af;font-size:11px;text-align:center">إذا لم تطلب إعادة التعيين، تجاهل هذا البريد — حسابك بأمان</p>
    </div>
    `
  );
}
