import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ShieldCheck, Crown, Headphones, Send, Wallet, Key, CheckCircle2, Loader2, Copy, X } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";

const FEATURES = [
  { icon: Zap,         label: "تسليم فوري" },
  { icon: ShieldCheck, label: "ضمان كامل" },
  { icon: Crown,       label: "أرخص الأسعار" },
  { icon: Headphones,  label: "دعم 24/7" },
];

const UC_AMOUNTS = [60, 325, 660, 1800, 3850, 8100];

export default function PubgTopup() {
  const [selected, setSelected] = useState<number | null>(null);
  const [deliveredCode, setDeliveredCode] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // جلب منتجات أكواد PUBG المباشرة
  const { data: codeProducts = [] } = useQuery({
    queryKey: ["pubg-code-products"],
    queryFn: async () => {
      const res = await fetch("/api/pubg-code-products");
      if (!res.ok) return [];
      return res.json() as Promise<any[]>;
    },
    staleTime: 30_000,
    refetchInterval: 15_000,
  });

  // البحث عن منتج مطابق لعدد UC المحدد (الكمية = عدد UC)
  const matchedProduct = selected
    ? codeProducts.find((p: any) => p.quantity === String(selected) && (p.available ?? 0) > 0)
    : null;

  const buyMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, targetInfo: "كود مباشر" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "فشل الشراء");
      return data;
    },
    onSuccess: (data) => {
      setBuyError(null);
      if (data.deliveredCode) {
        setDeliveredCode(data.deliveredCode);
      } else {
        setBuyError("تم الطلب — الكود سيصل قريباً، تحقق من طلباتك");
      }
    },
    onError: (err: any) => {
      setBuyError(err.message ?? "فشل الشراء");
    },
  });

  const handleCopy = () => {
    if (!deliveredCode) return;
    navigator.clipboard.writeText(deliveredCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <AppLayout>
      <div dir="rtl" className="-mx-0 -my-0">

        {/* ══ HERO ══ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full overflow-hidden"
          style={{ height: "300px" }}
        >
          <style>{`
            @keyframes ff-spark {
              0%   { opacity: 0;   transform: translate(0, 0) scale(1); }
              18%  { opacity: 1; }
              70%  { opacity: 0.5; transform: translate(var(--dx, 6px), -70px) scale(0.55); }
              100% { opacity: 0;   transform: translate(var(--dx, 10px), -120px) scale(0.15); }
            }
            @keyframes ff-spark2 {
              0%, 100% { opacity: 0;   transform: translate(0,0) scale(0.4); }
              25%      { opacity: 0.9; transform: translate(var(--dx,-5px), -40px) scale(1); }
              75%      { opacity: 0.2; transform: translate(var(--dx, 8px), -90px) scale(0.35); }
            }
            .ff-sp  { animation: ff-spark  var(--d,4s)   var(--delay,0s) ease-out    infinite; }
            .ff-sp2 { animation: ff-spark2 var(--d,5.5s) var(--delay,0s) ease-in-out infinite; }
          `}</style>

          <img
            src="/games/pubg.jpg"
            alt="PUBG Mobile"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center top" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(190,24,93,0.82) 0%, rgba(225,29,72,0.75) 40%, rgba(100,0,30,0.88) 100%)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 32px)",
          }} />

          {[
            { left: "6%",  bottom: "8%",  delay: "0s",   dur: "4.2s", dx: "5px",  size: 3, cls: "ff-sp"  },
            { left: "15%", bottom: "20%", delay: "1.1s", dur: "5.0s", dx: "-7px", size: 2, cls: "ff-sp2" },
            { left: "26%", bottom: "5%",  delay: "0.5s", dur: "3.8s", dx: "9px",  size: 4, cls: "ff-sp"  },
            { left: "38%", bottom: "30%", delay: "2.0s", dur: "5.5s", dx: "-4px", size: 2, cls: "ff-sp2" },
            { left: "50%", bottom: "12%", delay: "0.3s", dur: "4.6s", dx: "6px",  size: 3, cls: "ff-sp"  },
            { left: "62%", bottom: "40%", delay: "1.5s", dur: "5.2s", dx: "-8px", size: 2, cls: "ff-sp2" },
            { left: "73%", bottom: "7%",  delay: "0.8s", dur: "4.0s", dx: "5px",  size: 4, cls: "ff-sp"  },
            { left: "84%", bottom: "25%", delay: "2.3s", dur: "5.8s", dx: "-6px", size: 2, cls: "ff-sp2" },
            { left: "91%", bottom: "10%", delay: "0.6s", dur: "4.4s", dx: "7px",  size: 3, cls: "ff-sp"  },
            { left: "20%", bottom: "55%", delay: "1.8s", dur: "6.0s", dx: "-5px", size: 2, cls: "ff-sp2" },
            { left: "44%", bottom: "60%", delay: "0.9s", dur: "5.4s", dx: "4px",  size: 2, cls: "ff-sp"  },
            { left: "68%", bottom: "50%", delay: "2.6s", dur: "4.8s", dx: "-9px", size: 3, cls: "ff-sp2" },
          ].map((s, i) => (
            <div key={i} className={s.cls} style={{
              position: "absolute",
              left: s.left,
              bottom: s.bottom,
              "--delay": s.delay,
              "--d": s.dur,
              "--dx": s.dx,
              width: `${s.size}px`,
              height: `${s.size}px`,
              borderRadius: "50%",
              background: "rgba(255,180,60,0.9)",
              boxShadow: `0 0 ${s.size * 2}px rgba(255,200,0,0.6)`,
            } as React.CSSProperties} />
          ))}

          {/* Logo + Title */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
            <img src="/games/pubg.jpg" alt="PUBG" className="w-16 h-16 rounded-2xl object-cover shadow-2xl mb-3 ring-2 ring-white/30" />
            <h1 className="text-3xl font-black text-white tracking-widest" style={{ textShadow: "0 0 24px rgba(255,120,0,0.7), 0 2px 10px rgba(0,0,0,0.6)" }}>
              PUBG MOBILE
            </h1>
            <p className="text-white/70 text-xs font-semibold mt-1">شحن UC مضمون وفوري</p>
          </div>
        </motion.div>

        {/* ══ مميزات ══ */}
        <div className="grid grid-cols-4 gap-0 border-b border-gray-100 bg-white">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex flex-col items-center gap-1 py-3 px-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #db2777, #e11d48)" }}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[9px] font-bold text-gray-600 text-center leading-tight">{f.label}</span>
              </div>
            );
          })}
        </div>

        {/* ══ اختيار الكمية ══ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white">
          <div className="px-4 pt-5 pb-3">
            <h2 className="font-black text-gray-900 text-base mb-1">اختر كمية UC</h2>
            <p className="text-xs text-gray-500">حدد عدد UC الذي تريد شحنه</p>
          </div>

          <div className="grid grid-cols-3 gap-3 px-4 pb-4">
            {UC_AMOUNTS.map((uc) => {
              const isSelected = selected === uc;
              const hasCode = codeProducts.some((p: any) => p.quantity === String(uc) && (p.available ?? 0) > 0);
              return (
                <motion.button
                  key={uc}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSelected((prev) => prev === uc ? null : uc); setBuyError(null); setDeliveredCode(null); }}
                  className="relative flex flex-col items-center justify-center rounded-2xl border-2 py-4 transition-all overflow-hidden"
                  style={{
                    borderColor: isSelected ? "#db2777" : "rgba(219,39,119,0.15)",
                    background: isSelected
                      ? "linear-gradient(135deg, rgba(219,39,119,0.12), rgba(225,29,72,0.08))"
                      : "white",
                    boxShadow: isSelected ? "0 4px 20px rgba(219,39,119,0.2)" : "none",
                  }}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="uc-selector"
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: "linear-gradient(135deg, rgba(219,39,119,0.06), transparent)" }}
                    />
                  )}
                  {/* أيقونة UC */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1.5 relative"
                    style={{ background: isSelected ? "linear-gradient(135deg, #db2777, #e11d48)" : "rgba(219,39,119,0.1)" }}>
                    <span className="text-[10px] font-black text-white relative">UC</span>
                  </div>
                  <span className="font-black text-base relative" style={{ color: isSelected ? "#db2777" : "#1f2937" }}>{uc}</span>
                  <span className="text-[9px] font-semibold text-gray-400 relative">UC</span>

                  {/* شارة "كود متاح" */}
                  {hasCode && (
                    <div className="absolute top-1.5 left-1.5 bg-violet-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                      كود
                    </div>
                  )}

                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "#db2777" }}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ══ معلومات اللاعب ══ */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white mt-2 px-4 py-5">
                <h3 className="font-black text-gray-800 text-sm mb-3">معلومات الحساب</h3>

                {/* بطاقة المبلغ */}
                <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
                  style={{ background: "linear-gradient(135deg, #db2777, #e11d48, #be185d)" }}>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-[10px] font-black text-white">UC</span>
                    </div>
                  </div>

                  <div className="flex-1 relative">
                    <div className="text-white/70 text-[10px] font-semibold mb-0.5">الكمية المختارة</div>
                    <div className="text-white font-black text-xl">{selected} UC</div>
                  </div>

                  <div className="w-px h-10 mx-2 opacity-30" style={{ background: "rgba(255,255,255,0.5)" }} />

                  <div className="text-left relative">
                    <div className="text-white/70 text-[10px] font-semibold mb-1 tracking-wide uppercase">الدفع عبر</div>
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-white/90 flex-shrink-0" />
                      <span className="text-white font-black text-base" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                        المحفظة
                      </span>
                    </div>
                  </div>
                </div>

                {/* ══ أزرار الشراء ══ */}
                <div className="space-y-2">

                  {/* زر شراء كود مباشر — يظهر فقط عندما يوجد كود متاح */}
                  {matchedProduct && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => { setBuyError(null); buyMutation.mutate(matchedProduct.id); }}
                      disabled={buyMutation.isPending}
                      className="w-full py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all relative overflow-hidden"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #6d28d9, #4c1d95)",
                        boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                      }}
                    >
                      {buyMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Key className="w-4 h-4" />
                      )}
                      {buyMutation.isPending
                        ? "جارٍ الشراء..."
                        : `💎 شراء كود مباشر — ${Number(matchedProduct.price).toFixed(0)} ج.س`}
                    </motion.button>
                  )}

                  {/* زر شحن عبر الايدي + إلغاء */}
                  <div className="flex gap-2">
                    <Link href="/support-new" className="flex-1">
                      <button
                        disabled={!selected}
                        className="w-full py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all relative overflow-hidden"
                        style={{
                          background: selected
                            ? "linear-gradient(135deg, #db2777, #e11d48, #be185d)"
                            : "linear-gradient(135deg, #f9a8c9, #fca5a5)",
                          boxShadow: selected ? "0 4px 20px rgba(220,38,38,0.4)" : "none",
                        }}
                      >
                        {selected && (
                          <span className="absolute inset-0 rounded-xl animate-pulse pointer-events-none"
                            style={{ background: "rgba(255,255,255,0.08)" }} />
                        )}
                        <Send className="w-4 h-4 relative" />
                        <span className="relative">شحن عبر الايدي</span>
                      </button>
                    </Link>
                    <button
                      onClick={() => { setSelected(null); setBuyError(null); setDeliveredCode(null); }}
                      disabled={!selected}
                      className="px-5 py-3.5 rounded-xl font-bold text-sm border-2 disabled:opacity-30 transition-all"
                      style={{ borderColor: "#db2777", color: "#db2777", background: "white" }}
                    >
                      إلغاء
                    </button>
                  </div>

                  {/* رسالة الخطأ */}
                  {buyError && (
                    <p className="text-center text-xs text-rose-600 font-bold pt-1">{buyError}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ مودال الكود المُسلَّم ══ */}
        <AnimatePresence>
          {deliveredCode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              dir="rtl"
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
                style={{ background: "linear-gradient(160deg, #1a0030 0%, #2d0050 60%, #0d001a 100%)" }}
              >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
                    <Key className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-white font-black text-lg">كودك جاهز! 🎉</h2>
                  <p className="text-purple-300 text-xs mt-1">أدخل الكود في PUBG Mobile لاسترداده</p>
                </div>

                {/* Code display */}
                <div className="mx-4 mb-4 rounded-2xl border-2 border-purple-500/40 bg-white/5 p-4">
                  <p className="text-purple-400 text-[10px] font-bold mb-2 text-center tracking-widest uppercase">كودك</p>
                  <p className="font-mono text-xl font-black text-center text-purple-100 tracking-[0.2em] break-all">
                    {deliveredCode}
                  </p>
                </div>

                {/* Copy button */}
                <div className="px-4 pb-4 space-y-2">
                  <button
                    onClick={handleCopy}
                    className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: copied
                        ? "linear-gradient(135deg, #059669, #047857)"
                        : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      color: "white",
                      boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                    }}
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "تم النسخ!" : "نسخ الكود"}
                  </button>

                  {/* Instructions */}
                  <div className="rounded-xl bg-white/5 border border-purple-800/30 p-3">
                    <p className="text-[10px] text-purple-400 font-black mb-2">📱 طريقة الاستخدام</p>
                    {["افتح PUBG Mobile", "الإعدادات ← استرداد الكود", "أدخل الكود واضغط تأكيد"].map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-purple-200/70 mb-1">
                        <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 font-black flex items-center justify-center text-[9px] shrink-0">{i + 1}</span>
                        {step}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => { setDeliveredCode(null); setSelected(null); }}
                    className="w-full py-2.5 rounded-xl bg-white/5 border border-purple-800/30 text-purple-400 font-bold text-sm flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> إغلاق
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AppLayout>
  );
}
