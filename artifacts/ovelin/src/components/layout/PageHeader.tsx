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

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  back: _back = "/",
  right,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  right?: ReactNode;
}) {
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-pink-100/60">
      <div className="relative px-5 pt-4 pb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={handleBack}
            className="relative active:scale-90 transition"
          >
            <div className="p-[2px] rounded-2xl bg-gradient-to-tr from-pink-400 via-pink-500 to-pink-500">
              <div className="rounded-[14px] bg-white p-2 text-pink-700 shadow-md">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </button>
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
