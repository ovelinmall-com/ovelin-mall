import { Router, type IRouter } from "express";
import {
  db,
  ordersTable,
  usersTable,
  transactionsTable,
  depositRequestsTable,
  referralWithdrawalsTable,
  supportTicketsTable,
  productsTable,
  postsTable,
  giftCardsTable,
  prizeDrawsTable,
} from "@workspace/db";
import { and, eq, gt, ilike, isNull, or, sql } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();

// ================================================================
// BADGE REGISTRY — السجل المركزي لإشعارات تيوبات الأدمن
// لإضافة تيوب جديد:
//   1. أضف استعلام هنا داخل Promise.all
//   2. أضف المفتاح في الـ response
//   3. أضف سطراً واحداً في BADGE_REGISTRY بالفرونت-إند
// ================================================================

function toDate(iso: string | undefined): Date {
  if (!iso) return new Date(0);
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

router.post("/admin/tab-badges", requireAdmin, async (req, res) => {
  try {
    const lastSeen: Record<string, string | undefined> = req.body?.lastSeen ?? {};

    const [
      usersRow,
      ordersRow,
      pubgOrdersRow,
      txRow,
      depositsRow,
      withdrawalsRow,
      supportRow,
      postsRow,
      giftcardsRow,
      prizesRow,
    ] = await Promise.all([
      // مستخدمون جدد
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(usersTable)
        .where(gt(usersTable.createdAt, toDate(lastSeen.users))),

      // طلبات جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(gt(ordersTable.createdAt, toDate(lastSeen.orders))),

      // طلبات PUBG جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.pubgOrders)),
            or(
              ilike(productsTable.category, "%pubg%"),
              ilike(productsTable.name, "%pubg%"),
            ),
          ),
        ),

      // معاملات جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(transactionsTable)
        .where(gt(transactionsTable.createdAt, toDate(lastSeen.transactions))),

      // طلبات شحن جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(depositRequestsTable)
        .where(gt(depositRequestsTable.createdAt, toDate(lastSeen.depositRequests))),

      // طلبات سحب جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(referralWithdrawalsTable)
        .where(
          gt(referralWithdrawalsTable.createdAt, toDate(lastSeen.referralWithdrawals)),
        ),

      // رسائل دعم غير مقروءة
      db
        .select({ c: sql<number>`coalesce(sum(${supportTicketsTable.unreadForAdmin}), 0)::int` })
        .from(supportTicketsTable),

      // منشورات جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(postsTable)
        .where(gt(postsTable.createdAt, toDate(lastSeen.posts))),

      // بطاقات هدايا جديدة (غير مستردة)
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(giftCardsTable)
        .where(
          and(
            gt(giftCardsTable.createdAt, toDate(lastSeen.giftcards)),
            isNull(giftCardsTable.redeemedByUserId),
          ),
        ),

      // سحوبات نشطة جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(prizeDrawsTable)
        .where(
          and(
            gt(prizeDrawsTable.createdAt, toDate(lastSeen.prizes)),
            eq(prizeDrawsTable.active, true),
          ),
        ),
    ]);

    res.json({
      users: Number(usersRow[0]?.c ?? 0),
      orders: Number(ordersRow[0]?.c ?? 0),
      pubgOrders: Number(pubgOrdersRow[0]?.c ?? 0),
      transactions: Number(txRow[0]?.c ?? 0),
      depositRequests: Number(depositsRow[0]?.c ?? 0),
      referralWithdrawals: Number(withdrawalsRow[0]?.c ?? 0),
      support: Number(supportRow[0]?.c ?? 0),
      posts: Number(postsRow[0]?.c ?? 0),
      giftcards: Number(giftcardsRow[0]?.c ?? 0),
      prizes: Number(prizesRow[0]?.c ?? 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
