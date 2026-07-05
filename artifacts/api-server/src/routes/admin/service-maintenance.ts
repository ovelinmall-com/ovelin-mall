// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq, like } from "drizzle-orm";
import { requireAdmin } from "../../lib/auth";

const router: IRouter = Router();
const PREFIX = "svc_maint:";

export const ALL_SLUGS = [
  "pubg","free-fire","cod","clash-of-clans","clash-royale","mobile-legends",
  "genshin-impact","fc-mobile","roblox","fortnite","valorant","brawl-stars",
  "honor-of-kings","stumble-guys",
  "facebook","instagram","snapchat","twitter","tiktok",
  "netflix","shahid-vip","spotify","youtube-premium","chatgpt-plus","disney-plus",
  "apple-music","telegram-premium","canva-pro","amazon-prime","microsoft-365",
  "anghami","osn-plus",
];

async function loadMaintenance(): Promise<Record<string, boolean>> {
  const rows = await db.select().from(settingsTable).where(like(settingsTable.key, `${PREFIX}%`));
  const result: Record<string, boolean> = {};
  for (const s of ALL_SLUGS) result[s] = false;
  for (const row of rows) {
    const slug = row.key.slice(PREFIX.length);
    if (slug) result[slug] = row.value === "true";
  }
  return result;
}

router.get("/settings/service-maintenance", async (_req, res) => {
  try {
    res.json(await loadMaintenance());
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.get("/admin/service-maintenance", requireAdmin, async (_req, res) => {
  try {
    res.json(await loadMaintenance());
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

router.post("/admin/service-maintenance/:slug", requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const { maintenance } = req.body as { maintenance: boolean };
    const key = `${PREFIX}${slug}`;
    const value = maintenance ? "true" : "false";
    const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
    if (existing[0]) {
      await db.update(settingsTable).set({ value, updatedAt: new Date() }).where(eq(settingsTable.key, key));
    } else {
      await db.insert(settingsTable).values({ key, value });
    }
    res.json({ slug, maintenance });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

export default router;
