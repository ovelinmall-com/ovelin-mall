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

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShoppingCart,
  Wallet,
  CheckCircle2,
  Copy,
  Loader2,
  AlertCircle,
  Crown,
  ShieldCheck,
  Zap,
  Plus,
  Minus,
  Gem,
  Eye,
  Gift,
  X,
  Users,
  Heart,
  ExternalLink,
  Link2,
  Package,
  Send,
  Clock,
  KeyRound,
  MessageCircle,
  Share2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetMe,
  useGetMyDashboard,
  getGetMyDashboardQueryKey,
  getGetMeQueryKey,
  useListMyOrders,
  getListMyOrdersQueryKey,
} from "@workspace/api-client-react";
import { platformBySlug } from "@/lib/gamePlatforms";
import { formatSDG } from "@/lib/utils";

type Product = {
  id: number;
  name: string;
  description: string;
  price: string;
  oldPrice: string | null;
  category: string;
  platform: string | null;
  quantity: string | null;
  deliveryTime: string | null;
  imageUrl: string | null;
  badge: string | null;
  ratingAvg: string;
  ratingCount: number;
  smmType?: string | null;
  salesCount: number;
  smmServiceId?: string | null;
  smmMin?: number | null;
  smmMax?: number | null;
  smmRateUsd?: string | null;
};

async function fetchProducts(platform: string): Promise<Product[]> {
  const res = await fetch(
    `/api/products?platform=${encodeURIComponent(platform)}`,
    { credentials: "include" },
  );
  if (!res.ok) throw new Error("فشل تحميل الباقات");
  return res.json();
}

