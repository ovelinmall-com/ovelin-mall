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

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  const s = Math.floor(ms / 1000);
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60, done: ms === 0 };
}

export function CountdownTimer({ endsAt, onEnd }: { endsAt: string | Date; onEnd?: () => void }) {
  const target = new Date(endsAt).getTime();
  const [t, setT] = useState(diff(target));
  useEffect(() => {
    const id = setInterval(() => {
      const d = diff(target);
      setT(d);
      if (d.done) { onEnd?.(); clearInterval(id); }
    }, 1000);
    return () => clearInterval(id);
  }, [target]);
  const fmt = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="inline-flex items-center gap-1 font-mono font-bold text-pink-600 bg-white/80 dark:bg-zinc-900/80 px-2 py-1 rounded">
      <span>{fmt(t.h)}</span>:<span>{fmt(t.m)}</span>:<span>{fmt(t.s)}</span>
    </div>
  );
}
