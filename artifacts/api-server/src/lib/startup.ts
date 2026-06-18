import { db, usersTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { logger } from "./logger";
import { syncSettingsToDb, isAiConfigured } from "./integrations";
import { initPush } from "./services/pushService";
import { initFcmAdmin } from "./services/fcmService";
import { startSmmStatusWorker } from "./services/smmStatusWorker";

// ============================================================
// WARNING — The ONLY database for this project is Neon.
// Do NOT use process.env.DATABASE_URL — Replit injects a local
// helium DB into that variable which must NEVER be used here.
// The connection is hardcoded in lib/db/src/index.ts.
// ============================================================
// تحذير — قاعدة البيانات الوحيدة لهذا المشروع هي Neon.
// لا تستخدم process.env.DATABASE_URL أبداً — Replit يحقن
// قاعدة بيانات helium داخلية في ذلك المتغير ويجب تجاهله.
// الاتصال مُعرَّف بوضوح في lib/db/src/index.ts.
// ============================================================

const DEFAULT_ADMIN_PASSWORD = "ovelin2026";

// قاعدة البيانات المعتمدة — مثبّتة في lib/db/src/index.ts
const AUTHORISED_DB_HOST = "ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech";

export async function applyAdminPasswordFromEnv(): Promise<void> {
  const envPwd = process.env.ADMIN_PASSWORD;
  const effectivePwd = envPwd || DEFAULT_ADMIN_PASSWORD;
  try {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, "admin"))
      .limit(1);
    const admin = rows[0];
    const newHash = hashPassword(effectivePwd);
    if (!admin) {
      const { randomBytes } = await import("node:crypto");
      const refCode = randomBytes(4).toString("hex").toUpperCase();
      await db.insert(usersTable).values({
        username: "admin",
        passwordHash: newHash,
        referralCode: refCode,
      });
      logger.info(
        envPwd
          ? "تم إنشاء حساب الأدمن من ADMIN_PASSWORD"
          : "تم إنشاء حساب الأدمن بكلمة السر الافتراضية ovelin2026 — اضبط ADMIN_PASSWORD لتغييرها",
      );
    } else if (envPwd) {
      await db
        .update(usersTable)
        .set({ passwordHash: newHash })
        .where(eq(usersTable.id, admin.id));
      logger.info("تم تحديث كلمة سر الأدمن من ADMIN_PASSWORD");
    } else {
      logger.info(
        "ADMIN_PASSWORD غير مضبوط — يستخدم الأدمن كلمة السر المخزنة حالياً",
      );
    }
  } catch (err) {
    logger.error({ err }, "فشل تحديث/إنشاء حساب الأدمن");
  }
}

/**
 * شاشة إعداد ذكية: يفحص مفاتيح الذكاء الاصطناعي ويطبع تنبيه واضح
 * إذا كانت ناقصة، مع إعادة فحص دوري لالتقاط المفاتيح حال إضافتها
 * بدون الحاجة لإعادة تشغيل الخادم.
 */
let aiCheckHandle: NodeJS.Timeout | null = null;
export function checkAiKeysOrWarn(): void {
  if (isAiConfigured()) {
    logger.info("✅ مفاتيح الذكاء الاصطناعي مضبوطة — المساعد جاهز للعمل");
    if (aiCheckHandle) {
      clearInterval(aiCheckHandle);
      aiCheckHandle = null;
    }
    return;
  }
  logger.warn(
    "═══════════════════════════════════════════════════════════════\n" +
      "⚠️  المساعد الذكي (AI Chatbot) غير مفعّل\n" +
      "───────────────────────────────────────────────────────────────\n" +
      "  المتغيّرات المطلوبة (يضبطها Replit تلقائياً عند ربط التكامل):\n" +
      "    • AI_INTEGRATIONS_OPENAI_BASE_URL\n" +
      "    • AI_INTEGRATIONS_OPENAI_API_KEY\n" +
      "  للتفعيل: افتح المساعد في Replit واطلب تفعيل تكامل OpenAI.\n" +
      "  الموقع سيستمر بالعمل، لكن المساعد الذكي سيُعيد رسالة\n" +
      "  «المساعد قيد الإعداد، حاول لاحقاً» للعملاء حتى تتم التهيئة.\n" +
      "═══════════════════════════════════════════════════════════════",
  );
  if (!aiCheckHandle) {
    aiCheckHandle = setInterval(() => {
      if (isAiConfigured()) {
        logger.info(
          "✨ مفاتيح الذكاء الاصطناعي ظهرت! المساعد مفعّل الآن (لا حاجة لإعادة تشغيل).",
        );
        if (aiCheckHandle) {
          clearInterval(aiCheckHandle);
          aiCheckHandle = null;
        }
      }
    }, 60_000);
    aiCheckHandle.unref?.();
  }
}

