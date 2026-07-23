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
  Headphones,
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
import { useRealtimeEvent } from "@/lib/realtime";
import { useWalletBalance } from "@/hooks/useWalletBalance";

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

// نصوص حقل الرابط حسب نوع الخدمة
const SMM_LINK_TEXT: Record<SmmTab, { label: string; hint: string }> = {
  followers: { label: "رابط حسابك أو الصفحة",    hint: "أرسل رابط حسابك أو الصفحة" },
  likes:     { label: "رابط المنشور أو الريلز",   hint: "أدخل رابط المنشور أو الريلز" },
  views:     { label: "رابط الريلز",              hint: "أدخل رابط الريلز" },
  comments:  { label: "رابط المنشور أو الريلز",   hint: "أدخل رابط المنشور أو الريلز" },
  shares:    { label: "رابط المنشور أو الريلز",   hint: "أدخل رابط المنشور أو الريلز" },
};

const GARENA_URL = "https://profile.garena.com/global/";

const FF_FEATURES = [
  { icon: Zap,        label: "تسليم فوري" },
  { icon: ShieldCheck, label: "ضمان كامل" },
  { icon: Crown,       label: "أرخص الأسعار" },
  { icon: Headphones,  label: "دعم 24/7" },
];

const FF_DIAMONDS = [110, 210, 530, 1080, 2200];
const PUBG_UC_AMOUNTS = [60, 325, 660, 1800, 3850, 8100];

