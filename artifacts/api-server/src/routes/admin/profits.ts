// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// ============================================================

import { Router, type IRouter } from "express";
import {
  db,
  settingsTable,
  ordersTable,
  productsTable,
  profitMarginHistoryTable,
  referralsTable,
  transactionsTable,
} from "@workspace/db";
import { eq, isNotNull, and, asc, sum, count, gte, lt } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { audit } from "../../lib/services/auditLog";

const router: IRouter = Router();
const CYCLE_MS = 24 * 60 * 60 * 1000; // 24 ساعة

async function loadSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(settingsTable);
  const m: Record<string, string> = {};
  for (const r of rows) m[r.key] = r.value;
  return m;
}

async function saveSetting(key: string, value: string) {
  const ex = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  if (ex[0]) {
    await db.update(settingsTable).set({ value, updatedAt: new Date() }).where(eq(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}

function getMarginAt(
  t: Date,
  marginHistory: Array<{ changedAt: Date; marginSdg: string }>,
  currentMargin: number,
): number {
  if (marginHistory.length === 0) return currentMargin;
  // ابدأ بأول هامش مسجَّل (للطلبات قبل أول تغيير)
  let margin = Number(marginHistory[0].marginSdg);
  for (const h of marginHistory) {
    if (new Date(h.changedAt).getTime() <= t.getTime()) {
      margin = Number(h.marginSdg);
    }
  }
  return margin;
}

// حساب الأرباح لنافذة زمنية محددة
async function calcProfitsForWindow(from: Date, to: Date) {
  const settings = await loadSettings();
  const currentMargin = Number(settings.profitMarginSdg ?? "0");

  const marginHistory = await db
    .select()
    .from(profitMarginHistoryTable)
    .orderBy(asc(profitMarginHistoryTable.changedAt));

  // طلبات SMM المكتملة في النافذة
  const orders = await db
    .select({
      id: ordersTable.id,
      createdAt: ordersTable.createdAt,
      notes: ordersTable.notes,
    })
    .from(ordersTable)
    .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .where(
      and(
        eq(ordersTable.status, "completed"),
        isNotNull((productsTable as any).smmServiceId),
        gte(ordersTable.createdAt, from),
        lt(ordersTable.createdAt, to),
      ),
    )
    .orderBy(asc(ordersTable.createdAt));

  // ربح كل طلب = (هامش / 1000) × الكمية  — حساب دقيق
  let grossProfit = 0;
  const marginGroupMap = new Map<
    number,
    { orderCount: number; quantityTotal: number; profitSdg: number }
  >();

  for (const order of orders) {
    const match = (order.notes ?? "").match(/الكمية[:\s]+(\d+)/);
    const qty = match ? Number(match[1]) : 1;
    const margin = getMarginAt(new Date(order.createdAt), marginHistory, currentMargin);
    const profit = (margin / 1000) * qty;
    grossProfit += profit;

    const g = marginGroupMap.get(margin) ?? { orderCount: 0, quantityTotal: 0, profitSdg: 0 };
    g.orderCount++;
    g.quantityTotal += qty;
    g.profitSdg += profit;
    marginGroupMap.set(margin, g);
  }

  const periods = [...marginGroupMap.entries()].map(([margin, g]) => ({
    label: `هامش ${margin.toLocaleString("en-US")} ج.س لكل 1000`,
    marginSdg: margin,
    orderCount: g.orderCount,
    quantityTotal: Math.round(g.quantityTotal),
    profitSdg: Math.round(g.profitSdg * 100) / 100,
  }));

  // تكلفة الإحالات في النافذة (معاملات من نوع "referral")
  const refTxRows = await db
    .select({ total: sum(transactionsTable.amount) })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.type, "referral"),
        gte(transactionsTable.createdAt, from),
        lt(transactionsTable.createdAt, to),
      ),
    );
  const referralCost = Number(refTxRows[0]?.total ?? 0);

  // عدد الإحالات الجديدة في النافذة
  const refCountRows = await db
    .select({ total: count(referralsTable.id) })
    .from(referralsTable)
    .where(and(gte(referralsTable.createdAt, from), lt(referralsTable.createdAt, to)));
  const referralCount = Number(refCountRows[0]?.total ?? 0);

  const grossRounded = Math.round(grossProfit * 100) / 100;
  const refCostRounded = Math.round(referralCost * 100) / 100;
  const netProfit = Math.round((grossRounded - refCostRounded) * 100) / 100;

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    periods,
    totalOrders: orders.length,
    grossProfit: grossRounded,
    referralCost: refCostRounded,
    referralCount,
    netProfit,
    isLoss: netProfit < 0,
    currentMarginSdg: currentMargin,
    calculatedAt: new Date().toISOString(),
  };
}

