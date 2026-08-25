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

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  AlertCircle,
  ShoppingCart,
  Star,
  ChevronLeft,
  Sparkles,
  Heart,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateOrder,
  getGetWalletQueryKey,
  getListMyOrdersQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { formatSDG } from "@/lib/utils";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { LiveViewers } from "@/components/LiveViewers";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Recommendations } from "@/components/Recommendations";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { track } from "@/lib/analytics";
import { Link } from "wouter";

type Product = {
  id: number;
  name: string;
  description: string;
  price: string;
  oldPrice?: string | null;
  category: string;
  platform?: string | null;
  quantity?: string | null;
  deliveryTime?: string | null;
  imageUrl?: string | null;
  badge?: string | null;
  ratingAvg?: string | null;
  ratingCount?: number | null;
  salesCount?: number | null;
};

// Canonical platform key mapping (handles aliases / Arabic names in name field)
const PLATFORM_ALIASES: Record<string, string> = {
  openai: "chatgpt",
  "chatgpt plus": "chatgpt",
  "youtube premium": "youtube",
  "spotify premium": "spotify",
  "spotify family": "spotify",
  "netflix premium": "netflix",
  "نتفليكس": "netflix",
  "سبوتيفاي": "spotify",
  "يوتيوب": "youtube",
  "شاهد": "shahid",
  "انغامي": "anghami",
  "كانفا": "canva",
};

const APP_BRANDS: Record<string, { color: string; bg: string; logo: string; features: string[] }> = {
  netflix: {
    color: "#E50914",
    bg: "from-[#E50914] to-[#831010]",
    logo: "🎬",
    features: ["أفلام ومسلسلات بلا حدود", "دقة 4K Ultra HD", "تشغيل على أجهزة متعددة", "محتوى عربي وعالمي", "تحميل للمشاهدة أوفلاين"],
  },
  spotify: {
    color: "#1DB954",
    bg: "from-[#1DB954] to-[#158040]",
    logo: "🎵",
    features: ["موسيقى بلا إعلانات", "تشغيل أوفلاين", "جودة صوت عالية", "بودكاست وراديو", "مشاركة مع العائلة"],
  },
  youtube: {
    color: "#FF0000",
    bg: "from-[#FF0000] to-[#990000]",
    logo: "▶️",
    features: ["بدون إعلانات تماماً", "تحميل الفيديوهات", "تشغيل في الخلفية", "YouTube Music مجاناً", "محتوى حصري"],
  },
  shahid: {
    color: "#8B5CF6",
    bg: "from-[#8B5CF6] to-[#5B21B6]",
    logo: "📺",
    features: ["مسلسلات خليجية ومصرية", "أفلام عربية حصرية", "دقة عالية HD", "بث مباشر للمسابقات", "محتوى للعائلة"],
  },
  anghami: {
    color: "#6B48FF",
    bg: "from-[#6B48FF] to-[#4B2FCC]",
    logo: "🎶",
    features: ["ملايين أغنية عربية وأجنبية", "بدون إعلانات", "تشغيل أوفلاين", "كلمات الأغاني", "جودة صوت فائقة"],
  },
  canva: {
    color: "#00C4CC",
    bg: "from-[#00C4CC] to-[#0099A8]",
    logo: "🎨",
    features: ["قوالب احترافية بلا حدود", "أدوات الذكاء الاصطناعي", "تعاون مع الفريق", "تصاميم بدون علامة مائية", "تخزين سحابي"],
  },
  chatgpt: {
    color: "#10A37F",
    bg: "from-[#10A37F] to-[#0A6B54]",
    logo: "🤖",
    features: ["GPT-4 بلا حدود", "إنشاء صور AI", "تحليل ملفات وبيانات", "وصول لأحدث النماذج", "استخدام API"],
  },
};

