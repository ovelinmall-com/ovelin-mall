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
import { db, productCodesTable, productsTable, ordersTable } from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import {
  safeDebit,
  adjustBalance,
  recordTransaction,
  addToTotalSpent,
  recomputeVip,
  InsufficientFundsError,
} from "../lib/services/wallet";
import { notify } from "../lib/services/notifications";
import { audit } from "../lib/services/auditLog";
import { sendTelegramMessage } from "../lib/integrations";

const router: IRouter = Router();

// GET stock for many products at once (?ids=1,2,3) — MUST come before /:id/stock
router.get("/products/stock", async (req, res) => {
  try {
    const idsParam = (req.query.ids as string | undefined) ?? "";
    const ids = idsParam
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      res.json({});
      return;
    }
    const rows = await db
      .select({
        productId: productCodesTable.productId,
        c: sql<number>`count(*)::int`,
      })
      .from(productCodesTable)
      .where(
        and(
          eq(productCodesTable.status, "available"),
          inArray(productCodesTable.productId, ids),
        ),
      )
      .groupBy(productCodesTable.productId);
    const map: Record<string, number> = {};
    for (const id of ids) map[String(id)] = 0;
    for (const r of rows) map[String(r.productId)] = Number(r.c);
    res.json(map);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// Instant buy: atomic — debit wallet, lock & assign N codes, create N orders
// Body: { productId: number, quantity?: number (default 1, max 50) }
router.post("/orders/instant-buy", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const productId = Number((req.body as any)?.productId);
    const rawQty = Number((req.body as any)?.quantity ?? 1);
    const quantity = Math.max(1, Math.min(50, Math.floor(rawQty || 1)));

    if (!Number.isFinite(productId)) {
      res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
      return;
    }

    const productRows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);
    const product = productRows[0];
    if (!product || !product.active) {
      res.status(404).json({ error: "المنتج غير متاح" });
      return;
    }

    const price = Number(product.price);
    if (!Number.isFinite(price) || price < 0) {
      res.status(400).json({ error: "سعر غير صالح" });
      return;
    }

    const totalPrice = price * quantity;

    // Lock N available codes atomically. SKIP LOCKED guarantees concurrent
    // buyers cannot receive the same codes.
    let assignedCodes: Array<{ id: number; code: string }> = [];

    try {
      await db.transaction(async (tx) => {
        const lockRows = await tx.execute(sql`
          SELECT id, code
          FROM product_codes
          WHERE product_id = ${productId}
            AND status = 'available'
          ORDER BY id ASC
          LIMIT ${quantity}
          FOR UPDATE SKIP LOCKED
        `);
        const rows = lockRows.rows as Array<{ id: number; code: string }>;
        if (rows.length < quantity) {
          throw new Error("OUT_OF_STOCK");
        }
        // Reserve them
        const ids = rows.map((r) => r.id);
        await tx
          .update(productCodesTable)
          .set({ status: "reserved" })
          .where(inArray(productCodesTable.id, ids));
        assignedCodes = rows;
      });
    } catch (err: any) {
      if (err?.message === "OUT_OF_STOCK") {
        res.status(409).json({
          error: "الكمية المطلوبة غير متوفرة حالياً، حاول بكمية أقل",
          code: "OUT_OF_STOCK",
        });
        return;
      }
      throw err;
    }

    if (assignedCodes.length !== quantity) {
      res.status(409).json({ error: "الكمية المطلوبة غير متوفرة حالياً", code: "OUT_OF_STOCK" });
      return;
    }

    // Debit wallet for the total. If it fails, release all reserved codes.
    try {
      await safeDebit(user.id, "balance", totalPrice);
    } catch (err) {
      await db
        .update(productCodesTable)
        .set({ status: "available" })
        .where(inArray(productCodesTable.id, assignedCodes.map((c) => c.id)));
      if (err instanceof InsufficientFundsError) {
        res.status(400).json({
          error: "الرصيد غير كافٍ — اشحن المحفظة أولاً",
          code: "INSUFFICIENT_FUNDS",
        });
        return;
      }
      throw err;
    }

    // Create one order per code (keeps history clean and per-code searchable)
    const createdOrders: Array<typeof ordersTable.$inferSelect> = [];
    for (const ac of assignedCodes) {
      const inserted = await db
        .insert(ordersTable)
        .values({
          userId: user.id,
          productId: product.id,
          productName: product.name,
          price: price.toFixed(2),
          discount: "0",
          cashbackUsed: "0",
          finalPrice: price.toFixed(2),
          targetInfo: "تسليم فوري — كود رقمي",
          notes: quantity > 1 ? `شراء جماعي (${quantity} أكواد)` : null,
          status: "completed",
          deliveredCode: ac.code,
          deliveredCodeId: ac.id,
          deliveredAt: new Date(),
        })
        .returning();
      const order = inserted[0]!;
      createdOrders.push(order);

      await db
        .update(productCodesTable)
        .set({
          status: "sold",
          orderId: order.id,
          soldToUserId: user.id,
          soldAt: new Date(),
        })
        .where(eq(productCodesTable.id, ac.id));
    }

    // Bookkeeping: a single aggregated transaction record + per-product update
    await recordTransaction(
      user.id,
      "order",
      -totalPrice,
      "completed",
      null,
      `instant-bulk#${createdOrders[0]!.id}`,
      {
        productId: product.id,
        quantity,
        orderIds: createdOrders.map((o) => o.id),
        codeIds: assignedCodes.map((c) => c.id),
      },
    );
    await addToTotalSpent(user.id, totalPrice);
    await db
      .update(productsTable)
      .set({ salesCount: product.salesCount + quantity })
      .where(eq(productsTable.id, product.id));
    await recomputeVip(user.id);

    await notify(
      user.id,
      "order",
      quantity > 1 ? `تم تسليم ${quantity} أكواد فوراً` : "تم تسليم الكود فوراً",
      `${product.name} — اضغط لعرض الأكواد`,
      `/my-codes`,
    );

    sendTelegramMessage(
      `⚡️ <b>شراء فوري ×${quantity}</b>\n${user.username} اشترى ${product.name} (${quantity} كود) بسعر ${totalPrice.toFixed(2)}`,
    ).catch(() => {});

    await audit(user.username, "instant_buy", "orders", createdOrders[0]!.id, {
      productId: product.id,
      quantity,
      totalPrice,
      codeIds: assignedCodes.map((c) => c.id),
    });

    res.json({
      orders: createdOrders,
      // Backwards-compat: keep `code` for single buys, plus new `codes` array
      code: assignedCodes[0]!.code,
      codes: assignedCodes.map((c) => c.code),
      quantity,
      totalPrice,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل تنفيذ الشراء" });
  }
});

// User's purchased codes
router.get("/my-codes", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db
      .select({
        id: productCodesTable.id,
        code: productCodesTable.code,
        soldAt: productCodesTable.soldAt,
        orderId: productCodesTable.orderId,
        productId: productCodesTable.productId,
        productName: productsTable.name,
        productImage: productsTable.imageUrl,
        productPlatform: productsTable.platform,
        productQuantity: productsTable.quantity,
        price: ordersTable.finalPrice,
      })
      .from(productCodesTable)
      .leftJoin(productsTable, eq(productsTable.id, productCodesTable.productId))
      .leftJoin(ordersTable, eq(ordersTable.id, productCodesTable.orderId))
      .where(
        and(
          eq(productCodesTable.soldToUserId, user.id),
          eq(productCodesTable.status, "sold"),
        ),
      )
      .orderBy(desc(productCodesTable.soldAt))
      .limit(500);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// GET available stock count per single product (registered last so /products/stock wins)
router.get("/products/:id/stock", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "id غير صالح" });
      return;
    }
    const rows = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(productCodesTable)
      .where(and(eq(productCodesTable.productId, id), eq(productCodesTable.status, "available")));
    res.json({ available: rows[0]?.c ?? 0 });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
