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
      freefireOrdersRow,
      codOrdersRow,
      cocOrdersRow,
      crOrdersRow,
      mlOrdersRow,
      giOrdersRow,
      fcOrdersRow,
      brawlOrdersRow,
      hokOrdersRow,
      sgOrdersRow,
      rbOrdersRow,
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

      // طلبات فري فاير جديدة (شحن عبر الايدي)
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.freefireOrders)),
            eq(productsTable.platform, "Free Fire"),
          ),
        ),

      // طلبات Call of Duty جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.codOrders)),
            eq(productsTable.platform, "Call of Duty"),
          ),
        ),

      // طلبات Clash of Clans جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.cocOrders)),
            eq(productsTable.platform, "Clash of Clans"),
          ),
        ),

      // طلبات Clash Royale جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.crOrders)),
            eq(productsTable.platform, "Clash Royale"),
          ),
        ),

      // طلبات Mobile Legends جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.mlOrders)),
            eq(productsTable.platform, "Mobile Legends"),
          ),
        ),

      // طلبات Genshin Impact جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.giOrders)),
            eq(productsTable.platform, "Genshin Impact"),
          ),
        ),

      // طلبات EA FC Mobile جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.fcOrders)),
            eq(productsTable.platform, "EA FC Mobile"),
          ),
        ),

      // طلبات Brawl Stars جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.brawlOrders)),
            eq(productsTable.platform, "Brawl Stars"),
          ),
        ),

      // طلبات Honor of Kings جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.hokOrders)),
            eq(productsTable.platform, "Honor of Kings"),
          ),
        ),

      // طلبات Stumble Guys جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.sgOrders)),
            eq(productsTable.platform, "Stumble Guys"),
          ),
        ),

      // طلبات Roblox جديدة
      db
        .select({ c: sql<number>`count(*)::int` })
        .from(ordersTable)
        .innerJoin(productsTable, eq(ordersTable.productId, productsTable.id))
        .where(
          and(
            gt(ordersTable.createdAt, toDate(lastSeen.rbOrders)),
            eq(productsTable.platform, "Roblox"),
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
      freefireOrders: Number(freefireOrdersRow[0]?.c ?? 0),
      codOrders: Number(codOrdersRow[0]?.c ?? 0),
      cocOrders: Number(cocOrdersRow[0]?.c ?? 0),
      crOrders: Number(crOrdersRow[0]?.c ?? 0),
      mlOrders: Number(mlOrdersRow[0]?.c ?? 0),
      giOrders: Number(giOrdersRow[0]?.c ?? 0),
      fcOrders: Number(fcOrdersRow[0]?.c ?? 0),
      brawlOrders: Number(brawlOrdersRow[0]?.c ?? 0),
      hokOrders: Number(hokOrdersRow[0]?.c ?? 0),
      sgOrders: Number(sgOrdersRow[0]?.c ?? 0),
      rbOrders: Number(rbOrdersRow[0]?.c ?? 0),
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
