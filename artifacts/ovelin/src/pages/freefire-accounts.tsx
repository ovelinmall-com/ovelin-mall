import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Star, Headphones, Trophy, Zap, Shirt, Users, Medal, Globe, ArrowRight, X, ChevronLeft, ChevronRight, MessageCircle, Check, Shield, Crown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SUPPORT_WHATSAPP = "1234567890";

// ─── Types ────────────────────────────────────────────────────────────────────
interface FFAccount {
  id: string;
  account_name: string;
  price: number;
  status: "available" | "reserved" | "sold";
  cover_image: string;
  images?: string[];
  level?: number;
  evo_weapons_count?: number;
  skins_count?: number;
  characters_count?: number;
  rank?: string;
  server?: string;
  description?: string;
  features?: string[];
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-md ring-1 ring-pink-100/50">
      <div className="p-2">
        <div className="aspect-[4/3] w-full animate-pulse rounded-[1.4rem] bg-gray-200" />
      </div>
      <div className="px-4 pb-4 pt-2">
        <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-7 w-1/2 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-5 w-16 animate-pulse rounded-full bg-gray-200" />
          ))}
        </div>
        <div className="mt-4 h-11 w-full animate-pulse rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

// ─── Account Card ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  available: { label: "متوفر", className: "bg-green-500/90 text-white ring-white/40" },
  reserved:  { label: "محجوز", className: "bg-amber-500/90 text-white ring-white/40" },
  sold:      { label: "مباع",  className: "bg-gray-700/90 text-white ring-white/40" },
};

