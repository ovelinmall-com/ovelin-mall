// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { db, productsTable, settingsTable } from "@workspace/db";
import { isNotNull, eq } from "drizzle-orm";
import { logger } from "../logger";

// ⚠️ مفتاح API مكتوب ظاهراً بإرادة صاحب المشروع — لا تنقله أبداً
const SMM_KEY = "0b28edf644be7e4c28874b5e3b2a44a4";
const SMM_URL  = "https://honestsmm.com/api/v2";

// ── الإعدادات ──────────────────────────────────────────────────────────────
// كل 10 ثوانٍ — أقل وقت ممكن دون خطر الحظر من المورد
export const DEFAULT_SYNC_INTERVAL_MS = 10_000;

// ── ذاكرة الأسعار الحية (تُحدَّث مع كل دورة) ───────────────────────────────
// serviceId → rateUSD حي من المورد
let _liveRates: Map<string, number> = new Map();

/**
 * أعطِ السعر الحي (USD) لخدمة معيّنة من آخر جلبة.
 * تُستخدم في endpoint الطلب لضمان الأسعار الحية لحظة الخصم.
 */
export function getLiveServiceRate(smmServiceId: string): number | undefined {
  return _liveRates.get(smmServiceId);
}

// ── مساعدات الحساب ─────────────────────────────────────────────────────────
async function loadPricingSettings(): Promise<{ usdToSdg: number; profitMarginSdg: number }> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    usdToSdg:        Number(map["usdToSdg"]        ?? "800"),
    profitMarginSdg: Number(map["profitMarginSdg"] ?? "0"),
  };
}

/** سعر الوحدة الواحدة بالجنيه السوداني مقرّباً للمئة الأعلى */
function calcSdgPerUnit(rateUsd: number, usdToSdg: number, profitMarginSdg: number): string {
  const raw = rateUsd * usdToSdg + profitMarginSdg;
  const per1000 = Math.ceil(raw / 100) * 100;
  return (per1000 / 1000).toFixed(6);
}

// ── جلب خدمات المورد بدون كاش (دائماً بيانات حية) ──────────────────────────
async function fetchLiveServices(): Promise<Map<string, number>> {
  const body = new URLSearchParams({ key: SMM_KEY, action: "services" });
  const res = await fetch(SMM_URL, {
    method:  "POST",
    body:    body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal:  AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`SMM API responded ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("SMM API returned non-array");

  // Map: serviceId (string) → rate (number)
  const map = new Map<string, number>();
  for (const svc of data) {
    const id   = String(svc.service ?? "").trim();
    const rate = parseFloat(String(svc.rate ?? "0"));
    if (id && !isNaN(rate) && rate > 0) map.set(id, rate);
  }
  return map;
}

// ── دورة المزامنة الرئيسية ───────────────────────────────────────────────────
async function syncOnce(): Promise<void> {
  // 1) جلب كل منتجات SMM من الداتابيز
  const products = await db
    .select()
    .from(productsTable)
    .where(isNotNull(productsTable.smmServiceId));

  if (products.length === 0) return;

  // 2) جلب أسعار المورد الحية
  const liveRates = await fetchLiveServices();

  // ✅ حدّث الذاكرة فوراً حتى تستفيد endpoint الطلبات من الأسعار الجديدة
  _liveRates = liveRates;

  // 3) إعدادات التسعير (سعر الدولار + هامش الربح)
  const { usdToSdg, profitMarginSdg } = await loadPricingSettings();

  let updated = 0;
  let unchanged = 0;

  for (const product of products) {
    const smmId = (product as any).smmServiceId as string | null;
    if (!smmId) continue;

    const liveRate = liveRates.get(smmId);
    if (liveRate === undefined) continue; // الخدمة اختفت من المورد — لا تحذف تلقائياً

    const storedRate  = parseFloat(String((product as any).smmRateUsd ?? "0"));
    const storedPrice = String(product.price ?? "");

    // احسب السعر المتوقع بناءً على إعدادات الأدمن الحالية + سعر المورد الحي
    const expectedPrice = calcSdgPerUnit(liveRate, usdToSdg, profitMarginSdg);

    // قارن سعر المورد بدقة 6 منازل عشرية
    const rateChanged  = Math.abs(liveRate - storedRate) >= 0.000001;
    // قارن السعر المحسوب — يتغيّر إذا تغيّر سعر الدولار أو هامش الربح في الإعدادات
    const priceChanged = expectedPrice !== storedPrice;

    if (!rateChanged && !priceChanged) {
      unchanged++;
      continue;
    }

    // سعر المورد أو إعدادات الأدمن تغيّرت — حدّث الداتابيز
    await db
      .update(productsTable)
      .set({
        smmRateUsd: liveRate.toFixed(6),
        price:      expectedPrice,
      } as any)
      .where(eq(productsTable.id, product.id));

    logger.info(
      {
        productId:    product.id,
        smmServiceId: smmId,
        oldRateUsd:   storedRate.toFixed(6),
        newRateUsd:   liveRate.toFixed(6),
        newPriceSdg:  expectedPrice,
        usdToSdg,
        profitMarginSdg,
        reason: rateChanged ? "provider_rate_changed" : "admin_settings_changed",
      },
      "💱 SMM price updated",
    );
    updated++;
  }

  if (updated > 0) {
    logger.info(
      { updated, unchanged, usdToSdg, profitMarginSdg },
      `✅ SMM price sync done — ${updated} updated, ${unchanged} unchanged`,
    );
  }
  // لا نطبع شيئاً إذا لم يتغيّر شيء — نتجنب إزعاج اللوج
}

// ── إدارة دورة الحياة ────────────────────────────────────────────────────────
let _handle: NodeJS.Timeout | null = null;

export function startSmmPriceSyncWorker(intervalMs = DEFAULT_SYNC_INTERVAL_MS): void {
  if (_handle) return; // لا تشغّل نسختين

  logger.info(
    { intervalMs },
    `🔄 SMM price sync worker started — syncing every ${intervalMs / 1000}s`,
  );

  // دورة أولى فورية عند بدء التشغيل
  void syncOnce().catch((err) =>
    logger.warn({ err }, "SMM price sync: initial run failed"),
  );

  _handle = setInterval(() => {
    void syncOnce().catch((err) =>
      logger.warn({ err }, "SMM price sync: periodic run failed"),
    );
  }, intervalMs);

  _handle.unref?.(); // لا يمنع إغلاق العملية إذا طُلب ذلك
}

export function stopSmmPriceSyncWorker(): void {
  if (_handle) {
    clearInterval(_handle);
    _handle = null;
    logger.info("🛑 SMM price sync worker stopped");
  }
}
