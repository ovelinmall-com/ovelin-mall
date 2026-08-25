import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Gift,
  Info,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { getGetMeQueryKey, useRegister } from "@workspace/api-client-react";

export default function Register() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const register = useRegister();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
  }, []);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (password !== confirmPassword) {
      setFormError("كلمتا المرور غير متطابقتين");
      return;
    }

    const emailVal = email.trim();
    if (!/^[^\s@]+@gmail\.com$/i.test(emailVal)) {
      setFormError("يُقبَل البريد الإلكتروني من Gmail فقط (@gmail.com)");
      return;
    }

    setFormLoading(true);
    register.mutate(
      {
        data: {
          username: username.trim(),
          email: emailVal,
          password,
          referralCode: referralCode.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/account");
        },
        onError: (err: unknown) => {
          const error = err as {
            data?: { error?: string };
            response?: { data?: { error?: string } };
            message?: string;
          };
          setFormError(
            error?.data?.error ??
              error?.response?.data?.error ??
              error?.message ??
              "تعذر إنشاء الحساب",
          );
          setFormLoading(false);
        },
      },
    );
  }

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
          <p className="text-pink-700/80 text-sm mt-1">
            أدخل بياناتك لإنشاء حساب جديد
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleFormSubmit}
          className="fancy-card rounded-3xl p-6 shadow-xl space-y-4"
        >
          {/* اسم المستخدم */}
          <div>
            <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
              <User className="w-3.5 h-3.5" />
              اسم المستخدم <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              placeholder="ovelin_user"
            />
          </div>

          {/* كلمة المرور */}
          <div>
            <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3.5 h-3.5" />
              كلمة المرور <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                type={showPassword ? "text" : "password"}
                minLength={4}
                className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 pr-11"
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600 transition"
                tabIndex={-1}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* تأكيد كلمة المرور */}
          <div>
            <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3.5 h-3.5" />
              تأكيد كلمة المرور <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                type={showConfirmPassword ? "text" : "password"}
                minLength={4}
                className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 pr-11 ${
                  confirmPassword && confirmPassword !== password
                    ? "border-red-400 bg-red-50"
                    : confirmPassword && confirmPassword === password
                      ? "border-green-400 bg-green-50"
                      : "border-pink-200 bg-pink-50/40"
                }`}
                placeholder="••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600 transition"
                tabIndex={-1}
                aria-label={
                  showConfirmPassword
                    ? "إخفاء تأكيد كلمة المرور"
                    : "إظهار تأكيد كلمة المرور"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-[11px] text-red-500 mt-1">
                كلمتا المرور غير متطابقتين
              </p>
            )}
          </div>

          {/* البريد الإلكتروني */}
          <div>
            <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
              <Mail className="w-3.5 h-3.5" />
              البريد الإلكتروني <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              dir="ltr"
              className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 text-left"
              placeholder="you@gmail.com"
            />
            {email.length > 0 ? (
              <div
                role="status"
                className="mt-2 flex items-start gap-1.5 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-[11px] leading-relaxed text-pink-800"
              >
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-pink-500" />
                <span>
                  نحن نحاول جعل التسجيل سريعًا وسهلًا؛ لذا نرجو التأكد من أن هذا
                  البريد الإلكتروني ملكك، فهو الوسيلة الوحيدة لاستعادة كلمة
                  المرور عند نسيانها.
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-pink-500 mt-1 text-right">
                يُقبَل Gmail فقط (<span className="font-mono">@gmail.com</span>)
              </p>
            )}
          </div>

          {/* كود الإحالة */}
          <div>
            <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
              <Gift className="w-3.5 h-3.5" />
              كود الإحالة{" "}
              <span className="text-pink-400 font-normal">(اختياري)</span>
            </label>
            <input
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 tracking-widest"
              placeholder="ABCD1234"
            />
          </div>

          {formError && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{formError}</div>
            </div>
          )}

          <button
            type="submit"
            disabled={formLoading}
            className="w-full rounded-2xl py-3.5 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60"
          >
            {formLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> جارٍ إنشاء الحساب...
              </span>
            ) : (
              "إنشاء حساب"
            )}
          </button>

          <div className="text-center text-xs text-muted-foreground pt-1">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-pink-600 font-bold hover:underline">
              تسجيل الدخول
            </Link>
          </div>
          <div className="text-center text-[11px] text-pink-700/80">
            <Link href="/" className="hover:underline">
              العودة للرئيسية
            </Link>
          </div>
        </motion.form>
      </div>
    </div>
  );
}