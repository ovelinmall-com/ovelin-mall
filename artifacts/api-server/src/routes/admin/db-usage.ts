import { Router, type IRouter } from "express";
import { db, settingsTable, ordersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

const CYCLE_DAYS = 20;
const CYCLE_KEY = "db_usage_cycle_start_at";
const LIMIT_KEY = "db_usage_limit_mb";
const LAST_PURGE_KEY = "db_usage_last_purge_count";
const DEFAULT_LIMIT_MB = 5120; // 5GB — قابل للتعديل من الواجهة

async function getSetting(key: string): Promise<string | null> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, key));
  return rows[0]?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

/**
 * يفحص لو دورة الـ 20 يوم خلصت، ولو خلصت: يحذف كل الطلبات فعليًا
 * (تصفير كامل — عملية لا رجعة فيها، بطلب صريح ومؤكد من صاحب المشروع)
 * ثم يبدأ دورة جديدة من لحظة الحذف. هذه الدالة تُستدعى من مسار الـ API
 * وأيضًا من مجدوّل الخلفية في index.ts، عشان التفريغ يحصل تلقائيًا
 * حتى لو محدش فاتح لوحة الأدمن وقت انتهاء الدورة.
 */
export async function checkAndPurgeOrdersCycle(): Promise<{ purged: boolean; deletedCount?: number }> {
  const cycleMs = CYCLE_DAYS * 24 * 60 * 60 * 1000;
  let cycleStartAtStr = await getSetting(CYCLE_KEY);
  if (!cycleStartAtStr) {
    await setSetting(CYCLE_KEY, new Date().toISOString());
    return { purged: false };
  }
  const cycleStartAt = new Date(cycleStartAtStr);
  const elapsed = Date.now() - cycleStartAt.getTime();
  if (elapsed < cycleMs) return { purged: false };

  // خلصت الدورة → حذف كل الطلبات (تصفير كامل) وبدء دورة جديدة من الآن
  const countRow = await db.select({ c: sql<number>`count(*)::int` }).from(ordersTable);
  const deletedCount = Number(countRow[0]?.c ?? 0);
  await db.delete(ordersTable);
  const now = new Date().toISOString();
  await setSetting(CYCLE_KEY, now);
  await setSetting(LAST_PURGE_KEY, JSON.stringify({ at: now, deletedCount }));
  return { purged: true, deletedCount };
}

