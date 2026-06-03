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

// Mapping between URL slugs and platform identifiers stored in the
// `products.platform` column. Used by Home cards and the Game variants page.

export type PlatformInfo = {
  slug: string;
  platform: string; // value stored in products.platform
  name: string;
  emoji: string;
  hint: string;
  unitName: string; // singular currency unit (جوهرة, شدة UC, ...)
  unitNamePlural: string;
  category: string; // products.category
  gradient: string;
  bgImage?: string; // hero image shown in game page header
};

export const PLATFORMS: PlatformInfo[] = [
  // ===== Games =====
  { slug: "pubg",          platform: "PUBG Mobile",    name: "PUBG Mobile",    emoji: "🎯", hint: "شدات UC",          unitName: "شدة",    unitNamePlural: "UC",        category: "game_cards",        gradient: "from-amber-600 via-orange-700 to-rose-800",    bgImage: "/games/pubg.jpg" },
  { slug: "free-fire",     platform: "Free Fire",      name: "Free Fire",      emoji: "🔥", hint: "جواهر",            unitName: "جوهرة",  unitNamePlural: "جوهرة",     category: "game_cards",        gradient: "from-orange-600 via-red-700 to-rose-900",      bgImage: "/games/free-fire.jpg" },
  { slug: "cod",           platform: "Call of Duty",   name: "Call of Duty",   emoji: "🎖️", hint: "CP Points",        unitName: "CP",     unitNamePlural: "CP",        category: "game_cards",        gradient: "from-zinc-700 via-zinc-900 to-black",           bgImage: "/games/cod.webp" },
  { slug: "clash-of-clans",platform: "Clash of Clans", name: "Clash of Clans", emoji: "🏰", hint: "جواهر",            unitName: "جوهرة",  unitNamePlural: "جوهرة",     category: "game_cards",        gradient: "from-amber-500 via-yellow-700 to-orange-900",  bgImage: "/games/clash-of-clans.jpg" },
  { slug: "clash-royale",  platform: "Clash Royale",   name: "Clash Royale",   emoji: "👑", hint: "جواهر",            unitName: "جوهرة",  unitNamePlural: "جوهرة",     category: "game_cards",        gradient: "from-violet-600 via-purple-700 to-fuchsia-900",bgImage: "/games/clash-royale.jpg" },
  { slug: "mobile-legends",platform: "Mobile Legends", name: "Mobile Legends", emoji: "⚔️", hint: "Diamond",          unitName: "ألماسة", unitNamePlural: "ألماسة",    category: "game_cards",        gradient: "from-blue-700 via-indigo-800 to-violet-900",   bgImage: "/games/mobile-legends.jpg" },
  { slug: "genshin-impact",platform: "Genshin Impact", name: "Genshin Impact", emoji: "🌌", hint: "Genesis Crystals", unitName: "بلورة",  unitNamePlural: "بلورة",     category: "game_cards",        gradient: "from-sky-600 via-cyan-700 to-blue-900",        bgImage: "/games/genshin-impact.jpg" },
  { slug: "fc-mobile",     platform: "EA FC Mobile",   name: "EA FC Mobile",   emoji: "⚽", hint: "FC Points",        unitName: "نقطة",   unitNamePlural: "FC Points", category: "game_cards",        gradient: "from-emerald-600 via-green-700 to-teal-800",   bgImage: "/games/fc-mobile.jpg" },
  { slug: "roblox",        platform: "Roblox",         name: "Roblox",         emoji: "🎮", hint: "Robux",            unitName: "Robux",  unitNamePlural: "Robux",     category: "game_cards",        gradient: "from-rose-600 via-red-700 to-rose-900",        bgImage: "/games/roblox.jpg" },
  { slug: "fortnite",      platform: "Fortnite",       name: "Fortnite",       emoji: "🏗️", hint: "V-Bucks",          unitName: "V-Buck", unitNamePlural: "V-Bucks",   category: "game_cards",        gradient: "from-blue-600 via-indigo-700 to-violet-800",   bgImage: "/games/fortnite.jpg" },
  { slug: "valorant",      platform: "Valorant",       name: "Valorant",       emoji: "🎯", hint: "VP Points",        unitName: "VP",     unitNamePlural: "VP",        category: "game_cards",        gradient: "from-rose-700 via-red-800 to-zinc-900",        bgImage: "/games/valorant.jpg" },
  { slug: "brawl-stars",   platform: "Brawl Stars",    name: "Brawl Stars",    emoji: "⭐", hint: "Gems",             unitName: "Gem",    unitNamePlural: "Gems",      category: "game_cards",        gradient: "from-amber-500 via-orange-600 to-rose-700",    bgImage: "/games/brawl-stars.jpg" },
  { slug: "honor-of-kings",platform: "Honor of Kings", name: "Honor of Kings", emoji: "⚔️", hint: "Tokens",           unitName: "Token",  unitNamePlural: "Tokens",    category: "game_cards",        gradient: "from-violet-700 via-purple-800 to-indigo-900", bgImage: "/games/honor-of-kings.jpg" },
  { slug: "stumble-guys",  platform: "Stumble Guys",   name: "Stumble Guys",   emoji: "🏃", hint: "Gems • Skins",     unitName: "Gem",    unitNamePlural: "Gems",      category: "game_cards",        gradient: "from-cyan-500 via-sky-600 to-blue-800",        bgImage: "/games/stumble-guys.jpg" },
  // ===== Subscriptions =====
  // platform values MUST match products.platform column in DB (lowercase)
  { slug: "netflix",         platform: "netflix",         name: "Netflix",         emoji: "🎬", hint: "اشتراك",       unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-red-700 via-rose-800 to-zinc-900",         bgImage: "/subs/netflix.jpg" },
  { slug: "shahid-vip",      platform: "shahid",          name: "Shahid VIP",      emoji: "⭐", hint: "اشتراك سنوي",  unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-amber-600 via-yellow-700 to-orange-900",   bgImage: "/subs/shahid.jpg" },
  { slug: "spotify",         platform: "spotify",         name: "Spotify",         emoji: "🎵", hint: "Premium",      unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-emerald-600 via-green-700 to-teal-900",    bgImage: "/subs/spotify.jpg" },
  { slug: "youtube-premium", platform: "youtube",         name: "YouTube Premium", emoji: "▶️", hint: "بدون إعلانات", unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-red-600 via-rose-700 to-red-900",          bgImage: "/subs/youtube.jpg" },
  { slug: "chatgpt-plus",    platform: "openai",          name: "ChatGPT Plus",    emoji: "🤖", hint: "GPT-4 + إضافات",unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-emerald-700 via-teal-800 to-green-900",    bgImage: "/subs/chatgpt.jpg" },
  { slug: "disney-plus",     platform: "disney",          name: "Disney+",         emoji: "🏰", hint: "اشتراك عائلي",  unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-blue-700 via-indigo-800 to-purple-900",    bgImage: "/subs/disney.jpg" },
  { slug: "apple-music",     platform: "apple_music",     name: "Apple Music",     emoji: "🎶", hint: "اشتراك شهري",   unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-pink-600 via-rose-700 to-red-900" },
  { slug: "telegram-premium",platform: "telegram",        name: "Telegram Premium",emoji: "✈️", hint: "اشتراك مميز",   unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-sky-500 via-blue-600 to-blue-800",         bgImage: "/subs/telegram.jpg" },
  { slug: "canva-pro",       platform: "canva",           name: "Canva Pro",       emoji: "🎨", hint: "تصميم احترافي", unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-violet-600 via-purple-700 to-fuchsia-800", bgImage: "/subs/canva.jpg" },
  { slug: "amazon-prime",    platform: "amazon",          name: "Amazon Prime",    emoji: "📦", hint: "فيديو • توصيل", unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-sky-600 via-blue-700 to-indigo-800",       bgImage: "/subs/amazon.jpg" },
  { slug: "microsoft-365",   platform: "microsoft",       name: "Microsoft 365",   emoji: "💻", hint: "Office + Cloud",unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-orange-500 via-amber-600 to-yellow-700",   bgImage: "/subs/microsoft.jpg" },
  { slug: "anghami",         platform: "anghami",         name: "Anghami",         emoji: "🎵", hint: "موسيقى عربية",  unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-fuchsia-600 via-pink-700 to-rose-800",     bgImage: "/subs/anghami.jpg" },
  { slug: "osn-plus",        platform: "osn",             name: "OSN+",            emoji: "📺", hint: "رياضة • ترفيه", unitName: "اشتراك", unitNamePlural: "اشتراك", category: "app_subscriptions", gradient: "from-zinc-700 via-slate-800 to-zinc-900",       bgImage: "/subs/osn.jpg" },
  // ===== Social =====
  { slug: "facebook",  platform: "facebook",   name: "فيسبوك",    emoji: "📘", hint: "لايكات • متابعين",  unitName: "متابع", unitNamePlural: "متابع", category: "social_followers", gradient: "from-blue-700 via-indigo-800 to-blue-900",      bgImage: "/social/facebook.jpg" },
  { slug: "instagram", platform: "instagram",  name: "انستغرام",  emoji: "📸", hint: "متابعين • لايكات",  unitName: "متابع", unitNamePlural: "متابع", category: "social_followers", gradient: "from-pink-600 via-fuchsia-700 to-purple-900",   bgImage: "/social/instagram.jpg" },
  { slug: "snapchat",  platform: "snapchat",   name: "سناب شات",  emoji: "👻", hint: "متابعين • مشاهدات", unitName: "متابع", unitNamePlural: "متابع", category: "social_followers", gradient: "from-yellow-500 via-amber-600 to-orange-800",   bgImage: "/social/snapchat.jpg" },
  { slug: "twitter",   platform: "twitter",    name: "تويتر / X", emoji: "🐦", hint: "متابعين • ريتويت",  unitName: "متابع", unitNamePlural: "متابع", category: "social_followers", gradient: "from-zinc-700 via-zinc-800 to-black",            bgImage: "/social/twitter.jpg" },
  { slug: "tiktok",    platform: "tiktok",     name: "تيك توك",   emoji: "🎵", hint: "متابعين • قلوب",    unitName: "متابع", unitNamePlural: "متابع", category: "social_followers", gradient: "from-pink-600 via-rose-700 to-zinc-900",        bgImage: "/social/tiktok.jpg" },
];

export function platformBySlug(slug: string): PlatformInfo | undefined {
  return PLATFORMS.find((p) => p.slug === slug);
}

export function platformByName(name: string): PlatformInfo | undefined {
  return PLATFORMS.find((p) => p.platform === name);
}

export function slugForName(name: string): string {
  return platformByName(name)?.slug ?? name.toLowerCase().replace(/\s+/g, "-");
}
