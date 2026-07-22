// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:***@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:***@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Digital Asset Links — يُخدَم قبل /api عشان يتجاوز SPA rewrite ويثبت ملكية التطبيق لـ TWA
app.get("/.well-known/assetlinks.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json([{
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "app.replit.hear_me__hduebdudjb7.twa",
      sha256_cert_fingerprints: [
        "C3:88:62:C7:5B:2C:D7:67:B0:67:68:3B:9C:05:79:D0:94:67:00:77:98:F7:29:6C:74:7B:3C:A5:66:71:1B:55"
      ]
    }
  }]);
});

// صور حسابات Free Fire — يجب أن يكون قبل router حتى لا يُبتلع
const uploadsDir = path.join(process.cwd(), "../../uploads/ff-accounts");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/api/uploads/ff-accounts", express.static(uploadsDir, {
  maxAge: "30d",
  setHeaders(res) { res.setHeader("Cache-Control", "public, max-age=2592000"); },
}));

// صور الإيصالات — تُخزَّن على القرص، DB يحتفظ بـ URL فقط
const receiptsUploadDir = path.join(process.cwd(), "../../uploads/receipts");
if (!fs.existsSync(receiptsUploadDir)) fs.mkdirSync(receiptsUploadDir, { recursive: true });
app.use("/api/uploads/receipts", express.static(receiptsUploadDir, {
  maxAge: "90d",
  setHeaders(res) { res.setHeader("Cache-Control", "private, max-age=7776000"); },
}));

app.use("/api", router);

// In production, serve the React frontend static files
if (process.env.NODE_ENV === "production") {
  const { default: path } = await import("path");
  const { default: fs } = await import("fs");
  const frontendDist = path.resolve(process.cwd(), "artifacts/ovelin/dist/public");
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }
}

export default app;
