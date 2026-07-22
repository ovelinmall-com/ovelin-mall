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
import { db, productsTable, ordersTable, orderEventsTable, settingsTable } from "@workspace/db";
import { eq, and, isNotNull, ne } from "drizzle-orm";
import { requireAdmin, requireUser } from "../lib/auth";
import { getLiveServiceRate } from "../lib/services/smmPriceSyncWorker";
import {
  safeDebit,
  adjustBalance,
  recordTransaction,
  addToTotalSpent,
  recomputeVip,
} from "../lib/services/wallet";
import { notify } from "../lib/services/notifications";
import { audit } from "../lib/services/auditLog";

const router: IRouter = Router();

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ ⚠️  تحذير صريح من صاحب المشروع                                         │
// │  مفتاح API المورد (honestsmm.com) مكتوب ظاهراً في الكود بإرادة         │
// │  صاحب المشروع تماماً. إذا قمت بحذفه أو تشفيره أو نقله لـ .env         │
// │  فأنت تخالف تعليماته الصريحة وهو يتحمل كامل المسؤولية.                │
// │  API Key: 0b28edf644be7e4c28874b5e3b2a44a4                             │
// └─────────────────────────────────────────────────────────────────────────┘
const SMM_KEY = "0b28edf644be7e4c28874b5e3b2a44a4";
const SMM_URL = "https://honestsmm.com/api/v2";

async function loadPricingSettings(): Promise<{ usdToSdg: number; profitMarginSdg: number }> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    usdToSdg: Number(map.usdToSdg ?? "800"),
    profitMarginSdg: Number(map.profitMarginSdg ?? "0"),
  };
}

function calcSdgPer1000(rateUsd: number, usdToSdg: number, profitMarginSdg: number): number {
  const raw = rateUsd * usdToSdg + profitMarginSdg;
  return Math.ceil(raw / 100) * 100;
}

function calcSdgPerUnit(rateUsd: number, usdToSdg: number, profitMarginSdg: number): string {
  const per1000 = calcSdgPer1000(rateUsd, usdToSdg, profitMarginSdg);
  return (per1000 / 1000).toFixed(6);
}

let _cache: any[] | null = null;
let _cacheAt = 0;
const CACHE_TTL = 30 * 60 * 1000;

