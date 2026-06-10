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
  useGetPublicSettings,
} from "@workspace/api-client-react";
import CountryCodePicker from "../components/CountryCodePicker";
import { DEFAULT_COUNTRY, type Country } from "../data/countries";

type Step = "form" | "otp" | "done";

/** يحذف الصفر الأول من رقم المحلي إن وُجد */
function stripLeadingZero(local: string): string {
  return local.startsWith("0") ? local.slice(1) : local;
}

/** يبني الرقم الكامل = مفتاح الدولة + الرقم المحلي (بدون صفر أول) */
function buildFullPhone(dialCode: string, local: string): string {
  return dialCode + stripLeadingZero(local);
}

function validateLocal(local: string, dialCode: string): string | null {
  const stripped = stripLeadingZero(local);
  if (stripped.length === 0) return null;
  const full = dialCode + stripped;
  if (full.length < 7)  return "الرقم قصير جداً";
  if (full.length > 15) return "الرقم طويل جداً (الحد 15 رقماً)";
  return null;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const register = useRegister();
  const { data: publicSettings } = useGetPublicSettings();
  const referralBonus = Number(publicSettings?.referralSignupBonus ?? "0");

  const [step, setStep] = useState<Step>("form");

  // رمز الدولة المختار (افتراضي: السودان)
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);

  // الرقم المحلي الذي يكتبه المستخدم
  const [localPhone, setLocalPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // OTP
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // الرقم الكامل المُرسَل للـ API
  const fullPhone = buildFullPhone(country.dialCode, localPhone);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const ref = sp.get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const otpAutoFilledRef = useRef(false);
  const autoSubmitRef = useRef(false);

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
        const digits = cred.code;
        otpAutoFilledRef.current = false;
        digits.split("").forEach((digit, i) => {
          setTimeout(() => {
            setOtp(digits.slice(0, i + 1));
            if (i === digits.length - 1) otpAutoFilledRef.current = true;
          }, i * 120);
        });
      })
      .catch(() => {});
    return () => ac.abort();
  }, [step]);

  function handleLocalPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 15);
    setLocalPhone(raw);
    setPhoneError(validateLocal(raw, country.dialCode));
  }

  function handleCountryChange(c: Country) {
    setCountry(c);
    setPhoneError(validateLocal(localPhone, c.dialCode));
  }

  const isPhoneReady =
    localPhone.length > 0 &&
    !phoneError &&
    fullPhone.length >= 7 &&
    fullPhone.length <= 15;

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const err = validateLocal(localPhone, country.dialCode);
    if (err) { setPhoneError(err); return; }

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
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setFormError(data.error ?? "تعذر إرسال الكود"); return; }
      setCountdown(180);
      setStep("otp");
    } catch {
      setFormError("تعذر الاتصال بالخادم");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null);
    if (otp.length < 6) { setOtpError("أدخل الكود المكوّن من 6 أرقام"); return; }
    setOtpLoading(true);
    try {
      const verRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone, code: otp.trim() }),
      });
      const verData = (await verRes.json()) as { error?: string };
      if (!verRes.ok) {
        setOtpError(verData.error ?? "الكود غير صحيح");
        setOtpLoading(false);
        return;
      }
      register.mutate(
        {
          data: {
            username: username.trim(),
            email: email.trim(),
            password,
            referralCode: referralCode.trim() || undefined,
            phone: fullPhone,
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
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setOtpError(data.error ?? "تعذر إعادة الإرسال"); return; }
      setCountdown(180);
      setOtp("");
    } catch {
      setOtpError("تعذر الاتصال بالخادم");
    }
  }

  // ─── شاشة النجاح ─────────────────────────────────────────────
  if (step === "done") {
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

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10">

        {/* ─── الرأس ─────────────────────────────────────────── */}
        <motion.div className="text-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}icon-192.png`}
            alt="Ovelin"
            className="w-20 h-20 rounded-3xl object-cover shadow-[0_15px_40px_-10px_rgba(190,24,93,0.5)] mx-auto"
          />
          <h1 className="mt-4 text-3xl font-black text-pink-900">أنشئ حسابك</h1>
          <p className="text-pink-700/80 text-sm mt-1">
            {step === "form" ? "أدخل بياناتك لإنشاء حساب جديد" : "أدخل كود التحقق المرسل على هاتفك"}
          </p>
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
            <motion.div key="form" exit={{ opacity: 0, x: -30 }}>
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
              {/* ─── رقم الهاتف + رمز الدولة ────────────────── */}
              <div>
                <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  رقم الهاتف
                  <span className="text-red-500 font-bold">*</span>
                  <span className="text-pink-400 font-normal">(إجباري)</span>
                </label>

                {/* الحقل المدمج: رمز الدولة + الرقم */}
                <div
                  className={`flex items-stretch rounded-2xl border overflow-hidden transition ${
                    phoneError
                      ? "border-red-400 bg-red-50"
                      : isPhoneReady
                      ? "border-green-400 bg-green-50"
                      : "border-pink-200 bg-pink-50/40"
                  }`}
                  style={{ direction: "ltr" }}
                >
                  {/* زر رمز الدولة — على اليمين في LTR */}
                  <CountryCodePicker selected={country} onSelect={handleCountryChange} />

                  {/* حقل الرقم المحلي */}
                  <input
                    value={localPhone}
                    onChange={handleLocalPhoneChange}
                    required
                    type="tel"
                    inputMode="numeric"
                    dir="ltr"
                    className="flex-1 min-w-0 bg-transparent px-3 py-3 text-sm focus:outline-none tracking-widest"
                    placeholder={country.dialCode === "249" ? "912345678" : "XXXXXXXXX"}
                  />
                </div>

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
                disabled={formLoading || !!phoneError || !isPhoneReady}
                className="w-full rounded-2xl py-3.5 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60"
              >
                {formLoading ? "جارٍ الإرسال..." : "إنشاء حساب"}
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
            </form>
            </div>
            </motion.div>
          )}

          {/* ─── الخطوة 2: إدخال كود OTP ─────────────────────── */}
          {step === "otp" && (
            <motion.div key="otp" exit={{ opacity: 0, x: -30 }}>
            <div className="relative p-[2px] rounded-3xl">
              <motion.div
                className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ background: "conic-gradient(from 0deg, transparent 55%, #ec4899 75%, #fda4af 87%, transparent 100%)" }}
              />
            <form
              onSubmit={handleOtpSubmit}
              className="relative z-10 fancy-card rounded-3xl p-6 shadow-xl space-y-4"
            >
              <div className="text-center p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <Phone className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-800 font-semibold">تم إرسال كود التحقق عبر SMS</p>
                <p className="text-xs text-green-700 mt-1 font-mono" dir="ltr">
                  {country.flag} +{fullPhone}
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
                {(otpLoading || register.isPending) ? "جارٍ التحقق..." : "تحقق"}
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
                    إعادة إرسال الكود
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => { setStep("form"); setOtp(""); setOtpError(null); }}
                className="w-full text-xs text-pink-400 hover:text-pink-600 transition"
              >
                ← تعديل رقم الهاتف
              </button>
            </form>
            </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
