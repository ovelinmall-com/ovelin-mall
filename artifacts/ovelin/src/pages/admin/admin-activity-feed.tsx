import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Wallet, UserPlus, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

async function adminFetch<T = any>(path: string): Promise<T> {
  const r = await fetch(`${ADMIN_BASE}/api/admin${path}`, { credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return "الآن";
    const m = Math.floor(s / 60);
    if (m < 60) return `منذ ${m}د`;
    const h = Math.floor(m / 60);
    if (h < 24) return `منذ ${h}س`;
    const d = Math.floor(h / 24);
    return `منذ ${d} يوم`;
  } catch { return ""; }
}

function fmtAmount(v: string | number) {
  const n = Number(v);
  if (!n) return null;
  return `${n.toLocaleString()} ج.س`;
}

type FeedItem = {
  id: number;
  feedType: string;
  username: string | null;
  label: string;
  amount: string;
  status: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: "معلق",   color: "bg-amber-100 text-amber-700" },
  processing: { label: "جارٍ",   color: "bg-blue-100 text-blue-700" },
  delivered:  { label: "مكتمل", color: "bg-green-100 text-green-700" },
  completed:  { label: "مكتمل", color: "bg-green-100 text-green-700" },
  cancelled:  { label: "ملغي",  color: "bg-red-100 text-red-700" },
  rejected:   { label: "مرفوض", color: "bg-red-100 text-red-700" },
  done:       { label: "تم",    color: "bg-green-100 text-green-700" },
};

const TYPE_CONFIG: Record<string, { icon: any; bg: string; iconColor: string; title: string }> = {
  order:    { icon: ShoppingBag, bg: "bg-purple-50",  iconColor: "text-purple-600", title: "طلب جديد" },
  deposit:  { icon: Wallet,      bg: "bg-emerald-50", iconColor: "text-emerald-600", title: "إيداع" },
  new_user: { icon: UserPlus,    bg: "bg-blue-50",    iconColor: "text-blue-600",   title: "مستخدم جديد" },
};

function FeedCard({ item }: { item: FeedItem }) {
  const cfg = TYPE_CONFIG[item.feedType] ?? TYPE_CONFIG["order"]!;
  const Icon = cfg.icon;
  const statusInfo = STATUS_LABELS[item.status];
  const amt = fmtAmount(item.amount);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white border border-pink-50 shadow-sm px-3 py-3 hover:shadow-md transition-shadow">
      <div className={cn("w-9 h-9 rounded-2xl flex items-center justify-center shrink-0", cfg.bg)}>
        <Icon className={cn("w-4 h-4", cfg.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-pink-900">{cfg.title}</span>
          {statusInfo && (
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", statusInfo.color)}>
              {statusInfo.label}
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">
          {item.label}{item.username ? ` • @${item.username}` : ""}
        </div>
      </div>
      <div className="text-left shrink-0">
        {amt && <div className="text-[11px] font-black text-pink-700">{amt}</div>}
        <div className="text-[9px] text-muted-foreground flex items-center gap-0.5 justify-end">
          <Clock className="w-2.5 h-2.5" />
          {timeAgo(item.createdAt)}
        </div>
      </div>
    </div>
  );
}

export default function ActivityFeedTab() {
  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery<{ feed: FeedItem[] }>({
    queryKey: ["admin-activity-feed"],
    queryFn: () => adminFetch("/activity-feed"),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const feed = data?.feed ?? [];
  const updatedTime = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("ar-SA") : "";

  return (
    <div className="space-y-4 pb-6">

      {/* ─── رأس ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-pink-900">سجل النشاط المباشر</h2>
          <p className="text-[11px] text-muted-foreground">
            {updatedTime ? `آخر تحديث: ${updatedTime}` : "يتحدّث كل 10 ثوانٍ"}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl bg-pink-50 hover:bg-pink-100 transition-all"
        >
          <RefreshCw className={cn("w-4 h-4 text-pink-500", isFetching && "animate-spin")} />
        </button>
      </div>

      {/* ─── مؤشرات سريعة ─── */}
      <div className="grid grid-cols-3 gap-2">
        {(["order", "deposit", "new_user"] as const).map((t) => {
          const cfg = TYPE_CONFIG[t]!;
          const Icon = cfg.icon;
          const count = feed.filter((f) => f.feedType === t).length;
          return (
            <div key={t} className={cn("rounded-2xl p-3 text-center", cfg.bg)}>
              <Icon className={cn("w-4 h-4 mx-auto mb-1", cfg.iconColor)} />
              <div className="text-lg font-black text-pink-900">{count}</div>
              <div className="text-[9px] text-muted-foreground">{cfg.title}</div>
            </div>
          );
        })}
      </div>

      {/* ─── القائمة ─── */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-pink-50 animate-pulse" />
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">لا يوجد نشاط بعد</div>
      ) : (
        <div className="space-y-2">
          {feed.map((item, i) => (
            <FeedCard key={`${item.feedType}-${item.id}-${i}`} item={item} />
          ))}
        </div>
      )}

    </div>
  );
}
