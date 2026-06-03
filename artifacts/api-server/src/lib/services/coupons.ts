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

import { db, couponsTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type CouponValidationResult = {
  valid: boolean;
  message?: string;
  discount?: string;
  finalPrice?: string;
  coupon?: typeof couponsTable.$inferSelect;
};

export async function validateCoupon(
  code: string,
  productId: number,
): Promise<CouponValidationResult> {
  const c = code.trim().toUpperCase();
  if (!c) return { valid: false, message: "أدخل كود الخصم" };

  const rows = await db
    .select()
    .from(couponsTable)
    .where(eq(couponsTable.code, c))
    .limit(1);
  const coupon = rows[0];
  if (!coupon) return { valid: false, message: "كود الخصم غير صحيح" };
  if (!coupon.active) return { valid: false, message: "كود الخصم غير مفعّل" };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, message: "انتهت صلاحية الكود" };
  }
  if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, message: "تم استنفاد الكود" };
  }

  const productRows = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId))
    .limit(1);
  const product = productRows[0];
  if (!product) return { valid: false, message: "المنتج غير موجود" };

  if (coupon.applyToCategory && coupon.applyToCategory !== product.category) {
    return { valid: false, message: "هذا الكود لا ينطبق على هذه الفئة" };
  }

  const price = Number(product.price);
  const minOrder = Number(coupon.minOrder ?? 0);
  if (minOrder > 0 && price < minOrder) {
    return {
      valid: false,
      message: `الحد الأدنى للطلب ${minOrder.toFixed(2)}`,
    };
  }

  let discount = 0;
  if (coupon.type === "percent") {
    discount = (price * Number(coupon.value)) / 100;
  } else {
    discount = Number(coupon.value);
  }
  if (discount > price) discount = price;
  const finalPrice = Math.max(0, price - discount);

  return {
    valid: true,
    message: "تم تطبيق الخصم",
    discount: discount.toFixed(2),
    finalPrice: finalPrice.toFixed(2),
    coupon,
  };
}
