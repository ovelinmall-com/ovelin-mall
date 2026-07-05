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

import { api } from "./api";
import { getSessionKey } from "./realtime";

let queue: any[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

// ✅ FIX: إرسال دفعة واحدة بدلاً من طلب HTTP منفصل لكل حدث
// كان flush() يُطلق N طلب شبكة بدلاً من طلب واحد للدفعة كلها
function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  api("/api/analytics/track-batch", {
    method: "POST",
    headers: { "x-session-key": getSessionKey() },
    body: JSON.stringify({ events: batch }),
  }).catch(() => {
    // fallback: أرسل الحوادث بشكل فردي عبر الـ endpoint الأصلي
    for (const ev of batch) {
      api("/api/analytics/track", {
        method: "POST",
        headers: { "x-session-key": getSessionKey() },
        body: JSON.stringify(ev),
      }).catch(() => { /* ignore */ });
    }
  });
}

export function track(type: string, extra: Record<string, any> = {}): void {
  try {
    queue.push({
      type,
      path: typeof location !== "undefined" ? location.pathname : null,
      referrer: typeof document !== "undefined" ? document.referrer : null,
      ...extra,
    });
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 1500);
  } catch { /* ignore */ }
}

export function trackProductView(productId: number): void {
  track("product_view", { productId });
}

export function trackPageView(path?: string): void {
  track("page_view", { path: path || (typeof location !== "undefined" ? location.pathname : "") });
}