function getBrand(name: string, platform?: string | null) {
  // 1. Try exact platform field first
  if (platform) {
    const p = platform.toLowerCase();
    const alias = PLATFORM_ALIASES[p] ?? p;
    if (APP_BRANDS[alias]) return { key: alias, ...APP_BRANDS[alias] };
    if (APP_BRANDS[p]) return { key: p, ...APP_BRANDS[p] };
  }
  // 2. Try matching against name (English keywords)
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(APP_BRANDS)) {
    if (lower.includes(key)) return { key, ...val };
  }
  // 3. Try Arabic aliases in name
  for (const [alias, target] of Object.entries(PLATFORM_ALIASES)) {
    if (lower.includes(alias) && APP_BRANDS[target]) {
      return { key: target, ...APP_BRANDS[target] };
    }
  }
  return {
    key: "generic",
    color: "#ec4899",
    bg: "from-pink-500 to-rose-600",
    logo: "📦",
    features: ["خدمة مميزة", "تسليم سريع", "دعم فني 24/7", "ضمان 100%", "أفضل سعر"],
  };
}

function StarRating({ avg, count }: { avg: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1,2,3,4,5].map((i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i <= Math.round(avg) ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-gray-100"}`}
          />
        ))}
      </div>
      <span className="text-xs text-white/80 font-medium">{avg.toFixed(1)}</span>
      <span className="text-xs text-white/60">({count} تقييم)</span>
    </div>
  );
}