function AccountCard({ account, onClick }: { account: FFAccount; onClick: (a: FFAccount) => void }) {
  const status = STATUS_CONFIG[account.status] ?? STATUS_CONFIG.available;
  const isSold = account.status === "sold";
  const isReserved = account.status === "reserved";

  const tags = [
    account.level != null && { icon: Trophy, label: `مستوى ${account.level}` },
    account.evo_weapons_count != null && { icon: Zap, label: `Evo ${account.evo_weapons_count}` },
    account.skins_count != null && { icon: Shirt, label: `${account.skins_count} سكن` },
    account.characters_count != null && { icon: Users, label: `${account.characters_count} شخصية` },
    account.rank && { icon: Medal, label: account.rank },
    account.server && { icon: Globe, label: account.server },
  ].filter(Boolean) as { icon: typeof Trophy; label: string }[];

  return (
    <div
      onClick={() => !isSold && onClick(account)}
      className={`group relative overflow-hidden rounded-[2rem] bg-white shadow-lg ring-1 ring-pink-100/50 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-primary/25 active:scale-[0.98] ${isSold ? "opacity-50 grayscale" : "cursor-pointer"}`}
    >
      <div className="p-2">
        <div className="relative rounded-[1.5rem] bg-gradient-to-br from-primary via-pink-500 to-rose-400 p-[2px] shadow-lg shadow-primary/20">
          <div className="relative overflow-hidden rounded-[1.4rem]">
            <img
              loading="lazy"
              src={account.cover_image}
              alt={account.account_name}
              className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-md ring-1 backdrop-blur-md ${status.className}`}>
              {status.label}
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 pt-1">
        <h3 className="truncate text-base font-bold text-gray-900">{account.account_name}</h3>
        <p className="mt-1 text-2xl font-extrabold text-primary">
          {account.price?.toLocaleString()} <span className="text-sm font-medium text-gray-400">ج.س</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-primary ring-1 ring-pink-100">
              <tag.icon className="h-3 w-3" />
              {tag.label}
            </span>
          ))}
        </div>
        <button
          className={`mt-4 w-full rounded-full py-3 text-sm font-bold transition-all ${
            isSold
              ? "cursor-not-allowed bg-gray-200 text-gray-400"
              : isReserved
              ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
              : "bg-gradient-to-r from-primary to-pink-500 text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-95"
          }`}
        >
          {isSold ? "غير متاح" : isReserved ? "محجوز" : "شراء الآن"}
        </button>
      </div>
    </div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function AccountDetailModal({ account, onClose }: { account: FFAccount; onClose: () => void }) {
  const [imgIndex, setImgIndex] = useState(0);
  const allImages = [account.cover_image, ...(account.images ?? [])].filter(Boolean);

  const stats = [
    account.level != null && { icon: Trophy, label: "المستوى", value: account.level, gradient: "from-amber-400 to-orange-500", glow: "shadow-amber-500/30" },
    account.evo_weapons_count != null && { icon: Zap, label: "أسلحة Evo", value: account.evo_weapons_count, gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/30" },
    account.skins_count != null && { icon: Shirt, label: "السكنات", value: account.skins_count, gradient: "from-pink-500 to-rose-500", glow: "shadow-pink-500/30" },
    account.characters_count != null && { icon: Users, label: "الشخصيات", value: account.characters_count, gradient: "from-cyan-500 to-blue-600", glow: "shadow-cyan-500/30" },
  ].filter(Boolean) as { icon: typeof Trophy; label: string; value: number; gradient: string; glow: string }[];

  const metaInfo = [
    account.rank && { icon: Medal, label: "الرتبة", value: account.rank },
    account.server && { icon: Globe, label: "السيرفر", value: account.server },
  ].filter(Boolean) as { icon: typeof Medal; label: string; value: string }[];

  const statusConfig = {
    available: { label: "متوفر", className: "bg-green-500 text-white", dot: "bg-green-400" },
    reserved:  { label: "محجوز", className: "bg-amber-500 text-white", dot: "bg-amber-400" },
    sold:      { label: "مباع",  className: "bg-gray-700 text-white",  dot: "bg-gray-500" },
  };
  const status = statusConfig[account.status] ?? statusConfig.available;

  const handleContactSupport = () => {
    const msg = `مرحباً، أريد شراء حساب Free Fire: ${account.account_name} بسعر ${account.price} ج.س`;
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const prev = () => setImgIndex((i) => (i - 1 + allImages.length) % allImages.length);
  const next = () => setImgIndex((i) => (i + 1) % allImages.length);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[2.5rem] bg-gradient-to-b from-white to-pink-50/30 shadow-2xl md:max-w-2xl md:rounded-[2.5rem]"
        >
          <button onClick={onClose} className="absolute left-4 top-4 z-20 rounded-full bg-white/90 p-2.5 shadow-lg backdrop-blur-md transition-transform active:scale-90">
            <X className="h-5 w-5 text-gray-700" />
          </button>
          <div className="p-3">
            <div className="relative rounded-[1.8rem] bg-gradient-to-br from-primary via-pink-500 to-rose-400 p-[3px] shadow-2xl shadow-primary/30">
              <div className="relative overflow-hidden rounded-[1.6rem]">
                <img src={allImages[imgIndex]} alt={account.account_name} className="aspect-[16/10] w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className={`absolute right-4 top-4 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-lg ring-1 ring-white/30 ${status.className}`}>
                  <span className={`h-2 w-2 rounded-full ${status.dot} ring-2 ring-white/60`} />
                  {status.label}
                </div>
                {allImages.length > 1 && (
                  <>
                    <button onClick={prev} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-lg backdrop-blur-md transition-transform hover:scale-110 active:scale-90">
                      <ChevronRight className="h-5 w-5 text-gray-700" />
                    </button>
                    <button onClick={next} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2.5 shadow-lg backdrop-blur-md transition-transform hover:scale-110 active:scale-90">
                      <ChevronLeft className="h-5 w-5 text-gray-700" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                      {allImages.map((_, i) => (
                        <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === imgIndex ? "w-7 bg-primary" : "w-2 bg-white/60"}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="px-5 pb-8">
            <div className="flex items-start justify-between gap-3 pt-1">
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-extrabold text-gray-900">{account.account_name}</h2>
                <div className="mt-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">حساب Premium موثّق</span>
                </div>
              </div>
              <div className="shrink-0 text-left">
                <p className="text-[11px] font-medium text-gray-400">السعر</p>
                <p className="text-3xl font-extrabold leading-tight text-primary">{account.price?.toLocaleString()}</p>
                <p className="text-xs font-bold text-gray-400">ج.س</p>
              </div>
            </div>
            {stats.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-pink-400" />
                  <h3 className="text-sm font-bold text-gray-800">إحصائيات الحساب</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {stats.map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      className="group relative overflow-hidden rounded-2xl bg-white p-3 shadow-md ring-1 ring-pink-100/60 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 blur-2xl`} />
                      <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} ${stat.glow} shadow-lg`}>
                        <stat.icon className="h-5 w-5 text-white" />
                      </div>
                      <p className="mt-2 text-center text-2xl font-extrabold text-gray-900">{stat.value}</p>
                      <p className="text-center text-[11px] font-semibold text-gray-400">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {metaInfo.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {metaInfo.map((meta, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-pink-100 bg-white/60 px-4 py-3 backdrop-blur-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 ring-1 ring-pink-100">
                      <meta.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-gray-400">{meta.label}</p>
                      <p className="truncate text-sm font-bold text-gray-800">{meta.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {account.description && (
              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-pink-400" />
                  <h3 className="text-sm font-bold text-gray-800">وصف الحساب</h3>
                </div>
                <div className="rounded-2xl border border-pink-100/60 bg-white/60 p-4 backdrop-blur-sm">
                  <p className="text-sm leading-relaxed text-gray-600">{account.description}</p>
                </div>
              </div>
            )}
            {account.features && account.features.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-pink-400" />
                  <h3 className="text-sm font-bold text-gray-800">المميزات</h3>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {account.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-xl bg-gradient-to-l from-pink-50 to-white px-3.5 py-3 ring-1 ring-pink-100/60">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-pink-500">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-6 flex items-center justify-center gap-4 rounded-2xl bg-gradient-to-r from-pink-50 via-white to-pink-50 px-4 py-3 ring-1 ring-pink-100/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500"><Shield className="h-4 w-4 text-primary" /> تسليم آمن</div>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500"><Crown className="h-4 w-4 text-primary" /> ضمان الجودة</div>
              <div className="h-4 w-px bg-gray-200" />
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500"><Sparkles className="h-4 w-4 text-primary" /> موثّق</div>
            </div>
            <button
              onClick={handleContactSupport}
              className="group mt-6 w-full overflow-hidden rounded-full bg-gradient-to-r from-primary to-pink-500 py-4 text-base font-bold text-white shadow-xl shadow-primary/30 transition-all hover:shadow-2xl hover:shadow-primary/40 active:scale-95"
            >
              <span className="flex items-center justify-center gap-2">
                <MessageCircle className="h-5 w-5 transition-transform group-hover:scale-110" />
                التواصل مع الدعم لشراء الحساب
              </span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function FreefireAccounts() {
  const [accounts, setAccounts] = useState<FFAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FFAccount | null>(null);

  useEffect(() => {
    // جلب الحسابات من API
    fetch("/api/freefire-accounts")
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const handleSupport = () => {
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}`, "_blank");
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-pink-50/60 via-white to-pink-50/40 pb-12 font-body">
      {/* Hero banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-pink-500 to-rose-400 px-4 py-10 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          {[...Array(12)].map((_, i) => (
            <Star key={i} className="absolute h-3 w-3 fill-white text-white"
              style={{ top: `${(i * 37) % 90}%`, left: `${(i * 53) % 95}%` }} />
          ))}
        </div>
        <div className="relative">
          {/* زر الرجوع */}
          <Link href="/freefire">
            <button className="absolute right-0 top-0 flex items-center gap-1 text-white/80 hover:text-white text-sm font-medium">
              <ArrowRight className="h-4 w-4" />
              رجوع
            </button>
          </Link>
          <h1 className="text-3xl font-extrabold text-white drop-shadow-lg">حسابات Free Fire</h1>
          <p className="mt-1 text-sm font-medium text-white/90">حسابات Premium أصلية بأفضل الأسعار وتسليم فوري</p>
        </div>
      </div>

      {/* Section title */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-center gap-3 py-7">
          <Star className="h-5 w-5 fill-primary text-primary" />
          <div className="rounded-full bg-gradient-to-r from-primary to-pink-400 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30">
            تصفح الحسابات المتاحة
          </div>
          <Star className="h-5 w-5 fill-primary text-primary" />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : accounts.map((acc) => <AccountCard key={acc.id} account={acc} onClick={setSelected} />)}
        </div>

        {!loading && accounts.length === 0 && (
          <div className="py-24 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pink-50">
              <Star className="h-7 w-7 text-primary" />
            </div>
            <p className="text-gray-400">لا توجد حسابات متاحة حالياً</p>
          </div>
        )}
      </div>

      {/* Floating support button */}
      <button
        onClick={handleSupport}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-white px-4 py-3 shadow-xl shadow-primary/10 ring-1 ring-pink-100 transition-transform active:scale-95"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-pink-500">
          <Headphones className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold text-gray-700">الدعم</span>
      </button>

      {selected && <AccountDetailModal account={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
