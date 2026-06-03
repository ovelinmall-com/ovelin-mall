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

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Wallet,
  ShoppingBag,
  Gift,
  LogOut,
  Sparkles,
  ChevronLeft,
  Lock,
  Activity,
  Crown,
  Copy,
  CheckCircle2,
  RefreshCcw,
  LifeBuoy,
  Star,
  Send,
  Shield,
  HelpCircle,
  Heart,
  Bell,
  Trophy,
  Activity as ActivityIcon,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { NotificationBell } from "@/components/NotificationBell";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { LivePill } from "@/components/LiveDot";
import {
  useGetMyDashboard,
  useGetMyActivity,
  useLogout,
  useGetPublicSettings,
  getGetMeQueryKey,
  getGetMyDashboardQueryKey,
  getGetMyActivityQueryKey,
  getGetPublicSettingsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { cn, formatSDG } from "@/lib/utils";
import { api } from "@/lib/api";

function AdminPanelButton() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await api("/api/admin/auto-login", { method: "POST" });
      setLocation("/admin");
    } catch {
      setLocation("/admin/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={handleClick}
      className="rounded-3xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-4 border border-zinc-700 shadow-xl flex items-center gap-3 cursor-pointer"
    >
      <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur text-white shrink-0">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Shield className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1">
        <div className="font-extrabold text-white text-sm">لوحة الإدارة</div>
        <div className="text-[11px] text-zinc-400">دخول حصري للمسؤول</div>
      </div>
      <ChevronLeft className="w-4 h-4 text-zinc-500 shrink-0" />
    </motion.div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار",
  processing: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
  rejected: "مرفوض",
  partial: "تنفيذ جزئي",
};

const TIER_THRESHOLDS = [
  { level: "برونزي", min: 0, color: "from-amber-400 to-orange-500", icon: "🥉" },
  { level: "فضي", min: 100, color: "from-zinc-300 to-zinc-500", icon: "🥈" },
  { level: "ذهبي", min: 500, color: "from-yellow-400 to-amber-600", icon: "🥇" },
  { level: "بلاتيني", min: 2000, color: "from-rose-400 to-pink-600", icon: "💎" },
  { level: "ماسي", min: 5000, color: "from-pink-400 via-rose-500 to-pink-600", icon: "👑" },
];

function tierFor(spent: number) {
  let cur = TIER_THRESHOLDS[0];
  let next = TIER_THRESHOLDS[1];
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (spent >= TIER_THRESHOLDS[i].min) {
      cur = TIER_THRESHOLDS[i];
      next = TIER_THRESHOLDS[i + 1] ?? TIER_THRESHOLDS[i];
    }
  }
  const progress =
    next.min === cur.min
      ? 100
      : Math.min(100, Math.round(((spent - cur.min) / (next.min - cur.min)) * 100));
  return { cur, next, progress };
}

function FloatingStars() {
  const stars = Array.from({ length: 14 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((_, i) => {
        const left = (i * 37) % 100;
        const top = (i * 53) % 100;
        const delay = (i % 7) * 0.4;
        const size = 6 + (i % 5) * 2;
        return (
          <motion.div
            key={i}
            animate={{ opacity: [0, 0.9, 0], y: [-2, -16, -28] }}
            transition={{
              duration: 4 + (i % 3),
              repeat: Infinity,
              delay,
              ease: "easeInOut",
            }}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
            }}
            className="absolute"
          >
            <Star className="w-full h-full text-white/70 fill-white/40" />
          </motion.div>
        );
      })}
    </div>
  );
}

