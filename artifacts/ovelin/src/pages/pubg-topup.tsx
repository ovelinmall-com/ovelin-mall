import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Crown, ShieldCheck, Zap } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

// ─── UC Packages ─────────────────────────────────────────
const UC_PACKAGES = [
  { id: 1, amount: 60,   label: "60 UC"   },
  { id: 2, amount: 325,  label: "325 UC"  },
  { id: 3, amount: 660,  label: "660 UC"  },
  { id: 4, amount: 1800, label: "1,800 UC" },
  { id: 5, amount: 3850, label: "3,850 UC" },
  { id: 6, amount: 8100, label: "8,100 UC" },
];

// ─── UC Icon (bullet/circle) ──────────────────────────────
function UCIcon({ size = 28, selected = false }: { size?: number; selected?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle
        cx="16" cy="16" r="14"
        fill={selected ? "url(#ucGradSel)" : "url(#ucGrad)"}
        opacity={selected ? 1 : 0.55}
      />
      <text
        x="16" y="21"
        textAnchor="middle"
        fontSize="13"
        fontWeight="900"
        fill="white"
        fontFamily="sans-serif"
      >
        UC
      </text>
      <defs>
        <radialGradient id="ucGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#9333ea" />
        </radialGradient>
        <radialGradient id="ucGradSel" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#d946ef" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export default function PubgTopup() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <AppLayout>
      <div dir="rtl" className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 pb-24">

        {/* ══ HERO ══════════════════════════════════════════ */}
        <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
          {/* Background image */}
          <img
            src="/games/pubg.jpg"
            alt="PUBG Mobile"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-zinc-950" />
          <div className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(236,72,153,0.22) 0%, transparent 70%)" }}
          />

          {/* Back button */}
          <div className="relative px-4 pt-4">
            <Link href="/game/pubg">
              <button className="flex items-center gap-1 text-white/75 hover:text-white text-sm font-semibold">
                <ArrowRight className="h-4 w-4" />
                رجوع
              </button>
            </Link>
          </div>

          {/* Title block */}
          <div className="relative text-center px-4 pt-4 pb-12">
            {/* Game logo circle */}
            <div className="mx-auto mb-3 h-20 w-20 rounded-2xl overflow-hidden ring-2 ring-white/20 shadow-2xl shadow-pink-500/30">
              <img src="/games/pubg.jpg" alt="PUBG Mobile" className="w-full h-full object-cover" />
            </div>

            <h1
              className="text-4xl font-black tracking-widest text-white"
              style={{ textShadow: "0 0 28px rgba(236,72,153,0.65), 0 2px 12px rgba(0,0,0,0.7)" }}
            >
              PUBG MOBILE
            </h1>
            <p className="mt-1 text-sm font-semibold text-white/70">اشحن UC الآن</p>
          </div>
        </div>

        {/* ══ CONTENT ══════════════════════════════════════ */}
        <div className="px-4 -mt-4 relative z-10">

          {/* ── Feature badges ── */}
          <div className="flex gap-2 mb-6 justify-center flex-wrap">
            {[
              { icon: <Crown className="h-3.5 w-3.5 text-amber-400" />, label: "أرخص الأسعار" },
              { icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />, label: "ضمان كامل" },
              { icon: <Zap className="h-3.5 w-3.5 text-pink-400" />, label: "تسليم فوري" },
            ].map((b) => (
              <div
                key={b.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-pink-800/40 bg-white/5 text-[12px] font-bold text-white/85"
              >
                {b.icon}
                {b.label}
              </div>
            ))}
          </div>

          {/* ── Package selector ── */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-pink-500 to-fuchsia-500" />
              <span className="text-white font-black text-sm">اختر باقتك</span>
            </div>

            {/* Scrollable row — نفس تصميم فري فاير */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
              {UC_PACKAGES.map((pkg, i) => {
                const isSelected = selected === pkg.id;
                return (
                  <motion.button
                    key={pkg.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setSelected(isSelected ? null : pkg.id)}
                    snap-align="start"
                    className={`
                      relative flex-shrink-0 flex flex-col items-center justify-center gap-1.5
                      w-[80px] rounded-2xl border-2 py-3 px-2 transition-all duration-200
                      ${isSelected
                        ? "border-pink-500 bg-gradient-to-b from-pink-600/30 to-fuchsia-700/20 shadow-[0_0_20px_rgba(236,72,153,0.45)]"
                        : "border-white/10 bg-white/5 hover:border-pink-700/50"
                      }
                    `}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, type: "spring", stiffness: 260, damping: 22 }}
                  >
                    <UCIcon size={30} selected={isSelected} />

                    <span
                      className={`text-[13px] font-black leading-tight text-center ${
                        isSelected ? "text-white" : "text-pink-200/80"
                      }`}
                    >
                      {pkg.amount >= 1000
                        ? pkg.amount.toLocaleString("en-US")
                        : pkg.amount}
                    </span>
                    <span className={`text-[9px] font-bold ${isSelected ? "text-pink-300" : "text-pink-400/60"}`}>
                      UC
                    </span>

                    {/* Selected ring pulse */}
                    {isSelected && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl border-2 border-pink-400"
                        initial={{ opacity: 0.6, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.06 }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* ── Selected badge ── */}
          {selected !== null && (
            <motion.div
              key={selected}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center justify-center gap-2 bg-pink-500/15 border border-pink-500/40 rounded-2xl py-3 px-4"
            >
              <UCIcon size={22} selected />
              <span className="text-white font-black text-sm">
                {UC_PACKAGES.find(p => p.id === selected)?.label} — تم الاختيار ✓
              </span>
            </motion.div>
          )}

          {/* ── كيف تشحن؟ ── */}
          <div className="rounded-2xl border border-pink-800/30 bg-white/5 p-4 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded-full bg-pink-500/25 border border-pink-500/50 flex items-center justify-center">
                <span className="text-pink-300 text-[10px] font-black">?</span>
              </div>
              <span className="text-white font-black text-sm">كيف تشحن؟</span>
            </div>

            <div className="flex flex-col gap-3">
              {[
                { n: "1", text: "اختر الباقة المناسبة" },
                { n: "2", text: "أدخل اسمك وID حسابك في PUBG Mobile" },
                { n: "3", text: "أتمّ الطلب من محفظتك" },
              ].map((step) => (
                <div key={step.n} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                    <span className="text-white text-[11px] font-black">{step.n}</span>
                  </div>
                  <span className="text-pink-100/80 text-sm font-semibold leading-snug">{step.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
