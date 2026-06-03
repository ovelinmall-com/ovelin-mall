import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const val = identifier.trim();
    if (!val) { setError("أدخل بريدك الإلكتروني"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: val }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "حدث خطأ"); return; }
      setSent(true);
    } catch {
      setError("تعذر الاتصال بالخادم");
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
          className="text-center mb-8"
        >
          <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-[0_15px_40px_-10px_rgba(190,24,93,0.5)]">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="mt-4 text-3xl font-black text-pink-900">نسيت كلمة المرور؟</h1>
          <p className="text-pink-700/80 text-sm mt-1">
            أدخل بريدك وسنرسل لك رابط إعادة التعيين
          </p>
        </motion.div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fancy-card rounded-3xl p-8 shadow-xl text-center space-y-4"
          >
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <h2 className="text-xl font-black text-pink-900">تم الإرسال!</h2>
            <p className="text-sm text-pink-700/80">
              تحقق من صندوق الوارد لديك — أرسلنا رابط إعادة تعيين كلمة المرور إلى بريدك
            </p>
            <p className="text-xs text-pink-500">الرابط صالح لمدة 30 دقيقة</p>
            <Link href="/login" className="block mt-4 text-pink-600 font-bold hover:underline text-sm">
              العودة لتسجيل الدخول
            </Link>
          </motion.div>
        ) : (
          <form
            onSubmit={submit}
            className="fancy-card rounded-3xl p-6 shadow-xl space-y-4"
          >
            <div>
              <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5" /> البريد الإلكتروني
              </label>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                type="email"
                dir="ltr"
                className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 text-left"
                placeholder="you@gmail.com"
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
              disabled={loading}
              className="w-full rounded-2xl py-3.5 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60"
            >
              {loading ? "جارٍ الإرسال..." : "📧 أرسل رابط إعادة التعيين"}
            </button>

            <div className="text-center text-xs text-muted-foreground pt-2">
              تذكّرت كلمة المرور؟{" "}
              <Link href="/login" className="text-pink-600 font-bold hover:underline">
                تسجيل الدخول
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
