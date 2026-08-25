import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

// حفظ الإيصالات على القرص — DB يخزّن URL فقط
const RECEIPTS_DIR = path.join(process.cwd(), "../../uploads/receipts");
if (!fs.existsSync(RECEIPTS_DIR)) fs.mkdirSync(RECEIPTS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, RECEIPTS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
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

/**
 * POST /receipts/upload
 * يحفظ الصورة على القرص ويُعيد URL قصيراً — لا base64 في DB أبداً
 */
router.post(
  "/receipts/upload",
  requireUser,
  upload.single("file"),
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "لم يتم اختيار صورة" });
      return;
    }
    const receiptPath = `/api/uploads/receipts/${req.file.filename}`;
    res.json({ receiptPath });
  },
);

router.post("/receipts/upload-url", requireUser, (_req: Request, res: Response) => {
  res.status(410).json({ error: "هذه الطريقة لم تعد مدعومة، يرجى استخدام /api/receipts/upload" });
});

export default router;
