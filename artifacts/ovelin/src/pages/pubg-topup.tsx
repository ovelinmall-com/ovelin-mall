// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// ============================================================

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Wallet, Zap, Star, CheckCircle2, AlertCircle,
  Loader2, ShieldCheck, Crown, TrendingUp, RefreshCw,
  Copy, Users, Eye, BadgeCheck, Gift, Flame, BarChart3,
  Sparkles, Clock, ChevronDown, ChevronUp, ArrowRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetMe, useGetMyDashboard,
  getGetMyDashboardQueryKey, getGetMeQueryKey,
} from "@workspace/api-client-react";

// ─── Types ───────────────────────────────────────────────
type Product = {
  id: number; name: string; description: string; price: string;
  oldPrice: string | null; category: string; quantity: string | null;
  deliveryTime: string | null; badge: string | null; active: boolean;
  salesCount?: number; ratingAvg?: string; ratingCount?: number;
};
type CheckoutState = "idle" | "verifying" | "processing" | "done";

// ─── Helpers ─────────────────────────────────────────────
function extractUC(name: string): number {
  const m = name.match(/^([\d,]+)\s*UC/i);
  return m ? parseInt(m[1].replace(/,/g, "")) : 0;
}
function fmtSDG(n: number) { return n.toLocaleString("en-US"); }
function formatSDG(n: number) { return Math.floor(n).toLocaleString("en-US") + ",00"; }
function discountPct(price: number, old: number) { return Math.round(((old - price) / old) * 100); }

// UC per SDG ratio used for "Best Value" badge
function ucPerSdg(p: Product) {
  const uc = extractUC(p.name); const pr = Number(p.price);
  return pr > 0 ? uc / pr : 0;
}

// Tier config
function getTierConfig(price: number) {
  if (price <= 100)  return { label: "Starter", from: "from-pink-500",    to: "to-rose-400",    glow: "rgba(244,63,94,0.45)",    ring: "#f43f5e" };
  if (price <= 500)  return { label: "Pro",     from: "from-fuchsia-500", to: "to-pink-400",    glow: "rgba(217,70,239,0.45)",   ring: "#d946ef" };
  if (price <= 1500) return { label: "Elite",   from: "from-violet-500",  to: "to-fuchsia-400", glow: "rgba(139,92,246,0.45)",   ring: "#8b5cf6" };
  return                     { label: "Legend", from: "from-amber-500",   to: "to-yellow-400",  glow: "rgba(245,158,11,0.55)",   ring: "#f59e0b" };
}

// ─── API ─────────────────────────────────────────────────
async function fetchCat(cat: string): Promise<Product[]> {
  const r = await fetch(`/api/products?category=${cat}`, { credentials: "include" });
  if (!r.ok) return [];
  const data: Product[] = await r.json();
  return data.filter(p => p.active);
}
async function placeOrder(productId: number, targetInfo: string): Promise<any> {
  const r = await fetch("/api/orders", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, targetInfo, quantity: 1 }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e: any = new Error(d.error || "Error"); e.data = d; throw e; }
  return d;
}
async function fetchOrders(): Promise<any[]> {
  const r = await fetch("/api/orders", { credentials: "include" });
  if (!r.ok) return [];
  return r.json();
}

// ─── Animated Counter ─────────────────────────────────────
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const id = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(cur);
      if (cur >= target) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [target]);
  return <span>{formatSDG(val)}{suffix}</span>;
}

