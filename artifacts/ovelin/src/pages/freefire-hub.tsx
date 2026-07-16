import { Link } from "wouter";
import { ArrowRight, Flame, ShoppingBag } from "lucide-react";

export default function FreefireHub() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-rose-950 via-pink-950 to-black pb-12">
      {/* Header */}
      <div className="relative overflow-hidden px-4 pt-12 pb-10 text-center">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(/games/free-fire.webp)`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-rose-950/80 via-rose-950/70 to-rose-950" />

        <div className="relative z-10">
          <Link href="/">
            <button className="absolute right-0 top-0 flex items-center gap-1 text-white/70 hover:text-white text-sm font-medium">
              <ArrowRight className="h-4 w-4" />
              رجوع
            </button>
          </Link>

          <img
            src="/games/free-fire.webp"
            alt="Free Fire"
            className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover shadow-2xl shadow-rose-500/40 ring-2 ring-white/20"
          />
          <h1
            className="text-4xl font-black tracking-widest text-white"
            style={{ textShadow: "0 0 24px rgba(255,120,0,0.7), 0 2px 10px rgba(0,0,0,0.6)" }}
          >
            FREE FIRE
          </h1>
          <p className="mt-1 text-sm font-semibold text-white/70">اختر ما تريد</p>
        </div>
      </div>

      {/* Two cards */}
      <div className="mx-auto max-w-sm px-5 space-y-4 -mt-2">

        {/* Card 1 — Gems */}
        <Link href="/game/free-fire">
          <div className="relative overflow-hidden rounded-3xl cursor-pointer active:scale-[0.97] transition-transform duration-150 shadow-2xl shadow-rose-500/30">
            <img
              src="/games/free-fire.webp"
              alt="جواهر Free Fire"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "center top" }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(190,24,93,0.85) 0%, rgba(225,29,72,0.78) 40%, rgba(100,0,30,0.92) 100%)" }} />
            <div className="relative z-10 flex items-center gap-4 p-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/30">
                <Flame className="h-7 w-7 text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-0.5">شحن فوري</p>
                <h2 className="text-xl font-black text-white">جواهر Free Fire</h2>
                <p className="text-sm text-white/70 mt-0.5">اشحن جواهرك مباشرة على حسابك</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-white/60 rotate-180" />
            </div>
            <div className="relative z-10 h-1.5 bg-gradient-to-r from-amber-400 via-rose-400 to-pink-500" />
          </div>
        </Link>

        {/* Card 2 — Accounts */}
        <Link href="/freefire-accounts">
          <div className="relative overflow-hidden rounded-3xl cursor-pointer active:scale-[0.97] transition-transform duration-150 shadow-2xl shadow-violet-500/20 bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-950 ring-1 ring-white/10">
            {/* subtle pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 28px)",
              }}
            />
            <div className="relative z-10 flex items-center gap-4 p-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                <ShoppingBag className="h-7 w-7 text-violet-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-0.5">حسابات جاهزة</p>
                <h2 className="text-xl font-black text-white">حسابات Free Fire</h2>
                <p className="text-sm text-white/60 mt-0.5">حسابات Premium أصلية بأفضل الأسعار</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-white/50 rotate-180" />
            </div>
            <div className="relative z-10 h-1.5 bg-gradient-to-r from-violet-500 via-purple-400 to-pink-500" />
          </div>
        </Link>

      </div>
    </div>
  );
}
