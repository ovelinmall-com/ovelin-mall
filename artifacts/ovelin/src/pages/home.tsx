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
import { useEffect, useState, useCallback, memo } from "react";
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
  X,
  Globe,
  MessageCircle,
  Phone,
  Clock,
  Target,
  Rocket,
  Lock,
  BadgeCheck,
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
import { SearchBar } from "@/components/SearchBar";

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
  customHref?: string;
  showSocialEmojis?: boolean;
  priceTier?: "cheap" | "medium" | "expensive";
};

const HERO_SLIDES = [
  {
    image: `${import.meta.env.BASE_URL}hero/featured.webp`,
    badge: "العروض المميزة",
    title: "أرقى الخدمات الرقمية",
    sub: "بأفضل الأسعار وأسرع تسليم",
    thanks: "شكراً لاختيارك OVELIN MALL",
    icon: Star,
    href: "/categories",
    cta: "تسوّق الآن",
  },
  {
    image: `${import.meta.env.BASE_URL}hero/popular.webp`,
    badge: "الأكثر طلباً",
    title: "خدمات أحبّها العملاء",
    sub: "آلاف الطلبات المكتملة",
    thanks: "شكراً لثقتك بنا",
    icon: TrendingUp,
    href: "/categories",
    cta: "اكتشف",
  },
  {
    image: `${import.meta.env.BASE_URL}hero/new.webp`,
    badge: "وصل حديثاً",
    title: "خدمات جديدة فاخرة",
    sub: "تجربة لا تُنسى تنتظرك",
    thanks: "نسعد بخدمتك دائماً",
    icon: Sparkles,
    href: "/categories",
    cta: "جرّب الآن",
  },
  {
    image: `${import.meta.env.BASE_URL}hero/deal.webp`,
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
      {/* FIX #2: Simplified to opacity-only cross-fade — x-translation forces composite repaint,
          duration 0.7s → 0.25s, no spring physics */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "linear" }}
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
              {/* FIX #2: Removed backdrop-blur-md from carousel badges — GPU blur inside animated slide */}
              <div className="inline-flex items-center gap-1 rounded-full bg-white/30 border border-white/30 px-2 py-0.5 text-[9.5px] font-extrabold">
                <Icon className="w-2.5 h-2.5" />
                {slide.badge}
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/25 border border-white/30 px-2 py-0.5 text-[9.5px] font-bold">
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

const StatCard = memo(function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: number;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 text-white">
      <Icon className="w-5 h-5 mb-1.5 opacity-90" />
      <div className="text-xl font-extrabold tabular-nums">
        {value.toLocaleString("ar-EG")}
      </div>
      <div className="text-[11px] opacity-85">{label}</div>
    </div>
  );
});

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
        className="fixed inset-0 z-[999] flex items-end justify-center p-4 pb-6"
        style={{ background: "rgba(15,5,25,0.75)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-[2rem] overflow-hidden shadow-[0_32px_80px_-12px_rgba(190,24,93,0.5)]"
          style={{ border: "1px solid rgba(244,114,182,0.25)" }}
        >
          {/* ── Header ── */}
          <div
            className="relative overflow-hidden px-6 pt-7 pb-6 text-white text-center"
            style={{
              background:
                "linear-gradient(145deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)",
            }}
          >
            {/* Glow orbs */}
            <div
              className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle, #fda4af 0%, transparent 70%)", filter: "blur(20px)" }}
            />
            <div
              className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full opacity-15 pointer-events-none"
              style={{ background: "radial-gradient(circle, #fb7185 0%, transparent 70%)", filter: "blur(16px)" }}
            />
            {/* Dot grid */}
            <div
              className="absolute inset-0 opacity-[0.07] pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }}
            />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 left-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition"
              style={{ border: "1px solid rgba(255,255,255,0.3)" }}
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Hammer × Screwdriver — crossed X */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 mx-auto mb-4">
              <span
                className="absolute text-[38px] select-none"
                style={{
                  transform: "rotate(-45deg)",
                  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.40))",
                }}
              >🔨</span>
              <span
                className="absolute text-[34px] select-none"
                style={{
                  transform: "rotate(45deg)",
                  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.40))",
                }}
              >🪛</span>
            </div>

            <div className="font-black text-[1.2rem] leading-tight drop-shadow-sm tracking-tight">
              الخدمة تحت الصيانة
            </div>
            <div
              className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-sm font-bold"
              style={{ background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {name}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="p-5 space-y-4 bg-white">
            {/* Message */}
            <div className="text-center">
              <p className="text-pink-900 font-bold text-sm leading-relaxed">
                نعمل حالياً على تطوير وتحسين هذه الخدمة
                <br />لنقدّم لك تجربة أفضل وأسرع
              </p>
            </div>

            {/* Progress indicator */}
            <div className="rounded-2xl p-3.5 flex items-center gap-3 bg-white border border-pink-100">
              <div className="flex items-center gap-1 shrink-0">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.15, 0.7] }}
                    transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.22, ease: "easeInOut" }}
                    className="w-2 h-2 rounded-full bg-pink-500"
                  />
                ))}
              </div>
              <div className="text-pink-800 text-xs font-bold">جارٍ العمل على إعادة الخدمة...</div>
            </div>

            {/* Coming soon badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-extrabold text-pink-700 bg-white border border-pink-200">
                <Sparkles className="w-3 h-3" />
                ستعود الخدمة قريباً بإذن الله
              </div>
            </div>

            {/* CTA button */}
            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-2xl py-3.5 font-extrabold text-white text-sm shadow-[0_8px_22px_-4px_rgba(244,63,94,0.4)]"
              style={{ background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)" }}
            >
              حسناً، سأعود لاحقاً
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const TIER_LABEL: Record<string, string> = { cheap: "💰 رخيص", medium: "💵 متوسط", expensive: "💎 غالي" };
const TIER_BG: Record<string, string> = { cheap: "rgba(34,197,94,0.85)", medium: "rgba(245,158,11,0.85)", expensive: "rgba(239,68,68,0.85)" };

function StarRating({ value }: { value: number }) {
  // يعرض نجوم SVG بدقة نصف نجمة
  return (
    <span className="flex items-center gap-[1px]">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = value >= i + 1 ? 1 : value >= i + 0.5 ? 0.5 : 0;
        return (
          <svg key={i} viewBox="0 0 12 12" className="h-3 w-3">
            <defs>
              <linearGradient id={`hg-${i}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset={`${filled * 100}%`} stopColor="#f59e0b" />
                <stop offset={`${filled * 100}%`} stopColor="transparent" />
              </linearGradient>
            </defs>
            <polygon
              points="6,1 7.5,4.5 11,5 8.5,7.5 9.2,11 6,9 2.8,11 3.5,7.5 1,5 4.5,4.5"
              fill={filled === 1 ? "#f59e0b" : filled === 0.5 ? `url(#hg-${i})` : "none"}
              stroke="#f59e0b"
              strokeWidth="0.8"
            />
          </svg>
        );
      })}
    </span>
  );
}

