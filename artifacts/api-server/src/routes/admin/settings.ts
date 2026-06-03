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
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";
import { audit } from "../../lib/services/auditLog";
import { getPublicSettings } from "../../lib/integrations";

const router: IRouter = Router();

const KEYS = [
  "siteName",
  "supportWhatsapp",
  "supportTelegram",
  "depositUsdtAddress",
  "depositBankInfo",
  "depositCashInfo",
  "minWithdraw",
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
];

const DEFAULTS: Record<string, string> = {
  siteName: "OVELIN",
  supportWhatsapp: "",
  supportTelegram: "",
  depositUsdtAddress: "",
  depositBankInfo: "",
  depositCashInfo: "",
  minWithdraw: "5",
  referralCommissionPct: "5",
  referralSignupBonus: "5",
  referralNotificationTemplate:
    "🎉 مبروك {name}! انضمّ {referredName} إلى أوفلين عبر كودك وحصلت على {amount} ريال في رصيدك.",
  referralEnabled: "true",
  cashbackPct: "1",
  maintenanceMode: "false",
  maintenanceMessage: "",
  announcementBar: "",
  vipBronzeMin: "0",
  vipSilverMin: "100",
  vipGoldMin: "500",
  vipDiamondMin: "2000",
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
    for (const [key, value] of updates) {
      const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
      if (existing[0]) {
        await db
          .update(settingsTable)
          .set({ value, updatedAt: new Date() })
          .where(eq(settingsTable.key, key));
      } else {
        await db.insert(settingsTable).values({ key, value });
      }
    }
    await audit("admin", "update_settings", "settings", null, updates.map(([k]) => k).join(","));
    const map = await loadAll();
    res.json(shape(map));
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
      referralCommissionPct: map.referralCommissionPct,
      referralSignupBonus: map.referralSignupBonus,
      referralEnabled: map.referralEnabled === "true",
      cashbackPct: map.cashbackPct,
      maintenanceMode: map.maintenanceMode === "true",
      maintenanceMessage: map.maintenanceMessage,
      announcementBar: map.announcementBar,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "فشل" });
  }
});

export default router;
