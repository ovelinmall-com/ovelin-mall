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
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
      <div className="p-6 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-2xl">
        <SearchX className="w-12 h-12" />
      </div>
      <h1 className="mt-6 text-3xl font-black text-pink-900">404</h1>
      <p className="text-pink-700/80 text-sm mt-2">الصفحة غير موجودة</p>
      <Link href="/">
        <button className="mt-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold px-6 py-3 shadow-lg active:scale-95">
          العودة للرئيسية
        </button>
      </Link>
    </div>
  );
}
