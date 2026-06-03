// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// ============================================================

import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Wallet, Loader2, AlertCircle, CheckCircle2,
  Copy, ShieldCheck, Zap, Crown, Star, Gift, Swords,
  KeyRound, Sparkles, Clock, ChevronDown, ChevronUp,
  Trophy, Lock, BadgeCheck, ArrowRight, Flame, BarChart3,
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
type CodesTab = "uc" | "rp" | "event" | "gift";

// ─── Tabs Config ─────────────────────────────────────────
const TABS: { id: CodesTab; label: string; emoji: string; category: string; desc: string }[] = [
  { id: "uc",    label: "UC",          emoji: "⚡", category: "pubg-codes-uc",    desc: "أكواد شدات UC" },
  { id: "rp",    label: "Royale Pass", emoji: "👑", category: "pubg-codes-rp",    desc: "باس الملوك" },
  { id: "event", label: "أحداث",       emoji: "🎯", category: "pubg-codes-event", desc: "أكواد الأحداث" },
  { id: "gift",  label: "هدايا",       emoji: "🎁", category: "pubg-codes-gift",  desc: "أكواد الهدايا" },
];

// ─── Helpers ─────────────────────────────────────────────
function fmtSDG(n: number) { return n.toLocaleString("en-US"); }
function formatSDG(n: number) { return Math.floor(n).toLocaleString("en-US") + ",00"; }
function discountPct(price: number, old: number) { return Math.round(((old - price) / old) * 100); }

// ─── API ─────────────────────────────────────────────────
async function fetchByCategory(category: string): Promise<Product[]> {
  const res = await fetch(`/api/products?category=${encodeURIComponent(category)}`, { credentials: "include" });
  if (!res.ok) return [];
  const data: Product[] = await res.json();
  return data.filter(p => p.active);
}
async function fetchStock(ids: number[]): Promise<Record<string, number>> {
  if (!ids.length) return {};
  const res = await fetch(`/api/products/stock?ids=${ids.join(",")}`, { credentials: "include" });
  if (!res.ok) return {};
  return res.json();
}
async function instantBuy(productId: number): Promise<{ code: string; codes: string[] }> {
  const res = await fetch("/api/orders/instant-buy", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity: 1 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const err: any = new Error(data?.error || `HTTP ${res.status}`); err.data = data; err.status = res.status; throw err; }
  return data;
}

