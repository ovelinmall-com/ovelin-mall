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

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet as WalletIcon,
  ArrowDownCircle,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowUpCircle,
  Banknote,
  RefreshCcw,
  Filter,
  AlertCircle,
  Crown,
  Activity,
  TrendingUp,
  PieChart as PieIcon,
  Send,
  Gift,
  Bitcoin,
  PiggyBank,
  ChevronLeft,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Star,
  Eye,
  EyeOff,
  ImageUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { LivePill } from "@/components/LiveDot";
import {
  useGetWallet,
  useGetPublicSettings,
  getGetPublicSettingsQueryKey,
  useListMyTransactions,
  getGetWalletQueryKey,
  getListMyTransactionsQueryKey,
  getGetMeQueryKey,
  getGetMyDashboardQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn, formatSDG } from "@/lib/utils";
import WalletExtras from "./wallet-extras";

const PAYMENT_METHODS = [
  {
    id: "MyCashi",
    label: "ماي كاشي",
    subtitle: "دفع إلكتروني سريع",
    icon: "/payment/cashi.jpg",
    accountNumber: "300332654",
    accountName: "معاذ عبد اللطيف منصور البشير",
  },
  {
    id: "OCash",
    label: "أوكاش",
    subtitle: "لكل الناس",
    icon: "/payment/ocash.jpg",
    accountNumber: "1666104",
    accountName: "معاذ عبد اللطيف منصور البشير",
  },
  {
    id: "BinancePay",
    label: "بايننس باي",
    subtitle: "دفع دولي",
    icon: "/payment/binance.jpg",
    accountNumber: "1167049074",
    accountName: "Ovelin Mall",
  },
] as const;

const PM_STYLES = {
  MyCashi: {
    accent: "#a855f7",
    shadow: "rgba(168,85,247,0.55)",
    badge: "دفع إلكتروني",
    tagBg: "rgba(168,85,247,0.1)",
    gradient: "linear-gradient(135deg, #6d28d9 0%, #9333ea 45%, #c084fc 100%)",
    glassTop: "rgba(255,255,255,0.18)",
    glassBot: "rgba(255,255,255,0.06)",
    highlight: "#e9d5ff",
  },
  OCash: {
    accent: "#00b488",
    shadow: "rgba(0,180,136,0.55)",
    badge: "لكل الناس",
    tagBg: "rgba(0,180,136,0.1)",
    gradient: "linear-gradient(135deg, #047857 0%, #059669 45%, #34d399 100%)",
    glassTop: "rgba(255,255,255,0.18)",
    glassBot: "rgba(255,255,255,0.06)",
    highlight: "#a7f3d0",
  },
  BinancePay: {
    accent: "#f59e0b",
    shadow: "rgba(245,158,11,0.55)",
    badge: "دفع دولي",
    tagBg: "rgba(245,158,11,0.1)",
    gradient: "linear-gradient(135deg, #b45309 0%, #d97706 45%, #fbbf24 100%)",
    glassTop: "rgba(255,255,255,0.18)",
    glassBot: "rgba(255,255,255,0.06)",
    highlight: "#fde68a",
  },
} as const;

type WalletHealth = {
  score: number;
  grade: string;
  vip: {
    current: string;
    cashbackPct: number;
    next: string | null;
    nextCashbackPct: number | null;
    progressPct: number;
    needed: number;
    totalSpent: number;
  };
  forecast: {
    next30: number;
    dailyAvg: number;
    spent30: number;
    spent90: number;
    orders30: number;
    burnDays: number | null;
  };
  pots: { inPots: number; count: number };
  pending: { amount: number; count: number };
  distribution: { key: string; label: string; value: number; color: string }[];
  totalFunds: number;
};

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_PX = 1600;
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let quality = 0.88;
      let result = canvas.toDataURL("image/jpeg", quality);
      const MAX_BYTES = 400 * 1024;
      while (result.length > MAX_BYTES * 1.37 && quality > 0.1) {
        quality = Math.max(0.1, quality - 0.1);
        result = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(result);
    };
    img.onerror = reject;
    img.src = url;
  });
}

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

const MOBILE_WITHDRAW_METHODS = [
  { id: "sudanese", label: "سوداني",  icon: "/payment/sudani.jpg" },
  { id: "zain",     label: "زين",     icon: "/payment/zain.jpg" },
  { id: "mtn",      label: "MTN",     icon: "/payment/mtn.jpg" },
];
const WALLET_WITHDRAW_METHODS = [
  { id: "okash",   label: "أوكاش",    icon: "/payment/ocash.jpg" },
  { id: "mycash",  label: "ماي كاشي", icon: "/payment/cashi.jpg" },
  { id: "binance", label: "باينانس",  icon: "/payment/binance.jpg" },
];
const MOBILE_WITHDRAW_IDS = new Set(["sudanese", "zain", "mtn"]);

const TYPE_LABEL: Record<string, string> = {
  deposit: "شحن",
  order: "طلب",
  refund: "استرجاع",
  referral: "عمولة إحالة",
  withdraw: "سحب",
  transfer_in: "حوالة واردة",
  transfer_out: "حوالة صادرة",
  gift_in: "بطاقة هدية مُستلمة",
  gift_out: "بطاقة هدية مُرسلة",
  pot_deposit: "إيداع جرّة ادخار",
  pot_withdraw: "سحب من جرّة ادخار",
  prize: "جائزة",
  spin: "عجلة الحظ",
  crypto_in: "إيداع كريبتو",
  installment: "قسط",
  subscription: "اشتراك",
  fee: "رسوم",
  bonus: "مكافأة",
};

const TX_TABS = [
  { id: "all", label: "الكل" },
  { id: "deposit", label: "شحن" },
  { id: "withdraw", label: "سحوبات" },
  { id: "order", label: "طلبات" },
  { id: "transfer_out", label: "حوالات" },
  { id: "gift_in", label: "هدايا" },
  { id: "referral", label: "عمولات" },
];

const QUICK_LINKS = [
  {
    id: "transfers",
    label: "تحويل",
    desc: "أرسل لصديق",
    icon: Send,
    color: "from-pink-500 to-rose-600",
    href: "/transfers",
  },
  {
    id: "gifts",
    label: "بطاقة هدية",
    desc: "أنشئ أو استرد",
    icon: Gift,
    color: "from-amber-500 to-pink-500",
    href: "/transfers",
  },
  {
    id: "crypto",
    label: "كريبتو",
    desc: "USDT • BTC",
    icon: Bitcoin,
    color: "from-orange-500 to-amber-600",
    href: "/crypto",
  },
  {
    id: "pots",
    label: "جِرار الادخار",
    desc: "وفّر للأهداف",
    icon: PiggyBank,
    color: "from-emerald-500 to-teal-600",
    href: "/wallet#pots",
  },
];

const VIP_GRADIENT: Record<string, string> = {
  Bronze: "from-orange-400 to-amber-600",
  Silver: "from-zinc-400 to-zinc-600",
  Gold: "from-yellow-400 to-amber-500",
  Platinum: "from-cyan-400 to-blue-600",
  Diamond: "from-rose-400 via-pink-500 to-rose-600",
};

