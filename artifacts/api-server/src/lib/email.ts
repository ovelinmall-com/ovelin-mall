import nodemailer from "nodemailer";
import { logger } from "./logger";

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

function siteUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0]!.trim()}`;
  return "http://localhost:20220";
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn("GMAIL_USER / GMAIL_APP_PASSWORD غير مضبوطَين — البريد لم يُرسَل");
    return;
  }
  const link = `${siteUrl()}/verify-email?token=${token}`;
  const from = process.env.GMAIL_USER!;
  await transporter.sendMail({
    from: `OVELIN <${from}>`,
    to,
    subject: "تأكيد بريدك الإلكتروني في OVELIN",
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#fff5f7;padding:32px;border-radius:16px">
        <h2 style="color:#be185d;text-align:center">مرحباً بك في OVELIN</h2>
        <p style="color:#4b5563;text-align:center">اضغط على الزر أدناه لتأكيد بريدك الإلكتروني</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${link}" style="background:linear-gradient(to right,#ec4899,#e11d48);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:16px">
            تأكيد البريد الإلكتروني
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center">الرابط صالح لمدة 24 ساعة فقط</p>
        <p style="color:#9ca3af;font-size:11px;text-align:center">إذا لم تسجّل في OVELIN، تجاهل هذا البريد</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn("GMAIL_USER / GMAIL_APP_PASSWORD غير مضبوطَين — البريد لم يُرسَل");
    return;
  }
  const link = `${siteUrl()}/reset-password?token=${token}`;
  const from = process.env.GMAIL_USER!;
  await transporter.sendMail({
    from: `OVELIN <${from}>`,
    to,
    subject: "إعادة تعيين كلمة المرور — OVELIN",
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#fff5f7;padding:32px;border-radius:16px">
        <h2 style="color:#be185d;text-align:center">إعادة تعيين كلمة المرور</h2>
        <p style="color:#4b5563;text-align:center">تلقّينا طلباً لإعادة تعيين كلمة مرور حسابك في OVELIN</p>
        <div style="text-align:center;margin:32px 0">
          <a href="${link}" style="background:linear-gradient(to right,#ec4899,#e11d48);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:bold;font-size:16px">
            إعادة تعيين كلمة المرور
          </a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center">الرابط صالح لمدة 30 دقيقة فقط</p>
        <p style="color:#9ca3af;font-size:11px;text-align:center">إذا لم تطلب إعادة التعيين، تجاهل هذا البريد — حسابك بأمان</p>
      </div>
    `,
  });
}
