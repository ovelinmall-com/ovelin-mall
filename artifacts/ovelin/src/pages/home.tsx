// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Neon PostgreSQL
// postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  Users,
  ShoppingBag,
  CheckCircle2,
  Award,
  Search,
  Crown,
  Heart,
  Flame,
  Star,
  ChevronLeft,
  ChevronDown,
  Gamepad2,
  Crosshair,
  Swords,
  Joystick,
  Hammer,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import {
  SiApplemusic,
} from "react-icons/si";

type BrandIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetStatsOverview,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { OnlineBadge } from "@/components/OnlineBadge";
import { NotificationBell } from "@/components/NotificationBell";

type ServiceItem = {
  Icon?: BrandIcon | LucideIcon;
  imageUrl?: string;
  logoUrl?: string;
  bgImage?: string;
  brandColor?: string;
  name: string;
  hint: string;
  gradient: string;
  slug: string;
  showSocialEmojis?: boolean;
};

const HERO_SLIDES = [
  {
    image: `${import.meta.env.BASE_URL}hero/featured.png`,
    badge: "العروض المميزة",
    title: "أرقى الخدمات الرقمية",
    sub: "بأفضل الأسعار وأسرع تسليم",
    thanks: "شكراً لاختيارك OVELIN",
    icon: Star,
    href: "/categories",
    cta: "تسوّق الآن",
  },
  {
    image: `${import.meta.env.BASE_URL}hero/popular.png`,
    badge: "الأكثر طلباً",
    title: "خدمات أحبّها العملاء",
    sub: "آلاف الطلبات المكتملة",
    thanks: "شكراً لثقتك بنا",
    icon: TrendingUp,
    href: "/categories",
    cta: "اكتشف",
  },
  {
    image: `${import.meta.env.BASE_URL}hero/new.png`,
    badge: "وصل حديثاً",
    title: "خدمات جديدة فاخرة",
    sub: "تجربة لا تُنسى تنتظرك",
    thanks: "نسعد بخدمتك دائماً",
    icon: Sparkles,
    href: "/categories",
    cta: "جرّب الآن",
  },
  {
    image: `${import.meta.env.BASE_URL}hero/deal.png`,
    badge: "عرض اليوم",
    title: "خصومات حصرية",
    sub: "وفّر حتى 60% لفترة محدودة",
    thanks: "هدية خاصة لعملائنا",
    icon: Flame,
    href: "/flash",
    cta: "احجز الآن",
  },
];

function InlineCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(t);
  }, [paused]);

  const slide = HERO_SLIDES[index];
  const Icon = slide.icon;

  return (
    <div
      className="relative w-full h-[150px] rounded-2xl overflow-hidden ring-1 ring-white/30 shadow-inner"
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 2000)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          initial={{ x: "100%", opacity: 0.4 }}
          animate={{ x: "0%", opacity: 1 }}
          exit={{ x: "-100%", opacity: 0.4 }}
          transition={{ duration: 0.7, ease: [0.4, 0.0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <img
            src={slide.image}
            alt={slide.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-pink-950/85 via-pink-900/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-l from-pink-950/55 via-transparent to-transparent" />
          <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur-md border border-white/30 px-2 py-0.5 text-[9.5px] font-extrabold">
                <Icon className="w-2.5 h-2.5" />
                {slide.badge}
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 px-2 py-0.5 text-[9.5px] font-bold">
                <Heart className="w-2.5 h-2.5 text-rose-200 fill-rose-200" />
                {slide.thanks}
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-[15px] font-black leading-tight drop-shadow-lg">
                {slide.title}
              </h3>
              <p className="text-[11px] font-semibold opacity-95 drop-shadow mt-0.5">
                {slide.sub}
              </p>
              <Link
                href={slide.href}
                className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white text-pink-700 font-extrabold text-[10.5px] px-3 py-1 shadow active:scale-95 transition"
              >
                {slide.cta} <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1 z-10">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`slide ${i + 1}`}
            className="group p-1"
          >
            <span
              className={`block h-[3px] rounded-full transition-all duration-500 ${
                i === index
                  ? "w-5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  : "w-1.5 bg-white/50 group-hover:bg-white/80"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: number;
  label: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white/15 backdrop-blur p-3 text-white"
    >
      <Icon className="w-5 h-5 mb-1.5 opacity-90" />
      <div className="text-xl font-extrabold tabular-nums">
        {value.toLocaleString("ar-EG")}
      </div>
      <div className="text-[11px] opacity-85">{label}</div>
    </motion.div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="relative my-5 flex items-center">
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-pink-400/70 to-transparent" />
      <div className="relative mx-auto rounded-full bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 px-5 py-2 text-white text-sm font-black tracking-wide shadow-[0_10px_25px_-8px_rgba(190,24,93,0.55)] border border-white">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          {title}
          <Sparkles className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}

function MaintenanceModal({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex items-end justify-center p-4"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl"
        >
          {/* ── Header gradient ── */}
          <div
            className="relative overflow-hidden p-6 text-white text-center"
            style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 55%, #be185d 100%)" }}
          >
            {/* Glow orbs */}
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, #fff 0%, transparent 70%)", filter: "blur(18px)" }} />
            <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-15"
              style={{ background: "radial-gradient(circle, #fbbf24 0%, transparent 70%)", filter: "blur(14px)" }} />
            {/* Dot grid */}
            <div className="absolute inset-0 opacity-[0.07]" style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }} />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center active:scale-90 transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Animated hammer */}
            <motion.div
              animate={{ rotate: [0, -25, 12, -18, 6, -8, 0] }}
              transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
              className="relative inline-flex w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm items-center justify-center mx-auto mb-4 border border-white/30"
              style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)" }}
            >
              <Hammer className="w-9 h-9 text-white drop-shadow-lg" />
              {/* Spark particles */}
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300"
                  animate={{
                    x: [(i - 1) * 12, (i - 1) * 24],
                    y: [-8, -20],
                    opacity: [1, 0],
                    scale: [1, 0.3],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    repeatDelay: 3,
                    delay: i * 0.08,
                  }}
                />
              ))}
            </motion.div>

            <div className="font-black text-xl drop-shadow-sm">الخدمة تحت الصيانة</div>
            <div className="mt-1 text-white/85 text-sm font-bold">{name}</div>
          </div>

          {/* ── Body ── */}
          <div className="bg-white p-5">
            <div className="text-center mb-4">
              <p className="text-pink-900 font-bold text-sm leading-relaxed">
                نعمل حالياً على تطوير وتحسين هذه الخدمة
                <br />لنقدّم لك تجربة أفضل وأسرع
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-rose-500 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                ستعود الخدمة قريباً بإذن الله
              </div>
            </div>

            {/* Animated progress bar */}
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3.5 flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.22, ease: "easeInOut" }}
                    className="w-2 h-2 rounded-full bg-amber-500"
                  />
                ))}
              </div>
              <div className="text-amber-800 text-xs font-bold">جارٍ العمل على إعادة الخدمة...</div>
            </div>

            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-2xl py-3.5 font-extrabold text-white text-sm shadow-lg"
              style={{ background: "linear-gradient(135deg, #ec4899, #e11d48)" }}
            >
              حسناً، سأعود لاحقاً 👍
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ServiceCard({
  Icon,
  imageUrl,
  logoUrl,
  bgImage,
  brandColor,
  name,
  hint,
  gradient,
  tag,
  TagIcon,
  href,
  showSocialEmojis,
  inMaintenance = false,
}: {
  Icon?: BrandIcon | LucideIcon;
  imageUrl?: string;
  logoUrl?: string;
  bgImage?: string;
  brandColor?: string;
  name: string;
  hint: string;
  gradient: string;
  showSocialEmojis?: boolean;
  tag: string;
  TagIcon: typeof Star;
  href: string;
  inMaintenance?: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const inner = (
    <div className="flex flex-col">
      <motion.div
        whileTap={{ scale: 0.96, y: -8 }}
        className={`group relative w-full aspect-[3/4] overflow-hidden rounded-3xl shadow-[0_15px_40px_-12px_rgba(190,24,93,0.55)] ring-1 ring-pink-200/60 bg-gradient-to-br ${gradient}`}
      >
        {bgImage ? (
          <>
            {/* Full-bleed high-quality game image */}
            <img
              src={bgImage}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ imageRendering: "auto" }}
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
            />
            {/* Pink tint overlay for social cards */}
            {showSocialEmojis && (
              <div className="absolute inset-0 bg-pink-500/30 mix-blend-multiply pointer-events-none" />
            )}
            {/* Pink vignette at edges only — does NOT dim center */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(236,72,153,0.13) 65%, rgba(190,24,93,0.32) 88%, rgba(157,23,77,0.48) 100%)",
              }}
            />
            {/* Scattered social emoji circles */}
            {showSocialEmojis && (
              <>
                <div className="absolute top-[12%] left-[7%] w-9 h-9 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-lg shadow-md pointer-events-none select-none">❤️</div>
                <div className="absolute top-[30%] right-[5%] w-8 h-8 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-base shadow-md pointer-events-none select-none">👍</div>
                <div className="absolute top-[50%] left-[10%] w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm shadow-md pointer-events-none select-none">💬</div>
                <div className="absolute top-[18%] right-[22%] w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs shadow-md pointer-events-none select-none">✨</div>
                <div className="absolute top-[65%] right-[12%] w-9 h-9 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-lg shadow-md pointer-events-none select-none">🤩</div>
                <div className="absolute top-[42%] left-[28%] w-6 h-6 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-xs shadow-md pointer-events-none select-none">🔔</div>
              </>
            )}
          </>
        ) : Icon && brandColor ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -translate-y-3">
              <Icon
                className="w-[75%] h-[75%]"
                style={{ color: brandColor, opacity: 0.38 }}
              />
            </div>
          </>
        ) : logoUrl ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -translate-y-3">
              <img
                src={logoUrl}
                alt={name}
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                className="w-[75%] h-[75%] object-contain"
                style={{ opacity: 0.38 }}
              />
            </div>
          </>
        ) : imageUrl ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img
                src={imageUrl}
                alt={name}
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                className="w-[130%] h-[130%] object-contain opacity-20 -translate-y-2 scale-110"
                style={{ filter: "blur(0.5px)" }}
              />
            </div>
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} mix-blend-multiply opacity-40`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.28),transparent_55%)]" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img
                src={imageUrl}
                alt={name}
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                className="w-20 h-20 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.4)]"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
          </>
        ) : Icon ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Icon
                className="w-[150%] h-[150%] text-white opacity-25 -translate-y-2 scale-110"
                style={{ filter: "blur(0.4px)" }}
              />
            </div>
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} mix-blend-multiply opacity-40`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.28),transparent_55%)]" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Icon className="w-20 h-20 text-white/95 drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)]" />
            </div>
          </>
        ) : null}

        {/* Bottom gradient for text legibility (always shown) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

        <div className="absolute top-2 left-2 text-[8.5px] font-black text-white/60 tracking-[0.2em] select-none pointer-events-none drop-shadow">
          OVELIN
        </div>

        <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white border border-white/30">
          <TagIcon className="w-3 h-3" /> {tag}
        </div>

        <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
          <div className="font-extrabold text-[14px] leading-tight drop-shadow-lg line-clamp-1">
            {name}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-[10.5px] font-semibold text-white/90 line-clamp-1">
              {hint}
            </div>
            <div className="rounded-full bg-white/95 text-pink-700 p-1 shadow-md shrink-0">
              <ArrowLeft className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* ── Maintenance badge — شاكوش احترافي بدون ضبابية ── */}
        {inMaintenance && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="absolute top-2 left-2 z-20 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 border border-white/30"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              boxShadow: "0 4px 14px rgba(239,68,68,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            <motion.div
              animate={{ rotate: [0, -18, 10, -12, 4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
            >
              <Hammer className="w-3 h-3 text-white drop-shadow-sm" />
            </motion.div>
            <span className="text-[9px] font-black text-white tracking-wide drop-shadow-sm">صيانة</span>
          </motion.div>
        )}
      </motion.div>

      <div className="h-[5px] rounded-b-2xl bg-gradient-to-r from-pink-400 via-rose-500 to-pink-400 shadow-[0_4px_10px_-1px_rgba(236,72,153,0.55)]" />
      </div>
  );

  if (inMaintenance) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="w-full text-right cursor-pointer"
        >
          {inner}
        </button>
        {showModal && (
          <MaintenanceModal name={name} onClose={() => setShowModal(false)} />
        )}
      </>
    );
  }
  return <Link href={href}>{inner}</Link>;
}

function MoreCard({ href, onClick }: { href?: string; onClick?: () => void }) {
  const inner = (
    <motion.div
      whileTap={{ scale: 0.96 }}
      className="relative w-full aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-br from-pink-50 to-rose-100 border-2 border-dashed border-pink-400 shadow-md flex flex-col items-center justify-center text-pink-700"
    >
      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-1.5 shadow-md">
        {onClick ? (
          <ChevronDown className="w-6 h-6 text-pink-600" />
        ) : (
          <ChevronLeft className="w-6 h-6 text-pink-600" />
        )}
      </div>
      <div className="text-[13px] font-extrabold">عرض المزيد</div>
      <div className="text-[10.5px] text-pink-500 mt-0.5">اكتشف الكل</div>
    </motion.div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-right">
        {inner}
      </button>
    );
  }
  return <Link href={href ?? "/"}>{inner}</Link>;
}

function HorizontalRow({
  items,
  extraItems,
  href,
  showMore,
  expanded,
  onToggleMore,
  tag,
  TagIcon,
  maintenance = {},
}: {
  items: ServiceItem[];
  extraItems?: ServiceItem[];
  href?: string;
  showMore: boolean;
  expanded?: boolean;
  onToggleMore?: () => void;
  tag: string;
  TagIcon: typeof Star;
  maintenance?: Record<string, boolean>;
}) {
  return (
    <div className="px-5 pb-3">
      <div className="grid grid-cols-2 gap-4" dir="rtl">
        {items.map((it, i) => (
          <ServiceCard
            key={i}
            Icon={it.Icon}
            imageUrl={it.imageUrl}
            logoUrl={it.logoUrl}
            bgImage={it.bgImage}
            brandColor={it.brandColor}
            name={it.name}
            hint={it.hint}
            gradient={it.gradient}
            tag={tag}
            TagIcon={TagIcon}
            href={it.slug ? `/game/${it.slug}` : (href ?? "/")}
            showSocialEmojis={it.showSocialEmojis}
            inMaintenance={maintenance[it.slug] ?? false}
          />
        ))}
        <AnimatePresence>
          {expanded && extraItems?.map((it, i) => (
            <motion.div
              key={`extra-${i}`}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ delay: i * 0.06 }}
            >
              <ServiceCard
                Icon={it.Icon}
                imageUrl={it.imageUrl}
                logoUrl={it.logoUrl}
                bgImage={it.bgImage}
                brandColor={it.brandColor}
                name={it.name}
                hint={it.hint}
                gradient={it.gradient}
                tag={tag}
                TagIcon={TagIcon}
                href={it.slug ? `/game/${it.slug}` : (href ?? "/")}
                showSocialEmojis={it.showSocialEmojis}
                inMaintenance={maintenance[it.slug] ?? false}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        {showMore && !expanded && (
          <MoreCard
            href={href}
            onClick={onToggleMore}
          />
        )}
      </div>
    </div>
  );
}

const GRAD_GAMES = "from-rose-500 via-pink-500 to-pink-600";
const GRAD_SOCIAL = "from-pink-500 via-rose-500 to-pink-600";
const GRAD_SUBS = "from-pink-400 via-pink-500 to-rose-600";

const GAMES_FEATURED: ServiceItem[] = [
  { bgImage: `${import.meta.env.BASE_URL}games/pubg.jpg`,           name: "PUBG Mobile",    hint: "شدات UC",          gradient: GRAD_GAMES, slug: "pubg" },
  { bgImage: `${import.meta.env.BASE_URL}games/free-fire.jpg`,      name: "Free Fire",      hint: "جواهر",            gradient: GRAD_GAMES, slug: "free-fire" },
  { bgImage: `${import.meta.env.BASE_URL}games/cod.webp`,           name: "Call of Duty",   hint: "CP Points",        gradient: GRAD_GAMES, slug: "cod" },
  { bgImage: `${import.meta.env.BASE_URL}games/clash-of-clans.jpg`, name: "Clash of Clans", hint: "جواهر",            gradient: GRAD_GAMES, slug: "clash-of-clans" },
  { bgImage: `${import.meta.env.BASE_URL}games/clash-royale.jpg`,   name: "Clash Royale",   hint: "جواهر",            gradient: GRAD_GAMES, slug: "clash-royale" },
  { bgImage: `${import.meta.env.BASE_URL}games/mobile-legends.jpg`, name: "Mobile Legends", hint: "Diamond",          gradient: GRAD_GAMES, slug: "mobile-legends" },
  { bgImage: `${import.meta.env.BASE_URL}games/genshin-impact.jpg`, name: "Genshin Impact", hint: "Genesis Crystals", gradient: GRAD_GAMES, slug: "genshin-impact" },
];

const GAMES_EXTRA: ServiceItem[] = [
  {
    bgImage: `${import.meta.env.BASE_URL}games/fc-mobile.jpg`,
    name: "EA FC Mobile",
    hint: "FC Points • كرة القدم",
    gradient: "from-emerald-600 via-green-700 to-teal-800",
    slug: "fc-mobile",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}games/roblox.jpg`,
    name: "Roblox",
    hint: "Robux",
    gradient: "from-rose-600 via-red-700 to-rose-900",
    slug: "roblox",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}games/fortnite.jpg`,
    name: "Fortnite",
    hint: "V-Bucks",
    gradient: "from-blue-600 via-indigo-700 to-violet-800",
    slug: "fortnite",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}games/valorant.jpg`,
    name: "Valorant",
    hint: "VP Points",
    gradient: "from-rose-700 via-red-800 to-zinc-900",
    slug: "valorant",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}games/brawl-stars.jpg`,
    name: "Brawl Stars",
    hint: "Gems • Brawlers",
    gradient: "from-amber-500 via-orange-600 to-rose-700",
    slug: "brawl-stars",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}games/honor-of-kings.jpg`,
    name: "Honor of Kings",
    hint: "Tokens",
    gradient: "from-violet-700 via-purple-800 to-indigo-900",
    slug: "honor-of-kings",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}games/stumble-guys.jpg`,
    name: "Stumble Guys",
    hint: "Gems • Skins",
    gradient: "from-cyan-500 via-sky-600 to-blue-800",
    slug: "stumble-guys",
  },
];

const SOCIAL_FEATURED: ServiceItem[] = [
  { bgImage: `${import.meta.env.BASE_URL}social/facebook.jpg`,  name: "فيسبوك",   hint: "لايكات • متابعين",  gradient: GRAD_SOCIAL, slug: "facebook",  showSocialEmojis: true },
  { bgImage: `${import.meta.env.BASE_URL}social/instagram.jpg`, name: "انستغرام", hint: "متابعين • لايكات",  gradient: GRAD_SOCIAL, slug: "instagram", showSocialEmojis: true },
  { bgImage: `${import.meta.env.BASE_URL}social/snapchat.jpg`,  name: "سناب شات", hint: "متابعين • مشاهدات", gradient: GRAD_SOCIAL, slug: "snapchat",  showSocialEmojis: true },
  { bgImage: `${import.meta.env.BASE_URL}social/twitter.jpg`,   name: "تويتر / X", hint: "متابعين • ريتويت", gradient: GRAD_SOCIAL, slug: "twitter",   showSocialEmojis: true },
  { bgImage: `${import.meta.env.BASE_URL}social/tiktok.jpg`,    name: "تيك توك",  hint: "متابعين • قلوب",   gradient: GRAD_SOCIAL, slug: "tiktok",    showSocialEmojis: true },
];

const SUBS_FEATURED: ServiceItem[] = [
  { bgImage: `${import.meta.env.BASE_URL}subs/netflix.jpg`,  name: "Netflix",         hint: "اشتراك شهري",    gradient: GRAD_SUBS, slug: "netflix" },
  { bgImage: `${import.meta.env.BASE_URL}subs/shahid.jpg`,   name: "Shahid VIP",      hint: "اشتراك سنوي",    gradient: GRAD_SUBS, slug: "shahid-vip" },
  { bgImage: `${import.meta.env.BASE_URL}subs/spotify.jpg`,  name: "Spotify",         hint: "Premium",         gradient: GRAD_SUBS, slug: "spotify" },
  { bgImage: `${import.meta.env.BASE_URL}subs/youtube.jpg`,  name: "YouTube Premium", hint: "بدون إعلانات",   gradient: GRAD_SUBS, slug: "youtube-premium" },
  { bgImage: `${import.meta.env.BASE_URL}subs/chatgpt.jpg`,  name: "ChatGPT Plus",    hint: "GPT-4 + إضافات", gradient: GRAD_SUBS, slug: "chatgpt-plus" },
  { bgImage: `${import.meta.env.BASE_URL}subs/disney.jpg`,   name: "Disney+",         hint: "اشتراك عائلي",   gradient: GRAD_SUBS, slug: "disney-plus" },
  { Icon: SiApplemusic, brandColor: "#FA243C",               name: "Apple Music",     hint: "اشتراك شهري",    gradient: GRAD_SUBS, slug: "apple-music" },
];

const SUBS_EXTRA: ServiceItem[] = [
  {
    bgImage: `${import.meta.env.BASE_URL}subs/telegram.jpg`,
    name: "Telegram Premium",
    hint: "اشتراك مميز",
    gradient: "from-sky-500 via-blue-600 to-blue-800",
    slug: "telegram-premium",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}subs/canva.jpg`,
    name: "Canva Pro",
    hint: "تصميم احترافي",
    gradient: "from-violet-600 via-purple-700 to-fuchsia-800",
    slug: "canva-pro",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}subs/amazon.jpg`,
    name: "Amazon Prime",
    hint: "فيديو • توصيل",
    gradient: "from-sky-600 via-blue-700 to-indigo-800",
    slug: "amazon-prime",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}subs/microsoft.jpg`,
    name: "Microsoft 365",
    hint: "Office + Cloud",
    gradient: "from-orange-500 via-amber-600 to-yellow-700",
    slug: "microsoft-365",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}subs/anghami.jpg`,
    name: "Anghami",
    hint: "موسيقى عربية",
    gradient: "from-fuchsia-600 via-pink-700 to-rose-800",
    slug: "anghami",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}subs/osn.jpg`,
    name: "OSN+",
    hint: "رياضة • ترفيه",
    gradient: "from-zinc-700 via-slate-800 to-zinc-900",
    slug: "osn-plus",
  },
];

