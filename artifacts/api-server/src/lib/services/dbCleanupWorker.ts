// ============================================================
// DB Cleanup Worker — تنظيف تلقائي دوري لمنع امتلاء قاعدة البيانات
//
// دورتان مستقلتان:
//  1. تنظيف يومي (24 ساعة)  — بيانات مؤقتة / منتهية الصلاحية
//  2. تفريغ الطلبات (20 يوم) — حذف الطلبات المكتملة/الملغاة القديمة
//
// الطلبات pending / processing لا تُمس أبداً مهما كان عمرها
// ============================================================

import { logger } from "../logger";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const CLEANUP_INTERVAL_MS      = 24 * 60 * 60 * 1000;       // 24 ساعة
const ORDERS_PURGE_INTERVAL_MS = 20 * 24 * 60 * 60 * 1000;  // 20 يوم

// ─── التنظيف اليومي ───────────────────────────────────────────
async function runCleanup(): Promise<void> {
  logger.info("🧹 بدء التنظيف الدوري لقاعدة البيانات...");
  const results: Record<string, number> = {};

  try {
    const r = await db.execute(
      sql`DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days'`
    );
    results["audit_log (>90d)"] = (r as any).rowCount ?? 0;
  } catch (e) { logger.warn({ e }, "فشل تنظيف audit_log"); }

  try {
    const r = await db.execute(
      sql`DELETE FROM spin_history WHERE created_at < NOW() - INTERVAL '90 days'`
    );
    results["spin_history (>90d)"] = (r as any).rowCount ?? 0;
  } catch (e) { logger.warn({ e }, "فشل تنظيف spin_history"); }

  try {
    const r = await db.execute(
      sql`DELETE FROM email_verifications WHERE expires_at < NOW()`
    );
    results["email_verifications (expired)"] = (r as any).rowCount ?? 0;
  } catch (e) { logger.warn({ e }, "فشل تنظيف email_verifications"); }

  try {
    const r = await db.execute(
      sql`DELETE FROM live_viewers WHERE last_ping_at < NOW() - INTERVAL '30 minutes'`
    );
    results["live_viewers (stale)"] = (r as any).rowCount ?? 0;
  } catch (e) { logger.warn({ e }, "فشل تنظيف live_viewers"); }

  try {
    const r = await db.execute(
      sql`DELETE FROM cart_items WHERE updated_at < NOW() - INTERVAL '30 days'`
    );
    results["cart_items (>30d)"] = (r as any).rowCount ?? 0;
  } catch (e) { logger.warn({ e }, "فشل تنظيف cart_items"); }

  const total = Object.values(results).reduce((a, b) => a + b, 0);
  logger.info({ results }, `🧹 انتهى التنظيف اليومي — ${total} سجل محذوف`);
}

// ─── تفريغ الطلبات كل 20 يوم ─────────────────────────────────
async function runOrdersPurge(): Promise<void> {
  logger.info("🗑️  بدء تفريغ الطلبات القديمة (كل 20 يوم)...");

  try {
    const r = await db.execute(sql`
      DELETE FROM orders
      WHERE status IN ('completed', 'cancelled', 'refunded', 'rejected', 'failed')
        AND created_at < NOW() - INTERVAL '365 days'
    `);
    const deleted = (r as any).rowCount ?? 0;
    logger.info(`🗑️  تفريغ الطلبات انتهى — ${deleted} طلب محذوف (مكتمل/ملغى أقدم من سنة)`);
  } catch (e) {
    logger.warn({ e }, "فشل تفريغ الطلبات القديمة");
  }
}

// ─── تشغيل الـ Workers ────────────────────────────────────────
export function startDbCleanupWorker(): void {
  // 1. التنظيف اليومي — أول تشغيل بعد 5 دقائق من الـ startup
  const firstCleanup = setTimeout(() => {
    runCleanup().catch((e) => logger.warn({ e }, "فشل التنظيف الأول"));
  }, 5 * 60 * 1000);
  firstCleanup.unref?.();

  const cleanupHandle = setInterval(() => {
    runCleanup().catch((e) => logger.warn({ e }, "فشل التنظيف الدوري"));
  }, CLEANUP_INTERVAL_MS);
  cleanupHandle.unref?.();

  // 2. تفريغ الطلبات — أول تشغيل بعد 10 دقائق ثم كل 20 يوم
  const firstPurge = setTimeout(() => {
    runOrdersPurge().catch((e) => logger.warn({ e }, "فشل تفريغ الطلبات الأول"));
  }, 10 * 60 * 1000);
  firstPurge.unref?.();

  const purgeHandle = setInterval(() => {
    runOrdersPurge().catch((e) => logger.warn({ e }, "فشل تفريغ الطلبات الدوري"));
  }, ORDERS_PURGE_INTERVAL_MS);
  purgeHandle.unref?.();

  logger.info(
    "🧹 DB Cleanup Worker شغّال\n" +
    "   • تنظيف يومي       — أول تشغيل بعد 5  دقائق ثم كل 24 ساعة\n" +
    "   • تفريغ الطلبات    — أول تشغيل بعد 10 دقائق ثم كل 20 يوم\n" +
    "   • الطلبات pending/processing لا تُحذف أبداً"
  );
}
