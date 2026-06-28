import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import {
  AlertCircle,
  User,
  Lock,
  Mail,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
} from "lucide-react";
import {
  useRegister,
  getGetMeQueryKey,
} from "@workspace/api-client-react";

const api = (path: string) =>
  fetch(`${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`).then((r) => r.json());

export default function Register() {
  const qc = useQueryClient();
  const register = useRegister();

  const { data: pubSettings } = useQuery<{ googleLoginEnabled?: boolean }>({
    queryKey: ["settings-public-rich"],
    queryFn: () => api("api/settings/public-rich"),
    staleTime: 60_000,
  });
  const googleEnabled = pubSettings?.googleLoginEnabled !== false;

  const [done, setDone] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

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

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const emailVal = email.trim();
    if (!/^[^\s@]+@gmail\.com$/i.test(emailVal)) {
      setFormError("يُقبَل البريد الإلكتروني من Gmail فقط (@gmail.com)");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("كلمتا المرور غير متطابقتين");
      return;
    }

    setFormLoading(true);
    try {
      const usernameCheckRes = await fetch(
        `/api/auth/check-username?username=${encodeURIComponent(username.trim())}`,
      );
      if (usernameCheckRes.ok) {
        const data = (await usernameCheckRes.json()) as { available?: boolean };
        if (data.available === false) {
          setFormError("اسم المستخدم محجوز، يرجى اختيار اسم آخر");
          setFormLoading(false);
          return;
        }
      }

      register.mutate(
        {
          data: {
            username: username.trim(),
            email: emailVal,
            password,
          } as Parameters<typeof register.mutate>[0]["data"],
        },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
            setDone(true);
          },
          onError: (err: unknown) => {
            const e = err as {
              data?: { error?: string };
              response?: { data?: { error?: string } };
              message?: string;
            };
            setFormError(
              e?.data?.error ??
              e?.response?.data?.error ??
              e?.message ??
              "تعذر إنشاء الحساب",
            );
            setFormLoading(false);
          },
        },
      );
    } catch {
      setFormError("تعذر الاتصال بالخادم");
      setFormLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-center items-center px-6 py-10">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="fancy-card rounded-3xl p-8 shadow-xl text-center space-y-5 w-full max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-9 h-9 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-pink-900">مرحباً بك!</h2>
            <p className="text-sm text-pink-700/80 mt-1">تم إنشاء حسابك بنجاح</p>
          </div>
          <Link
            href="/account"
            className="block w-full rounded-2xl py-3.5 font-extrabold bg-gradient-to-r from-pink-500 to-rose-600 text-white text-center shadow-lg active:scale-95 transition"
          >
            متابعة إلى حسابي
          </Link>
        </motion.div>
      </div>
    );
  }

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10">

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <img
            src={`${import.meta.env.BASE_URL}icon-192.png`}
            alt="Ovelin"
            className="w-20 h-20 rounded-3xl object-cover shadow-[0_15px_40px_-10px_rgba(190,24,93,0.5)] mx-auto"
          />
          <h1 className="mt-4 text-3xl font-black text-pink-900">أنشئ حسابك</h1>
          <p className="text-pink-700/80 text-sm mt-1">أدخل بياناتك لإنشاء حساب جديد</p>
        </motion.div>

        <div className="relative p-[2px] rounded-3xl">
          <motion.div
            className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            style={{ background: "conic-gradient(from 0deg, transparent 55%, #ec4899 75%, #fda4af 87%, transparent 100%)" }}
          />
          <form
            onSubmit={handleFormSubmit}
            className="relative z-10 fancy-card rounded-3xl p-6 shadow-xl space-y-4"
          >
            {/* اسم المستخدم */}
            <div>
              <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                <User className="w-3.5 h-3.5" />
                اسم المستخدم
                <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={50}
                className="w-full rounded-2xl border border-pink-200 bg-white/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="ovelin_user"
              />
            </div>

            {/* البريد الإلكتروني */}
            <div>
              <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5" />
                البريد الإلكتروني
                <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                dir="ltr"
                className="w-full rounded-2xl border border-pink-200 bg-white/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 text-left"
                placeholder="you@gmail.com"
              />
              <p className="text-[11px] text-pink-500 mt-1 text-right">
                يُقبَل Gmail فقط (<span className="font-mono">@gmail.com</span>)
              </p>
            </div>

            {/* تحذير البريد الإلكتروني — يظهر من أول حرف */}
            <AnimatePresence>
              {email.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className="relative overflow-hidden rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,237,237,0.97) 0%, rgba(254,202,202,0.7) 50%, rgba(255,237,237,0.97) 100%)",
                    boxShadow: "0 4px 28px -6px rgba(225,29,72,0.22), inset 0 1px 0 rgba(255,255,255,0.7)",
                    border: "1px solid rgba(252,165,165,0.6)",
                  }}
                >
                  {/* خط زخرفي علوي */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ background: "linear-gradient(90deg, transparent, #f43f5e 40%, #ec4899 60%, transparent)" }}
                  />

                  {/* وميض خلفي */}
                  <div
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse at 80% 20%, rgba(251,113,133,0.35) 0%, transparent 60%)",
                    }}
                  />

                  <div className="relative p-4 flex items-start gap-3">
                    {/* أيقونة */}
                    <div
                      className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg mt-0.5"
                      style={{
                        background: "linear-gradient(135deg, #f43f5e, #e11d48)",
                        boxShadow: "0 4px 14px -3px rgba(244,63,94,0.55)",
                      }}
                    >
                      <ShieldAlert className="w-4.5 h-4.5 text-white" strokeWidth={2.2} />
                    </div>

                    <div className="flex-1">
                      <p
                        className="text-xs font-black mb-1.5 tracking-wide"
                        style={{ color: "#9f1239" }}
                      >
                        ⚠ تنبيه مهم
                      </p>
                      <p
                        className="text-[12.5px] leading-relaxed"
                        style={{ color: "#be123c" }}
                      >
                        نحرص على أن يكون التسجيل عندنا سريعاً وسهلاً — لهذا لا نُرسِل رسائل تأكيد. غير أن البريد الإلكتروني هو{" "}
                        <strong style={{ color: "#9f1239" }}>مفتاحك الوحيد</strong>{" "}
                        لاسترجاع كلمة المرور في حال نسيانها، فتحقق الآن من أنك تستطيع الوصول إليه.
                      </p>
                    </div>
                  </div>

                  {/* خط زخرفي سفلي */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(244,63,94,0.4) 40%, rgba(236,72,153,0.4) 60%, transparent)" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* كلمة المرور */}
            <div>
              <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5" />
                كلمة المرور
                <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={4}
                  className="w-full rounded-2xl border border-pink-200 bg-white/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 pr-11"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* تأكيد كلمة المرور */}
            <div>
              <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5" />
                تأكيد كلمة المرور
                <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  minLength={4}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 pr-11 transition-all ${
                    passwordsMismatch
                      ? "border-red-300 bg-red-50/40 focus:ring-red-300"
                      : passwordsMatch
                      ? "border-emerald-300 bg-emerald-50/40 focus:ring-emerald-300"
                      : "border-pink-200 bg-white/40 focus:ring-pink-400"
                  }`}
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600 transition"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <AnimatePresence>
                  {confirmPassword.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {passwordsMatch ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence>
                {passwordsMismatch && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-[11px] text-red-500 mt-1 font-medium"
                  >
                    كلمتا المرور غير متطابقتين
                  </motion.p>
                )}
                {passwordsMatch && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-[11px] text-emerald-600 mt-1 font-medium"
                  >
                    ✓ كلمتا المرور متطابقتان
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {formError && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{formError}</div>
              </div>
            )}

            <button
              type="submit"
              disabled={formLoading || register.isPending || passwordsMismatch}
              className="w-full rounded-2xl py-3.5 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(formLoading || register.isPending) ? "جارٍ الإنشاء..." : "إنشاء حساب"}
            </button>

            {googleEnabled && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
                  <span className="text-xs text-pink-400 font-bold px-1">أو</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
                </div>

                <motion.button
                  type="button"
                  onClick={handleGoogleRedirect}
                  disabled={googleLoading}
                  whileTap={{ scale: 0.97 }}
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
                </motion.button>

                {googleError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-3"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>{googleError}</div>
                  </motion.div>
                )}
              </>
            )}

            <div className="text-center text-xs text-muted-foreground pt-1">
              لديك حساب بالفعل؟{" "}
              <Link href="/login" className="text-pink-600 font-bold hover:underline">
                تسجيل الدخول
              </Link>
            </div>
            <div className="text-center text-[11px] text-pink-700/80">
              <Link href="/" className="hover:underline">العودة للرئيسية</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
