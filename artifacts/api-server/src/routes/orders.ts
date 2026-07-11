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
  ordersTable,
  productsTable,
  orderEventsTable,
  couponsTable,
  couponRedemptionsTable,
  referralsTable,
  usersTable,
  settingsTable,
  productCodesTable,
} from "@workspace/db";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import { validateCoupon } from "../lib/services/coupons";
import {
  safeDebit,
  adjustBalance,
  recordTransaction,
  addToTotalSpent,
  recomputeVip,
  getUserBalances,
  InsufficientFundsError,
} from "../lib/services/wallet";
import { notify } from "../lib/services/notifications";
import { audit } from "../lib/services/auditLog";
import { sendTelegramMessage } from "../lib/integrations";
import { sendPushToAdmin } from "../lib/services/pushService";
import { emitToAll } from "../lib/wsManager";

const router: IRouter = Router();

async function getSetting(key: string, def: string): Promise<string> {
  const rows = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
  return rows[0]?.value ?? def;
}

router.post("/orders", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { productId, targetInfo, notes, couponCode } = req.body as {
      productId?: number;
      targetInfo?: string;
      notes?: string;
      couponCode?: string;
    };

    if (!productId || !targetInfo?.trim()) {
      res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
      return;
    }
    const productRows = await db.select().from(productsTable).where(eq(productsTable.id, Number(productId))).limit(1);
    const product = productRows[0];
    if (!product || !product.active) {
      res.status(404).json({ error: "المنتج غير متاح" });
      return;
    }

    // ── تحقق: لا يوجد طلب نشط بنفس الرابط والمنتج ──
    const activeOrders = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, user.id),
          eq(ordersTable.productId, Number(productId)),
          eq(ordersTable.targetInfo, targetInfo.trim()),
          or(
            eq(ordersTable.status, "pending"),
            eq(ordersTable.status, "processing"),
          ),
        ),
      )
      .limit(1);
    if (activeOrders.length > 0) {
      res.status(400).json({
        error: "يوجد طلب قيد التنفيذ بنفس الرابط — انتظر اكتماله قبل إعادة الطلب",
      });
      return;
    }

    const price = Number(product.price);
    let discount = 0;
    let finalCouponCode: string | null = null;
    if (couponCode) {
      const v = await validateCoupon(couponCode, product.id);
      if (!v.valid) {
        res.status(400).json({ error: v.message ?? "الكوبون غير صالح" });
        return;
      }
      discount = Number(v.discount ?? 0);
      finalCouponCode = couponCode.trim().toUpperCase();
    }

    const subtotal = Math.max(0, price - discount);
    const finalPrice = subtotal;

    // يُستخدم الرصيد الرئيسي أولاً، ثم رصيد الإحالة عند نفاد الرصيد الرئيسي
    const balances = await getUserBalances(user.id);
    const mainBal = Math.round(Number(balances?.balance ?? 0));
    const refBal = Math.round(Number(balances?.cashbackBalance ?? 0));
    const fromMain = Math.min(mainBal, finalPrice);
    const fromRef = Math.max(0, finalPrice - fromMain);

    if (fromRef > refBal) {
      res.status(400).json({ error: "الرصيد غير كافٍ — اشحن المحفظة أولاً" });
      return;
    }

    // Atomic debits
    try {
      if (fromMain > 0) await safeDebit(user.id, "balance", fromMain);
      if (fromRef > 0) await safeDebit(user.id, "cashbackBalance", fromRef);
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        // استرداد الرصيد الرئيسي إن تم خصمه وفشل خصم رصيد الإحالة
        if (fromMain > 0) await adjustBalance(user.id, "balance", fromMain).catch(() => {});
        res.status(400).json({ error: "الرصيد غير كافٍ — اشحن المحفظة أولاً" });
        return;
      }
      throw err;
    }
    const referralUsed = fromRef;

    const inserted = await db
      .insert(ordersTable)
      .values({
        userId: user.id,
        productId: product.id,
        productName: product.name,
        price: price.toFixed(2),
        discount: discount.toFixed(2),
        cashbackUsed: referralUsed.toFixed(2),
        finalPrice: finalPrice.toFixed(2),
        couponCode: finalCouponCode,
        targetInfo: targetInfo.trim(),
        notes: (notes ?? "").trim() || null,
        status: "pending",
      })
      .returning();
    let order = inserted[0]!;

    // ── أكواد مباشرة: أسنِد كوداً فورياً فقط عند شراء كود (targetInfo === "كود مباشر")
    //    الشحن المباشر (targetInfo = اسم اللاعب|ID) لا يخصم أي كود أبداً ──
    if (product.category === "ff-direct-code" && targetInfo?.trim() === "كود مباشر") {
      try {
        const codeRows = await db
          .select()
          .from(productCodesTable)
          .where(
            and(
              eq(productCodesTable.productId, product.id),
              eq(productCodesTable.status, "available"),
            ),
          )
          .limit(1);

        const codeRow = codeRows[0];
        if (codeRow) {
          // حجز الكود
          await db
            .update(productCodesTable)
            .set({ status: "sold", orderId: order.id, soldToUserId: user.id, soldAt: new Date() })
            .where(eq(productCodesTable.id, codeRow.id));

          // تحديث الطلب بالكود المُسلَّم
          const updated = await db
            .update(ordersTable)
            .set({ deliveredCode: codeRow.code, deliveredCodeId: codeRow.id, deliveredAt: new Date(), status: "completed" })
            .where(eq(ordersTable.id, order.id))
            .returning();
          order = updated[0] ?? order;

          await db.insert(orderEventsTable).values({
            orderId: order.id,
            status: "completed",
            message: `تم تسليم الكود فورياً`,
          });
        } else {
          // لا توجد أكواد — أبقِ الطلب معلقاً
          await db.insert(orderEventsTable).values({
            orderId: order.id,
            status: "pending",
            message: "تم استلام الطلب — سيُسلَّم الكود قريباً",
          });
        }
      } catch (codeErr) {
        req.log?.warn({ codeErr }, "فشل إسناد كود مباشر — الطلب باقٍ معلقاً");
        await db.insert(orderEventsTable).values({
          orderId: order.id,
          status: "pending",
          message: "تم استلام الطلب وبانتظار التنفيذ",
        });
      }
    } else {
      await db.insert(orderEventsTable).values({
        orderId: order.id,
        status: "pending",
        message: "تم استلام الطلب وبانتظار التنفيذ",
      });
    }

    await recordTransaction(user.id, "order", -finalPrice, "completed", null, `order#${order.id}`, {
      orderId: order.id,
    });
    await addToTotalSpent(user.id, finalPrice);

    // Coupon usage
    if (finalCouponCode) {
      const cRows = await db.select().from(couponsTable).where(eq(couponsTable.code, finalCouponCode)).limit(1);
      const c = cRows[0];
      if (c) {
        await db
          .update(couponsTable)
          .set({ usedCount: c.usedCount + 1 })
          .where(eq(couponsTable.id, c.id));
        await db.insert(couponRedemptionsTable).values({
          couponId: c.id,
          userId: user.id,
          orderId: order.id,
          amount: discount.toFixed(2),
        });
      }
    }

    // Referral commission
    if (user.referredBy) {
      const refRows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.referralCode, user.referredBy))
        .limit(1);
      const referrer = refRows[0];
      const referralEnabled = (await getSetting("referralEnabled", "true")) !== "false";
      if (referrer && referralEnabled) {
        const commPctStr = await getSetting("referralCommissionPct", "5");
        const pct = Number(commPctStr) || 0;
        if (pct > 0 && finalPrice > 0) {
          const earn = (finalPrice * pct) / 100;
          if (earn > 0.009) {
            // عمولة الإحالة تذهب لرصيد الإحالة وليس الرصيد الرئيسي
            await adjustBalance(referrer.id, "cashbackBalance", earn);
            await recordTransaction(
              referrer.id,
              "referral",
              earn,
              "completed",
              null,
              `from ${user.username}`,
              { fromUserId: user.id, orderId: order.id },
            );
            // Track referral earning row
            const linkRows = await db
              .select()
              .from(referralsTable)
              .where(
                and(
                  eq(referralsTable.referrerId, referrer.id),
                  eq(referralsTable.referredUserId, user.id),
                ),
              )
              .limit(1);
            if (linkRows[0]) {
              await db
                .update(referralsTable)
                .set({
                  earned: (Number(linkRows[0].earned) + earn).toFixed(2),
                })
                .where(eq(referralsTable.id, linkRows[0].id));
            }
            await notify(
              referrer.id,
              "referral",
              "عمولة إحالة جديدة",
              `حصلت على ${earn.toFixed(2)} من طلب ${user.username}`,
              "/referrals",
            );
          }
        }
      }
    }

    // Update product sales counter
    await db
      .update(productsTable)
      .set({ salesCount: product.salesCount + 1 })
      .where(eq(productsTable.id, product.id));

    await recomputeVip(user.id);
    await notify(user.id, "order", "طلب جديد", `تم إنشاء الطلب #${order.id} بمبلغ ${finalPrice.toFixed(2)}`, `/orders`);

    // Best-effort telegram + push alert to admin
    const isFF = product.platform === "Free Fire";
    const ffParts  = isFF ? targetInfo.trim().split("|").map((s) => s.trim()) : [];
    const ffPlayer = ffParts[0] ?? "";
    const ffId     = ffParts[1] ?? "";

    sendTelegramMessage(
      isFF
        ? `<b>💎 طلب فري فاير #${order.id}</b>\nالمستخدم: ${user.username}\nالباقة: ${product.name}\nاسم اللاعب: ${ffPlayer}\nالايدي: ${ffId}\nالسعر: ${finalPrice.toFixed(2)} ج.س`
        : `<b>طلب جديد #${order.id}</b>\nالمستخدم: ${user.username}\nالمنتج: ${product.name}\nالسعر النهائي: ${finalPrice.toFixed(2)}`,
    ).catch(() => {});

    sendPushToAdmin(
      isFF
        ? {
            title: `💎 طلب فري فاير جديد #${order.id}`,
            body: `${user.username} — ${ffPlayer}${ffId ? ` (${ffId})` : ""} — ${finalPrice.toFixed(0)} ج.س`,
            url: "/admin?tab=freefire-orders",
            tag: "new_ff_order",
          }
        : {
            title: `طلب جديد #${order.id}`,
            body: `${user.username} — ${product.name} — ${finalPrice.toFixed(2)} ج.س`,
            url: "/admin?tab=orders",
            tag: "new_order",
          },
    ).catch(() => {});

    await audit(user.username, "create_order", "orders", order.id, {
      productId: product.id,
      finalPrice,
    });

    emitToAll("admin:badge_update", { tab: "orders" });
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل إنشاء الطلب" });
  }
});

