// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// ============================================================

import { Router, type IRouter } from "express";
import { db, settingsTable, ordersTable, productsTable, profitMarginHistoryTable, referralsTable } from "@workspace/db";
import { eq, isNotNull, and, asc, sum, count } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { audit } from "../../lib/services/auditLog";

const router: IRouter = Router();
const SNAPSHOT_MS = 12 * 60 * 60 * 1000; // 12 hours

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

async function calcProfits() {
  const settings = await loadSettings();
  const currentMargin = Number(settings.profitMarginSdg ?? "0");

  const marginHistory = await db
    .select()
    .from(profitMarginHistoryTable)
    .orderBy(asc(profitMarginHistoryTable.changedAt));

  const allOrders = await db
    .select({
      id: ordersTable.id,
      createdAt: ordersTable.createdAt,
      status: ordersTable.status,
    })
    .from(ordersTable)
    .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .where(
      and(
        eq(ordersTable.status, "completed"),
        isNotNull((productsTable as any).smmServiceId),
      ),
    )
    .orderBy(asc(ordersTable.createdAt));

  // Build time periods from margin history
  // Each entry records a NEW margin value starting at changedAt
  const periods: Array<{
    label: string;
    marginSdg: number;
    startAt: Date | null;
    endAt: Date | null;
  }> = [];

  if (marginHistory.length === 0) {
    // No history — single period with current margin
    periods.push({ label: `الهامش الحالي`, marginSdg: currentMargin, startAt: null, endAt: null });
  } else {
    // Period 0: before first recorded change — use first recorded margin retroactively
    periods.push({
      label: `قبل ${new Date(marginHistory[0].changedAt).toLocaleDateString("ar-SD")}`,
      marginSdg: Number(marginHistory[0].marginSdg),
      startAt: null,
      endAt: marginHistory[0].changedAt,
    });
    // Middle periods
    for (let i = 0; i < marginHistory.length - 1; i++) {
      const m = Number(marginHistory[i].marginSdg);
      periods.push({
        label: `هامش ${m.toLocaleString("en-US")},00 ج.س`,
        marginSdg: m,
        startAt: marginHistory[i].changedAt,
        endAt: marginHistory[i + 1].changedAt,
      });
    }
    // Last period: from last change to now
    const last = marginHistory[marginHistory.length - 1];
    periods.push({
      label: `الهامش الحالي (${currentMargin.toLocaleString("en-US")},00 ج.س)`,
      marginSdg: currentMargin,
      startAt: last.changedAt,
      endAt: null,
    });
  }

  // Count orders per period
  const periodResults = periods.map((p) => {
    const orders = allOrders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      const from = p.startAt ? new Date(p.startAt).getTime() : 0;
      const to = p.endAt ? new Date(p.endAt).getTime() : Infinity;
      return t >= from && t < to;
    });
    const count = orders.length;
    const profitSdg = count * p.marginSdg;
    return {
      label: p.label,
      marginSdg: p.marginSdg,
      startAt: p.startAt ? new Date(p.startAt).toISOString() : null,
      endAt: p.endAt ? new Date(p.endAt).toISOString() : null,
      orderCount: count,
      profitSdg,
    };
  });

  // Remove empty periods with no orders
  const nonEmpty = periodResults.filter((p) => p.orderCount > 0 || periodResults.length === 1);

  const totalOrders = allOrders.length;
  const totalProfit = periodResults.reduce((s, p) => s + p.profitSdg, 0);

  // Referral stats
  const refStats = await db
    .select({
      total: count(referralsTable.id),
      totalEarned: sum(referralsTable.earned),
      totalBonus: sum(referralsTable.signupBonus),
    })
    .from(referralsTable);

  const referralCount = Number(refStats[0]?.total ?? 0);
  const referralEarned = Number(refStats[0]?.totalEarned ?? 0);
  const referralBonus = Number(refStats[0]?.totalBonus ?? 0);
  const referralTotal = referralEarned + referralBonus;

  return {
    periods: nonEmpty,
    totalOrders,
    totalProfit,
    currentMarginSdg: currentMargin,
    referrals: {
      count: referralCount,
      totalEarned: referralEarned,
      totalBonus: referralBonus,
      totalPaid: referralTotal,
    },
    calculatedAt: new Date().toISOString(),
  };
}

// GET /admin/profits — return last snapshot + time info
router.get("/admin/profits", requireAdmin, async (_req, res) => {
  try {
    const settings = await loadSettings();
    const lastAt = settings.profitSnapshotAt ? new Date(settings.profitSnapshotAt) : null;
    const now = new Date();
    const nextAllowedAt = lastAt ? new Date(lastAt.getTime() + SNAPSHOT_MS) : now;
    const remainingMs = Math.max(0, nextAllowedAt.getTime() - now.getTime());
    const canSnapshot = remainingMs === 0;

    let snapshot: any = null;
    try {
      if (settings.profitSnapshotData) snapshot = JSON.parse(settings.profitSnapshotData);
    } catch {}

    res.json({
      hasSnapshot: !!snapshot,
      snapshot,
      snapshotAt: lastAt ? lastAt.toISOString() : null,
      nextAllowedAt: nextAllowedAt.toISOString(),
      remainingMs,
      canSnapshot,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// POST /admin/profits/snapshot — take a new snapshot (12h gate)
router.post("/admin/profits/snapshot", requireAdmin, async (_req, res) => {
  try {
    const settings = await loadSettings();
    const lastAt = settings.profitSnapshotAt ? new Date(settings.profitSnapshotAt) : null;
    const now = new Date();

    if (lastAt) {
      const nextAllowedAt = new Date(lastAt.getTime() + SNAPSHOT_MS);
      const remainingMs = nextAllowedAt.getTime() - now.getTime();
      if (remainingMs > 0) {
        res.status(429).json({
          error: "يجب الانتظار 12 ساعة بين كل تحديث",
          nextAllowedAt: nextAllowedAt.toISOString(),
          remainingMs,
        });
        return;
      }
    }

    const data = await calcProfits();
    const nextAllowedAt = new Date(now.getTime() + SNAPSHOT_MS);

    await saveSetting("profitSnapshotAt", now.toISOString());
    await saveSetting("profitSnapshotData", JSON.stringify(data));

    await audit("admin", "profit_snapshot", "settings", null,
      `totalOrders=${data.totalOrders} totalProfit=${data.totalProfit}`);

    res.json({
      ok: true,
      snapshot: data,
      snapshotAt: now.toISOString(),
      nextAllowedAt: nextAllowedAt.toISOString(),
      remainingMs: SNAPSHOT_MS,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل حساب الأرباح" });
  }
});

export default router;
