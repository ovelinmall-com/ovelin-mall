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

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type Mailer = {
  sendMail: (opts: {
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }) => Promise<unknown>;
  verify: () => Promise<true>;
};

let _mailer: Mailer | null = null;
let _lastError: string | null = null;

export function emailConfig() {
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? "0"),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "",
  };
}

export function isEmailConfigured(): boolean {
  const c = emailConfig();
  return Boolean(c.host && c.port && c.user && c.pass && c.from);
}

function getMailer(): Mailer {
  if (_mailer) return _mailer;
  if (!isEmailConfigured()) {
    throw new Error("SMTP غير مضبوط (SMTP_HOST/PORT/USER/PASS/FROM مطلوبة)");
  }
  const c = emailConfig();
  // dynamic require: nodemailer is externalized in build.mjs
  const nodemailer = require("nodemailer");
  _mailer = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.port === 465,
    auth: { user: c.user, pass: c.pass },
  }) as Mailer;
  return _mailer;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "SMTP غير مفعّل" };
  }
  try {
    const c = emailConfig();
    await getMailer().sendMail({ from: c.from, ...args });
    _lastError = null;
    return { ok: true };
  } catch (e: any) {
    _lastError = e?.message ?? String(e);
    return { ok: false, error: _lastError ?? undefined };
  }
}

export async function pingEmail(): Promise<{ ok: boolean; message: string }> {
  if (!isEmailConfigured()) {
    return { ok: false, message: "SMTP غير مفعّل" };
  }
  try {
    await getMailer().verify();
    return { ok: true, message: "اتصال SMTP ناجح" };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "فشل الاتصال" };
  }
}

export function getLastEmailError(): string | null {
  return _lastError;
}

export function resetEmailClient() {
  _mailer = null;
}
