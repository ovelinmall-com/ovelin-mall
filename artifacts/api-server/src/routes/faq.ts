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
  faqTable,
  faqFeedbackTable,
  statusComponentsTable,
} from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_FAQ = [
  {
    question: "كم تستغرق عملية شحن المحفظة؟",
    answer:
      "غالباً ما تتم عملية شحن المحفظة خلال 5-15 دقيقة بعد تأكيد العملية. في حال تأخر الشحن أكثر من ساعة، يرجى فتح تذكرة دعم.",
    category: "wallet",
    sortOrder: 1,
  },
  {
    question: "كيف يمكنني سحب رصيدي؟",
    answer:
      "من شاشة المحفظة اضغط على \"سحب\"، اختر طريقة السحب (USDT/تحويل بنكي/نقداً) والمبلغ ثم بيانات الوجهة. الحد الأدنى $5 وتتم المعالجة خلال 24 ساعة.",
    category: "wallet",
    sortOrder: 2,
  },
  {
    question: "متى يصل طلبي بعد الدفع؟",
    answer:
      "تختلف مدة التنفيذ حسب الخدمة، لكن معظم الطلبات تكتمل خلال أقل من ساعة. يمكنك متابعة حالة طلبك من شاشة \"طلباتي\".",
    category: "orders",
    sortOrder: 3,
  },
  {
    question: "هل يمكنني إلغاء الطلب بعد الدفع؟",
    answer:
      "يمكن إلغاء الطلب فقط إذا لم يبدأ التنفيذ بعد. افتح تفاصيل الطلب واضغط على \"طلب إلغاء\" أو تواصل مع الدعم.",
    category: "orders",
    sortOrder: 4,
  },
  {
    question: "كيف أصل لمستوى VIP أعلى؟",
    answer:
      "كلما زاد إنفاقك على المنصة، ارتفع مستواك تلقائياً (Bronze → Silver → Gold → Platinum → Diamond). كل مستوى يفتح كاشباك أعلى وعروضاً حصرية.",
    category: "lounge",
    sortOrder: 5,
  },
  {
    question: "كيف يعمل نظام الكاشباك؟",
    answer:
      "تحصل على نسبة من كل عملية شراء كرصيد كاشباك يضاف لرصيد منفصل، ويمكنك استخدامه لتخفيض ثمن أي طلب لاحقاً.",
    category: "lounge",
    sortOrder: 6,
  },
  {
    question: "نسيت كلمة المرور — ماذا أفعل؟",
    answer:
      "من شاشة تسجيل الدخول اضغط \"نسيت كلمة المرور\"، أدخل بريدك المسجّل ثم اتبع الرابط الذي سيصلك.",
    category: "account",
    sortOrder: 7,
  },
  {
    question: "كيف أحذف حسابي؟",
    answer:
      "من شاشة الحساب → الإعدادات → الخصوصية، يمكنك تقديم طلب حذف الحساب. سيتم حذف بياناتك خلال 30 يوماً.",
    category: "account",
    sortOrder: 8,
  },
  {
    question: "هل بياناتي محفوظة بشكل آمن؟",
    answer:
      "نعم، نستخدم تشفيراً صناعياً عالي المستوى لحماية بياناتك ومعاملاتك المالية، ولا نشارك بياناتك مع أي طرف ثالث.",
    category: "general",
    sortOrder: 9,
  },
  {
    question: "كيف أتواصل مع فريق الدعم؟",
    answer:
      "يمكنك فتح تذكرة دعم من خلال شاشة \"المساعدة\" → \"دعم فني\"، وسيرد عليك فريقنا خلال دقائق غالباً (وفي أسوأ الأحوال خلال 24 ساعة).",
    category: "general",
    sortOrder: 10,
  },
];

const DEFAULT_STATUS = [
  {
    name: "موقع OVELIN",
    description: "تطبيق الويب الرئيسي",
    status: "operational",
    sortOrder: 1,
  },
  {
    name: "بوابة الدفع",
    description: "شحن المحفظة وعمليات الدفع",
    status: "operational",
    sortOrder: 2,
  },
  {
    name: "المحفظة والتحويلات",
    description: "أرصدة المستخدمين والتحويلات الداخلية",
    status: "operational",
    sortOrder: 3,
  },
  {
    name: "الدعم الفني الذكي",
    description: "AI + الردود الفورية",
    status: "operational",
    sortOrder: 4,
  },
  {
    name: "الإشعارات",
    description: "إشعارات الويب والبريد",
    status: "operational",
    sortOrder: 5,
  },
];

async function ensureSeeded() {
  const c = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(faqTable);
  if (Number(c[0]?.c ?? 0) === 0) {
    await db.insert(faqTable).values(DEFAULT_FAQ);
  }
  const c2 = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(statusComponentsTable);
  if (Number(c2[0]?.c ?? 0) === 0) {
    await db.insert(statusComponentsTable).values(DEFAULT_STATUS);
  }
}

router.get("/faq", async (_req, res) => {
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(faqTable)
      .where(eq(faqTable.active, true))
      .orderBy(asc(faqTable.sortOrder), asc(faqTable.id));
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/status", async (_req, res) => {
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(statusComponentsTable)
      .orderBy(asc(statusComponentsTable.sortOrder), asc(statusComponentsTable.id));
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        status: r.status,
        uptimePct: "99.95",
      })),
    );
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/faq/:id/feedback", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const helpful = !!(req.body as any)?.helpful;
    const user = (req as any).user;
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "id غير صحيح" });
      return;
    }
    const exists = await db
      .select({ id: faqTable.id })
      .from(faqTable)
      .where(eq(faqTable.id, id))
      .limit(1);
    if (!exists.length) {
      res.status(404).json({ error: "السؤال غير موجود" });
      return;
    }
    await db.insert(faqFeedbackTable).values({
      faqId: id,
      userId: user?.id ?? null,
      helpful,
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
