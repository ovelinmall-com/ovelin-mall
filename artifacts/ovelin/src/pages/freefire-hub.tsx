import { Link } from "wouter";
import { ArrowRight, Flame, ShoppingBag, ChevronLeft } from "lucide-react";

// نجوم التقييم — مطابقة لمكوّن الرئيسية
function StarRating({ value = 4.9 }: { value?: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.4;
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < full) return "full";
    if (i === full && hasHalf) return "full";
    return "empty";
  });
  return (
    <span className="flex items-center gap-[1px]">
      {stars.map((s, i) => (
        <svg key={i} viewBox="0 0 12 12" className="h-3 w-3">
          <polygon
            points="6,1 7.5,4.5 11,5 8.5,7.5 9.2,11 6,9 2.8,11 3.5,7.5 1,5 4.5,4.5"
            fill={s === "full" ? "#f59e0b" : "none"}
            stroke="#f59e0b"
            strokeWidth="0.8"
          />
        </svg>
      ))}
    </span>
  );
}

interface HubCardProps {
  href: string;
  image: string;
  badge: string;
  badgeIcon: React.ReactNode;
  title: string;
  subtitle: string;
  accentFrom: string;
  accentTo: string;
  rating?: number;
}

function HubCard({ href, image, badge, badgeIcon, title, subtitle, rating = 4.9 }: HubCardProps) {
  return (
    <Link href={href}>
      <div className="flex flex-col overflow-hidden rounded-3xl shadow-[0_4px_20px_-4px_rgba(190,24,93,0.35)] ring-1 ring-pink-200/40 active:scale-[0.96] transition-transform duration-150 cursor-pointer">

        {/* ── صورة full-bleed — نفس نمط كروت الرئيسية ── */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-br from-pink-900 via-rose-800 to-pink-950">
          <img
            src={image}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover object-top"
            loading="eager"
          />

          {/* vignette — نفس الرئيسية بالضبط */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(236,72,153,0.13) 65%, rgba(190,24,93,0.32) 88%, rgba(157,23,77,0.48) 100%)",
            }}
          />

          {/* gradient أسفل للنص */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

          {/* OVELIN MALL — أعلى يسار */}
          <div className="absolute top-2 left-2 text-[8.5px] font-black text-white/60 tracking-[0.2em] select-none pointer-events-none drop-shadow">
            OVELIN MALL
          </div>

          {/* نوع الخدمة — أعلى يمين */}
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white border border-white/30 backdrop-blur-sm">
            {badgeIcon}
            {badge}
          </div>

          {/* اسم الخدمة — أسفل */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
            <div className="font-extrabold text-[15px] leading-tight drop-shadow-lg line-clamp-1">
              {title}
            </div>
            <div className="mt-0.5 flex items-center justify-between">
              <div className="text-[10.5px] font-semibold text-white/85 line-clamp-1">{subtitle}</div>
              <div className="rounded-full bg-white/95 text-pink-700 p-1 shadow-md shrink-0">
                <ChevronLeft className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

        {/* ── شريط أبيض — نجوم + تقييم ── */}
        <div className="flex items-center justify-between bg-white px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <StarRating value={rating} />
            <span className="text-[10px] text-gray-400 font-medium">{rating} من 5</span>
          </div>
          <div className="rounded-full bg-gradient-to-r from-primary to-pink-500 p-1.5 shadow-md">
            <ChevronLeft className="h-3.5 w-3.5 text-white" />
          </div>
        </div>

      </div>
    </Link>
  );
}

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

      {/* الكارتين — grid مثل كروت الرئيسية */}
      <div className="mx-auto max-w-sm px-4 -mt-2">
        <div className="grid grid-cols-2 gap-3">

          <HubCard
            href="/game/free-fire"
            image="/games/free-fire.webp"
            badge="شحن فوري"
            badgeIcon={<Flame className="h-3 w-3 text-amber-300" />}
            title="جواهر Free Fire"
            subtitle="شحن مباشر على حسابك"
            accentFrom="from-rose-500"
            accentTo="to-pink-600"
            rating={4.9}
          />

          <HubCard
            href="/freefire-accounts"
            image="/games/free-fire.webp"
            badge="حسابات"
            badgeIcon={<ShoppingBag className="h-3 w-3 text-violet-300" />}
            title="حسابات Free Fire"
            subtitle="Premium أصلية"
            accentFrom="from-violet-600"
            accentTo="to-purple-700"
            rating={4.9}
          />

        </div>
      </div>

    </div>
  );
}
