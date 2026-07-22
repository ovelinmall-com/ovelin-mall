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
import { requireAdmin } from "../../lib/auth";
import {
  getServicesStatus,
  pingService,
  sendEmail,
  sendTelegramMessage,
} from "../../lib/integrations";

const router: IRouter = Router();

router.get("/admin/system/status", requireAdmin, (_req, res) => {
  res.json({
    services: getServicesStatus(),
    note: "كل القيم تُدار من خارج الكود عبر خزنة Replit للمتغيرات السرية",
  });
});

router.post("/admin/system/test/:service", requireAdmin, async (req, res) => {
  const { service } = req.params;
  const { to } = req.body as { to?: string };

  if (service === "email") {
    if (!to) {
      res.status(400).json({ ok: false, message: "حدد بريد المستلم" });
      return;
    }
    const r = await sendEmail({
      to,
      subject: "OVELIN — رسالة اختبار",
      text:
        "هذا اختبار من لوحة تحكم OVELIN. لو وصلتك الرسالة معناه إعدادات SMTP شغّالة.",
      html: "<div dir='rtl' style='font-family:sans-serif;'><h2 style='color:#db2777'>OVELIN ✨</h2><p>إعدادات SMTP شغّالة 🎉</p></div>",
    });
    res.json({ ok: r.ok, message: r.ok ? "أُرسل الإيميل" : r.error });
    return;
  }
  if (service === "telegram") {
    const r = await sendTelegramMessage(
      "🧪 <b>اختبار OVELIN</b>\nالتنبيهات شغّالة 🎉",
    );
    res.json({ ok: r.ok, message: r.ok ? "أُرسلت الرسالة" : r.error });
    return;
  }

  const ping = await pingService(service as string);
  res.json({ ok: ping.ok, message: ping.message });
});

export default router;