// ================================================================
// GET /admin/db-usage — حجم قاعدة البيانات الفعلي + تفاصيل الدورة
// ================================================================
router.get("/admin/db-usage", requireAdmin, async (_req, res) => {
  try {
    // أولًا: تنفيذ التفريغ التلقائي لو الدورة خلصت (نفس الفحص اللي بيحصل في الخلفية)
    const purgeResult = await checkAndPurgeOrdersCycle();

    // الحجم الفعلي لقاعدة البيانات — استعلام مباشر من Postgres، مش تقدير
    const sizeRows = await db.execute<{ bytes: string; table_count: string }>(sql`
      SELECT
        pg_database_size(current_database())::text AS bytes,
        (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public')::text AS table_count
    `);
    const row = (sizeRows as any).rows?.[0] ?? (sizeRows as any)[0];
    const usedBytes = Number(row?.bytes ?? 0);
    const tableCount = Number(row?.table_count ?? 0);

    // أكبر 5 جداول حسب المساحة (تفاصيل الزيادة)
    const topTablesResult = await db.execute<{ table_name: string; size_bytes: string }>(sql`
      SELECT
        relname AS table_name,
        pg_total_relation_size(relid)::text AS size_bytes
      FROM pg_catalog.pg_statio_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 5
    `);
    const topTablesRows = (topTablesResult as any).rows ?? (topTablesResult as any);
    const topTables = (topTablesRows as any[]).map((t) => ({
      name: t.table_name,
      bytes: Number(t.size_bytes ?? 0),
    }));

    // جدول الطلبات تحديدًا — هو اللي بيتفرّغ فعليًا كل دورة، مش القاعدة كاملة
    const ordersCountRow = await db.select({ c: sql<number>`count(*)::int` }).from(ordersTable);
    const ordersCount = Number(ordersCountRow[0]?.c ?? 0);
    const ordersSizeResult = await db.execute<{ size_bytes: string }>(sql`
      SELECT pg_total_relation_size('orders')::text AS size_bytes
    `);
    const ordersSizeRows = (ordersSizeResult as any).rows ?? (ordersSizeResult as any);
    const ordersBytes = Number(ordersSizeRows?.[0]?.size_bytes ?? 0);
    const oldestOrderRow = await db.execute<{ oldest: string | null }>(sql`
      SELECT min(created_at)::text AS oldest FROM orders
    `);
    const oldestOrderRows = (oldestOrderRow as any).rows ?? (oldestOrderRow as any);
    const oldestOrderAt = oldestOrderRows?.[0]?.oldest ?? null;

    // حد المساحة القابل للتعديل
    let limitMb = Number(await getSetting(LIMIT_KEY));
    if (!limitMb || Number.isNaN(limitMb)) {
      limitMb = DEFAULT_LIMIT_MB;
      await setSetting(LIMIT_KEY, String(limitMb));
    }

    // دورة الـ 20 يوم — بعد الفحص أعلاه، القيمة المخزّنة دلوقتي هي بداية الدورة الحالية (سواء اتفرغت أو لسه)
    const cycleStartAtStr = (await getSetting(CYCLE_KEY)) ?? new Date().toISOString();
    const cycleStartAt = new Date(cycleStartAtStr);
    const cycleMs = CYCLE_DAYS * 24 * 60 * 60 * 1000;
    const nextResetAt = new Date(cycleStartAt.getTime() + cycleMs);
    const msElapsed = Date.now() - cycleStartAt.getTime();
    const daysElapsed = Math.floor(msElapsed / (24 * 60 * 60 * 1000));
    const daysRemaining = Math.max(0, CYCLE_DAYS - daysElapsed);
    // ساعات متبقية من اليوم الحالي (عرض أدق قرب نهاية الدورة)
    const msRemainingInCycle = Math.max(0, nextResetAt.getTime() - Date.now());
    const hoursRemaining = Math.floor((msRemainingInCycle % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    // آخر عملية تفريغ فعلية حصلت (للعرض في الواجهة كسجل)
    const lastPurgeRaw = await getSetting(LAST_PURGE_KEY);
    const lastPurge = lastPurgeRaw ? JSON.parse(lastPurgeRaw) : null;

    const usedMb = usedBytes / (1024 * 1024);
    const limitBytes = limitMb * 1024 * 1024;
    const remainingMb = Math.max(0, limitMb - usedMb);
    const percentUsed = limitMb > 0 ? Math.min(100, (usedMb / limitMb) * 100) : 0;

    res.json({
      usedBytes,
      usedMb: Number(usedMb.toFixed(2)),
      limitMb,
      limitBytes,
      remainingMb: Number(remainingMb.toFixed(2)),
      percentUsed: Number(percentUsed.toFixed(1)),
      tableCount,
      topTables,
      ordersCount,
      ordersMb: Number((ordersBytes / (1024 * 1024)).toFixed(2)),
      oldestOrderAt,
      cycleStartAt: cycleStartAt.toISOString(),
      nextResetAt: nextResetAt.toISOString(),
      cycleDays: CYCLE_DAYS,
      daysElapsed,
      daysRemaining,
      hoursRemaining,
      justPurged: purgeResult.purged,
      lastPurge, // { at, deletedCount } | null
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? "فشل جلب بيانات قاعدة البيانات" });
  }
});

// ================================================================
// POST /admin/db-usage/reset-cycle — تصفير يدوي مبكر: يحذف الطلبات فورًا
// ويبدأ دورة جديدة من الآن (نفس فعل التفريغ التلقائي، بس بضغطة يدوية)
// ================================================================
router.post("/admin/db-usage/reset-cycle", requireAdmin, async (_req, res) => {
  const countRow = await db.select({ c: sql<number>`count(*)::int` }).from(ordersTable);
  const deletedCount = Number(countRow[0]?.c ?? 0);
  await db.delete(ordersTable);
  const now = new Date().toISOString();
  await setSetting(CYCLE_KEY, now);
  await setSetting(LAST_PURGE_KEY, JSON.stringify({ at: now, deletedCount }));
  res.json({ cycleStartAt: now, deletedCount });
});

// ================================================================
// PATCH /admin/db-usage/limit — تعديل الحد الأقصى المعروض (ميجابايت)
// ================================================================
router.patch("/admin/db-usage/limit", requireAdmin, async (req, res) => {
  const limitMb = Number(req.body?.limitMb);
  if (!limitMb || limitMb <= 0) {
    res.status(400).json({ error: "قيمة غير صالحة" });
    return;
  }
  await setSetting(LIMIT_KEY, String(limitMb));
  res.json({ limitMb });
});

export default router;
