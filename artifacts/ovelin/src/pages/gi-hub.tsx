import { Link } from "wouter";
import { ArrowRight, ChevronLeft, Sparkles } from "lucide-react";

function StarRating({ value = 4.9 }: { value?: number }) {
  return (
    <span className="flex items-center gap-[1px]" aria-label={`${value} من 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 12 12" className="h-3 w-3">
          <polygon
            points="6,1 7.5,4.5 11,5 8.5,7.5 9.2,11 6,9 2.8,11 3.5,7.5 1,5 4.5,4.5"
            fill={i < Math.round(value) ? "#f59e0b" : "none"}
            stroke="#f59e0b"
            strokeWidth="0.8"
          />
        </svg>
      ))}
    </span>
  );
}

function HubCard({
  href,
  badge,
  icon,
  title,
  subtitle,
  accent,
}: {
  href: string;
  badge: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accent: string;
}) {
  return (
    <Link href={href}>
      <div className="flex flex-col overflow-hidden rounded-3xl shadow-[0_4px_20px_-4px_rgba(2,132,199,0.35)] ring-1 ring-sky-200/40 active:scale-[0.96] transition-transform duration-150 cursor-pointer">
        <div className={`relative aspect-[3/4] w-full overflow-hidden ${accent}`}>
          <img
            src="/games/genshin-impact.jpg"
            alt={title}
            className="absolute inset-0 h-full w-full object-cover object-top"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-sky-950/20 to-transparent" />
          <div className="absolute top-2 left-2 text-[8.5px] font-black text-white/60 tracking-[0.2em]">
            OVELIN MALL
          </div>
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white border border-white/30 backdrop-blur-sm">
            {icon}
            {badge}
          </div>
          <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
            <div className="font-extrabold text-[15px] leading-tight drop-shadow-lg">{title}</div>
            <div className="mt-0.5 flex items-center justify-between">
              <div className="text-[10.5px] font-semibold text-white/85">{subtitle}</div>
              <div className="rounded-full bg-white/95 text-sky-700 p-1 shadow-md">
                <ChevronLeft className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between bg-white px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <StarRating />
            <span className="text-[10px] text-gray-400 font-medium">4.9 من 5</span>
          </div>
          <div className="rounded-full bg-gradient-to-r from-sky-600 to-blue-800 p-1.5 shadow-md">
            <ChevronLeft className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function GenshinHub() {
  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-sky-950 via-cyan-950 to-black pb-12">
      <div className="relative overflow-hidden px-4 pt-12 pb-10 text-center">
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: "url(/games/genshin-impact.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-950/80 via-cyan-950/75 to-sky-950" />
        <div className="relative z-10">
          <Link href="/">
            <button className="absolute right-0 top-0 flex items-center gap-1 text-white/70 hover:text-white text-sm font-medium">
              <ArrowRight className="h-4 w-4" />
              رجوع
            </button>
          </Link>
          <img
            src="/games/genshin-impact.jpg"
            alt="Genshin Impact"
            className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover shadow-2xl shadow-sky-500/40 ring-2 ring-white/20"
          />
          <h1 className="text-4xl font-black tracking-widest text-white" style={{ textShadow: "0 0 24px rgba(56,189,248,0.7), 0 2px 10px rgba(0,0,0,0.6)" }}>
            GENSHIN IMPACT
          </h1>
          <p className="mt-1 text-sm font-semibold text-white/70">اختر ما تريد</p>
        </div>
      </div>

      <div className="mx-auto max-w-sm px-4 -mt-2">
        <div className="grid grid-cols-2 gap-3">
          <HubCard
            href="/game/genshin-impact"
            icon={<Sparkles className="h-3 w-3 text-amber-300" />}
            badge="GC"
            title="Genesis Crystals"
            subtitle="شحن مباشر على حسابك"
            accent="bg-gradient-to-br from-sky-800 via-cyan-900 to-black"
          />
        </div>
      </div>
    </div>
  );
}
