import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, AlertCircle, Lock, CheckCircle2, XCircle } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("token") ?? "";
    if (!t) { setInvalid(true); return; }
    setToken(t);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 4) { setError("كلمة المرور قصيرة جداً (4 أحرف على الأقل)"); return; }
    if (password !== confirm) { setError("كلمتا المرور غير متطابقتَين"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) { setError(data.error ?? "حدث خطأ"); return; }
      setDone(true);
      setTimeout(() => setLocation("/login"), 3000);
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
          <h1 className="mt-4 text-3xl font-black text-pink-900">كلمة مرور جديدة</h1>
          <p className="text-pink-700/80 text-sm mt-1">أدخل كلمة المرور الجديدة لحسابك</p>
        </motion.div>

        {invalid ? (
          <div className="fancy-card rounded-3xl p-8 shadow-xl text-center space-y-4">
            <XCircle className="w-14 h-14 text-red-400 mx-auto" />
            <h2 className="text-xl font-black text-pink-900">رابط غير صالح</h2>
            <p className="text-sm text-pink-700/80">هذا الرابط غير صالح أو منتهي الصلاحية</p>
            <Link href="/forgot-password" className="block text-pink-600 font-bold hover:underline text-sm">
              طلب رابط جديد
            </Link>
          </div>
        ) : done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fancy-card rounded-3xl p-8 shadow-xl text-center space-y-4"
          >
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <h2 className="text-xl font-black text-pink-900">تم بنجاح!</h2>
            <p className="text-sm text-pink-700/80">تم تغيير كلمة مرورك بنجاح</p>
            <p className="text-xs text-pink-500">جارٍ تحويلك لصفحة الدخول...</p>
          </motion.div>
        ) : (
          <form
            onSubmit={submit}
            className="fancy-card rounded-3xl p-6 shadow-xl space-y-4"
          >
            <div>
              <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5" /> كلمة المرور الجديدة
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                minLength={4}
                className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="••••••"
              />
            </div>
            <div>
              <label className="text-xs text-pink-800 font-semibold flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5" /> تأكيد كلمة المرور
              </label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                type="password"
                minLength={4}
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
              disabled={loading}
              className="w-full rounded-2xl py-3.5 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60"
            >
              {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