export default function WalletPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  const { data: wallet, dataUpdatedAt } = useGetWallet({
    query: {
      queryKey: getGetWalletQueryKey(),
      enabled: !!user,
      refetchInterval: 3000,
      refetchOnWindowFocus: true,
      placeholderData: (prev: any) => prev,
    },
  });
  const { data: txs } = useListMyTransactions({
    query: {
      queryKey: getListMyTransactionsQueryKey(),
      enabled: !!user,
      refetchInterval: 20000,
      placeholderData: (prev: any) => prev,
    },
  });
  const { data: settings } = useGetPublicSettings({
    query: { queryKey: getGetPublicSettingsQueryKey(), staleTime: 60000 },
  });
  const { data: richSettings } = useQuery<{ minWithdraw?: string; minReferralWithdraw?: string; usdToSdg?: string }>({
    queryKey: ["settings-public-rich"],
    queryFn: () => api("/api/settings/public-rich"),
    staleTime: 60000,
  });
  const minReferralWithdraw = Math.max(1, Number(richSettings?.minReferralWithdraw ?? "2000") || 2000);
  const usdToSdg = Math.max(1, Number(richSettings?.usdToSdg ?? "800") || 800);
  const health = useQuery<WalletHealth>({
    queryKey: ["wallet-health"],
    queryFn: () => api<WalletHealth>("/api/wallet/health"),
    enabled: !!user,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    placeholderData: (p) => p,
  });

  const qc = useQueryClient();

  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [filter, setFilter] = useState<string>("all");
  const [openTx, setOpenTx] = useState<any | null>(null);

  // Deposit wizard state (3 steps)
  const [depositStep, setDepositStep] = useState<1 | 2 | 3>(1);
  const [dMethod, setDMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [lastMethod, setLastMethod] = useState<string>(() => localStorage.getItem("ov_last_pm") ?? "");
  const [showOtherModal, setShowOtherModal] = useState(false);

  // Withdraw multi-step state
  const [wStep, setWStep] = useState<1 | 2 | 3>(1);
  const [wMethodId, setWMethodId] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wAccountNumber, setWAccountNumber] = useState("");
  const [wAccountName, setWAccountName] = useState("");
  const [wAmount, setWAmount] = useState("");
  const [wConfirmed, setWConfirmed] = useState(false);
  const [wErr, setWErr] = useState<string | null>(null);
  const [wOk, setWOk] = useState(false);
  const [wLoading, setWLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="المحفظة" subtitle="رصيدك ومعاملاتك" back="/account" />
        <div className="px-5 space-y-4 pb-4">
          <div className="rounded-3xl p-5 bg-gradient-to-br from-pink-50 via-white to-rose-50 border border-pink-100 h-44 flex items-center justify-center text-pink-400">
            <div className="flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 animate-spin" />
              <span className="text-sm font-bold">جارِ تحميل المحفظة...</span>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!user) {
    return (
      <AppLayout>
        <PageHeader title="المحفظة" subtitle="يلزم تسجيل الدخول" back="/account" />
        <div className="px-5 py-6">
          <div className="fancy-card rounded-3xl p-6 text-center">
            <WalletIcon className="w-12 h-12 mx-auto text-pink-400 mb-3" />
            <div className="font-bold text-pink-900 mb-1">سجّل دخولك لرؤية محفظتك</div>
            <button
              onClick={() => setLocation("/login")}
              className="rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold px-5 py-2.5 shadow"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  function refreshAll() {
    qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
    qc.invalidateQueries({ queryKey: getListMyTransactionsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
    qc.invalidateQueries({ queryKey: ["wallet-health"] });
  }

  async function submitDeposit() {
    if (!receiptBase64 || !dMethod || !amount) return;
    setDepositLoading(true);
    setDepositError(null);
    try {
      const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

      const blob = await fetch(receiptBase64).then((r) => r.blob());
      const formData = new FormData();
      formData.append("file", blob, "receipt.jpg");

      const uploadRes = await fetch(`${base}/api/receipts/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => ({}));
        throw new Error((errBody as any)?.error || "فشل رفع الصورة");
      }
      const { receiptPath } = await uploadRes.json();

      const res = await fetch(`${base}/api/wallet/deposit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: dMethod, amount: dMethod === "BinancePay" ? (Number(amount) * usdToSdg).toFixed(2) : Number(amount).toFixed(2), receiptPath }),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const body = isJson ? await res.json() : await res.text();
      if (!res.ok) {
        const msg =
          (typeof body === "object" && body && (body as any).error) ||
          (typeof body === "string" ? body : "حدث خطأ");
        throw new Error(String(msg));
      }

      setDepositSuccess(true);
      setDepositStep(1);
      setDMethod("");
      setAmount("");
      setReceiptFile(null);
      setReceiptBase64(null);
      setReceiptPreview(null);
      refreshAll();
      setTimeout(() => setDepositSuccess(false), 5000);
    } catch (err: any) {
      setDepositError(err?.message || "تعذر إرسال الطلب");
    } finally {
      setDepositLoading(false);
    }
  }

  const refBalanceQ = useQuery<{ total: string; withdrawn: string; available: string }>({
    queryKey: ["referral-balance"],
    queryFn: () => api("/api/wallet/referral-balance"),
    enabled: !!user && tab === "withdraw",
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  function resetWithdraw() {
    setWStep(1);
    setWMethodId("");
    setWPhone("");
    setWAccountNumber("");
    setWAccountName("");
    setWAmount("");
    setWConfirmed(false);
    setWErr(null);
  }

  async function submitRefWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setWErr(null);
    const amt = Number(wAmount);
    const avail = Number(refBalanceQ.data?.available ?? 0);
    if (!amt || amt < minReferralWithdraw) {
      return setWErr(`الحد الأدنى للسحب ${formatSDG(minReferralWithdraw)} ج.س`);
    }
    if (amt > avail) return setWErr("رصيد الإحالة غير كافٍ");
    if (!wConfirmed) return setWErr("يرجى تأكيد صحة البيانات أولاً");
    const isMobile = MOBILE_WITHDRAW_IDS.has(wMethodId);
    if (isMobile && !wPhone.trim()) return setWErr("أدخل رقم الهاتف");
    if (!isMobile && !wAccountNumber.trim()) return setWErr("أدخل رقم الحساب");
    if (!isMobile && !wAccountName.trim()) return setWErr("أدخل اسم الحساب");
    setWLoading(true);
    try {
      await api("/api/wallet/referral-withdraw", {
        method: "POST",
        body: JSON.stringify({
          method: wMethodId,
          amount: amt.toFixed(2),
          phoneNumber: isMobile ? wPhone.trim() : undefined,
          accountNumber: !isMobile ? wAccountNumber.trim() : undefined,
          accountName: !isMobile ? wAccountName.trim() : undefined,
        }),
      });
      setWOk(true);
      resetWithdraw();
      refBalanceQ.refetch();
      refreshAll();
      setTimeout(() => setWOk(false), 6000);
    } catch (err: any) {
      setWErr(err?.data?.error || err?.message || "تعذر إرسال الطلب");
    } finally {
      setWLoading(false);
    }
  }


  const filteredTx =
    filter === "all" ? (txs ?? []) : (txs ?? []).filter((t) => t.type === filter);

  const pendingCount = (txs ?? []).filter((t) => t.status === "pending").length;
  const h = health.data;

  return (
    <AppLayout>
      <PageHeader title="المحفظة" subtitle="رصيدك ومعاملاتك" back="/account" />

      <div className="px-5 space-y-4 pb-4">
        {/* ══ Balance Card — Luxury Ruby Red ══ */}
        <BalanceCard
          balance={Number(wallet?.balance ?? user.balance ?? 0)}
          referralBalance={Number(user.cashbackBalance ?? 0)}
          totalDeposits={Number(wallet?.totalDeposits ?? 0)}
          totalSpent={Number(wallet?.totalSpent ?? 0)}
          pendingCount={pendingCount}
          dataUpdatedAt={dataUpdatedAt}
          vipTier={h?.vip?.current}
          onRefresh={refreshAll}
        />

        {/* Quick links */}
        <div className="grid grid-cols-4 gap-2">
          {QUICK_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <div key={l.id} className="block select-none pointer-events-none">
                <div className="fancy-card rounded-2xl p-2.5 text-center opacity-70">
                  <div
                    className={cn(
                      "mx-auto w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shadow",
                      l.color,
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] font-extrabold text-pink-900 mt-1.5">
                    {l.label}
                  </div>
                  <div className="text-[9px] text-pink-700/70 leading-tight">
                    {l.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* VIP + Cashback combo */}
        {h && (
          <motion.div
            className={cn(
              "relative overflow-hidden rounded-3xl p-4 text-white shadow-lg bg-gradient-to-br",
              VIP_GRADIENT[h.vip.current] ?? VIP_GRADIENT.Bronze,
            )}
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-red-500/20 rounded-full blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] opacity-90">المستوى الحالي</div>
                  <div className="text-lg font-extrabold">{h.vip.current}</div>
                </div>
              </div>
              <div className="text-left">
                <div className="text-[10px] opacity-90">الإنفاق الكلي</div>
                <div className="text-lg font-extrabold">{formatSDG(h.vip.totalSpent)} ج.س</div>
              </div>
            </div>
            {h.vip.next && (
              <div className="relative mt-3">
                <div className="flex items-center justify-between text-[10px] opacity-90 mb-1">
                  <span>للوصول لـ {h.vip.next}</span>
                  <span className="font-bold">{formatSDG(h.vip.needed)} ج.س متبقي</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${h.vip.progressPct}%` }}
                    className="h-full bg-white rounded-full shadow"
                  />
                </div>
                <div className="text-[10px] opacity-80 mt-1 text-center">
                  {h.vip.progressPct}% مكتمل
                </div>
              </div>
            )}
            {!h.vip.next && (
              <div className="relative mt-3 text-[11px] opacity-95 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                وصلت لأعلى مستوى! استمتع بكامل المزايا
              </div>
            )}
          </motion.div>
        )}

        {/* Health Score + Forecast */}
        {h && (
          <div className="grid grid-cols-2 gap-2">
            <HealthScoreCard score={h.score} grade={h.grade} />
            <ForecastCard f={h.forecast} balance={Number(wallet?.balance ?? 0)} />
          </div>
        )}

        {/* Money distribution pie */}
        {h && h.totalFunds > 0 && (
          <DistributionCard h={h} />
        )}

        {/* Action tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTab("deposit")}
            className={cn(
              "rounded-2xl py-2.5 text-sm font-bold transition border flex items-center justify-center gap-2",
              tab === "deposit"
                ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow"
                : "bg-white border-pink-200 text-pink-700",
            )}
          >
            <ArrowDownCircle className="w-4 h-4" /> شحن
          </button>
          <button
            onClick={() => setTab("withdraw")}
            className={cn(
              "rounded-2xl py-2.5 text-sm font-bold transition border flex items-center justify-center gap-2",
              tab === "withdraw"
                ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow"
                : "bg-white border-pink-200 text-pink-700",
            )}
          >
            <Banknote className="w-4 h-4" /> سحب
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === "deposit" ? (
            <motion.div
              key="dep"
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* ══════════════════════════════════════
                  DEPOSIT WIZARD HEADER + STEP PROGRESS
              ══════════════════════════════════════ */}
              <div className="fancy-card rounded-3xl overflow-hidden border border-pink-200">
                {/* Thin outlined header bar */}
                <div className="relative px-5 pt-4 pb-3 border-b border-pink-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-black text-pink-700 text-base flex items-center gap-2">
                        <ArrowDownCircle className="w-5 h-5 text-pink-600" />
                        شحن المحفظة
                      </div>
                      <div className="text-pink-400 text-[11px] mt-0.5">
                        {depositStep === 1 ? "اختر طريقة الدفع المناسبة" : depositStep === 2 ? "أدخل المبلغ المُحوَّل" : "أرسل صورة الإيصال"}
                      </div>
                    </div>
                    <div className="text-[11px] font-black text-pink-600 bg-pink-50 border border-pink-200 rounded-full px-3 py-1">
                      {depositStep} / 3
                    </div>
                  </div>

                  {/* Step progress */}
                  <div className="relative mt-3 flex items-center gap-0">
                    {([
                      { s: 1 as const, label: "الطريقة" },
                      { s: 2 as const, label: "المبلغ" },
                      { s: 3 as const, label: "الإيصال" },
                    ]).map(({ s, label }, i) => (
                      <div key={s} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1 z-10">
                          <motion.div
                            animate={{ scale: depositStep === s ? 1.15 : 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border",
                              depositStep > s
                                ? "bg-emerald-500 text-white border-emerald-500"
                                : depositStep === s
                                ? "bg-white text-pink-600 border-pink-400 shadow-md"
                                : "bg-white text-pink-300 border-pink-200"
                            )}
                            style={depositStep === s ? { boxShadow: "0 0 0 3px rgba(244,63,94,0.15)" } : {}}
                          >
                            {depositStep > s ? "✓" : s}
                          </motion.div>
                          <span className={cn("text-[9px] font-bold whitespace-nowrap",
                            depositStep >= s ? "text-pink-600" : "text-pink-300"
                          )}>{label}</span>
                        </div>
                        {i < 2 && (
                          <div className="flex-1 h-px mx-1 rounded-full overflow-hidden bg-pink-100 mb-4">
                            <motion.div
                              animate={{ width: depositStep > s ? "100%" : "0%" }}
                              className="h-full bg-pink-400"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Success banner */}
                  <AnimatePresence>
                    {depositSuccess && (
                      <motion.div
                        exit={{ opacity: 0, scale: 0.93, y: -8 }}
                        className="rounded-2xl overflow-hidden"
                      >
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">✅</div>
                          <div>
                            <div className="font-black text-white text-sm">طلب الشحن أُرسل بنجاح!</div>
                            <div className="text-emerald-100 text-[11px]">سيتم مراجعته من الإدارة قريباً</div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── STEP 1: اختيار طريقة الدفع ── */}
                  {depositStep === 1 && (
                    <motion.div
                      key="step1"
                      className="space-y-3"
                    >
                      <div className="text-[11px] text-pink-500 font-bold text-center tracking-widest uppercase">اختر طريقة الدفع</div>

                      {/* Payment method cards — white with colored left border */}
                      {[...PAYMENT_METHODS]
                        .slice()
                        .sort((a, b) => (a.id === lastMethod ? -1 : b.id === lastMethod ? 1 : 0))
                        .map((m, idx) => {
                          const ps = PM_STYLES[m.id as keyof typeof PM_STYLES];
                          const isLast = m.id === lastMethod;
                          return (
                            <div key={m.id} style={{ perspective: "700px" }}>
                              <motion.button
                                type="button"
                                onClick={() => {
                                  setDMethod(m.id);
                                  setLastMethod(m.id);
                                  localStorage.setItem("ov_last_pm", m.id);
                                  setDepositStep(2);
                                }}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.07 }}
                                whileHover={{ scale: 1.015 }}
                                whileTap={{ rotateX: 7, scale: 0.97 }}
                                style={{
                                  transformOrigin: "top center",
                                  borderLeft: `4px solid ${ps.accent}`,
                                  boxShadow: isLast
                                    ? `0 8px 28px ${ps.shadow}, 0 2px 8px rgba(0,0,0,0.08)`
                                    : `0 4px 16px ${ps.shadow}, 0 1px 4px rgba(0,0,0,0.05)`,
                                }}
                                className="w-full relative bg-white rounded-2xl overflow-hidden text-right"
                              >
                                <div className="p-4 flex items-center gap-3">
                                  {/* Logo */}
                                  <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden shadow-sm border border-gray-100">
                                    <img src={m.icon} alt={m.label} className="w-full h-full object-cover" />
                                  </div>

                                  {/* Info */}
                                  <div className="flex-1 text-right">
                                    <div className="font-black text-gray-900 text-lg leading-tight">{m.label}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{m.subtitle}</div>
                                  </div>

                                  {/* Badge + last used */}
                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span
                                      className="text-[10px] rounded-full px-2.5 py-0.5 font-bold"
                                      style={{ background: ps.tagBg, color: ps.accent }}
                                    >
                                      {ps.badge}
                                    </span>
                                    {isLast && (
                                      <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 font-bold flex items-center gap-1">
                                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> الأخيرة
                                      </span>
                                    )}
                                  </div>

                                  {/* Arrow */}
                                  <ChevronLeft className="w-4 h-4 text-gray-300 shrink-0" style={{ transform: "rotate(180deg)" }} />
                                </div>
                              </motion.button>
                            </div>
                          );
                        })}

                      {/* ── الكرت الرابع: طرق الدفع الأخرى ── */}
                      <div style={{ perspective: "700px" }}>
                        <motion.button
                          type="button"
                          onClick={() => setShowOtherModal(true)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.21 }}
                          whileHover={{ scale: 1.015 }}
                          whileTap={{ rotateX: 7, scale: 0.97 }}
                          style={{
                            transformOrigin: "top center",
                            borderLeft: "4px solid #6366f1",
                            boxShadow: "0 4px 16px rgba(99,102,241,0.14), 0 1px 4px rgba(0,0,0,0.05)",
                          }}
                          className="w-full relative bg-white rounded-2xl overflow-hidden text-right"
                        >
                          <div className="p-4 flex items-center gap-3">
                            <div className="shrink-0 w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl">
                              💬
                            </div>
                            <div className="flex-1 text-right">
                              <div className="font-black text-gray-900 text-lg leading-tight">هل لديك طرق دفع أخرى؟</div>
                              <div className="text-xs text-gray-500 mt-0.5">اعرف كيف تشحن من أي دولة</div>
                            </div>
                            <span className="text-[10px] rounded-full px-2.5 py-0.5 font-bold shrink-0"
                              style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                              اطّلع
                            </span>
                            <ChevronLeft className="w-4 h-4 text-gray-300 shrink-0" style={{ transform: "rotate(180deg)" }} />
                          </div>
                        </motion.button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── STEP 2: معلومات الحساب + المبلغ ── */}
                  {depositStep === 2 && (() => {
                    const pm = PAYMENT_METHODS.find(m => m.id === dMethod);
                    if (!pm) return null;
                    const ps = PM_STYLES[pm.id as keyof typeof PM_STYLES];
                    const currentBalance = wallet?.balance ? Number(wallet.balance) : 0;
                    const amountInSDG = dMethod === "BinancePay" ? Number(amount) * usdToSdg : Number(amount);
                    const newBalance = Number(amount) > 0 ? formatSDG(currentBalance + amountInSDG) : null;

                    return (
                      <motion.div
                        key="step2"
                        className="space-y-4"
                      >
                        <button type="button" onClick={() => setDepositStep(1)}
                          className="text-xs text-pink-500 font-bold flex items-center gap-1 hover:text-pink-700 transition">
                          <ChevronLeft className="w-3.5 h-3.5" /> رجوع
                        </button>

                        {/* Account card — glassmorphism per payment method */}
                        <div className="rounded-3xl overflow-hidden relative"
                          style={{
                            background: ps.gradient,
                            boxShadow: `0 20px 48px -10px ${ps.shadow}, 0 4px 16px -4px rgba(0,0,0,0.25)`,
                          }}>
                          {/* Soft noise texture */}
                          <div className="absolute inset-0 opacity-[0.04]"
                            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "11px 11px" }} />
                          {/* Glow orbs — static radial gradients (no GPU blur) */}
                          <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full pointer-events-none"
                            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 65%)" }} />
                          <div className="absolute -bottom-12 -right-8 w-36 h-36 rounded-full pointer-events-none"
                            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 60%)" }} />

                          <div className="relative p-4 space-y-3">
                            {/* Top: logo + name row */}
                            <div className="flex items-center justify-between">
                              <div className="rounded-xl px-2.5 py-1 text-[10px] font-black tracking-wide"
                                style={{ background: "rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.9)" }}>
                                {ps.badge}
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="text-right">
                                  <div className="font-black text-white text-base leading-tight">{pm.label}</div>
                                  <div className="text-white/60 text-[10px]">حوّل المبلغ لهذا الحساب</div>
                                </div>
                                <div className="w-12 h-12 rounded-2xl overflow-hidden"
                                  style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 0 2px rgba(255,255,255,0.3)" }}>
                                  <img src={pm.icon} alt={pm.label} className="w-full h-full object-cover" />
                                </div>
                              </div>
                            </div>

                            {/* Glass divider */}
                            <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }} />

                            {/* Account name — glass panel */}
                            <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
                              style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)" }}>
                              <div className="text-white/55 text-[10px] font-semibold tracking-wider">اسم الحساب</div>
                              <div className="font-bold text-white text-sm">{pm.accountName}</div>
                            </div>

                            {/* Account number — glass panel + copy */}
                            <div className="rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
                              style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)" }}>
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.88 }}
                                onClick={() => { navigator.clipboard.writeText(pm.accountNumber); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
                                className="shrink-0 rounded-xl px-3.5 py-2 text-[11px] font-black text-white flex items-center gap-1.5 transition-all"
                                style={copied
                                  ? { background: "rgba(52,211,153,0.35)", border: "1px solid rgba(52,211,153,0.55)" }
                                  : { background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}
                              >
                                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? "تم!" : "نسخ"}
                              </motion.button>
                              <div className="text-right flex-1 min-w-0">
                                <div className="text-white/50 text-[9px] font-semibold tracking-widest mb-0.5">{dMethod === "BinancePay" ? "ايدي الحساب" : "رقم الحساب"}</div>
                                <code className="font-black text-white text-lg tracking-widest" dir="ltr">{pm.accountNumber}</code>
                              </div>
                            </div>

                            {/* Bottom shimmer bar */}
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                              <motion.div
                                animate={{ x: ["-100%", "200%"] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", repeatDelay: 0.5 }}
                                className="h-full w-1/3 rounded-full"
                                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Amount entry card */}
                        <div className="rounded-3xl bg-white border border-pink-100 shadow-sm overflow-hidden">

                          {/* ── Amount input ── */}
                          <div className="px-5 pt-5 pb-2">
                            <div className="text-[10px] text-pink-400 font-black uppercase tracking-[0.18em] mb-2">
                              {dMethod === "BinancePay" ? "المبلغ بالدولار" : "المبلغ المُراد شحنه"}
                            </div>

                            {/* سعر الصرف ثابت فوق الحقل لباينانس */}
                            {dMethod === "BinancePay" && (
                              <div className="mb-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex items-center justify-between text-[11px] text-amber-700">
                                <span className="font-bold" dir="ltr">1 USD = {formatSDG(usdToSdg)} ج.س</span>
                                <span className="text-amber-500">سعر الصرف الحالي</span>
                              </div>
                            )}

                            <div className="relative rounded-2xl border border-pink-200 bg-pink-50/60 focus-within:border-pink-400 focus-within:ring-2 focus-within:ring-pink-100 transition-all overflow-hidden">
                              {/* Currency label — absolute LEFT */}
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400 font-black text-xl pointer-events-none select-none">
                                {dMethod === "BinancePay" ? "دولار" : "ج.س"}
                              </span>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9.]/g, "");
                                  if (/^\d*\.?\d{0,2}$/.test(val) && val.replace(".", "").length <= 7)
                                    setAmount(val);
                                }}
                                placeholder="0"
                                autoComplete="off"
                                className={cn(
                                  "w-full bg-transparent border-none outline-none font-black text-pink-900 placeholder:text-pink-200 text-center caret-pink-500 transition-all duration-150 py-5 pl-16 pr-4",
                                  !amount || amount.length <= 3 ? "text-6xl" :
                                  amount.length <= 5 ? "text-5xl" :
                                  amount.length <= 7 ? "text-4xl" : "text-3xl"
                                )}
                                style={{ direction: "ltr" }}
                              />
                            </div>

                            <AnimatePresence>
                              {newBalance && (
                                <motion.div
                                  animate={{ opacity: 1, y: 0, height: "auto" }}
                                  exit={{ opacity: 0, y: -4, height: 0 }}
                                  className="mt-2 overflow-hidden"
                                >
                                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-1.5">
                                    <span className="text-sm">🎉</span>
                                    <span className="text-xs text-emerald-700 font-bold">رصيدك سيصبح {newBalance} ج.س</span>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                          </div>

                        </div>

                        <motion.button
                          type="button"
                          onClick={() => { if (Number(amount) > 0) setDepositStep(3); }}
                          disabled={!amount || Number(amount) <= 0}
                          whileTap={{ scale: 0.97 }}
                          className="w-full rounded-2xl py-4 font-black text-white shadow-xl disabled:opacity-45 flex items-center justify-center gap-2 text-base"
                          style={{ background: "linear-gradient(135deg, #ec4899 0%, #e11d48 55%, #be123c 100%)", boxShadow: "0 8px 24px rgba(225,29,72,0.4)" }}
                        >
                          التالي — رفع الإيصال <span className="text-lg">→</span>
                        </motion.button>
                      </motion.div>
                    );
                  })()}

                  {/* ── STEP 3: رفع الإيصال + إرسال ── */}
                  {depositStep === 3 && (() => {
                    const pm = PAYMENT_METHODS.find(m => m.id === dMethod);
                    if (!pm) return null;
                    return (
                      <motion.div
                        key="step3"
                        className="space-y-4"
                      >
                        <button type="button" onClick={() => setDepositStep(2)}
                          className="text-xs text-pink-500 font-bold flex items-center gap-1 hover:text-pink-700 transition">
                          <ChevronLeft className="w-3.5 h-3.5" /> رجوع
                        </button>

                        {/* Order summary card */}
                        <div className="rounded-2xl bg-white border border-pink-100 shadow-sm overflow-hidden">
                          <div className="px-4 py-2.5 bg-pink-50/60 border-b border-pink-100">
                            <div className="text-[10px] font-black text-pink-400 uppercase tracking-widest">ملخص طلب الشحن</div>
                          </div>
                          <div className="p-4 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md shrink-0 border-2 border-pink-100">
                              <img src={pm.icon} alt={pm.label} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-black text-pink-900 text-sm">{pm.label}</div>
                              <div className="text-[11px] text-pink-400 font-mono mt-0.5" dir="ltr">{pm.accountNumber}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-black text-pink-900 text-2xl leading-none">
                                {dMethod === "BinancePay" ? formatSDG(Number(amount) * usdToSdg) : amount}
                              </div>
                              <div className="text-[11px] text-pink-400 font-bold mt-0.5">ج.س</div>
                            </div>
                          </div>
                        </div>

                        {/* Receipt upload */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-black text-pink-900">صورة الإيصال</div>
                            <AnimatePresence>
                              {receiptBase64 && (
                                <motion.div
                                  className="flex items-center gap-1 text-emerald-600">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="text-xs font-bold">جاهز ✓</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <AnimatePresence mode="wait">
                            {receiptPreview ? (
                              <motion.div key="preview"
                                exit={{ opacity: 0, scale: 0.92 }}
                                className="relative"
                              >
                                {/* Animated border when compressing */}
                                {receiptUploading && (
                                  <motion.div
                                    className="absolute inset-0 rounded-3xl z-20 pointer-events-none"
                                    style={{ padding: "2px", background: "conic-gradient(from 0deg, #ec4899, #f43f5e, #f97316, #fbbf24, #ec4899)" }}
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                                  >
                                    <div className="w-full h-full rounded-3xl bg-white/10" />
                                  </motion.div>
                                )}
                                {/* Polaroid frame */}
                                <div className={`rounded-3xl bg-white p-2 pb-11 transition-all ${receiptUploading ? "border-2 border-pink-400/60" : "border border-pink-100/80"}`}
                                  style={{ boxShadow: receiptUploading ? "0 0 0 3px rgba(236,72,153,0.25), 0 14px 44px rgba(236,72,153,0.3)" : "0 14px 44px rgba(236,72,153,0.18), 0 2px 8px rgba(0,0,0,0.07)" }}>
                                  <img src={receiptPreview} alt="إيصال" className="w-full max-h-56 object-contain rounded-2xl bg-pink-50/30" />
                                  <div className="text-center mt-3 text-[11px] text-pink-300 font-semibold tracking-wider">إيصال التحويل</div>
                                </div>
                                {/* Remove button */}
                                <motion.button type="button" whileTap={{ scale: 0.88 }}
                                  onClick={() => { setReceiptFile(null); setReceiptBase64(null); setReceiptPreview(null); }}
                                  className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-xl text-sm font-black border-2 border-white z-10">
                                  ✕
                                </motion.button>
                                {/* Replace label */}
                                <label htmlFor="receipt-upload"
                                  className="absolute bottom-3.5 left-1/2 -translate-x-1/2 cursor-pointer rounded-full bg-black/35 backdrop-blur-sm border border-white/20 text-white text-[10px] font-bold px-3.5 py-1.5 flex items-center gap-1.5 whitespace-nowrap hover:bg-black/50 transition-colors">
                                  استبدال الصورة
                                </label>
                              </motion.div>
                            ) : (
                              <motion.label key="uploader" htmlFor="receipt-upload"
                                exit={{ opacity: 0 }}
                                className="block cursor-pointer"
                              >
                                <div className="rounded-2xl py-8 flex flex-col items-center justify-center gap-3"
                                  style={{ border: "2px dashed #fbcfe8", background: "#fff8fa" }}>
                                  <ImageUp className="w-8 h-8 text-pink-400" />
                                  <div className="text-center">
                                    <div className="text-sm text-pink-700 font-bold">اضغط لرفع صورة الإيصال</div>
                                    <div className="text-[11px] text-pink-400 mt-0.5">PNG أو JPG · حتى 20 ميجا</div>
                                  </div>
                                </div>
                              </motion.label>
                            )}
                          </AnimatePresence>

                          <input id="receipt-upload" type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setReceiptPreview(URL.createObjectURL(file));
                              setReceiptBase64(null);
                              setDepositError(null);
                              setReceiptUploading(true);
                              try {
                                const compressed = await compressImage(file);
                                setReceiptBase64(compressed);
                              } catch {
                                setDepositError("فشل قراءة الملف، حاول مرة أخرى");
                              } finally {
                                setReceiptUploading(false);
                              }
                            }}
                          />
                        </div>

                        {depositError && (
                          <motion.div
                            className="rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs p-3 flex gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>{depositError}</div>
                          </motion.div>
                        )}

                        {/* Submit button */}
                        <motion.button
                          type="button"
                          onClick={submitDeposit}
                          disabled={!receiptBase64 || depositLoading}
                          whileTap={!depositLoading && !!receiptBase64 ? { scale: 0.97 } : {}}
                          className="w-full rounded-2xl py-4 font-black text-white shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 relative overflow-hidden text-base"
                          style={{
                            background: "linear-gradient(90deg, #ec4899 0%, #e11d48 35%, #f43f5e 65%, #ec4899 100%)",
                            backgroundSize: "200% 100%",
                            boxShadow: receiptBase64 ? "0 10px 32px rgba(236,72,153,0.5)" : undefined,
                          }}
                          animate={!depositLoading && !!receiptBase64 ? { backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"] } : {}}
                          transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                        >
                          {/* Shimmer overlay */}
                          {!!receiptBase64 && !depositLoading && (
                            <motion.div
                              animate={{ x: ["-100%", "200%"] }}
                              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut", repeatDelay: 1 }}
                              className="absolute inset-0 opacity-20"
                              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)", width: "40%" }}
                            />
                          )}
                          {depositLoading ? (
                            <span className="flex items-center gap-2">
                              <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0 }} className="text-xl">•</motion.span>
                              <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.3 }} className="text-xl">•</motion.span>
                              <motion.span animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.6 }} className="text-xl">•</motion.span>
                            </span>
                          ) : (
                            <span className="relative flex items-center gap-2">
                              <Send className="w-4 h-4" />
                              تأكيد طلب الشحن
                            </span>
                          )}
                        </motion.button>
                      </motion.div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="wd"
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {/* ── رصيد الإحالة المتاح ── */}
              <div className="fancy-card rounded-3xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow"
                    style={{ background: "linear-gradient(135deg,#f43f5e,#e11d48)" }}>
                    <Banknote className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-bold text-pink-900 text-sm">سحب رصيد الإحالة</div>
                </div>
                {refBalanceQ.isLoading ? (
                  <div className="flex items-center gap-2 text-pink-400 text-xs py-2">
                    <RefreshCcw className="w-4 h-4 animate-spin" /> جارِ التحميل...
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-green-50 rounded-2xl p-2">
                      <div className="text-[10px] text-green-700 font-semibold mb-0.5">إجمالي الإحالات</div>
                      <div className="font-extrabold text-green-800 text-sm">{formatSDG(Number(refBalanceQ.data?.total ?? 0))}</div>
                      <div className="text-[9px] text-green-600">ج.س</div>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-2">
                      <div className="text-[10px] text-amber-700 font-semibold mb-0.5">تم السحب</div>
                      <div className="font-extrabold text-amber-800 text-sm">{formatSDG(Number(refBalanceQ.data?.withdrawn ?? 0))}</div>
                      <div className="text-[9px] text-amber-600">ج.س</div>
                    </div>
                    <div className="rounded-2xl p-2" style={{ background: "linear-gradient(135deg,#fef2f2,#fff1f2)" }}>
                      <div className="text-[10px] text-rose-700 font-semibold mb-0.5">المتاح للسحب</div>
                      <div className="font-extrabold text-rose-600 text-sm">{formatSDG(Number(refBalanceQ.data?.available ?? 0))}</div>
                      <div className="text-[9px] text-rose-500">ج.س</div>
                    </div>
                  </div>
                )}
                <div className="mt-2 text-[10px] text-pink-600/80 text-center">
                  الحد الأدنى للسحب {formatSDG(minReferralWithdraw)} ج.س • يُسمح فقط بسحب رصيد الإحالة
                </div>
              </div>

              {/* ── نجاح ── */}
              {wOk && (
                <div className="rounded-2xl bg-green-50 border border-green-200 text-green-700 text-xs p-3 flex gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>تم استلام طلب السحب بنجاح وسيتم معالجته خلال 24 ساعة ✅</div>
                </div>
              )}

              {/* ══ الخطوة 1: اختيار طريقة الدفع ══ */}
              {wStep === 1 && (
                <div className="fancy-card rounded-3xl p-4 space-y-3">
                  <div className="text-xs font-extrabold text-pink-900">الخطوة 1 من 3 — اختر طريقة السحب</div>

                  <div className="grid grid-cols-3 gap-2">
                    {[...MOBILE_WITHDRAW_METHODS, ...WALLET_WITHDRAW_METHODS].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setWMethodId(m.id); setWErr(null); }}
                        className={cn(
                          "rounded-2xl py-2.5 px-1 text-xs font-bold transition border flex flex-col items-center gap-1.5",
                          wMethodId === m.id
                            ? "border-pink-500 shadow-md bg-pink-50"
                            : "bg-white border-pink-200 text-pink-700",
                        )}
                      >
                        <img
                          src={m.icon}
                          alt={m.label}
                          className={cn(
                            "w-10 h-10 rounded-xl object-contain shadow-sm transition",
                            wMethodId === m.id ? "ring-2 ring-pink-500" : "",
                          )}
                        />
                        <span className={wMethodId === m.id ? "text-pink-700" : ""}>{m.label}</span>
                      </button>
                    ))}
                  </div>

                  {wErr && (
                    <div className="rounded-2xl bg-pink-50 border border-pink-200 text-pink-700 text-xs p-3 flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{wErr}</div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!wMethodId}
                    onClick={() => { if (!wMethodId) { setWErr("اختر طريقة الدفع أولاً"); return; } setWErr(null); setWStep(2); }}
                    className="w-full rounded-2xl py-3 font-bold text-white shadow-lg active:scale-95 transition disabled:opacity-40"
                    style={{ background: "linear-gradient(90deg,#f43f5e,#e11d48)" }}
                  >
                    التالي ← بيانات الحساب
                  </button>
                </div>
              )}

              {/* ══ الخطوة 2: بيانات الحساب ══ */}
              {wStep === 2 && (
                <div className="fancy-card rounded-3xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold text-pink-900">الخطوة 2 من 3 — بيانات الحساب</div>
                    <button type="button" onClick={() => { setWStep(1); setWErr(null); }} className="text-[10px] text-pink-500 font-bold">← رجوع</button>
                  </div>

                  {/* تنبيه مهم */}
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div className="text-[11px] text-amber-800 font-semibold">
                      تأكد من صحة البيانات قبل الإرسال — في حال كانت المعلومات خاطئة لا يمكن استرجاع المبلغ بأي حال.
                    </div>
                  </div>

                  {MOBILE_WITHDRAW_IDS.has(wMethodId) ? (
                    <div>
                      <label className="text-xs text-pink-800 font-semibold">رقم الهاتف</label>
                      <input
                        value={wPhone}
                        onChange={(e) => setWPhone(e.target.value)}
                        type="tel"
                        dir="ltr"
                        className="glass-input mt-1 w-full rounded-2xl border border-pink-200 px-4 py-3 text-sm text-left"
                        placeholder="09xxxxxxxx"
                      />
                      <div className="mt-1.5 text-[10px] text-amber-700 font-semibold">
                        ⚠️ تأكد من الرقم — خطأ في الرقم يعني فقدان المبلغ نهائياً
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs text-pink-800 font-semibold">
                          {wMethodId === "binance" ? "ايدي حساب باينانس" : "رقم الحساب"}
                        </label>
                        <input
                          value={wAccountNumber}
                          onChange={(e) => setWAccountNumber(e.target.value)}
                          dir="ltr"
                          className="glass-input mt-1 w-full rounded-2xl border border-pink-200 px-4 py-3 text-sm text-left"
                          placeholder={wMethodId === "binance" ? "أدخل ID الحساب" : "أدخل رقم الحساب"}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-pink-800 font-semibold">اسم الحساب</label>
                        <input
                          value={wAccountName}
                          onChange={(e) => setWAccountName(e.target.value)}
                          className="glass-input mt-1 w-full rounded-2xl border border-pink-200 px-4 py-3 text-sm"
                          placeholder="الاسم الكامل"
                        />
                      </div>
                      <div className="text-[10px] text-amber-700 font-semibold">
                        ⚠️ تأكد من صحة البيانات — خطأ في المعلومات يعني فقدان المبلغ نهائياً
                      </div>
                    </>
                  )}

                  {wErr && (
                    <div className="rounded-2xl bg-pink-50 border border-pink-200 text-pink-700 text-xs p-3 flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{wErr}</div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const isMob = MOBILE_WITHDRAW_IDS.has(wMethodId);
                      if (isMob && !wPhone.trim()) return setWErr("أدخل رقم الهاتف");
                      if (!isMob && !wAccountNumber.trim()) return setWErr("أدخل رقم الحساب");
                      if (!isMob && !wAccountName.trim()) return setWErr("أدخل اسم الحساب");
                      setWErr(null); setWStep(3);
                    }}
                    className="w-full rounded-2xl py-3 font-bold text-white shadow-lg active:scale-95 transition"
                    style={{ background: "linear-gradient(90deg,#f43f5e,#e11d48)" }}
                  >
                    التالي ← تأكيد المبلغ
                  </button>
                </div>
              )}

              {/* ══ الخطوة 3: المبلغ والتأكيد ══ */}
              {wStep === 3 && (
                <form onSubmit={submitRefWithdraw} className="fancy-card rounded-3xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold text-pink-900">الخطوة 3 من 3 — المبلغ والتأكيد</div>
                    <button type="button" onClick={() => { setWStep(2); setWErr(null); }} className="text-[10px] text-pink-500 font-bold">← رجوع</button>
                  </div>

                  <div>
                    <label className="text-xs text-pink-800 font-semibold">
                      المبلغ (ج.س) — الحد الأدنى {formatSDG(minReferralWithdraw)} ج.س
                    </label>
                    <input
                      value={wAmount}
                      onChange={(e) => setWAmount(e.target.value)}
                      required
                      type="number"
                      inputMode="decimal"
                      min={minReferralWithdraw}
                      step="1"
                      dir="ltr"
                      className="mt-1 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-pink-400"
                      placeholder={`${formatSDG(minReferralWithdraw)}`}
                    />
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="text-pink-700/80">المتاح: <span className="font-bold text-rose-600">{formatSDG(Number(refBalanceQ.data?.available ?? 0))} ج.س</span></span>
                      {Number(wAmount) > 0 && Number(wAmount) < minReferralWithdraw && (
                        <span className="text-red-600 font-semibold">أقل من الحد الأدنى</span>
                      )}
                      {Number(wAmount) > Number(refBalanceQ.data?.available ?? 0) && Number(wAmount) > 0 && (
                        <span className="text-red-600 font-semibold">يتجاوز رصيدك</span>
                      )}
                    </div>
                  </div>

                  {/* تنبيه مهم */}
                  <div className="rounded-2xl border p-3 space-y-2"
                    style={{ background: "rgba(254,242,242,0.8)", borderColor: "rgba(252,165,165,0.5)" }}>
                    <div className="flex gap-2 items-start">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                      <div className="text-[11px] text-red-800 font-bold">تنبيه مهم — اقرأ قبل الإرسال</div>
                    </div>
                    <ul className="text-[10.5px] text-red-700 space-y-1 pr-2 list-disc">
                      <li>تأكد من صحة رقم الحساب / الهاتف قبل الإرسال</li>
                      <li>في حالة خطأ في البيانات <strong>لا يمكن استرجاع المبلغ</strong> بأي حال</li>
                      <li>يُسمح فقط بسحب رصيد الإحالة، ويُعالَج الطلب خلال 24 ساعة</li>
                    </ul>
                  </div>

                  {/* checkbox تأكيد */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wConfirmed}
                      onChange={(e) => setWConfirmed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-rose-500 shrink-0"
                    />
                    <span className="text-[11px] text-pink-800 font-semibold">
                      أؤكد أن جميع البيانات صحيحة وأتحمل المسؤولية الكاملة في حالة الخطأ
                    </span>
                  </label>

                  {wErr && (
                    <div className="rounded-2xl bg-pink-50 border border-pink-200 text-pink-700 text-xs p-3 flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{wErr}</div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      wLoading ||
                      !wConfirmed ||
                      Number(wAmount) < minReferralWithdraw ||
                      Number(wAmount) > Number(refBalanceQ.data?.available ?? 0)
                    }
                    className="w-full rounded-2xl py-3 font-bold text-white shadow-lg active:scale-95 transition disabled:opacity-40"
                    style={{ background: "linear-gradient(90deg,#f43f5e,#e11d48)" }}
                  >
                    {wLoading ? "جارٍ الإرسال..." : "إرسال طلب السحب ✓"}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transactions */}
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <div className="font-extrabold text-pink-900 flex items-center gap-2 text-[15px]">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow">
                <Activity className="w-3.5 h-3.5" />
              </div>
              سجل المعاملات
              <LivePill />
            </div>
            <div className="bg-pink-100 text-pink-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full">
              {filteredTx.length}
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {TX_TABS.map((t) => {
              const active = filter === t.id;
              return (
                <motion.button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  whileTap={{ scale: 0.93 }}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all",
                    active
                      ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md shadow-pink-200"
                      : "bg-white border border-pink-100 text-pink-600 shadow-sm",
                  )}
                >
                  {t.label}
                </motion.button>
              );
            })}
          </div>

          {/* Empty state */}
          {(!filteredTx || filteredTx.length === 0) && (
            <motion.div
              className="text-center py-12 bg-white rounded-3xl border border-pink-100 shadow-sm"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Activity className="w-7 h-7 text-pink-300" />
              </div>
              <div className="text-sm font-bold text-pink-400">لا توجد معاملات</div>
              <div className="text-[11px] text-pink-300 mt-0.5">جرّب تصنيفاً آخر</div>
            </motion.div>
          )}

          {/* Transaction list */}
          <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden divide-y divide-pink-50">
            {filteredTx.slice(0, 4).map((t, index) => {
              const amt = Number(t.amount);
              const negative = amt < 0;
              const isPending = t.status === "pending";
              const isRejected = t.status === "rejected";

              const STATUS_CONFIG = {
                completed: { label: "مكتملة", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
                pending:   { label: "معلّقة",  bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
                rejected:  { label: "مرفوضة", bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200",     dot: "bg-red-500" },
                cancelled: { label: "ملغاة",   bg: "bg-gray-50",    text: "text-gray-600",    border: "border-gray-200",    dot: "bg-gray-400" },
              } as const;

              const st = STATUS_CONFIG[t.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.completed;

              const iconCfg = negative
                ? { icon: ArrowUpRight,    bg: "bg-red-50",     color: "text-red-500",     ring: "ring-red-100" }
                : isPending
                ? { icon: Clock,           bg: "bg-amber-50",   color: "text-amber-500",   ring: "ring-amber-100" }
                : isRejected
                ? { icon: XCircle,         bg: "bg-red-50",     color: "text-red-500",     ring: "ring-red-100" }
                : { icon: ArrowDownLeft,   bg: "bg-emerald-50", color: "text-emerald-600", ring: "ring-emerald-100" };

              const TxIcon = iconCfg.icon;

              const amtColor = negative
                ? "text-red-500"
                : isPending  ? "text-amber-600"
                : isRejected ? "text-red-500"
                : "text-emerald-600";

              const txDate = new Date(t.createdAt);
              const dateStr = txDate.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
              const timeStr = txDate.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

              return (
                <motion.button
                  key={t.id}
                  onClick={() => setOpenTx(t)}
                  transition={{ delay: index * 0.04, type: "spring", stiffness: 320, damping: 26 }}
                  whileTap={{ scale: 0.978 }}
                  className="w-full text-right bg-white hover:bg-pink-50/40 transition-colors duration-150 overflow-hidden"
                >
                  <div className="p-3.5 flex items-center gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ring-2",
                      iconCfg.bg, iconCfg.ring
                    )}>
                      <TxIcon className={cn("w-5 h-5", iconCfg.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[13px] text-gray-900 truncate">
                          {TYPE_LABEL[t.type] ?? t.type}
                        </span>
                        {t.method && (
                          <span className="text-[9px] bg-pink-50 text-pink-500 font-bold px-1.5 py-0.5 rounded-full border border-pink-100 shrink-0">
                            {t.method}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400 font-mono">
                          #{String(t.reference ?? t.id).slice(-6)}
                        </span>
                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                        <span className="text-[10px] text-gray-400">
                          {dateStr} · {timeStr}
                        </span>
                      </div>
                    </div>

                    {/* Right col — amount + status */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <div className={cn("text-[15px] font-black tabular-nums leading-none", amtColor)}>
                        {negative ? "−" : "+"}{formatSDG(Math.abs(amt))}
                        <span className="text-[9px] font-bold ml-0.5 opacity-70">ج.س</span>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border",
                        st.bg, st.text, st.border
                      )}>
                        {isPending ? (
                          <motion.span
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1.4 }}
                            className={cn("w-1.5 h-1.5 rounded-full shrink-0", st.dot)}
                          />
                        ) : (
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", st.dot)} />
                        )}
                        {st.label}
                      </div>
                    </div>
                  </div>

                  {/* Slim bottom accent line — colour per type only, very subtle */}
                  <div className={cn(
                    "h-[2px] w-full",
                    negative || isRejected ? "bg-gradient-to-r from-red-200 via-red-300 to-red-200"
                    : isPending            ? "bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200"
                                           : "bg-gradient-to-r from-emerald-100 via-emerald-200 to-emerald-100"
                  )} />
                </motion.button>
              );
            })}
            {/* "عرض الكل" footer row */}
            {filteredTx.length > 4 && (
              <div className="px-4 py-3 flex items-center justify-between bg-pink-50/60">
                <span className="text-[11px] text-pink-500 font-semibold">
                  يوجد {filteredTx.length - 4} معاملة إضافية
                </span>
                <button
                  onClick={() => {}}
                  className="text-[11px] font-extrabold text-pink-600 flex items-center gap-1 active:opacity-70 transition"
                >
                  عرض الكل
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
        <WalletExtras />
      </div>

      <AnimatePresence>
        {openTx && (
          <TxDetailModal tx={openTx} onClose={() => setOpenTx(null)} />
        )}
      </AnimatePresence>

      {/* ── موودال: هل لديك طرق دفع أخرى؟ ── */}
      <AnimatePresence>
        {showOtherModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setShowOtherModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

              {/* Header */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowOtherModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition p-1"
                >
                  <XCircle className="w-6 h-6" />
                </button>
                <div className="text-right">
                  <div className="font-black text-gray-900 text-lg">طرق الدفع الأخرى</div>
                  <div className="text-xs text-gray-500">كيف تشحن من أي دولة</div>
                </div>
              </div>

              {/* Content */}
              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 space-y-3">
                <div className="flex items-center gap-2 justify-end">
                  <div className="text-sm font-extrabold text-indigo-800">عبر باينانس من أي دولة</div>
                  <Bitcoin className="w-4 h-4 text-indigo-500 shrink-0" />
                </div>

                <div className="text-sm text-indigo-700 leading-relaxed text-right">
                  إذا كنت لا تملك طرق الدفع المتوفرة أو من دولة لا تتيح هذه البنوك، يجب أن تذهب إلى{" "}
                  <strong>فيسبوك</strong> وتبحث عن <strong>Binance باسم دولتك</strong>، وتجد شخصاً
                  موثوقاً وتنسخ الـ ID الموجود في طريقة دفع باينانس، وتشحن وترسل الإيصال وسيتم
                  شحن رصيدك فوراً.
                </div>

                {/* Binance ID copy */}
                <div className="rounded-xl bg-white border border-indigo-200 px-3 py-2.5 flex items-center justify-between gap-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      navigator.clipboard.writeText("1167049074");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    }}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-black text-white flex items-center gap-1.5"
                    style={{ background: copied ? "#10b981" : "#6366f1" }}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copied ? "تم النسخ!" : "نسخ الـ ID"}
                  </motion.button>
                  <div className="text-right">
                    <div className="text-[9px] text-gray-500 font-semibold">باينانس Pay ID</div>
                    <code className="font-black text-gray-800 text-base tracking-wider" dir="ltr">
                      1167049074
                    </code>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-[11px] text-amber-700 text-right leading-relaxed">
                💡 بعد الشحن، ارجع لهذه الصفحة وأرسل الإيصال عبر طريقة{" "}
                <strong>باينانس باي</strong> لتأكيد شحن رصيدك.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

// ══════════════════════════════════════════════════════
//  BalanceCard — Luxury Ruby Red
// ══════════════════════════════════════════════════════
function BalanceCard({
  balance,
  referralBalance,
  totalDeposits,
  totalSpent,
  pendingCount,
  dataUpdatedAt,
  vipTier,
  onRefresh,
}: {
  balance: number;
  referralBalance: number;
  totalDeposits: number;
  totalSpent: number;
  pendingCount: number;
  dataUpdatedAt: number;
  vipTier?: string;
  onRefresh: () => void;
}) {
  const [displayed, setDisplayed] = useState(0);
  const [shimmer, setShimmer] = useState(false);
  const [hidden, setHidden] = useState(false);
  const prevBalance = useRef(balance);

  useEffect(() => {
    if (balance === prevBalance.current) return;
    setShimmer(true);
    setTimeout(() => setShimmer(false), 900);
    prevBalance.current = balance;
  }, [balance]);

  useEffect(() => {
    let start = 0;
    const end = balance;
    if (end === 0) { setDisplayed(0); return; }
    const duration = 900;
    const steps = 40;
    const inc = end / steps;
    const interval = duration / steps;
    const id = setInterval(() => {
      start += inc;
      if (start >= end) { setDisplayed(end); clearInterval(id); }
      else setDisplayed(Math.floor(start));
    }, interval);
    return () => clearInterval(id);
  }, [balance]);

  const spentPct = totalDeposits > 0 ? Math.min(100, (totalSpent / totalDeposits) * 100) : 0;
  const safeBalance = balance;
  const isRich = safeBalance >= 1000;

  const VIP_COLORS: Record<string, string> = {
    Bronze: "#cd7f32", Silver: "#a8a9ad", Gold: "#ffd700",
    Platinum: "#00b4d8", Diamond: "#e040fb",
  };
  const vipColor = vipTier ? VIP_COLORS[vipTier] ?? "#ffd700" : null;

  return (
    <motion.div
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className="relative overflow-hidden rounded-[2rem] text-white select-none"
      style={{
        background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 45%, #be123c 100%)",
        boxShadow: "0 24px 60px -12px rgba(244,63,94,0.60), 0 4px 16px -4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
        minHeight: 220,
      }}
    >
      {/* ── Glow orbs — static radial gradients, no GPU blur ── */}
      <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(251,113,133,0.32) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(225,29,72,0.22) 0%, transparent 70%)" }} />

      {/* ── Dot grid pattern ── */}
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      }} />

      {/* ── Holographic shimmer sweep ── */}
      <AnimatePresence>
        {shimmer && (
          <motion.div
            animate={{ x: "200%", opacity: 0 }}
            exit={{}}
            className="absolute inset-0 w-1/3"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)", zIndex: 10 }}
          />
        )}
      </AnimatePresence>

      {/* ── Diagonal accent line ── */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.07]" style={{
        backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,255,255,0.5) 8px, rgba(255,255,255,0.5) 9px)",
      }} />

      {/* ── Card content ── */}
      <div className="relative z-10 p-5">

        {/* Top row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            {/* Chip icon */}
            <div className="w-9 h-7 rounded-md border border-white/30 bg-gradient-to-br from-yellow-300/80 to-amber-400/60 flex items-center justify-center shadow-inner">
              <div className="grid grid-cols-2 gap-[2px]">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-1.5 h-1 rounded-[1px] bg-amber-900/40" />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold opacity-70 uppercase tracking-widest">Ovelin</div>
              <div className="text-xs font-black opacity-90">محفظتي</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* VIP badge */}
            {vipTier && (
              <div className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black border"
                style={{ borderColor: vipColor + "66", backgroundColor: vipColor + "22", color: vipColor ?? "#fff" }}>
                <Crown className="w-2.5 h-2.5" /> {vipTier}
              </div>
            )}
            {/* Live pulse */}
            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-200" />
              </span>
              <span className="text-[9px] opacity-70 font-bold">مباشر</span>
            </div>
            {/* Refresh */}
            <motion.button
              onClick={onRefresh}
              whileTap={{ rotate: 360 }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 transition"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>

        {/* Balance */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-0.5">
            <div className="text-[10px] opacity-60 font-semibold tracking-wider uppercase">الرصيد المتاح</div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => setHidden(h => !h)}
              className="p-1 rounded-lg"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              {hidden
                ? <EyeOff className="w-3.5 h-3.5 opacity-70" />
                : <Eye className="w-3.5 h-3.5 opacity-70" />}
            </motion.button>
          </div>
          <div className="flex items-end gap-2">
            <motion.div
              key={balance}
              className="text-5xl font-black leading-none tracking-tight"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.3)", letterSpacing: hidden ? "0.15em" : undefined }}
            >
              {hidden ? "••••••" : formatSDG(displayed)}
            </motion.div>
            {!hidden && <span className="text-xl font-black opacity-70 mb-0.5">ج.س</span>}
            {isRich && !hidden && <Sparkles className="w-4 h-4 text-yellow-300 mb-1 animate-pulse" />}
          </div>
          <div className="text-[9px] opacity-50 mt-0.5 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            آخر تحديث {new Date(dataUpdatedAt || Date.now()).toLocaleTimeString("ar-EG")}
            {pendingCount > 0 && (
              <span className="ml-1 bg-yellow-400/20 text-yellow-200 border border-yellow-400/30 rounded-full px-1.5 text-[8px] font-bold">
                {pendingCount} معلّق
              </span>
            )}
          </div>
        </div>

        {/* Percentage stats pills */}
        <div className="flex gap-2 mt-3">
          {/* Spending % */}
          <div className="flex-1 rounded-xl px-3 py-2"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div className="text-[8px] opacity-55 font-semibold mb-1">نسبة الإنفاق</div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${spentPct}%` }}
                  className="h-full rounded-full"
                  style={{
                    background: spentPct > 80
                      ? "linear-gradient(90deg,#fbbf24,#ef4444)"
                      : spentPct > 50
                        ? "linear-gradient(90deg,#fde68a,#fbbf24)"
                        : "linear-gradient(90deg,#86efac,#4ade80)",
                  }}
                />
              </div>
              <span className="text-[10px] font-black">{hidden ? "••%" : `${spentPct.toFixed(0)}%`}</span>
            </div>
          </div>
          {/* Saved % */}
          {totalDeposits > 0 && (
            <div className="flex-1 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="text-[8px] opacity-55 font-semibold mb-1">المتبقي</div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, 100 - spentPct)}%` }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#818cf8,#c084fc)" }}
                  />
                </div>
                <span className="text-[10px] font-black">{hidden ? "••%" : `${Math.max(0, 100 - spentPct).toFixed(0)}%`}</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-2xl p-3 flex items-center gap-2.5"
            style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(52,211,153,0.2)" }}>
              <ArrowDownCircle className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="text-[8px] opacity-55 font-semibold uppercase tracking-wide">إجمالي الإيداع</div>
              <div className="text-xs font-black mt-0.5">{hidden ? "•••• ج.س" : `${formatSDG(totalDeposits)} ج.س`}</div>
            </div>
          </div>
          <div className="rounded-2xl p-3 flex items-center gap-2.5"
            style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.14)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(251,113,133,0.2)" }}>
              <ArrowUpCircle className="w-4 h-4 text-rose-300" />
            </div>
            <div>
              <div className="text-[8px] opacity-55 font-semibold uppercase tracking-wide">إجمالي المصروف</div>
              <div className="text-xs font-black mt-0.5">{hidden ? "•••• ج.س" : `${formatSDG(totalSpent)} ج.س`}</div>
            </div>
          </div>
        </div>

        {/* ── رصيد الإحالة داخل البطاقة ── */}
        {referralBalance > 0 && (
          <div className="mt-3 rounded-2xl px-3 py-2.5 flex items-center justify-between"
            style={{
              background: "linear-gradient(135deg, rgba(10,10,20,0.90) 0%, rgba(30,15,35,0.95) 100%)",
              border: "1px solid rgba(255,215,0,0.28)",
              boxShadow: "0 4px 16px -4px rgba(255,215,0,0.15), inset 0 1px 0 rgba(255,215,0,0.10)",
            }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.22) 0%, rgba(255,180,0,0.15) 100%)", border: "1px solid rgba(255,215,0,0.35)" }}>
                👑
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: "#FFD700", textShadow: "0 0 8px rgba(255,215,0,0.5)" }}>رصيد الإحالة</div>
                <div className="text-[8px] leading-tight mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>يُكمّل رصيدك الرئيسي تلقائياً</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-base font-black leading-none"
                style={{ color: "#FFD700", textShadow: "0 0 12px rgba(255,215,0,0.6)" }}>
                {hidden ? "••••" : formatSDG(referralBalance)}
              </div>
              <div className="text-[8px] font-bold mt-0.5" style={{ color: "rgba(255,215,0,0.55)" }}>ج.س</div>
            </div>
          </div>
        )}

        {/* ── Card number strip ── */}
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center justify-between">
            <div className="font-mono text-[9px] opacity-35 tracking-[0.18em]" dir="ltr">
              OVELIN MALL  ●●●●  ●●●●  ●●●●  0001
            </div>
            {/* Contactless wave */}
            <div className="flex gap-[3px] items-center opacity-35">
              {[8,12,16].map((h) => (
                <div key={h} className="rounded-full border border-white/60"
                  style={{ width: h, height: h }} />
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── Bottom decorative arc ── */}
      <div className="absolute bottom-0 left-0 right-0 h-24 opacity-10"
        style={{ background: "radial-gradient(ellipse 100% 80% at 50% 110%, #fff, transparent)" }} />

      {/* ── Corner circles ── */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full border border-white/10" />
      <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full border border-white/10" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full border border-white/[0.06]" />
    </motion.div>
  );
}

function HealthScoreCard({ score, grade }: { score: number; grade: string }) {
  const ring =
    score >= 70
      ? "from-emerald-400 to-emerald-600"
      : score >= 50
        ? "from-amber-400 to-orange-500"
        : "from-pink-400 to-pink-600";
  return (
    <div className="fancy-card rounded-3xl p-3 flex flex-col items-center text-center">
      <div className="text-[10px] font-bold text-pink-700 flex items-center gap-1">
        <Activity className="w-3 h-3" /> صحة المحفظة
      </div>
      <div className={cn("relative mt-1.5 w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br shadow-inner", ring)}>
        <div className="absolute inset-1.5 rounded-full bg-white flex flex-col items-center justify-center">
          <div className="text-2xl font-black text-pink-900">{score}</div>
          <div className="text-[9px] text-pink-700/70 -mt-0.5">/100</div>
        </div>
      </div>
      <div className="mt-1.5 text-[11px] font-extrabold text-pink-900">{grade}</div>
    </div>
  );
}

function ForecastCard({
  f,
  balance,
}: {
  f: WalletHealth["forecast"];
  balance: number;
}) {
  return (
    <div className="fancy-card rounded-3xl p-3">
      <div className="text-[10px] font-bold text-pink-700 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" /> توقّع 30 يوم
      </div>
      <div className="text-2xl font-black text-pink-900 mt-1">
        {formatSDG(f.next30)} ج.س
      </div>
      <div className="text-[10px] text-pink-700/80">
        متوسط يومي {formatSDG(f.dailyAvg)} ج.س
      </div>
      <div className="mt-2 pt-2 border-t border-pink-100 space-y-0.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-pink-700/70">آخر 30 يوم</span>
          <span className="font-bold text-pink-900">
            {formatSDG(f.spent30)} ج.س ({f.orders30} طلب)
          </span>
        </div>
        {f.burnDays !== null && f.burnDays > 0 && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-pink-700/70">الرصيد يكفي لـ</span>
            <span
              className={cn(
                "font-bold",
                f.burnDays >= 30
                  ? "text-emerald-600"
                  : f.burnDays >= 14
                    ? "text-amber-600"
                    : "text-pink-600",
              )}
            >
              {f.burnDays} يوم
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DistributionCard({ h }: { h: WalletHealth }) {
  const data = h.distribution.filter((d) => d.value > 0);
  if (!data.length) return null;
  return (
    <div className="fancy-card rounded-3xl p-4">
      <div className="font-bold text-pink-900 flex items-center gap-2 mb-2">
        <PieIcon className="w-4 h-4 text-pink-500" /> توزيع أموالي
        <span className="ml-auto text-[11px] text-pink-700/80 font-normal">
          الإجمالي {formatSDG(h.totalFunds)} ج.س
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 items-center">
        <div style={{ width: "100%", height: 130 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={32}
                outerRadius={55}
                paddingAngle={2}
              >
                {data.map((d) => (
                  <Cell key={d.key} fill={d.color} />
                ))}
              </Pie>
              <ReTooltip
                formatter={(v: any) => [`${formatSDG(Number(v))} ج.س`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5">
          {data.map((d) => {
            const pct = h.totalFunds > 0 ? (d.value / h.totalFunds) * 100 : 0;
            return (
              <div key={d.key} className="flex items-center gap-1.5 text-[10px]">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ background: d.color }}
                />
                <span className="text-pink-800 font-bold flex-1 truncate">
                  {d.label}
                </span>
                <span className="text-pink-900 tabular-nums font-extrabold">
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TxDetailModal({ tx, onClose }: { tx: any; onClose: () => void }) {
  const amt = Number(tx.amount);
  const negative = amt < 0;
  const statusColor: Record<string, string> = {
    completed: "text-emerald-600 bg-emerald-50",
    pending: "text-amber-600 bg-amber-50",
    rejected: "text-pink-600 bg-pink-50",
    cancelled: "text-zinc-500 bg-zinc-100",
  };
  const statusLabel: Record<string, string> = {
    completed: "مكتملة",
    pending: "قيد المعالجة",
    rejected: "مرفوضة",
    cancelled: "ملغاة",
  };
  return (
    <motion.div
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "p-2.5 rounded-2xl",
                negative ? "bg-pink-100 text-pink-600" : "bg-emerald-100 text-emerald-600",
              )}
            >
              {negative ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownLeft className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="font-extrabold text-pink-900">
                {TYPE_LABEL[tx.type] ?? tx.type}
              </div>
              <div className="text-[10px] text-pink-700/70">معاملة #{tx.id}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-pink-50">
            <XCircle className="w-4 h-4 text-pink-500" />
          </button>
        </div>

        <div
          className={cn(
            "mt-4 rounded-2xl p-4 text-center",
            negative
              ? "bg-gradient-to-br from-pink-50 to-pink-50"
              : "bg-gradient-to-br from-emerald-50 to-teal-50",
          )}
        >
          <div className="text-[11px] font-bold text-pink-700/70 mb-1">المبلغ</div>
          <div
            className={cn(
              "text-3xl font-black",
              negative ? "text-pink-600" : "text-emerald-600",
            )}
          >
            {negative ? "-" : "+"}{formatSDG(Math.abs(amt))} ج.س
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Row label="الحالة">
            <span
              className={cn(
                "text-[10px] font-extrabold rounded-full px-2 py-0.5",
                statusColor[tx.status] ?? "bg-zinc-100",
              )}
            >
              {statusLabel[tx.status] ?? tx.status}
            </span>
          </Row>
          {tx.method && <Row label="الطريقة">{tx.method}</Row>}
          {tx.reference && <Row label="المرجع"><code dir="ltr" className="text-[10px]">{tx.reference}</code></Row>}
          <Row label="تاريخ العملية">
            {new Date(tx.createdAt).toLocaleString("ar-EG")}
          </Row>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/support/new?subject=${encodeURIComponent("استفسار حول المعاملة #" + tx.id)}`}>
            <button className="w-full rounded-2xl py-2.5 text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200">
              فتح تذكرة دعم
            </button>
          </Link>
          <button
            onClick={onClose}
            className="w-full rounded-2xl py-2.5 text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow"
          >
            تم
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs border-b border-pink-50 pb-1.5">
      <span className="text-pink-700/70">{label}</span>
      <span className="font-bold text-pink-900">{children}</span>
    </div>
  );
}