// ─── Circular Ring ───────────────────────────────────────
function RingChart({ pct, color, size = 52, topLabel }: { pct: number; color: string; size?: number; topLabel: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90 absolute inset-0">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none" />
          <motion.circle cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth="5" fill="none" strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
            transition={{ duration: 1.3, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-black text-white">{pct}%</span>
        </div>
      </div>
      <span className="text-[9px] text-pink-400/60 font-bold text-center">{topLabel}</span>
    </div>
  );
}

// ─── Code Reveal Animation ───────────────────────────────
function CodeReveal({ code, onCopy, copied, onReset }: { code: string; onCopy: () => void; copied: boolean; onReset: () => void }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRevealed(true), 400); return () => clearTimeout(t); }, []);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl overflow-hidden border border-pink-500/40 mb-4"
      style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.12), rgba(168,85,247,0.08))" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600/50 to-fuchsia-600/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </motion.div>
          <span className="text-white font-black text-sm">تم التسليم بنجاح! 🎉</span>
        </div>
        <span className="text-pink-300 text-[10px] flex items-center gap-1">
          <Clock className="w-3 h-3" /> {new Date().toLocaleTimeString("ar-EG")}
        </span>
      </div>

      {/* Code box */}
      <div className="p-4">
        <div className="text-[10px] text-pink-400/70 font-black uppercase tracking-widest text-center mb-3">
          Redeem Code — PUBG Mobile
        </div>

        {/* Blurred until revealed */}
        <div className="relative bg-white/5 rounded-xl border border-pink-600/30 p-4 mb-4">
          <AnimatePresence>
            {!revealed && (
              <motion.div
                initial={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-white/5 rounded-xl backdrop-blur-sm z-10"
              >
                <div className="text-pink-300 font-black text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" /> اضغط لإظهار الكود
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div
            className="font-mono text-lg font-black text-center text-pink-200 tracking-[0.2em] break-all cursor-pointer"
            onClick={() => setRevealed(true)}
            style={{ filter: revealed ? "none" : "blur(8px)" }}
          >
            {code}
          </div>
        </div>

        {/* Copy button */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onCopy}
          className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 border-2 transition-all ${
            copied
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-gradient-to-r from-pink-600 to-fuchsia-600 border-pink-400 text-white shadow-[0_6px_24px_rgba(236,72,153,0.4)]"
          }`}
        >
          {copied ? <><CheckCircle2 className="w-4 h-4" /> تم النسخ!</> : <><Copy className="w-4 h-4" /> نسخ الكود</>}
        </motion.button>

        {/* Instructions */}
        <div className="mt-4 rounded-xl bg-white/5 border border-pink-800/20 p-3">
          <div className="text-[10px] text-pink-400 font-black mb-2 flex items-center gap-1">
            <span>📱</span> طريقة الاستخدام
          </div>
          {["افتح PUBG Mobile", "الإعدادات ← استرداد الكود", "أدخل الكود واضغط تأكيد"].map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-pink-200/70 mb-1">
              <span className="w-4 h-4 rounded-full bg-pink-500/30 text-pink-300 font-black flex items-center justify-center text-[9px] shrink-0">{i + 1}</span>
              {step}
            </div>
          ))}
        </div>

        <button onClick={onReset} className="w-full mt-3 py-2.5 rounded-xl bg-white/5 border border-pink-800/30 text-pink-400 font-bold text-sm">
          شراء كود آخر
        </button>
      </div>
    </motion.div>
  );
}

// ─── Skeleton ────────────────────────────────────────────
function SkeletonChip() {
  return (
    <div className="relative overflow-hidden h-28 rounded-2xl bg-white/5 border border-pink-800/20">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function PubgCodes() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<CodesTab>("uc");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deliveredCode, setDeliveredCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false, refetchOnWindowFocus: false } });
  const { data: dashboard } = useGetMyDashboard({ query: { queryKey: getGetMyDashboardQueryKey(), enabled: !!me, refetchInterval: 10000 } });
  const balance = Number(dashboard?.wallet?.balance ?? 0);

  const currentTab = TABS.find(t => t.id === activeTab)!;
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["pubg-codes", currentTab.category],
    queryFn: () => fetchByCategory(currentTab.category),
    staleTime: 30000,
  });

  const productIds = products.map(p => p.id);
  const { data: stock = {} } = useQuery({
    queryKey: ["pubg-codes-stock", productIds.join(",")],
    queryFn: () => fetchStock(productIds),
    enabled: productIds.length > 0,
    refetchInterval: 15000,
  });

  const buyMutation = useMutation({
    mutationFn: (productId: number) => instantBuy(productId),
    onSuccess: data => {
      setDeliveredCode(data.code ?? data.codes?.[0] ?? "");
      setError(null);
      qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
      qc.invalidateQueries({ queryKey: ["pubg-codes-stock"] });
    },
    onError: (err: any) => setError(err?.data?.error ?? err?.message ?? "فشل الشراء"),
  });

  function handleSelect(p: Product) {
    if (!me) { setLocation("/login"); return; }
    if ((stock[String(p.id)] ?? 0) === 0) return;
    setSelectedProduct(prev => prev?.id === p.id ? null : p);
    setError(null); setDeliveredCode(null); setCopied(false);
  }

  function handleBuy() {
    if (!selectedProduct) { setError("اختر الكود أولاً"); return; }
    if (balance < Number(selectedProduct.price)) { setError("رصيدك غير كافٍ — اشحن المحفظة أولاً"); return; }
    setError(null);
    buyMutation.mutate(selectedProduct.id);
  }

  function resetAll() {
    setSelectedProduct(null); setDeliveredCode(null);
    setError(null); setCopied(false); buyMutation.reset();
  }

  function copyCode() {
    if (!deliveredCode) return;
    navigator.clipboard.writeText(deliveredCode);
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  }

  const selectedPrice = selectedProduct ? Number(selectedProduct.price) : 0;
  const selectedOld = selectedProduct?.oldPrice ? Number(selectedProduct.oldPrice) : null;
  const canAfford = balance >= selectedPrice;
  const totalStock = Object.values(stock).reduce((s, v) => s + v, 0);

  const faqs = [
    { id: "what",  q: "ما هو كود الاسترداد؟",    a: "هو كود يمكنك إدخاله في PUBG Mobile للحصول على UC أو Royale Pass مباشرةً، بدون الحاجة لـ Player ID." },
    { id: "how",   q: "كيف أستخدم الكود؟",        a: "افتح PUBG Mobile ← الإعدادات ← استرداد الكود ← أدخل الكود واضغط تأكيد. يُضاف المحتوى فوراً." },
    { id: "once",  q: "هل يُستخدم مرة واحدة؟",    a: "نعم، كل كود يُستخدم مرة واحدة فقط ولشخص واحد. الكود لا يقبل التكرار." },
    { id: "guar",  q: "ماذا لو لم يعمل الكود؟",   a: "تواصل معنا فوراً وسنستبدل الكود أو نرد المبلغ كاملاً خلال 24 ساعة." },
  ];

  return (
    <AppLayout>

      {/* ══ HERO ══════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ minHeight: 230 }}>
        <img src="/games/pubg.jpg" alt="PUBG Mobile" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(236,72,153,0.35),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.2),transparent_55%)]" />

        {/* Floating particles */}
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div key={i}
            className="absolute rounded-full bg-pink-300 pointer-events-none"
            style={{ left: `${(i * 19 + 8) % 100}%`, top: `${(i * 29 + 5) % 85}%`, width: 2 + (i % 2), height: 2 + (i % 2), opacity: 0.25 }}
            animate={{ y: [-5, 5, -5], opacity: [0.1, 0.35, 0.1] }}
            transition={{ duration: 6 + i, delay: i * 0.6, repeat: Infinity, ease: "easeInOut" }}
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
              {formatSDG(balance)} <span className="opacity-60">ج.س</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="relative text-center px-4 pt-5 pb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/25 border border-pink-400/40 text-pink-200 text-[10px] font-black uppercase tracking-widest mb-3">
            <KeyRound className="w-3 h-3" /> Instant Delivery
          </div>
          <h1 className="text-3xl font-black text-white leading-tight" style={{ textShadow: "0 2px 24px rgba(244,63,94,0.5)" }}>
            أكواد ببجي
          </h1>
          <p className="text-pink-200/70 text-sm mt-1.5">استرداد UC داخل اللعبة — تسليم فوري بعد الدفع</p>

          {/* Badges row */}
          <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
            {[
              { icon: <Zap className="w-3 h-3 text-yellow-400" />, label: "فوري" },
              { icon: <Lock className="w-3 h-3 text-emerald-400" />, label: "مرة واحدة" },
              { icon: <BadgeCheck className="w-3 h-3 text-blue-400" />, label: "أصلي 100%" },
              { icon: <ShieldCheck className="w-3 h-3 text-pink-300" />, label: "مضمون" },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-white/90 text-[10px] font-bold">
                {b.icon} {b.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ CONTENT ══════════════════════════════════════ */}
      <div className="bg-zinc-950 min-h-screen px-4 pb-24">

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-3 gap-2 -mt-5 relative z-10 mb-5">
          {[
            { icon: <Trophy className="w-4 h-4 text-yellow-400" />, val: "+10K", label: "عميل" },
            { icon: <Zap className="w-4 h-4 text-pink-400" />,       val: "فوري", label: "تسليم" },
            { icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />, val: "100%", label: "ضمان" },
          ].map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl bg-white/5 border border-pink-800/30 py-3 flex flex-col items-center gap-1"
            >
              {s.icon}
              <span className="text-white font-black text-sm">{s.val}</span>
              <span className="text-[9px] text-pink-400/60">{s.label}</span>
            </motion.div>
          ))}
        </div>

        {/* ── Stock indicator ── */}
        {totalStock > 0 && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-[11px] font-black">{totalStock} كود متاح الآن</span>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="grid grid-cols-4 gap-1.5 mb-5">
          {TABS.map(tab => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => { setActiveTab(tab.id); setSelectedProduct(null); setError(null); setDeliveredCode(null); }}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl font-black text-xs transition-all border ${
                activeTab === tab.id
                  ? "bg-gradient-to-b from-pink-600 to-fuchsia-700 text-white border-pink-400 shadow-[0_4px_16px_rgba(236,72,153,0.4)]"
                  : "bg-white/5 text-pink-400 border-pink-800/30"
              }`}
            >
              <span className="text-base">{tab.emoji}</span>
              <span className="text-[10px]">{tab.label}</span>
            </motion.button>
          ))}
        </div>

        {/* ── Tab description ── */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-pink-500 to-fuchsia-500" />
          <span className="text-white font-black text-sm">{currentTab.desc}</span>
          <span className="mr-auto text-[11px] text-pink-400/60">
            {products.filter(p => (stock[String(p.id)] ?? 0) > 0).length} متاح
          </span>
        </div>

        {/* ── Product Cards Grid ── */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[...Array(4)].map((_, i) => <SkeletonChip key={i} />)}
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <div className="text-center py-14 text-pink-400/60 mb-5">
            <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <div className="font-bold text-sm">لا توجد أكواد في هذه الفئة حالياً</div>
            <div className="text-[11px] mt-1 opacity-70">جرب فئة أخرى أو تحقق لاحقاً</div>
          </div>
        )}

        {!isLoading && products.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {products.map((p, i) => {
              const avail = stock[String(p.id)] ?? 0;
              const outOfStock = avail === 0;
              const isSelected = selectedProduct?.id === p.id;
              const price = Number(p.price);
              const old = p.oldPrice ? Number(p.oldPrice) : null;
              const disc = old && old > price ? discountPct(price, old) : 0;

              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06, type: "spring", stiffness: 280, damping: 22 }}
                  whileTap={!outOfStock ? { scale: 0.95 } : undefined}
                  onClick={() => !outOfStock && handleSelect(p)}
                  disabled={outOfStock}
                  className={`relative overflow-hidden rounded-2xl border-2 text-left transition-all ${
                    outOfStock
                      ? "border-white/5 opacity-40 cursor-not-allowed"
                      : isSelected
                        ? "border-pink-500 shadow-[0_0_24px_rgba(236,72,153,0.45)] scale-[1.02]"
                        : "border-white/10 hover:border-pink-700/50"
                  }`}
                  style={{
                    background: isSelected
                      ? "linear-gradient(135deg,rgba(236,72,153,0.2),rgba(168,85,247,0.12))"
                      : "rgba(255,255,255,0.04)",
                  }}
                >
                  {/* Badges */}
                  {disc > 0 && !outOfStock && (
                    <div className="absolute top-2 right-2 bg-red-500 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full z-10">
                      -{disc}%
                    </div>
                  )}
                  {outOfStock && (
                    <div className="absolute top-2 right-2 bg-slate-700 text-[8px] font-black text-slate-300 px-1.5 py-0.5 rounded-full z-10">
                      نفد
                    </div>
                  )}
                  {!outOfStock && avail <= 3 && (
                    <div className="absolute top-2 right-2 bg-orange-500/90 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full z-10 flex items-center gap-0.5">
                      <Flame className="w-2 h-2" /> {avail} فقط
                    </div>
                  )}

                  <div className="p-3 pb-2">
                    {/* PUBG logo circular */}
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-500/40 shadow-lg mb-2">
                      <img src="/games/pubg.jpg" alt="PUBG" className="w-full h-full object-cover" />
                    </div>

                    <div className="text-white font-black text-[13px] leading-tight mb-1">{p.name}</div>
                    {p.deliveryTime && (
                      <div className="text-[9px] text-pink-400/60 flex items-center gap-0.5 mb-2">
                        <Zap className="w-2.5 h-2.5" /> {p.deliveryTime}
                      </div>
                    )}

                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-white">{formatSDG(price)}</span>
                      <span className="text-[10px] text-pink-400/60">ج.س</span>
                    </div>
                    {old && old > price && (
                      <span className="text-[10px] text-slate-500 line-through">{formatSDG(old)} ج.س</span>
                    )}
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="px-3 pb-2">
                      <div className="flex items-center gap-1 text-[10px] text-pink-300 font-black">
                        <CheckCircle2 className="w-3 h-3" /> تم الاختيار
                      </div>
                    </div>
                  )}

                  {/* Stock bar */}
                  {!outOfStock && avail > 0 && (
                    <div className="px-3 pb-3">
                      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-1 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, avail * 20)}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                        />
                      </div>
                      <div className="text-[9px] text-pink-400/50 mt-0.5">{avail} متبقٍ</div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* ── Selected Detail ── */}
        <AnimatePresence>
          {selectedProduct && !deliveredCode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="rounded-2xl border border-pink-500/30 p-4"
                style={{ background: "linear-gradient(135deg,rgba(236,72,153,0.1),rgba(168,85,247,0.06))" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-black">{selectedProduct.name}</div>
                    {selectedProduct.deliveryTime && (
                      <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <Zap className="w-3 h-3" /> {selectedProduct.deliveryTime}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">{formatSDG(selectedPrice)}</div>
                    <div className="text-[10px] text-pink-400/60">ج.س</div>
                    {selectedOld && selectedOld > selectedPrice && (
                      <div className="text-[10px] text-emerald-400 font-bold">وفرت {formatSDG(selectedOld - selectedPrice)} ج.س</div>
                    )}
                  </div>
                </div>

                {/* Balance check */}
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-pink-400/60">رصيدك الحالي</span>
                  <span className={`font-black ${canAfford ? "text-emerald-400" : "text-red-400"}`}>
                    {formatSDG(balance)} ج.س
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className={`h-2 rounded-full ${canAfford ? "bg-gradient-to-r from-emerald-500 to-green-400" : "bg-gradient-to-r from-red-500 to-rose-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (balance / Math.max(balance, selectedPrice)) * 100)}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                {!canAfford && (
                  <p className="text-[10px] text-red-400 mt-1.5 font-bold">ناقص {formatSDG(selectedPrice - balance)} ج.س</p>
                )}
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

        {/* ── Delivered Code ── */}
        {deliveredCode && (
          <CodeReveal code={deliveredCode} onCopy={copyCode} copied={copied} onReset={resetAll} />
        )}

        {/* ── Buy Button ── */}
        {!deliveredCode && (
          <div className="mb-5">
            <motion.button
              whileTap={!buyMutation.isPending && !!selectedProduct ? { scale: 0.97 } : undefined}
              onClick={handleBuy}
              disabled={buyMutation.isPending || !selectedProduct}
              className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 border-2 mb-3 transition-all ${
                !selectedProduct
                  ? "bg-white/5 border-pink-800/30 text-pink-400/40 cursor-not-allowed"
                  : buyMutation.isPending
                    ? "bg-pink-800/50 border-pink-700/50 text-pink-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-pink-600 to-fuchsia-600 border-pink-400 text-white shadow-[0_8px_32px_rgba(236,72,153,0.5)]"
              }`}
            >
              {buyMutation.isPending
                ? <><Loader2 className="w-5 h-5 animate-spin" /> جاري الشراء...</>
                : <><KeyRound className="w-5 h-5" /> {selectedProduct ? `اشتري ${selectedProduct.name}` : "اختر كوداً أولاً"}</>
              }
            </motion.button>

            {!canAfford && selectedProduct && (
              <Link href="/wallet" className="w-full py-3 rounded-2xl bg-white/5 border border-pink-800/40 text-pink-300 font-bold text-sm flex items-center justify-center gap-2">
                <Wallet className="w-4 h-4" /> اشحن المحفظة <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </Link>
            )}
          </div>
        )}

        {/* ── Ring Stats ── */}
        <div className="rounded-2xl bg-white/5 border border-pink-800/30 p-4 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-white font-black text-sm">جودة الخدمة</span>
          </div>
          <div className="flex justify-around">
            <RingChart pct={99} color="#f472b6" topLabel="أكواد أصلية" />
            <RingChart pct={97} color="#a78bfa" topLabel="تسليم فوري" />
            <RingChart pct={98} color="#34d399" topLabel="رضى العملاء" />
            <RingChart pct={95} color="#fb923c" topLabel="تكرار الشراء" />
          </div>
        </div>

        {/* ── How Codes Work Banner ── */}
        <div className="rounded-2xl overflow-hidden border border-pink-800/30 mb-5"
          style={{ background: "linear-gradient(135deg,rgba(236,72,153,0.08),rgba(168,85,247,0.05))" }}>
          <div className="px-4 py-3 border-b border-pink-800/20 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-pink-400" />
            <span className="text-white font-black text-sm">كيف تعمل الأكواد؟</span>
          </div>
          <div className="p-4 grid grid-cols-3 gap-3">
            {[
              { step: "1", icon: "🛒", title: "اشترِ", desc: "اختر الكود وادفع من رصيدك" },
              { step: "2", icon: "⚡", title: "استلم", desc: "الكود يظهر فوراً على الشاشة" },
              { step: "3", icon: "🎮", title: "العب", desc: "أدخله في اللعبة واستمتع" },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-600 to-fuchsia-600 text-white font-black text-sm flex items-center justify-center mx-auto mb-2 shadow-[0_4px_12px_rgba(236,72,153,0.4)]">
                  {s.icon}
                </div>
                <div className="text-white font-black text-[11px]">{s.title}</div>
                <div className="text-pink-400/60 text-[9px] mt-0.5 leading-tight">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
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

        {/* ── Trust badges ── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🔒", title: "دفع آمن 100%", desc: "رصيدك محفوظ بالكامل" },
            { icon: "⚡", title: "تسليم فوري",   desc: "الكود يظهر مباشرةً" },
            { icon: "💯", title: "أكواد أصلية",  desc: "مضمونة ومعتمدة" },
            { icon: "🔄", title: "دعم 24/7",     desc: "استبدال أو استرداد فوري" },
          ].map(b => (
            <div key={b.title} className="rounded-2xl bg-white/5 border border-pink-800/30 p-3 flex items-center gap-3">
              <span className="text-2xl shrink-0">{b.icon}</span>
              <div>
                <div className="text-white font-black text-[12px]">{b.title}</div>
                <div className="text-pink-400/60 text-[10px]">{b.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
