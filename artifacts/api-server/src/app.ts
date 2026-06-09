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

// ── تخديم الـ Frontend (SPA) عند التشغيل المدمج (HuggingFace / إنتاج) ──
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const possibleFrontendDirs = [
  path.resolve(process.cwd(), "artifacts/ovelin/dist/public"),
  path.resolve(__dirname, "../../ovelin/dist/public"),
];
const frontendDir = possibleFrontendDirs.find(p => existsSync(p));

if (frontendDir) {
  app.use(express.static(frontendDir, { maxAge: "7d" }));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });
}

export default app;