// ─── Circular Progress Ring ───────────────────────────────
function RingChart({ pct, color, size = 56, label }: { pct: number; color: string; size?: number; label: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth="6" fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <span className="text-[10px] text-pink-300/70 font-bold text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────
function MiniBarChart({ products }: { products: Product[] }) {
  const ucProducts = products.filter(p => extractUC(p.name) > 0).slice(0, 6);
  if (ucProducts.length < 2) return null;
  const maxUc = Math.max(...ucProducts.map(p => extractUC(p.name)));
  const COLORS = ["#f472b6", "#e879f9", "#a78bfa", "#fb923c", "#34d399", "#60a5fa"];
  return (
    <div className="rounded-2xl bg-white/5 border border-pink-800/30 p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-pink-400" />
        <span className="text-white font-black text-sm">مقارنة الباقات</span>
      </div>
      <div className="flex items-end gap-2 h-20">
        {ucProducts.map((p, i) => {
          const h = Math.max(8, (extractUC(p.name) / maxUc) * 72);
          return (
            <div key={p.id} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }} animate={{ height: h }}
                transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                style={{ backgroundColor: COLORS[i % COLORS.length], borderRadius: 4 }}
                className="w-full"
              />
              <span className="text-[9px] text-pink-400/70 font-bold truncate w-full text-center">
                {extractUC(p.name) >= 1000 ? `${(extractUC(p.name) / 1000).toFixed(1)}K` : extractUC(p.name)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-pink-400/50 text-center mt-1">UC per package</div>
    </div>
  );
}

// ─── Recent Buyers Feed ───────────────────────────────────
const AVATARS = ["🎮", "👾", "🏆", "⚔️", "🔫", "🎯", "💎", "🌟"];
const NAMES = ["A***7", "M***3", "K***9", "S***1", "H***5", "Y***8", "R***2", "F***4"];
const PACKAGES = ["60 UC", "325 UC", "660 UC", "1800 UC", "3850 UC"];

function RecentBuyers() {
  const [idx, setIdx] = useState(0);
  const buyer = useMemo(() => ({
    avatar: AVATARS[idx % AVATARS.length],
    name: NAMES[idx % NAMES.length],
    pkg: PACKAGES[idx % PACKAGES.length],
    mins: [2, 5, 8, 12, 17, 23][idx % 6],
  }), [idx]);
  useEffect(() => {
    const id = setInterval(() => setIdx(i => i + 1), 3800);
    return () => clearInterval(id);
  }, []);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-2 bg-white/5 border border-pink-800/30 rounded-full px-3 py-1.5"
      >
        <span className="text-base">{buyer.avatar}</span>
        <span className="text-[11px] text-pink-200/80 font-bold">
          <span className="text-white">{buyer.name}</span> اشترى <span className="text-pink-300">{buyer.pkg}</span>
        </span>
        <span className="text-[10px] text-pink-400/60 mr-auto">منذ {buyer.mins} دقيقة</span>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Skeleton Card ────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-pink-800/20 h-28">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ─── VIP Progress ─────────────────────────────────────────
function VIPProgress({ count }: { count: number }) {
  const tiers = [
    { name: "Bronze", min: 0,  max: 5,  color: "#d97706" },
    { name: "Silver", min: 5,  max: 10, color: "#94a3b8" },
    { name: "Gold",   min: 10, max: 20, color: "#eab308" },
    { name: "Diamond",min: 20, max: 999,color: "#d946ef" },
  ];
  const cur = tiers.find(t => count >= t.min && count < t.max) ?? tiers[3]!;
  const nxt = tiers[tiers.indexOf(cur) + 1];
  const pct = nxt ? Math.min(100, ((count - cur.min) / (nxt.min - cur.min)) * 100) : 100;
  return (
    <div className="rounded-2xl bg-white/5 border border-pink-800/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4" style={{ color: cur.color }} />
          <span className="font-black text-white text-sm">VIP Status</span>
        </div>
        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: cur.color + "33", border: `1px solid ${cur.color}55` }}>
          {cur.name}
        </span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 mb-1.5">
        <motion.div
          className="h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ backgroundColor: cur.color }}
        />
      </div>
      {nxt
        ? <p className="text-[10px] text-pink-400/70">{nxt.min - count} شراء للوصول إلى <span className="font-black" style={{ color: nxt.color }}>{nxt.name}</span></p>
        : <p className="text-[10px] font-black" style={{ color: cur.color }}>أعلى مستوى — Diamond VIP 💎</p>
      }
    </div>
  );
}

// ─── Confetti ─────────────────────────────────────────────
function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i, x: Math.random() * 100,
    color: ["#f472b6", "#fb7185", "#e879f9", "#fbbf24", "#a78bfa", "#34d399"][i % 6],
    delay: Math.random() * 0.8, dur: 2.2 + Math.random() * 1.4,
  })), []);
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <motion.div key={p.id} className="absolute w-2 h-3 rounded-sm"
          style={{ left: `${p.x}%`, top: -20, backgroundColor: p.color }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: "110vh", rotate: 720, opacity: [1, 1, 0] }}
          transition={{ duration: p.dur, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function PubgTopup() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, refetchOnWindowFocus: false } });
  const { data: dashboard } = useGetMyDashboard({ query: { queryKey: getGetMyDashboardQueryKey(), enabled: !!me, refetchInterval: 10000 } });
  const balance = Number(dashboard?.wallet?.balance ?? 0);

  // Products
  const q0 = useQuery({ queryKey: ["ptop", "pubg-uc"],     queryFn: () => fetchCat("pubg-uc"),     staleTime: 30000 });
  const q1 = useQuery({ queryKey: ["ptop", "pubg-rp"],     queryFn: () => fetchCat("pubg-rp"),     staleTime: 30000 });
  const q2 = useQuery({ queryKey: ["ptop", "pubg-prime"],  queryFn: () => fetchCat("pubg-prime"),  staleTime: 30000 });
  const q3 = useQuery({ queryKey: ["ptop", "pubg-offers"], queryFn: () => fetchCat("pubg-offers"), staleTime: 30000 });
  const isLoading = q0.isLoading;
  const ucProducts  = q0.data ?? [];
  const rpProducts  = q1.data ?? [];
  const otherProds  = [...(q2.data ?? []), ...(q3.data ?? [])];
  const allProducts = useMemo(() => [...ucProducts, ...rpProducts, ...otherProds], [ucProducts, rpProducts, otherProds]);

  // Orders
  const { data: userOrders = [] } = useQuery({ queryKey: ["user-orders"], queryFn: fetchOrders, enabled: !!me, staleTime: 60000 });
  const orderCount = userOrders.length;

  // Best value
  const bestValueId = useMemo(() => {
    if (!ucProducts.length) return null;
    return ucProducts.reduce((a, b) => ucPerSdg(b) > ucPerSdg(a) ? b : a).id;
  }, [ucProducts]);

  // State
  const [selected, setSelected] = useState<Product | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [playerValid, setPlayerValid] = useState(false);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState<"uc" | "rp" | "other">("uc");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // UC counter animation
  const [ucAnim, setUcAnim] = useState(0);
  useEffect(() => {
    if (!selected) { setUcAnim(0); return; }
    const target = extractUC(selected.name);
    if (!target) { setUcAnim(0); return; }
    let cur = 0; const step = Math.ceil(target / 36);
    const id = setInterval(() => { cur = Math.min(cur + step, target); setUcAnim(cur); if (cur >= target) clearInterval(id); }, 26);
    return () => clearInterval(id);
  }, [selected]);

  // Player ID validation
  const validateId = useCallback((v: string) => {
    setPlayerId(v);
    setPlayerValid(/^\d{5,}$/.test(v.trim()));
  }, []);

  // Order mutation
  const mutation = useMutation({
    mutationFn: ({ productId, targetInfo }: { productId: number; targetInfo: string }) => placeOrder(productId, targetInfo),
    onMutate: () => { setCheckoutState("verifying"); setTimeout(() => setCheckoutState("processing"), 1400); },
    onSuccess: (data) => {
      setTimeout(() => {
        setCheckoutState("done");
        setOrderId(data?.order?.id ?? data?.id ?? null);
        setError(null);
        qc.invalidateQueries({ queryKey: ["user-orders"] });
        qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
        if ((orderCount + 1) % 5 === 0) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4800); }
      }, 1200);
    },
    onError: (err: any) => { setCheckoutState("idle"); setError(err?.data?.error ?? err?.message ?? "فشل الشراء"); },
  });

  function handleSelect(p: Product) {
    if (!me) { setLocation("/login"); return; }
    setSelected(prev => prev?.id === p.id ? null : p);
    setError(null);
  }

  function handleBuy() {
    if (!selected) { setError("اختر باقة أولاً"); return; }
    if (!playerValid) { setError("أدخل Player ID صحيح (5 أرقام على الأقل)"); return; }
    if (balance < Number(selected.price)) { setError("رصيدك غير كافٍ — اشحن محفظتك أولاً"); return; }
    setError(null);
    mutation.mutate({ productId: selected.id, targetInfo: playerId.trim() });
  }

  function reset() {
    setSelected(null); setPlayerId(""); setPlayerValid(false);
    setError(null); setCheckoutState("idle"); setOrderId(null); mutation.reset();
  }

  const selPrice = selected ? Number(selected.price) : 0;
  const selOld = selected?.oldPrice ? Number(selected.oldPrice) : null;
  const selTier = selected ? getTierConfig(selPrice) : null;
  const viewerCount = useMemo(() => { const h = new Date().getHours(); return (h >= 17 && h <= 22) ? 87 + Math.floor(Math.random() * 120) : 34 + Math.floor(Math.random() * 60); }, []);
  const displayProducts = activeTab === "uc" ? ucProducts : activeTab === "rp" ? rpProducts : otherProds;

  const faqs = [
    { id: "how", q: "كيف أشحن UC؟", a: "اختر الباقة، أدخل Player ID (من الإعدادات داخل اللعبة)، ثم اضغط شراء. يتم الشحن خلال 30 دقيقة." },
    { id: "id",  q: "أين أجد Player ID؟", a: "افتح PUBG Mobile ← الإعدادات ← الملف الشخصي. ستجد ID مكوّن من أرقام." },
    { id: "guar",q: "هل الشحن مضمون؟",    a: "نعم، مضمون 100%. في حال أي مشكلة نرد كامل المبلغ أو نعيد الشحن." },
    { id: "time", q: "كم وقت التسليم؟",    a: "خلال 30 دقيقة في الأوقات العادية، وقد يصل لساعة في أوقات الذروة." },
  ];

  return (
    <AppLayout>
      {showConfetti && <Confetti />}

      {/* ══ HERO ══════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ minHeight: 260 }}>
        <img src="/games/pubg.jpg" alt="PUBG Mobile" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.3),transparent_55%)]" />

        {/* Floating particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div key={i}
            className="absolute rounded-full bg-pink-400 pointer-events-none"
            style={{ left: `${(i * 17 + 5) % 100}%`, top: `${(i * 23 + 10) % 80}%`, width: 2 + (i % 3), height: 2 + (i % 3), opacity: 0.3 }}
            animate={{ y: [-6, 6, -6], opacity: [0.15, 0.4, 0.15] }}
            transition={{ duration: 7 + i * 0.8, delay: i * 0.5, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* Nav */}
        <div className="relative flex items-center justify-between px-4 pt-4">
          <Link href="/game/pubg" className="flex items-center gap-1.5 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full border border-white/20 text-white text-xs font-bold active:scale-95">
            <ChevronRight className="w-3.5 h-3.5" /> PUBG Mobile
          </Link>
          {me && (
            <div className="flex items-center gap-1.5 bg-pink-500/25 backdrop-blur px-3 py-1.5 rounded-full border border-pink-400/40 text-white text-xs font-black">
              <Wallet className="w-3.5 h-3.5 text-pink-300" />
              <AnimatedNumber target={balance} /> <span className="opacity-70">ج.س</span>
            </div>
          )}
        </div>

        {/* Title block */}
        <div className="relative text-center px-4 pt-5 pb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/25 border border-pink-400/40 text-pink-200 text-[10px] font-black uppercase tracking-widest mb-3">
            <Sparkles className="w-3 h-3" /> Ovelin Premium
          </div>
          <h1 className="text-3xl font-black text-white leading-tight" style={{ textShadow: "0 2px 24px rgba(244,63,94,0.5)" }}>
            شحن UC ببجي
          </h1>
          <p className="text-pink-200/70 text-sm mt-1.5">شحن مباشر عبر Player ID — خلال 30 دقيقة</p>

          {/* Live badge */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-[11px] text-pink-200/70 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <Eye className="w-3 h-3" /> {viewerCount} يشاهد الآن
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-pink-200/70 font-bold">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> بائع موثوق
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-pink-200/70 font-bold">
              <Users className="w-3 h-3 text-pink-300" /> +15K عميل
            </div>
          </div>
        </div>
      </div>

      {/* ══ CONTENT ══════════════════════════════════════ */}
      <div className="bg-zinc-950 min-h-screen px-4 pb-24">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-2 -mt-5 relative z-10 mb-5">
          {[
            { icon: <Star className="w-4 h-4 text-yellow-400" />, val: "98%", label: "رضى العملاء" },
            { icon: <Zap className="w-4 h-4 text-pink-400" />,    val: "30د", label: "أقصى وقت" },
            { icon: <BadgeCheck className="w-4 h-4 text-emerald-400" />, val: "100%", label: "ضمان" },
            { icon: <TrendingUp className="w-4 h-4 text-violet-400" />, val: "+15K", label: "عملية" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              className="rounded-2xl bg-white/5 border border-pink-800/30 py-3 flex flex-col items-center gap-1"
            >
              {s.icon}
              <span className="text-white font-black text-sm">{s.val}</span>
              <span className="text-[9px] text-pink-400/60 text-center">{s.label}</span>
            </motion.div>
          ))}
        </div>

        {/* ── Recent Buyers ── */}
        {me && <div className="mb-4"><RecentBuyers /></div>}

        {/* ── VIP Progress ── */}
        {me && orderCount > 0 && <div className="mb-4"><VIPProgress count={orderCount} /></div>}

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-4">
          {[
            { id: "uc" as const, label: "شدات UC", icon: "⚡" },
            { id: "rp" as const, label: "Royale Pass", icon: "👑" },
            { id: "other" as const, label: "عروض", icon: "🎁" },
          ].map(tab => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => { setActiveTab(tab.id); setSelected(null); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-sm transition-all border ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white border-pink-500 shadow-[0_4px_20px_rgba(236,72,153,0.4)]"
                  : "bg-white/5 text-pink-400 border-pink-800/30"
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </motion.button>
          ))}
        </div>

        {/* ── Package Cards ── */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-pink-500 to-fuchsia-500" />
            <span className="text-white font-black text-sm">اختر الباقة</span>
            {selected && (
              <span className="mr-auto text-[11px] text-pink-400 font-bold">تم الاختيار ✓</span>
            )}
          </div>

          {isLoading && (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!isLoading && displayProducts.length === 0 && (
            <div className="text-center py-12 text-pink-400/60">
              <span className="text-4xl block mb-3">📦</span>
              <div className="font-bold text-sm">لا توجد باقات متاحة حالياً</div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {displayProducts.map((p, i) => {
              const price = Number(p.price);
              const old = p.oldPrice ? Number(p.oldPrice) : null;
              const disc = old && old > price ? discountPct(price, old) : 0;
              const uc = extractUC(p.name);
              const tier = getTierConfig(price);
              const isSelected = selected?.id === p.id;
              const isBest = p.id === bestValueId;
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: "spring", stiffness: 280, damping: 22 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelect(p)}
                  className={`relative overflow-hidden rounded-2xl border-2 text-left transition-all ${
                    isSelected
                      ? "border-pink-500 shadow-[0_0_24px_rgba(236,72,153,0.5)] scale-[1.02]"
                      : "border-white/10 hover:border-pink-700/60"
                  }`}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, rgba(236,72,153,0.25), rgba(168,85,247,0.18))`
                      : "rgba(255,255,255,0.04)",
                  }}
                >
                  {/* PUBG circular logo top-right */}
                  <div className="absolute top-2 right-2 w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
                    <img src="/games/pubg.jpg" alt="PUBG" className="w-full h-full object-cover" />
                  </div>

                  {/* Badges */}
                  {isBest && (
                    <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-[8px] font-black text-black px-1.5 py-0.5 rounded-full">
                      <Star className="w-2 h-2" /> أفضل قيمة
                    </div>
                  )}
                  {disc > 0 && (
                    <div className="absolute top-2 left-2 bg-red-500 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full">
                      -{disc}%
                    </div>
                  )}

                  <div className="p-3 pt-4 pb-3">
                    {/* UC amount large */}
                    {uc > 0 ? (
                      <div className="mt-3">
                        <div className={`text-2xl font-black bg-gradient-to-r ${tier.from} ${tier.to} bg-clip-text text-transparent`}>
                          {fmtSDG(uc)}
                        </div>
                        <div className="text-[10px] text-pink-400/70 font-bold">UC شدات</div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <div className="text-sm font-black text-white leading-tight">{p.name}</div>
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-lg font-black text-white">{formatSDG(price)}</span>
                      <span className="text-[10px] text-pink-400/70">ج.س</span>
                      {old && old > price && (
                        <span className="text-[10px] text-slate-500 line-through">{formatSDG(old)}</span>
                      )}
                    </div>

                    {/* Tier label */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ color: tier.ring, backgroundColor: tier.ring + "22", border: `1px solid ${tier.ring}44` }}>
                        {tier.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />}
                    </div>
                  </div>

                  {/* Bottom popularity bar */}
                  {p.salesCount && p.salesCount > 0 ? (
                    <div className="px-3 pb-2">
                      <div className="flex items-center justify-between text-[9px] text-pink-400/50 mb-0.5">
                        <span>رواج</span><span>{Math.min(99, p.salesCount * 3)}%</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/10">
                        <motion.div
                          className={`h-1 rounded-full bg-gradient-to-r ${tier.from} ${tier.to}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(99, p.salesCount * 3)}%` }}
                          transition={{ duration: 1, delay: i * 0.06 }}
                        />
                      </div>
                    </div>
                  ) : null}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Selected Package Detail ── */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="rounded-2xl border border-pink-500/40 overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.12), rgba(168,85,247,0.08))" }}>

                {/* UC animated count */}
                {ucAnim > 0 && (
                  <div className="text-center pt-4 pb-2">
                    <div className="text-[11px] text-pink-400/70 font-bold mb-1">ستحصل على</div>
                    <div className={`text-4xl font-black bg-gradient-to-r ${selTier?.from} ${selTier?.to} bg-clip-text text-transparent`}>
                      {fmtSDG(ucAnim)}
                    </div>
                    <div className="text-pink-300/70 text-sm font-black">UC شدة</div>
                  </div>
                )}

                {/* Price breakdown */}
                <div className="px-4 py-3 flex items-center justify-between border-t border-pink-800/30">
                  <div>
                    <div className="text-[11px] text-pink-400/70">الإجمالي</div>
                    <div className="text-2xl font-black text-white">{formatSDG(selPrice)} <span className="text-sm text-pink-400/70">ج.س</span></div>
                    {selOld && selOld > selPrice && (
                      <div className="text-[10px] text-emerald-400 font-bold">وفرت {formatSDG(selOld - selPrice)} ج.س 🎉</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-pink-400/70">رصيدك</div>
                    <div className={`text-lg font-black ${balance >= selPrice ? "text-emerald-400" : "text-red-400"}`}>
                      {formatSDG(balance)} ج.س
                    </div>
                  </div>
                </div>

                {/* Balance bar */}
                <div className="px-4 pb-3">
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className={`h-2 rounded-full ${balance >= selPrice ? "bg-gradient-to-r from-emerald-500 to-green-400" : "bg-gradient-to-r from-red-500 to-rose-400"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (balance / Math.max(balance, selPrice)) * 100)}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  {balance < selPrice && (
                    <p className="text-[10px] text-red-400 mt-1 font-bold">ناقص {formatSDG(selPrice - balance)} ج.س</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Player ID Input ── */}
        <AnimatePresence>
          {selected && checkoutState === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4"
            >
              <div className="rounded-2xl bg-white/5 border border-pink-800/30 p-4">
                <label className="text-white font-black text-sm block mb-3 flex items-center gap-2">
                  <span className="text-lg">🎮</span> Player ID
                </label>
                <div className="relative">
                  <input
                    type="text" inputMode="numeric"
                    value={playerId}
                    onChange={e => validateId(e.target.value)}
                    placeholder="أدخل Player ID من اللعبة..."
                    className={`w-full bg-white/5 border-2 rounded-xl px-4 py-3 text-white font-black text-sm outline-none transition-all placeholder-pink-400/40 ${
                      playerValid ? "border-emerald-500" : playerId.length > 0 ? "border-red-500/60" : "border-pink-800/50 focus:border-pink-500"
                    }`}
                  />
                  {playerValid && (
                    <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  )}
                  {!playerValid && playerId.length > 0 && (
                    <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                  )}
                </div>
                <p className="text-[10px] text-pink-400/50 mt-2 flex items-center gap-1">
                  <span>💡</span> من اللعبة: الإعدادات ← الملف الشخصي ← ID
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 flex items-start gap-2 p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Checkout States ── */}
        {checkoutState === "verifying" && (
          <div className="mb-4 rounded-2xl bg-violet-950/60 border border-violet-500/40 p-4 flex items-center gap-3 text-violet-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            <div>
              <div className="font-black text-sm text-white">جاري التحقق...</div>
              <div className="text-[11px] opacity-70">نتحقق من Player ID والرصيد</div>
            </div>
          </div>
        )}
        {checkoutState === "processing" && (
          <div className="mb-4 rounded-2xl bg-pink-950/60 border border-pink-500/40 p-4 flex items-center gap-3 text-pink-300">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <RefreshCw className="w-5 h-5" />
            </motion.div>
            <div>
              <div className="font-black text-sm text-white">جاري إرسال الطلب...</div>
              <div className="text-[11px] opacity-70">تجهيز الشحن لحسابك</div>
            </div>
          </div>
        )}

        {/* ── Success Card ── */}
        <AnimatePresence>
          {checkoutState === "done" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="mb-4 rounded-2xl overflow-hidden border border-emerald-500/40"
              style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))" }}
            >
              <div className="p-6 text-center">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
                  <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
                </motion.div>
                <div className="text-xl font-black text-white mb-1">تم الشراء بنجاح! 🎉</div>
                <div className="text-sm text-emerald-300/80">سيتم شحن UC خلال 30 دقيقة</div>
                {orderId && <div className="text-[11px] text-pink-400/60 mt-2">رقم الطلب: #{orderId}</div>}
                <div className="flex gap-2 mt-5">
                  <Link href="/orders" className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-bold text-sm text-center border border-white/20">
                    تتبع الطلب <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
                  </Link>
                  <button onClick={reset} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white font-bold text-sm border border-pink-400">
                    شحن مجدداً
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Buy Button ── */}
        {checkoutState === "idle" && (
          <div className="mb-5">
            <motion.button
              whileTap={!mutation.isPending ? { scale: 0.97 } : undefined}
              onClick={handleBuy}
              disabled={mutation.isPending || !selected}
              className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 border-2 mb-3 transition-all ${
                !selected
                  ? "bg-white/5 border-pink-800/30 text-pink-400/40 cursor-not-allowed"
                  : "bg-gradient-to-r from-pink-600 to-fuchsia-600 border-pink-400 text-white shadow-[0_8px_32px_rgba(236,72,153,0.5)]"
              }`}
            >
              <Zap className="w-5 h-5" /> {selected ? `شحن ${selected.name} الآن` : "اختر باقة أولاً"}
            </motion.button>

            {selected && balance < selPrice && (
              <Link href="/wallet" className="w-full py-3 rounded-2xl bg-white/5 border border-pink-800/40 text-pink-300 font-bold text-sm flex items-center justify-center gap-2">
                <Wallet className="w-4 h-4" /> اشحن المحفظة — تحتاج {formatSDG(selPrice - balance)} ج.س إضافية
              </Link>
            )}
          </div>
        )}

        {/* ── Charts & Analytics ── */}
        {ucProducts.length > 1 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-gradient-to-b from-pink-500 to-fuchsia-500" />
              <span className="text-white font-black text-sm">تحليل الباقات</span>
            </div>
            <MiniBarChart products={ucProducts} />
          </div>
        )}

        {/* ── Ring Stats ── */}
        <div className="rounded-2xl bg-white/5 border border-pink-800/30 p-4 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-white font-black text-sm">إحصائيات المتجر</span>
          </div>
          <div className="flex justify-around">
            <RingChart pct={98} color="#f472b6" size={64} label="رضى العملاء" />
            <RingChart pct={96} color="#a78bfa" size={64} label="توصيل في الوقت" />
            <RingChart pct={100} color="#34d399" size={64} label="أكواد أصلية" />
            <RingChart pct={87} color="#fb923c" size={64} label="تكرار الشراء" />
          </div>
        </div>

        {/* ── FAQs ── */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-gradient-to-b from-pink-500 to-fuchsia-500" />
            <span className="text-white font-black text-sm">أسئلة شائعة</span>
          </div>
          <div className="space-y-2">
            {faqs.map(faq => (
              <div key={faq.id} className="rounded-xl overflow-hidden border border-pink-800/30">
                <button
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-white/5 text-white font-black text-sm text-right"
                >
                  <span>{faq.q}</span>
                  {openFaq === faq.id ? <ChevronUp className="w-4 h-4 text-pink-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-pink-400 shrink-0" />}
                </button>
                <AnimatePresence>
                  {openFaq === faq.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 py-3 text-pink-200/70 text-sm leading-relaxed border-t border-pink-800/20">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust Badges ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "🔒", title: "دفع آمن", desc: "رصيد محفوظ" },
            { icon: "⚡", title: "تسليم سريع", desc: "خلال 30 دقيقة" },
            { icon: "💯", title: "مضمون 100%", desc: "أو استرداد كامل" },
          ].map(b => (
            <div key={b.title} className="rounded-2xl bg-white/5 border border-pink-800/30 p-3 text-center">
              <div className="text-2xl mb-1">{b.icon}</div>
              <div className="text-white font-black text-[11px]">{b.title}</div>
              <div className="text-pink-400/60 text-[10px]">{b.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
