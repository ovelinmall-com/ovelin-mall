import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ShieldCheck, Crown, Headphones } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

// ─── نفس features فري فاير بالضبط ─────────────────────────
const FEATURES = [
  { icon: Zap,         label: "تسليم فوري" },
  { icon: ShieldCheck, label: "ضمان كامل" },
  { icon: Crown,       label: "أرخص الأسعار" },
  { icon: Headphones,  label: "دعم 24/7" },
];

// ─── باقات UC ────────────────────────────────────────────────
const UC_AMOUNTS = [60, 325, 660, 1800, 3850, 8100];

export default function PubgTopup() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <AppLayout>
      <div dir="rtl" className="-mx-0 -my-0">

        {/* ══ HERO — نفس فري فاير بالضبط ══════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full overflow-hidden"
          style={{ height: "300px" }}
        >
          {/* Spark keyframes — نفس فري فاير */}
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

          {/* Background image — PUBG */}
          <img
            src="/games/pubg.jpg"
            alt="PUBG Mobile"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center top" }}
          />
          {/* Red overlay — نفس فري فاير */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(190,24,93,0.82) 0%, rgba(225,29,72,0.75) 40%, rgba(100,0,30,0.88) 100%)" }} />
          {/* Shimmer layer */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 32px)",
          }} />

          {/* Sparks — نفس فري فاير بالضبط */}
          {[
            { left: "6%",  bottom: "8%",  delay: "0s",    dur: "4.2s",  dx: "5px",  size: 3, cls: "ff-sp"  },
            { left: "15%", bottom: "20%", delay: "1.1s",  dur: "5.0s",  dx: "-7px", size: 2, cls: "ff-sp2" },
            { left: "26%", bottom: "5%",  delay: "0.5s",  dur: "3.8s",  dx: "9px",  size: 4, cls: "ff-sp"  },
            { left: "38%", bottom: "30%", delay: "2.0s",  dur: "5.5s",  dx: "-4px", size: 2, cls: "ff-sp2" },
            { left: "50%", bottom: "12%", delay: "0.3s",  dur: "4.6s",  dx: "6px",  size: 3, cls: "ff-sp"  },
            { left: "62%", bottom: "40%", delay: "1.5s",  dur: "5.2s",  dx: "-8px", size: 2, cls: "ff-sp2" },
            { left: "73%", bottom: "7%",  delay: "0.8s",  dur: "4.0s",  dx: "5px",  size: 4, cls: "ff-sp"  },
            { left: "84%", bottom: "25%", delay: "2.3s",  dur: "5.8s",  dx: "-6px", size: 2, cls: "ff-sp2" },
            { left: "91%", bottom: "10%", delay: "0.6s",  dur: "4.4s",  dx: "7px",  size: 3, cls: "ff-sp"  },
            { left: "20%", bottom: "55%", delay: "1.8s",  dur: "6.0s",  dx: "-5px", size: 2, cls: "ff-sp2" },
            { left: "44%", bottom: "60%", delay: "0.9s",  dur: "5.4s",  dx: "4px",  size: 2, cls: "ff-sp"  },
            { left: "68%", bottom: "50%", delay: "2.6s",  dur: "4.8s",  dx: "-9px", size: 3, cls: "ff-sp2" },
          ].map((s, i) => (
            <div
              key={i}
              className={s.cls}
              style={{
                position: "absolute",
                bottom: s.bottom,
                left: s.left,
                width: s.size,
                height: s.size,
                borderRadius: "50%",
                background: "radial-gradient(circle, #fff 0%, #f97316 60%, transparent 100%)",
                "--delay": s.delay,
                "--d": s.dur,
                "--dx": s.dx,
              } as React.CSSProperties}
            />
          ))}

          {/* Title card — center — نفس فري فاير */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="text-center px-8 py-4 rounded-2xl mx-8"
              style={{
                background: "rgba(255,255,255,0.10)",
                backdropFilter: "blur(14px)",
                border: "1px solid rgba(255,255,255,0.22)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
              }}
            >
              <p
                className="text-white font-black text-4xl leading-none tracking-widest"
                style={{ textShadow: "0 0 24px rgba(255,120,0,0.7), 0 2px 10px rgba(0,0,0,0.6)" }}
              >
                PUBG MOBILE
              </p>
              <div className="mt-2 h-px mx-2" style={{ background: "linear-gradient(90deg, transparent, rgba(255,165,0,0.8), transparent)" }} />
              <p className="text-white/85 text-sm mt-2 font-semibold tracking-wide">اشحن UC الآن</p>
            </div>
          </div>
        </motion.div>

        {/* ══ CONTENT — نفس فري فاير ══════════════════════════ */}
        <div className="bg-white px-4 pt-5 pb-10">

          {/* Features strip — نفس فري فاير بالضبط */}
          <div className="flex gap-2.5 mb-5 overflow-x-auto pb-1 no-scrollbar">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 relative"
                style={{
                  padding: "7px 16px",
                  borderRadius: "999px",
                  background: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(190,24,93,0.06) 100%)",
                  border: "1.5px solid rgba(220,38,38,0.35)",
                  boxShadow: "0 2px 10px rgba(220,38,38,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
                }}
              >
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-300 text-[8px] font-black leading-none select-none">⌒</span>
                <f.icon className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                <span className="text-gray-800 text-xs font-bold">{f.label}</span>
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-300 text-[8px] font-black leading-none select-none">⌒</span>
              </div>
            ))}
          </div>

          {/* Section title — نفس فري فاير */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-l from-red-300 to-transparent" />
            <span className="text-gray-800 font-bold text-sm px-2">اختر باقتك</span>
            <div className="flex-1 h-px bg-gradient-to-r from-pink-300 to-transparent" />
          </div>

          {/* Packages Grid — 6 باقات UC بنفس تصميم فري فاير */}
          <div className="grid grid-cols-3 gap-2">
            {UC_AMOUNTS.map((uc) => {
              const isSelected = selected === uc;
              return (
                <motion.button
                  key={uc}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSelected((prev) => prev === uc ? null : uc)}
                  style={isSelected ? {
                    border: "2px solid #db2777",
                    background: "#fef2f2",
                    boxShadow: "0 0 16px 4px rgba(220,38,38,0.45), 0 4px 12px rgba(220,38,38,0.3)",
                  } : {
                    border: "2px solid #db2777",
                    background: "white",
                    cursor: "pointer",
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl py-3 px-1 transition-all relative"
                >
                  <span
                    className="text-base leading-none mb-1"
                    style={{
                      filter: "hue-rotate(150deg) saturate(3) brightness(0.95) drop-shadow(0 0 5px rgba(220,38,38,0.9))",
                    }}
                  >💎</span>
                  <span className={`font-black text-xs leading-none ${isSelected ? "text-red-600" : "text-gray-800"}`}>
                    {uc.toLocaleString("en-US")}
                  </span>
                  <span className={`text-[9px] font-bold leading-none mt-0.5 ${isSelected ? "text-red-400" : "text-gray-400"}`}>
                    UC
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Selected info row — نفس فري فاير */}
          <AnimatePresence>
            {selected !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4"
              >
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-red-200 bg-white">
                  <span className="font-bold text-gray-800 text-sm">
                    💎 {selected.toLocaleString("en-US")} UC
                  </span>
                  <span className="font-black text-red-600 text-lg">تم الاختيار ✓</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Banner — كيف تشحن؟ — نفس فري فاير */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 rounded-2xl overflow-hidden bg-white border border-red-100"
            style={{ boxShadow: "0 2px 16px rgba(220,38,38,0.08)" }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b border-red-100"
              style={{ background: "linear-gradient(90deg, #fef2f2, #fff5f5)" }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #db2777, #e11d48)" }}
              >
                <span className="text-white text-[10px] font-black">؟</span>
              </div>
              <h4 className="text-gray-800 font-bold text-sm">كيف تشحن؟</h4>
            </div>
            {/* Steps */}
            {[
              "اختر الباقة المناسبة",
              "أدخل اسمك وID حسابك في PUBG Mobile",
              "أكّد الطلب من محفظتك",
              "ستصلك الـ UC خلال دقائق ✅",
            ].map((step, i) => (
              <div key={i}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black text-[11px]"
                    style={{ background: "linear-gradient(135deg, #db2777, #e11d48)" }}
                  >
                    {i + 1}
                  </div>
                  <span className="text-gray-600 text-xs leading-relaxed flex-1">{step}</span>
                </div>
                {i < 3 && (
                  <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, rgba(220,38,38,0.12), transparent)" }} />
                )}
              </div>
            ))}
          </motion.div>

        </div>
      </div>
    </AppLayout>
  );
}
