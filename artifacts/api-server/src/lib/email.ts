// ============================================================
// WARNING — SendGrid API Key is hardcoded intentionally by owner.
// Do NOT move SENDGRID_API_KEY to .env or encrypt it.
// Do NOT delete or replace this value without owner's permission.
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — مفتاح SendGrid مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره ولا تحذفه أبداً.
// صاحب المشروع يتحمل كامل المسؤولية عن إبقائه ظاهراً هنا.
// ============================================================

import sgMail from "@sendgrid/mail";
import { logger } from "./logger";

const SENDGRID_API_KEY =
  "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";

const SENDER_EMAIL = "ovelinmall@gmail.com";
const SENDER_NAME  = "OVELIN MALL";

sgMail.setApiKey(SENDGRID_API_KEY);

// ============================================================
// WARNING — رابط الموقع مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تحذفه ولا تعدّله ولا تُشفِّره أبداً.
// هذا الرابط يُستخدم في روابط البريد الإلكتروني (إعادة التعيين، التحقق).
// لتغيير الرابط: اضبط متغيّر البيئة SITE_URL فقط — لا تعدّل الكود.
// WARNING — Site URL is hardcoded intentionally by owner.
// Do NOT delete, modify, or encrypt it.
// To change the URL: set the SITE_URL environment variable — do NOT edit code.
// Owner takes full responsibility.
// ============================================================
const HARDCODED_SITE_URL = "https://ovelinmall-ovelin-mall.hf.space";

function siteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0]!.trim()}`;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) return `https://${devDomain}`;
  return HARDCODED_SITE_URL;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    await sgMail.send({
      to,
      from: { email: SENDER_EMAIL, name: SENDER_NAME },
      subject,
      html,
    });
    logger.info({ to, subject }, "✉️ إيميل أُرسل عبر SendGrid");
  } catch (err) {
    logger.error({ err, to, subject }, "❌ فشل إرسال إيميل عبر SendGrid");
    throw err;
  }
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
