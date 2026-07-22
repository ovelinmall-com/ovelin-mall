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

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSessionKey } from "@/lib/realtime";

export function LiveViewers({ productId }: { productId: number }) {
  const [count, setCount] = useState(1);
  useEffect(() => {
    let stopped = false;
    const ping = async () => {
      try {
        await api("/api/live/ping", {
          method: "POST",
          headers: { "x-session-key": getSessionKey() },
          body: JSON.stringify({ productId }),
        });
        const r = await api<{ viewers: number }>(`/api/live/viewers/${productId}`);
        if (!stopped) setCount(r.viewers);
      } catch { /* ignore */ }
    };
    ping();
    const t = setInterval(ping, 30000);
    return () => { stopped = true; clearInterval(t); };
  }, [productId]);
  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-pink-600 bg-white dark:bg-pink-900/30 px-2.5 py-1 rounded-full">
      <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
      {count} يشاهد الآن
    </div>
  );
}