async function fetchStock(ids: number[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const res = await fetch(`/api/products/stock?ids=${ids.join(",")}`, {
    credentials: "include",
  });
  if (!res.ok) return {};
  return res.json();
}

async function instantBuy(
  productId: number,
  quantity: number,
): Promise<{
  orders: any[];
  code: string;
  codes: string[];
  quantity: number;
  totalPrice: number;
}> {
  const res = await fetch("/api/orders/instant-buy", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error((data && data.error) || `HTTP ${res.status}`);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

async function smmOrder(
  productId: number,
  link: string,
  quantity: number,
  comments?: string,
): Promise<{ order: any; smmOrderId: string | null }> {
  const res = await fetch("/api/smm/order", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, link, quantity, comments }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error((data && data.error) || `HTTP ${res.status}`);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

type SmmTab = "followers" | "likes" | "views" | "comments" | "shares";

const SMM_TABS: { id: SmmTab; label: string; icon: React.ReactNode }[] = [
  { id: "followers", label: "متابعون",  icon: <Users className="w-3.5 h-3.5" /> },
  { id: "likes",     label: "إعجابات",  icon: <Heart className="w-3.5 h-3.5" /> },
  { id: "views",     label: "مشاهدات",  icon: <Eye className="w-3.5 h-3.5" /> },
  { id: "comments",  label: "تعليقات",  icon: <MessageCircle className="w-3.5 h-3.5" /> },
  { id: "shares",    label: "مشاركات",  icon: <Share2 className="w-3.5 h-3.5" /> },
];

const GARENA_URL = "https://profile.garena.com/global/";

export default function Game() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const slug = params.slug ?? "";
  const info = useMemo(() => platformBySlug(slug), [slug]);
  const qc = useQueryClient();

  const isSocial = info?.category === "social_followers";
  const isFreeFire = slug === "free-fire";
  const isPubg = slug === "pubg";
  const isSubscription = info?.category === "app_subscriptions";

  const { data: me } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false, refetchOnWindowFocus: false },
  });
  const { data: dashboard } = useGetMyDashboard({
    query: {
      queryKey: getGetMyDashboardQueryKey(),
      enabled: !!me,
      refetchInterval: 60_000,
      refetchOnMount: false,
    },
  });
  const balance = Number(dashboard?.wallet?.balance ?? 0);

  // Poll the price version every 60 s — when the admin changes rates, version bumps
  // and the queryKey below changes, forcing a fresh fetch of products automatically
  const { data: priceVersion = "0" } = useQuery({
    queryKey: ["catalog-version"],
    queryFn: async () => {
      const res = await fetch("/api/catalog/version");
      if (!res.ok) return "0";
      const json = await res.json();
      return String(json.version ?? "0");
    },
    staleTime: 55_000,             // يتزامن مع فترة الـ poll (لا يعيد الطلب قبل انتهائها)
    gcTime: 5 * 60 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-by-platform", info?.platform ?? "", priceVersion],
    queryFn: () => fetchProducts(info!.platform),
    enabled: !!info,
    staleTime: 5 * 60 * 1000,     // 5 دقائق — يُعاد التحميل تلقائياً عند تغيير priceVersion
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    placeholderData: (prev) => prev, // إبقاء البيانات القديمة أثناء الجلب
  });

  // ── Fetch user SMM order history to detect frequently-used services ──
  const { data: myOrders = [] } = useListMyOrders(
    {},
    {
      query: {
        queryKey: getListMyOrdersQueryKey(),
        enabled: !!me,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
    },
  );
  // Map productId → order count
  const orderCountByProduct = useMemo(() => {
    const map = new Map<number, number>();
    for (const o of myOrders) {
      if (o.productId) map.set(o.productId, (map.get(o.productId) ?? 0) + 1);
    }
    return map;
  }, [myOrders]);

  const productIds = products.map((p) => p.id);
  const { data: stock = {} } = useQuery({
    queryKey: ["products-stock", productIds.join(",")],
    queryFn: () => fetchStock(productIds),
    enabled: !isSocial && productIds.length > 0,
    refetchInterval: 15000,
  });

  // ===== GAME CARD states =====
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultCodes, setResultCodes] = useState<string[]>([]);
  const [resultProduct, setResultProduct] = useState<Product | null>(null);
  const [resultTotal, setResultTotal] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  // ===== SMM states =====
  const [smmTab, setSmmTab] = useState<SmmTab>("followers");
  const [smmSelectedProduct, setSmmSelectedProduct] = useState<Product | null>(null);
  const [smmLink, setSmmLink] = useState("");
  const [smmQty, setSmmQty] = useState<string>("");
  const [smmComments, setSmmComments] = useState<string[]>([]);
  const [smmCommentInput, setSmmCommentInput] = useState("");
  const [smmResultOpen, setSmmResultOpen] = useState(false);
  const [smmResult, setSmmResult] = useState<{ orderId: number; smmOrderId: string | null } | null>(null);

  const [error, setError] = useState<string | null>(null);

  // ── Back-button intercept for SMM modal ──
  // When the modal opens, push a dummy history entry so the phone/browser
  // back button closes the modal instead of leaving the page.
  useEffect(() => {
    if (smmSelectedProduct) {
      window.history.pushState({ smmModal: true }, "");
    }
  }, [smmSelectedProduct]);

  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      // If the modal is open and the user pressed back, close it and stop
      if (smmSelectedProduct) {
        setSmmSelectedProduct(null);
        setSmmComments([]);
        setSmmCommentInput("");
        setSmmQty("");
        setSmmLink("");
        setError(null);
        // Prevent further back navigation by re-pushing the current state
        // (We've already consumed the back press above — nothing to re-push)
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [smmSelectedProduct]);

  // ===== FREE FIRE special states =====
  const [ffSelected, setFfSelected] = useState<Product | null>(null);
  const [ffLiveText, setFfLiveText] = useState("🔥 Ahmed purchased 530 Diamonds");
  const [ffTimer, setFfTimer] = useState({ h: 1, m: 59, s: 59 });
  const [ffQty, setFfQty] = useState(1);
  const [ffCoupon, setFfCoupon] = useState("");
  const [ffDiscount, setFfDiscount] = useState(0);
  const [ffShowCheckout, setFfShowCheckout] = useState(false);
  const [ffShowPopup, setFfShowPopup] = useState(false);
  const [ffShowSuccess, setFfShowSuccess] = useState(false);
  const [ffNotify, setFfNotify] = useState(false);
  const [ffAutoGlow, setFfAutoGlow] = useState<number | null>(null);
  const [ffCursor, setFfCursor] = useState({ x: -999, y: -999 });
  const [ffTilts, setFfTilts] = useState<Record<number, { rx: number; ry: number }>>({});
  const ffCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Group products by badge for SMM
  const smmGroups = useMemo<Record<SmmTab, Product[]>>(() => ({
    followers: products.filter((p) => p.badge === "followers"),
    likes:     products.filter((p) => p.badge === "likes"),
    views:     products.filter((p) => p.badge === "views"),
    comments:  products.filter((p) => p.badge === "comments"),
    shares:    products.filter((p) => p.badge === "shares"),
  }), [products]);

  // ── Auto price-tier per product (relative to its tab group) ──
  // Sorts the group by price, splits into 3 equal bands:
  //   bottom → اقتصادي  |  middle → متوسط  |  top → مميز
  const smmPriceTier = useMemo<Map<number, "اقتصادي" | "متوسط" | "مميز">>(() => {
    const result = new Map<number, "اقتصادي" | "متوسط" | "مميز">();
    for (const tab of Object.values(smmGroups)) {
      if (tab.length === 0) continue;
      const sorted = [...tab].sort((a, b) => Number(a.price) - Number(b.price));
      const n = sorted.length;
      sorted.forEach((p, i) => {
        const pct = n === 1 ? 0.5 : i / (n - 1);
        result.set(
          p.id,
          pct <= 0.33 ? "اقتصادي" : pct <= 0.66 ? "متوسط" : "مميز",
        );
      });
    }
    return result;
  }, [smmGroups]);

  // ===== GAME BUY mutation =====
  const buyMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      instantBuy(productId, quantity),
    onSuccess: (data) => {
      setResultCodes(data.codes ?? [data.code]);
      setResultProduct(detailProduct);
      setResultTotal(data.totalPrice);
      setDetailProduct(null);
      setResultOpen(true);
      setError(null);
      qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
      qc.invalidateQueries({ queryKey: ["products-stock"] });
    },
    onError: (err: any) => {
      const msg = err?.data?.error ?? err?.message ?? "فشل الشراء، حاول مرة أخرى";
      setError(msg);
    },
  });

  // ===== SMM BUY mutation =====
  const smmBuyMutation = useMutation({
    mutationFn: ({
      productId,
      link,
      quantity,
      comments,
    }: {
      productId: number;
      link: string;
      quantity: number;
      comments?: string;
    }) => smmOrder(productId, link, quantity, comments),
    onSuccess: (data) => {
      setSmmResult({ orderId: data.order.id, smmOrderId: data.smmOrderId });
      setSmmSelectedProduct(null);
      setSmmResultOpen(true);
      setError(null);
      qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
    },
    onError: (err: any) => {
      const msg = err?.data?.error ?? err?.message ?? "فشل الطلب، حاول مرة أخرى";
      setError(msg);
    },
  });

  // ===== FREE FIRE: override global .app-bg wrapper to dark maroon =====
  useEffect(() => {
    if (!isFreeFire) return;
    document.documentElement.classList.add("ff-active");
    return () => document.documentElement.classList.remove("ff-active");
  }, [isFreeFire]);

  // ===== FREE FIRE: live purchase ticker =====
  useEffect(() => {
    if (!isFreeFire) return;
    const texts = [
      "🔥 Ahmed bought 530 Diamonds",
      "💎 Sara purchased VIP Pack",
      "⚡ Ali added 1080 Diamonds",
      "👑 Omar completed purchase",
      "🔥 New order received",
    ];
    let idx = 0;
    const iv = setInterval(() => {
      idx = (idx + 1) % texts.length;
      setFfLiveText(texts[idx]);
    }, 4000);
    return () => clearInterval(iv);
  }, [isFreeFire]);

  // ===== FREE FIRE: countdown timer =====
  useEffect(() => {
    if (!isFreeFire) return;
    const iv = setInterval(() => {
      setFfTimer((p) => {
        let { h, m, s } = p;
        if (--s < 0) { s = 59; if (--m < 0) { m = 59; if (--h < 0) { h = 1; m = 59; s = 59; } } }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [isFreeFire]);

  // ===== FREE FIRE: premium notification (4s show, 9s hide) =====
  useEffect(() => {
    if (!isFreeFire) return;
    const t1 = setTimeout(() => setFfNotify(true), 4000);
    const t2 = setTimeout(() => setFfNotify(false), 9000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isFreeFire]);

  // ===== FREE FIRE: auto glow on random card every 3s =====
  useEffect(() => {
    if (!isFreeFire) return;
    const iv = setInterval(() => {
      setFfAutoGlow(Math.floor(Math.random() * 4));
    }, 3000);
    return () => clearInterval(iv);
  }, [isFreeFire]);

  // ===== FREE FIRE: reset qty/discount when product changes =====
  useEffect(() => {
    setFfQty(1);
    setFfDiscount(0);
    setFfCoupon("");
  }, [ffSelected]);

  function openDetail(p: Product) {
    setRevealed((prev) => new Set(prev).add(p.id));
    if (!me) {
      setLocation("/login");
      return;
    }
    setDetailProduct(p);
    setQuantity(1);
    setError(null);
  }

  function openSmmDetail(p: Product) {
    if (!me) {
      setLocation("/login");
      return;
    }
    setSmmSelectedProduct(p);
    setSmmLink("");
    setSmmQty("");
    setError(null);
  }

  function copyCode(code: string, index: number) {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function copyAllCodes() {
    navigator.clipboard.writeText(resultCodes.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  if (!info) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-pink-700">
          المنصة غير موجودة.{" "}
          <Link href="/" className="underline">
            العودة للرئيسية
          </Link>
        </div>
      </AppLayout>
    );
  }

  // SMM product detail calculations
  const isCustomComments = !!(smmSelectedProduct?.smmType?.toLowerCase().includes("custom"));
  const smmUnitPrice = smmSelectedProduct ? Number(smmSelectedProduct.price) : 0;
  const smmPricePerThousand = smmUnitPrice * 1000;
  const smmMin = smmSelectedProduct?.smmMin ?? 10;
  const smmMax = smmSelectedProduct?.smmMax ?? 1000000;
  // Quantity entered by user as-is (no multiplier)
  const smmQtyNum = parseInt(smmQty) || 0;
  const smmEffectiveQty = isCustomComments ? smmComments.length : smmQtyNum;
  // Total = (qty / 1000) × pricePerThousand = qty × unitPrice
  const smmTotal = parseFloat((smmUnitPrice * smmEffectiveQty).toFixed(2));
  const smmCanAfford = balance >= smmTotal;
  const smmQtyEntered = smmQty !== "";
  const smmQtyValid = isCustomComments ? smmComments.length > 0 : (smmQtyEntered && smmQtyNum >= smmMin && smmQtyNum <= smmMax);

  // Game card calculations
  const detailPrice = detailProduct ? Number(detailProduct.price) : 0;
  const detailStock = detailProduct ? stock[String(detailProduct.id)] ?? 0 : 0;
  const detailTotal = detailPrice * quantity;
  const canAfford = balance >= detailTotal;
  const enoughStock = quantity <= detailStock;

  return (
    <AppLayout>
      {/* ===== HERO HEADER (hidden for Free Fire — FF has its own hero) ===== */}
      {!isFreeFire && <div className={`relative overflow-hidden ${isSocial ? "text-rose-800 bg-white" : "text-white"} ${
        isPubg
          ? "bg-gradient-to-b from-zinc-900 via-pink-950 to-slate-900"
          : isSocial
            ? "bg-white"
            : isSubscription
              ? "bg-gradient-to-br from-pink-700 via-rose-700 to-pink-900"
              : `bg-gradient-to-br ${info.gradient}`
      }`}>
        {isPubg ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.25),transparent_60%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.15),transparent_60%)] pointer-events-none" />
          </>
        ) : (
          <>
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(239,68,68,0.18) 0%, transparent 70%)" }} />
            <div className="absolute -bottom-12 -left-12 w-52 h-52 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(225,29,72,0.15) 0%, transparent 70%)" }} />
          </>
        )}
        <div className="relative px-5 pt-5 pb-8">
          <div className="flex items-center justify-between mb-4 text-xs">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex items-center gap-1 opacity-80 active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
              <span>رجوع</span>
            </button>
            {me && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-bold ${isPubg ? "bg-pink-500/20 border-pink-400/40" : isSocial ? "bg-rose-100 border-rose-300 text-rose-700" : "bg-white/15 backdrop-blur border-white/30"}`}>
                <Wallet className="w-3.5 h-3.5" />
                <span>{formatSDG(balance)}</span>
                <span className="text-[10px] opacity-80">ج.س</span>
              </div>
            )}
          </div>

          {/* ── Social hero — كرت نظيف بحجم المنطقة بدون نصوص ── */}
          {isSocial ? (
            <div className="w-full rounded-3xl overflow-hidden relative"
              style={{
                height: "180px",
                background: "linear-gradient(135deg, #fff1f2 0%, #fce7f3 50%, #fdf4ff 100%)",
                boxShadow: "0 8px 32px rgba(190,24,93,0.12)",
                border: "1px solid rgba(244,163,193,0.35)",
              }}
            >
              {/* OVELIN label top-right */}
              <div className="absolute top-3 right-3 text-[8.5px] font-black text-rose-700/65 tracking-[0.22em] select-none pointer-events-none z-10">
                OVELIN
              </div>
              {/* Platform logo centered */}
              {info.bgImage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={info.bgImage}
                    alt={info.name}
                    className="w-[52%] h-[82%] object-contain mix-blend-multiply"
                    style={{ filter: "drop-shadow(0 8px 20px rgba(236,72,153,0.22))" }}
                  />
                </div>
              )}
            </div>
          ) : isPubg ? (
            <div className="flex flex-col items-center text-center">
              <motion.div transition={{ type: "spring", stiffness: 200, damping: 22 }} className="w-28 h-28 rounded-3xl overflow-hidden shadow-[0_22px_60px_-10px_rgba(236,72,153,0.5)] border-[3px] border-pink-400/50 ring-4 ring-pink-500/20 mb-4">
                <img src={info.bgImage ?? ""} alt={info.name} className="w-full h-full object-cover" />
              </motion.div>
              <div className="text-[10px] tracking-[0.4em] text-pink-300 font-black uppercase mb-2">Ovelin Premium</div>
              <h1 className="text-[26px] font-black" style={{ color: "#FFD700", textShadow: "0 2px 20px rgba(255,215,0,0.4)" }}>{info.name}</h1>
              <p className="text-[12px] text-pink-200/80 mt-1">{info.hint}</p>
              <div className="flex gap-2 mt-4 text-[11px] justify-center flex-wrap">
                {[
                  { icon: <Zap className="w-3 h-3 text-yellow-400" />, t: "شحن سريع" },
                  { icon: <ShieldCheck className="w-3 h-3 text-emerald-400" />, t: "ضمان 100%" },
                  { icon: <Crown className="w-3 h-3 text-pink-300" />, t: "Midasbuy رسمي" },
                ].map((b) => (
                  <div key={b.t} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 font-bold">
                    {b.icon} {b.t}
                  </div>
                ))}
              </div>
            </div>
          ) : info.bgImage ? (
            <div className="flex flex-col items-center text-center">
              <motion.div transition={{ type: "spring", stiffness: 200, damping: 22 }} className="w-44 h-44 rounded-3xl overflow-hidden shadow-[0_22px_60px_-10px_rgba(0,0,0,0.6)] border-[3px] border-white/50 ring-4 ring-white/20 mb-4">
                <img src={info.bgImage} alt={info.name} className="w-full h-full object-cover" style={{ imageRendering: "auto" }} />
              </motion.div>
              <div className="text-[10px] opacity-80 tracking-[0.2em] font-bold mb-1">OVELIN MALL</div>
              <h1 className="text-2xl font-black leading-tight">{info.name}</h1>
              <div className="text-xs opacity-90 mt-1">{info.hint}</div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-5xl drop-shadow-lg">{info.emoji}</div>
              <div className="flex-1">
                <div className="text-[10px] opacity-80 tracking-[0.2em] font-bold mb-1">OVELIN MALL</div>
                <h1 className="text-2xl font-black leading-tight">{info.name}</h1>
                <div className="text-xs opacity-90 mt-1">{info.hint}</div>
              </div>
            </div>
          )}

          {!isPubg && !isSocial && (
            <div className="flex gap-2 mt-4 text-[11px] justify-center flex-wrap">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur border border-white/20">
                <Zap className="w-3 h-3" /> تسليم فوري
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur border border-white/20">
                <ShieldCheck className="w-3 h-3" /> ضمان 100%
              </div>
              {isFreeFire && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur border border-white/20">
                  <ExternalLink className="w-3 h-3" /> شحن يدوي
                </div>
              )}
            </div>
          )}
        </div>
      </div>}


      {/* ===== SMM PLATFORM: TABS + SERVICES ===== */}
      {isSocial && (
        <div className="px-4 py-5 min-h-[60vh]">
          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
            {SMM_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSmmTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold whitespace-nowrap transition ${
                  smmTab === tab.id
                    ? `bg-gradient-to-r ${info.gradient} text-white shadow-md`
                    : "bg-white border border-pink-200 text-pink-700"
                }`}
              >
                {tab.icon} {tab.label}
                <span className="text-[10px] opacity-70">
                  ({smmGroups[tab.id].length})
                </span>
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-pink-100/50 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && smmGroups[smmTab].length === 0 && (
            <div className="text-center py-16 text-pink-600">
              <div className="text-4xl mb-3">🚀</div>
              <div className="font-bold text-lg">الخدمات قادمة قريباً</div>
              <div className="text-xs opacity-70 mt-2">
                {(() => {
                  const lbl: Record<SmmTab, string> = { followers: "المتابعين", likes: "الإعجابات", views: "المشاهدات", comments: "التعليقات", shares: "المشاركات" };
                  return `يقوم الفريق بإضافة خدمات ${lbl[smmTab]} لـ ${info.name}`;
                })()}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {smmGroups[smmTab].map((p, i) => {
              const unitPrice = Number(p.price);
              const pMin = p.smmMin ?? 10;
              const pMax = p.smmMax ?? 1000000;
              const rating = Number(p.ratingAvg ?? 4.5);
              const stars = Math.round(rating);
              const isTopSeller = i === 0;
              const displayName = p.name;

              // ── Auto price tier ──
              const tierLabel = smmPriceTier.get(p.id) ?? "متوسط";
              /* ── Glassmorphism tier badges — vivid, glassy, luminous ── */
              const tierMeta: Record<string, { bg: string; text: string; border: string; glow: string; shadow: string }> = {
                "اقتصادي": {
                  bg:     "rgba(0,230,118,0.13)",
                  text:   "#00e676",
                  border: "rgba(0,230,118,0.55)",
                  glow:   "rgba(0,230,118,0.55)",
                  shadow: "0 0 8px rgba(0,230,118,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
                },
                "متوسط": {
                  bg:     "rgba(0,176,255,0.13)",
                  text:   "#00b0ff",
                  border: "rgba(0,176,255,0.55)",
                  glow:   "rgba(0,176,255,0.55)",
                  shadow: "0 0 8px rgba(0,176,255,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
                },
                "مميز": {
                  bg:     "rgba(255,214,0,0.13)",
                  text:   "#ffd600",
                  border: "rgba(255,214,0,0.6)",
                  glow:   "rgba(255,214,0,0.6)",
                  shadow: "0 0 10px rgba(255,214,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
                },
              };
              const tier = tierMeta[tierLabel];

              // ── Frequently-used badge ──
              const orderCount = orderCountByProduct.get(p.id) ?? 0;
              const isFrequentlyUsed = orderCount >= 2;

              return (
                <motion.div
                  key={p.id}
                  transition={{ delay: i * 0.05 }}
                  className="fancy-card rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgba(236,72,153,0.18)] hover:border-pink-300 transition relative"
                >
                  {/* ── Tier ribbon — glassmorphism, vivid glassy ── */}
                  <motion.div
                    className="absolute top-0 left-0 z-10 px-3 py-[5px] rounded-br-2xl text-[10px] font-black select-none tracking-widest"
                    style={{
                      background: tier.bg,
                      color: tier.text,
                      border: `1px solid ${tier.border}`,
                      textShadow: `0 0 8px ${tier.text}`,
                      letterSpacing: "0.08em",
                      boxShadow: tier.shadow,
                    }}
                  >
                    {tierLabel}
                  </motion.div>

                  {/* ── Frequently-used ribbon — top-right corner ── */}
                  {isFrequentlyUsed && (
                    <div
                      className="absolute top-0 right-0 z-10 flex items-center gap-1 px-2.5 py-1 rounded-bl-2xl text-[9px] font-black shadow-lg select-none"
                      style={{
                        background: "linear-gradient(135deg,#e11d74 0%,#f43f5e 50%,#fb7185 100%)",
                        color: "#fff",
                        boxShadow: "0 3px 10px rgba(225,29,116,0.35)",
                      }}
                    >
                      ♻️ دايما تستخدمها
                    </div>
                  )}

                  {/* Most-popular ribbon — only when no frequently-used badge */}
                  {isTopSeller && !isFrequentlyUsed && (
                    <div className="absolute top-0 right-0 z-10 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 text-[9px] font-black px-3 py-1 rounded-bl-2xl shadow-md tracking-wide">
                      🔥 الأكثر مبيعاً
                    </div>
                  )}

                  {/* Gradient header */}
                  <div className="bg-gradient-to-l from-pink-600 via-rose-600 to-pink-700 px-4 pt-7 pb-2.5 flex items-center justify-between">
                    <div className="font-extrabold text-white text-sm leading-tight line-clamp-1 flex-1">
                      {displayName}
                    </div>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 ml-2 shrink-0">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <span key={s} className={`text-[11px] ${s < stars ? "text-yellow-300" : "text-white/30"}`}>★</span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3">
                    {/* Description */}
                    {p.description && (
                      <div className="text-[10px] text-muted-foreground mb-2.5 line-clamp-2 leading-relaxed">
                        {p.description}
                      </div>
                    )}

                    {/* Feature chips */}
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      <span className="text-[10px] bg-pink-50 text-pink-700 rounded-full px-2.5 py-0.5 font-bold border border-pink-200">
                        أدنى: {pMin.toLocaleString("ar")}
                      </span>
                      <span className="text-[10px] bg-rose-50 text-rose-700 rounded-full px-2.5 py-0.5 font-bold border border-rose-200">
                        أقصى: {pMax.toLocaleString("ar")}
                      </span>
                      {p.deliveryTime && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-0.5 font-bold border border-emerald-200">
                          ⚡ {p.deliveryTime}
                        </span>
                      )}
                      {p.smmServiceId && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5 font-bold border border-blue-200">
                          🤖 آلي
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      {/* Price frame */}
                      <div className="rounded-xl border-2 border-pink-200 bg-pink-50 px-3 py-1.5 text-center">
                        <div className="text-[9px] text-pink-500 font-bold">السعر / 1000</div>
                        <div className="text-base font-black text-pink-700 leading-tight">
                          {formatSDG(unitPrice * 1000)}
                          <span className="text-[9px] font-bold mr-0.5">ج.س</span>
                        </div>
                      </div>

                      <button
                        onClick={() => openSmmDetail(p)}
                        className="flex-1 py-2.5 rounded-2xl bg-gradient-to-l from-pink-600 via-rose-600 to-pink-700 text-white font-bold text-sm shadow-[0_4px_15px_rgba(236,72,153,0.35)] active:scale-95 flex items-center justify-center gap-2 transition"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        اطلب الآن
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== SUBSCRIPTION PACKAGES ===== */}
      {isSubscription && (
        <div className="px-4 py-5 min-h-[60vh]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-pink-600" />
            <h2 className="font-extrabold text-pink-900">اختر الباقة</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-pink-300 to-transparent" />
            <span className="text-[10px] text-pink-500 font-bold">اضغط للشراء</span>
          </div>

          {isLoading && (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[88px] rounded-2xl bg-pink-100/60 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && products.length === 0 && (
            <div className="text-center py-16 text-pink-600">
              <div className="text-5xl mb-3">📦</div>
              <div className="font-bold text-lg">لا توجد باقات متاحة حالياً</div>
              <div className="text-xs opacity-70 mt-2">تابعنا لإضافة باقات قريباً</div>
            </div>
          )}

          <div className="space-y-3">
            {products.map((p, i) => {
              const available = stock[String(p.id)] ?? 0;
              const price = Number(p.price);
              const oldPrice = p.oldPrice ? Number(p.oldPrice) : null;
              const outOfStock = !isSubscription && available === 0;
              const discount = oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
              const isBest = discount > 0 && products.every(pr => {
                const prOld = pr.oldPrice ? Number(pr.oldPrice) : null;
                const prNew = Number(pr.price);
                const prDisc = prOld && prOld > prNew ? (prOld - prNew) / prOld : 0;
                return ((oldPrice! - price) / oldPrice!) >= prDisc;
              });

              return (
                <motion.button
                  key={p.id}
                  transition={{ delay: i * 0.07 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => {
                    if (outOfStock) return;
                    if (isSubscription) {
                      setLocation(`/product/${p.id}`);
                    } else {
                      openDetail(p);
                    }
                  }}
                  disabled={outOfStock}
                  className={`w-full rounded-2xl border-2 bg-white text-right overflow-hidden transition ${
                    outOfStock
                      ? "border-zinc-200 opacity-60 cursor-not-allowed"
                      : isBest
                        ? "border-pink-400 shadow-[0_4px_20px_rgba(236,72,153,0.22)]"
                        : "border-pink-100 shadow-sm hover:border-pink-300 hover:shadow-[0_8px_25px_rgba(236,72,153,0.15)]"
                  }`}
                >
                  {isBest && !outOfStock && (
                    <div className="bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[9px] font-black py-1 text-center tracking-wider">
                      ✨ الأفضل قيمة — الأكثر مبيعاً
                    </div>
                  )}
                  {discount > 0 && !isBest && !outOfStock && (
                    <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[9px] font-black py-1 text-center tracking-wider">
                      🔥 وفّر {discount}%
                    </div>
                  )}
                  <div className="p-4 flex items-center gap-3">
                    <div className="flex-1 text-right">
                      <div className="font-extrabold text-pink-900 text-[15px] leading-tight">{p.name}</div>
                      {p.quantity && (
                        <div className="text-[11px] text-pink-600 font-semibold mt-0.5">{p.quantity}</div>
                      )}
                      {p.description && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.description}</div>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] bg-pink-50 text-pink-700 rounded-full px-2 py-0.5 font-bold border border-pink-200">⚡ تسليم فوري</span>
                        <span className="text-[10px] bg-rose-50 text-rose-700 rounded-full px-2 py-0.5 font-bold border border-rose-200">🔒 ضمان كامل</span>
                      </div>
                    </div>

                    <div className="w-px h-14 bg-pink-100 shrink-0" />

                    <div className="shrink-0 text-center min-w-[56px]">
                      {oldPrice && oldPrice > price && (
                        <div className="text-[10px] text-zinc-400 line-through leading-none mb-0.5">{oldPrice.toFixed(0)}</div>
                      )}
                      <div className="text-2xl font-black text-pink-700 leading-none">{price.toFixed(0)}</div>
                      <div className="text-[9px] text-pink-500 font-bold mb-2">ج.س</div>
                      {outOfStock ? (
                        <div className="px-2 py-1 rounded-lg bg-zinc-100 text-zinc-500 text-[10px] font-bold">نفدت</div>
                      ) : (
                        <div className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white text-[11px] font-bold shadow-[0_4px_12px_rgba(236,72,153,0.35)]">
                          اشتراك
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {products.length > 0 && !isLoading && (
            <div className="fancy-card mt-6 py-4 rounded-2xl flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-pink-500" /> اشتراك آمن</span>
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-pink-500" /> تسليم فوري</span>
              <span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-pink-500" /> أسعار حصرية</span>
            </div>
          )}
        </div>
      )}

      {/* ===== GAME CARDS: PACKAGES LIST ===== */}
      {!isSocial && !isSubscription && (
        <div className={`px-4 py-5 ${isFreeFire ? "min-h-screen" : "min-h-[60vh]"} ${isPubg ? "bg-gradient-to-b from-slate-900 via-zinc-900 to-rose-950 relative overflow-hidden" : isFreeFire ? "relative" : ""}`} style={isFreeFire ? { background: "linear-gradient(160deg,#6b0040 0%,#a8005a 28%,#780040 58%,#2d0018 100%)" } : undefined}>
          {isPubg ? (
            <div className="space-y-4 pt-1">

              {/* Section label */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 rounded-full bg-gradient-to-b from-pink-400 to-fuchsia-500" />
                <span className="font-black text-pink-200 text-[14px]">اختر طريقة الشحن</span>
              </div>

              {/* ── Card 1: شحن عبر الـ ID ── */}
              <Link href="/pubg-topup">
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="relative w-full rounded-3xl overflow-hidden border border-pink-500/60 shadow-[0_8px_32px_rgba(236,72,153,0.35)] cursor-pointer"
                >
                  {/* Gold ribbon */}
                  <div className="bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 py-1.5 px-4 flex items-center justify-between">
                    <span className="text-[10px] font-black text-yellow-900 flex items-center gap-1"><Crown className="w-3 h-3" /> الأكثر طلباً</span>
                    <span className="text-[10px] font-black text-yellow-900">Midasbuy رسمي</span>
                  </div>

                  <div className="bg-gradient-to-br from-zinc-900 via-pink-950 to-slate-900 text-white p-5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(236,72,153,0.18),transparent_60%)] pointer-events-none" />
                    <div className="relative flex items-center gap-4">
                      <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-600 to-fuchsia-700 border border-pink-400/60 flex items-center justify-center shadow-[0_4px_20px_rgba(236,72,153,0.5)]">
                        <Zap className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-[10px] text-pink-300 font-black tracking-widest uppercase mb-0.5">شحن مباشر — بدون كود</div>
                        <div className="text-[20px] font-black leading-tight" style={{ color: "#FFD700" }}>شحن عبر الـ ID</div>
                        <div className="text-[11px] text-pink-200/70 mt-1">UC شدات • Royale Pass • Prime</div>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-pink-400 shrink-0" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-pink-700/80 to-fuchsia-800/80 px-4 py-2.5 flex items-center justify-between border-t border-pink-500/30">
                    <span className="text-[10px] text-pink-200 font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> ضمان 100% • 30 دقيقة</span>
                    <span className="text-[11px] text-white font-black bg-pink-500/30 px-3 py-1 rounded-full border border-pink-400/40">اشحن الآن</span>
                  </div>
                </motion.div>
              </Link>

              {/* ── Card 2: أكواد جاهزة ── */}
              <Link href="/pubg-codes">
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="relative w-full rounded-3xl overflow-hidden border border-pink-500/40 shadow-[0_8px_24px_rgba(168,85,247,0.25)] cursor-pointer"
                >
                  <div className="bg-gradient-to-r from-fuchsia-700/60 to-pink-700/60 py-1.5 px-4 flex items-center justify-between border-b border-pink-500/30">
                    <span className="text-[10px] font-black text-pink-200 flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> تسليم فوري</span>
                    <span className="text-[10px] font-black text-pink-200">بدون معرف اللاعب</span>
                  </div>

                  <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-pink-950 text-white p-5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.15),transparent_60%)] pointer-events-none" />
                    <div className="relative flex items-center gap-4">
                      <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-600 to-purple-700 border border-fuchsia-400/60 flex items-center justify-center shadow-[0_4px_20px_rgba(168,85,247,0.45)]">
                        <KeyRound className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-[10px] text-fuchsia-300 font-black tracking-widest uppercase mb-0.5">كود جاهز — استرداد فوري</div>
                        <div className="text-[20px] font-black leading-tight text-white">أكواد ببجي جاهزة</div>
                        <div className="text-[11px] text-pink-200/70 mt-1">UC Codes • Royale Pass • Gift</div>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-fuchsia-400 shrink-0" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-zinc-800/80 to-pink-950/80 px-4 py-2.5 flex items-center justify-between border-t border-pink-500/20">
                    <span className="text-[10px] text-pink-300 font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> كود أصلي 100%</span>
                    <span className="text-[11px] text-white font-black bg-fuchsia-500/30 px-3 py-1 rounded-full border border-fuchsia-400/40">اشتري الآن</span>
                  </div>
                </motion.div>
              </Link>

              {/* Trust bar */}
              <div className="rounded-2xl border border-pink-700/40 bg-white/5 py-3 px-4 flex items-center justify-around">
                <span className="flex items-center gap-1.5 text-[11px] text-pink-300 font-black"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> شحن آمن</span>
                <span className="flex items-center gap-1.5 text-[11px] text-pink-300 font-black"><Crown className="w-3.5 h-3.5 text-yellow-400" /> +10K عميل</span>
                <span className="flex items-center gap-1.5 text-[11px] text-pink-300 font-black"><Sparkles className="w-3.5 h-3.5 text-fuchsia-400" /> دعم 24/7</span>
              </div>

            </div>
          ) : isFreeFire ? (() => {
            const ffBadges = ["HOT","BEST","POPULAR","VIP","OFFER","NEW","HOT","VIP"];
            const ffSubs = ["شحن فوري خلال ثواني","Bonus إضافي مجاني","الأكثر شراءً اليوم","أفضل قيمة مقابل السعر"];
            const ffStockPcts = [75,82,60,90,68,85,72,88];
            const ffPrice = ffSelected ? Number(ffSelected.price) : 0;
            const ffBase = ffPrice * ffQty;
            const ffDiscountRate = ffQty >= 10 ? 0.20 : ffQty >= 5 ? 0.10 : 0;
            const ffBulkDiscount = ffBase * ffDiscountRate + ffDiscount;
            const ffFinal = ffBase - ffBulkDiscount;
            const ffLevel = ffQty >= 10 ? "👑 VIP DEAL" : ffQty >= 5 ? "🥇 GOLD DEAL" : ffQty >= 2 ? "🥈 SILVER DEAL" : "🥉 NORMAL DEAL";
            const ffRecommend = ffQty <= 1 ? "💡 Best Deal: Try 220 or 530 Diamonds" : ffQty < 5 ? "🔥 Recommended: 530 Diamonds (Best Value)" : "👑 VIP Suggestion: 1080 Diamonds Pack";
            const ffHint = ffQty < 5 ? "💡 Tip: Buy 5+ for 10% discount" : ffQty < 10 ? "🔥 Good choice! You unlocked discount zone" : "👑 Maximum VIP discount active";
            return (
            <div
              dir="rtl"
              style={{ position: "relative", minHeight: "100vh" }}
              onMouseMove={(e) => setFfCursor({ x: e.clientX, y: e.clientY })}
            >

              {/* ── ALL CSS ── */}
              <style>{`
                /* ── NO heavy animations — removed for mobile performance ── */

                .ff-glow { position:absolute; width:700px; height:700px; border-radius:50%; filter:blur(200px); opacity:.35; pointer-events:none; }
                .ff-g1 { top:-280px; left:-200px; background:#ff2ec8; }
                .ff-g2 { bottom:-300px; right:-200px; background:#ff80ea; opacity:.30; }
                .ff-g3 { top:38%; left:45%; transform:translate(-50%,-50%); width:600px; height:600px; background:#c8006e; filter:blur(220px); opacity:.22; }

                .ff-products { display:grid; grid-template-columns:repeat(5,1fr); gap:7px; padding-bottom:20px; }

                .ff-product { background:rgba(255,255,255,.13); border:1px solid rgba(255,255,255,.28); border-radius:13px; padding:9px 7px; position:relative; transition:transform .2s,box-shadow .2s; cursor:pointer; overflow:hidden; backdrop-filter:blur(20px) saturate(1.5); -webkit-backdrop-filter:blur(20px) saturate(1.5); box-shadow:0 3px 16px rgba(255,0,180,.10), inset 0 1px 0 rgba(255,255,255,.22); }
                .ff-product::before { content:''; position:absolute; inset:0; border-radius:13px; background:linear-gradient(160deg,rgba(255,255,255,.12) 0%,transparent 60%); pointer-events:none; }
                .ff-product:active { transform:scale(.97); }
                .ff-product.ff-active { border:1.5px solid rgba(255,77,210,.9) !important; box-shadow:0 0 20px rgba(255,0,180,.40), inset 0 1px 0 rgba(255,255,255,.30) !important; background:rgba(255,255,255,.20) !important; }

                .ff-badge { position:absolute; top:5px; left:5px; padding:2px 5px; border-radius:5px; font-size:7px; font-weight:800; background:linear-gradient(135deg,#ff2ec8,#ff80ea); color:white; }
                .ff-gems { font-size:14px; font-weight:900; color:white; }
                .ff-product-price { font-size:12px; font-weight:900; margin-bottom:2px; color:rgba(255,255,255,.95); }
                .ff-product-sub { font-size:8px; color:rgba(255,200,240,.7); margin-bottom:5px; }
                .ff-stock { display:flex; justify-content:space-between; align-items:center; font-size:8px; color:rgba(255,200,240,.65); }
                .ff-bar { width:100%; height:4px; background:rgba(255,255,255,.12); border-radius:999px; margin-top:5px; overflow:hidden; }
                .ff-fill { height:100%; background:linear-gradient(90deg,#ff2ec8,#ff80ea); border-radius:999px; }

                .ff-buy-area { display:none; }
                .ff-cursor-glow { display:none; }
                .ff-particles { display:none; }
                .ff-floating-diamond { display:none; }

                .ff-popup { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,.65); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; z-index:9999; }
                .ff-popup-box { width:92%; max-width:380px; background:rgba(20,20,28,.95); border:1px solid rgba(255,255,255,.10); border-radius:28px; padding:24px; backdrop-filter:blur(20px); box-shadow:0 0 50px rgba(255,0,180,.18); }
                .ff-popup-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
                .ff-popup-top h2 { font-size:26px; font-weight:900; margin-bottom:5px; color:white; }
                .ff-popup-top p { color:#ff86ec; font-size:14px; font-weight:700; }
                .ff-popup-icon { width:54px; height:54px; display:flex; align-items:center; justify-content:center; border-radius:16px; background:rgba(255,0,180,.12); font-size:26px; border:1px solid rgba(255,255,255,.06); }
                .ff-qty-box { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); border-radius:20px; padding:16px; margin-bottom:16px; }
                .ff-qty-title { font-size:13px; color:#aaa; margin-bottom:12px; }
                .ff-qty-controls { display:flex; justify-content:space-between; align-items:center; }
                .ff-qty-controls button { width:46px; height:46px; border:none; border-radius:14px; background:linear-gradient(135deg,#ff2ec8,#ff80ea); color:white; font-size:24px; font-weight:900; cursor:pointer; font-family:inherit; }
                .ff-qty-number { font-size:28px; font-weight:900; color:white; }
                .ff-total-box { display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08); padding:16px; border-radius:18px; margin-bottom:18px; }
                .ff-total-text { font-size:14px; color:#bbb; }
                .ff-total-price { font-size:26px; font-weight:900; color:#ff6ee9; }
                .ff-confirm-btn { width:100%; padding:15px; border:none; border-radius:16px; background:linear-gradient(135deg,#ff2ec8,#ff80ea); color:white; font-size:15px; font-weight:900; cursor:pointer; box-shadow:0 0 28px rgba(255,0,180,.38); font-family:inherit; }
                .ff-close-btn { text-align:center; margin-top:12px; font-size:13px; color:#888; cursor:pointer; }

                .ff-live-buy { position:fixed; bottom:90px; right:16px; background:rgba(20,20,28,.92); border:1px solid rgba(255,255,255,.08); padding:12px 16px; border-radius:16px; font-size:12px; backdrop-filter:blur(16px); z-index:9998; box-shadow:0 0 24px rgba(255,0,180,.12); color:white; font-weight:700; max-width:220px; }

                .ff-inline-checkout { width:100%; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.35); border-radius:28px; padding:22px; backdrop-filter:blur(36px) saturate(2); -webkit-backdrop-filter:blur(36px) saturate(2); box-shadow:0 6px 40px rgba(255,0,180,.20), inset 0 1.5px 0 rgba(255,255,255,.40); margin-top:18px; margin-bottom:24px; position:relative; overflow:hidden; }
                .ff-inline-checkout::before { content:''; position:absolute; inset:0; border-radius:28px; background:linear-gradient(160deg,rgba(255,255,255,.15) 0%,transparent 55%); pointer-events:none; }
                .ff-checkout-title { font-size:18px; font-weight:900; margin-bottom:14px; color:white; text-align:center; }
                .ff-checkout-product { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
                .ff-checkout-product strong { font-size:14px; color:white; }
                .ff-checkout-product span { color:#ffccf4; font-weight:800; font-size:13px; }
                .ff-checkout-qty { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; color:white; font-size:13px; }
                .ff-qty-buttons { display:flex; align-items:center; gap:10px; }
                .ff-qty-buttons button { width:38px; height:38px; border:none; border-radius:12px; background:linear-gradient(135deg,#ff2ec8,#ff80ea); color:white; font-size:20px; font-weight:900; cursor:pointer; font-family:inherit; }
                .ff-qty-buttons div { font-size:20px; font-weight:900; width:36px; text-align:center; color:white; }
                .ff-price-box { background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.22); padding:14px; border-radius:18px; margin-bottom:14px; }
                .ff-price-line { display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px; color:rgba(255,230,250,.85); }
                .ff-total-line { display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:18px; font-weight:900; color:white; border-top:1px solid rgba(255,255,255,.15); padding-top:10px; }
                .ff-total-line span { color:#ffccf4; }
                .ff-coupon { display:flex; gap:8px; margin-bottom:14px; }
                .ff-coupon input { flex:1; height:44px; border:1px solid rgba(255,255,255,.25); outline:none; padding:0 12px; border-radius:12px; background:rgba(255,255,255,.10); color:white; font-family:inherit; font-size:13px; }
                .ff-coupon input::placeholder { color:rgba(255,200,240,.5); }
                .ff-coupon button { padding:0 16px; border:none; border-radius:12px; background:linear-gradient(135deg,#ff2ec8,#ff80ea); color:white; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; }
                .ff-checkout-buy { width:100%; height:52px; border:none; border-radius:16px; background:linear-gradient(135deg,#ff2ec8,#ff80ea); color:white; font-size:15px; font-weight:900; cursor:pointer; box-shadow:0 0 32px rgba(255,0,180,.45), 0 4px 14px rgba(255,0,180,.28); font-family:inherit; letter-spacing:.3px; }
                .ff-checkout-buy:disabled { opacity:.35; pointer-events:none; }
                .ff-vip-msg { margin-top:8px; font-size:12px; color:#ffccf4; font-weight:800; text-align:center; }
                .ff-recommend { margin-top:10px; padding:10px; border-radius:14px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); font-size:11px; color:rgba(255,225,248,.9); font-weight:800; text-align:center; }
                .ff-smart-hint { margin-top:8px; font-size:11px; color:rgba(255,220,245,.75); text-align:center; font-weight:800; }

                .ff-success-box { position:fixed; top:30px; left:50%; transform:translateX(-50%) translateY(-120px); background:rgba(20,20,28,.94); border:1px solid rgba(255,255,255,.08); padding:16px 24px; border-radius:18px; backdrop-filter:blur(18px); font-size:15px; font-weight:800; z-index:99999; transition:.4s; color:white; white-space:nowrap; }
                .ff-success-box.ff-show { transform:translateX(-50%) translateY(0); }

                .ff-premium-notify { position:fixed; top:80px; right:16px; background:rgba(20,20,28,.92); border:1px solid rgba(255,255,255,.08); padding:13px 17px; border-radius:16px; backdrop-filter:blur(18px); font-size:13px; font-weight:700; z-index:99999; transform:translateX(420px); transition:.4s; color:white; }
                .ff-premium-notify.ff-show { transform:translateX(0); }

                .ff-timer-box { margin-top:14px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); padding:12px 14px; border-radius:16px; display:flex; justify-content:space-between; align-items:center; }
                .ff-timer { font-size:18px; font-weight:900; color:#ff6ee9; letter-spacing:1px; }

                .ff-section-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
                .ff-section-title { font-size:20px; font-weight:900; color:white; }
                .ff-section-title span { color:#ff4dd2; }
                .ff-live { font-size:12px; color:#77ff77; }

                .ff-hero-card { display:grid; grid-template-columns:1.2fr .8fr; gap:18px; background:rgba(255,255,255,.11); border:1px solid rgba(255,255,255,.28); border-radius:28px; padding:22px; backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); overflow:hidden; position:relative; box-shadow:0 6px 32px rgba(255,0,180,.14), inset 0 1px 0 rgba(255,255,255,.28); margin-bottom:28px; }
                .ff-hero-card::before { content:''; position:absolute; inset:0; border-radius:28px; background:linear-gradient(160deg,rgba(255,255,255,.12) 0%,transparent 55%); pointer-events:none; }
                @media(max-width:480px){ .ff-hero-card{grid-template-columns:1fr;} }
                .ff-hero-content { display:flex; flex-direction:column; justify-content:center; }
                .ff-tag { width:max-content; padding:7px 13px; background:rgba(255,0,170,.15); border:1px solid rgba(255,0,170,.25); border-radius:999px; font-size:12px; font-weight:800; color:#ff7ee8; margin-bottom:16px; }
                .ff-hero-title { font-size:32px; font-weight:900; line-height:1.1; margin-bottom:16px; color:white; }
                .ff-hero-title span { color:#ff4dd2; }
                .ff-hero-text { font-size:13px; color:rgba(255,220,245,.8); line-height:1.8; margin-bottom:18px; }
                .ff-hero-buttons { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:4px; }
                .ff-btn { padding:11px 18px; border:none; border-radius:12px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; }
                .ff-btn-primary { background:linear-gradient(135deg,#ff2ec8,#ff80ea); color:white; box-shadow:0 0 22px rgba(255,0,180,.35); }
                .ff-btn-secondary { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); color:white; }
                .ff-hero-image { display:flex; align-items:center; justify-content:center; }
                .ff-hero-image img { width:100%; max-width:180px; border-radius:20px; box-shadow:0 0 36px rgba(255,0,180,.30); }

                .ff-product-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
                .ff-icon { font-size:16px; }

                ::-webkit-scrollbar{width:6px;}
                ::-webkit-scrollbar-track{background:transparent;}
                ::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#ff2ec8,#ff80ea);border-radius:999px;}
              `}</style>

              {/* ── Cursor Glow ── */}
              <div className="ff-cursor-glow" style={{ left: ffCursor.x, top: ffCursor.y }} />

              {/* ── Glow Blobs ── */}
              <div className="ff-glow ff-g1" />
              <div className="ff-glow ff-g2" />
              <div className="ff-glow ff-g3" />

              {/* ── Floating Diamonds ── */}
              {[
                { left:"8%",  bottom:"-50px", dur:"14s" },
                { left:"22%", bottom:"-80px", dur:"18s" },
                { left:"45%", bottom:"-60px", dur:"16s" },
                { left:"70%", bottom:"-90px", dur:"20s" },
                { left:"88%", bottom:"-70px", dur:"15s" },
              ].map((d,fi) => (
                <div key={fi} className="ff-floating-diamond" style={{ left:d.left, bottom:d.bottom, animationDuration:d.dur }}>💎</div>
              ))}

              {/* ── Particles ── */}
              <div className="ff-particles">
                {[{l:"5%",d:"12s"},{l:"15%",d:"18s"},{l:"28%",d:"14s"},{l:"40%",d:"20s"},{l:"55%",d:"16s"},{l:"70%",d:"13s"},{l:"85%",d:"17s"}]
                  .map((p,pi) => <span key={pi} style={{ left:p.l, animationDuration:p.d }} />)}
              </div>

              {/* ── Premium Notification ── */}
              <div className={`ff-premium-notify${ffNotify?" ff-show":""}`}>
                🎁 New Premium Offer Available
              </div>

              {/* ── Success Box ── */}
              <div className={`ff-success-box${ffShowSuccess?" ff-show":""}`}>
                ✅ تم شراء الكود بنجاح
              </div>

              {/* ── Live Purchase Toast ── */}
              <div className="ff-live-buy">{ffLiveText}</div>

              {/* ── Hero Card ── */}
              <div className="ff-hero-card">
                <div className="ff-hero-content">
                  <div className="ff-tag">🔥 أفضل متجر أكواد فري فاير</div>
                  <div className="ff-hero-title">
                    اشحن <span>الجواهر</span><br/>بأفضل العروض
                  </div>
                  <div className="ff-hero-text">
                    احصل على أكواد فري فاير الأصلية بسرعة وأمان مع عروض يومية وباقات حصرية وأسعار منافسة.
                  </div>
                  <div className="ff-hero-buttons">
                    <button className="ff-btn ff-btn-primary" onClick={() => { const el = document.getElementById('ff-products-section'); el?.scrollIntoView({behavior:'smooth'}); }}>
                      ابدأ الشراء
                    </button>
                    <button className="ff-btn ff-btn-secondary">العروض الخاصة</button>
                  </div>
                  <div className="ff-timer-box">
                    <small style={{ color:"#aaa", fontSize:"12px" }}>ينتهي العرض:</small>
                    <div className="ff-timer">
                      {String(ffTimer.h).padStart(2,"0")}:{String(ffTimer.m).padStart(2,"0")}:{String(ffTimer.s).padStart(2,"0")}
                    </div>
                  </div>
                </div>
                <div className="ff-hero-image">
                  <img
                    src="https://i.imgur.com/3ZQ3ZQm.jpg"
                    alt="Free Fire"
                    onError={(e) => { e.currentTarget.style.display="none"; }}
                  />
                </div>
              </div>

              {/* ── Products Section ── */}
              <div id="ff-products-section">
                <div className="ff-section-top">
                  <div className="ff-section-title">💎 باقات <span>الجواهر</span></div>
                  <div className="ff-live">● متوفر الآن</div>
                </div>

                {isLoading && (
                  <div className="ff-products">
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{ height:"180px", borderRadius:"22px", background:"rgba(255,255,255,.06)", animation:"pulse 1.5s infinite" }} />
                    ))}
                  </div>
                )}

                {!isLoading && products.length === 0 && (
                  <div style={{ textAlign:"center", padding:"60px 0" }}>
                    <div style={{ fontSize:"48px", marginBottom:"12px" }}>💎</div>
                    <div style={{ color:"rgba(255,255,255,.7)", fontWeight:"700" }}>لا توجد باقات متاحة حالياً</div>
                  </div>
                )}

                <div className="ff-products">
                  {products.map((p, i) => {
                    const available = stock[String(p.id)] ?? 0;
                    const price = Number(p.price);
                    const outOfStock = available === 0;
                    const gemCount = parseInt((p.quantity ?? p.name).replace(/[^\d]/g,"")) || 0;
                    const stockPct = outOfStock ? 0 : ffStockPcts[i % ffStockPcts.length];
                    const badge = ffBadges[i % ffBadges.length];
                    const sub = ffSubs[i % ffSubs.length];
                    const isSelected = ffSelected?.id === p.id;
                    const isAutoGlow = ffAutoGlow === i;
                    const tilt = ffTilts[i] ?? { rx:0, ry:0 };

                    return (
                      <div
                        key={p.id}
                        ref={el => { ffCardRefs.current[i] = el; }}
                        className={`ff-product${isSelected?" ff-active":""}${isAutoGlow&&!isSelected?" ff-auto-glow":""}`}
                        style={{
                          opacity: outOfStock ? 0.5 : 1,
                          transform: tilt.rx !== 0 || tilt.ry !== 0 ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(-6px)` : undefined,
                        }}
                        onClick={() => {
                          if (outOfStock) return;
                          if (!me) { setLocation("/login"); return; }
                          setFfSelected(prev => prev?.id === p.id ? null : p);
                        }}
                        onMouseMove={(e) => {
                          const rect = ffCardRefs.current[i]?.getBoundingClientRect();
                          if (!rect) return;
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;
                          const rx = (y - rect.height/2) / 12;
                          const ry = (rect.width/2 - x) / 12;
                          setFfTilts(prev => ({ ...prev, [i]: { rx, ry } }));
                        }}
                        onMouseLeave={() => {
                          setFfTilts(prev => ({ ...prev, [i]: { rx:0, ry:0 } }));
                        }}
                      >
                        <div className="ff-badge">{badge}</div>
                        <div className="ff-product-top">
                          <div className="ff-gems">{gemCount > 0 ? gemCount.toLocaleString() : p.name}</div>
                          <div className="ff-icon">💎</div>
                        </div>
                        <div className="ff-product-price">{formatSDG(price)} ج.س</div>
                        <div className="ff-product-sub">{outOfStock ? "نفدت" : sub}</div>
                        <div className="ff-stock">
                          <span>المخزون</span>
                          <span>{stockPct}%</span>
                        </div>
                        <div className="ff-bar">
                          <div className="ff-fill" style={{ width:`${stockPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Inline Checkout (glass, full-width, below products) ── */}
              <div className="ff-inline-checkout">
                <div className="ff-checkout-title">💎 إتمام الشراء</div>
                <div className="ff-checkout-product">
                  <strong>{ffSelected ? `${ffSelected.name}  •  ${ffLevel}` : "اختر باقة من الأعلى"}</strong>
                  <span>{ffSelected ? `${formatSDG(ffPrice)} ج.س` : ""}</span>
                </div>
                <div className="ff-checkout-qty">
                  <div>الكمية</div>
                  <div className="ff-qty-buttons">
                    <button onClick={() => setFfQty(q => Math.max(1,q-1))}>−</button>
                    <div>{ffQty}</div>
                    <button onClick={() => setFfQty(q => Math.min(20,q+1))}>+</button>
                  </div>
                </div>
                <div className="ff-price-box">
                  <div className="ff-price-line"><div>السعر الأساسي</div><div>{formatSDG(ffBase)} ج.س</div></div>
                  {ffBulkDiscount > 0 && <div className="ff-price-line"><div>خصم الكمية</div><div style={{ color:"#22c55e" }}>−{formatSDG(ffBulkDiscount)} ج.س</div></div>}
                  <div className="ff-total-line"><div>الإجمالي</div><span>{formatSDG(ffFinal)} ج.س</span></div>
                </div>
                <div className="ff-coupon">
                  <input
                    type="text"
                    placeholder="كود الخصم"
                    value={ffCoupon}
                    onChange={e => setFfCoupon(e.target.value)}
                  />
                  <button onClick={() => { if (ffCoupon === "OVELINE10") setFfDiscount(1); }}>تطبيق</button>
                </div>
                {ffQty >= 5 && <div className="ff-vip-msg">🔥 خصم VIP مفعّل ({ffQty >= 10 ? "20%" : "10%"})</div>}
                <div className="ff-recommend">{ffRecommend}</div>
                <div className="ff-smart-hint">{ffHint}</div>
                <button
                  className="ff-checkout-buy"
                  style={{ marginTop:"14px" }}
                  disabled={!ffSelected}
                  onClick={() => {
                    if (!ffSelected) return;
                    setFfShowSuccess(true);
                    setTimeout(() => setFfShowSuccess(false), 2500);
                    openDetail(ffSelected);
                  }}
                >
                  {ffSelected ? `شراء الآن — ${formatSDG(ffFinal)} ج.س` : "اختر باقة أولاً"}
                </button>
              </div>

            </div>
            );
          })() : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-pink-600" />
                <h2 className="font-extrabold text-pink-900">اختر الباقة</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-pink-300 to-transparent" />
                <span className="text-[10px] text-pink-500">اضغط لعرض السعر</span>
              </div>

              {isLoading && (
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-2xl bg-pink-100/50 animate-pulse" />
                  ))}
                </div>
              )}

              {!isLoading && products.length === 0 && (
                <div className="text-center py-12 text-pink-600">
                  <div className="text-4xl mb-2">🎁</div>
                  <div className="font-bold">لا توجد باقات متاحة حالياً</div>
                  <div className="text-xs opacity-70 mt-1">تابعنا قريباً لإضافة باقات جديدة</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {products.map((p, i) => {
                  const available = stock[String(p.id)] ?? 0;
                  const isRevealed = revealed.has(p.id);
                  const price = Number(p.price);
                  const oldPrice = p.oldPrice ? Number(p.oldPrice) : null;
                  const discount = oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
                  const qtyLabel = (p.quantity ?? "").replace(/[^\d]/g, "") || "?";
                  const outOfStock = available === 0;

                  return (
                    <motion.button
                      key={p.id}
                      transition={{ delay: i * 0.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => !outOfStock && openDetail(p)}
                      disabled={outOfStock}
                      className={`relative overflow-hidden rounded-2xl text-right transition ${outOfStock ? "bg-zinc-100 opacity-60 cursor-not-allowed" : "shadow-lg hover:shadow-xl active:shadow-md"}`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${info.gradient} ${outOfStock ? "grayscale" : ""}`} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Gem className="w-[120%] h-[120%] text-white opacity-20 -translate-y-2" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Gem className="w-12 h-12 text-white/95 drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                      <div className="absolute top-2 left-2 text-[8.5px] font-black text-white/55 tracking-[0.2em] select-none drop-shadow">OVELIN MALL</div>
                      {discount > 0 && !outOfStock && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-yellow-400 text-yellow-900 text-[9px] font-black shadow">-{discount}%</div>
                      )}
                      {outOfStock && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black shadow">نفدت</div>
                      )}
                      <div className="relative p-3 aspect-[5/4] flex flex-col justify-between">
                        <div className="self-end inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold text-white border border-white/40">
                          × {qtyLabel}
                        </div>
                        <div className="text-white">
                          <div className="font-extrabold text-[13px] leading-tight drop-shadow line-clamp-1">{p.name}</div>
                          <div className="mt-1.5 flex items-center justify-between gap-1">
                            <AnimatePresence mode="wait">
                              {isRevealed ? (
                                <motion.div key="price" className="flex items-baseline gap-0.5 bg-white/95 text-pink-700 rounded-full px-2 py-0.5 shadow">
                                  <span className="text-[13px] font-black leading-none">{Number(p.price).toFixed(2)}</span>
                                  <span className="text-[8px] font-bold opacity-80">ج.س</span>
                                </motion.div>
                              ) : (
                                <motion.div key="reveal" exit={{ opacity: 0 }} className="flex items-center gap-1 bg-white/25 backdrop-blur text-white rounded-full px-2 py-0.5 text-[10px] font-bold border border-white/40">
                                  <Eye className="w-2.5 h-2.5" />
                                  عرض السعر
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <div className="rounded-full bg-white/95 text-pink-700 p-1 shadow shrink-0">
                              <ShoppingCart className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== SMM ORDER MODAL ===== */}
      <Dialog
        open={!!smmSelectedProduct}
        onOpenChange={(o) => {
          if (!smmBuyMutation.isPending && !o) {
            setSmmSelectedProduct(null);
            setSmmComments([]);
            setSmmCommentInput("");
          }
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-w-md p-0 overflow-hidden rounded-3xl border-0 bg-transparent shadow-2xl"
        >
          {smmSelectedProduct && (
            <div className="bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
              {/* ── Header ── */}
              <div className="relative overflow-hidden bg-gradient-to-br from-rose-700 via-pink-700 to-fuchsia-800 text-white pb-7">
                {/* Decorative blobs */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-400/30 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-fuchsia-500/25 rounded-full blur-2xl pointer-events-none" />

                <div className="relative text-center pt-8 px-5">
                  {/* Platform image — app-icon style rounded square */}
                  <div className="inline-block mb-4">
                    <div className="w-24 h-24 rounded-[24%] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-2 ring-white/25 mx-auto">
                      {info.bgImage ? (
                        <img
                          src={`${import.meta.env.BASE_URL}${info.bgImage.replace(/^\//, "")}`}
                          alt={info.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/20 backdrop-blur flex items-center justify-center text-4xl">
                          {info.emoji}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Platform name */}
                  <div className="text-[10px] font-black tracking-[0.25em] uppercase opacity-75 mb-1">
                    {info.name}
                  </div>

                  {/* Service name */}
                  <div className="text-[15px] font-black leading-snug px-2 drop-shadow-sm">
                    {smmSelectedProduct.name}
                  </div>

                  {/* Info chips row — أدنى وأقصى فقط */}
                  <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur border border-white/25 rounded-full px-3 py-1 text-[10px] font-bold">
                      📉 أدنى: {smmMin.toLocaleString("ar")}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur border border-white/25 rounded-full px-3 py-1 text-[10px] font-bold">
                      📈 أقصى: {smmMax.toLocaleString("ar")}
                    </span>
                  </div>
                </div>

                {/* Wave bottom */}
                <div className="absolute bottom-0 left-0 right-0">
                  <svg viewBox="0 0 400 20" className="w-full h-5 fill-white" preserveAspectRatio="none">
                    <path d="M0,10 C100,0 300,20 400,10 L400,20 L0,20 Z" />
                  </svg>
                </div>
              </div>

              {/* Body */}
              <div className="relative p-5 space-y-4 overflow-hidden">
                {/* Falling stars background */}
                {[
                  { left: "8%",  delay: 0,    dur: 3.2, size: 10 },
                  { left: "22%", delay: 0.8,  dur: 2.8, size: 8  },
                  { left: "38%", delay: 1.5,  dur: 3.6, size: 12 },
                  { left: "54%", delay: 0.3,  dur: 2.5, size: 9  },
                  { left: "68%", delay: 1.1,  dur: 3.0, size: 7  },
                  { left: "82%", delay: 0.6,  dur: 3.8, size: 11 },
                  { left: "92%", delay: 1.8,  dur: 2.9, size: 8  },
                  { left: "14%", delay: 2.1,  dur: 3.3, size: 9  },
                  { left: "46%", delay: 2.6,  dur: 2.7, size: 7  },
                  { left: "75%", delay: 1.9,  dur: 3.5, size: 10 },
                ].map((s, i) => (
                  <motion.span
                    key={i}
                    className="absolute pointer-events-none select-none z-0"
                    style={{
                      left: s.left,
                      top: "-10px",
                      fontSize: s.size,
                      color: "#f9a8d4",
                      textShadow: "0 0 6px rgba(244,114,182,0.6)",
                      opacity: 0,
                    }}
                    animate={{
                      y: ["0px", "600px"],
                      opacity: [0, 0.7, 0.7, 0],
                      rotate: [0, 180],
                    }}
                    transition={{
                      duration: s.dur,
                      delay: s.delay,
                      repeat: Infinity,
                      ease: "linear",
                      times: [0, 0.1, 0.85, 1],
                    }}
                  >
                    ✦
                  </motion.span>
                ))}

                {/* ── Progress Steps ── */}
                {!isCustomComments && (
                  <div className="flex items-center gap-1 mb-1">
                    {/* Step 1 */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        smmLink.trim() && (smmLink.startsWith("http://") || smmLink.startsWith("https://"))
                          ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-[0_3px_10px_rgba(236,72,153,0.4)]"
                          : "bg-pink-100 text-pink-400"
                      }`}>
                        {smmLink.trim() && (smmLink.startsWith("http://") || smmLink.startsWith("https://")) ? "✓" : "1"}
                      </div>
                      <span className={`text-[10px] font-bold ${smmLink.trim() && (smmLink.startsWith("http://") || smmLink.startsWith("https://")) ? "text-pink-700" : "text-pink-300"}`}>الرابط</span>
                    </div>
                    {/* Connector */}
                    <div className={`flex-1 h-0.5 rounded-full transition-all ${smmLink.trim() && (smmLink.startsWith("http://") || smmLink.startsWith("https://")) ? "bg-gradient-to-r from-pink-400 to-pink-200" : "bg-pink-100"}`} />
                    {/* Step 2 */}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        smmQtyEntered && smmQtyValid
                          ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-[0_3px_10px_rgba(236,72,153,0.4)]"
                          : "bg-pink-100 text-pink-400"
                      }`}>
                        {smmQtyEntered && smmQtyValid ? "✓" : "2"}
                      </div>
                      <span className={`text-[10px] font-bold ${smmQtyEntered && smmQtyValid ? "text-pink-700" : "text-pink-300"}`}>الكمية</span>
                    </div>
                    {/* Connector */}
                    <div className={`flex-1 h-0.5 rounded-full transition-all ${smmQtyEntered && smmQtyValid ? "bg-gradient-to-r from-pink-400 to-pink-200" : "bg-pink-100"}`} />
                    {/* Step 3 */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black bg-pink-100 text-pink-400">3</div>
                      <span className="text-[10px] font-bold text-pink-300">تأكيد</span>
                    </div>
                  </div>
                )}

                {/* Link input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-pink-900 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-pink-600" />
                    رابط حسابك أو الرابط المستهدف
                    {smmLink.trim() && (smmLink.startsWith("http://") || smmLink.startsWith("https://")) && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mr-auto text-emerald-600 text-[10px] flex items-center gap-0.5 font-bold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> رابط صحيح
                      </motion.span>
                    )}
                  </label>
                  <div className="relative">
                    <Link2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300 pointer-events-none" />
                    <input
                      type="url"
                      value={smmLink}
                      onChange={(e) => setSmmLink(e.target.value)}
                      placeholder="https://..."
                      dir="ltr"
                      className={`w-full rounded-2xl border-2 bg-white shadow-sm pr-10 pl-4 py-3.5 text-sm focus:outline-none transition ${
                        smmLink.trim() && (smmLink.startsWith("http://") || smmLink.startsWith("https://"))
                          ? "border-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15)]"
                          : "border-pink-200 focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.15)]"
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground pr-1">
                    أدخل الرابط الكامل لصفحتك أو المنشور المستهدف
                  </p>
                </div>

                {/* Quantity OR Custom Comments input */}
                {isCustomComments ? (
                  <div className="space-y-2">
                    {/* Label */}
                    <label className="text-xs font-bold text-pink-900 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" />
                      التعليقات المطلوبة
                      {smmComments.length > 0 && (
                        <span className="mr-auto text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          {smmComments.length} تعليق
                        </span>
                      )}
                    </label>

                    {/* Input row */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={smmCommentInput}
                        onChange={(e) => setSmmCommentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && smmCommentInput.trim()) {
                            e.preventDefault();
                            setSmmComments((prev) => [...prev, smmCommentInput.trim()]);
                            setSmmCommentInput("");
                            setError(null);
                          }
                        }}
                        placeholder="اكتب تعليقاً ثم اضغط +"
                        dir="auto"
                        className="flex-1 rounded-2xl border-2 bg-pink-50/50 px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.2)] border-pink-200 transition"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (smmCommentInput.trim()) {
                            setSmmComments((prev) => [...prev, smmCommentInput.trim()]);
                            setSmmCommentInput("");
                            setError(null);
                          }
                        }}
                        className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white font-black text-lg shadow flex items-center justify-center active:scale-95 transition shrink-0"
                      >
                        +
                      </button>
                    </div>

                    {/* Comments box */}
                    {smmComments.length > 0 && (
                      <div className="rounded-2xl border-2 border-pink-100 bg-pink-50/40 p-3 space-y-2 max-h-48 overflow-y-auto">
                        {smmComments.map((comment, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 bg-white rounded-xl border border-pink-100 px-3 py-2 shadow-sm"
                          >
                            <span className="text-[10px] font-black text-pink-400 mt-0.5 shrink-0 w-4 text-center">
                              {idx + 1}
                            </span>
                            <span className="flex-1 text-sm text-gray-800 break-words leading-snug" dir="auto">
                              {comment}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSmmComments((prev) => prev.filter((_, i) => i !== idx));
                                setError(null);
                              }}
                              className="text-pink-300 hover:text-rose-500 transition shrink-0 mt-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {smmComments.length === 0 && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-pink-400 shrink-0" />
                        أضف تعليقاً واحداً على الأقل للمتابعة
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-pink-900 flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-pink-600" />
                      الكمية المطلوبة
                      <span className="mr-auto text-[10px] text-pink-400 font-medium bg-pink-50 border border-pink-200 rounded-full px-2 py-0.5">
                        {smmMin.toLocaleString("ar")} – {smmMax.toLocaleString("ar")}
                      </span>
                    </label>

                    {/* Quantity display + manual input */}
                    <div className={`rounded-2xl border-2 bg-white shadow-sm px-4 py-3 text-center transition ${
                      smmQtyEntered && !smmQtyValid
                        ? "border-red-300"
                        : smmQtyEntered && smmQtyValid
                        ? "border-pink-400 shadow-[0_0_0_3px_rgba(236,72,153,0.1)]"
                        : "border-pink-100"
                    }`}>
                      <AnimatePresence mode="popLayout">
                        <motion.div
                          key={smmQty || "zero"}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.15 }}
                          className={`text-3xl font-black ${smmQtyEntered && smmQty !== "0" ? "text-pink-800" : "text-pink-300"}`}
                        >
                          {smmQty ? parseInt(smmQty).toLocaleString("ar") : "٠"}
                        </motion.div>
                      </AnimatePresence>
                      <div className="text-[10px] text-pink-400 mt-0.5">وحدة</div>
                    </div>

                    {/* Manual number input */}
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={smmMin}
                        max={smmMax}
                        placeholder={`أدخل الكمية (${smmMin.toLocaleString("ar")} – ${smmMax.toLocaleString("ar")})`}
                        value={smmQty}
                        onChange={(e) => {
                          setSmmQty(e.target.value);
                          setError(null);
                        }}
                        className="w-full rounded-2xl border-2 border-pink-200 bg-pink-50/40 px-4 py-3 text-sm font-bold text-pink-900 text-center focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-400 transition placeholder:text-pink-300 placeholder:font-normal [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        dir="ltr"
                      />
                    </div>
                    <div className="text-[9px] text-pink-300 font-bold text-center">
                      النطاق: {smmMin.toLocaleString("ar")} – {smmMax.toLocaleString("ar")}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="rounded-2xl bg-gradient-to-br from-pink-600 to-rose-700 p-4 text-white shadow-lg">
                  <div className="text-xs opacity-80 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    الإجمالي
                  </div>
                  <div className="flex items-baseline gap-2">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={smmTotal}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                        className="text-3xl font-black"
                      >
                        {formatSDG(smmTotal)}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-sm font-bold opacity-80">ج.س</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/30 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 opacity-90">
                      <Wallet className="w-3 h-3" /> رصيد محفظتك
                    </span>
                    <span className={`font-bold ${smmCanAfford ? "text-emerald-200" : "text-yellow-200"}`}>
                      {formatSDG(balance)} ج.س
                    </span>
                  </div>
                </div>

                {!smmCanAfford && (
                  <Link
                    href="/wallet"
                    onClick={() => setSmmSelectedProduct(null)}
                    className="block text-center py-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold"
                  >
                    ⚠ رصيدك لا يكفي — اشحن المحفظة الآن
                  </Link>
                )}
                {smmQtyEntered && !smmQtyValid && (
                  <div className="rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs px-3 py-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    الكمية يجب أن تكون بين {smmMin.toLocaleString("ar-EG")} و {smmMax.toLocaleString("ar-EG")}
                  </div>
                )}
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}


                <div className="flex gap-3 pb-2">
                  <button
                    onClick={() => setSmmSelectedProduct(null)}
                    disabled={smmBuyMutation.isPending}
                    className="flex-1 py-4 rounded-2xl bg-white border-2 border-pink-200 text-pink-700 font-bold text-sm active:scale-95 disabled:opacity-50 transition hover:border-pink-400"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() =>
                      smmSelectedProduct &&
                      smmBuyMutation.mutate({
                        productId: smmSelectedProduct.id,
                        link: smmLink,
                        quantity: smmEffectiveQty,
                        comments: isCustomComments ? smmComments.join("\n") : undefined,
                      })
                    }
                    disabled={
                      smmBuyMutation.isPending ||
                      !smmQtyEntered ||
                      !smmQtyValid ||
                      !smmCanAfford ||
                      !smmLink.trim()
                    }
                    className="flex-[2] py-4 rounded-2xl bg-gradient-to-l from-rose-600 via-pink-600 to-fuchsia-700 text-white font-extrabold text-base shadow-[0_8px_30px_rgba(236,72,153,0.5)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition"
                  >
                    {smmBuyMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        تأكيد الطلب
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== SMM RESULT MODAL ===== */}
      <Dialog open={smmResultOpen} onOpenChange={setSmmResultOpen}>
        <DialogContent
          dir="rtl"
          className="max-w-sm p-0 overflow-hidden rounded-3xl border-0 bg-transparent shadow-2xl"
        >
          <div className="relative overflow-hidden rounded-3xl bg-white">
            {/* Confetti layer */}
            <Confetti />

            {/* Gradient header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-700 pt-10 pb-12 px-6 text-center">
              {/* Decorative blobs */}
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-pink-300/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-fuchsia-400/25 rounded-full blur-2xl pointer-events-none" />

              {/* Animated checkmark icon */}
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className="relative inline-flex w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 shadow-[0_12px_40px_rgba(0,0,0,0.25)] items-center justify-center mb-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  className="text-5xl"
                >
                  ✅
                </motion.div>
              </motion.div>

              <DialogTitle className="text-2xl font-black text-white drop-shadow-sm">
                تم استلام طلبك!
              </DialogTitle>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-2 inline-flex items-center gap-2 bg-white/20 backdrop-blur border border-white/30 rounded-full px-4 py-1.5 text-sm font-bold text-white"
              >
                <span className="text-[10px] opacity-80">رقم الطلب</span>
                <span className="font-black text-base">#{smmResult?.orderId}</span>
              </motion.div>

              {/* Wave */}
              <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 400 24" className="w-full h-6 fill-white" preserveAspectRatio="none">
                  <path d="M0,12 C80,0 200,24 320,8 C370,2 390,10 400,12 L400,24 L0,24 Z" />
                </svg>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pt-4 pb-6 space-y-4">
              {/* Status info row */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-pink-50 border border-pink-100 py-3 px-1">
                  <div className="text-xl mb-1">🔥</div>
                  <div className="text-[10px] font-black text-pink-800">بدأ التنفيذ</div>
                </div>
                <div className="rounded-2xl bg-pink-50 border border-pink-100 py-3 px-1">
                  <div className="text-xl mb-1">⚡</div>
                  <div className="text-[10px] font-black text-pink-800">1–24 ساعة</div>
                </div>
                <div className="rounded-2xl bg-pink-50 border border-pink-100 py-3 px-1">
                  <div className="text-xl mb-1">🔒</div>
                  <div className="text-[10px] font-black text-pink-800">ضمان كامل</div>
                </div>
              </div>

              {/* CTA button */}
              <Link
                href="/orders"
                onClick={() => setSmmResultOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-l from-rose-600 via-pink-600 to-fuchsia-700 text-white font-extrabold text-base shadow-[0_8px_28px_rgba(236,72,153,0.45)] active:scale-95 transition"
              >
                <Package className="w-5 h-5" />
                تابع طلباتي
              </Link>

              <button
                onClick={() => setSmmResultOpen(false)}
                className="w-full py-2.5 text-pink-400 text-sm font-bold hover:text-pink-600 transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== GAME CARD DETAIL MODAL ===== */}
      <Dialog
        open={!!detailProduct}
        onOpenChange={(o) => {
          if (!buyMutation.isPending && !o) setDetailProduct(null);
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-w-md p-0 overflow-hidden rounded-3xl border-0 bg-transparent shadow-2xl"
        >
          {detailProduct && (
            <div className="bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div
                className={`relative overflow-hidden bg-gradient-to-br ${info.gradient} text-white p-5 pb-7`}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 8, 0] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-12 -left-12 w-48 h-48 bg-red-500/20 rounded-full blur-3xl"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Gem className="w-[110%] h-[110%] text-white opacity-15" />
                </div>
                <button
                  onClick={() => !buyMutation.isPending && setDetailProduct(null)}
                  className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white active:scale-90 z-10"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="relative text-center pt-6">
                  <motion.div
                    transition={{ type: "spring", stiffness: 220, damping: 15 }}
                    className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md border border-white/40 shadow-xl mb-3"
                  >
                    <Gem className="w-14 h-14 text-white drop-shadow-[0_6px_18px_rgba(0,0,0,0.4)]" />
                  </motion.div>
                  <div className="text-[10px] opacity-80 font-bold tracking-widest mb-1">
                    {info.name}
                  </div>
                  <div className="text-2xl font-black drop-shadow leading-tight">
                    {detailProduct.name}
                  </div>
                  <div className="mt-1 text-xs opacity-90">
                    {detailProduct.quantity ?? detailProduct.description}
                  </div>
                  <motion.div
                    transition={{ delay: 0.15, type: "spring" }}
                    className="mt-4 inline-flex items-baseline gap-1 px-5 py-2 rounded-full bg-white text-pink-700 shadow-2xl border-2 border-white/60"
                  >
                    <span className="text-[10px] font-bold opacity-70">سعر الوحدة</span>
                    <span className="text-2xl font-black mr-1">{formatSDG(detailPrice)}</span>
                    <span className="text-xs font-bold">ج.س</span>
                  </motion.div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-2xl bg-pink-50 border-2 border-pink-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-pink-900">عدد الأكواد</span>
                    <span className="text-[10px] text-pink-600">المتاح: {detailStock} كود</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white font-black shadow-[0_4px_15px_rgba(236,72,153,0.5)] active:scale-90 disabled:opacity-40 flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center text-2xl font-black text-pink-800 bg-white rounded-xl py-2 border-2 border-pink-200 focus-within:border-pink-500 focus-within:shadow-[0_0_0_3px_rgba(236,72,153,0.15)]">
                      {quantity}
                    </div>
                    <button
                      onClick={() =>
                        setQuantity((q) => Math.min(detailStock, Math.min(50, q + 1)))
                      }
                      disabled={quantity >= detailStock || quantity >= 50}
                      className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white font-black shadow-[0_4px_15px_rgba(236,72,153,0.5)] active:scale-90 disabled:opacity-40 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Pink slider */}
                  <input
                    type="range"
                    min={1}
                    max={Math.min(detailStock, 50)}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full mt-3 accent-pink-500 cursor-pointer"
                  />
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[1, 5, 10, 25].map((n) => (
                      <button
                        key={n}
                        onClick={() => setQuantity(Math.min(detailStock, Math.min(50, n)))}
                        disabled={n > detailStock}
                        className={`py-1 rounded-lg text-[11px] font-bold transition disabled:opacity-30 ${
                          quantity === n
                            ? "bg-pink-600 text-white shadow"
                            : "bg-white text-pink-700 border border-pink-200"
                        }`}
                      >
                        ×{n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-pink-600 to-rose-700 p-4 text-white shadow-lg">
                  <div className="flex items-center justify-between text-xs opacity-90 mb-1">
                    <span>الإجمالي</span>
                    <span>
                      {formatSDG(detailPrice)} × {quantity}
                    </span>
                  </div>
                  <div className="text-3xl font-black">
                    {formatSDG(detailTotal)}{" "}
                    <span className="text-sm font-bold opacity-80">ج.س</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/30 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 opacity-90">
                      <Wallet className="w-3 h-3" /> رصيد محفظتك
                    </span>
                    <span className={`font-bold ${canAfford ? "text-emerald-200" : "text-yellow-200"}`}>
                      {formatSDG(balance)} ج.س
                    </span>
                  </div>
                </div>

                {!canAfford && (
                  <Link
                    href="/wallet"
                    onClick={() => setDetailProduct(null)}
                    className="block text-center py-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold"
                  >
                    ⚠ رصيدك لا يكفي — اشحن المحفظة الآن
                  </Link>
                )}
                {!enoughStock && canAfford && (
                  <div className="rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs px-3 py-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    الكمية المطلوبة أكبر من المتاح
                  </div>
                )}
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {isFreeFire && (
                  <a
                    href={GARENA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center py-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    أو اشحن مباشرة عبر Garena
                  </a>
                )}

                <div className="flex gap-2 pb-2">
                  <button
                    onClick={() => setDetailProduct(null)}
                    disabled={buyMutation.isPending}
                    className="flex-1 py-3 rounded-2xl bg-white border-2 border-pink-200 text-pink-800 font-bold active:scale-95 disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() =>
                      detailProduct &&
                      buyMutation.mutate({ productId: detailProduct.id, quantity })
                    }
                    disabled={
                      buyMutation.isPending || !canAfford || !enoughStock || quantity < 1
                    }
                    className="flex-[2] py-3 rounded-2xl bg-gradient-to-l from-pink-600 to-rose-600 text-white font-extrabold shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {buyMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        جاري الشراء...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        تأكيد الشراء
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== GAME CARD RESULT MODAL ===== */}
      <Dialog open={resultOpen} onOpenChange={setResultOpen}>
        <DialogContent
          dir="rtl"
          className="max-w-md p-0 overflow-hidden rounded-3xl border-0 bg-transparent"
        >
          <div className="bg-zinc-950 rounded-3xl overflow-hidden">
            <div className="relative overflow-hidden bg-gradient-to-br from-pink-700 via-rose-700 to-pink-900 text-white p-6 text-center shadow-[inset_0_0_60px_rgba(236,72,153,0.3)]">
              <Confetti />
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className="inline-flex w-20 h-20 rounded-3xl bg-white/20 backdrop-blur items-center justify-center mb-3 shadow-[0_0_30px_rgba(255,255,255,0.3)] border border-white/30"
              >
                <span className="text-4xl">💎</span>
              </motion.div>
              <DialogTitle className="text-2xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">تم التسليم بنجاح! 🎉</DialogTitle>
              <div className="text-xs opacity-90 mt-1 font-semibold">
                {resultProduct?.name} — {resultCodes.length} {resultCodes.length === 1 ? "كود" : "أكواد"}
              </div>
              <div className="mt-3 inline-flex items-baseline gap-1 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur border border-white/40 shadow-[0_0_15px_rgba(236,72,153,0.4)]">
                <span className="text-[10px] opacity-80">دفعت</span>
                <span className="text-lg font-black">{formatSDG(resultTotal)}</span>
                <span className="text-[10px]">ج.س</span>
              </div>
            </div>

            <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto bg-zinc-950">
              {resultCodes.map((code, idx) => (
                <motion.div
                  key={idx}
                  transition={{ delay: idx * 0.08, type: "spring", stiffness: 200 }}
                  className="rounded-xl overflow-hidden shadow-[0_0_20px_rgba(236,72,153,0.3)] border border-pink-500/40"
                >
                  <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-pink-500/20">
                    <span className="text-[10px] text-pink-400 font-bold tracking-wider">💎 كود #{idx + 1}</span>
                    <button
                      onClick={() => copyCode(code, idx)}
                      className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded-md font-bold active:scale-95 border transition ${
                        copiedIndex === idx
                          ? "bg-emerald-500/30 text-emerald-300 border-emerald-500/40"
                          : "bg-pink-600/30 text-pink-300 border-pink-500/40 hover:bg-pink-600/50"
                      }`}
                    >
                      {copiedIndex === idx ? (
                        <><CheckCircle2 className="w-3 h-3" /> منسوخ ✓</>
                      ) : (
                        <><Copy className="w-3 h-3" /> نسخ</>
                      )}
                    </button>
                  </div>
                  <div className="bg-zinc-950 px-4 py-4 text-center">
                    <div className="font-mono text-base font-black text-white break-all select-all tracking-widest drop-shadow-[0_0_12px_rgba(236,72,153,0.7)] leading-relaxed">
                      {code}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-4 space-y-2 border-t bg-zinc-900">
              {resultCodes.length > 1 && (
                <button
                  onClick={copyAllCodes}
                  className="w-full py-3 rounded-2xl bg-gradient-to-l from-pink-600 to-rose-600 text-white font-bold shadow-[0_4px_20px_rgba(236,72,153,0.4)] active:scale-95 flex items-center justify-center gap-2"
                >
                  {copiedAll ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-300" /> تم نسخ كل الأكواد ✓</>
                  ) : (
                    <><Copy className="w-4 h-4" /> نسخ كل الأكواد</>
                  )}
                </button>
              )}
              <Link
                href="/my-codes"
                onClick={() => setResultOpen(false)}
                className="block text-center py-2.5 rounded-2xl bg-zinc-800 border border-pink-500/30 text-pink-300 font-bold"
              >
                عرض جميع أكوادي
              </Link>
              <button
                onClick={() => setResultOpen(false)}
                className="w-full py-2 text-zinc-500 text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 1.5,
        color: ["#fbbf24", "#f472b6", "#34d399", "#60a5fa", "#fff"][i % 5],
        size: 4 + Math.random() * 5,
      })),
    [],
  );
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -20, opacity: 1, rotate: 0 }}
          animate={{ y: 200, opacity: [1, 1, 0], rotate: 360 }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity }}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
