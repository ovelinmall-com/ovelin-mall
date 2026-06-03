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

import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  LifeBuoy,
  Plus,
  ChevronLeft,
  MessageCircle,
  Sparkles,
  Clock3,
  CheckCircle2,
  Lock,
  Search,
  AlertTriangle,
  Inbox,
  Bell,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListMySupportTickets,
  getListMySupportTicketsQueryKey,
} from "@workspace/api-client-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  open: "مفتوحة",
  waiting_user: "بانتظار ردك",
  resolved: "تم الحل",
  closed: "مغلقة",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  waiting_user: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-zinc-100 text-zinc-600",
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700",
  normal: "bg-pink-100 text-pink-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-pink-200 text-pink-800",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "open", label: "مفتوحة" },
  { id: "waiting_user", label: "بانتظارك" },
  { id: "resolved", label: "محلولة" },
  { id: "closed", label: "مغلقة" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

type Counts = {
  count: number;
  openCount: number;
  waitingUserCount: number;
  urgentCount: number;
  resolvedCount: number;
  totalCount: number;
};

export default function SupportListPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  const { data: tickets } = useListMySupportTickets({
    query: {
      queryKey: getListMySupportTicketsQueryKey(),
      enabled: !!user,
      refetchInterval: 8000,
      refetchOnWindowFocus: true,
    },
  });

  const counts = useQuery<Counts>({
    queryKey: ["support-unread"],
    queryFn: () => api<Counts>("/api/support/unread-count"),
    enabled: !!user,
    refetchInterval: 8000,
    placeholderData: (p) => p,
  });

  const filtered = useMemo(() => {
    let arr = tickets ?? [];
    if (filter !== "all") arr = arr.filter((t) => t.status === filter);
    const q = search.trim();
    if (q) {
      arr = arr.filter(
        (t) =>
          t.subject.includes(q) ||
          (t.id + "").includes(q) ||
          (t.category ?? "").includes(q),
      );
    }
    return arr;
  }, [tickets, filter, search]);

  if (!user) return null;

  const c = counts.data;

  return (
    <AppLayout>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-600 to-pink-600" />
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-pink-300/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-300/30 rounded-full blur-3xl" />
        <div className="relative px-5 pt-7 pb-10 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-white/20 backdrop-blur">
                <LifeBuoy className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs opacity-80">مركز الدعم الفني</div>
                <div className="text-xl font-extrabold">تذاكر المساعدة</div>
              </div>
            </div>
            <Link href="/support/new">
              <button className="rounded-2xl bg-white text-pink-600 px-3 py-2.5 text-xs font-extrabold shadow-md flex items-center gap-1 active:scale-95">
                <Plus className="w-4 h-4" /> جديدة
              </button>
            </Link>
          </div>

          {/* counters strip */}
          {c && c.totalCount > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              <CounterPill icon={Inbox} label="الكل" value={c.totalCount} />
              <CounterPill icon={MessageCircle} label="مفتوحة" value={c.openCount} />
              <CounterPill icon={Bell} label="رسائل" value={c.count} accent={c.count > 0} />
              <CounterPill icon={AlertTriangle} label="عاجلة" value={c.urgentCount} accent={c.urgentCount > 0} />
            </div>
          )}

          {!c?.totalCount && (
            <div className="mt-4 rounded-2xl bg-white/15 backdrop-blur p-3 text-[12px] flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="opacity-90">
                فريق OVELIN يرد خلال دقائق غالباً. أنشئ تذكرة جديدة لأي استفسار أو مشكلة.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 -mt-5 pb-4 space-y-3">
        {/* Search + Filters */}
        <div className="fancy-card rounded-3xl p-3 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-pink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم التذكرة أو الموضوع..."
              className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              const badgeNum =
                f.id === "open"
                  ? c?.openCount
                  : f.id === "waiting_user"
                    ? c?.waitingUserCount
                    : f.id === "resolved"
                      ? c?.resolvedCount
                      : f.id === "all"
                        ? c?.totalCount
                        : undefined;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-bold transition border flex items-center gap-1.5",
                    active
                      ? "bg-pink-600 text-white border-transparent shadow"
                      : "bg-white border-pink-200 text-pink-700",
                  )}
                >
                  {f.label}
                  {!!badgeNum && badgeNum > 0 && (
                    <span
                      className={cn(
                        "rounded-full text-[9px] px-1.5 py-0.5 font-extrabold",
                        active ? "bg-white text-pink-700" : "bg-pink-100 text-pink-700",
                      )}
                    >
                      {badgeNum}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {(!filtered || filtered.length === 0) && (
          <div className="fancy-card rounded-3xl p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 mb-3">
              <MessageCircle className="w-8 h-8" />
            </div>
            <div className="font-bold text-pink-900">
              {tickets?.length === 0
                ? "لا توجد تذاكر بعد"
                : "لا توجد نتائج تطابق الفلتر"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {tickets?.length === 0
                ? "ابدأ محادثة مع فريق الدعم في أي وقت"
                : "جرّب تغيير الفلتر أو مسح كلمة البحث"}
            </div>
            {tickets?.length === 0 && (
              <Link href="/support/new">
                <button className="mt-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white px-5 py-2.5 text-sm font-bold shadow-md">
                  <Plus className="w-4 h-4 inline-block ml-1" /> فتح تذكرة جديدة
                </button>
              </Link>
            )}
          </div>
        )}

        {filtered.map((t, i) => (
          <Link key={t.id} href={`/support/${t.id}`}>
            <motion.div
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              className="fancy-card rounded-3xl p-4 active:scale-[0.99] transition cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-pink-900 truncate">{t.subject}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <Clock3 className="w-3 h-3" />
                    {new Date(t.updatedAt).toLocaleString("ar-EG")}
                    <span>•</span>
                    <span>#{t.id}</span>
                    {t.category && (
                      <>
                        <span>•</span>
                        <span className="rounded-md bg-pink-50 text-pink-700 px-1.5 py-0.5 text-[9px] font-bold">
                          {t.category}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-pink-400 mt-1 shrink-0" />
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <span
                  className={cn(
                    "text-[10px] font-extrabold rounded-full px-2 py-0.5 inline-flex items-center gap-1",
                    STATUS_COLOR[t.status] ?? "bg-zinc-100 text-zinc-600",
                  )}
                >
                  {t.status === "resolved" ? <CheckCircle2 className="w-3 h-3" /> : null}
                  {t.status === "closed" ? <Lock className="w-3 h-3" /> : null}
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-extrabold rounded-full px-2 py-0.5",
                    PRIORITY_COLOR[t.priority] ?? "bg-zinc-100 text-zinc-700",
                  )}
                >
                  {PRIORITY_LABEL[t.priority] ?? t.priority}
                </span>
                {(t as any).aiSentiment === "urgent" && (
                  <span className="text-[10px] font-extrabold rounded-full px-2 py-0.5 bg-pink-100 text-pink-700">
                    🚨 عاجلة
                  </span>
                )}
                {t.unreadForUser > 0 && (
                  <span className="text-[10px] font-extrabold rounded-full px-2 py-0.5 bg-pink-500 text-white animate-pulse ml-auto">
                    {t.unreadForUser} رسالة جديدة
                  </span>
                )}
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}

function CounterPill({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: any;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-2 backdrop-blur text-center",
        accent ? "bg-pink-500/40 ring-2 ring-white/40" : "bg-white/15",
      )}
    >
      <Icon className="w-3.5 h-3.5 mx-auto mb-0.5 opacity-90" />
      <div className="text-base font-extrabold tabular-nums">{value}</div>
      <div className="text-[9px] opacity-85">{label}</div>
    </div>
  );
}
