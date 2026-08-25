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

import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

const BASE = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/$/, "");

export default function AdminLogin() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch(`${BASE}/admin/open`, { credentials: "include" })
      .then(() => setLocation("/admin"))
      .catch(() => setLocation("/admin"));
  }, []);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        className="w-10 h-10 rounded-full border-4 border-pink-400 border-t-transparent"
      />
    </div>
  );
}
