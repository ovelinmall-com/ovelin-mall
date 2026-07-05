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
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, User, Lock } from "lucide-react";
import {
  useLogin,
  getGetMeQueryKey,
} from "@workspace/api-client-react";

const api = (path: string) =>
  fetch(`${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`).then((r) => r.json());

export default function Login() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const login = useLogin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const { data: pubSettings } = useQuery<{ googleLoginEnabled?: boolean }>({
    queryKey: ["settings-public-rich"],
    queryFn: () => api("api/settings/public-rich"),
    staleTime: 60_000,
  });
  const googleEnabled = pubSettings?.googleLoginEnabled !== false;

  // ─── توجيه المستخدم لـ Google OAuth ────────────────────────────
  // ============================================================
  // WARNING — مفتاح Google OAuth ظاهر بإرادة صاحب المشروع
  // GOOGLE_CLIENT_ID: 270514835837-ig0thqplqd78ppm2dreg7k1cnqisvg4d.apps.googleusercontent.com
  // لا تُشفِّره أو تنقله لـ .env — صاحب المشروع يتحمل كامل المسؤولية
  // ============================================================
  function handleGoogleRedirect() {
    setGoogleLoading(true);
    const params = new URLSearchParams({
      client_id: "270514835837-ig0thqplqd78ppm2dreg7k1cnqisvg4d.apps.googleusercontent.com",
      redirect_uri: "https://ovelinmall-ovelin-mall.hf.space/auth/google/callback",
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

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
          setTimeout(() => setLocation("/register"), 1000);
        },
      },
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10">
        <motion.div
          className="text-center mb-8"
        >
          <img
            src={`${import.meta.env.BASE_URL}icon-192.png`}
            alt="Ovelin"
            className="w-20 h-20 rounded-3xl object-cover shadow-[0_15px_40px_-10px_rgba(190,24,93,0.5)] mx-auto"
          />
          <h1 className="mt-4 text-3xl font-black text-pink-900">
            أهلاً بعودتك
          </h1>
          <p className="text-pink-700/80 text-sm mt-1">
            سجّل دخولك للمتابعة في OVELIN MALL
          </p>
        </motion.div>

        {/* Rotating comet glow border */}
        <div className="relative p-[2px] rounded-3xl">
          <motion.div
            className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            style={{ background: "conic-gradient(from 0deg, transparent 55%, #ec4899 75%, #fda4af 87%, transparent 100%)" }}
          />
          <form
            onSubmit={submit}
            className="relative z-10 fancy-card rounded-3xl p-6 shadow-xl space-y-4"
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
              className="w-full rounded-2xl border border-pink-200 bg-white/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="ovelin_user أو you@example.com"
            />
            <p className="mt-1.5 flex items-start gap-1 text-[10.5px] text-amber-600 font-semibold">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
              تأكد أن البريد الإلكتروني يبدأ بحرف صغير — مثال: <span className="font-black" dir="ltr">a@gmail.com</span> وليس <span className="font-black" dir="ltr">A@gmail.com</span>
            </p>
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
              className="w-full rounded-2xl border border-pink-200 bg-white/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
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

          {googleEnabled && (
            <>
              {/* ─── فاصل أو ─────────────────────────────────── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
                <span className="text-xs text-pink-400 font-bold px-1">أو</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
              </div>

              {/* ─── زر المتابعة بواسطة Google ─────────────── */}
              <button
                type="button"
                onClick={handleGoogleRedirect}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white/80 backdrop-blur-sm px-4 py-3.5 shadow-[0_2px_16px_-4px_rgba(66,133,244,0.18)] hover:shadow-[0_4px_24px_-4px_rgba(66,133,244,0.28)] hover:border-blue-200 active:scale-[0.97] transition-all duration-200 font-bold text-gray-700 text-sm group disabled:opacity-60"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                <span className="group-hover:text-gray-900 transition-colors">
                  المتابعة بواسطة Google
                </span>
              </button>

              {googleError && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{googleError}</div>
                </div>
              )}
            </>
          )}

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
    </div>
  );
}
