// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { Router, type IRouter } from "express";
import { db, ordersTable, orderEventsTable, usersTable, productsTable } from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { adjustBalance } from "../../lib/services/wallet";
import { notifyAndPush } from "../../lib/services/notifications";
import { audit } from "../../lib/services/auditLog";

const router: IRouter = Router();

router.get("/admin/orders", requireAdmin, async (req, res) => {
  try {
    const platform = (req.query.platform as string | undefined)?.trim();

    let productIds: number[] | null = null;
    if (platform) {
      const pubgProducts = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(eq(productsTable.platform, platform));
      productIds = pubgProducts.map((p) => p.id);
      if (productIds.length === 0) {
        res.json([]);
        return;
      }
    }

    const conds: any[] = [];
    if (productIds) conds.push(inArray(ordersTable.productId, productIds));

    const rows = await db
      .select({
        id: ordersTable.id,
        userId: ordersTable.userId,
        username: usersTable.username,
        productId: ordersTable.productId,
        productName: ordersTable.productName,
        price: ordersTable.price,
        finalPrice: ordersTable.finalPrice,
        couponCode: ordersTable.couponCode,
        targetInfo: ordersTable.targetInfo,
        notes: ordersTable.notes,
        status: ordersTable.status,
        proofUrl: ordersTable.proofUrl,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .leftJoin(usersTable, eq(usersTable.id, ordersTable.userId))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(ordersTable.createdAt))
      .limit(500);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, proofUrl } = req.body as { status?: string; proofUrl?: string };
    const old = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    const order = old[0];
    if (!order) {
      res.status(404).json({ error: "غير موجود" });
      return;
    }
    const set: any = {};
    if (status) set.status = status;
    if (proofUrl != null) set.proofUrl = proofUrl || null;
    const updated = await db.update(ordersTable).set(set).where(eq(ordersTable.id, id)).returning();

    if (status && status !== order.status) {
      await db.insert(orderEventsTable).values({
        orderId: id,
        status,
        message: `تحديث الحالة بواسطة الإدارة`,
      });
      const titles: Record<string, string> = {
        processing: "بدأ تنفيذ طلبك",
        completed: "تم شحن UC بنجاح",
        delivered: "تم تسليم طلبك",
        cancelled: "تم إلغاء طلبك",
        rejected: "فشل تنفيذ الطلب",
        failed: "فشل تنفيذ الطلب",
      };
      const title = titles[status] ?? "تحديث طلب";
      notifyAndPush(order.userId, "order", title, `الطلب #${order.id} — ${order.productName}`, "/orders", "order_update");

      if ((status === "cancelled" || status === "rejected" || status === "failed") && order.status !== "cancelled" && order.status !== "rejected" && order.status !== "failed") {
        const refund = Number(order.finalPrice);
        const cb = Number(order.cashbackUsed);
        if (refund > 0) await adjustBalance(order.userId, "balance", refund);
        if (cb > 0) await adjustBalance(order.userId, "cashbackBalance", cb);
      }
    }

    await audit("admin", "update_order", "orders", id, set);
    const u = await db.select().from(usersTable).where(eq(usersTable.id, order.userId)).limit(1);
    const o = updated[0]!;
    res.json({
      id: o.id,
      userId: o.userId,
      username: u[0]?.username ?? "",
      productId: o.productId,
      productName: o.productName,
      price: o.price,
      finalPrice: o.finalPrice,
      couponCode: o.couponCode,
      targetInfo: o.targetInfo,
      notes: o.notes,
      status: o.status,
      proofUrl: o.proofUrl,
      createdAt: o.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.delete("/admin/orders/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const old = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    const order = old[0];
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    await db.delete(orderEventsTable).where(eq(orderEventsTable.orderId, id));
    await db.delete(ordersTable).where(eq(ordersTable.id, id));
    await audit("admin", "delete_order", "orders", id, {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