export default function Home() {
  const { user } = useAuth();
  const { data: stats } = useGetStatsOverview();
  const [gamesExpanded, setGamesExpanded] = useState(false);
  const [subsExpanded, setSubsExpanded] = useState(false);
  const { data: maintenance = {} } = useQuery<Record<string, boolean>>({
    queryKey: ["service-maintenance"],
    queryFn: () => fetch("/api/settings/service-maintenance").then((r) => r.json()),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return (
    <AppLayout>
      <div className="relative bg-gradient-to-l from-pink-700 via-rose-700 to-pink-800 text-white px-5 pt-3 pb-3">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="relative flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 active:scale-95 transition">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-white/40 blur-md" />
              <div className="relative p-[1.5px] rounded-xl bg-gradient-to-tr from-white/90 via-white/30 to-white/90">
                <div className="p-1.5 rounded-[10px] bg-gradient-to-br from-pink-800 to-rose-900 text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div className="leading-none">
              <div className="text-[8.5px] opacity-80 tracking-[0.2em] font-semibold">PREMIUM</div>
              <div className="font-black text-base tracking-tight bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
                OVELIN
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            {user && (
              <div className="rounded-full bg-white/15 backdrop-blur-md border border-white/30 p-1">
                <NotificationBell enabled={true} />
              </div>
            )}
            {user ? (
              <Link
                href="/account"
                className="flex items-center gap-1 text-[11px] bg-white/20 backdrop-blur-md border border-white/30 px-2 py-1 rounded-full font-bold active:scale-95 transition"
              >
                <Crown className="w-3 h-3 text-amber-200" />
                <span className="max-w-[70px] truncate">{user.username}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-[11px] bg-white text-pink-700 px-2.5 py-1 rounded-full font-extrabold shadow active:scale-95 transition"
              >
                تسجيل دخول
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 pb-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-tr from-pink-400/40 via-rose-300/30 to-pink-500/40 blur-md" />
          <div className="relative rounded-3xl bg-white p-6 text-center border-[2.5px] border-pink-200 shadow-[0_20px_45px_-15px_rgba(190,24,93,0.45),inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-pink-600" />
            </div>
            <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
              <Crown className="w-4 h-4 text-rose-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-pink-100 to-rose-100 border border-pink-300 px-3 py-1 text-[10.5px] font-extrabold text-pink-800 mb-3">
              <Star className="w-3 h-3 fill-pink-600 text-pink-600" />
              متجر فاخر للخدمات الرقمية
            </div>
            <h1 className="text-2xl font-black leading-tight text-pink-900">
              مرحباً بك في
              <span className="mx-1.5 bg-gradient-to-l from-pink-600 via-rose-600 to-pink-700 bg-clip-text text-transparent">
                OVELIN
              </span>
            </h1>
            <p className="mt-2 text-[13px] text-pink-900/75 leading-relaxed max-w-md mx-auto">
              وجهتك الأولى لكل ما تحتاجه على الإنترنت — رشق متابعين، بطاقات
              ألعاب، اشتراكات تطبيقات، USDT، وتصميم مواقع وبوتات. تسليم فوري،
              دعم 24/7، وأسعار لا تُقاوم.
            </p>
            <div className="mt-4 flex items-center justify-center">
              <Link
                href="/posts"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-pink-600 to-rose-600 text-white font-extrabold text-[13px] px-6 py-2.5 shadow-[0_10px_25px_-8px_rgba(190,24,93,0.6)] active:scale-95 transition"
              >
                تصفح المنشورات <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-4">
        <Link href="/categories">
          <motion.div whileTap={{ scale: 0.98 }} className="relative">
            <div className="absolute inset-0 rounded-2xl bg-pink-400/30 blur-lg" />
            <div className="fancy-card relative flex items-center gap-2.5 rounded-2xl px-3.5 py-3 shadow-[0_15px_35px_-10px_rgba(190,24,93,0.45)]">
              <div className="p-1.5 rounded-xl bg-gradient-to-br from-pink-600 to-rose-700 text-white">
                <Search className="w-4 h-4" />
              </div>
              <div className="flex-1 text-right">
                <div className="text-pink-400 text-[12.5px] font-semibold">
                  ابحث عن خدمة، رشق، USDT...
                </div>
              </div>
              <div className="text-[10px] font-bold text-pink-700 bg-pink-100 rounded-full px-2 py-0.5">
                +500
              </div>
            </div>
          </motion.div>
        </Link>
      </div>

      <div className="px-4 mt-3">
        <div className="rounded-3xl bg-gradient-to-br from-pink-600 via-rose-600 to-pink-700 p-3 shadow-[0_20px_45px_-12px_rgba(190,24,93,0.55)] relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-pink-300/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-rose-400/30 rounded-full blur-3xl" />
          <div className="relative">
            <InlineCarousel />
            <div className="grid grid-cols-3 gap-2 mt-3">
              <StatCard icon={Crown}         value={stats?.totalUsers ?? 0}     label="عضو مميّز" />
              <StatCard icon={ShoppingBag}   value={stats?.totalOrders ?? 0}    label="طلب منفّذ" />
              <StatCard icon={CheckCircle2}  value={stats?.totalDelivered ?? 0} label="تم تسليمه" />
            </div>
            <div className="mt-2.5 flex justify-center">
              <OnlineBadge />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4">
        <div className="fancy-card rounded-2xl p-3 grid grid-cols-3 divide-x divide-pink-100 text-center">
          <div className="px-2">
            <Zap className="w-5 h-5 text-pink-500 mx-auto" />
            <div className="text-[11px] font-bold mt-1 text-pink-900">تسليم فوري</div>
          </div>
          <div className="px-2">
            <ShieldCheck className="w-5 h-5 text-rose-500 mx-auto" />
            <div className="text-[11px] font-bold mt-1 text-pink-900">ضمان كامل</div>
          </div>
          <div className="px-2">
            <Award className="w-5 h-5 text-pink-500 mx-auto" />
            <div className="text-[11px] font-bold mt-1 text-pink-900">أرخص الأسعار</div>
          </div>
        </div>
      </div>

      {/* ===== Section: Games ===== */}
      <SectionTitle title="خدمات الألعاب" />
      <HorizontalRow
        items={GAMES_FEATURED}
        extraItems={GAMES_EXTRA}
        showMore
        expanded={gamesExpanded}
        onToggleMore={() => setGamesExpanded((v) => !v)}
        tag="تسليم فوري"
        TagIcon={Gamepad2}
        maintenance={maintenance}
      />

      {/* ===== Section: Social media boosting ===== */}
      <SectionTitle title="خدمات رشق السوشيل ميديا" />
      <HorizontalRow
        items={SOCIAL_FEATURED}
        showMore={false}
        tag="الأكثر طلباً"
        TagIcon={Star}
        maintenance={maintenance}
      />

      {/* ===== Section: App subscriptions ===== */}
      <SectionTitle title="اشتراكات التطبيقات" />
      <HorizontalRow
        items={SUBS_FEATURED}
        extraItems={SUBS_EXTRA}
        href="/subscriptions"
        showMore
        expanded={subsExpanded}
        onToggleMore={() => setSubsExpanded((v) => !v)}
        tag="أفضل سعر"
        TagIcon={Crown}
        maintenance={maintenance}
      />

      {/* Why us */}
      <div className="px-5 mt-7">
        <h2 className="text-lg font-extrabold text-pink-900 mb-3">
          لماذا OVELIN؟
        </h2>
        <div className="grid grid-cols-1 gap-2">
          {[
            { icon: Zap,        title: "تنفيذ خلال دقائق",  desc: "معظم الطلبات تُنفّذ خلال أقل من ساعة" },
            { icon: ShieldCheck, title: "خدمات آمنة 100%",   desc: "لا نطلب كلمات سر، فقط رابط حسابك" },
            { icon: Award,       title: "أسعار منافسة",       desc: "تخفيضات حصرية لكل أعضائنا" },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="fancy-card rounded-2xl p-3 flex items-center gap-3"
            >
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-pink-900">{title}</div>
                <div className="text-[11px] text-muted-foreground">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