function IdBadge({ displayId }: { displayId: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(displayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="mt-3 flex flex-col items-center gap-1">
      <div className="text-[9px] tracking-[0.3em] text-white/60 font-bold uppercase">رقم حسابك</div>
      <div className="flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 rounded-2xl px-4 py-2.5">
        <div className="text-left">
          <span className="text-[10px] text-white/60 font-bold">ID</span>
          <span className="text-white/60 mx-1 text-[10px]">:</span>
          <span className="text-white font-black text-2xl tracking-[0.18em] font-mono drop-shadow">
            {displayId}
          </span>
        </div>
        <button
          onClick={copy}
          className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center transition shrink-0"
          aria-label="نسخ الـ ID"
        >
          {copied
            ? <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            : <Copy className="w-4 h-4 text-white" />
          }
        </button>
      </div>
      {copied && (
        <div className="text-[10px] text-emerald-300 font-bold animate-pulse">✓ تم النسخ</div>
      )}
    </div>
  );
}

export default function Account() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: dashboard } = useGetMyDashboard({
    query: {
      queryKey: getGetMyDashboardQueryKey(),
      enabled: !!user,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });
  const { data: activity } = useGetMyActivity({
    query: {
      queryKey: getGetMyActivityQueryKey(),
      enabled: !!user,
      refetchInterval: 8000,
    },
  });
  const { data: publicSettings } = useGetPublicSettings({
    query: { queryKey: getGetPublicSettingsQueryKey(), staleTime: 60_000 },
  });
  const logout = useLogout();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  function doLogout() {
    setLogoutError(null);
    logout.mutate(undefined, {
      onSuccess: () => {
        qc.clear();
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setShowLogoutConfirm(false);
        setLocation("/");
      },
      onError: (err: unknown) => {
        const e = err as {
          data?: { error?: string };
          message?: string;
        };
        setLogoutError(e?.data?.error ?? e?.message ?? "تعذر تسجيل الخروج، حاول مرة أخرى");
      },
    });
  }

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  if (!user) return null;

  const wallet = dashboard?.wallet;
  const orders = dashboard?.recentOrders ?? [];
  const refStats = dashboard?.referralStats;
  const spent = Number(wallet?.totalSpent ?? 0);
  const tier = tierFor(spent);
  const isVip = spent >= 500;
  const vipPoints = Math.round(spent);

  const referralBonus = publicSettings?.referralSignupBonus ?? "0";

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${user.referralCode}`
      : `/register?ref=${user.referralCode}`;

  function copyRef() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <AppLayout>
      {/* HERO LUXURY HEADER */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-600 to-pink-700" />
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 12, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -right-20 w-72 h-72 bg-pink-300/40 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, -8, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-16 -left-12 w-56 h-56 bg-rose-300/40 rounded-full blur-3xl"
        />
        <FloatingStars />

        <div className="relative px-5 pt-7 pb-20 text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="text-[11px] opacity-80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> OVELIN VIP
            </div>
            <div className="flex items-center gap-1.5">
              <NotificationBell enabled={!!user} />
              <button
                onClick={() => {
                  setLogoutError(null);
                  setShowLogoutConfirm(true);
                }}
                className="p-2.5 rounded-2xl bg-white/15 backdrop-blur active:scale-95"
                aria-label="خروج"
                data-testid="button-open-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Big welcome with VIP avatar */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {/* Outer pink glow halo */}
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.45, 0.85, 0.45],
                }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-5 rounded-full bg-gradient-to-r from-pink-400 via-rose-400 to-pink-400 blur-2xl"
              />
              {/* Rotating pink ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-3 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, #ec4899, #f472b6, #f472b6, #f9a8d4, #ec4899)",
                  WebkitMask:
                    "radial-gradient(circle, transparent 50%, black 52%, black 60%, transparent 62%)",
                  mask: "radial-gradient(circle, transparent 50%, black 52%, black 60%, transparent 62%)",
                }}
              />
              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 30px rgba(236,72,153,0.7), 0 0 60px rgba(244,114,182,0.5)",
                    "0 0 60px rgba(236,72,153,1), 0 0 90px rgba(244,114,182,0.8)",
                    "0 0 30px rgba(236,72,153,0.7), 0 0 60px rgba(244,114,182,0.5)",
                  ],
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className={cn(
                  "relative w-24 h-24 rounded-full bg-gradient-to-br shadow-2xl flex items-center justify-center text-3xl font-black uppercase border-4 border-white/60 backdrop-blur z-10",
                  tier.cur.color,
                )}
              >
                {user.username[0]}
                {isVip && (
                  <motion.div
                    className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl drop-shadow-lg"
                  >
                    👑
                  </motion.div>
                )}
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />
              </motion.div>

              {/* Sparkly VIP counter ring */}
              <svg
                className="absolute -inset-2 w-[112px] h-[112px] -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="url(#vipGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="289"
                  initial={{ strokeDashoffset: 289 }}
                  animate={{ strokeDashoffset: 289 - (289 * tier.progress) / 100 }}
                />
                <defs>
                  <linearGradient id="vipGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="50%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#fbcfe8" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="mt-4 text-[12px] opacity-85">مرحباً بعودتك</div>
            <div className="text-3xl font-black tracking-wide drop-shadow-sm">
              {user.username}
            </div>
            {(user as any).displayId && (
              <IdBadge displayId={(user as any).displayId} />
            )}

            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-white/20 backdrop-blur text-white text-[11px] font-extrabold border border-white/30">
              <Crown className="w-3.5 h-3.5" />
              <span>عضوية {tier.cur.level}</span>
              <span>{tier.cur.icon}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 w-full max-w-[280px]">
              <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/20">
                <div className="text-[10px] opacity-80">نقاط VIP</div>
                <div className="text-lg font-black">{vipPoints}</div>
              </div>
              <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/20">
                <div className="text-[10px] opacity-80">نحو {tier.next.level}</div>
                <div className="text-lg font-black">{tier.progress}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING ACTION CHIPS */}
      <div className="px-4 -mt-12 pb-2">
        <motion.div
          className="fancy-card rounded-3xl /85 backdrop-blur-xl shadow-[0_20px_50px_-15px_rgba(236,72,153,0.45)] p-3"
        >
          <div className="grid grid-cols-4 gap-2">
            <ActionChip
              href="/lounge"
              icon={Crown}
              label="الفخامة"
              sub="نقاط/سحوبات"
              gradient="from-amber-400 to-pink-500"
            />
            <ActionChip
              href="/transfers"
              icon={Send}
              label="تحويلات"
              sub="P2P/هدايا"
              gradient="from-rose-500 to-pink-500"
            />
            <ActionChip
              href="/wallet"
              icon={Wallet}
              label="المحفظة"
              sub="شحن/سحب"
              gradient="from-pink-500 to-rose-600"
            />
            <ActionChip
              href="/orders"
              icon={ShoppingBag}
              label="طلباتي"
              sub={`${orders?.length ?? 0} طلب`}
              gradient="from-pink-500 to-pink-500"
            />
            <ActionChip
              href="/support"
              icon={LifeBuoy}
              label="الدعم"
              sub="تذاكرك"
              gradient="from-pink-500 to-pink-500"
            />
            <ActionChip
              href="/referrals"
              icon={Gift}
              label="إحالاتي"
              sub={`${refStats?.count ?? 0} • 5%`}
              gradient="from-pink-600 to-rose-600"
            />
            <ActionChip
              href="/security"
              icon={Shield}
              label="الأمان"
              sub="جلسات/PIN"
              gradient="from-rose-600 to-pink-700"
            />
            <ActionChip
              href="/help"
              icon={HelpCircle}
              label="المساعدة"
              sub="FAQ/حالة"
              gradient="from-pink-400 to-pink-500"
            />
            <ActionChip
              href="/wishlist"
              icon={Heart}
              label="المفضلة"
              sub="منتجاتي"
              gradient="from-pink-500 to-pink-600"
            />
            <ActionChip
              href="/notifications"
              icon={Bell}
              label="الإشعارات"
              sub="الجديد"
              gradient="from-pink-500 to-rose-500"
            />
            <ActionChip
              href="/gift-cards"
              icon={Gift}
              label="بطاقات الهدايا"
              sub="إرسال/استرداد"
              gradient="from-amber-400 to-pink-500"
            />
            <ActionChip
              href="/prizes"
              icon={Trophy}
              label="الجوائز"
              sub="سحوبات"
              gradient="from-amber-500 to-pink-500"
            />
            <ActionChip
              href="/status"
              icon={ActivityIcon}
              label="حالة النظام"
              sub="الخوادم"
              gradient="from-emerald-500 to-teal-500"
            />
          </div>
        </motion.div>
      </div>

      <div className="px-5 space-y-3 pb-4">
        {/* ⭐ REFERRAL — أبرز عنصر في الصفحة */}
        <motion.div
            className="relative rounded-3xl overflow-hidden shadow-[0_16px_40px_-10px_rgba(236,72,153,0.5)]"
          >
            {/* خلفية متدرجة */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-600 to-pink-700" />
            <motion.div
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 -right-10 w-40 h-40 bg-pink-300/40 rounded-full blur-2xl"
            />
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-8 -left-8 w-32 h-32 bg-rose-300/40 rounded-full blur-2xl"
            />

            <div className="relative p-5 text-white">
              {/* العنوان */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-2xl bg-white/20 backdrop-blur">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-base leading-tight">ادعُ صديقك</div>
                    <div className="text-[11px] opacity-90">
                      واربح{" "}
                      <span className="font-extrabold text-yellow-300 text-sm">
                        {Number(referralBonus).toLocaleString("ar-EG")} ج.س
                      </span>{" "}
                      لكل مُحال
                    </div>
                  </div>
                </div>
                <Link
                  href="/referrals"
                  className="text-[11px] bg-white/20 backdrop-blur rounded-full px-3 py-1.5 font-bold flex items-center gap-1"
                >
                  تفاصيل <ChevronLeft className="w-3 h-3" />
                </Link>
              </div>

              {/* إحصائيات */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/20">
                  <div className="text-[10px] opacity-80">عدد الإحالات</div>
                  <div className="text-lg font-black">{refStats?.count ?? 0}</div>
                </div>
                <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/20">
                  <div className="text-[10px] opacity-80">مكتسب</div>
                  <div className="text-lg font-black">{Number(refStats?.earned ?? 0).toLocaleString("ar-EG")} ج.س</div>
                </div>
              </div>

              {/* الرابط الكامل */}
              <div className="rounded-2xl bg-black/20 backdrop-blur px-3 py-2.5 mb-2 text-[11px] font-mono text-white/90 break-all" dir="ltr">
                {link}
              </div>

              <button
                onClick={copyRef}
                className="w-full rounded-2xl py-3 bg-white text-pink-700 font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg"
              >
                {copied ? (
                  <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-emerald-700">تم نسخ الرابط!</span></>
                ) : (
                  <><Copy className="w-4 h-4" />نسخ رابط الإحالة</>
                )}
              </button>
            </div>
          </motion.div>

        {/* Security */}
        <button
          onClick={() => setPwdOpen(true)}
          className="fancy-card w-full rounded-3xl p-4 flex items-center gap-3 active:scale-[0.99] transition"
        >
          <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-600">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1 text-right">
            <div className="font-bold text-pink-900 text-sm">الأمان</div>
            <div className="text-[11px] text-muted-foreground">
              تغيير كلمة المرور
            </div>
          </div>
          <ChevronLeft className="w-4 h-4 text-pink-400" />
        </button>

        {/* Recent orders (live) */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-pink-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-pink-500" /> آخر الطلبات
              <LivePill />
            </div>
            <Link
              href="/orders"
              className="text-xs text-pink-600 font-bold flex items-center"
            >
              الكل <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
          {(!orders || orders.length === 0) && (
            <div className="text-center py-6">
              <div className="text-xs text-muted-foreground">
                لا توجد طلبات بعد
              </div>
              <Link href="/categories">
                <button className="mt-3 rounded-xl bg-pink-50 text-pink-600 text-xs font-bold px-4 py-2">
                  ابدأ التسوق
                </button>
              </Link>
            </div>
          )}
          {orders.length > 0 && (
            <div className="space-y-2">
              {orders.slice(0, 3).map((o) => (
                <Link key={o.id} href="/orders">
                  <div className="flex items-center justify-between rounded-2xl bg-pink-50/50 p-3 active:scale-[0.99] transition">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-pink-900 truncate">
                        {o.productName}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        #{o.id} • {new Date(o.createdAt).toLocaleDateString("ar-EG")}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="text-sm font-extrabold text-pink-600">
                        {o.price} ج.س
                      </div>
                      <div className="text-[9px] font-bold text-pink-500">
                        {STATUS_LABEL[o.status] ?? o.status}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Live activity feed */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-pink-900 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-pink-500" /> سجل النشاط
              <LivePill />
            </div>
            <button
              onClick={() => {
                qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
                qc.invalidateQueries({ queryKey: getGetMyActivityQueryKey() });
              }}
              className="text-pink-600"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {(activity ?? []).slice(0, 8).map((a) => {
              const amt = Number(a.amount ?? 0);
              const negative = amt < 0;
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-2xl bg-pink-50/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-pink-900 truncate">
                      {a.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {a.description || a.kind} •{" "}
                      {new Date(a.createdAt).toLocaleString("ar-EG")}
                    </div>
                  </div>
                  {a.amount && (
                    <div
                      className={cn(
                        "shrink-0 text-[11px] font-extrabold",
                        negative ? "text-pink-600" : "text-green-600",
                      )}
                    >
                      {negative ? "-" : "+"}{formatSDG(Math.abs(amt))} ج.س
                    </div>
                  )}
                </div>
              );
            })}
            {(!activity || activity.length === 0) && (
              <div className="text-center py-4 text-xs text-muted-foreground">
                لا يوجد نشاط بعد
              </div>
            )}
          </div>
        </div>

        {/* Account meta */}
        <div className="fancy-card rounded-3xl p-4 text-[11px] text-pink-800/80 space-y-1.5">
          <div className="flex justify-between">
            <span>عضو منذ</span>
            <span className="font-bold text-pink-900">
              {new Date(user.createdAt).toLocaleDateString("ar-EG")}
            </span>
          </div>
          <div className="flex justify-between">
            <span>كود الإحالة</span>
            <span className="font-bold text-pink-900" dir="ltr">
              {user.referralCode}
            </span>
          </div>
          {user.referredBy && (
            <div className="flex justify-between">
              <span>تمت دعوتك بواسطة</span>
              <span className="font-bold text-pink-900" dir="ltr">
                {user.referredBy}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>إجمالي الأنشطة</span>
            <span className="font-bold text-pink-900">{activity?.length ?? 0}</span>
          </div>
        </div>
      </div>

      {/* زر لوحة الإدارة — يظهر فقط لصاحب الموقع */}
      {user?.email === "skandarabdoalatif@gmail.com" && (
        <AdminPanelButton />
      )}

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />

      <Dialog
        open={showLogoutConfirm}
        onOpenChange={(o) => {
          if (!logout.isPending) setShowLogoutConfirm(o);
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-w-sm rounded-3xl border-pink-200 bg-gradient-to-br from-white via-pink-50 to-rose-50"
          data-testid="dialog-logout-confirm"
        >
          <DialogHeader>
            <div className="mx-auto mb-2 inline-flex p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg">
              <LogOut className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-xl font-extrabold text-pink-900">
              تسجيل الخروج
            </DialogTitle>
            <DialogDescription className="text-center text-pink-700/80 text-sm leading-6">
              هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟
              <br />
              ستحتاج إلى إعادة تسجيل الدخول للوصول إلى حسابك مرة أخرى.
            </DialogDescription>
          </DialogHeader>

          {logoutError && (
            <div
              className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 text-center"
              data-testid="text-logout-error"
            >
              {logoutError}
            </div>
          )}

          <DialogFooter className="flex flex-row gap-2 sm:flex-row sm:justify-stretch">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              disabled={logout.isPending}
              className="flex-1 py-3 rounded-2xl bg-white border border-pink-200 text-pink-800 font-bold active:scale-95 transition disabled:opacity-50"
              data-testid="button-cancel-logout"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={doLogout}
              disabled={logout.isPending}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-l from-pink-600 to-rose-600 text-white font-bold shadow-md active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
              data-testid="button-confirm-logout"
            >
              {logout.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري الخروج...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function ActionChip({
  href,
  icon: Icon,
  label,
  sub,
  gradient,
}: {
  href: string;
  icon: typeof Wallet;
  label: string;
  sub: string;
  gradient: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="fancy-card relative rounded-2xl p-2.5 text-center hover:shadow-[0_10px_25px_-8px_rgba(236,72,153,0.5)] transition cursor-pointer"
      >
        <div
          className={cn(
            "mx-auto inline-flex p-2 rounded-xl bg-gradient-to-br text-white shadow",
            gradient,
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-[11px] font-extrabold mt-1.5 text-pink-900">
          {label}
        </div>
        <div className="text-[9.5px] text-muted-foreground truncate">{sub}</div>
      </motion.div>
    </Link>
  );
}