export default function Game() {
  const params = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const slug = params.slug ?? "";
  const info = useMemo(() => platformBySlug(slug), [slug]);
  const qc = useQueryClient();

  const isSocial = info?.category === "social_followers";
  // PUBG uses the same legacy game storefront as Free Fire.  Keeping one
  // storefront here prevents the older standalone PUBG page from drifting
  // away from the prices, checkout, and direct-code behavior.
  const isFreeFire = slug === "free-fire" || slug === "pubg";
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

  // ✅ رصيد حي يتحدث فوراً عبر WebSocket دون الحاجة لتسجيل خروج
  const { balance } = useWalletBalance();

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
  const [ffPlayerName, setFfPlayerName] = useState("");
  const [ffPlayerId, setFfPlayerId] = useState("");
  const [ffCheckoutOpen, setFfCheckoutOpen] = useState(false);
  const [ffBuyError, setFfBuyError] = useState<string | null>(null);
  const [ffOrderDone, setFfOrderDone] = useState(false);

  // ===== FREE FIRE: direct code purchase states =====
  const [ffCodeOpen, setFfCodeOpen] = useState(false);
  const [ffCodeSelected, setFfCodeSelected] = useState<any | null>(null);
  const [ffCodeBuyDone, setFfCodeBuyDone] = useState<string | null>(null);
  const [ffCodeBuyError, setFfCodeBuyError] = useState<string | null>(null);

  // ===== PUBG special states =====
  const [pubgSelected, setPubgSelected] = useState<Product | null>(null);
  const [pubgPlayerId, setPubgPlayerId] = useState("");
  const [pubgCheckoutOpen, setPubgCheckoutOpen] = useState(false);
  const [pubgBuyError, setPubgBuyError] = useState<string | null>(null);
  const [pubgOrderDone, setPubgOrderDone] = useState(false);

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

  // ===== FREE FIRE BUY mutation =====
  const ffBuyMutation = useMutation({
    mutationFn: async ({ productId, playerName, playerId }: { productId: number; playerName: string; playerId: string }) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          targetInfo: isPubg ? playerId.trim() : `${playerName.trim()} | ${playerId.trim()}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "فشل الطلب");
      return data;
    },
    onSuccess: () => {
      setFfOrderDone(true);
      setFfBuyError(null);
      qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
      setTimeout(() => {
        setFfCheckoutOpen(false);
        setFfSelected(null);
        setFfPlayerName("");
        setFfPlayerId("");
        setFfOrderDone(false);
      }, 2000);
    },
    onError: (err: any) => {
      setFfBuyError(err.message ?? "فشل الطلب، حاول مرة أخرى");
    },
  });

  // ===== FREE FIRE: fetch direct code products =====
  const { data: ffCodeProducts = [] } = useQuery({
    queryKey: [isPubg ? "pubg-code-products" : "ff-code-products"],
    queryFn: async () => {
      const res = await fetch(isPubg ? "/api/pubg-code-products" : "/api/ff-code-products");
      if (!res.ok) return [];
      return res.json() as Promise<any[]>;
    },
    enabled: isFreeFire,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const ffCodeBuyMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, targetInfo: "كود مباشر" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "فشل الطلب");
      return data;
    },
    onSuccess: (order) => {
      setFfCodeBuyDone(order.deliveredCode ?? null);
      setFfCodeBuyError(null);
      qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
      qc.invalidateQueries({ queryKey: [isPubg ? "pubg-code-products" : "ff-code-products"] });
    },
    onError: (err: any) => {
      setFfCodeBuyError(err.message ?? "فشل الطلب، حاول مرة أخرى");
    },
  });

  // ===== PUBG BUY mutation =====
  const pubgBuyMutation = useMutation({
    mutationFn: async ({ productId, playerId }: { productId: number; playerId: string }) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, targetInfo: playerId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "فشل الطلب");
      return data;
    },
    onSuccess: () => {
      setPubgOrderDone(true);
      setPubgBuyError(null);
      qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
      setTimeout(() => {
        setPubgCheckoutOpen(false);
        setPubgSelected(null);
        setPubgPlayerId("");
        setPubgOrderDone(false);
      }, 2000);
    },
    onError: (err: any) => {
      setPubgBuyError(err.message ?? "فشل الطلب، حاول مرة أخرى");
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

  // Free Fire: find matching direct-code product for the selected gem package
  const selectedDiamonds = ffSelected
    ? parseInt((ffSelected.quantity ?? ffSelected.name).replace(/[^\d]/g, ""))
    : 0;
  const matchingCodeProduct = ffSelected
    ? (ffCodeProducts as any[]).find((p: any) => {
        const d = parseInt((p.quantity ?? p.name).replace(/[^\d]/g, ""));
        return d === selectedDiamonds && p.available > 0;
      }) ?? null
    : null;
  const gameAmounts = isPubg ? PUBG_UC_AMOUNTS : FF_DIAMONDS;
  const gameUnitLabel = isPubg ? "UC" : "جوهرة";
  const gameName = isPubg ? "PUBG MOBILE" : "FREE FIRE";
  const gameSubtitle = isPubg ? "اشحن UC الآن" : "اشحن جواهرك الآن";

  return (
    <AppLayout>
      {/* ===== HERO HEADER (hidden for Free Fire & PUBG — they have their own hero) ===== */}
      {!isFreeFire && !isPubg && <div className={`relative overflow-hidden ${isSocial ? "text-rose-800 bg-white" : "text-white"} ${
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
                background: "linear-gradient(135deg, #ffffff 0%, #e5e7eb 50%, #fdf4ff 100%)",
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
                      <span className="text-[10px] bg-white text-pink-700 rounded-full px-2.5 py-0.5 font-bold border border-pink-200">
                        أدنى: {pMin.toLocaleString("ar")}
                      </span>
                      <span className="text-[10px] bg-white text-rose-700 rounded-full px-2.5 py-0.5 font-bold border border-rose-200">
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
                      <div className="rounded-xl border-2 border-pink-200 bg-white px-3 py-1.5 text-center">
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
            <div className="flex-1 h-px bg-gradient-to-r from-red-300 to-transparent" />
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
                  {discount > 0 && !isBest && !outOfStock && (
                    <div className="bg-gradient-to-r from-pink-500 to-pink-600 text-white text-[9px] font-black py-1 text-center tracking-wider">
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
                        <span className="text-[10px] bg-white text-pink-700 rounded-full px-2 py-0.5 font-bold border border-pink-200">⚡ تسليم فوري</span>
                        <span className="text-[10px] bg-white text-rose-700 rounded-full px-2 py-0.5 font-bold border border-rose-200">🔒 ضمان كامل</span>
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
        <div className={`${isFreeFire || isPubg ? "min-h-screen" : "px-4 py-5 min-h-[60vh]"}`}>
          {false ? (
            <div dir="rtl" className="-mx-0 -my-0">
              {/* ── Hero ── */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full overflow-hidden"
                style={{ height: "300px" }}
              >
                <style>{`
                  @keyframes pubg-spark {
                    0%   { opacity: 0;   transform: translate(0, 0) scale(1); }
                    18%  { opacity: 1; }
                    70%  { opacity: 0.5; transform: translate(var(--dx, 6px), -70px) scale(0.55); }
                    100% { opacity: 0;   transform: translate(var(--dx, 10px), -120px) scale(0.15); }
                  }
                  @keyframes pubg-spark2 {
                    0%, 100% { opacity: 0;   transform: translate(0,0) scale(0.4); }
                    25%      { opacity: 0.9; transform: translate(var(--dx,-5px), -40px) scale(1); }
                    75%      { opacity: 0.2; transform: translate(var(--dx, 8px), -90px) scale(0.35); }
                  }
                  .pubg-sp  { animation: pubg-spark  var(--d,4s)   var(--delay,0s) ease-out    infinite; }
                  .pubg-sp2 { animation: pubg-spark2 var(--d,5.5s) var(--delay,0s) ease-in-out infinite; }
                `}</style>
                <img
                  src="/games/pubg.jpg"
                  alt="PUBG Mobile"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: "center top" }}
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(190,24,93,0.82) 0%, rgba(225,29,72,0.75) 40%, rgba(100,0,30,0.88) 100%)" }} />
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 32px)",
                }} />
                {[
                  { left: "6%",  bottom: "8%",  delay: "0s",   dur: "4.2s", dx: "5px",  size: 3, cls: "pubg-sp"  },
                  { left: "15%", bottom: "20%", delay: "1.1s", dur: "5.0s", dx: "-7px", size: 2, cls: "pubg-sp2" },
                  { left: "26%", bottom: "5%",  delay: "0.5s", dur: "3.8s", dx: "9px",  size: 4, cls: "pubg-sp"  },
                  { left: "38%", bottom: "30%", delay: "2.0s", dur: "5.5s", dx: "-4px", size: 2, cls: "pubg-sp2" },
                  { left: "50%", bottom: "12%", delay: "0.3s", dur: "4.6s", dx: "6px",  size: 3, cls: "pubg-sp"  },
                  { left: "62%", bottom: "40%", delay: "1.5s", dur: "5.2s", dx: "-8px", size: 2, cls: "pubg-sp2" },
                  { left: "73%", bottom: "7%",  delay: "0.8s", dur: "4.0s", dx: "5px",  size: 4, cls: "pubg-sp"  },
                  { left: "84%", bottom: "25%", delay: "2.3s", dur: "5.8s", dx: "-6px", size: 2, cls: "pubg-sp2" },
                  { left: "91%", bottom: "10%", delay: "0.6s", dur: "4.4s", dx: "7px",  size: 3, cls: "pubg-sp"  },
                  { left: "20%", bottom: "55%", delay: "1.8s", dur: "6.0s", dx: "-5px", size: 2, cls: "pubg-sp2" },
                  { left: "44%", bottom: "60%", delay: "0.9s", dur: "5.4s", dx: "4px",  size: 2, cls: "pubg-sp"  },
                  { left: "68%", bottom: "50%", delay: "2.6s", dur: "4.8s", dx: "-9px", size: 3, cls: "pubg-sp2" },
                ].map((s, i) => (
                  <div key={i} className={s.cls} style={{
                    position: "absolute", bottom: s.bottom, left: s.left,
                    width: s.size, height: s.size, borderRadius: "50%",
                    background: "radial-gradient(circle, #fff 0%, #f97316 60%, transparent 100%)",
                    "--delay": s.delay, "--d": s.dur, "--dx": s.dx,
                  } as React.CSSProperties} />
                ))}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-center px-8 py-4 rounded-2xl mx-8" style={{
                    background: "rgba(255,255,255,0.10)",
                    backdropFilter: "blur(14px)",
                    border: "1px solid rgba(255,255,255,0.22)",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
                  }}>
                    <p className="text-white font-black text-4xl leading-none tracking-widest"
                      style={{ textShadow: "0 0 24px rgba(255,120,0,0.7), 0 2px 10px rgba(0,0,0,0.6)" }}>
                      PUBG MOBILE
                    </p>
                    <div className="mt-2 h-px mx-2" style={{ background: "linear-gradient(90deg, transparent, rgba(255,165,0,0.8), transparent)" }} />
                    <p className="text-white/85 text-sm mt-2 font-semibold tracking-wide">اشحن UC الآن</p>
                  </div>
                </div>
              </motion.div>

              <div className="bg-white px-4 pt-5 pb-10">
                {/* Features strip */}
                <div className="flex gap-2.5 mb-5 overflow-x-auto pb-1 no-scrollbar">
                  {FF_FEATURES.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 relative" style={{
                      padding: "7px 16px", borderRadius: "999px",
                      background: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(190,24,93,0.06) 100%)",
                      border: "1.5px solid rgba(220,38,38,0.35)",
                      boxShadow: "0 2px 10px rgba(220,38,38,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}>
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-300 text-[8px] font-black leading-none select-none">⌒</span>
                      <f.icon className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                      <span className="text-gray-800 text-xs font-bold">{f.label}</span>
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-300 text-[8px] font-black leading-none select-none">⌒</span>
                    </div>
                  ))}
                </div>

                {/* Section title */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gradient-to-l from-red-300 to-transparent" />
                  <span className="text-gray-800 font-bold text-sm px-2">اختر باقتك</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-pink-300 to-transparent" />
                </div>

                {/* UC Grid */}
                {isLoading ? (
                  <div className="grid grid-cols-5 gap-2">
                    {PUBG_UC_AMOUNTS.map((uc) => (
                      <div key={uc} className="rounded-2xl aspect-square animate-pulse bg-red-50" />
                    ))}
                  </div>
                ) : (() => {
                  const pubgPackages = PUBG_UC_AMOUNTS.map((uc) => {
                    const product = products.find((p) =>
                      parseInt((p.quantity ?? p.name).replace(/[^\d]/g, "")) === uc
                    );
                    return { uc, product: product ?? null };
                  });
                  return (
                    <div className="grid grid-cols-5 gap-2">
                      {pubgPackages.map(({ uc, product }) => {
                        const price = product ? Number(product.price) : 0;
                        const fakePrice = price > 0 ? price + 100 : 0;
                        const isSelected = !!product && pubgSelected?.id === product.id;
                        const canClick = !!product;
                        return (
                          <motion.button
                            key={uc}
                            whileTap={canClick ? { scale: 0.92 } : {}}
                            onClick={() => {
                              if (!canClick) return;
                              if (!me) { setLocation("/login"); return; }
                              setPubgSelected((prev) => prev?.id === product!.id ? null : product!);
                            }}
                            style={isSelected ? {
                              border: "2px solid #db2777",
                              background: "#fef2f2",
                              boxShadow: "0 0 16px 4px rgba(220,38,38,0.45), 0 4px 12px rgba(220,38,38,0.3)",
                            } : product ? {
                              border: "2px solid #db2777",
                              background: "white",
                              cursor: "pointer",
                            } : {
                              border: "2px solid #db2777",
                              background: "#fef2f2",
                              opacity: 0.25,
                              cursor: "not-allowed",
                            }}
                            className="flex flex-col items-center justify-center rounded-2xl py-3 px-1 transition-all relative"
                          >
                            <span className="text-base leading-none mb-1" style={{
                              filter: "hue-rotate(150deg) saturate(3) brightness(0.95) drop-shadow(0 0 5px rgba(220,38,38,0.9))",
                            }}>💎</span>
                            <span className={`font-black text-xs leading-none ${isSelected ? "text-red-600" : "text-gray-800"}`}>
                              {uc >= 1000 ? (uc / 1000).toFixed(uc % 1000 === 0 ? 0 : 1) + "K" : uc}
                            </span>
                            <span className={`text-[9px] font-bold leading-none mt-0.5 ${isSelected ? "text-red-400" : "text-gray-400"}`}>UC</span>
                            {price > 0 && (
                              <div className="flex flex-col items-center mt-1 gap-0">
                                <span className="text-[8px] text-gray-400 font-semibold leading-none line-through">
                                  {fakePrice.toLocaleString("en-US")}
                                </span>
                                <span className="text-[9px] text-red-500 font-bold leading-none">
                                  {price.toLocaleString("en-US")}
                                </span>
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* UC info row */}
                <AnimatePresence>
                  {pubgSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-4"
                    >
                      <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-red-200 bg-white">
                        <span className="font-bold text-gray-800 text-sm">
                          💎 {parseInt((pubgSelected!.quantity ?? pubgSelected!.name).replace(/[^\d]/g, "")).toLocaleString("en-US")} UC
                        </span>
                        <span className="font-black text-red-600 text-lg">
                          {formatSDG(Number(pubgSelected!.price))} ج.س
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* كيف تشحن؟ */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 rounded-2xl overflow-hidden bg-white border border-red-100"
                  style={{ boxShadow: "0 2px 16px rgba(220,38,38,0.08)" }}
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100"
                    style={{ background: "linear-gradient(90deg, #fef2f2, #fff5f5)" }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #db2777, #e11d48)" }}>
                      <span className="text-white text-[10px] font-black">؟</span>
                    </div>
                    <h4 className="text-gray-800 font-bold text-sm">كيف تشحن؟</h4>
                  </div>
                  {[
                    "اختر الباقة المناسبة",
                    "أدخل ID حسابك في PUBG Mobile",
                    "أكّد الطلب من محفظتك",
                    "ستصلك الـ UC خلال دقائق ✅",
                  ].map((step, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black text-[11px]"
                          style={{ background: "linear-gradient(135deg, #db2777, #e11d48)" }}>
                          {i + 1}
                        </div>
                        <span className="text-gray-600 text-xs leading-relaxed flex-1">{step}</span>
                      </div>
                      {i < 3 && <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, rgba(220,38,38,0.12), transparent)" }} />}
                    </div>
                  ))}
                </motion.div>

                {/* Wallet + Order Summary */}
                <div className="mt-8 rounded-2xl overflow-hidden border border-red-200"
                  style={{ boxShadow: "0 4px 24px rgba(220,38,38,0.15)" }}>
                  <div className="px-5 py-4 flex items-center justify-between relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #be185d, #db2777, #e11d48, #9f1239)" }}>
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 24px)",
                    }} />
                    <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full pointer-events-none"
                      style={{ background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)" }} />
                    <div className="text-right relative">
                      <div className="text-white/70 text-[10px] font-semibold mb-1 tracking-wide uppercase">الإجمالي</div>
                      <div className="text-white font-black text-2xl leading-none tabular-nums"
                        style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                        {pubgSelected ? formatSDG(Number(pubgSelected!.price)) : "0.00"}
                        <span className="text-sm font-bold mr-1">ج.س</span>
                      </div>
                    </div>
                    <div className="w-px h-10 mx-2 opacity-30" style={{ background: "rgba(255,255,255,0.5)" }} />
                    <div className="text-left relative">
                      <div className="text-white/70 text-[10px] font-semibold mb-1 tracking-wide uppercase">رصيد محفظتك</div>
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-white/90 flex-shrink-0" />
                        <span className="text-white font-black text-base tabular-nums"
                          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                          {formatSDG(balance)} <span className="text-sm font-bold">ج.س</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 px-4 py-3 bg-white">
                    <button
                      onClick={() => { if (!pubgSelected) return; setPubgBuyError(null); setPubgOrderDone(false); setPubgCheckoutOpen(true); }}
                      disabled={!pubgSelected}
                      className="flex-1 py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all relative overflow-hidden"
                      style={{
                        background: pubgSelected
                          ? "linear-gradient(135deg, #db2777, #e11d48, #be185d)"
                          : "linear-gradient(135deg, #f9a8c9, #fca5a5)",
                        boxShadow: pubgSelected ? "0 4px 20px rgba(220,38,38,0.4)" : "none",
                      }}
                    >
                      {pubgSelected && (
                        <span className="absolute inset-0 rounded-xl animate-pulse pointer-events-none" style={{ background: "rgba(255,255,255,0.08)" }} />
                      )}
                      <Send className="w-4 h-4 relative" />
                      <span className="relative">اشحن الآن</span>
                    </button>
                    <button
                      onClick={() => setPubgSelected(null)}
                      disabled={!pubgSelected}
                      className="px-5 py-3.5 rounded-xl font-bold text-sm border-2 disabled:opacity-30 transition-all"
                      style={{ borderColor: "#db2777", color: "#db2777", background: "white" }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>

                <p className="text-gray-400 text-xs text-center mt-4">
                  للدعم تواصل معنا عبر خدمة العملاء في التطبيق
                </p>
              </div>

              {/* Checkout Dialog */}
              <Dialog
                open={pubgCheckoutOpen}
                onOpenChange={(o) => { if (!pubgBuyMutation.isPending) setPubgCheckoutOpen(o); }}
              >
                <DialogContent dir="rtl" className="max-w-sm rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-right font-black text-gray-800 mb-1">
                      💎 أدخل ID حسابك في PUBG
                    </DialogTitle>
                  </DialogHeader>
                  {pubgSelected && (
                    <div>
                      <div className="bg-red-50 rounded-2xl p-3 mb-4 flex items-center justify-between">
                        <span className="font-bold text-gray-700 text-sm">
                          {parseInt((pubgSelected!.quantity ?? pubgSelected!.name).replace(/[^\d]/g, "")).toLocaleString("en-US")} UC
                        </span>
                        <span className="font-black text-red-600">
                          {Number(pubgSelected!.price).toFixed(0)} ج.س
                        </span>
                      </div>
                      {pubgOrderDone ? (
                        <div className="text-center py-4">
                          <div className="text-4xl mb-3">✅</div>
                          <p className="font-black text-green-700 text-base">تم الطلب بنجاح!</p>
                          <p className="text-gray-500 text-xs mt-1">ستصلك الـ UC خلال دقائق</p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            <div>
                              <label className="text-xs font-bold text-gray-700 mb-1 block">Player ID</label>
                              <input
                                type="text"
                                value={pubgPlayerId}
                                onChange={(e) => setPubgPlayerId(e.target.value)}
                                placeholder="مثال: 123456789"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-300"
                                dir="ltr"
                              />
                            </div>
                          </div>
                          {pubgBuyError && (
                            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                              {pubgBuyError}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              if (!pubgPlayerId.trim()) {
                                setPubgBuyError("أدخل Player ID أولاً");
                                return;
                              }
                              setPubgBuyError(null);
                              pubgBuyMutation.mutate({
                                productId: pubgSelected!.id,
                                playerId: pubgPlayerId,
                              });
                            }}
                            disabled={pubgBuyMutation.isPending}
                            className="w-full mt-4 py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #db2777, #e11d48, #be185d)" }}
                          >
                            {pubgBuyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {pubgBuyMutation.isPending ? "جارٍ الشراء..." : `شراء — ${Number(pubgSelected!.price).toFixed(0)} ج.س`}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          ) : isFreeFire ? (
            <div dir="rtl" className="-mx-0 -my-0">
              {/* ── Hero ── */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full overflow-hidden"
                style={{ height: "300px" }}
              >
                {/* Spark keyframes */}
                <style>{`
                  @keyframes ff-spark {
                    0%   { opacity: 0;   transform: translate(0, 0) scale(1); }
                    18%  { opacity: 1; }
                    70%  { opacity: 0.5; transform: translate(var(--dx, 6px), -70px) scale(0.55); }
                    100% { opacity: 0;   transform: translate(var(--dx, 10px), -120px) scale(0.15); }
                  }
                  @keyframes ff-spark2 {
                    0%, 100% { opacity: 0;   transform: translate(0,0) scale(0.4); }
                    25%      { opacity: 0.9; transform: translate(var(--dx,-5px), -40px) scale(1); }
                    75%      { opacity: 0.2; transform: translate(var(--dx, 8px), -90px) scale(0.35); }
                  }
                  .ff-sp  { animation: ff-spark  var(--d,4s)   var(--delay,0s) ease-out      infinite; }
                  .ff-sp2 { animation: ff-spark2 var(--d,5.5s) var(--delay,0s) ease-in-out   infinite; }
                `}</style>

                {/* Background image */}
                <img
                  src={isPubg ? "/games/pubg.jpg" : "/games/free-fire.webp"}
                  alt={isPubg ? "PUBG Mobile" : "Free Fire"}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ objectPosition: "center top" }}
                />
                {/* Red overlay */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, rgba(190,24,93,0.82) 0%, rgba(225,29,72,0.75) 40%, rgba(100,0,30,0.88) 100%)" }} />
                {/* Shimmer layer */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 32px)",
                }} />


                {/* ── Sparks — scattered across hero ── */}
                {[
                  { left: "6%",  bottom: "8%",  delay: "0s",    dur: "4.2s",  dx: "5px",  size: 3, cls: "ff-sp"  },
                  { left: "15%", bottom: "20%", delay: "1.1s",  dur: "5.0s",  dx: "-7px", size: 2, cls: "ff-sp2" },
                  { left: "26%", bottom: "5%",  delay: "0.5s",  dur: "3.8s",  dx: "9px",  size: 4, cls: "ff-sp"  },
                  { left: "38%", bottom: "30%", delay: "2.0s",  dur: "5.5s",  dx: "-4px", size: 2, cls: "ff-sp2" },
                  { left: "50%", bottom: "12%", delay: "0.3s",  dur: "4.6s",  dx: "6px",  size: 3, cls: "ff-sp"  },
                  { left: "62%", bottom: "40%", delay: "1.5s",  dur: "5.2s",  dx: "-8px", size: 2, cls: "ff-sp2" },
                  { left: "73%", bottom: "7%",  delay: "0.8s",  dur: "4.0s",  dx: "5px",  size: 4, cls: "ff-sp"  },
                  { left: "84%", bottom: "25%", delay: "2.3s",  dur: "5.8s",  dx: "-6px", size: 2, cls: "ff-sp2" },
                  { left: "91%", bottom: "10%", delay: "0.6s",  dur: "4.4s",  dx: "7px",  size: 3, cls: "ff-sp"  },
                  { left: "20%", bottom: "55%", delay: "1.8s",  dur: "6.0s",  dx: "-5px", size: 2, cls: "ff-sp2" },
                  { left: "44%", bottom: "60%", delay: "0.9s",  dur: "5.4s",  dx: "4px",  size: 2, cls: "ff-sp"  },
                  { left: "68%", bottom: "50%", delay: "2.6s",  dur: "4.8s",  dx: "-9px", size: 3, cls: "ff-sp2" },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={s.cls}
                    style={{
                      position: "absolute",
                      bottom: s.bottom,
                      left: s.left,
                      width: s.size,
                      height: s.size,
                      borderRadius: "50%",
                      background: i % 3 === 0 ? "#fff9c4" : i % 3 === 1 ? "#ffd6d6" : "#ffffff",
                      boxShadow: `0 0 ${s.size * 2}px ${s.size}px ${i % 2 === 0 ? "rgba(255,220,120,0.8)" : "rgba(255,180,180,0.7)"}`,
                      "--d": s.dur,
                      "--delay": s.delay,
                      "--dx": s.dx,
                    } as React.CSSProperties}
                  />
                ))}

                {/* Title card — center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-center px-8 py-4 rounded-2xl mx-8"
                    style={{ background: "rgba(255,255,255,0.10)", backdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.22)", boxShadow: "0 8px 40px rgba(0,0,0,0.3)" }}>
                    <p className="text-white font-black text-4xl leading-none tracking-widest"
                      style={{ textShadow: "0 0 24px rgba(255,120,0,0.7), 0 2px 10px rgba(0,0,0,0.6)" }}>
                      {gameName}
                    </p>
                    <div className="mt-2 h-px mx-2" style={{ background: "linear-gradient(90deg, transparent, rgba(255,165,0,0.8), transparent)" }} />
                    <p className="text-white/85 text-sm mt-2 font-semibold tracking-wide">{gameSubtitle}</p>
                  </div>
                </div>
              </motion.div>

              <div className="bg-white px-4 pt-5 pb-10">
                {/* Features strip */}
                <div className="flex gap-2.5 mb-5 overflow-x-auto pb-1 no-scrollbar">
                  {FF_FEATURES.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 relative"
                      style={{
                        padding: "7px 16px",
                        borderRadius: "999px",
                        background: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(190,24,93,0.06) 100%)",
                        border: "1.5px solid rgba(220,38,38,0.35)",
                        boxShadow: "0 2px 10px rgba(220,38,38,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
                      }}
                    >
                      {/* Arc decoration left */}
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-red-300 text-[8px] font-black leading-none select-none">⌒</span>
                      <f.icon className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                      <span className="text-gray-800 text-xs font-bold">{f.label}</span>
                      {/* Arc decoration right */}
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-300 text-[8px] font-black leading-none select-none">⌒</span>
                    </div>
                  ))}
                </div>

                {/* Section title */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gradient-to-l from-red-300 to-transparent" />
                  <span className="text-gray-800 font-bold text-sm px-2">اختر باقتك</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-pink-300 to-transparent" />
                </div>

                {/* Packages Grid — same legacy storefront layout for both games */}
                {isLoading ? (
                  <div className={`grid ${gameAmounts.length > 5 ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-5"} gap-2`}>
                    {gameAmounts.map((d) => (
                      <div key={d} className="rounded-2xl aspect-square animate-pulse bg-red-50" />
                    ))}
                  </div>
                ) : (() => {
                  const ffPackages = gameAmounts.map((diamonds) => {
                    const product = products.find((p) =>
                      parseInt((p.quantity ?? p.name).replace(/[^\d]/g, "")) === diamonds
                    );
                    return { diamonds, product: product ?? null };
                  });
                  return (
                    <div className={`grid ${gameAmounts.length > 5 ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-5"} gap-2`}>
                      {ffPackages.map(({ diamonds, product }) => {
                        const price = product ? Number(product.price) : 0;
                        const fakePrice = price > 0 ? price + 100 : 0;
                        const isSelected = !!product && ffSelected?.id === product.id;
                        const canClick = !!product;
                        return (
                          <motion.button
                            key={diamonds}
                            whileTap={canClick ? { scale: 0.92 } : {}}
                            onClick={() => {
                              if (!canClick) return;
                              if (!me) { setLocation("/login"); return; }
                              setFfSelected((prev) => prev?.id === product!.id ? null : product!);
                            }}
                            style={isSelected ? {
                              border: "2px solid #db2777",
                              background: "#fef2f2",
                              boxShadow: "0 0 16px 4px rgba(220,38,38,0.45), 0 4px 12px rgba(220,38,38,0.3)",
                            } : product ? {
                              border: "2px solid #db2777",
                              background: "white",
                              cursor: "pointer",
                            } : {
                              border: "2px solid #db2777",
                              background: "#fef2f2",
                              opacity: 0.25,
                              cursor: "not-allowed",
                            }}
                            className="flex flex-col items-center justify-center rounded-2xl py-3 px-1 transition-all relative"
                          >
                            <span
                              className="text-base leading-none mb-1"
                              style={{
                                filter: "hue-rotate(150deg) saturate(3) brightness(0.95) drop-shadow(0 0 5px rgba(220,38,38,0.9))",
                              }}
                            >💎</span>
                            <span className={`font-black text-xs leading-none ${isSelected ? "text-red-600" : "text-gray-800"}`}>
                              {diamonds.toLocaleString("en-US")}
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold leading-none mt-0.5">
                              {gameUnitLabel}
                            </span>
                            {price > 0 && (
                              <div className="flex flex-col items-center mt-1 gap-0">
                                <span className="text-[8px] text-gray-400 font-semibold leading-none line-through">
                                  {fakePrice.toLocaleString("en-US")}
                                </span>
                                <span className="text-[9px] text-red-500 font-bold leading-none">
                                  {price.toLocaleString("en-US")}
                                </span>
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Package info row — only when package selected */}
                <AnimatePresence>
                  {ffSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-4"
                    >
                      <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-red-200 bg-white">
                        <span className="font-bold text-gray-800 text-sm">
                          💎 {parseInt((ffSelected.quantity ?? ffSelected.name).replace(/[^\d]/g, "")).toLocaleString("en-US")} {gameUnitLabel}
                        </span>
                        <span className="font-black text-red-600 text-lg">
                          {formatSDG(Number(ffSelected.price))} ج.س
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Info Banner — كيف تشحن؟ */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 rounded-2xl overflow-hidden bg-white border border-red-100"
                  style={{ boxShadow: "0 2px 16px rgba(220,38,38,0.08)" }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100"
                    style={{ background: "linear-gradient(90deg, #fef2f2, #fff5f5)" }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #db2777, #e11d48)" }}>
                      <span className="text-white text-[10px] font-black">؟</span>
                    </div>
                    <h4 className="text-gray-800 font-bold text-sm">كيف تشحن؟</h4>
                  </div>
                  {/* Steps */}
                  {[
                    "اختر الباقة المناسبة",
                    isPubg ? "أدخل Player ID الخاص بحسابك" : "أدخل اسمك وID حسابك في فري فاير",
                    "أكّد الطلب من محفظتك",
                    isPubg ? "ستصلك الشدات خلال دقائق ✅" : "ستصلك الجواهر خلال دقائق ✅",
                  ].map((step, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black text-[11px]"
                          style={{ background: "linear-gradient(135deg, #db2777, #e11d48)" }}>
                          {i + 1}
                        </div>
                        <span className="text-gray-600 text-xs leading-relaxed flex-1">{step}</span>
                      </div>
                      {i < 3 && <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, rgba(220,38,38,0.12), transparent)" }} />}
                    </div>
                  ))}
                </motion.div>

                {/* Wallet + Order Summary */}
                <div className="mt-8 rounded-2xl overflow-hidden border border-red-200"
                  style={{ boxShadow: "0 4px 24px rgba(220,38,38,0.15)" }}>
                  {/* Wallet card — geometric pattern background */}
                  <div
                    className="px-5 py-4 flex items-center justify-between relative overflow-hidden"
                    style={{ background: "linear-gradient(135deg, #be185d, #db2777, #e11d48, #9f1239)" }}
                  >
                    {/* Geometric pattern overlay */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 24px)",
                    }} />
                    {/* Glow circle */}
                    <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)" }} />

                    <div className="text-right relative">
                      <div className="text-white/70 text-[10px] font-semibold mb-1 tracking-wide uppercase">الإجمالي</div>
                      <div className="text-white font-black text-2xl leading-none tabular-nums"
                        style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                        {ffSelected ? formatSDG(Number(ffSelected.price)) : "0.00"}
                        <span className="text-sm font-bold mr-1">ج.س</span>
                      </div>
                    </div>

                    <div className="w-px h-10 mx-2 opacity-30" style={{ background: "rgba(255,255,255,0.5)" }} />

                    <div className="text-left relative">
                      <div className="text-white/70 text-[10px] font-semibold mb-1 tracking-wide uppercase">رصيد محفظتك</div>
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-white/90 flex-shrink-0" />
                        <span className="text-white font-black text-base tabular-nums"
                          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
                          {formatSDG(balance)} <span className="text-sm font-bold">ج.س</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 px-4 py-3 bg-white">
                    <button
                      onClick={() => { if (!ffSelected) return; setFfBuyError(null); setFfOrderDone(false); setFfCheckoutOpen(true); }}
                      disabled={!ffSelected}
                      className="flex-1 py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 transition-all relative overflow-hidden"
                      style={{
                        background: ffSelected
                          ? "linear-gradient(135deg, #db2777, #e11d48, #be185d)"
                          : "linear-gradient(135deg, #f9a8c9, #fca5a5)",
                        boxShadow: ffSelected ? "0 4px 20px rgba(220,38,38,0.4)" : "none",
                        transform: ffSelected ? "scale(1)" : "scale(1)",
                      }}
                    >
                      {ffSelected && (
                        <span className="absolute inset-0 rounded-xl animate-pulse pointer-events-none" style={{ background: "rgba(255,255,255,0.08)" }} />
                      )}
                      <Send className="w-4 h-4 relative" />
                      <span className="relative">اشحن الآن</span>
                    </button>
                    <button
                      onClick={() => setFfSelected(null)}
                      disabled={!ffSelected}
                      className="px-5 py-3.5 rounded-xl font-bold text-sm border-2 disabled:opacity-30 transition-all"
                      style={{ borderColor: "#db2777", color: "#db2777", background: "white" }}
                    >
                      إلغاء
                    </button>
                  </div>

                  {matchingCodeProduct && (
                    <div className="px-4 pb-3 bg-white">
                      <button
                        onClick={() => { setFfCodeSelected(matchingCodeProduct); setFfCodeBuyDone(null); setFfCodeBuyError(null); setFfCodeOpen(true); }}
                        className="w-full py-2.5 rounded-xl font-bold text-sm border-2 bg-white transition-all"
                        style={{ borderColor: "#db2777", color: "#db2777" }}
                      >
                        شراء كود مباشر
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-gray-400 text-xs text-center mt-4">
                  للدعم تواصل معنا عبر خدمة العملاء في التطبيق
                </p>
              </div>

              {/* Checkout Dialog */}
              <Dialog
                open={ffCheckoutOpen}
                onOpenChange={(o) => { if (!ffBuyMutation.isPending) setFfCheckoutOpen(o); }}
              >
                <DialogContent dir="rtl" className="max-w-sm rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-right font-black text-gray-800 mb-1">
                      💎 {isPubg ? "أدخل Player ID" : "أدخل بيانات حسابك"}
                    </DialogTitle>
                  </DialogHeader>
                  {ffSelected && (
                    <div>
                      <div className="bg-red-50 rounded-2xl p-3 mb-4 flex items-center justify-between">
                        <span className="font-bold text-gray-700 text-sm">
                          {parseInt((ffSelected.quantity ?? ffSelected.name).replace(/[^\d]/g, "")).toLocaleString("en-US")} {gameUnitLabel}
                        </span>
                        <span className="font-black text-red-600">
                          {Number(ffSelected.price).toFixed(0)} ج.س
                        </span>
                      </div>
                      {ffOrderDone ? (
                        <div className="text-center py-4">
                          <div className="text-4xl mb-3">✅</div>
                          <p className="font-black text-green-700 text-base">تم الطلب بنجاح!</p>
                          <p className="text-gray-500 text-xs mt-1">
                            {isPubg ? "ستصلك الشدات خلال دقائق" : "ستصلك الجواهر خلال دقائق"}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {!isPubg && <div>
                              <label className="text-xs font-bold text-gray-700 mb-1 block">اسم اللاعب</label>
                              <input
                                type="text"
                                value={ffPlayerName}
                                onChange={(e) => setFfPlayerName(e.target.value)}
                                placeholder="أدخل اسمك في فري فاير"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-300"
                                dir="rtl"
                              />
                            </div>}
                            <div>
                              <label className="text-xs font-bold text-gray-700 mb-1 block">الايدي (Player ID)</label>
                              <input
                                type="text"
                                value={ffPlayerId}
                                onChange={(e) => setFfPlayerId(e.target.value)}
                                placeholder="مثال: 123456789"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-300"
                                dir="ltr"
                              />
                            </div>
                          </div>
                          {ffBuyError && (
                            <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                              {ffBuyError}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              if (!ffPlayerId.trim() || (!isPubg && !ffPlayerName.trim())) {
                                setFfBuyError(isPubg ? "أدخل Player ID أولاً" : "أدخل اسم اللاعب والايدي أولاً");
                                return;
                              }
                              setFfBuyError(null);
                              ffBuyMutation.mutate({
                                productId: ffSelected.id,
                                playerName: ffPlayerName,
                                playerId: ffPlayerId,
                              });
                            }}
                            disabled={ffBuyMutation.isPending}
                            className="w-full mt-4 py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            style={{ background: "linear-gradient(135deg, #db2777, #e11d48, #be185d)" }}
                          >
                            {ffBuyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            {ffBuyMutation.isPending ? "جارٍ الشراء..." : `شراء — ${Number(ffSelected.price).toFixed(0)} ج.س`}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* ── Direct Code Purchase Dialog ── */}
              <Dialog
                open={ffCodeOpen}
                onOpenChange={(o) => { if (!ffCodeBuyMutation.isPending) { setFfCodeOpen(o); if (!o) { setFfCodeSelected(null); setFfCodeBuyDone(null); setFfCodeBuyError(null); } } }}
              >
                <DialogContent dir="rtl" className="max-w-sm rounded-3xl p-6">
                  <DialogHeader>
                    <DialogTitle className="text-right font-black text-gray-800 mb-1">
                      شراء كود {isPubg ? "PUBG" : "فري فاير"} مباشر
                    </DialogTitle>
                  </DialogHeader>
                  {ffCodeBuyDone ? (
                    <div className="text-center py-2">
                      {/* Success icon with glow */}
                      <div className="relative flex items-center justify-center mb-4">
                        <div className="absolute w-20 h-20 rounded-full blur-xl opacity-50" style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }} />
                        <div className="relative w-16 h-16 rounded-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 4px 24px rgba(16,185,129,0.45)" }}>
                          <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                      </div>

                      <p className="font-black text-gray-800 text-lg mb-1">تم الشراء بنجاح</p>
                      <p className="text-gray-400 text-xs mb-4">كودك جاهز للاستخدام الآن</p>

                      {/* Code card */}
                      <div className="rounded-2xl p-4 mb-4 relative overflow-hidden"
                        style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "1.5px solid #86efac", boxShadow: "0 2px 16px rgba(16,185,129,0.12)" }}>
                        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: "linear-gradient(90deg, #059669, #10b981, #34d399)" }} />
                        <p className="text-[10px] text-emerald-600 font-black tracking-widest uppercase mb-2">كودك المباشر</p>
                        <p className="font-mono font-black text-xl text-emerald-800 tracking-widest break-all leading-snug">{ffCodeBuyDone}</p>
                      </div>

                      <button
                        onClick={() => { navigator.clipboard.writeText(ffCodeBuyDone); }}
                        className="w-full py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg, #db2777, #e11d48, #be185d)", boxShadow: "0 4px 16px rgba(220,38,38,0.35)" }}
                      >
                        <Copy className="w-4 h-4" />
                        نسخ الكود
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 mb-4">
                        {ffCodeProducts.map((p: any) => {
                          const isSel = ffCodeSelected?.id === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => { if (p.available > 0) setFfCodeSelected(p); }}
                              disabled={p.available === 0}
                              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${
                                isSel ? "border-red-600 bg-red-50" : p.available > 0 ? "border-gray-200 bg-white hover:border-red-300" : "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                              }`}
                            >
                              <div className="text-right">
                                <div className={`font-bold text-sm ${isSel ? "text-red-800" : "text-gray-800"}`}>{p.name}</div>
                                <div className="text-xs text-gray-400">{p.available} متاح</div>
                              </div>
                              <div className={`font-black text-base ${isSel ? "text-red-600" : "text-gray-700"}`}>{Number(p.price).toFixed(0)} ج.س</div>
                            </button>
                          );
                        })}
                      </div>
                      {ffCodeBuyError && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold mb-3">
                          {ffCodeBuyError}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (!ffCodeSelected) return;
                          if (!me) { setLocation("/login"); return; }
                          setFfCodeBuyError(null);
                          ffCodeBuyMutation.mutate(ffCodeSelected.id);
                        }}
                        disabled={!ffCodeSelected || ffCodeBuyMutation.isPending}
                        className="w-full py-3.5 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #db2777, #e11d48, #be185d)" }}
                      >
                        {ffCodeBuyMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {ffCodeBuyMutation.isPending ? "جارٍ الشراء..." : ffCodeSelected ? `شراء — ${Number(ffCodeSelected.price).toFixed(0)} ج.س` : "اختر فئة أولاً"}
                      </button>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          ) : (

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

              {/* Body — Liquid Gradient / Flowing */}
              <div className="relative p-5 space-y-5 bg-gradient-to-b from-[#fff5f7] to-[#ffeef2] overflow-hidden">
                {/* Blob decorations */}
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-pink-200/40 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-rose-200/30 blur-3xl pointer-events-none" />

                {/* ── Progress Steps (flowing dots) ── */}
                {!isCustomComments && (() => {
                    const linkDone = smmLink.trim().length > 0;
                    const qtyDone  = smmQtyEntered && smmQtyValid;
                    const allDone  = linkDone && qtyDone;
                    return (
                      <div className="relative flex items-start justify-between px-1 mb-1">
                        {/* connector line behind dots */}
                        <div className="absolute top-4 right-5 left-5 h-0.5 rounded-full bg-pink-100" />
                        <div
                          className="absolute top-4 right-5 h-0.5 rounded-full bg-gradient-to-l from-pink-400 to-rose-400 transition-all duration-500"
                          style={{ width: allDone ? "calc(100% - 2.5rem)" : linkDone ? "50%" : "0%" }}
                        />
                        {/* Step 1 — الرابط */}
                        <div className="flex flex-col items-center gap-1 z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                            linkDone
                              ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-[0_4px_14px_rgba(236,72,153,0.45)]"
                              : "bg-white border-2 border-pink-200 text-pink-400"
                          }`}>
                            {linkDone ? "✓" : "١"}
                          </div>
                          <span className={`text-[9px] font-bold ${linkDone ? "text-pink-600" : "text-pink-300"}`}>الرابط</span>
                        </div>
                        {/* Step 2 — الكمية */}
                        <div className="flex flex-col items-center gap-1 z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                            qtyDone
                              ? "bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-[0_4px_14px_rgba(236,72,153,0.45)]"
                              : "bg-white border-2 border-pink-200 text-pink-400"
                          }`}>
                            {qtyDone ? "✓" : "٢"}
                          </div>
                          <span className={`text-[9px] font-bold ${qtyDone ? "text-pink-600" : "text-pink-300"}`}>الكمية</span>
                        </div>
                        {/* Step 3 — تأكيد */}
                        <div className="flex flex-col items-center gap-1 z-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                            allDone
                              ? "bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white shadow-[0_4px_14px_rgba(236,72,153,0.45)]"
                              : "bg-white border-2 border-pink-200 text-pink-400"
                          }`}>٣</div>
                          <span className={`text-[9px] font-bold ${allDone ? "text-pink-600" : "text-pink-300"}`}>تأكيد</span>
                        </div>
                      </div>
                    );
                  })()}

                {/* Link input — pill with flowing glow */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-pink-900 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-pink-500" />
                    {SMM_LINK_TEXT[smmTab].label}
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
                    <Link2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300 pointer-events-none" />
                    <input
                      type="url"
                      value={smmLink}
                      onChange={(e) => setSmmLink(e.target.value)}
                      placeholder="https://..."
                      dir="ltr"
                      className={`w-full rounded-3xl border-2 bg-white/80 backdrop-blur-sm shadow-sm pr-11 pl-4 py-3.5 text-sm focus:outline-none transition-all placeholder:text-pink-300 ${
                        smmLink.trim() && (smmLink.startsWith("http://") || smmLink.startsWith("https://"))
                          ? "border-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]"
                          : "border-pink-200 focus:border-pink-400 focus:shadow-[0_0_0_4px_rgba(236,72,153,0.12)]"
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-pink-400/80 pr-1">{SMM_LINK_TEXT[smmTab].hint}</p>
                </div>

                {/* Quantity OR Custom Comments */}
                {isCustomComments ? (
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-pink-900 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" />
                      التعليقات المطلوبة
                      {smmComments.length > 0 && (
                        <span className="mr-auto text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          {smmComments.length} تعليق
                        </span>
                      )}
                    </label>
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
                        className="flex-1 rounded-3xl border-2 bg-white/80 px-4 py-2.5 text-sm focus:outline-none focus:border-pink-400 focus:shadow-[0_0_0_4px_rgba(236,72,153,0.12)] border-pink-200 transition placeholder:text-pink-300"
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
                    {smmComments.length > 0 && (
                      <div className="rounded-3xl border-2 border-pink-100 bg-white/60 p-3 space-y-2 max-h-48 overflow-y-auto">
                        {smmComments.map((comment, idx) => (
                          <div key={idx} className="flex items-start gap-2 bg-white rounded-2xl border border-pink-100 px-3 py-2 shadow-sm">
                            <span className="text-[10px] font-black text-pink-400 mt-0.5 shrink-0 w-4 text-center">{idx + 1}</span>
                            <span className="flex-1 text-sm text-gray-800 break-words leading-snug" dir="auto">{comment}</span>
                            <button
                              type="button"
                              onClick={() => { setSmmComments((prev) => prev.filter((_, i) => i !== idx)); setError(null); }}
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
                    <label className="text-xs font-extrabold text-pink-900 flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-pink-500" />
                      الكمية المطلوبة
                      <span className="mr-auto text-[10px] text-pink-500 font-bold bg-pink-50 border border-pink-200 rounded-full px-2.5 py-0.5">
                        {smmMin.toLocaleString("ar")} – {smmMax.toLocaleString("ar")}
                      </span>
                    </label>

                    {/* Pill counter with ± buttons */}
                    <div className={`flex items-center gap-3 rounded-3xl border-2 bg-white/80 backdrop-blur-sm px-3 py-3 transition-all duration-300 ${
                      smmQtyEntered && !smmQtyValid
                        ? "border-red-300 shadow-[0_0_0_4px_rgba(239,68,68,0.1)]"
                        : smmQtyEntered && smmQtyValid
                        ? "border-pink-400 shadow-[0_0_0_4px_rgba(236,72,153,0.12)]"
                        : "border-pink-100 shadow-sm"
                    }`}>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseInt(smmQty || "0");
                          const step = Math.max(1, Math.ceil((smmMax - smmMin) / 20));
                          setSmmQty(String(Math.max(smmMin, cur - step)));
                          setError(null);
                        }}
                        className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-700 font-black text-xl flex items-center justify-center active:scale-90 transition hover:bg-pink-200 shrink-0 select-none"
                      >
                        −
                      </button>
                      <div className="flex-1 text-center">
                        <AnimatePresence mode="popLayout">
                          <motion.div
                            key={smmQty || "zero"}
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.15 }}
                            className={`text-3xl font-black leading-none ${smmQtyEntered && smmQty !== "0" ? "text-pink-800" : "text-pink-200"}`}
                          >
                            {smmQty ? parseInt(smmQty).toLocaleString("ar") : "٠"}
                          </motion.div>
                        </AnimatePresence>
                        <div className="text-[10px] text-pink-400 mt-1">وحدة</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseInt(smmQty || "0");
                          const step = Math.max(1, Math.ceil((smmMax - smmMin) / 20));
                          setSmmQty(String(Math.min(smmMax, cur + step)));
                          setError(null);
                        }}
                        className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white font-black text-xl flex items-center justify-center active:scale-90 transition shadow-md shrink-0 select-none"
                      >
                        +
                      </button>
                    </div>

                    {/* Precise text input */}
                    <input
                      type="number"
                      inputMode="numeric"
                      min={smmMin}
                      max={smmMax}
                      placeholder={`أو أدخل الكمية مباشرة (${smmMin.toLocaleString("ar")} – ${smmMax.toLocaleString("ar")})`}
                      value={smmQty}
                      onChange={(e) => { setSmmQty(e.target.value); setError(null); }}
                      className="w-full rounded-3xl border-2 border-pink-100 bg-white/60 px-4 py-3 text-sm font-bold text-pink-900 text-center focus:outline-none focus:border-pink-400 focus:shadow-[0_0_0_4px_rgba(236,72,153,0.12)] transition placeholder:text-pink-300 placeholder:font-normal [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      dir="ltr"
                    />
                  </div>
                )}

                {/* Total — elegant flowing card */}
                <div className="rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 p-5 text-white shadow-[0_12px_40px_rgba(236,72,153,0.35)] overflow-hidden relative">
                  <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative">
                    <div className="text-xs font-bold opacity-75 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> الإجمالي
                    </div>
                    <div className="flex items-baseline gap-2">
                      <AnimatePresence mode="popLayout">
                        <motion.span
                          key={smmTotal}
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
                          className="text-4xl font-black tracking-tight"
                        >
                          {formatSDG(smmTotal)}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-sm font-bold opacity-75">ج.س</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 opacity-80"><Wallet className="w-3.5 h-3.5" /> رصيد محفظتك</span>
                      <span className={`font-extrabold text-sm ${smmCanAfford ? "text-emerald-200" : "text-yellow-200"}`}>
                        {formatSDG(balance)} ج.س
                      </span>
                    </div>
                  </div>
                </div>

                {!smmCanAfford && !smmBuyMutation.isPending && (
                  <Link
                    href="/wallet"
                    onClick={() => setSmmSelectedProduct(null)}
                    className="block text-center py-3 rounded-3xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold shadow-sm active:scale-95 transition"
                  >
                    ⚠ رصيدك لا يكفي — اشحن المحفظة الآن
                  </Link>
                )}
                {smmQtyEntered && !smmQtyValid && (
                  <div className="rounded-3xl bg-orange-50 border border-orange-200 text-orange-800 text-xs px-4 py-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    الكمية يجب أن تكون بين {smmMin.toLocaleString("ar-EG")} و {smmMax.toLocaleString("ar-EG")}
                  </div>
                )}
                {error && (
                  <div className="rounded-3xl bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3 pb-2">
                  <button
                    onClick={() => setSmmSelectedProduct(null)}
                    disabled={smmBuyMutation.isPending}
                    className="flex-1 py-4 rounded-3xl bg-white border-2 border-pink-200 text-pink-700 font-bold text-sm active:scale-95 disabled:opacity-50 transition hover:border-pink-400 shadow-sm"
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
                    className="flex-[2] py-4 rounded-3xl bg-gradient-to-l from-rose-600 via-pink-600 to-fuchsia-700 text-white font-extrabold text-base shadow-[0_8px_30px_rgba(236,72,153,0.5)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 transition"
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

              {/* Animated checkmark icon — premium */}
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
                className="relative inline-flex w-24 h-24 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] items-center justify-center mb-4"
              >
                <motion.svg
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                  viewBox="0 0 52 52"
                  className="w-12 h-12"
                  fill="none"
                >
                  <motion.circle
                    cx="26" cy="26" r="24"
                    stroke="url(#cg)"
                    strokeWidth="3"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                  />
                  <motion.path
                    d="M14 27l8 8 16-16"
                    stroke="url(#cg)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="52" y2="52" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#e11d48" />
                      <stop offset="1" stopColor="#a21caf" />
                    </linearGradient>
                  </defs>
                </motion.svg>
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
                <div className="rounded-2xl bg-white border-2 border-pink-200 p-3">
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
