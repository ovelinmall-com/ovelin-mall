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

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── فحص مبكر قبل React ──────────────────────────────────────────
// لو التطبيق أُعيد تشغيله بعد غياب ≥5 دقايق (Android قتل الـ process)
// نوجّه فوراً للرئيسية قبل ما يبدأ React حتى نتفادى الشاشة البيضاء.
(function earlyResumeCheck() {
  try {
    const IDLE_MS = 5 * 60 * 1000;
    const KEY = "ovelin_last_active";
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const elapsed = Date.now() - Number(raw);
      if (elapsed >= IDLE_MS && window.location.pathname !== "/") {
        localStorage.removeItem(KEY);
        window.location.replace("/");
        return; // لا تكمل تحميل React
      }
      // سواء استغرق وقتاً أو لا — امسح المفتاح، الـ SessionTimeoutGuard سيعيد تسجيله
      localStorage.removeItem(KEY);
    }
  } catch { /* localStorage غير متاح */ }
})();

createRoot(document.getElementById("root")!).render(<App />);
