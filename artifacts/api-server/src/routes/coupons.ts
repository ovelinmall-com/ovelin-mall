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
import { validateCoupon } from "../lib/services/coupons";

const router: IRouter = Router();

router.post("/coupons/validate", async (req, res) => {
  try {
    const { code, productId } = req.body as { code?: string; productId?: number };
    if (!code || !productId) {
      res.status(400).json({ valid: false, message: "بيانات غير مكتملة" });
      return;
    }
    const r = await validateCoupon(code, Number(productId));
    res.json({
      valid: r.valid,
      message: r.message,
      discount: r.discount ?? null,
      finalPrice: r.finalPrice ?? null,
    });
  } catch (err: any) {
    res.status(500).json({ valid: false, message: err?.message ?? "فشل" });
  }
});

export default router;
