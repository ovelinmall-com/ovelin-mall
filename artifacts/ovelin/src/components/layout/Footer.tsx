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

import { Sparkles, ShieldCheck, Headphones } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-12 px-5 pb-24 pt-10">
      <div className="rounded-3xl bg-gradient-to-br from-pink-600 via-rose-600 to-pink-700 p-6 text-white shadow-[0_20px_60px_-20px_rgba(190,24,93,0.6)]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold opacity-90">
            متجرك الموثوق رقم 1
          </span>
        </div>
        <h4 className="text-2xl font-extrabold tracking-tight">
          OVELIN STORE
        </h4>
        <p className="text-sm opacity-90 mt-1 leading-relaxed">
          خدمات سوشيال ميديا، تبادل عملات، بطاقات ألعاب واشتراكات، وتصميم مواقع
          وبوتات احترافية.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-2xl bg-white/15 backdrop-blur p-3">
            <ShieldCheck className="w-5 h-5 mb-1" />
            <div className="text-xs font-bold">دفع آمن</div>
            <div className="text-[11px] opacity-80">رصيد محفوظ بالكامل</div>
          </div>
          <div className="rounded-2xl bg-white/15 backdrop-blur p-3">
            <Headphones className="w-5 h-5 mb-1" />
            <div className="text-xs font-bold">دعم 24/7</div>
            <div className="text-[11px] opacity-80">رد خلال دقائق</div>
          </div>
        </div>
      </div>
      <p className="text-center mt-6 text-[11px] text-pink-400/60 select-none tracking-wide">
        OVELIN © 2026
      </p>
    </footer>
  );
}
