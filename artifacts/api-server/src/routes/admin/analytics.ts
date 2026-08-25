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

import { Router, type IRouter } from "express";
import {
  db,
  analyticsEventsTable,
  usersTable,
  ordersTable,
  transactionsTable,
  supportTicketsTable,
  productsTable,
  productViewsTable,
} from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import type { Request } from "express";

const router: IRouter = Router();

router.get("/admin/analytics/summary", requireAdmin, async (_req, res) => {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [events24h] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(analyticsEventsTable)
      .where(gte(analyticsEventsTable.createdAt, since24h));

    const [sessions24h] = await db
      .select({ c: sql<number>`count(distinct ${analyticsEventsTable.sessionKey})::int` })
      .from(analyticsEventsTable)
      .where(gte(analyticsEventsTable.createdAt, since24h));

    const [newUsers24h] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(usersTable)
      .where(gte(usersTable.createdAt, since24h));

    const [orders24h] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, since24h));

    const [rev24h] = await db
      .select({ s: sql<string>`coalesce(sum(${ordersTable.finalPrice}::numeric), 0)::text` })
      .from(ordersTable)
      .where(and(eq(ordersTable.status, "delivered"), gte(ordersTable.createdAt, since24h)));

    const [pendingOrders] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ordersTable)
      .where(eq(ordersTable.status, "pending"));

    const [pendingDeposits] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(transactionsTable)
      .where(and(eq(transactionsTable.type, "deposit"), eq(transactionsTable.status, "pending")));

    const [openTickets] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.status, "open"));

    const eventsByType = await db
      .select({
        type: analyticsEventsTable.type,
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEventsTable)
      .where(gte(analyticsEventsTable.createdAt, since7d))
      .groupBy(analyticsEventsTable.type)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const topProducts = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        views: sql<number>`count(${productViewsTable.id})::int`,
        sales_count: sql<number>`(select count(*) from orders where orders.product_id = ${productsTable.id} and orders.created_at >= ${since7d})::int`,
      })
      .from(productsTable)
      .leftJoin(productViewsTable, and(eq(productViewsTable.productId, productsTable.id), gte(productViewsTable.createdAt, since7d)))
      .groupBy(productsTable.id, productsTable.name)
      .orderBy(desc(sql`count(${productViewsTable.id})`))
      .limit(10);

    res.json({
      totals: {
        events_24h: Number(events24h?.c ?? 0),
        sessions_24h: Number(sessions24h?.c ?? 0),
        new_users_24h: Number(newUsers24h?.c ?? 0),
        orders_24h: Number(orders24h?.c ?? 0),
        revenue_24h: rev24h?.s ?? "0",
        pending_orders: Number(pendingOrders?.c ?? 0),
        pending_deposits: Number(pendingDeposits?.c ?? 0),
        open_tickets: Number(openTickets?.c ?? 0),
      },
      eventsByType,
      topProducts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/admin/analytics/funnel", requireAdmin, async (_req, res) => {
  try {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [visitors] = await db
      .select({ c: sql<number>`count(distinct ${analyticsEventsTable.sessionKey})::int` })
      .from(analyticsEventsTable)
      .where(and(eq(analyticsEventsTable.type, "page_view"), gte(analyticsEventsTable.createdAt, since7d)));

    const [productViews] = await db
      .select({ c: sql<number>`count(distinct ${analyticsEventsTable.sessionKey})::int` })
      .from(analyticsEventsTable)
      .where(and(eq(analyticsEventsTable.type, "product_view"), gte(analyticsEventsTable.createdAt, since7d)));

    const [usersWithCart] = await db
      .select({ c: sql<number>`count(distinct ${analyticsEventsTable.sessionKey})::int` })
      .from(analyticsEventsTable)
      .where(and(eq(analyticsEventsTable.type, "add_to_cart"), gte(analyticsEventsTable.createdAt, since7d)));

    const [buyers] = await db
      .select({ c: sql<number>`count(distinct ${ordersTable.userId})::int` })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, since7d));

    res.json({
      visitors: Number(visitors?.c ?? 0),
      product_views: Number(productViews?.c ?? 0),
      users_with_cart: Number(usersWithCart?.c ?? 0),
      buyers: Number(buyers?.c ?? 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─── رسوم بيانية يومية: إيرادات + طلبات + مستخدمون جدد ──────────────
router.get("/admin/analytics/charts", requireAdmin, async (req: Request, res) => {
  try {
    const days = Math.min(Math.max(Number((req.query as any)["days"] ?? 7), 1), 30);

    const rows = await db.execute(sql`
      WITH days AS (
        SELECT generate_series(
          (current_date - (${days - 1} || ' days')::interval)::date,
          current_date,
          '1 day'::interval
        )::date AS day
      )
      SELECT
        days.day::text AS day,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.final_price::numeric ELSE 0 END), 0)::float AS revenue,
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END)::int AS orders,
        COUNT(CASE WHEN o.status = 'pending' THEN 1 END)::int AS pending,
        (SELECT COUNT(*)::int FROM users u WHERE u.created_at::date = days.day) AS new_users
      FROM days
      LEFT JOIN orders o ON o.created_at::date = days.day
      GROUP BY days.day ORDER BY days.day
    `);

    const charts = (rows.rows as any[]).map((r) => ({
      day: r.day as string,
      revenue: Number(r.revenue),
      orders: Number(r.orders),
      pending: Number(r.pending),
      newUsers: Number(r.new_users),
    }));

    res.json({ charts });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// ─── سجل النشاط الأخير: طلبات + إيداعات + مستخدمون جدد ─────────────
router.get("/admin/activity-feed", requireAdmin, async (_req, res) => {
  try {
    const recentOrders = await db
      .select({
        id: ordersTable.id,
        feedType: sql<string>`'order'`,
        username: usersTable.username,
        label: ordersTable.productName,
        amount: ordersTable.finalPrice,
        status: ordersTable.status,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .leftJoin(usersTable, eq(usersTable.id, ordersTable.userId))
      .orderBy(desc(ordersTable.createdAt))
      .limit(15);

    const recentDeposits = await db
      .select({
        id: transactionsTable.id,
        feedType: sql<string>`'deposit'`,
        username: usersTable.username,
        label: sql<string>`'شحن رصيد'`,
        amount: transactionsTable.amount,
        status: transactionsTable.status,
        createdAt: transactionsTable.createdAt,
      })
      .from(transactionsTable)
      .leftJoin(usersTable, eq(usersTable.id, transactionsTable.userId))
      .where(eq(transactionsTable.type, "deposit"))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(10);

    const recentUsers = await db
      .select({
        id: usersTable.id,
        feedType: sql<string>`'new_user'`,
        username: usersTable.username,
        label: sql<string>`'تسجيل جديد'`,
        amount: sql<string>`'0'`,
        status: sql<string>`'done'`,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt))
      .limit(8);

    const feed = [...recentOrders, ...recentDeposits, ...recentUsers]
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, 35);

    res.json({ feed });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
