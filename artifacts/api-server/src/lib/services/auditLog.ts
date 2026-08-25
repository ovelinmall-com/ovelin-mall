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

import { db, auditLogTable } from "@workspace/db";
import { logger } from "../logger";

export async function audit(
  actor: string,
  action: string,
  entity: string,
  entityId?: string | number | null,
  details?: any,
): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      actor,
      action,
      entity,
      entityId: entityId == null ? null : String(entityId),
      details: details == null ? null : typeof details === "string" ? details : JSON.stringify(details),
    });
  } catch (err) {
    logger.warn({ err }, "audit log failed");
  }
}