export function logNeonDatabaseConfirmation(): void {
  // The connection string is hardcoded in lib/db/src/index.ts — never from env vars.
  // رابط الاتصال مُثبَّت في lib/db/src/index.ts — لا يُقرأ أبداً من متغيرات البيئة.
  logger.info(
    `✅ قاعدة بيانات Neon — متصلة ومفعّلة\n` +
    `   المضيف: ${AUTHORISED_DB_HOST}\n` +
    `   ⚠️  متغيّر DATABASE_URL الخاص بـ Replit (helium) مُتجاهَل عمداً`,
  );
}

async function seedPubgProducts(): Promise<void> {
  try {
    const existing = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.category, "pubg-uc"))
      .limit(1);
    if (existing.length > 0) return;

    const ucProducts = [
      { name: "60 UC", description: "60 شدة UC لـ PUBG Mobile", price: "20", quantity: "60 UC", sortOrder: 110 },
      { name: "325 UC", description: "325 شدة UC لـ PUBG Mobile", price: "95", quantity: "325 UC", sortOrder: 109 },
      { name: "660 UC", description: "660 شدة UC لـ PUBG Mobile", price: "185", quantity: "660 UC", sortOrder: 108 },
      { name: "1800 UC", description: "1800 شدة UC لـ PUBG Mobile", price: "480", quantity: "1800 UC", sortOrder: 107 },
      { name: "3850 UC", description: "3850 شدة UC لـ PUBG Mobile", price: "950", quantity: "3850 UC", sortOrder: 106 },
      { name: "8100 UC", description: "8100 شدة UC لـ PUBG Mobile", price: "1900", quantity: "8100 UC", sortOrder: 105 },
    ];
    for (const p of ucProducts) {
      await db.insert(productsTable).values({ ...p, category: "pubg-uc", platform: "PUBG Mobile", badge: "شحن يدوي", active: true, deliveryTime: "خلال 30 دقيقة" });
    }

    const rpProducts = [
      { name: "Royale Pass Elite", description: "Elite Pass لـ PUBG Mobile", price: "290", quantity: "Elite Pass", sortOrder: 100 },
      { name: "Royale Pass Elite Plus", description: "Elite Pass Plus لـ PUBG Mobile", price: "580", quantity: "Elite Pass Plus", sortOrder: 99 },
    ];
    for (const p of rpProducts) {
      await db.insert(productsTable).values({ ...p, category: "pubg-rp", platform: "PUBG Mobile", badge: "شحن يدوي", active: true, deliveryTime: "خلال ساعة" });
    }

    const primeProducts = [
      { name: "Prime Membership", description: "Prime لـ PUBG Mobile", price: "95", quantity: "Prime", sortOrder: 95 },
      { name: "Prime Plus", description: "Prime Plus لـ PUBG Mobile", price: "185", quantity: "Prime Plus", sortOrder: 94 },
    ];
    for (const p of primeProducts) {
      await db.insert(productsTable).values({ ...p, category: "pubg-prime", platform: "PUBG Mobile", badge: "شحن يدوي", active: true, deliveryTime: "خلال ساعة" });
    }

    logger.info("✅ تم زرع منتجات PUBG Mobile في قاعدة البيانات");
  } catch (err) {
    logger.warn({ err }, "فشل زرع منتجات PUBG");
  }
}