export function SubscriptionProductDetail({ product }: { product: Product }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { balance: liveBalance } = useWalletBalance();
  const qc = useQueryClient();
  const createOrder = useCreateOrder();

  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [addingCart, setAddingCart] = useState(false);
  const [flash, setFlash] = useState<{ price: number; discountPct: number; endsAt: string } | null>(null);

  const brand = getBrand(product.name, product.platform);
  const price = flash ? flash.price : Number(product.price);
  const oldPrice = product.oldPrice ? Number(product.oldPrice) : null;
  const savings = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
  const rating = Number(product.ratingAvg ?? 0);
  const ratingCount = product.ratingCount ?? 0;
  const salesCount = product.salesCount ?? 0;

  useEffect(() => {
    api<any[]>("/api/flash-sales/active")
      .then((rows) => {
        const row = (rows || []).find((r: any) => r.productId === product.id);
        if (row) {
          setFlash({
            price: Number(row.price) * (100 - row.discountPct) / 100,
            discountPct: row.discountPct,
            endsAt: row.endsAt,
          });
        }
      })
      .catch(() => {});
  }, [product.id]);

  async function addToCart() {
    if (!user) { setLocation("/login"); return; }
    if (!email.trim()) { setError("أدخل البريد الإلكتروني أو معلومات الحساب"); return; }
    setError(null); setAddingCart(true);
    try {
      await api("/api/cart", {
        method: "POST",
        body: JSON.stringify({ productId: product.id, qty: 1, targetInfo: email.trim(), notes: notes.trim() || null }),
      });
      track("add_to_cart", { productId: product.id });
      showToast("✅ أضيف للسلة", "success");
    } catch (e: any) {
      setError(e?.message || "خطأ");
    } finally { setAddingCart(false); }
  }

  function submit() {
    setError(null);
    if (!user) { setLocation("/login"); return; }
    if (!email.trim()) { setError("يرجى إدخال البريد الإلكتروني أو رابط الحساب"); return; }
    createOrder.mutate(
      { data: { productId: product.id, targetInfo: email.trim(), notes: notes.trim() || undefined } },
      {
        onSuccess: (order) => {
          qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
          qc.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation(`/cart-success/${order.id}`);
        },
        onError: (e: unknown) => {
          const msg = (e as any)?.response?.data?.error ?? "تعذر إنشاء الطلب";
          setError(msg);
        },
      },
    );
  }

  return (
    <div className="pb-28">
      {/* ─── Hero ─── */}
      <motion.div
        className={`relative bg-gradient-to-br ${brand.bg} overflow-hidden`}
      >
        {/* back button */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 backdrop-blur-sm"
        >
          <ChevronLeft className="w-5 h-5 text-white" style={{ transform: "rotate(180deg)" }} />
        </button>

        {/* wishlist */}
        <button
          onClick={() => setWishlisted((v) => !v)}
          className="absolute top-4 left-4 z-10 p-2 rounded-full bg-white/20 backdrop-blur-sm"
        >
          <Heart className={`w-5 h-5 ${wishlisted ? "fill-white text-white" : "text-white"}`} />
        </button>

        {/* blurred circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-red-500/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-black/20 rounded-full blur-2xl" />

        <div className="px-5 pt-12 pb-10 relative z-10 flex flex-col items-center text-center">
          {/* ─── Big Logo — popping out ─── */}
          <motion.div
            transition={{ type: "spring", stiffness: 190, damping: 18, delay: 0.05 }}
            className="relative mb-5"
          >
            <div className="w-44 h-44 rounded-[2rem] overflow-hidden border-[3px] border-white/60 shadow-[0_28px_80px_-8px_rgba(0,0,0,0.65)] ring-[6px] ring-white/15">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: `${brand.color}44` }}
                >
                  <span className="text-8xl drop-shadow-[0_8px_24px_rgba(0,0,0,0.4)]">{brand.logo}</span>
                </div>
              )}
            </div>
            {/* Glow halo */}
            <div
              className="absolute inset-0 rounded-[2rem] pointer-events-none"
              style={{ boxShadow: `0 0 60px 10px ${brand.color}55` }}
            />
          </motion.div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-2 justify-center flex-wrap">
            <span className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              بطاقات الاشتراكات
            </span>
            {product.badge && (
              <span className="text-[10px] font-bold bg-yellow-400 text-yellow-900 px-2.5 py-0.5 rounded-full">
                {product.badge}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black text-white leading-tight tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
            {product.name}
          </h1>
          {ratingCount > 0 && (
            <div className="mt-2">
              <StarRating avg={rating} count={ratingCount} />
            </div>
          )}

          {/* Price block */}
          <div className="mt-5 flex flex-col items-center gap-1.5">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                {formatSDG(price)}
              </span>
              <span className="text-xl font-bold text-white/80">ج.س</span>
              {oldPrice && (
                <span className="text-base text-white/55 line-through">{formatSDG(oldPrice)}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {savings && (
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur rounded-full px-3 py-1">
                  <Sparkles className="w-3 h-3 text-yellow-300" />
                  <span className="text-[11px] font-bold text-white">وفّر {savings}%</span>
                </div>
              )}
              {flash && (
                <div className="inline-flex items-center gap-1.5 bg-black/25 backdrop-blur rounded-full px-3 py-1">
                  <span className="text-[10px] font-bold text-white">⚡ -{flash.discountPct}% ينتهي</span>
                  <CountdownTimer endsAt={flash.endsAt} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <LiveViewers productId={product.id} />
              {salesCount > 0 && (
                <div className="text-[10px] text-white/70">{salesCount}+ طلب مكتمل</div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Quick Stats ─── */}
      <div className="px-5 -mt-3 relative z-20">
        <motion.div
          className="grid grid-cols-3 gap-2"
        >
          <div className="rounded-2xl bg-white border border-pink-100 p-3 text-center shadow-sm">
            <Clock className="w-5 h-5 text-pink-500 mx-auto" />
            <div className="text-[10px] mt-1 text-gray-500">التسليم</div>
            <div className="text-xs font-bold text-pink-900 mt-0.5">{product.deliveryTime ?? "فوري"}</div>
          </div>
          <div className="rounded-2xl bg-white border border-pink-100 p-3 text-center shadow-sm">
            <Zap className="w-5 h-5 text-rose-500 mx-auto" />
            <div className="text-[10px] mt-1 text-gray-500">المدة</div>
            <div className="text-xs font-bold text-pink-900 mt-0.5">{product.quantity ?? "شهر"}</div>
          </div>
          <div className="rounded-2xl bg-white border border-pink-100 p-3 text-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-pink-500 mx-auto" />
            <div className="text-[10px] mt-1 text-gray-500">ضمان</div>
            <div className="text-xs font-bold text-pink-900 mt-0.5">100%</div>
          </div>
        </motion.div>
      </div>

      {/* ─── Description ─── */}
      {product.description && (
        <motion.div
          className="mx-5 mt-4 rounded-2xl bg-white/60 border border-pink-100 p-4"
        >
          <p className="text-sm text-pink-900 leading-relaxed">{product.description}</p>
        </motion.div>
      )}

      {/* ─── What's Included ─── */}
      <motion.div
        className="mx-5 mt-4 rounded-3xl bg-white border border-pink-100 p-4 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-pink-500" />
          <span className="font-bold text-pink-900 text-sm">يشمل الاشتراك</span>
        </div>
        <div className="space-y-2">
          {brand.features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0" />
              <span className="text-sm text-gray-700">{feature}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Order Form ─── */}
      <motion.div
        className="mx-5 mt-4 rounded-3xl bg-white border border-pink-100 p-4 shadow-sm"
      >
        <div className="font-bold text-pink-900 mb-1">بيانات التفعيل</div>
        <p className="text-xs text-gray-500 mb-3">أدخل بريدك الإلكتروني أو رابط حسابك لتفعيل الاشتراك</p>

        <label className="text-xs text-pink-800 font-semibold">البريد الإلكتروني / رابط الحساب</label>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@gmail.com"
          className="mt-1.5 w-full rounded-2xl border border-pink-200 bg-white/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 text-left"
          dir="ltr"
        />

        <label className="text-xs text-pink-800 font-semibold mt-3 block">ملاحظات (اختياري)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي تفاصيل إضافية..."
          rows={2}
          className="mt-1.5 w-full rounded-2xl border border-pink-200 bg-white/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
        />

        {error && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Guarantee note */}
        <div className="mt-3 flex items-center gap-2 bg-green-50 rounded-xl p-2.5">
          <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
          <span className="text-[11px] text-green-700 font-medium">مضمون 100% — استرداد كامل في حال أي مشكلة</span>
        </div>
      </motion.div>

      {/* ─── Recommendations ─── */}
      <div className="mt-4">
        <Recommendations title="اشتراكات أخرى" source={"category" as any} productId={product.id} />
      </div>

      {/* ─── Sticky CTA ─── */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-5 pb-5 pt-3 bg-white/90 backdrop-blur-lg border-t border-pink-100 z-50">
        {!user ? (
          <Link href="/login">
            <button
              className={`w-full rounded-2xl py-4 font-bold text-white text-base shadow-lg active:scale-95 transition bg-gradient-to-r ${brand.bg}`}
            >
              سجّل الدخول للطلب
            </button>
          </Link>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={addToCart}
              disabled={addingCart}
              className="flex-none rounded-2xl px-4 py-4 font-bold border-2 border-pink-500 text-pink-600 active:scale-95 transition disabled:opacity-60 flex items-center gap-1.5 text-xs"
            >
              <ShoppingCart className="w-4 h-4" />
              {addingCart ? "..." : "للسلة"}
            </button>
            <button
              disabled={createOrder.isPending}
              onClick={submit}
              className={`flex-1 rounded-2xl py-4 font-bold text-white text-base shadow-lg active:scale-95 transition disabled:opacity-60 bg-gradient-to-r ${brand.bg}`}
            >
              {createOrder.isPending ? "جارٍ الطلب..." : `اشترك الآن • ${formatSDG(price)} ج.س`}
            </button>
          </div>
        )}
        {user && (
          <div className="text-[11px] text-center text-gray-400 mt-1.5">
            رصيدك: <span className="text-pink-600 font-bold">{formatSDG(liveBalance)} ج.س</span>
          </div>
        )}
      </div>
    </div>
  );
}
