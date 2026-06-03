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

import {
  Users,
  DollarSign,
  Gamepad2,
  CreditCard,
  Layout,
  Bot,
  type LucideIcon,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  MessageCircle,
  Music,
} from "lucide-react";

export const CATEGORY_META: Record<
  string,
  { name: string; icon: LucideIcon; gradient: string; tag: string; image: string }
> = {
  social_followers: {
    name: "رشق متابعين",
    icon: Users,
    gradient: "from-pink-500 via-rose-500 to-pink-600",
    tag: "الأكثر طلباً",
    image: `${import.meta.env.BASE_URL}categories/social_followers.png`,
  },
  usdt_exchange: {
    name: "بيع وشراء USDT",
    icon: DollarSign,
    gradient: "from-pink-500 via-pink-600 to-pink-700",
    tag: "تبادل آمن",
    image: `${import.meta.env.BASE_URL}categories/usdt_exchange.png`,
  },
  game_cards: {
    name: "بطاقات الألعاب",
    icon: Gamepad2,
    gradient: "from-rose-500 via-pink-500 to-pink-500",
    tag: "تسليم فوري",
    image: `${import.meta.env.BASE_URL}categories/game_cards.png`,
  },
  app_subscriptions: {
    name: "بطاقات الاشتراكات",
    icon: CreditCard,
    gradient: "from-pink-400 via-pink-500 to-rose-600",
    tag: "أفضل سعر",
    image: `${import.meta.env.BASE_URL}categories/app_subscriptions.png`,
  },
  website_design: {
    name: "تصميم مواقع",
    icon: Layout,
    gradient: "from-pink-400 via-pink-500 to-pink-600",
    tag: "احترافي",
    image: `${import.meta.env.BASE_URL}categories/website_design.png`,
  },
  telegram_bots: {
    name: "بوتات تليجرام",
    icon: Bot,
    gradient: "from-rose-400 via-pink-600 to-pink-700",
    tag: "ذكي",
    image: `${import.meta.env.BASE_URL}categories/telegram_bots.png`,
  },
};

export const PLATFORM_META: Record<
  string,
  {
    name: string;
    icon: LucideIcon;
    color: string;
    iconColor: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  instagram: {
    name: "انستغرام",
    icon: Instagram,
    color: "text-pink-600",
    iconColor: "text-pink-500",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
  },
  facebook: {
    name: "فيسبوك",
    icon: Facebook,
    color: "text-blue-600",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  tiktok: {
    name: "تيك توك",
    icon: Music,
    color: "text-zinc-800",
    iconColor: "text-zinc-700",
    bgColor: "bg-zinc-100",
    borderColor: "border-zinc-300",
  },
  youtube: {
    name: "يوتيوب",
    icon: Youtube,
    color: "text-red-600",
    iconColor: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  twitter: {
    name: "تويتر",
    icon: Twitter,
    color: "text-sky-500",
    iconColor: "text-sky-400",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
  },
};

export const CATEGORY_ORDER = [
  "social_followers",
  "usdt_exchange",
  "game_cards",
  "app_subscriptions",
  "website_design",
  "telegram_bots",
];
