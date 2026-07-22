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
  AlertCircle,
  AlertTriangle,
  User,
  Lock,
  Gift,
  Mail,
  Phone,
  CheckCircle2,
  Eye,
  EyeOff,
  PhoneCall,
  Loader2,
  RefreshCw,
  PhoneIncoming,
} from "lucide-react";
import {
  useRegister,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { DEFAULT_COUNTRY, type Country } from "../data/countries";
import CountryCodePicker from "../components/CountryCodePicker";

type Step = "form" | "call" | "done";

function stripLeadingZero(local: string): string {
  return local.startsWith("0") ? local.slice(1) : local;
}

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

// ── Pulse animation للاتصال ─────────────────────────────────
function CallPulse() {
  return (
    <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-pink-400"
          animate={{ scale: [1, 1.8 + i * 0.3], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg z-10">
        <PhoneCall className="w-8 h-8 text-white" />
      </div>
    </div>
  );
}

export default function Register() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const register = useRegister();
  const [step, setStep] = useState<Step>("form");

  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [localPhone, setLocalPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // حالة التحقق بالاتصال
  const [sessionId, setSessionId]     = useState("");
  const [sessionPhone, setSessionPhone] = useState(""); // الرقم الذي أُنشئت له الجلسة
  const [callNumber, setCallNumber]   = useState("");      // من الـ API
  const [adminCallNumber, setAdminCallNumber] = useState(""); // من الإعدادات
  const [expiresIn, setExpiresIn]     = useState(900);
  const [countdown, setCountdown]     = useState(0);
  const [callLoading, setCallLoading] = useState(false);
  const [callError, setCallError]     = useState<string | null>(null);
  const [pollStatus, setPollStatus]   = useState<"waiting" | "calling" | "verified">("waiting");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // الرقم المعروض = من الأدمن إن وُجد، وإلا من الـ API
  const displayNumber = adminCallNumber || callNumber;

  const [formError, setFormError]   = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fullPhone = buildFullPhone(selectedCountry.dialCode, localPhone);

  // قراءة كود الإحالة من URL
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const ref = sp.get("ref");
    if (ref) setReferralCode(ref.toUpperCase());
  }, []);

  // عداد الوقت المتبقي للجلسة
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // جلب رقم الاتصال من إعدادات الأدمن
  useEffect(() => {
    fetch("/api/settings/public-rich")
      .then((r) => r.json())
      .then((d: { callVerifyNumber?: string }) => {
        if (d.callVerifyNumber) setAdminCallNumber(d.callVerifyNumber);
      })
      .catch(() => {});
  }, []);

  // تنظيف polling عند مغادرة الخطوة
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // ── بدء الـ Long-Poll ───────────────────────────────────────
  function startPolling(sid: string, phone: string) {
    if (pollRef.current) clearTimeout(pollRef.current);
    abortRef.current?.abort();

    const ac = new AbortController();
    abortRef.current = ac;

    const doPoll = async () => {
      try {
        const res = await fetch(
          `/api/auth/call-verify/poll/${encodeURIComponent(sid)}?phone=${encodeURIComponent(phone)}`,
          { signal: ac.signal }
        );
        if (!res.ok) throw new Error("poll failed");

        const data = await res.json() as {
          verified: boolean;
          expired: boolean;
          remainingSeconds: number;
        };

        if (data.verified) {
          // ✅ تم التحقق — سجّل الحساب تلقائياً
          setPollStatus("verified");
          doRegister();
          return;
        }

        if (data.expired) {
          setCallError("انتهت صلاحية الجلسة — ابدأ من جديد");
          return;
        }

        // مستمر في الانتظار — استمر فوراً بدون أي تأخير
        pollRef.current = setTimeout(doPoll, 0);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        // خطأ شبكي مؤقت — أعد المحاولة بعد ثانيتين
        pollRef.current = setTimeout(doPoll, 2000);
      }
    };

    doPoll();
  }

  // ── التسجيل التلقائي بعد التحقق ────────────────────────────
  function doRegister() {
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
          setStep("done");
        },
        onError: (err: unknown) => {
          const e = err as {
            data?: { error?: string };
            response?: { data?: { error?: string } };
            message?: string;
          };
          setCallError(
            e?.data?.error ??
            e?.response?.data?.error ??
            e?.message ??
            "تعذر إنشاء الحساب"
          );
          setPollStatus("waiting");
        },
      }
    );
  }

  function handleLocalPhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 15);
    setLocalPhone(raw);
    setPhoneError(validateLocal(raw, selectedCountry.dialCode));
  }

  const isPhoneReady =
    localPhone.length > 0 &&
    !phoneError &&
    fullPhone.length >= 7 &&
    fullPhone.length <= 15;

  // ── إرسال الفورم → بدء جلسة التحقق بالاتصال ────────────────
  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const err = validateLocal(localPhone, selectedCountry.dialCode);
    if (err) { setPhoneError(err); return; }

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
    try {
      // ── إذا كان الرقم نفسه وهناك جلسة فعّالة → ارجع إليها مباشرةً ──
      if (sessionId && countdown > 0 && fullPhone === sessionPhone) {
        setCallError(null);
        setPollStatus("waiting");
        setStep("call");
        startPolling(sessionId, fullPhone);
        return;
      }

      // تحقق من توفر اسم المستخدم
      const usernameRes = await fetch(
        `/api/auth/check-username?username=${encodeURIComponent(username.trim())}`
      );
      if (usernameRes.ok) {
        const ud = await usernameRes.json() as { available?: boolean };
        if (ud.available === false) {
          setFormError("اسم المستخدم محجوز، يرجى اختيار اسم آخر");
          return;
        }
      }

      // فتح جلسة التحقق بالاتصال
      const res = await fetch("/api/auth/call-verify/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json() as {
        sessionId?: string;
        callNumber?: string;
        expiresIn?: number;
        error?: string;
      };

      if (!res.ok) {
        setFormError(data.error ?? "تعذر بدء التحقق");
        return;
      }

      setSessionId(data.sessionId!);
      setSessionPhone(fullPhone);
      setCallNumber(data.callNumber!);
      setExpiresIn(data.expiresIn ?? 900);
      setCountdown(data.expiresIn ?? 900);
      setPollStatus("waiting");
      setCallError(null);
      setStep("call");
      startPolling(data.sessionId!, fullPhone);
    } catch {
      setFormError("تعذر الاتصال بالخادم");
    } finally {
      setFormLoading(false);
    }
  }

  // ── إعادة المحاولة: جلسة جديدة ──────────────────────────────
  async function handleRetry() {
    abortRef.current?.abort();
    if (pollRef.current) clearTimeout(pollRef.current);
    setCallError(null);
    setPollStatus("waiting");
    setCallLoading(true);

    try {
      const res = await fetch("/api/auth/call-verify/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });
      const data = await res.json() as {
        sessionId?: string;
        callNumber?: string;
        expiresIn?: number;
        error?: string;
      };

      if (!res.ok) {
        setCallError(data.error ?? "تعذر إعادة المحاولة");
        return;
      }

      setSessionId(data.sessionId!);
      setSessionPhone(fullPhone);
      setCallNumber(data.callNumber!);
      setExpiresIn(data.expiresIn ?? 900);
      setCountdown(data.expiresIn ?? 900);
      startPolling(data.sessionId!, fullPhone);
    } catch {
      setCallError("تعذر الاتصال بالخادم");
    } finally {
      setCallLoading(false);
    }
  }

  // ── شاشة النجاح ─────────────────────────────────────────────
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
            <p className="text-sm text-pink-700/80 mt-1">تم إنشاء حسابك وتسجيل دخولك تلقائياً</p>
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
            {step === "form"
              ? "أدخل بياناتك لإنشاء حساب جديد"
              : "اتصل بالرقم أدناه للتحقق من هويتك"}
          </p>
          {/* مؤشر الخطوات */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {(["form", "call"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === s
                    ? "w-8 bg-pink-500"
                    : i < (["form", "call"] as Step[]).indexOf(step as Step)
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

          {/* ─── الخطوة 1: الفورم ─────────────────────────────── */}
          {step === "form" && (
            <motion.div key="form" exit={{ opacity: 0, x: -30 }}>
            <form
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
                  <CountryCodePicker
                    selected={selectedCountry}
                    onSelect={(c) => {
                      setSelectedCountry(c);
                      setPhoneError(validateLocal(localPhone, c.dialCode));
                    }}
                  />
                  <input
                    value={localPhone}
                    onChange={handleLocalPhoneChange}
                    required
                    type="tel"
                    inputMode="numeric"
                    dir="ltr"
                    className="flex-1 min-w-0 bg-transparent px-3 py-3 text-sm focus:outline-none tracking-widest"
                    placeholder="912345678"
                  />
                </div>
                {phoneError && (
                  <p className="text-[11px] text-red-500 mt-1">{phoneError}</p>
                )}
              </div>

              {/* اسم المستخدم */}
              <div>
                <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5" />
                  اسم المستخدم <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required minLength={3} maxLength={50}
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
                    required type={showPassword ? "text" : "password"} minLength={4}
                    className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 pr-11"
                    placeholder="••••••"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600 transition" tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                    required type={showConfirmPassword ? "text" : "password"} minLength={4}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 pr-11 ${
                      confirmPassword && confirmPassword !== password
                        ? "border-red-400 bg-red-50"
                        : confirmPassword && confirmPassword === password
                        ? "border-green-400 bg-green-50"
                        : "border-pink-200 bg-pink-50/40"
                    }`}
                    placeholder="••••••"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600 transition" tabIndex={-1}>
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[11px] text-red-500 mt-1">كلمتا المرور غير متطابقتين</p>
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
                  required type="email" dir="ltr"
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
                  كود الإحالة <span className="text-pink-400 font-normal">(اختياري)</span>
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
                {formLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحقق...
                  </span>
                ) : "إنشاء حساب"}
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
            </motion.div>
          )}

          {/* ─── الخطوة 2: التحقق بالاتصال ────────────────────── */}
          {step === "call" && (
            <motion.div
              key="call"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
            <div className="fancy-card rounded-3xl p-6 shadow-xl space-y-5">

              {/* أيقونة الاتصال */}
              <div className="text-center pt-2">
                {pollStatus === "verified" ? (
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mx-auto shadow-lg"
                  >
                    <CheckCircle2 className="w-9 h-9 text-white" />
                  </motion.div>
                ) : (
                  <CallPulse />
                )}
              </div>

              {pollStatus === "verified" ? (
                <p className="text-center text-sm font-bold text-emerald-700">
                  ✅ تم التحقق! جارٍ إنشاء حسابك...
                </p>
              ) : (
                <>
                  {/* زر الاتصال المباشر */}
                  <motion.a
                    href={`tel:${displayNumber}`}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-300 hover:border-pink-500 active:scale-95 transition px-4 py-5 w-full"
                    dir="ltr"
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="flex items-center gap-2 text-pink-500 font-bold text-base">
                      <PhoneCall className="w-5 h-5" />
                      <span>اضغط للاتصال بهذا الرقم</span>
                    </div>
                    <span
                      className="font-black text-pink-900 leading-tight text-center break-all"
                      style={{ fontSize: "clamp(1.25rem, 6vw, 2rem)", letterSpacing: "0.05em" }}
                    >
                      {displayNumber}
                    </span>
                  </motion.a>

                  {/* شرح العملية */}
                  <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 space-y-2.5 text-right">
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <PhoneIncoming className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <p className="text-xs text-blue-900 leading-relaxed">
                        يُرجى الاتصال بالرقم المُبيَّن أعلاه.
                        <span className="font-bold"> لن يتم الرد على المكالمة</span> —
                        سيرنّ هاتفك رنتين أو ثلاثاً ثم يُقطع الاتصال تلقائياً.
                      </p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <p className="text-xs text-blue-900 leading-relaxed">
                        في حال كان الرقم المسجَّل أدناه
                        <span className="font-bold"> هو ذاته الرقم الذي اتصلت منه</span>،
                        سيُؤكَّد حسابك في الحال فور انتهاء المكالمة.
                      </p>
                    </div>
                  </div>

                  {/* بنر التحذيرات — يهبط ويصعد */}
                  <motion.div
                    className="rounded-2xl border border-red-200 bg-red-50 overflow-hidden"
                    initial={{ y: -18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
                  >
                    <div className="p-4 space-y-3 text-right">

                      {/* تحذير ١ */}
                      <div className="flex items-start gap-3">
                        <motion.div
                          className="shrink-0 mt-0.5"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <AlertTriangle
                            className="w-5 h-5 text-red-500"
                            style={{ filter: "drop-shadow(0 0 6px rgba(239,68,68,0.8))" }}
                          />
                        </motion.div>
                        <p className="text-xs text-red-800 leading-relaxed font-medium">
                          لا تقم بإنهاء المكالمة — سيقوم النظام بإنهائها تلقائياً بعد رنّتين.
                        </p>
                      </div>

                      {/* فاصل */}
                      <div className="border-t border-red-200" />

                      {/* تحذير ٢ */}
                      <div className="flex items-start gap-3">
                        <motion.div
                          className="shrink-0 mt-0.5"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.55 }}
                        >
                          <AlertTriangle
                            className="w-5 h-5 text-red-500"
                            style={{ filter: "drop-shadow(0 0 6px rgba(239,68,68,0.8))" }}
                          />
                        </motion.div>
                        <p className="text-xs text-red-800 leading-relaxed font-medium">
                          لا تحذف أي جزء من هذا الرقم — لا تحذف رمز الدولة.
                          اتصل به كما هو مُبيَّن أعلاه.
                        </p>
                      </div>

                    </div>
                  </motion.div>

                  {/* الرقم المسجَّل + مؤشر الانتظار */}
                  <div className="flex items-center justify-between gap-2 text-xs bg-pink-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-pink-700">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>رقمك المسجَّل:</span>
                      <span className="font-mono font-bold" dir="ltr">+{fullPhone}</span>
                    </div>
                    {countdown > 0 && (
                      <span className="font-mono text-pink-400 shrink-0 text-[11px]">
                        {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                      </span>
                    )}
                  </div>

                  {/* مؤشر الانتظار */}
                  {!callError && (
                    <div className="flex items-center justify-center gap-2 text-xs text-pink-600">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>في انتظار اتصالك...</span>
                    </div>
                  )}
                </>
              )}

              {/* رسالة خطأ + زر إعادة */}
              {callError && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-3">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>{callError}</div>
                  </div>
                  <button
                    onClick={handleRetry}
                    disabled={callLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow active:scale-95 transition disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${callLoading ? "animate-spin" : ""}`} />
                    محاولة جديدة
                  </button>
                </div>
              )}

              {/* زر تغيير الرقم */}
              {pollStatus !== "verified" && (
                <button
                  type="button"
                  onClick={() => {
                    abortRef.current?.abort();
                    if (pollRef.current) clearTimeout(pollRef.current);
                    setStep("form");
                    setCallError(null);
                  }}
                  className="w-full text-center text-xs text-pink-500 hover:underline"
                >
                  ← تغيير رقم الهاتف أو البيانات
                </button>
              )}
            </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
