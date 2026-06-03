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
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, User, Lock } from "lucide-react";
import {
  useLogin,
  getGetMeQueryKey,
} from "@workspace/api-client-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const login = useLogin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    login.mutate(
      { data: { identifier: identifier.trim(), password } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/account");
        },
        onError: (err: unknown) => {
          const e = err as {
            data?: { error?: string };
            response?: { data?: { error?: string } };
            message?: string;
          };
          const msg =
            e?.data?.error ??
            e?.response?.data?.error ??
            e?.message ??
            "بيانات الدخول غير صحيحة";
          setError(msg);
        },
      },
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-[0_15px_40px_-10px_rgba(190,24,93,0.5)]">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="mt-4 text-3xl font-black text-pink-900">
            أهلاً بعودتك
          </h1>
          <p className="text-pink-700/80 text-sm mt-1">
            سجّل دخولك للمتابعة في OVELIN
          </p>
        </motion.div>

        <form
          onSubmit={submit}
          className="fancy-card rounded-3xl p-6 shadow-xl space-y-4"
        >
          <div>
            <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
              <User className="w-3.5 h-3.5" /> اسم المستخدم أو البريد الإلكتروني
            </label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              minLength={3}
              className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="ovelin_user أو you@example.com"
            />
          </div>
          <div>
            <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3.5 h-3.5" /> كلمة المرور
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="••••••"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full rounded-2xl py-3.5 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60"
          >
            {login.isPending ? "جارٍ الدخول..." : "تسجيل الدخول"}
          </button>

          <div className="text-center text-xs text-pink-600 pt-1">
            <Link href="/forgot-password" className="hover:underline font-semibold">
              نسيت كلمة المرور؟
            </Link>
          </div>
          <div className="text-center text-xs text-muted-foreground pt-1">
            ليس لديك حساب؟{" "}
            <Link
              href="/register"
              className="text-pink-600 font-bold hover:underline"
            >
              أنشئ حساب جديد
            </Link>
          </div>
          <div className="text-center text-[11px] text-pink-700/80">
            <Link href="/" className="hover:underline">
              العودة للرئيسية
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
