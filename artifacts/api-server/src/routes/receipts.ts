import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import multer from "multer";
import { requireUser } from "../lib/auth";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مدعوم، يرجى رفع صورة JPEG أو PNG"));
    }
  },
});

router.post(
  "/receipts/upload",
  requireUser,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "لم يتم اختيار صورة" });
        return;
      }
      const mime = req.file.mimetype || "image/jpeg";
      const b64 = req.file.buffer.toString("base64");
      const receiptPath = `data:${mime};base64,${b64}`;
      res.json({ receiptPath });
    } catch (err: any) {
      req.log.error({ err }, "receipt upload error");
      res.status(500).json({ error: err?.message || "تعذّر رفع الصورة" });
    }
  }
);

router.post("/receipts/upload-url", requireUser, async (req: Request, res: Response) => {
  res.status(410).json({ error: "هذه الطريقة لم تعد مدعومة، يرجى استخدام /api/receipts/upload" });
});

router.get("/receipts/objects/*path", requireUser, async (req: Request, res: Response) => {
  try {
    const storage = new ObjectStorageService();
    const objectPath = "/objects/" + (req.params as any).path;
    const file = await storage.getObjectEntityFile(objectPath);
    const response = await storage.downloadObject(file);
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else {
      res.status(204).end();
    }
  } catch (err: any) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "الملف غير موجود" });
    } else {
      req.log.error({ err }, "receipts serve error");
      res.status(500).json({ error: "تعذّر تحميل الملف" });
    }
  }
});

export default router;
