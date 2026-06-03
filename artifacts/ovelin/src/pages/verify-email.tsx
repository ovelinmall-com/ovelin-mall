import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const token = sp.get("token");
    if (!token) { setStatus("error"); setMsg("رمز التحقق مفقود"); return; }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data: { ok?: boolean; error?: string }) => {
        if (data.ok) { setStatus("success"); }
        else { setStatus("error"); setMsg(data.error ?? "رمز غير صالح أو منتهي"); }
      })
      .catch(() => { setStatus("error"); setMsg("تعذر الاتصال بالخادم"); });
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-[0_15px_40px_-10px_rgba(190,24,93,0.5)]">
            <Sparkles className="w-8 h-8" />
          </div>
        </motion.div>

        <div className="fancy-card rounded-3xl p-8 shadow-xl text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-pink-400 mx-auto animate-spin" />
              <p className="text-pink-700 font-semibold">جارٍ التحقق...</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
              <h2 className="text-2xl font-black text-pink-900">تم التحقق!</h2>
              <p className="text-sm text-pink-700/80">تم تأكيد بريدك الإلكتروني بنجاح</p>
              <Link href="/account" className="block mt-4 w-full rounded-2xl py-3 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white text-center">
                الذهاب لحسابي
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-14 h-14 text-red-400 mx-auto" />
              <h2 className="text-xl font-black text-pink-900">فشل التحقق</h2>
              <p className="text-sm text-pink-700/80">{msg}</p>
              <Link href="/account" className="block text-pink-600 font-bold hover:underline text-sm">
                العودة لحسابي لإعادة الإرسال
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