router.get("/orders/me", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const status = (req.query.status as string | undefined)?.trim();
    const conds: any[] = [eq(ordersTable.userId, user.id)];
    if (status && status !== "all") conds.push(eq(ordersTable.status, status));
    const list = await db
      .select()
      .from(ordersTable)
      .where(and(...conds))
      .orderBy(desc(ordersTable.createdAt))
      .limit(200);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/orders/:id", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    const rows = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.userId, user.id)))
      .limit(1);
    const order = rows[0];
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const events = await db
      .select()
      .from(orderEventsTable)
      .where(eq(orderEventsTable.orderId, id))
      .orderBy(asc(orderEventsTable.createdAt));
    res.json({ ...order, events });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/orders/:id/cancel", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    const rows = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.userId, user.id)))
      .limit(1);
    const order = rows[0];
    if (!order) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    if (order.status !== "pending") {
      res.status(400).json({ error: "لا يمكن إلغاء الطلب في حالته الحالية" });
      return;
    }
    const refund = Number(order.finalPrice);
    const referralUsedOnOrder = Number(order.cashbackUsed ?? 0);
    const mainRefund = Math.max(0, refund - referralUsedOnOrder);
    if (mainRefund > 0) await adjustBalance(user.id, "balance", mainRefund);
    if (referralUsedOnOrder > 0) await adjustBalance(user.id, "cashbackBalance", referralUsedOnOrder);
    await recordTransaction(user.id, "refund", refund, "completed", null, `order#${order.id}`);
    const updated = await db
      .update(ordersTable)
      .set({ status: "cancelled" })
      .where(eq(ordersTable.id, order.id))
      .returning();
    await db.insert(orderEventsTable).values({
      orderId: order.id,
      status: "cancelled",
      message: "تم إلغاء الطلب وإرجاع الرصيد",
    });
    await notify(user.id, "order", "تم إلغاء الطلب", `تم إرجاع ${refund.toFixed(2)} لمحفظتك`, "/orders");
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/orders/:id/reorder", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = Number(req.params.id);
    const rows = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.userId, user.id)))
      .limit(1);
    const old = rows[0];
    if (!old) {
      res.status(404).json({ error: "الطلب غير موجود" });
      return;
    }
    const productRows = await db.select().from(productsTable).where(eq(productsTable.id, old.productId)).limit(1);
    const product = productRows[0];
    if (!product || !product.active) {
      res.status(400).json({ error: "المنتج لم يعد متاحاً" });
      return;
    }

    // ── تحقق: لا يوجد طلب نشط بنفس الرابط والمنتج ──
    const activeReorders = await db
      .select({ id: ordersTable.id })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, user.id),
          eq(ordersTable.productId, old.productId),
          eq(ordersTable.targetInfo, old.targetInfo),
          or(
            eq(ordersTable.status, "pending"),
            eq(ordersTable.status, "processing"),
          ),
        ),
      )
      .limit(1);
    if (activeReorders.length > 0) {
      res.status(400).json({
        error: "يوجد طلب قيد التنفيذ بنفس الرابط — انتظر اكتماله قبل إعادة الطلب",
      });
      return;
    }

    const price = Number(product.price);
    try {
      await safeDebit(user.id, "balance", price);
    } catch {
      res.status(400).json({ error: "الرصيد غير كافٍ" });
      return;
    }
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
        targetInfo: old.targetInfo,
        notes: old.notes,
        status: "pending",
      })
      .returning();
    const order = inserted[0]!;
    await db.insert(orderEventsTable).values({
      orderId: order.id,
      status: "pending",
      message: "إعادة طلب",
    });
    await recordTransaction(user.id, "order", -price, "completed", null, `order#${order.id}`);
    await addToTotalSpent(user.id, price);
    await db.update(productsTable).set({ salesCount: product.salesCount + 1 }).where(eq(productsTable.id, product.id));
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
