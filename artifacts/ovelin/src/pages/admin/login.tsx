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

import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, AlertCircle, Lock } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const base = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/$/, "");
      const res = await fetch(`${base}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "كلمة المرور غير صحيحة");
      }
      setLocation("/admin");
    } catch (err: any) {
      setError(err?.message ?? "كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 text-white"
        >
          <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-[0_15px_50px_-10px_rgba(255,61,138,0.7)]">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="mt-4 text-3xl font-black">لوحة الإدارة</h1>
          <p className="text-pink-200 text-sm mt-1">للمسؤولين فقط</p>
        </motion.div>

        <form
          onSubmit={submit}
          className="rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-6 shadow-2xl space-y-4"
        >
          <div>
            <label className="text-xs text-pink-100 font-semibold flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3.5 h-3.5" /> كلمة المرور
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-pink-200/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-300 bg-red-500/15 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl py-3.5 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60"
          >
            {loading ? "جارٍ التحقق..." : "دخول لوحة الإدارة"}
          </button>
        </form>
      </div>
    </div>
  );
}
