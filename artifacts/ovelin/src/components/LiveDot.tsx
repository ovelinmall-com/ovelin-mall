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

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <motion.span
        animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full bg-pink-500"
      />
      <span className="relative w-2 h-2 rounded-full bg-pink-500" />
    </span>
  );
}

export function LivePill({ label = "مباشر" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-pink-50 border border-pink-200 px-2 py-0.5 text-[10px] font-bold text-pink-700">
      <LiveDot />
      {label}
    </div>
  );
}
