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

// ── الحل الجذري لمشكلة الشاشة البيضاء في APK (Median.co) ──────────
// السبب الحقيقي: Median يبني الـ APK كـ WebView wrapper، وعند غياب
// طويل يقتل Android الـ process بالكامل. الـ JS العادي (visibilitychange)
// لا يُضمَن أن يشتغل بشكل موثوق عند العودة لأنه يعتمد على استمرارية
// نفس الصفحة. الحل الرسمي من Median: دالة `median_app_resumed()` —
// كودهم الـ native (Kotlin/Java) يستدعيها مباشرة عند استئناف التطبيق،
// حتى لو تم إعادة تحميل الصفحة بالكامل من الصفر (بعد قتل الـ process).
// المرجع: https://docs.median.co/docs/app-resumed-callback

const IDLE_MS = 5 * 60 * 1000;
const LAST_ACTIVE_KEY = "ovelin_last_active";

// الإصلاح الفعلي: window.location.reload() لا window.location.replace("/")
// لأن replace("/") لا تفعل شيئاً لو المستخدم أصلاً على "/" (same-URL no-op).
// reload() هي الوحيدة التي تجبر الـ WebView على إعادة التحميل الكامل.
function recoverFromStaleSession() {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!raw) return;
    const elapsed = Date.now() - Number(raw);
    localStorage.removeItem(LAST_ACTIVE_KEY);
    if (elapsed >= IDLE_MS) {
      window.location.reload(); // إعادة تحميل كاملة — الحل الحقيقي للـ WebView GPU
    }
  } catch { /* localStorage غير متاح */ }
}

// A) Median.co SDK الحديث — native callback مباشر من Kotlin/Java
(window as any).median_app_resumed = recoverFromStaleSession;
// B) Median.co SDK القديم (GoNative) — نفس الآلية باسم مختلف
(window as any).gonative_app_resumed = recoverFromStaleSession;

// C) visibilitychange — يسجّل وقت الخروج، ويصحح عند العودة في المتصفح/PWA
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); } catch { /* ignore */ }
  } else {
    recoverFromStaleSession();
  }
});

// D) فحص عند اكتمال تحميل الصفحة — يغطي إعادة تشغيل كاملة للـ process
//    (بعد "load" يكون الـ WebView جاهزاً فعلاً لاستقبال reload)
window.addEventListener("load", recoverFromStaleSession, { once: true });

createRoot(document.getElementById("root")!).render(<App />);
