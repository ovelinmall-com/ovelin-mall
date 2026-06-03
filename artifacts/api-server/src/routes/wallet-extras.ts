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

import { Router, type IRouter } from "express";
import {
  db,
  transactionsTable,
  usersTable,
  walletPotsTable,
  walletPotMovesTable,
  ordersTable,
  productsTable,
} from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import {
  adjustBalance,
  safeDebit,
  recordTransaction,
  InsufficientFundsError,
} from "../lib/services/wallet";
import { audit } from "../lib/services/auditLog";
import { getAiClient, isAiConfigured } from "../lib/integrations/aiClient";

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────────
//  Currency ticker (cached)
// ─────────────────────────────────────────────────────────────────

let tickerCache: { ts: number; data: any } | null = null;

router.get("/wallet/ticker", async (_req, res) => {
  try {
    if (tickerCache && Date.now() - tickerCache.ts < 60000) {
      res.json(tickerCache.data);
      return;
    }
    const out: any = {
      usdtSar: 3.75,
      usdtUsd: 1.0,
      btcUsd: 0,
      ethUsd: 0,
      updatedAt: new Date().toISOString(),
      source: "fallback",
    };
    try {
      const r = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=tether,bitcoin,ethereum&vs_currencies=usd,sar",
        { signal: AbortSignal.timeout(5000) },
      );
      if (r.ok) {
        const j: any = await r.json();
        if (j?.tether?.sar) out.usdtSar = Number(j.tether.sar);
        if (j?.tether?.usd) out.usdtUsd = Number(j.tether.usd);
        if (j?.bitcoin?.usd) out.btcUsd = Number(j.bitcoin.usd);
        if (j?.ethereum?.usd) out.ethUsd = Number(j.ethereum.usd);
        out.source = "coingecko";
      }
    } catch {}
    tickerCache = { ts: Date.now(), data: out };
    res.json(out);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  Username lookup (for P2P transfer)
// ─────────────────────────────────────────────────────────────────

router.get("/wallet/lookup/:username", requireUser, async (req, res) => {
  try {
    const username = String(req.params.username || "").trim();
    if (!username) {
      res.status(400).json({ error: "اسم المستخدم مطلوب" });
      return;
    }
    const rows = await db
      .select({ id: usersTable.id, username: usersTable.username, avatarUrl: usersTable.avatarUrl })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);
    if (!rows.length) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    const u = rows[0];
    res.json({ id: u.id, username: u.username, avatarUrl: u.avatarUrl ?? null });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  Visual analytics — pie + bar + percentages
// ─────────────────────────────────────────────────────────────────

router.get("/wallet/analytics", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Daily deposits vs spend (last `days` days)
    const dailyRows = await db.execute(
      sql.raw(`
        SELECT
          to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
          COALESCE(SUM(CASE WHEN amount::numeric > 0 AND status = 'completed' THEN amount::numeric ELSE 0 END), 0)::text as inflow,
          COALESCE(SUM(CASE WHEN amount::numeric < 0 AND status = 'completed' THEN -amount::numeric ELSE 0 END), 0)::text as outflow
        FROM transactions
        WHERE user_id = ${user.id} AND created_at >= '${since.toISOString()}'
        GROUP BY 1
        ORDER BY 1
      `),
    );
    const dailyList = ((dailyRows as any).rows ?? dailyRows) as any[];

    // Spend by category (orders in window)
    const catRows = await db
      .select({
        category: productsTable.category,
        total: sql<string>`coalesce(sum(${ordersTable.finalPrice}::numeric), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(ordersTable)
      .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
      .where(and(eq(ordersTable.userId, user.id), gte(ordersTable.createdAt, since)))
      .groupBy(productsTable.category);

    // Type breakdown
    const typeRows = await db
      .select({
        type: transactionsTable.type,
        total: sql<string>`coalesce(sum(abs(${transactionsTable.amount}::numeric)), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactionsTable)
      .where(and(eq(transactionsTable.userId, user.id), gte(transactionsTable.createdAt, since)))
      .groupBy(transactionsTable.type);

    // Totals + percentages
    const totalIn = dailyList.reduce((a, d) => a + Number(d.inflow || 0), 0);
    const totalOut = dailyList.reduce((a, d) => a + Number(d.outflow || 0), 0);
    const balance = Number(user.balance ?? 0);
    const cashback = Number(user.cashbackBalance ?? 0);
    const totalSpent = Number(user.totalSpent ?? 0);

    // Savings rate = (inflow - outflow) / inflow
    const savingsRate = totalIn > 0 ? Math.max(0, ((totalIn - totalOut) / totalIn) * 100) : 0;
    // Cashback rate = cashback / totalSpent
    const cashbackRate = totalSpent > 0 ? (cashback / totalSpent) * 100 : 0;
    // Spend ratio (how much of inflow you spent)
    const spendRatio = totalIn > 0 ? Math.min(100, (totalOut / totalIn) * 100) : 0;

    res.json({
      days,
      daily: dailyList.map((d: any) => ({
        day: d.day,
        inflow: Number(d.inflow || 0),
        outflow: Number(d.outflow || 0),
      })),
      byCategory: catRows.map((r) => ({
        category: r.category ?? "أخرى",
        total: Number(r.total || 0),
        count: Number(r.count || 0),
      })),
      byType: typeRows.map((r) => ({
        type: r.type,
        total: Number(r.total || 0),
        count: Number(r.count || 0),
      })),
      totals: {
        inflow: totalIn,
        outflow: totalOut,
        net: totalIn - totalOut,
        balance,
        cashback,
        totalSpent,
      },
      percentages: {
        savingsRate: Number(savingsRate.toFixed(1)),
        cashbackRate: Number(cashbackRate.toFixed(1)),
        spendRatio: Number(spendRatio.toFixed(1)),
      },
    });
  } catch (err: any) {
    console.error("analytics error", err);
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  AI insights (text tips) — uses analytics data
// ─────────────────────────────────────────────────────────────────

router.get("/wallet/insights", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Build a quick summary
    const txs = await db
      .select({
        type: transactionsTable.type,
        total: sql<string>`coalesce(sum(${transactionsTable.amount}::numeric), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, user.id),
          gte(transactionsTable.createdAt, since),
          eq(transactionsTable.status, "completed"),
        ),
      )
      .groupBy(transactionsTable.type);

    const cats = await db
      .select({
        category: productsTable.category,
        total: sql<string>`coalesce(sum(${ordersTable.finalPrice}::numeric), 0)::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(ordersTable)
      .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
      .where(and(eq(ordersTable.userId, user.id), gte(ordersTable.createdAt, since)))
      .groupBy(productsTable.category);

    const balance = Number(user.balance ?? 0);
    const cashback = Number(user.cashbackBalance ?? 0);
    const totalSpent30 = cats.reduce((a, c) => a + Number(c.total || 0), 0);

    // Heuristic tips fallback (always available)
    const tips: string[] = [];
    if (balance < 10) tips.push("⚠️ رصيدك منخفض جداً، فكّر في شحن المحفظة لتفادي تعطّل طلباتك.");
    if (cashback >= 5) tips.push(`💰 لديك $${cashback.toFixed(2)} كاش باك جاهز للاستخدام في طلبك القادم.`);
    if (totalSpent30 > 100) tips.push(`📈 إنفاقك خلال 30 يوم: $${totalSpent30.toFixed(2)} — أنت زبون VIP نشط!`);
    if (totalSpent30 === 0) tips.push("🛒 لم تطلب شيئاً هذا الشهر، تصفّح العروض والفئات الجديدة.");
    if (cats.length > 0) {
      const top = cats.reduce((a, b) => (Number(a.total) > Number(b.total) ? a : b));
      tips.push(`🎯 الفئة الأكثر إنفاقاً: ${top.category} (${Number(top.total).toFixed(2)}).`);
    }

    let aiTips: string[] = [];
    if (isAiConfigured()) {
      try {
        const summary = {
          balance, cashback, totalSpent30,
          byType: txs.map(t => ({ type: t.type, total: Number(t.total), count: Number(t.count) })),
          byCategory: cats.map(c => ({ category: c.category, total: Number(c.total), count: Number(c.count) })),
        };
        const r = await Promise.race([
          getAiClient().chat.completions.create({
            model: "gpt-5-nano",
            max_completion_tokens: 380,
            messages: [
              { role: "system", content: "أنت محلل مالي ذكي لمحفظة OVELIN. أنشئ من 3 إلى 5 نصائح قصيرة بالعربية الفصحى، كل نصيحة سطر واحد، بدون ترقيم. أضف الإيموجي المناسب في بداية كل نصيحة. كن دقيقاً ومحدّداً بالأرقام، وتجنّب النصائح العامة." },
              { role: "user", content: "ملخّص محفظتي خلال 30 يوماً:\n" + JSON.stringify(summary, null, 2) },
            ],
          }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000)),
        ]);
        const out = (r as any).choices[0]?.message?.content ?? "";
        aiTips = out.split("\n").map((s: string) => s.trim()).filter((s: string) => s.length > 0).slice(0, 5);
      } catch (e: any) {
        // Fall back to heuristic tips
      }
    }

    res.json({
      aiEnabled: isAiConfigured(),
      tips: aiTips.length > 0 ? aiTips : tips,
      heuristicTips: tips,
      totalSpent30,
      balance,
      cashback,
    });
  } catch (err: any) {
    console.error("insights error", err);
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  Wallet Health Score — composite metrics card
// ─────────────────────────────────────────────────────────────────

router.get("/wallet/health", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const now = Date.now();
    const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const since90 = new Date(now - 90 * 24 * 60 * 60 * 1000);

    const balance = Number(user.balance ?? 0);
    const cashback = Number(user.cashbackBalance ?? 0);
    const totalSpent = Number(user.totalSpent ?? 0);

    // VIP progression (mirrors logic from /wallet)
    const TIERS = [
      { name: "Bronze", min: 0, cashback: 1 },
      { name: "Silver", min: 100, cashback: 2 },
      { name: "Gold", min: 500, cashback: 4 },
      { name: "Platinum", min: 2000, cashback: 6 },
      { name: "Diamond", min: 5000, cashback: 10 },
    ];
    let cur = TIERS[0];
    let next: typeof TIERS[number] | null = null;
    for (let i = 0; i < TIERS.length; i++) {
      if (totalSpent >= TIERS[i].min) {
        cur = TIERS[i];
        next = TIERS[i + 1] ?? null;
      }
    }
    const vipProgressPct = next
      ? Math.min(100, Math.round(((totalSpent - cur.min) / (next.min - cur.min)) * 100))
      : 100;
    const vipNeeded = next ? Math.max(0, next.min - totalSpent) : 0;

    // 30-day spend (orders)
    const spent30Row = await db
      .select({
        s: sql<string>`coalesce(sum(${ordersTable.finalPrice}::numeric), 0)::text`,
        c: sql<number>`count(*)::int`,
      })
      .from(ordersTable)
      .where(
        and(eq(ordersTable.userId, user.id), gte(ordersTable.createdAt, since30)),
      );
    const spent30 = Number(spent30Row[0]?.s ?? 0);
    const orders30 = Number(spent30Row[0]?.c ?? 0);

    const spent90Row = await db
      .select({
        s: sql<string>`coalesce(sum(${ordersTable.finalPrice}::numeric), 0)::text`,
      })
      .from(ordersTable)
      .where(
        and(eq(ordersTable.userId, user.id), gte(ordersTable.createdAt, since90)),
      );
    const spent90 = Number(spent90Row[0]?.s ?? 0);

    // Pots distribution
    const potsRows = await db
      .select({
        s: sql<string>`coalesce(sum(${walletPotsTable.balance}::numeric), 0)::text`,
        c: sql<number>`count(*)::int`,
      })
      .from(walletPotsTable)
      .where(eq(walletPotsTable.userId, user.id));
    const inPots = Number(potsRows[0]?.s ?? 0);
    const potsCount = Number(potsRows[0]?.c ?? 0);

    // Pending transactions = "in flight"
    const pendingRow = await db
      .select({
        s: sql<string>`coalesce(sum(abs(amount::numeric)), 0)::text`,
        c: sql<number>`count(*)::int`,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, user.id),
          eq(transactionsTable.status, "pending"),
        ),
      );
    const pending = Number(pendingRow[0]?.s ?? 0);
    const pendingCount = Number(pendingRow[0]?.c ?? 0);

    // ─── Composite Health Score ──────────────────────────────────
    let score = 50;
    // Balance buffer (covers ≥2 weeks of spend) — up to +25
    if (spent30 > 0) {
      const ratio = balance / Math.max(1, spent30 / 2);
      score += Math.min(25, Math.round(ratio * 12));
    } else if (balance > 0) {
      score += 15;
    } else {
      score -= 20;
    }
    // Saving via pots — up to +15
    if (inPots > 0) score += Math.min(15, Math.round((inPots / Math.max(1, balance + inPots)) * 30));
    // Cashback growth — up to +5
    if (cashback > 1) score += Math.min(5, Math.round(cashback));
    // Activity (recent orders) — up to +10
    if (orders30 > 0) score += Math.min(10, orders30);
    // Pending congestion penalty — up to -10
    if (pendingCount > 2) score -= Math.min(10, pendingCount * 2);
    // VIP bonus — up to +5
    score += Math.min(5, ["Bronze","Silver","Gold","Platinum","Diamond"].indexOf(cur.name));
    score = Math.max(0, Math.min(100, score));

    const grade =
      score >= 85 ? "ممتاز" : score >= 70 ? "جيد جداً" : score >= 50 ? "مقبول" : score >= 30 ? "ضعيف" : "حرج";

    // Forecast next 30d spending using 90-day average
    const dailyAvg90 = spent90 / 90;
    const forecast30 = Math.round(dailyAvg90 * 30 * 100) / 100;
    const burnDays = dailyAvg90 > 0 ? Math.floor(balance / dailyAvg90) : null;

    // Distribution breakdown (free / pots / pending)
    const totalFunds = balance + inPots + pending + cashback;
    const distribution = [
      { key: "free", label: "متاح في المحفظة", value: Number(balance.toFixed(2)), color: "#ec4899" },
      { key: "pots", label: "محفوظ في الجِرار", value: Number(inPots.toFixed(2)), color: "#a855f7" },
      { key: "pending", label: "قيد المعالجة", value: Number(pending.toFixed(2)), color: "#f59e0b" },
      { key: "cashback", label: "كاش باك", value: Number(cashback.toFixed(2)), color: "#10b981" },
    ];

    res.json({
      score,
      grade,
      vip: {
        current: cur.name,
        cashbackPct: cur.cashback,
        next: next?.name ?? null,
        nextCashbackPct: next?.cashback ?? null,
        progressPct: vipProgressPct,
        needed: vipNeeded,
        totalSpent,
      },
      forecast: {
        next30: forecast30,
        dailyAvg: Math.round(dailyAvg90 * 100) / 100,
        spent30,
        spent90,
        orders30,
        burnDays,
      },
      pots: {
        inPots,
        count: potsCount,
      },
      pending: {
        amount: pending,
        count: pendingCount,
      },
      distribution,
      totalFunds: Number(totalFunds.toFixed(2)),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  Statement (range) — used by client to render printable PDF
// ─────────────────────────────────────────────────────────────────

router.get("/wallet/statement", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const from = req.query.from
      ? new Date(String(req.query.from))
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const list = await db
      .select()
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, user.id),
          gte(transactionsTable.createdAt, from),
        ),
      )
      .orderBy(desc(transactionsTable.createdAt));
    const filtered = list.filter((t) => new Date(t.createdAt as any) <= to);

    let totalIn = 0;
    let totalOut = 0;
    for (const t of filtered) {
      const a = Number(t.amount);
      if (a > 0 && t.status === "completed") totalIn += a;
      if (a < 0 && t.status === "completed") totalOut += -a;
    }
    res.json({
      user: { username: user.username, email: user.email, vipLevel: user.vipLevel },
      from: from.toISOString(),
      to: to.toISOString(),
      transactions: filtered,
      totals: { inflow: totalIn, outflow: totalOut, net: totalIn - totalOut },
      issuedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─────────────────────────────────────────────────────────────────
//  Wallet pots (sub-wallets / savings)
// ─────────────────────────────────────────────────────────────────

router.get("/wallet/pots", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const list = await db
      .select()
      .from(walletPotsTable)
      .where(eq(walletPotsTable.userId, user.id))
      .orderBy(desc(walletPotsTable.createdAt));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/wallet/pots", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, emoji, color, target } = req.body as any;
    const n = String(name || "").trim();
    if (n.length < 1 || n.length > 60) {
      res.status(400).json({ error: "اسم الجيب مطلوب" });
      return;
    }
    const t = Number(target);
    const inserted = await db
      .insert(walletPotsTable)
      .values({
        userId: user.id,
        name: n,
        emoji: String(emoji || "🐷").slice(0, 8),
        color: String(color || "from-pink-400 to-fuchsia-500").slice(0, 48),
        target: Number.isFinite(t) && t > 0 ? t.toFixed(2) : "0",
      })
      .returning();
    await audit(user.username, "create_pot", "wallet_pots", inserted[0]!.id, { name: n });
    res.json(inserted[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/wallet/pots/:id", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    const rows = await db
      .select()
      .from(walletPotsTable)
      .where(and(eq(walletPotsTable.id, id), eq(walletPotsTable.userId, user.id)))
      .limit(1);
    const pot = rows[0];
    if (!pot) {
      res.status(404).json({ error: "الجيب غير موجود" });
      return;
    }
    const balance = Number(pot.balance);
    if (balance > 0) {
      await adjustBalance(user.id, "balance", balance);
      await recordTransaction(user.id, "pot_close", balance, "completed", null, `إغلاق جيب ${pot.name}`);
    }
    await db.delete(walletPotsTable).where(eq(walletPotsTable.id, id));
    await audit(user.username, "delete_pot", "wallet_pots", id, { returned: balance });
    res.json({ success: true, returned: balance });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/wallet/pots/:id/deposit", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    const a = Number((req.body as any)?.amount);
    if (!Number.isFinite(a) || a <= 0) {
      res.status(400).json({ error: "أدخل مبلغاً صحيحاً" });
      return;
    }
    const rows = await db
      .select()
      .from(walletPotsTable)
      .where(and(eq(walletPotsTable.id, id), eq(walletPotsTable.userId, user.id)))
      .limit(1);
    const pot = rows[0];
    if (!pot) {
      res.status(404).json({ error: "الجيب غير موجود" });
      return;
    }
    try {
      await safeDebit(user.id, "balance", a);
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        res.status(400).json({ error: "الرصيد غير كافٍ" });
        return;
      }
      throw err;
    }
    await db
      .update(walletPotsTable)
      .set({ balance: sql`(${walletPotsTable.balance}::numeric + ${a.toFixed(2)})::numeric(12,2)` })
      .where(eq(walletPotsTable.id, id));
    await db.insert(walletPotMovesTable).values({
      potId: id,
      userId: user.id,
      type: "in",
      amount: a.toFixed(2),
    });
    await recordTransaction(user.id, "pot_deposit", -a, "completed", null, `إيداع لجيب ${pot.name}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/wallet/pots/:id/withdraw", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    const a = Number((req.body as any)?.amount);
    if (!Number.isFinite(a) || a <= 0) {
      res.status(400).json({ error: "أدخل مبلغاً صحيحاً" });
      return;
    }
    const rows = await db
      .select()
      .from(walletPotsTable)
      .where(and(eq(walletPotsTable.id, id), eq(walletPotsTable.userId, user.id)))
      .limit(1);
    const pot = rows[0];
    if (!pot) {
      res.status(404).json({ error: "الجيب غير موجود" });
      return;
    }
    if (Number(pot.balance) < a) {
      res.status(400).json({ error: "رصيد الجيب غير كافٍ" });
      return;
    }
    await db
      .update(walletPotsTable)
      .set({ balance: sql`(${walletPotsTable.balance}::numeric - ${a.toFixed(2)})::numeric(12,2)` })
      .where(eq(walletPotsTable.id, id));
    await adjustBalance(user.id, "balance", a);
    await db.insert(walletPotMovesTable).values({
      potId: id,
      userId: user.id,
      type: "out",
      amount: a.toFixed(2),
    });
    await recordTransaction(user.id, "pot_withdraw", a, "completed", null, `سحب من جيب ${pot.name}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