// GET /admin/profits — معلومات الدورة الحالية + snapshot
router.get("/admin/profits", requireAdmin, async (_req, res) => {
  try {
    const settings = await loadSettings();
    const now = new Date();

    // تهيئة بداية الدورة إذا لم تُضبط بعد
    let cycleStartAt: Date;
    if (!settings.profitCycleStartAt) {
      cycleStartAt = new Date(now.getTime() - CYCLE_MS);
      await saveSetting("profitCycleStartAt", cycleStartAt.toISOString());
    } else {
      cycleStartAt = new Date(settings.profitCycleStartAt);
    }

    const cycleEndAt = new Date(cycleStartAt.getTime() + CYCLE_MS);
    const remainingMs = Math.max(0, cycleEndAt.getTime() - now.getTime());
    const canReveal = remainingMs === 0;

    let snapshot: any = null;
    try {
      if (settings.profitSnapshotData && settings.profitSnapshotData.trim()) {
        snapshot = JSON.parse(settings.profitSnapshotData);
      }
    } catch {}

    res.json({
      hasSnapshot: !!snapshot,
      snapshot,
      cycleStartAt: cycleStartAt.toISOString(),
      cycleEndAt: cycleEndAt.toISOString(),
      remainingMs,
      canReveal,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// POST /admin/profits/reveal — كشف أرباح الدورة المكتملة وتقديم الجديدة فوراً
router.post("/admin/profits/reveal", requireAdmin, async (_req, res) => {
  try {
    const settings = await loadSettings();
    const now = new Date();

    let cycleStartAt: Date;
    if (!settings.profitCycleStartAt) {
      cycleStartAt = new Date(now.getTime() - CYCLE_MS);
    } else {
      cycleStartAt = new Date(settings.profitCycleStartAt);
    }

    const cycleEndAt = new Date(cycleStartAt.getTime() + CYCLE_MS);

    if (now < cycleEndAt) {
      res.status(429).json({
        error: "لم تنته الدورة الحالية بعد",
        cycleEndAt: cycleEndAt.toISOString(),
        remainingMs: cycleEndAt.getTime() - now.getTime(),
      });
      return;
    }

    // احسب لنافذة الدورة المنتهية بالضبط
    const data = await calcProfitsForWindow(cycleStartAt, cycleEndAt);

    // قدّم الدورة الجديدة فوراً من نهاية القديمة بالضبط
    await saveSetting("profitCycleStartAt", cycleEndAt.toISOString());
    await saveSetting("profitSnapshotData", JSON.stringify(data));
    await saveSetting("profitSnapshotAt", now.toISOString());

    await audit(
      "admin",
      "profit_reveal",
      "settings",
      null,
      `gross=${data.grossProfit} referral=${data.referralCost} net=${data.netProfit} loss=${data.isLoss}`,
    );

    res.json({ ok: true, snapshot: data });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل حساب الأرباح" });
  }
});

// POST /admin/profits/clear — مسح البيانات بعد الاطلاع عليها
router.post("/admin/profits/clear", requireAdmin, async (_req, res) => {
  try {
    await saveSetting("profitSnapshotData", "");
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل المسح" });
  }
});

export default router;
