// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// Owner takes full responsibility for keeping it visible.
// ============================================================

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  AlertCircle,
  User,
  Lock,
  Gift,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  useRegister,
  getGetMeQueryKey,
} from "@workspace/api-client-react";

type Step = "form" | "otp" | "done";

function validatePhone(value: string): string | null {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length === 0) return null;
  if (!digits.startsWith("249"))
    return "يجب أن يبدأ الرقم بـ 249  —  مثال: 249912345678";
  if (digits.length > 12)
    return "الرقم لا يجب أن يتجاوز 12 رقماً";
  if (digits.length < 12)
    return `الرقم يجب أن يكون 12 رقماً — أدخلت ${digits.length} حتى الآن`;
  return null;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const register = useRegister();

  const [step, setStep] = useState<Step>("form");

  // بيانات الفورم
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // بيانات OTP
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const ref = sp.get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
  }, []);

  // عداد تنازلي لإعادة الإرسال
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // علامة تحدد إذا جاء الكود تلقائياً من SMS
  const otpAutoFilledRef = useRef(false);
  const autoSubmitRef = useRef(false);

  // إرسال تلقائي — فقط لو الكود جاء تلقائياً من SMS وكمل 6 أرقام
  useEffect(() => {
    if (step !== "otp" || otp.length !== 6) return;
    if (!otpAutoFilledRef.current || autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    const t = setTimeout(() => {
      autoSubmitRef.current = false;
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      void handleOtpSubmit(fakeEvent);
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step]);

  // Web OTP API — قراءة الكود تلقائياً على Android Chrome
  useEffect(() => {
    if (step !== "otp") return;
    if (!("OTPCredential" in window)) return;

    const ac = new AbortController();
    abortRef.current = ac;

    (navigator.credentials as unknown as {
      get(opts: { otp: { transport: string[] }; signal: AbortSignal }): Promise<{ code: string }>;
    })
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((cred) => {
        if (!cred?.code) return;
        // نكتب الأرقام واحد واحد حتى يراها المستخدم بوضوح
        const digits = cred.code;
        otpAutoFilledRef.current = false; // نمنع الإرسال إلى أن يكتمل الكتابة
        digits.split("").forEach((digit, i) => {
          setTimeout(() => {
            setOtp(digits.slice(0, i + 1));
            // بعد آخر رقم نفعّل الإرسال التلقائي
            if (i === digits.length - 1) {
              otpAutoFilledRef.current = true;
            }
          }, i * 120);
        });
      })
      .catch(() => {
        // المستخدم رفض أو الجهاز لا يدعم — نتجاهل الخطأ
      });

    return () => ac.abort();
  }, [step]);

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 12);
    setPhone(raw);
    setPhoneError(validatePhone(raw));
  }

  // الخطوة 1: إرسال OTP بعد التحقق من البيانات
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const phoneErr = validatePhone(phone);
    if (phoneErr) { setPhoneError(phoneErr); return; }

    const emailVal = email.trim();
    if (!/^[^\s@]+@gmail\.com$/i.test(emailVal)) {
      setFormError("يُقبَل البريد الإلكتروني من Gmail فقط (@gmail.com)");
      return;
    }

    setFormLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFormError(data.error ?? "تعذر إرسال الكود");
        return;
      }
      setCountdown(60);
      setStep("otp");
    } catch {
      setFormError("تعذر الاتصال بالخادم");
    } finally {
      setFormLoading(false);
    }
  }

  // الخطوة 2: التحقق من الكود ثم التسجيل
  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null);
    if (otp.length < 6) { setOtpError("أدخل الكود المكوّن من 6 أرقام"); return; }

    setOtpLoading(true);
    try {
      // أولاً: تحقق من الكود
      const verRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp.trim() }),
      });
      const verData = (await verRes.json()) as { error?: string };
      if (!verRes.ok) {
        setOtpError(verData.error ?? "الكود غير صحيح");
        setOtpLoading(false);
        return;
      }

      // ثانياً: إنشاء الحساب
      register.mutate(
        {
          data: {
            username: username.trim(),
            email: email.trim(),
            password,
            referralCode: referralCode.trim() || undefined,
            phone,
          } as Parameters<typeof register.mutate>[0]["data"],
        },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
            abortRef.current?.abort();
            setStep("done");
          },
          onError: (err: unknown) => {
            const e = err as {
              data?: { error?: string };
              response?: { data?: { error?: string } };
              message?: string;
            };
            setOtpError(
              e?.data?.error ??
              e?.response?.data?.error ??
              e?.message ??
              "تعذر إنشاء الحساب",
            );
            setOtpLoading(false);
          },
        },
      );
    } catch {
      setOtpError("تعذر الاتصال بالخادم");
      setOtpLoading(false);
    }
  }

  async function resendOtp() {
    setOtpError(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setOtpError(data.error ?? "تعذر إعادة الإرسال"); return; }
      setCountdown(60);
      setOtp("");
    } catch {
      setOtpError("تعذر الاتصال بالخادم");
    }
  }

  // ─── شاشة النجاح ─────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-10">
        <motion.div
          className="fancy-card rounded-3xl p-8 shadow-xl text-center space-y-4"
        >
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
          <h2 className="text-2xl font-black text-pink-900">أنشئنا حسابك!</h2>
          <p className="text-sm text-pink-700/80">
            أرسلنا رابط تأكيد إلى بريدك الإلكتروني
          </p>
          <div className="bg-pink-50 rounded-2xl px-4 py-3 font-mono text-sm text-pink-700 dir-ltr text-left">
            {email}
          </div>
          <p className="text-xs text-pink-500">
            افتح بريدك الإلكتروني واضغط على زر التأكيد — الرابط صالح 24 ساعة
          </p>
          <Link
            href="/account"
            className="block w-full rounded-2xl py-3.5 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white text-center"
          >
            الذهاب لحسابي الآن
          </Link>
          <p className="text-xs text-pink-400">يمكنك تأكيد بريدك لاحقاً من صفحة الحساب</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10">

        {/* ─── الرأس ─────────────────────────────────────────── */}
        <motion.div
          className="text-center mb-8"
        >
          <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-[0_15px_40px_-10px_rgba(190,24,93,0.5)]">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="mt-4 text-3xl font-black text-pink-900">أنشئ حسابك</h1>
          <p className="text-pink-700/80 text-sm mt-1">
            {step === "form" ? "أدخل بياناتك لإنشاء حساب جديد" : "أدخل كود التحقق المرسل على هاتفك"}
          </p>

          {/* مؤشر الخطوات */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {(["form", "otp"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === s
                    ? "w-8 bg-pink-500"
                    : i < ["form", "otp"].indexOf(step)
                    ? "w-4 bg-pink-400"
                    : "w-4 bg-pink-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-pink-500 mt-1 font-semibold">
            الخطوة {step === "form" ? "1 / 2" : "2 / 2"}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ─── الخطوة 1: الفورم الكامل ─────────────────────── */}
          {step === "form" && (
            <motion.form
              key="form"
              exit={{ opacity: 0, x: -30 }}
              onSubmit={handleFormSubmit}
              className="fancy-card rounded-3xl p-6 shadow-xl space-y-4"
            >
              {/* رقم الهاتف */}
              <div>
                <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  رقم الهاتف
                  <span className="text-red-500 font-bold">*</span>
                  <span className="text-pink-400 font-normal">(إجباري)</span>
                </label>
                <input
                  value={phone}
                  onChange={handlePhoneChange}
                  required
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={12}
                  className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 text-left tracking-widest transition ${
                    phoneError
                      ? "border-red-400 bg-red-50 focus:ring-red-400"
                      : phone.length === 12
                      ? "border-green-400 bg-green-50 focus:ring-green-400"
                      : "border-pink-200 bg-pink-50/40 focus:ring-pink-400"
                  }`}
                  placeholder="249912345678"
                />
                {phoneError ? (
                  <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    {phoneError}
                  </p>
                ) : (
                  <p className="text-[11px] text-pink-500 mt-1">
                    الصيغة: <span className="font-mono font-bold">249912345678</span> — 12 رقم تبدأ بـ 249
                  </p>
                )}
              </div>

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
                  className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="ovelin_user"
                />
              </div>

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
                    className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 pr-11"
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
                  className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 text-left"
                  placeholder="you@gmail.com"
                />
                <p className="text-[11px] text-pink-500 mt-1 text-right">
                  يُقبَل Gmail فقط (<span className="font-mono">@gmail.com</span>)
                </p>
              </div>

              {/* كود الإحالة */}
              <div>
                <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                  <Gift className="w-3.5 h-3.5" />
                  كود الإحالة
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
                disabled={formLoading || !!phoneError || phone.length !== 12}
                className="w-full rounded-2xl py-3.5 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60"
              >
                {formLoading ? "جارٍ الإرسال..." : "📲 إنشاء الحساب وإرسال الكود"}
              </button>

              <div className="text-center text-xs text-muted-foreground pt-1">
                لديك حساب بالفعل؟{" "}
                <Link href="/login" className="text-pink-600 font-bold hover:underline">
                  تسجيل الدخول
                </Link>
              </div>
              <div className="text-center text-[11px] text-pink-700/80">
                <Link href="/" className="hover:underline">العودة للرئيسية</Link>
              </div>
            </motion.form>
          )}

          {/* ─── الخطوة 2: إدخال كود OTP ─────────────────────── */}
          {step === "otp" && (
            <motion.form
              key="otp"
              exit={{ opacity: 0, x: -30 }}
              onSubmit={handleOtpSubmit}
              className="fancy-card rounded-3xl p-6 shadow-xl space-y-4"
            >
              <div className="text-center p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <Phone className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-800 font-semibold">تم إرسال كود التحقق عبر SMS</p>
                <p className="text-xs text-green-700 mt-1 font-mono dir-ltr">+{phone}</p>
                <p className="text-[11px] text-blue-600 mt-1">
                  {("OTPCredential" in window)
                    ? "📱 سيُقرأ الكود تلقائياً عند وصول الرسالة"
                    : "أدخل الكود المرسل على هاتفك"}
                </p>
              </div>

              <div>
                <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> كود التحقق (6 أرقام)
                </label>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  required
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  maxLength={6}
                  className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-2xl text-center font-mono font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="• • • • • •"
                />
              </div>

              {otpError && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{otpError}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={otpLoading || register.isPending || otp.length < 6}
                className="w-full rounded-2xl py-3.5 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60"
              >
                {(otpLoading || register.isPending) ? "جارٍ التحقق..." : "✅ تحقق وأنشئ الحساب"}
              </button>

              <div className="text-center text-xs text-pink-600">
                {countdown > 0 ? (
                  <span>إعادة الإرسال بعد {countdown} ثانية</span>
                ) : (
                  <button
                    type="button"
                    onClick={resendOtp}
                    className="hover:underline font-semibold"
                  >
                    لم يصلك الكود؟ أرسله مجدداً
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setStep("form"); setOtp(""); setOtpError(null); }}
                className="w-full text-center text-[11px] text-pink-500 hover:underline"
              >
                ← تعديل البيانات
              </button>
            </motion.form>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
