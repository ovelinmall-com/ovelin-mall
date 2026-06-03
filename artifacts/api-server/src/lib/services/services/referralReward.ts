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

/**
 * مكافأة الإحالة التلقائية + إشعار المُحيل (داخل الموقع + push)
 */
import {
  db,
  usersTable,
  referralsTable,
  transactionsTable,
  notificationsTable,
  settingsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../logger";
import { sendPushToUser } from "./pushService";

const DEFAULT_BONUS = "5"; // 5 ريال
const DEFAULT_TEMPLATE =
  "🎉 مبروك {name}! انضمّ {referredName} إلى أوفلين عبر كودك وحصلت على {amount} ريال في رصيدك.";

async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

function applyTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export async function awardReferralOnSignup(
  referrerId: number,
  newUser: { id: number; username: string },
): Promise<void> {
  try {
    const map = await getSettingsMap();
    if (map["referralEnabled"] === "false") {
      logger.info("نظام الإحالة موقوف من لوحة التحكم");
      return;
    }
    const bonusStr = map["referralSignupBonus"] || DEFAULT_BONUS;
    const bonus = Number(bonusStr);
    if (!isFinite(bonus) || bonus <= 0) {
      logger.info("referralSignupBonus = 0 — لا توجد مكافأة تسجيل");
      return;
    }

    // Update referrer's balance
    const referrerRows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, referrerId))
      .limit(1);
    const referrer = referrerRows[0];
    if (!referrer) return;

    const currentBalance = Number(referrer.balance ?? 0);
    const newBalance = (currentBalance + bonus).toFixed(2);

    await db
      .update(usersTable)
      .set({ balance: newBalance })
      .where(eq(usersTable.id, referrerId));

    // Update the referrals row
    await db
      .update(referralsTable)
      .set({
        signupBonus: bonus.toFixed(2),
        earned: bonus.toFixed(2),
      })
      .where(eq(referralsTable.referredUserId, newUser.id));

    // Log a transaction
    try {
      await db.insert(transactionsTable).values({
        userId: referrerId,
        type: "referral",
        amount: bonus.toFixed(2),
        meta: `مكافأة إحالة — انضمّ ${newUser.username}`,
        reference: `from ${newUser.username}`,
        status: "completed",
      });
    } catch (e) {
      logger.warn({ err: e }, "فشل تسجيل معاملة الإحالة");
    }

    // In-app notification
    const template =
      map["referralNotificationTemplate"] || DEFAULT_TEMPLATE;
    const message = applyTemplate(template, {
      name: referrer.username,
      referredName: newUser.username,
      amount: bonus.toFixed(2),
      code: referrer.referralCode,
    });

    try {
      await db.insert(notificationsTable).values({
        userId: referrerId,
        type: "referral",
        title: "🎉 مكافأة إحالة جديدة",
        message,
        link: "/referrals",
      });
    } catch (e) {
      logger.warn({ err: e }, "فشل إضافة إشعار الإحالة في قاعدة البيانات");
    }

    // Push notification — يصل لشريط إشعارات الهاتف
    try {
      await sendPushToUser(referrerId, {
        title: "🎉 مكافأة إحالة جديدة",
        body: message,
        url: "/referrals",
        tag: `referral-${newUser.id}`,
      });
    } catch (e) {
      logger.warn({ err: e }, "فشل إرسال إشعار push للإحالة");
    }

    logger.info(
      { referrerId, referredId: newUser.id, bonus },
      "تم منح مكافأة الإحالة وإرسال الإشعار",
    );
  } catch (err) {
    logger.error({ err }, "خطأ في awardReferralOnSignup");
  }
}
