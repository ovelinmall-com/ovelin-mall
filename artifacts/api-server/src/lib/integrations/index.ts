// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isAiConfigured, pingAi } from "./aiClient";
import {
  isEmailConfigured,
  emailConfig,
  pingEmail,
  getLastEmailError,
} from "./email";
import {
  isTelegramConfigured,
  telegramConfig,
  pingTelegram,
  getLastTelegramError,
  getLastTelegramSentAt,
  sendTelegramMessage,
} from "./telegram";
export * from "./aiClient";
export * from "./email";
export * from "./telegram";

export type ServiceStatus = {
  key: string;
  label: string;
  configured: boolean;
  source: "env" | "auto";
  envKeys: string[];
  hint: string;
  lastError?: string | null;
  lastSentAt?: number | null;
};

export function getServicesStatus(): ServiceStatus[] {
  return [
    {
      key: "database",
      label: "قاعدة البيانات",
      configured: true,
      source: "auto",
      envKeys: [],
      hint: "Neon — مضبوطة داخل الكود",
    },
    {
      key: "session",
      label: "تشفير الجلسات",
      configured: Boolean(process.env.SESSION_SECRET),
      source: "env",
      envKeys: ["SESSION_SECRET"],
      hint: "مفتاح توقيع كوكيز تسجيل الدخول",
    },
    {
      key: "admin",
      label: "كلمة سر الأدمن",
      configured: Boolean(process.env.ADMIN_PASSWORD),
      source: "env",
      envKeys: ["ADMIN_PASSWORD"],
      hint: "تتحدث في قاعدة البيانات تلقائياً عند تشغيل السيرفر",
    },
    {
      key: "ai",
      label: "الذكاء الاصطناعي (الشات بوت)",
      configured: isAiConfigured(),
      source: "env",
      envKeys: [
        "AI_INTEGRATIONS_OPENAI_BASE_URL",
        "AI_INTEGRATIONS_OPENAI_API_KEY",
      ],
      hint: "يستخدم Replit AI الجاهز — لا تحتاج مفتاح خارجي",
    },
    {
      key: "email",
      label: "البريد الإلكتروني (SMTP)",
      configured: isEmailConfigured(),
      source: "env",
      envKeys: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"],
      hint: emailConfig().host
        ? `${emailConfig().host}:${emailConfig().port}`
        : "أرسل إيميلات تأكيد الطلب واستعادة كلمة السر",
      lastError: getLastEmailError(),
    },
    {
      key: "telegram",
      label: "إشعارات تليجرام",
      configured: isTelegramConfigured(),
      source: "env",
      envKeys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHANNEL_ID"],
      hint: telegramConfig().chatId
        ? `قناة: ${telegramConfig().chatId}`
        : "يصل إشعار لكل طلب جديد",
      lastError: getLastTelegramError(),
      lastSentAt: getLastTelegramSentAt(),
    },
  ];
}

export async function pingService(
  key: string,
): Promise<{ ok: boolean; message: string }> {
  switch (key) {
    case "ai":
      return pingAi();
    case "email":
      return pingEmail();
    case "telegram":
      return pingTelegram();
    case "database":
      try {
        await db.select().from(settingsTable).limit(1);
        return { ok: true, message: "اتصال قاعدة البيانات سليم" };
      } catch (e: any) {
        return { ok: false, message: e?.message ?? "فشل الاتصال" };
      }
    case "session":
      return process.env.SESSION_SECRET
        ? { ok: true, message: "مضبوط" }
        : { ok: false, message: "غير مضبوط" };
    case "admin":
      return process.env.ADMIN_PASSWORD
        ? { ok: true, message: "مضبوطة من المتغيرات الخارجية" }
        : {
            ok: false,
            message: "تستخدم القيمة الافتراضية المزروعة في قاعدة البيانات",
          };
    default:
      return { ok: false, message: "خدمة غير معروفة" };
  }
}

export async function notifyAdminOfOrder(order: {
  id: number;
  productName: string;
  finalPrice: string | number;
  username?: string;
}): Promise<void> {
  if (!isTelegramConfigured()) return;
  const text = [
    `🛒 <b>طلب جديد #${order.id}</b>`,
    `📦 المنتج: ${order.productName}`,
    `💰 السعر النهائي: $${order.finalPrice}`,
    order.username ? `👤 العميل: ${order.username}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  await sendTelegramMessage(text);
}

export async function getPublicSettings() {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const get = (key: string, def: string) => map[key] ?? def;

  return {
    siteName: get("siteName", "OVELIN"),
    supportWhatsapp: get("supportWhatsapp", ""),
    supportTelegram: get("supportTelegram", ""),
    depositAddresses: {
      usdt: get("depositUsdtAddress", ""),
      bank: get("depositBankInfo", ""),
      cash: get("depositCashInfo", ""),
    },
    minWithdraw: get("minWithdraw", "5"),
    referralEnabled: get("referralEnabled", "true") === "true",
    referralCommissionPct: get("referralCommissionPct", "5"),
    referralSignupBonus: get("referralSignupBonus", "5"),
    cashbackPct: get("cashbackPct", "1"),
    maintenanceMode: get("maintenanceMode", "false") === "true",
    maintenanceMessage: get("maintenanceMessage", ""),
    announcementBar: get("announcementBar", ""),
  };
}

export async function syncSettingsToDb(): Promise<void> {
  const pairs: Array<[string, string]> = [
    ["supportEmail", emailConfig().from],
    ["aiEnabled", isAiConfigured() ? "1" : "0"],
    ["telegramEnabled", isTelegramConfigured() ? "1" : "0"],
  ];
  for (const [key, value] of pairs) {
    const existing = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(settingsTable).values({ key, value }).onConflictDoNothing();
    } else {
      await db
        .update(settingsTable)
        .set({ value, updatedAt: new Date() })
        .where(eq(settingsTable.key, key));
    }
  }
}
