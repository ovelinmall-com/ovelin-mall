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

import { db, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export const CATEGORY_META: Record<
  string,
  { name: string; description: string; icon: string }
> = {
  social_followers: {
    name: "متابعين سوشيال ميديا",
    description: "إنستجرام، تيك توك، يوتيوب، تويتر — متابعين حقيقيين",
    icon: "users",
  },
  usdt_exchange: {
    name: "USDT — صرف وشحن",
    description: "بيع وشراء USDT مع أفضل الأسعار",
    icon: "coins",
  },
  game_cards: {
    name: "بطاقات الألعاب",
    description: "شدات ببجي، جواهر فري فاير، بطاقات Steam",
    icon: "gamepad-2",
  },
  app_subscriptions: {
    name: "اشتراكات التطبيقات",
    description: "نتفلكس، شاهد، Spotify، تطبيقات IPTV",
    icon: "play",
  },
  website_design: {
    name: "تصميم وبرمجة المواقع",
    description: "مواقع متاجر، استضافة، تصاميم احترافية",
    icon: "code",
  },
  telegram_bots: {
    name: "بوتات تليجرام",
    description: "بوتات أتمتة، إدارة قنوات، خدمات مدفوعة",
    icon: "bot",
  },
};

export async function getCategoriesWithCounts() {
  const rows = await db
    .select({
      slug: productsTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(productsTable)
    .where(eq(productsTable.active, true))
    .groupBy(productsTable.category);
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.slug, Number(r.count));

  const all = new Set([...Object.keys(CATEGORY_META), ...counts.keys()]);
  return Array.from(all).map((slug) => {
    const meta = CATEGORY_META[slug] ?? {
      name: slug,
      description: "",
      icon: "package",
    };
    return {
      slug,
      name: meta.name,
      description: meta.description,
      icon: meta.icon,
      productCount: counts.get(slug) ?? 0,
    };
  });
}
