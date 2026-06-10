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
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Sparkles,
  Trophy,
  Gift,
  Plane,
  Award,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap,
  Lock,
  Check,
  ChevronLeft,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import { cn } from "@/lib/utils";

type Loyalty = {
  points: number;
  history: Array<{
    id: number;
    points: number;
    reason: string;
    createdAt: string;
  }>;
};

type Achievement = {
  id: number;
  code: string;
  title: string;
  description: string;
  icon: string;
  rewardPoints: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

type PrizeDraw = {
  id: number;
  title: string;
  description: string;
  prizeName: string;
  prizeImage: string;
  prizeValue: string;
  ticketsPerSpend: string;
  endsAt: string;
  bgColor: string;
  totalTickets: number;
  myTickets: number;
};

type LeaderboardEntry = {
  id: number;
  username: string;
  totalSpent: string;
  loyaltyPoints: number;
};

type Leaderboard = {
  top: LeaderboardEntry[];
  myRank: number;
  totalUsers: number;
  percentile: number;
};

type PrimeStatus = {
  active: boolean;
  primeUntil: string | null;
  monthlyPrice: string;
};

type MonthlyGoalData = {
  goal: { targetSpend: string; achievedSpend: string; rewardPoints: number } | null;
  progress: number;
  achieved: boolean;
};

type TravelDest = {
  id: number;
  name: string;
  country: string;
  imageUrl: string;
  description: string;
  pricePoints: number;
  active: boolean;
};

const TABS = [
  { id: "rewards", label: "المكافآت", icon: Sparkles },
  { id: "draws", label: "السحوبات", icon: Gift },
  { id: "achievements", label: "الإنجازات", icon: Award },
  { id: "leaderboard", label: "الترتيب", icon: Trophy },
  { id: "travel", label: "السفر", icon: Plane },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function LoungePage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("rewards");

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  const loyalty = useQuery<Loyalty>({
    queryKey: ["loyalty"],
    queryFn: () => api("/api/loyalty"),
    enabled: !!user,
    refetchInterval: 60_000,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
  });
  const achievements = useQuery<Achievement[]>({
    queryKey: ["achievements"],
    queryFn: () => api("/api/achievements"),
    enabled: !!user,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
  });
  const draws = useQuery<PrizeDraw[]>({
    queryKey: ["prize-draws"],
    queryFn: () => api("/api/prize-draws"),
    enabled: !!user,
    refetchInterval: 60_000,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
  });
  const prime = useQuery<PrimeStatus>({
    queryKey: ["prime"],
    queryFn: () => api("/api/prime/status"),
    enabled: !!user,
    placeholderData: (prev) => prev,
  });
  const leaderboard = useQuery<Leaderboard>({
    queryKey: ["leaderboard"],
    queryFn: () => api("/api/leaderboard"),
    enabled: !!user && tab === "leaderboard",
    placeholderData: (prev) => prev,
  });
  const monthlyGoal = useQuery<MonthlyGoalData>({
    queryKey: ["monthly-goal"],
    queryFn: () => api("/api/monthly-goal"),
    enabled: !!user,
    placeholderData: (prev) => prev,
  });
  const travel = useQuery<TravelDest[]>({
    queryKey: ["travel"],
    queryFn: () => api("/api/travel/destinations"),
    enabled: !!user && tab === "travel",
    placeholderData: (prev) => prev,
  });

  const subscribePrime = useMutation({
    mutationFn: () =>
      api("/api/prime/subscribe", { method: "POST", body: "{}" }),
    onSuccess: () => {
      toast({
        type: "celebrate",
        title: "🎉 مرحباً بك في OVELIN MALL!",
        message: "اشتراكك مفعّل لمدة شهر كامل.",
      });
      qc.invalidateQueries({ queryKey: ["prime"] });
    },
    onError: (e: Error) =>
      toast({ type: "error", title: "فشل الاشتراك", message: e.message }),
  });

  const setGoal = useMutation({
    mutationFn: (target: number) =>
      api("/api/monthly-goal", {
        method: "POST",
        body: JSON.stringify({ targetSpend: target.toFixed(2) }),
      }),
    onSuccess: () => {
      toast({ type: "success", title: "تم تحديث هدفك الشهري" });
      qc.invalidateQueries({ queryKey: ["monthly-goal"] });
    },
  });

  if (!user) return null;

  return (
    <AppLayout>
      <div className="relative">
        {/* Hero header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-700 via-pink-600 to-pink-600 text-white px-5 pt-4 pb-20">
          <div className="absolute -top-16 -right-12 w-56 h-56 bg-red-600/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-12 w-72 h-72 bg-amber-300/20 rounded-full blur-3xl" />

          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setLocation("/account")}
              className="p-2 rounded-2xl bg-white/15 backdrop-blur active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="text-[10px] opacity-80 tracking-widest">
                OVELIN MALL
              </div>
              <div className="text-base font-black flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-300" />
                صالة الفخامة
              </div>
            </div>
            <div className="w-9" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs opacity-90">رصيد ولائك</div>
              <div className="text-3xl font-black flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-300" />
                {loyalty.data?.points?.toLocaleString("ar-EG") ?? "0"}
              </div>
              <div className="text-[10px] opacity-80 mt-0.5">
                نقطة • تُكسب من كل طلب
              </div>
            </div>

            {prime.data?.active ? (
              <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 px-3 py-2 text-amber-950 shadow-lg">
                <div className="text-[10px] font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3" /> PRIME
                </div>
                <div className="text-[10px] font-bold opacity-80">
                  حتى{" "}
                  {prime.data.primeUntil &&
                    new Date(prime.data.primeUntil).toLocaleDateString("ar-EG")}
                </div>
              </div>
            ) : (
              <button
                onClick={() => subscribePrime.mutate()}
                disabled={subscribePrime.isPending}
                className="rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 px-3 py-2 text-xs font-extrabold shadow-lg active:scale-95"
              >
                <Crown className="w-3.5 h-3.5 inline mr-1" />
                اشترك PRIME ${prime.data?.monthlyPrice ?? "9.99"}
              </button>
            )}
          </div>
        </div>

        {/* Tabs floating over header */}
        <div className="px-3 -mt-12 relative z-10">
          <div className="fancy-card flex gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-2xl /95 backdrop-blur shadow-[0_15px_40px_-10px_rgba(190,24,93,0.4)]">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "shrink-0 flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-bold transition",
                    active
                      ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow"
                      : "text-pink-700 hover:bg-pink-50",
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-4 pt-4 pb-6 space-y-3">
          <AnimatePresence mode="wait">
            {tab === "rewards" && (
              <motion.div
                key="rewards"
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {/* Monthly goal */}
                <MonthlyGoalCard
                  data={monthlyGoal.data}
                  onSet={(t) => setGoal.mutate(t)}
                  isPending={setGoal.isPending}
                />

                {/* Loyalty history */}
                <div className="fancy-card rounded-3xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-pink-900 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-pink-500" />
                      حركة النقاط
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      آخر {loyalty.data?.history?.length ?? 0}
                    </div>
                  </div>
                  {(!loyalty.data?.history ||
                    loyalty.data.history.length === 0) && (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      لا توجد حركات بعد. اطلب أي خدمة لتبدأ بكسب النقاط!
                    </div>
                  )}
                  <div className="space-y-2">
                    {loyalty.data?.history?.slice(0, 12).map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between rounded-2xl bg-pink-50/40 p-2.5"
                      >
                        <div className="text-xs">
                          <div className="font-bold text-pink-900">
                            {h.reason}
                          </div>
                          <div className="text-[10px] text-pink-700/70">
                            {new Date(h.createdAt).toLocaleString("ar-EG")}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "text-sm font-extrabold",
                            h.points > 0 ? "text-emerald-600" : "text-pink-600",
                          )}
                        >
                          {h.points > 0 ? "+" : ""}
                          {h.points}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prime perks */}
                {!prime.data?.active && (
                  <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-pink-50 to-rose-50 border border-amber-200 p-4">
                    <div className="font-extrabold text-amber-800 flex items-center gap-1.5">
                      <Crown className="w-4 h-4" />
                      OVELIN MALL — مزايا حصرية
                    </div>
                    <ul className="mt-2 text-xs text-pink-900 space-y-1.5">
                      <li className="flex gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        نقاط ولاء مضاعفة (×2) على كل طلب
                      </li>
                      <li className="flex gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        أولوية في الدعم الفني (رد خلال دقائق)
                      </li>
                      <li className="flex gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        تذاكر سحوبات إضافية لرحلات دبي والجوائز
                      </li>
                      <li className="flex gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        شارة ذهبية مميزة في كل مكان
                      </li>
                    </ul>
                    <button
                      onClick={() => subscribePrime.mutate()}
                      disabled={subscribePrime.isPending}
                      className="mt-3 w-full rounded-2xl py-2.5 font-bold bg-gradient-to-r from-amber-400 to-amber-600 text-amber-950 shadow active:scale-95"
                    >
                      {subscribePrime.isPending
                        ? "جارٍ التفعيل..."
                        : `فعّل PRIME الآن $${prime.data?.monthlyPrice ?? "9.99"}/شهر`}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {tab === "draws" && (
              <motion.div
                key="draws"
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                <div className="rounded-2xl bg-pink-50/60 border border-pink-200 p-3 text-xs text-pink-800">
                  💎 كل 100 ج.س من المشتريات = تذكرة سحب واحدة. أعضاء PRIME
                  يحصلون على ضعف التذاكر!
                </div>
                {draws.data?.map((d) => (
                  <PrizeDrawCard key={d.id} draw={d} />
                ))}
                {!draws.data?.length && (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    لا توجد سحوبات نشطة حالياً
                  </div>
                )}
              </motion.div>
            )}

            {tab === "achievements" && (
              <motion.div
                key="ach"
                exit={{ opacity: 0, y: -8 }}
                className="grid grid-cols-2 gap-3"
              >
                {achievements.data?.map((a) => (
                  <AchievementCard key={a.id} a={a} />
                ))}
              </motion.div>
            )}

            {tab === "leaderboard" && (
              <motion.div
                key="lead"
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                {leaderboard.data && (
                  <div className="rounded-3xl bg-gradient-to-br from-pink-500 via-rose-600 to-pink-700 text-white p-4 shadow-lg">
                    <div className="text-xs opacity-90">ترتيبك</div>
                    <div className="text-3xl font-black flex items-center gap-2">
                      #{leaderboard.data.myRank}
                      <span className="text-[10px] opacity-80 font-medium">
                        من {leaderboard.data.totalUsers}
                      </span>
                    </div>
                    <div className="text-[10px] opacity-90 mt-1">
                      أنت ضمن أعلى {leaderboard.data.percentile}% 🔥
                    </div>
                  </div>
                )}
                <div className="fancy-card rounded-3xl p-3">
                  <div className="font-bold text-pink-900 flex items-center gap-1.5 mb-3 px-1">
                    <Users className="w-4 h-4 text-pink-500" />
                    أعلى المتسوقين
                  </div>
                  <div className="space-y-2">
                    {leaderboard.data?.top?.map((e, i) => {
                      const isMe = e.id === user.id;
                      const medals = ["🥇", "🥈", "🥉"];
                      return (
                        <div
                          key={e.id}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl p-2.5 border",
                            isMe
                              ? "bg-pink-100/70 border-pink-300"
                              : "bg-pink-50/30 border-transparent",
                          )}
                        >
                          <div className="w-8 text-center font-extrabold">
                            {i < 3 ? (
                              <span className="text-xl">{medals[i]}</span>
                            ) : (
                              <span className="text-pink-700 text-xs">
                                #{i + 1}
                              </span>
                            )}
                          </div>
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-rose-600 flex items-center justify-center text-white text-sm font-black uppercase">
                            {e.username[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-pink-900 truncate">
                              {e.username}
                              {isMe && (
                                <span className="text-[9px] text-pink-600 mr-1">
                                  (أنت)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-pink-700/70">
                              {e.loyaltyPoints} نقطة
                            </div>
                          </div>
                          <div className="text-xs font-extrabold text-pink-700">
                            ${Number(e.totalSpent).toFixed(0)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {tab === "travel" && (
              <motion.div
                key="travel"
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3"
              >
                <div className="rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-pink-200 p-3 text-xs text-pink-800">
                  🌍 استبدل نقاط الولاء برحلات سياحية فاخرة!
                </div>
                {travel.data?.map((d) => (
                  <TravelCard
                    key={d.id}
                    d={d}
                    points={loyalty.data?.points ?? 0}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
}

function MonthlyGoalCard({
  data,
  onSet,
  isPending,
}: {
  data?: MonthlyGoalData;
  onSet: (target: number) => void;
  isPending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("100");
  return (
    <div className="fancy-card rounded-3xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-pink-900 flex items-center gap-1.5">
          <Target className="w-4 h-4 text-pink-500" />
          هدفي الشهري
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-[10px] text-pink-600 font-bold"
        >
          {editing ? "إلغاء" : data?.goal ? "تعديل" : "إضافة"}
        </button>
      </div>
      {editing ? (
        <div className="flex gap-2">
          <input
            type="number"
            min="10"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="flex-1 rounded-2xl border border-pink-200 bg-pink-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            placeholder="100"
          />
          <button
            onClick={() => {
              const n = Number(val);
              if (n >= 10) {
                onSet(n);
                setEditing(false);
              }
            }}
            disabled={isPending}
            className="rounded-2xl px-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-bold disabled:opacity-60"
          >
            حفظ
          </button>
        </div>
      ) : data?.goal ? (
        <>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-pink-900">
              ${Number(data.goal.achievedSpend).toFixed(0)}
              <span className="text-sm text-pink-500 font-bold">
                /${Number(data.goal.targetSpend).toFixed(0)}
              </span>
            </div>
            {data.achieved && (
              <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-xl">
                ✨ تم!
              </span>
            )}
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-pink-50 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.progress}%` }}
              className="h-full bg-gradient-to-r from-pink-500 to-rose-600 rounded-full"
            />
          </div>
          <div className="text-[10px] text-pink-700/80 mt-1.5">
            عند التحقيق: +{data.goal.rewardPoints} نقطة ولاء 🎁
          </div>
        </>
      ) : (
        <div className="text-xs text-pink-700/80">
          ضع هدف إنفاق شهري واحصل على نقاط ولاء إضافية عند تحقيقه!
        </div>
      )}
    </div>
  );
}

function PrizeDrawCard({ draw }: { draw: PrizeDraw }) {
  const endsIn = Math.max(
    0,
    Math.floor(
      (new Date(draw.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    ),
  );
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={cn(
        "relative overflow-hidden rounded-3xl text-white shadow-lg bg-gradient-to-br",
        draw.bgColor,
      )}
    >
      <img
        src={draw.prizeImage}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="relative p-4">
        <div className="flex items-center gap-1 text-[10px] font-bold opacity-90">
          <Zap className="w-3 h-3" /> سحب نشط
        </div>
        <div className="text-base font-black mt-1">{draw.prizeName}</div>
        <div className="text-[11px] opacity-90 mt-1">{draw.description}</div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-xl bg-white/20 backdrop-blur p-2 text-center">
            <div className="text-[9px] opacity-80">قيمة الجائزة</div>
            <div className="font-black text-sm">{draw.prizeValue} ج.س</div>
          </div>
          <div className="rounded-xl bg-white/20 backdrop-blur p-2 text-center">
            <div className="text-[9px] opacity-80">تذاكرك</div>
            <div className="font-black text-sm">{draw.myTickets}</div>
          </div>
          <div className="rounded-xl bg-white/20 backdrop-blur p-2 text-center">
            <div className="text-[9px] opacity-80">باقي</div>
            <div className="font-black text-sm">{endsIn} يوم</div>
          </div>
        </div>

        {draw.totalTickets > 0 && (
          <div className="text-[9px] opacity-80 mt-2 text-center">
            إجمالي التذاكر في السحب: {draw.totalTickets} • فرصتك:{" "}
            {((draw.myTickets / draw.totalTickets) * 100).toFixed(2)}%
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AchievementCard({ a }: { a: Achievement }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        "relative rounded-3xl border p-3 text-center transition",
        a.unlocked
          ? "bg-gradient-to-br from-amber-50 to-pink-50 border-amber-300 shadow-md"
          : "bg-pink-50/30 border-pink-100 grayscale",
      )}
    >
      {!a.unlocked && (
        <Lock className="absolute top-2 right-2 w-3 h-3 text-pink-400" />
      )}
      {a.unlocked && (
        <Star className="absolute top-2 right-2 w-3 h-3 text-amber-500 fill-amber-500" />
      )}
      <div className="text-3xl mb-1">{a.icon}</div>
      <div className="font-bold text-xs text-pink-900">{a.title}</div>
      <div className="text-[9px] text-pink-700/80 mt-0.5 line-clamp-2 min-h-[24px]">
        {a.description}
      </div>
      <div className="mt-2 text-[10px] font-extrabold text-amber-600 bg-amber-100/60 rounded-lg py-0.5">
        +{a.rewardPoints} نقطة
      </div>
    </motion.div>
  );
}

function TravelCard({ d, points }: { d: TravelDest; points: number }) {
  const canRedeem = points >= d.pricePoints;
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="fancy-card rounded-3xl overflow-hidden"
    >
      <div className="relative h-32">
        <img
          src={d.imageUrl}
          alt={d.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 text-white">
          <div className="text-base font-black">{d.name}</div>
          <div className="text-[10px] opacity-90">{d.country}</div>
        </div>
      </div>
      <div className="p-3">
        <div className="text-[11px] text-pink-700">{d.description}</div>
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm font-extrabold text-pink-900">
            {d.pricePoints.toLocaleString("ar-EG")}{" "}
            <span className="text-[10px] text-pink-500 font-bold">نقطة</span>
          </div>
          <button
            disabled={!canRedeem}
            className={cn(
              "text-xs font-bold px-3 py-1.5 rounded-xl transition",
              canRedeem
                ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white"
                : "bg-pink-50 text-pink-400 border border-pink-200",
            )}
          >
            {canRedeem ? "استبدل الآن" : "نقاط غير كافية"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