const ServiceCard = memo(function ServiceCard({
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
  priceTier,
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
  priceTier?: "cheap" | "medium" | "expensive";
}) {
  const [showModal, setShowModal] = useState(false);
  const inner = (
    <div className="flex flex-col">
      {/* FIX #4: Replaced framer-motion whileTap with CSS active: — JS animation → GPU CSS transform */}
      <div
        className={`group relative z-10 w-full aspect-[3/4] overflow-hidden rounded-3xl shadow-[0_4px_16px_-4px_rgba(190,24,93,0.30)] ring-1 ring-pink-200/60 bg-gradient-to-br ${gradient} active:scale-[0.96] active:-translate-y-1 transition-transform duration-150`}
      >
        {bgImage ? (
          <>
            {showSocialEmojis ? (
              /* Social media card — 3D app-icon style, rounded square, no white border */
              <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: "30%" }}>
                <div className="w-[62%] h-[62%] rounded-[22%] overflow-hidden shadow-[0_10px_28px_rgba(0,0,0,0.22)] ring-1 ring-black/5">
                  {/* eager: منع الفراغات البيضاء أثناء التمرير السريع */}
                  <img
                    src={bgImage}
                    alt={name}
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                  />
                </div>
              </div>
            ) : (
              /* Game / subscription card — full-bleed photo */
              <>
                <img
                  src={bgImage}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  style={{ imageRendering: "auto" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                />
                {/* Pink vignette at edges */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 50%, transparent 38%, rgba(236,72,153,0.13) 65%, rgba(190,24,93,0.32) 88%, rgba(157,23,77,0.48) 100%)",
                  }}
                />
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
              />
            </div>
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-30`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.20),transparent_55%)]" />
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
              />
            </div>
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-30`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.20),transparent_55%)]" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Icon className="w-20 h-20 text-white/95 drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)]" />
            </div>
          </>
        ) : null}

        {/* Bottom gradient for text legibility (always shown) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

        {/* Pulsing pink stars — فقط لكروت السوشيل ميديا */}
        {showSocialEmojis && (
          <>
            <span className="card-star card-star-1">★</span>
            <span className="card-star card-star-2">✦</span>
            <span className="card-star card-star-3">★</span>
            <span className="card-star card-star-4">✦</span>
            <span className="card-star card-star-5">★</span>
          </>
        )}

        {!showSocialEmojis && (
          <div className="absolute top-2 left-2 text-[8.5px] font-black text-white/60 tracking-[0.2em] select-none pointer-events-none drop-shadow">
            OVELIN MALL
          </div>
        )}

        {showSocialEmojis ? (
          <div className="absolute top-2.5 right-2.5 select-none pointer-events-none">
            <span className="text-[8.5px] font-black text-rose-700/70 tracking-[0.22em]">OVELIN</span>
          </div>
        ) : (
          <div className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold text-white border border-white/30">
            <TagIcon className="w-3 h-3" /> {tag}
          </div>
        )}

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

        {/* ── Maintenance overlay ── */}
        {inMaintenance && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none gap-3">
            {/* بدون ضبابية — overlay بسيط */}
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.48)" }} />

            {/* X shape: مرقة × مفط */}
            <div className="relative z-10 flex items-center justify-center" style={{ width: 76, height: 76 }}>
              {/* المرقة — الذراع اليسرى للـ X */}
              <span
                className="absolute text-[40px] leading-none select-none"
                style={{
                  transform: "rotate(-45deg)",
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))",
                }}
              >🔧</span>
              {/* المفط — الذراع اليمنى للـ X */}
              <span
                className="absolute text-[36px] leading-none select-none"
                style={{
                  transform: "rotate(45deg)",
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.9))",
                }}
              >🪛</span>
            </div>

            <div
              className="relative z-10 px-3.5 py-1 rounded-full text-[10px] font-black text-white"
              style={{
                background: "rgba(0,0,0,0.55)",
                border: "1px solid rgba(255,255,255,0.30)",
                letterSpacing: "0.14em",
              }}
            >
              تحت الصيانة
            </div>
          </div>
        )}
      </div>

      {/* شريط التقييم الأبيض */}
      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-b-3xl shadow-[0_4px_12px_-2px_rgba(190,24,93,0.18)]">
        <div className="flex flex-col gap-0.5">
          <StarRating value={4.5} />
          <span className="text-[9px] text-gray-400 font-medium">4.5 من 5</span>
        </div>
        <div className="rounded-full bg-gradient-to-r from-primary to-pink-500 p-1.5 shadow-md">
          <ArrowLeft className="h-3 w-3 text-white" />
        </div>
      </div>
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
});