async function getServices(): Promise<any[]> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;
  const body = new URLSearchParams({ key: SMM_KEY, action: "services" });
  const res = await fetch(SMM_URL, {
    method: "POST",
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const data = await res.json();
  _cache = Array.isArray(data) ? data : [];
  _cacheAt = Date.now();
  return _cache;
}

function translateName(name: string): string {
  return name
    .replace(/Facebook/gi, "فيسبوك")
    .replace(/Instagram/gi, "انستغرام")
    .replace(/TikTok/gi, "تيك توك")
    .replace(/Twitter/gi, "تويتر")
    .replace(/YouTube/gi, "يوتيوب")
    .replace(/Subscribers?/gi, "مشتركون")
    .replace(/Subscriber/gi, "مشترك")
    .replace(/Followers/gi, "متابعون")
    .replace(/Follower/gi, "متابع")
    .replace(/Likes/gi, "إعجابات")
    .replace(/Like/gi, "إعجاب")
    .replace(/Reactions?/gi, "تفاعلات")
    .replace(/Views/gi, "مشاهدات")
    .replace(/View/gi, "مشاهدة")
    .replace(/Comments/gi, "تعليقات")
    .replace(/Comment/gi, "تعليق")
    .replace(/Shares/gi, "مشاركات")
    .replace(/Share/gi, "مشاركة")
    .replace(/Page/gi, "صفحة")
    .replace(/Profile/gi, "ملف شخصي")
    .replace(/Post/gi, "منشور")
    .replace(/Video/gi, "فيديو")
    .replace(/Reels?/gi, "ريلز")
    .replace(/Live\s*Stream/gi, "بث مباشر")
    .replace(/Live/gi, "مباشر")
    .replace(/Real/gi, "حقيقيون")
    .replace(/(\d+)\s*Day\s*Refill/gi, "ضمان $1 يوم")
    .replace(/Lifetime\s*Guaranteed/gi, "ضمان مدى الحياة")
    .replace(/No\s*Refill/gi, "بدون ضمان")
    .replace(/Speed[:\s]*([\d\-K\/]+)/gi, "سرعة $1/يوم")
    .replace(/Max\s*([\d\.MKm]+)/gi, "حد أقصى $1")
    .replace(/UHQ/gi, "جودة عالية")
    .replace(/Hearts?/gi, "قلوب")
    .replace(/Package/gi, "باقة")
    .replace(/Growth/gi, "نمو")
    .replace(/WatchTime/gi, "وقت المشاهدة")
    .replace(/Minutes/gi, "دقيقة")
    .replace(/Seconds?/gi, "ثانية")
    .replace(/Stories/gi, "ستوريات")
    .replace(/Story/gi, "ستوري")
    .replace(/Carousel/gi, "كاروسيل")
    .replace(/NEW!\s*/gi, "🆕 ")
    .replace(/[🟡🟢🔵⭐⌊⌉]/gu, "")
    .replace(/\|/g, "•")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function badgeFor(name: string): "followers" | "likes" | "views" | "comments" | "shares" {
  const n = name.toLowerCase();
  if (n.includes("follower") || n.includes("subscriber") || n.includes("member")) return "followers";
  if (n.includes("comment") || n.includes("reply")) return "comments";
  if (n.includes("share") || n.includes("retweet") || n.includes("repost")) return "shares";
  if (n.includes("like") || n.includes("reaction") || n.includes("heart")) return "likes";
  if (n.includes("view") || n.includes("watch") || n.includes("impression")) return "views";
  return "followers";
}

async function defaultSdgPrice(rateUsd: number): Promise<string> {
  const { usdToSdg, profitMarginSdg } = await loadPricingSettings();
  return calcSdgPerUnit(rateUsd, usdToSdg, profitMarginSdg);
}

const SMM_PLATFORMS: Array<{
  platform: string;
  apiKeyword: string;
  arName: string;
}> = [
  { platform: "instagram", apiKeyword: "instagram", arName: "انستغرام" },
  { platform: "facebook",  apiKeyword: "facebook",  arName: "فيسبوك"   },
  { platform: "tiktok",    apiKeyword: "tiktok",    arName: "تيك توك"  },
  { platform: "twitter",   apiKeyword: "twitter",   arName: "تويتر"    },
  { platform: "youtube",   apiKeyword: "youtube",   arName: "يوتيوب"   },
  { platform: "snapchat",  apiKeyword: "snapchat",  arName: "سناب شات" },
  { platform: "telegram",  apiKeyword: "telegram",  arName: "تيليغرام" },
];

router.get("/smm/services", async (_req, res) => {
  try {
    const services = await getServices();
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل جلب الخدمات" });
  }
});

router.get("/admin/smm/products", requireAdmin, async (_req, res) => {
  try {
    const list = await db
      .select()
      .from(productsTable)
      .where(isNotNull(productsTable.smmServiceId))
      .orderBy(productsTable.platform, productsTable.name);
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.post("/admin/smm/seed", requireAdmin, async (req, res) => {
  try {
    const clearOld = (req.body as any)?.clear === true;
    if (clearOld) {
      await db.delete(productsTable).where(eq(productsTable.category, "social_followers"));
    }

    // جلب كل الخدمات من المورد + إعدادات التسعير — دفعة واحدة
    const [services, { usdToSdg, profitMarginSdg }] = await Promise.all([
      getServices(),
      loadPricingSettings(),
    ]);

    // جلب كل المنتجات الموجودة حالياً (smmServiceId → id) — استعلام واحد
    const existingRows = await db
      .select({ id: productsTable.id, smmServiceId: (productsTable as any).smmServiceId })
      .from(productsTable)
      .where(isNotNull((productsTable as any).smmServiceId));
    const existingMap = new Map<string, number>(
      existingRows.map((r: any) => [String(r.smmServiceId), r.id]),
    );

    const TYPE_AR: Record<string, string> = {
      followers: "متابعون",
      likes:     "إعجابات",
      views:     "مشاهدات",
      comments:  "تعليقات",
      shares:    "مشاركات",
    };

    // اجمع كل العمليات المطلوبة بدون قيود على الكمية
    const toInsert: any[] = [];
    const toUpdate: Array<{ id: number; data: any }> = [];

    for (const { platform, apiKeyword, arName } of SMM_PLATFORMS) {
      const platformServices = services.filter((s: any) => {
        const n = s.name.toLowerCase();
        if (platform === "tiktok") return n.includes("tiktok") || n.includes("tik tok");
        if (platform === "twitter") return n.includes("twitter") || (n.includes(" x ") && (n.includes("follower") || n.includes("like") || n.includes("view") || n.includes("retweet")));
        return n.includes(apiKeyword);
      });

      // رتّبها بالسعر تصاعدياً للـ sortOrder
      const sorted = [...platformServices].sort((a, b) => Number(a.rate) - Number(b.rate));

      for (let i = 0; i < sorted.length; i++) {
        const s = sorted[i];
        const smmId = String(s.service);
        const rateUsd = Number(s.rate);
        const smmMin = Number(s.min) || 10;
        const smmMax = Number(s.max) || 100000;
        const type = badgeFor(s.name);
        const arabicName = translateName(s.name);
        const typeAr = TYPE_AR[type] ?? type;
        const smmProviderType = String(s.type ?? "");
        const pricePerUnit = calcSdgPerUnit(rateUsd, usdToSdg, profitMarginSdg);
        const productName = `${typeAr} ${arName} • ${arabicName.slice(0, 60)}`;
        const description = `${arabicName} • الحد الأدنى: ${smmMin.toLocaleString("ar")} • الحد الأقصى: ${smmMax.toLocaleString("ar")}`;
        const sortVal = sorted.length - i; // الأرخص يظهر أولاً

        const existingId = existingMap.get(smmId);
        if (existingId) {
          toUpdate.push({
            id: existingId,
            data: {
              name: productName,
              description,
              platform,
              category: "social_followers",
              badge: type,
              smmMin,
              smmMax,
              smmRateUsd: rateUsd.toFixed(6),
              smmType: smmProviderType,
              sortOrder: sortVal,
              active: true,
            },
          });
        } else {
          toInsert.push({
            name: productName,
            description,
            price: pricePerUnit,
            category: "social_followers",
            platform,
            badge: type,
            deliveryTime: "1-24 ساعة",
            active: true,
            sortOrder: sortVal,
            smmServiceId: smmId,
            smmRateUsd: rateUsd.toFixed(6),
            smmMin,
            smmMax,
            smmType: smmProviderType,
          });
        }
      }
    }

    // ─── Batch INSERT: دفعات 100 في المرة ───────────────────────────
    const INSERT_CHUNK = 100;
    let created = 0;
    for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
      const chunk = toInsert.slice(i, i + INSERT_CHUNK);
      await db.insert(productsTable).values(chunk as any);
      created += chunk.length;
    }

    // ─── Batch UPDATE: 10 متوازية في المرة ──────────────────────────
    const UPDATE_PARALLEL = 10;
    let updated = 0;
    for (let i = 0; i < toUpdate.length; i += UPDATE_PARALLEL) {
      const batch = toUpdate.slice(i, i + UPDATE_PARALLEL);
      await Promise.all(
        batch.map(({ id, data }) =>
          db.update(productsTable).set(data as any).where(eq(productsTable.id, id)),
        ),
      );
      updated += batch.length;
    }

    await audit("admin", "smm_seed", "products", null, `created=${created} updated=${updated}`);
    res.json({ ok: true, created, updated });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل بذر الخدمات" });
  }
});

router.post("/smm/order", requireUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { productId, link, quantity, comments } = req.body as {
      productId?: number;
      link?: string;
      quantity?: number;
      comments?: string;
    };

    if (!productId || !link?.trim()) {
      res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
      return;
    }

    const rows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, Number(productId)))
      .limit(1);
    const product = rows[0];
    if (!product || !product.active) {
      res.status(404).json({ error: "الخدمة غير متاحة" });
      return;
    }

    // ══════════════════════════════════════════════════════════════
    // مانع التكرار: إذا كان للمستخدم طلب جارٍ (pending/processing)
    // لنفس الخدمة ونفس الرابط — يُمنع الطلب الجديد حتى يكتمل
    // ══════════════════════════════════════════════════════════════
    const duplicate = await db
      .select({ id: ordersTable.id, status: ordersTable.status })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.userId, user.id),
          eq(ordersTable.productId, Number(productId)),
          eq(ordersTable.targetInfo, link.trim()),
          ne(ordersTable.status, "completed"),
          ne(ordersTable.status, "cancelled"),
        ),
      )
      .limit(1);

    if (duplicate[0]) {
      const st = duplicate[0].status === "processing" ? "جارٍ التنفيذ" : "قيد المراجعة";
      res.status(409).json({
        error: `لديك طلب ${st} لنفس الرابط وهذه الخدمة (رقم #${duplicate[0].id}). انتظر حتى يكتمل قبل إرسال طلب جديد.`,
      });
      return;
    }

    const smmServiceId = (product as any).smmServiceId as string | null;
    const smmMin = (product as any).smmMin as number | null;
    const smmMax = (product as any).smmMax as number | null;
    const smmType = ((product as any).smmType as string | null) ?? "";
    const isCustomComments = smmType.toLowerCase().includes("custom");

    if (isCustomComments) {
      const lines = (comments ?? "").split("\n").map((l: string) => l.trim()).filter(Boolean);
      if (lines.length === 0) {
        res.status(400).json({ error: "يجب كتابة تعليق واحد على الأقل" });
        return;
      }
    } else {
      if (!quantity || quantity < 1) {
        res.status(400).json({ error: "يجب تحديد الكمية" });
        return;
      }
      if (smmMin && quantity < smmMin) {
        res.status(400).json({ error: `الحد الأدنى للطلب: ${smmMin}` });
        return;
      }
      if (smmMax && quantity > smmMax) {
        res.status(400).json({ error: `الحد الأقصى للطلب: ${smmMax.toLocaleString()}` });
        return;
      }
    }

    // ══════════════════════════════════════════════════════════════
    // التسعير الحي: استخدم السعر الحي من ذاكرة الـ worker إن وُجد،
    // وإلا ارجع للسعر المخزون في الداتابيز — يضمن الخصم بالسعر الصحيح
    // حتى لو تغيّر السعر في المورد بعد آخر دورة مزامنة بثوانٍ.
    // ══════════════════════════════════════════════════════════════
    let unitPrice: number;
    if (smmServiceId) {
      const liveRateUsd = getLiveServiceRate(smmServiceId);
      if (liveRateUsd !== undefined) {
        const { usdToSdg, profitMarginSdg } = await loadPricingSettings();
        const per1000 = Math.ceil((liveRateUsd * usdToSdg + profitMarginSdg) / 100) * 100;
        unitPrice = per1000 / 1000;
      } else {
        unitPrice = Number(product.price);
      }
    } else {
      unitPrice = Number(product.price);
    }
    const pricePerThousand = unitPrice * 1000;
    const lines = isCustomComments
      ? (comments ?? "").split("\n").map((l: string) => l.trim()).filter(Boolean)
      : [];
    const qty = isCustomComments ? lines.length : Number(quantity);
    // Proportional pricing: exact qty × unit price (not blocks)
    const totalPrice = parseFloat((unitPrice * qty).toFixed(2));

    try {
      await safeDebit(user.id, "balance", totalPrice);
    } catch {
      res.status(400).json({ error: "الرصيد غير كافٍ — اشحن المحفظة أولاً" });
      return;
    }

    let smmOrderId: string | null = null;

    if (smmServiceId) {
      try {
        const params: Record<string, string> = {
          key: SMM_KEY,
          action: "add",
          service: smmServiceId,
          link: link.trim(),
        };
        if (isCustomComments) {
          params.comments = lines.join("\n");
        } else {
          params.quantity = String(qty);
        }
        const body = new URLSearchParams(params);
        const smmRes = await fetch(SMM_URL, {
          method: "POST",
          body: body.toString(),
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        const smmData = await smmRes.json() as any;
        if (smmData.error) {
          await adjustBalance(user.id, "balance", totalPrice);
          res.status(400).json({ error: `خطأ من المورد: ${smmData.error}` });
          return;
        }
        smmOrderId = smmData.order ? String(smmData.order) : null;
      } catch {
        await adjustBalance(user.id, "balance", totalPrice);
        res.status(500).json({ error: "فشل الاتصال بالمورد — تم إرجاع رصيدك" });
        return;
      }
    }

    const inserted = await db
      .insert(ordersTable)
      .values({
        userId: user.id,
        productId: product.id,
        productName: product.name,
        price: pricePerThousand.toFixed(2),
        discount: "0",
        cashbackUsed: "0",
        finalPrice: totalPrice.toFixed(2),
        targetInfo: link.trim(),
        notes: `الكمية: ${qty}`,
        status: smmOrderId ? "processing" : "pending",
        deliveredCode: smmOrderId,
      })
      .returning();

    const order = inserted[0]!;

    await db.insert(orderEventsTable).values({
      orderId: order.id,
      status: order.status,
      message: smmOrderId
        ? `تم تأكيد الطلب بنجاح`
        : "الطلب قيد المراجعة",
    });

    await recordTransaction(
      user.id,
      "order",
      -totalPrice,
      "completed",
      null,
      `order#${order.id}`,
    );
    await addToTotalSpent(user.id, totalPrice);
    await recomputeVip(user.id);
    await notify(
      user.id,
      "order",
      "تم إرسال طلبك",
      `${product.name} • ${qty.toLocaleString("ar")} وحدة • ${totalPrice.toFixed(2)} ج.س`,
      `/orders`,
    );

    await audit(user.username, "smm_order", "orders", order.id, {
      productId: product.id,
      smmOrderId,
      qty,
      totalPrice,
    });

    res.json({ order, smmOrderId });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل إنشاء الطلب" });
  }
});

