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
import { db, settingsTable, profitMarginHistoryTable, productsTable } from "@workspace/db";
import { eq, isNotNull } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { audit } from "../../lib/services/auditLog";
import { getPublicSettings } from "../../lib/integrations";
import { emitToAll } from "../../lib/wsManager";

function calcSdgPerUnit(rateUsd: number, usdToSdg: number, profitMarginSdg: number): string {
  const raw = rateUsd * usdToSdg + profitMarginSdg;
  const per1000 = Math.ceil(raw / 100) * 100;
  return (per1000 / 1000).toFixed(6);
}

async function repriceAllSmmProducts(usdToSdg: number, profitMarginSdg: number): Promise<number> {
  const products = await db
    .select()
    .from(productsTable)
    .where(isNotNull(productsTable.smmServiceId));

  let updated = 0;
  for (const p of products) {
    const rateUsd = Number((p as any).smmRateUsd ?? 0);
    if (rateUsd <= 0) continue;
    const perUnit = calcSdgPerUnit(rateUsd, usdToSdg, profitMarginSdg);
    await db.update(productsTable).set({ price: perUnit }).where(eq(productsTable.id, p.id));
    updated++;
  }
  return updated;
}

const router: IRouter = Router();

const KEYS = [
  "siteName",
  "supportWhatsapp",
  "supportTelegram",
  "depositUsdtAddress",
  "depositBankInfo",
  "depositCashInfo",
  "minWithdraw",
  "minReferralWithdraw",
  "referralCommissionPct",
  "referralSignupBonus",
  "referralNotificationTemplate",
  "referralEnabled",
  "cashbackPct",
  "maintenanceMode",
  "maintenanceMessage",
  "announcementBar",
  "vipBronzeMin",
  "vipSilverMin",
  "vipGoldMin",
  "vipDiamondMin",
  "usdToSdg",
  "profitMarginSdg",
  "appInstallEnabled",
  "appInstallForced",
  "appInstallDesc",
  "onesignalAppId",
  "onesignalRestApiKey",
  "googleLoginEnabled",
  "callVerifyNumber",
];

const DEFAULTS: Record<string, string> = {
  siteName: "OVELIN",
  supportWhatsapp: "",
  supportTelegram: "",
  depositUsdtAddress: "",
  depositBankInfo: "",
  depositCashInfo: "",
  minWithdraw: "5",
  minReferralWithdraw: "2000",
  referralCommissionPct: "5",
  referralSignupBonus: "5",
  referralNotificationTemplate:
    "🎉 مبروك {name}! انضمّ {referredName} إلى أوفلين عبر كودك وحصلت على {amount} ج.س في رصيدك.",
  referralEnabled: "true",
  cashbackPct: "1",
  maintenanceMode: "false",
  maintenanceMessage: "",
  announcementBar: "",
  vipBronzeMin: "0",
  vipSilverMin: "100",
  vipGoldMin: "500",
  vipDiamondMin: "2000",
  usdToSdg: "800",
  profitMarginSdg: "0",
  appInstallEnabled: "false",
  appInstallForced: "false",
  appInstallDesc: "حمّل التطبيق لسهولة الاستخدام، وستحصل على بعض المكافآت",
  onesignalAppId: "",
  onesignalRestApiKey: "",
  googleLoginEnabled: "true",
  callVerifyNumber: "",
};

async function loadAll(): Promise<Record<string, string>> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = { ...DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}

function shape(map: Record<string, string>) {
  return {
    siteName: map.siteName,
    supportWhatsapp: map.supportWhatsapp,
    supportTelegram: map.supportTelegram,
    depositUsdtAddress: map.depositUsdtAddress,
    depositBankInfo: map.depositBankInfo,
    depositCashInfo: map.depositCashInfo,
    minWithdraw: map.minWithdraw,
    minReferralWithdraw: map.minReferralWithdraw,
    referralCommissionPct: map.referralCommissionPct,
    referralSignupBonus: map.referralSignupBonus,
    referralNotificationTemplate: map.referralNotificationTemplate,
    referralEnabled: map.referralEnabled === "true",
    cashbackPct: map.cashbackPct,
    maintenanceMode: map.maintenanceMode === "true",
    maintenanceMessage: map.maintenanceMessage,
    announcementBar: map.announcementBar,
    vipBronzeMin: map.vipBronzeMin,
    vipSilverMin: map.vipSilverMin,
    vipGoldMin: map.vipGoldMin,
    vipDiamondMin: map.vipDiamondMin,
    usdToSdg: map.usdToSdg,
    profitMarginSdg: map.profitMarginSdg,
    appInstallEnabled: map.appInstallEnabled === "true",
    appInstallForced: map.appInstallForced === "true",
    appInstallDesc: map.appInstallDesc,
    onesignalAppId: map.onesignalAppId ?? "",
    onesignalRestApiKey: map.onesignalRestApiKey ?? "",
    googleLoginEnabled: map.googleLoginEnabled === "true",
    callVerifyNumber: map.callVerifyNumber ?? "",
  };
}