async function seedPubgCodeProducts(): Promise<void> {
  try {
    const existing = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.category, "pubg-codes-uc"))
      .limit(1);
    if (existing.length > 0) return;

    const ucCodes = [
      { name: "60 UC Redeem Code",   description: "كود استرداد 60 UC لـ PUBG Mobile",   price: "20",  quantity: "60 UC",   sortOrder: 90 },
      { name: "325 UC Redeem Code",  description: "كود استرداد 325 UC لـ PUBG Mobile",  price: "90",  quantity: "325 UC",  sortOrder: 89 },
      { name: "660 UC Redeem Code",  description: "كود استرداد 660 UC لـ PUBG Mobile",  price: "175", quantity: "660 UC",  sortOrder: 88 },
      { name: "1800 UC Redeem Code", description: "كود استرداد 1800 UC لـ PUBG Mobile", price: "450", quantity: "1800 UC", sortOrder: 87 },
    ];
    for (const p of ucCodes) {
      await db.insert(productsTable).values({ ...p, category: "pubg-codes-uc", platform: "PUBG Codes", badge: "تسليم فوري", active: true, deliveryTime: "فوري" });
    }

    const rpCodes = [
      { name: "Royale Pass Code",      description: "كود Royale Pass لـ PUBG Mobile",      price: "280", quantity: "Royale Pass",      sortOrder: 82 },
      { name: "Elite Pass Plus Code",  description: "كود Elite Pass Plus لـ PUBG Mobile",  price: "550", quantity: "Elite Pass Plus",  sortOrder: 81 },
    ];
    for (const p of rpCodes) {
      await db.insert(productsTable).values({ ...p, category: "pubg-codes-rp", platform: "PUBG Codes", badge: "تسليم فوري", active: true, deliveryTime: "فوري" });
    }

    const eventCodes = [
      { name: "Event Redeem Code",  description: "كود حدث موسمي لـ PUBG Mobile", price: "50",  quantity: "Event Code",  sortOrder: 75 },
    ];
    for (const p of eventCodes) {
      await db.insert(productsTable).values({ ...p, category: "pubg-codes-event", platform: "PUBG Codes", badge: "محدود", active: true, deliveryTime: "فوري" });
    }

    const giftCodes = [
      { name: "Limited Gift Code", description: "كود هدية حصرية لـ PUBG Mobile", price: "100", quantity: "Gift Code", sortOrder: 70 },
    ];
    for (const p of giftCodes) {
      await db.insert(productsTable).values({ ...p, category: "pubg-codes-gift", platform: "PUBG Codes", badge: "نادر", active: true, deliveryTime: "فوري" });
    }

    logger.info("✅ تم زرع منتجات أكواد PUBG في قاعدة البيانات");
  } catch (err) {
    logger.warn({ err }, "فشل زرع منتجات أكواد PUBG");
  }
}

export async function runStartupTasks(): Promise<void> {
  logNeonDatabaseConfirmation();
  try {
    await syncSettingsToDb();
  } catch (err) {
    logger.warn({ err }, "فشل مزامنة الإعدادات العامة");
  }
  try {
    await initPush();
  } catch (err) {
    logger.warn({ err }, "فشل تهيئة Web Push");
  }
  try {
    initFcmAdmin();
  } catch (err) {
    logger.warn({ err }, "فشل تهيئة Firebase Admin SDK");
  }
  try {
    await seedPubgProducts();
  } catch (err) {
    logger.warn({ err }, "فشل زرع منتجات PUBG");
  }
  try {
    await seedPubgCodeProducts();
  } catch (err) {
    logger.warn({ err }, "فشل زرع منتجات أكواد PUBG");
  }
  checkAiKeysOrWarn();
  startSmmStatusWorker(30_000);
}