// ── Admin: test connection to external SMM provider ──────────────────────────
// ── Admin: رصيد المورد الحقيقي ────────────────────────────────────────────────
router.get("/admin/smm/balance", requireAdmin, async (_req, res) => {
  try {
    const body = new URLSearchParams({ key: SMM_KEY, action: "balance" });
    const r = await fetch(SMM_URL, {
      method: "POST",
      body: body.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json() as any;
    if (data?.error) return void res.status(502).json({ error: data.error });
    const balanceUsd = parseFloat(data?.balance ?? "0");
    const { usdToSdg } = await loadPricingSettings();
    res.json({
      balanceUsd,
      balanceSdg: balanceUsd * usdToSdg,
      usdToSdg,
      currency: (data?.currency as string) ?? "USD",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(502).json({ error: err?.message ?? "فشل جلب الرصيد من المورد" });
  }
});

router.post("/admin/smm/reprice", requireAdmin, async (_req, res) => {
  try {
    const { usdToSdg, profitMarginSdg } = await loadPricingSettings();
    const products = await db
      .select()
      .from(productsTable)
      .where(isNotNull(productsTable.smmServiceId));

    let updated = 0;
    for (const p of products) {
      const rateUsd = Number((p as any).smmRateUsd ?? 0);
      if (rateUsd <= 0) continue;
      const perUnit = calcSdgPerUnit(rateUsd, usdToSdg, profitMarginSdg);
      await db
        .update(productsTable)
        .set({ price: perUnit })
        .where(eq(productsTable.id, p.id));
      updated++;
    }

    await audit("admin", "smm_reprice", "products", null, `updated=${updated} usdToSdg=${usdToSdg} profitMarginSdg=${profitMarginSdg}`);
    res.json({ ok: true, updated, usdToSdg, profitMarginSdg });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل إعادة التسعير" });
  }
});

router.get("/admin/smm/connection-status", requireAdmin, async (_req, res) => {
  try {
    const body = new URLSearchParams({ key: SMM_KEY, action: "services" });
    const r = await fetch(SMM_URL, {
      method: "POST",
      body: body.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json();
    const services: any[] = Array.isArray(data) ? data : [];
    const instagramCount = services.filter((s) => s.name.toLowerCase().includes("instagram")).length;
    const facebookCount  = services.filter((s) => s.name.toLowerCase().includes("facebook")).length;
    const twitterCount   = services.filter((s) => s.name.toLowerCase().includes("twitter")).length;
    const youtubeCount   = services.filter((s) => s.name.toLowerCase().includes("youtube")).length;
    res.json({
      ok: true,
      provider: "honestsmm.com",
      totalServices: services.length,
      breakdown: { instagram: instagramCount, facebook: facebookCount, twitter: twitterCount, youtube: youtubeCount },
      sampleService: services[0]?.name ?? null,
    });
  } catch (err: any) {
    res.json({ ok: false, error: err?.message ?? "فشل الاتصال بالمورد" });
  }
});

// ── Admin: seed Free Fire products (110 & 220 diamonds) ──────────────────────
router.post("/admin/smm/seed-freefire", requireAdmin, async (_req, res) => {
  try {
    const FREEFIRE_PRODUCTS = [
      {
        name: "فري فاير 110 ماسة",
        description: "بطاقة شحن فري فاير — 110 ماسة • تسليم فوري بالكود",
        category: "gift_cards" as const,
        platform: "Free Fire",
        quantity: "110 ماسة",
        deliveryTime: "فوري",
        badge: "instant",
        price: "5.00",
        oldPrice: "6.00",
        imageUrl: null,
        active: true,
        sortOrder: 100,
      },
      {
        name: "فري فاير 220 ماسة",
        description: "بطاقة شحن فري فاير — 220 ماسة • تسليم فوري بالكود",
        category: "gift_cards" as const,
        platform: "Free Fire",
        quantity: "220 ماسة",
        deliveryTime: "فوري",
        badge: "instant",
        price: "9.50",
        oldPrice: "11.00",
        imageUrl: null,
        active: true,
        sortOrder: 99,
      },
    ];

    const { db, productsTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    let created = 0;
    let updated = 0;

    for (const p of FREEFIRE_PRODUCTS) {
      const existing = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(eq(productsTable.name, p.name))
        .limit(1);
      if (existing[0]) {
        await db.update(productsTable).set({ ...p }).where(eq(productsTable.id, existing[0].id));
        updated++;
      } else {
        await db.insert(productsTable).values({ ...p });
        created++;
      }
    }

    res.json({ ok: true, created, updated, message: `✅ فري فاير — أُنشئ: ${created} • حُدّث: ${updated}` });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.get("/smm/order-status/:smmOrderId", requireUser, async (req, res) => {
  try {
    const smmOrderId = req.params.smmOrderId as string;
    const body = new URLSearchParams({
      key: SMM_KEY,
      action: "status",
      order: smmOrderId,
    });
    const smmRes = await fetch(SMM_URL, {
      method: "POST",
      body: body.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = await smmRes.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
