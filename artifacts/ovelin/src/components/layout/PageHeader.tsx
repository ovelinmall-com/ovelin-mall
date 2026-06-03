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

import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  back = "/",
  right,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  right?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-30 backdrop-blur-2xl">
      <div className="absolute inset-0 bg-gradient-to-b from-white/95 via-pink-50/85 to-white/40" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-pink-300/60 to-transparent" />
      <div className="relative px-5 pt-4 pb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href={back}
            className="relative active:scale-90 transition"
          >
            <div className="absolute inset-0 rounded-2xl bg-pink-400/30 blur-md" />
            <div className="relative p-[2px] rounded-2xl bg-gradient-to-tr from-pink-400 via-rose-500 to-pink-500">
              <div className="rounded-[14px] bg-white p-2 text-pink-700 shadow-md">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-black bg-gradient-to-l from-pink-900 via-rose-700 to-pink-900 bg-clip-text text-transparent leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11.5px] text-pink-700/80 font-semibold truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {right}
      </div>
    </div>
  );
}