const MoreCard = memo(function MoreCard({ href, onClick }: { href?: string; onClick?: () => void }) {
  const inner = (
    // FIX #4: CSS active:scale instead of framer-motion whileTap
    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-3xl bg-gradient-to-br from-white to-rose-100 border-2 border-dashed border-pink-400 shadow-md flex flex-col items-center justify-center text-pink-700 active:scale-[0.96] transition-transform duration-150">
      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-1.5 shadow-md">
        {onClick ? (
          <ChevronDown className="w-6 h-6 text-pink-600" />
        ) : (
          <ChevronLeft className="w-6 h-6 text-pink-600" />
        )}
      </div>
      <div className="text-[13px] font-extrabold">عرض المزيد</div>
      <div className="text-[10.5px] text-pink-500 mt-0.5">اكتشف الكل</div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-right">
        {inner}
      </button>
    );
  }
  return <Link href={href ?? "/"}>{inner}</Link>;
});

const HorizontalRow = memo(function HorizontalRow({
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
            href={it.customHref ?? (it.slug ? `/game/${it.slug}` : (href ?? "/"))}
            showSocialEmojis={it.showSocialEmojis}
            inMaintenance={maintenance[it.slug] ?? false}
            priceTier={it.priceTier}
          />
        ))}
        <AnimatePresence>
          {expanded && extraItems?.map((it, i) => (
            <motion.div
              key={`extra-${i}`}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
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
                href={it.customHref ?? (it.slug ? `/game/${it.slug}` : (href ?? "/"))}
                showSocialEmojis={it.showSocialEmojis}
                inMaintenance={maintenance[it.slug] ?? false}
                priceTier={it.priceTier}
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
});

const GRAD_GAMES = "from-pink-500 via-pink-500 to-pink-600";
const GRAD_SOCIAL = "from-white via-pink-100 to-fuchsia-50";
const GRAD_SUBS = "from-pink-400 via-pink-500 to-rose-600";

const GAMES_FEATURED: ServiceItem[] = [
  { bgImage: `${import.meta.env.BASE_URL}games/pubg.jpg`,           name: "PUBG Mobile",    hint: "شدات UC",          gradient: GRAD_GAMES, slug: "pubg", customHref: "/game/pubg" },
  { bgImage: `${import.meta.env.BASE_URL}games/free-fire.webp`,     name: "Free Fire",      hint: "جواهر",            gradient: GRAD_GAMES, slug: "free-fire", customHref: "/freefire" },
  { bgImage: `${import.meta.env.BASE_URL}games/cod.webp`,           name: "Call of Duty",   hint: "CP Points",        gradient: GRAD_GAMES, slug: "cod" },
  { bgImage: `${import.meta.env.BASE_URL}games/clash-of-clans.jpg`, name: "Clash of Clans", hint: "جواهر",            gradient: GRAD_GAMES, slug: "clash-of-clans" },
  { bgImage: `${import.meta.env.BASE_URL}games/clash-royale.jpg`,   name: "Clash Royale",   hint: "جواهر",            gradient: GRAD_GAMES, slug: "clash-royale" },
  { bgImage: `${import.meta.env.BASE_URL}games/mobile-legends.webp`, name: "Mobile Legends", hint: "Diamond",          gradient: GRAD_GAMES, slug: "mobile-legends" },
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
    bgImage: `${import.meta.env.BASE_URL}games/fortnite.webp`,
    name: "Fortnite",
    hint: "V-Bucks",
    gradient: "from-blue-600 via-indigo-700 to-violet-800",
    slug: "fortnite",
  },
  {
    bgImage: `${import.meta.env.BASE_URL}games/valorant.webp`,
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
  { bgImage: `${import.meta.env.BASE_URL}social/facebook.jpg`,  name: "فيسبوك",   hint: "لايكات • متابعين",  gradient: GRAD_SOCIAL, slug: "facebook",  showSocialEmojis: true, priceTier: "cheap" },
  { bgImage: `${import.meta.env.BASE_URL}social/instagram.jpg`, name: "انستغرام", hint: "متابعين • لايكات",  gradient: GRAD_SOCIAL, slug: "instagram", showSocialEmojis: true, priceTier: "medium" },
  { bgImage: `${import.meta.env.BASE_URL}social/tiktok.jpg`,    name: "تيك توك",  hint: "متابعين • قلوب",   gradient: GRAD_SOCIAL, slug: "tiktok",    showSocialEmojis: true, priceTier: "cheap" },
  { bgImage: `${import.meta.env.BASE_URL}social/youtube.jpg`,   name: "يوتيوب",   hint: "مشاهدات • لايكات", gradient: GRAD_SOCIAL, slug: "youtube",  showSocialEmojis: true, priceTier: "expensive" },
  { bgImage: `${import.meta.env.BASE_URL}social/telegram.jpg`,  name: "تيليغرام", hint: "متابعين • تعليقات", gradient: GRAD_SOCIAL, slug: "telegram", showSocialEmojis: true, priceTier: "cheap" },
  { bgImage: `${import.meta.env.BASE_URL}social/twitter.jpg`,   name: "تويتر / X", hint: "متابعين • ريتويت", gradient: GRAD_SOCIAL, slug: "twitter",   showSocialEmojis: true, priceTier: "medium" },
  { bgImage: `${import.meta.env.BASE_URL}social/snapchat.jpg`,  name: "سناب شات", hint: "متابعين • مشاهدات", gradient: GRAD_SOCIAL, slug: "snapchat",  showSocialEmojis: true, priceTier: "medium" },
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

/* ═══════════════════════════════════════════════
   كرت "من نحن" — About Us
═══════════════════════════════════════════════ */
const STATS = [
  { value: "+٥٠٠٠", label: "عميل نشط" },
  { value: "+٣٠٠٠٠", label: "طلب مُنجز" },
  { value: "<٥ دق", label: "متوسط التنفيذ" },
  { value: "٢٤/٧", label: "دعم فوري" },
];

const VALUES = [
  {
    icon: Rocket,
    title: "سرعة لا مثيل لها",
    desc: "نُنفّذ طلبك في دقائق — لأن وقتك أثمن من أي شيء.",
    color: "from-pink-500 to-pink-600",
  },
  {
    icon: Lock,
    title: "أمان من الدرجة الأولى",
    desc: "بنية تحتية مشفّرة بالكامل، لا نحتفظ بأي بيانات حساسة.",
    color: "from-indigo-500 to-violet-600",
  },
  {
    icon: BadgeCheck,
    title: "ضمان الجودة",
    desc: "كل خدمة تمرّ بفحص دقيق قبل التسليم — لا مساومة على الجودة.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Target,
    title: "أسعار استراتيجية",
    desc: "نُفاوض الموردين بحجم شراء ضخم لنُقدّم لك السعر الأمثل دائماً.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Globe,
    title: "تغطية شاملة",
    desc: "خدمات رقمية لكل منصة — ألعاب، موسيقى، مشاهدة، واتصال.",
    color: "from-sky-500 to-blue-600",
  },
  {
    icon: Heart,
    title: "مجتمع حقيقي",
    desc: "أكثر من ٥٠٠٠ عميل يثقون بنا يومياً — ثقتهم هي معيار نجاحنا.",
    color: "from-pink-500 to-rose-600",
  },
];

function AboutUsCard_DELETED() {
  return (
    <motion.div
      dir="rtl"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="mx-4 mt-10 mb-6"
    >
      {/* ── Header ── */}
      <div
        className="relative rounded-3xl overflow-hidden p-6 text-white"
        style={{
          background:
            "radial-gradient(ellipse at 70% 20%, #c4025e 0%, #7c003c 50%, #2e0018 100%)",
        }}
      >
        {/* shimmer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.09) 0%, transparent 60%)",
          }}
        />
        {/* decorative circles */}
        <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-pink-400/10" />

        <div className="relative flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-white/30 blur-md" />
            <img
              src={`${import.meta.env.BASE_URL}icon-192.png`}
              alt="Ovelin Mall"
              className="relative w-12 h-12 rounded-2xl shadow-xl"
            />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.3em] font-semibold opacity-80">
              PREMIUM DIGITAL MARKETPLACE
            </div>
            <div
              className="font-black text-xl tracking-wide"
              style={{ textShadow: "0 0 20px rgba(255,120,200,0.6)" }}
            >
              OVELIN MALL
            </div>
          </div>
          <div className="mr-auto flex items-center gap-1 bg-white/15 backdrop-blur-sm border border-white/20 px-2.5 py-1 rounded-full text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            نشط الآن
          </div>
        </div>

        <p
          className="text-[13px] leading-relaxed font-medium"
          style={{ color: "rgba(255,220,240,0.92)" }}
        >
          نُعيد تعريف تجربة الشراء الرقمي في السودان.
          منصة مبنية على أُسس التكنولوجيا المتقدمة، تجمع بين سرعة التنفيذ الفوري
          وأمان من مستوى المؤسسات — كل ذلك بأسعار تُحدّ المنافسين.
          <span className="text-pink-200 font-bold">
            {" "}لأنك تستحق أفضل تجربة دون أي تنازلات.
          </span>
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center bg-white/10 rounded-2xl py-2.5 px-1 border border-white/15"
            >
              <div className="font-black text-base text-white leading-tight">{s.value}</div>
              <div className="text-[9px] text-pink-200 font-semibold mt-0.5 text-center leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mission statement ── */}
      <div className="mt-3 rounded-3xl bg-gradient-to-br from-white to-white border border-pink-100 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="font-extrabold text-sm text-pink-900">رسالتنا</div>
        </div>
        <p className="text-[12px] leading-relaxed text-gray-700 font-medium">
          نؤمن أن الخدمات الرقمية يجب أن تكون في متناول الجميع —
          سريعة، آمنة، وبسعر عادل. لذلك بنينا منصة لا تُقارَن،
          تعمل على مدار الساعة، مدعومة بفريق بشري متخصص وأنظمة
          ذكاء اصطناعي للرصد والتنفيذ الفوري.
        </p>
      </div>

      {/* ── Values grid ── */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {VALUES.map((v) => (
          <div
            key={v.title}
            className="fancy-card rounded-2xl p-3 space-y-1.5"
          >
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${v.color} flex items-center justify-center text-white shadow`}>
              <v.icon className="w-4 h-4" />
            </div>
            <div className="font-extrabold text-[12px] text-pink-900 leading-tight">{v.title}</div>
            <div className="text-[10px] text-muted-foreground leading-relaxed">{v.desc}</div>
          </div>
        ))}
      </div>

      {/* ── CEO Quote ── */}
      <div
        className="mt-3 rounded-3xl p-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a0010 0%, #3d0022 100%)",
        }}
      >
        <div className="absolute top-3 right-4 text-6xl font-black text-white/5 leading-none select-none">
          "
        </div>
        <div className="relative">
          <div className="text-[11px] text-pink-300 font-bold mb-2 tracking-wider">
            ✦ كلمة المؤسس
          </div>
          <p className="text-[12px] leading-relaxed text-white/85 font-medium italic">
            "بنيت أوفلين مول من الصفر بهدف واحد: أن يحصل كل شخص في السودان
            على الخدمات الرقمية التي يستحقها بنفس جودة العالم، بأسعار تُناسب جيبه.
            هذه ليست مجرد منصة — هي وعد يومي نلتزم به مع كل عميل."
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center text-white text-xs font-black">
              O
            </div>
            <div>
              <div className="text-white text-[11px] font-extrabold">فريق Ovelin Mall</div>
              <div className="text-pink-400 text-[9px]">المؤسسون • ٢٠٢٤</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact / Social ── */}
      <div className="mt-3 rounded-3xl fancy-card border border-pink-100 p-4 space-y-3">
        <div className="font-extrabold text-sm text-pink-900 flex items-center gap-2">
          <Phone className="w-4 h-4 text-pink-500" />
          تواصل معنا
        </div>
        <div className="grid grid-cols-2 gap-2">
          <a
            href="/support/new"
            className="flex items-center gap-2 bg-gradient-to-l from-emerald-500 to-teal-600 text-white rounded-2xl px-3 py-2.5 text-[11px] font-extrabold active:scale-95 transition"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>فتح تذكرة دعم</span>
          </a>
          <a
            href="/help"
            className="flex items-center gap-2 bg-gradient-to-l from-pink-500 to-rose-600 text-white rounded-2xl px-3 py-2.5 text-[11px] font-extrabold active:scale-95 transition"
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>مركز المساعدة</span>
          </a>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3 shrink-0 text-pink-400" />
          فريق الدعم متاح ٢٤ ساعة — ٧ أيام في الأسبوع بدون انقطاع
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-4 flex flex-col items-center gap-1.5 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md overflow-hidden shadow">
            <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" className="w-full h-full object-cover" />
          </div>
          <span className="font-black text-xs text-pink-800 tracking-widest">OVELIN MALL</span>
        </div>
        <div className="text-[9.5px] text-muted-foreground text-center leading-relaxed">
          المتجر الرقمي الرائد في السودان · شحن فوري ٢٤/٧<br />
          © {new Date().getFullYear()} Ovelin Mall · جميع الحقوق محفوظة
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span className="text-[9px] text-emerald-600 font-semibold">منصة آمنة ومُرخَّصة</span>
        </div>
      </div>
    </motion.div>
  );
}

function AboutAccordion() {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-5 mt-4" dir="rtl">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 fancy-card rounded-2xl px-4 py-3 active:scale-[0.99] transition"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-sm text-pink-900">من نحن؟</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="w-4 h-4 text-pink-500" />
        </motion.div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="about-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-3xl overflow-hidden border border-pink-100 shadow-sm">
              {/* Header band */}
              <div
                className="relative px-5 py-5 text-white overflow-hidden"
                style={{ background: "linear-gradient(145deg, #f43f5e 0%, #e11d48 55%, #be123c 100%)" }}
              >
                <div className="absolute inset-0 opacity-[0.07]" style={{
                  backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
                  backgroundSize: "14px 14px",
                }} />
                {/* FIX: Replaced blur-2xl with radial gradient — no GPU compositing layer needed */}
                <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)" }} />
                <p className="relative text-[13px] leading-relaxed font-medium text-white/95">
                  نُعيد تعريف تجربة الشراء الرقمي في السودان والعالم العربي. منصة مبنية على أسس التكنولوجيا المتقدمة، تجمع بين سرعة التنفيذ الفوري وأمان من مستوى المؤسسات — كل ذلك بأسعار تُحدّ المنافسين.
                  <span className="font-bold"> لأنك تستحق أفضل تجربة دون أي تنازلات.</span>
                </p>
              </div>

              {/* Mission */}
              <div className="bg-white/60 px-5 py-4 border-t border-pink-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-400 to-pink-500 flex items-center justify-center text-white">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span className="font-extrabold text-sm text-pink-900">رسالتنا</span>
                </div>
                <p className="text-[12px] leading-relaxed text-pink-900/80 font-medium">
                  نؤمن أن الخدمات الرقمية يجب أن تكون في متناول الجميع — سريعة، آمنة، وبسعر عادل. لذلك بنينا منصة لا تُقارَن، تعمل على مدار الساعة، مدعومة بفريق بشري متخصص وأنظمة ذكاء اصطناعي للرصد والتنفيذ الفوري.
                </p>
              </div>

              {/* Founder quote */}
              <div
                className="px-5 py-4 border-t border-pink-100 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #ffffff 0%, #fff 100%)" }}
              >
                <div className="absolute top-2 right-4 text-5xl font-black text-pink-100 leading-none select-none">"</div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white">
                    <Crown className="w-3 h-3" />
                  </div>
                  <span className="font-extrabold text-sm text-pink-900">كلمة المؤسس</span>
                </div>
                <p className="text-[12px] leading-relaxed text-pink-900/75 font-medium italic relative">
                  "بنيت أوفلين مول من الصفر بهدف واحد: أن يحصل كل شخص في السودان والعالم العربي على الخدمات الرقمية التي يستحقها بنفس جودة العالم، بأسعار تُناسب جيبه. هذه ليست مجرد منصة — هي وعد يومي نلتزم به مع كل عميل."
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xs font-black">O</div>
                  <div>
                    <div className="text-pink-900 text-[11px] font-extrabold">فريق Ovelin Mall</div>
                    <div className="text-pink-400 text-[9px]">المؤسسون • ٢٠٢٤</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { data: stats } = useGetStatsOverview();
  const [gamesExpanded, setGamesExpanded] = useState(false);
  const [subsExpanded, setSubsExpanded] = useState(false);
  const toggleGames = useCallback(() => setGamesExpanded((v) => !v), []);
  const toggleSubs = useCallback(() => setSubsExpanded((v) => !v), []);
  const { data: maintenance = {} } = useQuery<Record<string, boolean>>({
    queryKey: ["service-maintenance"],
    queryFn: () => fetch("/api/settings/service-maintenance").then((r) => r.json()),
    staleTime: 120_000,
    refetchInterval: 300_000,
  });

  return (
    <AppLayout>
      <div className="relative bg-gradient-to-l from-pink-700 via-rose-700 to-pink-800 text-white px-5 pt-3 pb-3">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="relative flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 active:scale-95 transition">
            {/* FIX #8: Removed blur-md (GPU filter on every page). Replaced with shadow on wrapper. */}
            <div className="relative">
              <img
                src={`${import.meta.env.BASE_URL}icon-192.png`}
                alt="Ovelin"
                className="w-9 h-9 rounded-xl object-cover block shadow-[0_0_10px_3px_rgba(255,255,255,0.40)]"
              />
            </div>
            <div className="leading-none">
              <div className="text-[8.5px] opacity-80 tracking-[0.2em] font-semibold">PREMIUM</div>
              <div className="font-black text-base tracking-tight bg-gradient-to-r from-white via-pink-100 to-white bg-clip-text text-transparent">
                OVELIN MALL
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            {/* FIX: Removed backdrop-blur-md from header buttons — always-on GPU blur on every page */}
            {user && (
              <div className="rounded-full bg-white/25 border border-white/30 p-1">
                <NotificationBell enabled={true} />
              </div>
            )}
            {user ? (
              <Link
                href="/account"
                className="flex items-center gap-1 text-[11px] bg-white/25 border border-white/30 px-2 py-1 rounded-full font-bold active:scale-95 transition"
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
                OVELIN MALL
              </span>
            </h1>
            <p className="mt-2 text-[13px] text-pink-900/75 leading-relaxed max-w-md mx-auto">
              متجرك الرقمي الأول — من شحن الألعاب إلى خدمات زيادة المتابعين
              ورشق السوشيل ميديا، من الاشتراكات إلى USDT. Ovelin Mall وجهتك
              الأولى. تسليم فوري، دعم ٢٤/٧، وأسعار حصرية.
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
        <SearchBar />
      </div>

      <div className="px-4 mt-3">
        <div className="rounded-3xl bg-gradient-to-br from-pink-600 via-rose-600 to-pink-700 p-3 shadow-[0_20px_45px_-12px_rgba(190,24,93,0.55)] relative overflow-hidden">
          {/* FIX #7: Replaced blur-3xl (GPU compositing layers) with CSS radial-gradient — same visual, zero GPU cost */}
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(253,164,175,0.35) 0%, transparent 70%)" }} />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(251,113,133,0.28) 0%, transparent 70%)" }} />
          <div className="relative">
            <InlineCarousel />
            <div className="grid grid-cols-3 gap-2 mt-3">
              <StatCard icon={Globe}         value={195}   label="دولة نخدمها" />
              <StatCard icon={Zap}           value={5}     label="دقائق للتسليم" />
              <StatCard icon={Star}          value={4.9}   label="تقييم من 5" />
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
        onToggleMore={toggleGames}
        tag="تسليم فوري"
        TagIcon={Gamepad2}
        maintenance={maintenance}
      />

      {/* ===== Section: Social media boosting ===== */}
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" }}>
        <SectionTitle title="خدمات رشق السوشيل ميديا" />
        <HorizontalRow
          items={SOCIAL_FEATURED}
          showMore={false}
          tag="الأكثر طلباً"
          TagIcon={Star}
          maintenance={maintenance}
        />
      </div>

      {/* ===== Section: App subscriptions ===== */}
      <div style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" }}>
        <SectionTitle title="اشتراكات التطبيقات" />
        <HorizontalRow
          items={SUBS_FEATURED}
          extraItems={SUBS_EXTRA}
          href="/subscriptions"
          showMore
          expanded={subsExpanded}
          onToggleMore={toggleSubs}
          tag="أفضل سعر"
          TagIcon={Crown}
          maintenance={maintenance}
        />
      </div>

      {/* Why us */}
      <div className="px-5 mt-7" style={{ contentVisibility: "auto", containIntrinsicSize: "0 300px" }}>
        <h2 className="text-lg font-extrabold text-pink-900 mb-3">
          لماذا OVELIN MALL؟
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

      {/* ═══════════ من نحن — About Us Accordion ═══════════ */}
      <AboutAccordion />

      {/* ═══════════ تابعنا — Social Media ═══════════ */}
      <div className="px-5 mt-8 mb-2" dir="rtl">
        <div className="fancy-card rounded-3xl p-5 text-center">
          {/* Title */}
          <h2
            className="text-2xl font-black text-pink-900 mb-1 tracking-wide"
            style={{ textShadow: "0 2px 8px rgba(244,63,94,0.15)" }}
          >
            تابعنا
          </h2>
          <p className="text-[11px] text-pink-500 font-semibold mb-5">
            كن أول من يعلم بعروضنا وخدماتنا الجديدة
          </p>

          {/* Hexagonal icons row */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-14 h-14 flex items-center justify-center relative transition-transform duration-200 group-active:scale-90 group-hover:scale-105"
                style={{
                  clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                  background: "linear-gradient(135deg, #1877f2 0%, #0a5dc2 100%)",
                  boxShadow: "0 6px 20px -4px rgba(24,119,242,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-blue-600">فيسبوك</span>
            </a>

            {/* TikTok */}
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-14 h-14 flex items-center justify-center relative transition-transform duration-200 group-active:scale-90 group-hover:scale-105"
                style={{
                  clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                  background: "linear-gradient(135deg, #010101 0%, #2a2a2a 100%)",
                  boxShadow: "0 6px 20px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.10)",
                }}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-gray-800">تيك توك</span>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-14 h-14 flex items-center justify-center relative transition-transform duration-200 group-active:scale-90 group-hover:scale-105"
                style={{
                  clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                  background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                  boxShadow: "0 6px 20px -4px rgba(220,39,67,0.50), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-pink-600">انستغرام</span>
            </a>

            {/* Twitter / X */}
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-14 h-14 flex items-center justify-center relative transition-transform duration-200 group-active:scale-90 group-hover:scale-105"
                style={{
                  clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                  background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
                  boxShadow: "0 6px 20px -4px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.10)",
                }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-gray-800">تويتر</span>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-14 h-14 flex items-center justify-center relative transition-transform duration-200 group-active:scale-90 group-hover:scale-105"
                style={{
                  clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)",
                  background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
                  boxShadow: "0 6px 20px -4px rgba(37,211,102,0.50), inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <span className="text-[10px] font-bold text-emerald-600">واتساب</span>
            </a>
          </div>
        </div>
      </div>

    </AppLayout>
  );
}
