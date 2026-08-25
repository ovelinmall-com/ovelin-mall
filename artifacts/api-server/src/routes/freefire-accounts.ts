import { Router, type IRouter, type Request, type Response } from "express";
import { db, freefireAccountsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { logger } from "../lib/logger";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "../../uploads/ff-accounts");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("ملفات الصور فقط مسموحة"));
  },
});

const router: IRouter = Router();

/** POST /api/admin/freefire-accounts/upload-image — رفع صورة واحدة */
router.post(
  "/admin/freefire-accounts/upload-image",
  upload.single("image"),
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "لم يتم إرسال صورة" });
      return;
    }
    const url = `/api/uploads/ff-accounts/${req.file.filename}`;
    res.json({ url });
  },
);

/** GET /api/freefire-accounts — قائمة الحسابات المتاحة */
router.get("/freefire-accounts", async (_req: Request, res: Response) => {
  try {
    const accounts = await db
      .select()
      .from(freefireAccountsTable)
      .orderBy(asc(freefireAccountsTable.displayOrder), asc(freefireAccountsTable.id));

    const mapped = accounts.map((a) => ({
      id: String(a.id),
      account_name: a.accountName,
      price: a.price,
      status: a.status,
      cover_image: a.coverImage,
      images: a.images ?? [],
      level: a.level ?? undefined,
      evo_weapons_count: a.evoWeaponsCount ?? undefined,
      skins_count: a.skinsCount ?? undefined,
      characters_count: a.charactersCount ?? undefined,
      rank: a.rank ?? undefined,
      server: a.server ?? undefined,
      description: a.description ?? undefined,
      features: a.features ?? [],
    }));

    res.json(mapped);
  } catch (err) {
    logger.error({ err }, "فشل جلب حسابات Free Fire");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

/** POST /api/admin/freefire-accounts — إضافة حساب جديد */
router.post("/admin/freefire-accounts", async (req: Request, res: Response) => {
  try {
    const b = req.body as {
      account_name?: string; price?: number; status?: string;
      cover_image?: string; images?: string[]; level?: number;
      evo_weapons_count?: number; skins_count?: number; characters_count?: number;
      rank?: string; server?: string; description?: string; features?: string[];
      display_order?: number;
    };
    if (!b.account_name || b.price == null) {
      res.status(400).json({ error: "account_name و price مطلوبان" });
      return;
    }
    const [created] = await db.insert(freefireAccountsTable).values({
      accountName: b.account_name,
      price: b.price,
      status: (b.status as "available" | "reserved" | "sold") ?? "available",
      coverImage: b.cover_image ?? "",
      images: b.images ?? [],
      level: b.level ?? null,
      evoWeaponsCount: b.evo_weapons_count ?? null,
      skinsCount: b.skins_count ?? null,
      charactersCount: b.characters_count ?? null,
      rank: b.rank ?? null,
      server: b.server ?? null,
      description: b.description ?? null,
      features: b.features ?? [],
      displayOrder: b.display_order ?? 0,
    }).returning();
    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "فشل إضافة حساب Free Fire");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

/** PATCH /api/admin/freefire-accounts/:id — تعديل حساب */
router.patch("/admin/freefire-accounts/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const b = req.body as Partial<{
      account_name: string; price: number; status: string;
      cover_image: string; images: string[]; level: number;
      evo_weapons_count: number; skins_count: number; characters_count: number;
      rank: string; server: string; description: string; features: string[];
      display_order: number;
    }>;
    const updates: Record<string, unknown> = {};
    if (b.account_name != null) updates.accountName = b.account_name;
    if (b.price != null)        updates.price = b.price;
    if (b.status != null)       updates.status = b.status;
    if (b.cover_image != null)  updates.coverImage = b.cover_image;
    if (b.images != null)       updates.images = b.images;
    if (b.level !== undefined)  updates.level = b.level;
    if (b.evo_weapons_count !== undefined) updates.evoWeaponsCount = b.evo_weapons_count;
    if (b.skins_count !== undefined)       updates.skinsCount = b.skins_count;
    if (b.characters_count !== undefined)  updates.charactersCount = b.characters_count;
    if (b.rank !== undefined)    updates.rank = b.rank;
    if (b.server !== undefined)  updates.server = b.server;
    if (b.description !== undefined) updates.description = b.description;
    if (b.features != null)     updates.features = b.features;
    if (b.display_order != null) updates.displayOrder = b.display_order;

    await db.update(freefireAccountsTable).set(updates).where(eq(freefireAccountsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "فشل تعديل حساب Free Fire");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

/** DELETE /api/admin/freefire-accounts/:id — حذف حساب */
router.delete("/admin/freefire-accounts/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await db.delete(freefireAccountsTable).where(eq(freefireAccountsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "فشل حذف حساب Free Fire");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
