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

import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
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

app.use("/api", router);

// Serve React SPA in production (HuggingFace / standalone deployment)
if (process.env.NODE_ENV === "production") {
  const publicDir = path.join(globalThis.__dirname ?? import.meta.dirname, "..", "public");
  if (existsSync(publicDir)) {
    // index.html و service worker يُخدَمان بدون كاش حتى يشحن التطبيق آخر تحديث دائماً
    const noCacheFiles = ["/index.html", "/sw.js", "/manifest.json"];
    app.use((req, res, next) => {
      if (noCacheFiles.includes(req.path)) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
      next();
    });
    // الملفات الثابتة (JS/CSS مع hash) تُكاش لمدة سنة
    app.use(express.static(publicDir, {
      maxAge: "1y",
      setHeaders(res, filePath) {
        if (filePath.endsWith("index.html") || filePath.endsWith("sw.js") || filePath.endsWith("manifest.json")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      }
    }));
    app.get("*path", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(publicDir, "index.html"));
    });
  }
}

export default app;