router.get("/admin/settings", requireAdmin, async (_req, res) => {
  try {
    const map = await loadAll();
    res.json(shape(map));
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

router.patch("/admin/settings", requireAdmin, async (req, res) => {
  try {
    const body = req.body as Record<string, any>;
    const updates: Array<[string, string]> = [];
    for (const k of KEYS) {
      if (body[k] === undefined) continue;
      let v = body[k];
      if (typeof v === "boolean") v = v ? "true" : "false";
      updates.push([k, String(v)]);
    }
    let pricingChanged = false;
    for (const [key, value] of updates) {
      const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
      if (existing[0]) {
        // If profitMarginSdg changes, log the new value for period tracking
        if (key === "profitMarginSdg" && existing[0].value !== value) {
          await db.insert(profitMarginHistoryTable).values({ marginSdg: value });
        }
        if ((key === "usdToSdg" || key === "profitMarginSdg") && existing[0].value !== value) {
          pricingChanged = true;
        }
        await db
          .update(settingsTable)
          .set({ value, updatedAt: new Date() })
          .where(eq(settingsTable.key, key));
      } else {
        if (key === "profitMarginSdg") {
          await db.insert(profitMarginHistoryTable).values({ marginSdg: value });
        }
        if (key === "usdToSdg" || key === "profitMarginSdg") {
          pricingChanged = true;
        }
        await db.insert(settingsTable).values({ key, value });
      }
    }
    await audit("admin", "update_settings", "settings", null, updates.map(([k]) => k).join(","));
    const map = await loadAll();

    // Auto-reprice all SMM products whenever dollar rate or profit margin changes
    let repriceCount = 0;
    if (pricingChanged) {
      const usdToSdg = Number(map.usdToSdg ?? "800");
      const profitMarginSdg = Number(map.profitMarginSdg ?? "0");
      repriceCount = await repriceAllSmmProducts(usdToSdg, profitMarginSdg);
      // Bump priceVersion so the frontend detects the change and refetches
      const priceVersion = String(Date.now());
      const existingVersion = await db.select().from(settingsTable).where(eq(settingsTable.key, "priceVersion")).limit(1);
      if (existingVersion[0]) {
        await db.update(settingsTable).set({ value: priceVersion, updatedAt: new Date() }).where(eq(settingsTable.key, "priceVersion"));
      } else {
        await db.insert(settingsTable).values({ key: "priceVersion", value: priceVersion });
      }
      await audit("admin", "auto_reprice", "products", null, `updated=${repriceCount} usdToSdg=${usdToSdg} profitMarginSdg=${profitMarginSdg}`);
    }

    emitToAll("settings_update", {
      usdToSdg: map.usdToSdg,
      profitMarginSdg: map.profitMarginSdg,
    });
    res.json({ ...shape(map), autoRepriced: pricingChanged ? repriceCount : undefined });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

// Public settings — overrides whatever defaults the integration helper used
router.get("/settings/public-rich", async (_req, res) => {
  try {
    const map = await loadAll();
    const base = await getPublicSettings();
    res.json({
      siteName: map.siteName,
      supportWhatsapp: map.supportWhatsapp || "",
      supportTelegram: map.supportTelegram,
      depositAddresses: {
        usdt: map.depositUsdtAddress,
        bank: map.depositBankInfo,
        cash: map.depositCashInfo,
      },
      minWithdraw: map.minWithdraw,
      minReferralWithdraw: map.minReferralWithdraw,
      referralCommissionPct: map.referralCommissionPct,
      referralSignupBonus: map.referralSignupBonus,
      referralEnabled: map.referralEnabled === "true",
      cashbackPct: map.cashbackPct,
      maintenanceMode: map.maintenanceMode === "true",
      maintenanceMessage: map.maintenanceMessage,
      announcementBar: map.announcementBar,
      usdToSdg: map.usdToSdg,
      appInstallEnabled: map.appInstallEnabled === "true",
      appInstallForced: map.appInstallForced === "true",
      appInstallDesc: map.appInstallDesc,
      googleLoginEnabled: map.googleLoginEnabled === "true",
      callVerifyNumber: map.callVerifyNumber ?? "",
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
