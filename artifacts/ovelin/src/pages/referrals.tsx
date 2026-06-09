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
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Gift,
  Users,
  TrendingUp,
  Copy,
  CheckCircle2,
  Share2,
  Trophy,
  Sparkles,
  Wallet,
  History,
  BarChart3,
  Calendar,
  ChevronLeft,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { LivePill } from "@/components/LiveDot";
import {
  useGetMyReferrals,
  useGetReferralLeaderboard,
  useGetReferralEarnings,
  getGetMyReferralsQueryKey,
  getGetReferralLeaderboardQueryKey,
  getGetReferralEarningsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { cn, formatSDG } from "@/lib/utils";

const MONTH_LABEL_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  const idx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
  return `${MONTH_LABEL_AR[idx]} ${y}`;
}

const SHARE_TEMPLATES = [
  {
    name: "واتساب",
    color: "bg-emerald-500",
    href: (link: string) =>
      `https://wa.me/?text=${encodeURIComponent(`جرّب OVELIN MALL — أفضل متجر خدمات رقمية. سجّل عبر رابطي وابدأ:\n${link}`)}`,
  },
  {
    name: "تيليجرام",
    color: "bg-sky-500",
    href: (link: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("جرّب OVELIN MALL — أفضل متجر خدمات رقمية")}`,
  },
  {
    name: "تويتر",
    color: "bg-zinc-900",
    href: (link: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`جرّب OVELIN MALL! ${link}`)}`,
  },
  {
    name: "فيسبوك",
    color: "bg-blue-600",
    href: (link: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
  },
];

export default function ReferralsPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const { data: ref, dataUpdatedAt } = useGetMyReferrals({
    query: {
      queryKey: getGetMyReferralsQueryKey(),
      enabled: !!user,
      refetchInterval: 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  });
  const { data: earnings } = useGetReferralEarnings({
    query: {
      queryKey: getGetReferralEarningsQueryKey(),
      enabled: !!user,
      refetchInterval: 60_000,
      refetchOnMount: false,
    },
  });
  const { data: leaderboard } = useGetReferralLeaderboard({
    query: {
      queryKey: getGetReferralLeaderboardQueryKey(),
      refetchInterval: 120_000,
      refetchOnMount: false,
    },
  });

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  if (!user) return null;

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${ref?.referralCode ?? user.referralCode}`
      : `/register?ref=${user.referralCode}`;

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      navigator
        .share({ title: "OVELIN MALL", text: "انضم إلى OVELIN MALL", url: link })
        .catch(() => {});
    } else {
      copy();
    }
  }

  const monthly = earnings?.monthly ?? [];
  const maxMonthly = Math.max(0.0001, ...monthly.map((m) => Number(m.total)));
  const commPct = Number(ref?.commissionPct ?? "5") || 5;
  const signupBonusAmt = Number(ref?.signupBonusAmount ?? "0");

  return (
    <AppLayout>
      <PageHeader
        title="نظام الإحالات"
        subtitle={
          signupBonusAmt > 0
            ? `ادعُ أصدقاءك واربح ${signupBonusAmt.toLocaleString("en-US")} ج.س + عمولة ${commPct}%`
            : `ادعُ أصدقاءك واربح ${commPct}% مدى الحياة`
        }
        back="/account"
      />

      <div className="px-5 space-y-4 pb-4">
        {/* Hero card */}
        <motion.div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink-500 via-pink-600 to-rose-700 p-6 text-white shadow-[0_20px_50px_-15px_rgba(190,24,93,0.6)]"
        >
          <div className="absolute -top-10 -left-10 w-44 h-44 bg-red-600/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-8 w-40 h-40 bg-pink-300/30 rounded-full blur-3xl" />

          {/* Commission + bonus badges */}
          <div className="relative flex flex-wrap items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 rounded-full bg-white/20 border border-white/30 px-3 py-1 text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5" />
              عمولة {commPct}% لكل طلب
            </div>
            {signupBonusAmt > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-yellow-400/25 border border-yellow-300/40 px-3 py-1 text-xs font-extrabold text-yellow-100">
                🎁 مكافأة التسجيل {signupBonusAmt.toLocaleString("en-US")} ج.س
              </div>
            )}
          </div>
          <h2 className="relative text-2xl font-black leading-tight">
            كود الإحالة الخاص بك
          </h2>

          <div className="relative mt-4 rounded-2xl bg-white/20 backdrop-blur px-4 py-3 flex items-center justify-between">
            <code className="text-xl font-extrabold tracking-widest">
              {ref?.referralCode ?? user.referralCode}
            </code>
            <button
              onClick={copy}
              className="rounded-xl bg-white text-pink-600 text-xs font-bold px-3 py-1.5 flex items-center gap-1 active:scale-95"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "تم" : "نسخ"}
            </button>
          </div>

          <div className="relative mt-3 rounded-2xl bg-white/15 backdrop-blur px-3 py-2.5">
            <div className="text-[10px] opacity-80">رابط الدعوة</div>
            <div className="text-xs font-bold truncate" dir="ltr">
              {link}
            </div>
          </div>

          <button
            onClick={copy}
            className="relative mt-4 w-full rounded-2xl bg-white text-pink-600 font-bold py-3 active:scale-95 flex items-center justify-center gap-2 shadow-md"
          >
            <Copy className="w-4 h-4" /> {copied ? "✓ تم نسخ رابط الدعوة!" : "نسخ رابط الدعوة"}
          </button>

          {/* Quick share */}
          <div className="relative mt-3 grid grid-cols-4 gap-2">
            {SHARE_TEMPLATES.map((s) => (
              <a
                key={s.name}
                href={s.href(link)}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "rounded-2xl text-center text-[11px] font-bold text-white py-2.5 active:scale-95 shadow",
                  s.color,
                )}
              >
                {s.name}
              </a>
            ))}
          </div>
        </motion.div>

        {/* Earnings live KPIs */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-extrabold text-pink-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-pink-500" /> أرباحي
              <LivePill />
            </div>
            <div className="text-[10px] text-muted-foreground">
              {new Date(dataUpdatedAt || Date.now()).toLocaleTimeString("ar-EG")}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 p-3 text-center">
              <div className="text-[10px] text-pink-700">هذا الشهر</div>
              <div className="text-base font-black text-pink-900 mt-0.5">
                {formatSDG(earnings?.thisMonth ?? 0)} <span className="text-[10px]">ج.س</span>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 p-3 text-center">
              <div className="text-[10px] text-rose-700">الشهر الماضي</div>
              <div className="text-base font-black text-rose-900 mt-0.5">
                {formatSDG(earnings?.lastMonth ?? 0)} <span className="text-[10px]">ج.س</span>
              </div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 p-3 text-center">
              <div className="text-[10px] text-pink-700">إجمالي</div>
              <div className="text-base font-black text-pink-900 mt-0.5">
                {formatSDG(earnings?.allTime ?? ref?.totalEarned ?? 0)} <span className="text-[10px]">ج.س</span>
              </div>
            </div>
          </div>

          {monthly.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] mb-2">
                <span className="text-pink-800/80 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> آخر {monthly.length} أشهر
                </span>
              </div>
              <div className="flex items-end gap-1.5 h-24">
                {monthly.map((m) => {
                  const v = Number(m.total);
                  const h = Math.max(4, Math.round((v / maxMonthly) * 88));
                  return (
                    <div
                      key={m.month}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: h }}
                        className="w-full rounded-t-lg bg-gradient-to-t from-pink-500 to-rose-400"
                        title={`$${v.toFixed(2)}`}
                      />
                      <div className="text-[9px] text-muted-foreground truncate w-full text-center" title={formatMonth(m.month)}>
                        {m.month.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowWithdraw((v) => !v)}
            className="mt-4 w-full rounded-2xl py-2.5 text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow active:scale-95 flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            {showWithdraw ? "إخفاء نموذج السحب" : "سحب الأرباح إلى محفظتي"}
            <ChevronLeft className={cn("w-3.5 h-3.5 transition", showWithdraw && "rotate-90")} />
          </button>

          {showWithdraw && <ReferralWithdrawForm />}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="fancy-card rounded-3xl p-4">
            <div className="inline-flex p-2 rounded-xl bg-pink-100 text-pink-600">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black text-pink-900 mt-2">
              {ref?.totalReferrals ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              إجمالي الإحالات
            </div>
          </div>
          <div className="fancy-card rounded-3xl p-4">
            <div className="inline-flex p-2 rounded-xl bg-rose-100 text-rose-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-rose-700 mt-2">
              {formatSDG(ref?.totalEarned ?? 0)} <span className="text-sm">ج.س</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              إجمالي الأرباح
            </div>
          </div>
        </div>

        {/* Live commissions feed */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-pink-500" /> آخر العمولات
            <LivePill />
          </div>
          {(!earnings || earnings.recent.length === 0) && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              لم تربح أي عمولة بعد. شارك رابطك لتبدأ الربح فوراً!
            </div>
          )}
          <div className="space-y-2">
            {earnings?.recent.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-2xl bg-gradient-to-l from-pink-50/70 to-transparent p-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 text-white font-black uppercase flex items-center justify-center text-sm shrink-0">
                    {c.fromUsername[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-pink-900 truncate">
                      عمولة من {c.fromUsername}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString("ar-EG")}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-extrabold text-green-600 shrink-0">
                  +{formatSDG(c.amount)} ج.س
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My referrals */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4 text-pink-500" /> أصدقائي
          </div>
          {(!ref?.referrals || ref.referrals.length === 0) && (
            <div className="text-center py-6 text-xs text-muted-foreground">
              لم يسجل أي صديق بعد. شارك رابطك الآن!
            </div>
          )}
          {ref?.referrals?.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl bg-pink-50/40 p-3 mb-2 last:mb-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 text-white font-black uppercase flex items-center justify-center text-sm">
                  {r.username[0]}
                </div>
                <div>
                  <div className="text-xs font-bold text-pink-900">
                    {r.username}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    انضم {new Date(r.joinedAt).toLocaleDateString("ar-EG")}
                  </div>
                </div>
              </div>
              <div className="text-sm font-extrabold text-green-600">
                +{Number(r.earned).toLocaleString("en-US")} ج.س
              </div>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> أفضل المُحيلين
            <LivePill />
          </div>
          {(!leaderboard || leaderboard.length === 0) && (
            <div className="text-center py-4 text-xs text-muted-foreground">
              كن أول من يدخل قائمة الشرف
            </div>
          )}
          {leaderboard?.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-2xl p-3 mb-2 last:mb-0 bg-gradient-to-l from-pink-50 to-transparent"
            >
              <div className="flex items-center gap-3">
                <div
                  className={
                    i === 0
                      ? "w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white text-sm font-black flex items-center justify-center"
                      : i === 1
                        ? "w-8 h-8 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 text-white text-sm font-black flex items-center justify-center"
                        : i === 2
                          ? "w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 text-white text-sm font-black flex items-center justify-center"
                          : "w-8 h-8 rounded-xl bg-pink-100 text-pink-600 text-sm font-black flex items-center justify-center"
                  }
                >
                  {i + 1}
                </div>
                <div className="text-xs font-bold text-pink-900">
                  {row.username}
                </div>
              </div>
              <div className="text-xs flex items-center gap-2">
                <span className="font-extrabold text-pink-700">{row.count}</span>
                <span className="text-muted-foreground">إحالة •</span>
                <span className="font-extrabold text-green-600">{row.earned} ج.س</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function ReferralWithdrawForm() {
  const [, setLocation] = useLocation();
  return (
    <div className="mt-3 rounded-2xl border border-pink-200 bg-pink-50/40 p-3 text-xs text-pink-800">
      أرباح الإحالة تُضاف فوراً إلى رصيد محفظتك ويمكنك سحبها أو استخدامها لشراء أي خدمة.
      <button
        onClick={() => setLocation("/wallet")}
        className="mt-3 w-full rounded-2xl py-2.5 font-bold bg-white text-pink-700 border border-pink-200 active:scale-95"
      >
        افتح المحفظة لتقديم طلب سحب
      </button>
    </div>
  );
}
