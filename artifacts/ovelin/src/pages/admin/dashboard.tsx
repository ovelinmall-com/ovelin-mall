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
import { useLocation } from "wouter";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  CreditCard,
  LogOut,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  X,
  Shield,
  LifeBuoy,
  Send,
  AlertCircle,
  Lock,
  HelpCircle,
  Activity,
  Trophy,
  Award,
  Plane,
  Gift,
  Bell,
  Settings,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2,
  Wallet,
  ZoomIn,
  XCircle,
  Wrench,
  Copy,
  Newspaper,
  Pin,
  Tag,
  MessageCircle,
  Wifi,
  Smartphone,
  Monitor,
  Ban,
} from "lucide-react";
import {
  useGetAdminStats,
  useListAdminUsers,
  useUpdateAdminUser,
  useListAdminOrders,
  useUpdateAdminOrder,
  useListAdminProducts,
  useCreateAdminProduct,
  useUpdateAdminProduct,
  useDeleteAdminProduct,
  useListAdminTransactions,
  useUpdateAdminTransaction,
  useAdminLogout,
  useListAdminSupportTickets,
  useGetAdminSupportTicket,
  useReplyAdminSupportTicket,
  useUpdateAdminSupportTicket,
  getGetAdminStatsQueryKey,
  getListAdminUsersQueryKey,
  getListAdminOrdersQueryKey,
  getListAdminProductsQueryKey,
  getListAdminTransactionsQueryKey,
  getListAdminSupportTicketsQueryKey,
  getGetAdminSupportTicketQueryKey,
} from "@workspace/api-client-react";
import { cn, formatSDG } from "@/lib/utils";
import { CATEGORY_ORDER, CATEGORY_META } from "@/lib/categoryMeta";
import AdminSupportTab from "./admin-support";
import { useAdminTabBadges } from "@/hooks/useAdminTabBadges";

type Tab =
  | "stats"
  | "users"
  | "active-users"
  | "orders"
  | "pubg-orders"
  | "products"
  | "transactions"
  | "deposit-requests"
  | "referral-withdrawals"
  | "service-maintenance"
  | "support"
  | "faq"
  | "status"
  | "prizes"
  | "achievements"
  | "travel"
  | "giftcards"
  | "notify"
  | "settings"
  | "system"
  | "posts";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "stats", label: "الإحصائيات", icon: LayoutDashboard },
  { id: "users", label: "المستخدمون", icon: Users },
  { id: "active-users", label: "النشطون الآن", icon: Wifi },
  { id: "orders", label: "الطلبات", icon: ShoppingBag },
  { id: "pubg-orders", label: "طلبات PUBG", icon: Trophy },
  { id: "products", label: "المنتجات", icon: Package },
  { id: "transactions", label: "المعاملات", icon: CreditCard },
  { id: "deposit-requests", label: "طلبات الشحن", icon: Wallet },
  { id: "referral-withdrawals", label: "سحب من المحفظة", icon: CreditCard },
  { id: "service-maintenance", label: "صيانة الخدمات", icon: Wrench },
  { id: "support", label: "الدعم", icon: LifeBuoy },
  { id: "faq", label: "الأسئلة", icon: HelpCircle },
  { id: "status", label: "حالة النظام", icon: Activity },
  { id: "prizes", label: "السحوبات", icon: Trophy },
  { id: "achievements", label: "الإنجازات", icon: Award },
  { id: "travel", label: "السفر", icon: Plane },
  { id: "giftcards", label: "بطاقات الهدايا", icon: Gift },
  { id: "posts", label: "المنشورات", icon: Newspaper },
  { id: "notify", label: "إشعارات", icon: Bell },
  { id: "settings", label: "إعدادات الموقع", icon: Settings },
  { id: "system", label: "الاتصالات الخارجية", icon: Settings },
];

const ORDER_STATUSES = ["pending", "processing", "completed", "cancelled"];
const TX_STATUSES = ["pending", "completed", "rejected"];

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("stats");
  const adminLogout = useAdminLogout();
  const qc = useQueryClient();

  const { data: stats, error: statsError } = useGetAdminStats({
    query: {
      queryKey: getGetAdminStatsQueryKey(),
      retry: false,
      refetchInterval: 6000,
      refetchOnWindowFocus: true,
    },
  });
  const { getBadge, getBadgeLabel, markSeen } = useAdminTabBadges();

  useEffect(() => {
    const status = (statsError as { response?: { status?: number } })?.response?.status;
    if (status === 401) setLocation("/admin/login");
  }, [statsError, setLocation]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "denied") return;
    async function subscribeAdmin() {
      try {
        const perm = Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
        if (perm !== "granted") return;
        const kwRes = await fetch("/api/push/public-key", { credentials: "include" });
        if (!kwRes.ok) return;
        const { publicKey } = await kwRes.json() as { publicKey: string };
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: (() => {
            const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
            const b64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
            const raw = atob(b64);
            const out = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
            return out;
          })(),
        });
        const json = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent }),
        });
      } catch {
      }
    }
    subscribeAdmin();
  }, []);

  return (
    <div className="min-h-[100dvh]">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-gradient-to-br from-pink-600 to-rose-700 text-white px-5 pt-6 pb-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-white/20 backdrop-blur">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] opacity-80">لوحة التحكم</div>
                <div className="font-extrabold">OVELIN MALL</div>
              </div>
            </div>
            <button
              onClick={() =>
                adminLogout.mutate(undefined, {
                  onSuccess: () => setLocation("/"),
                })
              }
              className="p-2 rounded-xl bg-white/15 backdrop-blur active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          {/* Advanced sections quick links */}
          <div className="mt-3 overflow-x-auto no-scrollbar -mx-5 px-5">
            <div className="flex gap-1.5 w-max text-[11px] font-bold">
              {[
                { href: "/admin/codes", label: "🔑 أكواد FF" },
                { href: "/admin/codes?platform=PUBG+Codes", label: "🎮 أكواد PUBG" },
                { href: "/admin/smm-services", label: "📣 خدمات الرشق" },
                { href: "/admin/profits", label: "💰 أرباحي" },
                { href: "/admin/analytics", label: "📊 تحليلات" },
                { href: "/admin/fraud", label: "🛡️ الاحتيال" },
                { href: "/admin/flash-sales", label: "⚡ عروض سريعة" },
                { href: "/admin/subscriptions", label: "🔁 اشتراكات" },
                { href: "/admin/spin", label: "🎡 عجلة الحظ" },
                { href: "/admin/abtests", label: "🧪 A/B" },
              ].map((l) => (
                <button
                  key={l.href}
                  onClick={() => setLocation(l.href)}
                  className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-white whitespace-nowrap active:scale-95"
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          {/* Tabs */}
          <div className="mt-3 overflow-x-auto no-scrollbar -mx-5 px-5">
            <div className="flex gap-1.5 w-max">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTab(t.id);
                      markSeen(t.id);
                    }}
                    className={cn(
                      "relative flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition",
                      active
                        ? "bg-white text-pink-600 shadow-md"
                        : "bg-white/15 backdrop-blur text-white",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" /> {t.label}
                    {getBadge(t.id) > 0 && (
                      <>
                        <span
                          title={`${getBadge(t.id)} ${getBadgeLabel(t.id)}`}
                          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[9px] font-extrabold flex items-center justify-center border border-white shadow"
                        >
                          {getBadge(t.id) > 9 ? "9+" : getBadge(t.id)}
                        </span>
                        <span className={cn(
                          "text-[8px] font-semibold px-1 py-0.5 rounded mr-0.5",
                          active ? "bg-pink-100 text-pink-600" : "bg-pink-500/30 text-pink-100",
                        )}>
                          {getBadgeLabel(t.id)}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-5 pb-10">
          {tab === "stats" && <StatsTab stats={stats} />}
          {tab === "users" && <UsersTab qc={qc} />}
          {tab === "active-users" && <ActiveUsersTab />}
          {tab === "orders" && <OrdersTab qc={qc} />}
          {tab === "pubg-orders" && <PubgOrdersTab />}
          {tab === "products" && <ProductsTab qc={qc} />}
          {tab === "transactions" && <TransactionsTab qc={qc} />}
          {tab === "deposit-requests" && <DepositRequestsTab />}
          {tab === "referral-withdrawals" && <ReferralWithdrawalsTab />}
          {tab === "service-maintenance" && <ServiceMaintenanceTab />}
          {tab === "support" && <AdminSupportTab />}
          {tab === "faq" && <FaqTab />}
          {tab === "status" && <StatusTab />}
          {tab === "prizes" && <PrizesTab />}
          {tab === "achievements" && <AchievementsTab />}
          {tab === "travel" && <TravelTab />}
          {tab === "giftcards" && <GiftCardsTab />}
          {tab === "posts" && <PostsTab />}
          {tab === "notify" && <NotifyTab />}
          {tab === "settings" && <SettingsTab />}
          {tab === "system" && <SystemTab />}
        </div>
      </div>
    </div>
  );
}

function StatsTab({
  stats,
}: {
  stats?: {
    totalUsers: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: string;
    pendingDeposits: number;
    recentOrders?: Array<{
      id: number;
      username: string;
      productName: string;
      price: string;
      status: string;
      createdAt: string;
    }>;
  };
}) {
  const cards = [
    { icon: Users, label: "المستخدمون", value: stats?.totalUsers ?? 0, color: "from-pink-500 to-pink-500" },
    { icon: ShoppingBag, label: "إجمالي الطلبات", value: stats?.totalOrders ?? 0, color: "from-rose-500 to-pink-600" },
    { icon: Clock, label: "قيد التنفيذ", value: stats?.pendingOrders ?? 0, color: "from-amber-500 to-orange-500" },
    { icon: CheckCircle2, label: "مكتملة", value: stats?.completedOrders ?? 0, color: "from-green-500 to-emerald-600" },
    { icon: DollarSign, label: "الإيرادات", value: `${formatSDG(stats?.totalRevenue ?? 0)} ج.س`, color: "from-pink-500 to-pink-700" },
    { icon: TrendingUp, label: "إيداعات معلقة", value: stats?.pendingDeposits ?? 0, color: "from-pink-500 to-rose-600" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${c.color} text-white shadow-md`}
            >
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-red-500/20 rounded-full blur-2xl" />
              <Icon className="w-5 h-5 opacity-90" />
              <div className="text-2xl font-black mt-2">{c.value}</div>
              <div className="text-[11px] opacity-90">{c.label}</div>
            </div>
          );
        })}
      </div>
      {stats?.recentOrders && stats.recentOrders.length > 0 && (
        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 mb-3">آخر الطلبات</div>
          {stats.recentOrders.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-2xl bg-pink-50/50 p-3 mb-2 last:mb-0"
            >
              <div className="min-w-0">
                <div className="text-xs font-bold text-pink-900 truncate">
                  {o.productName}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  @{o.username} • #{o.id}
                </div>
              </div>
              <div className="text-left shrink-0">
                <div className="text-sm font-extrabold text-pink-600">
                  {formatSDG(o.price)} ج.س
                </div>
                <div className="text-[9px] uppercase font-bold text-pink-500">
                  {o.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { data: users } = useListAdminUsers();
  const updateUser = useUpdateAdminUser();
  const [editing, setEditing] = useState<number | null>(null);
  const [balance, setBalance] = useState("");
  const [editingRef, setEditingRef] = useState<number | null>(null);
  const [refBalance, setRefBalance] = useState("");
  const [chatting, setChatting] = useState<number | null>(null);
  const [chatMsg, setChatMsg] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOk, setChatOk] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState("");

  // شحن بالـ ID
  const [topupId, setTopupId] = useState("");
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [topupResult, setTopupResult] = useState<{ ok?: string; err?: string } | null>(null);
  const [topupLoading, setTopupLoading] = useState(false);

  // المستخدمون النشطون الآن — يُحدَّث كل 8 ثوانٍ
  const { data: activeData } = useQuery<{
    users: { userId: number; platform: string }[];
    total: number; mobile: number; desktop: number;
  }>({
    queryKey: ["admin-active-users"],
    queryFn: () => adminFetch<any>("/active-users"),
    refetchInterval: 8_000,
    staleTime: 4_000,
  });
  const onlineSet = new Set<number>((activeData?.users ?? []).map((u) => u.userId));
  const platformMap = new Map<number, string>((activeData?.users ?? []).map((u) => [u.userId, u.platform]));

  async function doTopup() {
    if (!topupId.trim() || !topupAmount) return;
    setTopupLoading(true);
    setTopupResult(null);
    try {
      const res = await fetch("/api/admin/users/topup-by-display-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayId: topupId.trim(), amount: topupAmount, note: topupNote }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل");
      setTopupResult({ ok: `✅ تم شحن ${topupAmount} ج.س لـ @${data.username} — الرصيد الجديد: ${data.newBalance}` });
      setTopupId(""); setTopupAmount(""); setTopupNote("");
      qc.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
    } catch (e: any) {
      setTopupResult({ err: e?.message ?? "فشل" });
    } finally {
      setTopupLoading(false);
    }
  }

  async function sendChat(userId: number) {
    if (!chatMsg.trim()) return;
    setChatLoading(true);
    try {
      await adminFetch(`/users/${userId}/open-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatMsg.trim() }),
      });
      setChatting(null);
      setChatMsg("");
      setChatOk(userId);
      setTimeout(() => setChatOk(null), 4000);
    } catch (e: any) {
      alert(e?.message ?? "فشل إرسال الرسالة");
    } finally {
      setChatLoading(false);
    }
  }

  const filtered = (users ?? []).filter((u) => {
    if (!searchQ.trim()) return true;
    const q = searchQ.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      ((u as any).displayId ?? "").includes(q) ||
      (u.referralCode ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3" dir="rtl">
      {/* شحن سريع بالـ ID */}
      <div className="fancy-card rounded-2xl p-3 space-y-2 border border-pink-200">
        <div className="font-extrabold text-pink-900 text-xs flex items-center gap-1.5">
          ⚡ شحن رصيد بالـ ID
        </div>
        <div className="flex gap-2">
          <input value={topupId} onChange={(e) => setTopupId(e.target.value)} placeholder="ID المستخدم (8 أرقام)" className="flex-1 rounded-xl border border-pink-200 px-3 py-2 text-sm" dir="ltr" maxLength={8} />
          <input value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="المبلغ ج.س" type="number" step="0.01" min="0.01" className="w-24 rounded-xl border border-pink-200 px-3 py-2 text-sm" dir="ltr" />
        </div>
        <input value={topupNote} onChange={(e) => setTopupNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="w-full rounded-xl border border-pink-200 px-3 py-2 text-xs" />
        <button onClick={doTopup} disabled={topupLoading || !topupId.trim() || !topupAmount} className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold py-2 disabled:opacity-50">
          {topupLoading ? "جاري الشحن..." : "شحن الرصيد"}
        </button>
        {topupResult?.ok && <div className="text-[11px] text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{topupResult.ok}</div>}
        {topupResult?.err && <div className="text-[11px] text-red-700 bg-red-50 rounded-xl px-3 py-2">❌ {topupResult.err}</div>}
      </div>

      {/* شريط النشاط */}
      {onlineSet.size > 0 && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-green-700">
            {onlineSet.size} مستخدم نشط الآن — {platformMap.size > 0 && `${Array.from(platformMap.values()).filter(p => p === 'mobile').length} جوال، ${Array.from(platformMap.values()).filter(p => p === 'desktop').length} حاسوب`}
          </span>
        </div>
      )}

      {/* بحث */}
      <input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="بحث بالاسم أو الإيميل أو الـ ID..." className="w-full rounded-2xl border border-pink-200 px-4 py-2.5 text-sm" />

      {filtered.map((u) => {
        const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "—";
        const lastSeenRaw = u.lastSeen;
        const lastSeenDate = lastSeenRaw ? new Date(lastSeenRaw) : null;
        const nowMs = Date.now();
        const seenMs = lastSeenDate?.getTime() ?? 0;
        const diffMins = Math.floor((nowMs - seenMs) / 60000);
        const lastSeenRelative = !lastSeenDate ? "لم يسجّل بعد"
          : diffMins < 1 ? "الآن"
          : diffMins < 60 ? `منذ ${diffMins} د`
          : diffMins < 1440 ? `منذ ${Math.floor(diffMins / 60)} س`
          : `منذ ${Math.floor(diffMins / 1440)} يوم`;
        const lastSeenExact = lastSeenDate
          ? lastSeenDate.toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
          : null;
        const isOnline = onlineSet.has(u.id);
        const userPlatform = platformMap.get(u.id);
        const refCount = u.referralCount ?? 0;

        return (
          <div key={u.id} className="fancy-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-l from-pink-600 via-rose-600 to-pink-700 px-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-white font-black text-sm uppercase">
                    {u.username[0]}
                  </div>
                  {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-pink-600 animate-pulse" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-white text-sm">@{u.username}</span>
                    {u.isBlocked && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">مجمّد</span>}
                  </div>
                  {isOnline && (
                    <div className="text-[9px] text-green-200 font-bold flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                      نشط الآن • {userPlatform === "mobile" ? "📱 جوال" : "💻 حاسوب"}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-black text-white text-sm">{formatSDG(u.balance)} <span className="text-[10px] font-bold opacity-80">ج.س</span></div>
                <div className="text-[10px] text-white/70">إحالة: {formatSDG((u as any).cashbackBalance ?? 0)} ج.س</div>
              </div>
            </div>

            <div className="p-3 space-y-2.5">
              {/* ID + copy */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-pink-500 font-bold">ID :</span>
                  <span className="font-black text-pink-900 text-base tracking-widest font-mono">{(u as any).displayId ?? "—"}</span>
                </div>
                <button onClick={() => navigator.clipboard.writeText((u as any).displayId ?? "")} className="p-1.5 rounded-lg bg-pink-50 text-pink-600 active:scale-90 transition" title="نسخ الـ ID">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-xl bg-pink-50 border border-pink-100 py-1.5 px-1">
                  <div className="text-[9px] text-pink-500 font-bold">الطلبات</div>
                  <div className="text-sm font-black text-pink-900">{u.totalOrders}</div>
                </div>
                <div className="rounded-xl bg-rose-50 border border-rose-100 py-1.5 px-1">
                  <div className="text-[9px] text-rose-500 font-bold">الإحالات</div>
                  <div className="text-sm font-black text-rose-900">{refCount}</div>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 py-1.5 px-1">
                  <div className="text-[9px] text-amber-600 font-bold">VIP</div>
                  <div className="text-sm font-black text-amber-900">{u.vipLevel ?? "—"}</div>
                </div>
              </div>

              {/* Dates + Last seen */}
              <div className="space-y-1 text-[10px]">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> الانضمام</span>
                  <span className="font-bold text-pink-700">{joinDate}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    آخر ظهور
                  </span>
                  <div className="text-right">
                    {isOnline ? (
                      <span className="font-bold text-green-600">🟢 متصل الآن</span>
                    ) : (
                      <div>
                        <div className="font-bold text-pink-700">{lastSeenRelative}</div>
                        {lastSeenExact && <div className="text-[9px] text-muted-foreground">{lastSeenExact}</div>}
                      </div>
                    )}
                  </div>
                </div>
                {u.email && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>البريد</span>
                    <span className="font-bold text-pink-700 truncate max-w-[160px]">{u.email}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => { setEditing(editing === u.id ? null : u.id); setBalance(u.balance); setEditingRef(null); setChatting(null); }}
                  className={cn("rounded-xl border text-[10px] font-bold py-1.5 active:scale-98 transition flex items-center justify-center gap-1", editing === u.id ? "bg-pink-100 border-pink-400 text-pink-900" : "bg-pink-50 border-pink-200 text-pink-800")}
                >
                  <Wallet className="w-3 h-3" /> تعديل المحفظة
                </button>
                <button
                  onClick={() => { setEditingRef(editingRef === u.id ? null : u.id); setRefBalance(String((u as any).cashbackBalance ?? 0)); setEditing(null); setChatting(null); }}
                  className={cn("rounded-xl border text-[10px] font-bold py-1.5 active:scale-98 transition flex items-center justify-center gap-1", editingRef === u.id ? "bg-rose-100 border-rose-400 text-rose-900" : "bg-rose-50 border-rose-200 text-rose-800")}
                >
                  <TrendingUp className="w-3 h-3" /> رصيد الإحالة
                </button>
                <button
                  onClick={() => updateUser.mutate({ id: u.id, data: { isBlocked: !u.isBlocked } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListAdminUsersQueryKey() }) })}
                  className={cn("rounded-xl border text-[10px] font-bold py-1.5 active:scale-98 transition flex items-center justify-center gap-1", u.isBlocked ? "bg-red-50 border-red-300 text-red-700" : "bg-gray-50 border-gray-200 text-gray-700")}
                >
                  <Shield className="w-3 h-3" />
                  {u.isBlocked ? "فك التجميد" : "تجميد الحساب"}
                </button>
                <button
                  onClick={() => { setChatting(chatting === u.id ? null : u.id); setChatMsg(""); setEditing(null); setEditingRef(null); }}
                  className={cn("rounded-xl border text-[10px] font-bold py-1.5 active:scale-98 transition flex items-center justify-center gap-1", chatting === u.id ? "bg-blue-100 border-blue-400 text-blue-900" : "bg-blue-50 border-blue-200 text-blue-700")}
                >
                  <MessageCircle className="w-3 h-3" /> فتح دردشة
                </button>
              </div>

              {/* تعديل رصيد المحفظة */}
              {editing === u.id && (
                <div className="flex items-center gap-2 pt-0.5">
                  <input value={balance} onChange={(e) => setBalance(e.target.value)} type="number" step="0.01" placeholder="رصيد المحفظة" className="flex-1 rounded-xl border border-pink-200 px-3 py-2 text-sm" />
                  <button onClick={() => updateUser.mutate({ id: u.id, data: { balance } }, { onSuccess: () => { setEditing(null); qc.invalidateQueries({ queryKey: getListAdminUsersQueryKey() }); } })} className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold px-3 py-2">حفظ</button>
                  <button onClick={() => setEditing(null)} className="rounded-xl bg-pink-50 p-2 text-pink-600"><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* تعديل رصيد الإحالة */}
              {editingRef === u.id && (
                <div className="flex items-center gap-2 pt-0.5">
                  <input value={refBalance} onChange={(e) => setRefBalance(e.target.value)} type="number" step="0.01" placeholder="رصيد الإحالة" className="flex-1 rounded-xl border border-rose-200 px-3 py-2 text-sm" />
                  <button onClick={() => updateUser.mutate({ id: u.id, data: { cashbackBalance: refBalance } }, { onSuccess: () => { setEditingRef(null); qc.invalidateQueries({ queryKey: getListAdminUsersQueryKey() }); } })} className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold px-3 py-2">حفظ</button>
                  <button onClick={() => setEditingRef(null)} className="rounded-xl bg-rose-50 p-2 text-rose-600"><X className="w-4 h-4" /></button>
                </div>
              )}

              {/* فتح دردشة */}
              {chatting === u.id && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-2.5 space-y-2">
                  <div className="text-[10px] font-bold text-blue-800">💬 رسالة لـ @{u.username} — تظهر في قسم الدعم</div>
                  <textarea
                    value={chatMsg}
                    onChange={(e) => setChatMsg(e.target.value)}
                    rows={3}
                    placeholder="اكتب رسالتك للمستخدم..."
                    className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                    dir="rtl"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => sendChat(u.id)} disabled={chatLoading || !chatMsg.trim()} className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 disabled:opacity-50 flex items-center justify-center gap-1 transition">
                      <Send className="w-3 h-3" />{chatLoading ? "جارٍ الإرسال..." : "إرسال"}
                    </button>
                    <button onClick={() => setChatting(null)} className="rounded-xl bg-white border border-blue-200 text-blue-600 text-xs font-bold px-3 py-1.5">إلغاء</button>
                  </div>
                </div>
              )}

              {/* تأكيد إرسال الدردشة */}
              {chatOk === u.id && (
                <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 text-[11px] font-bold px-3 py-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> تم إرسال الرسالة — ستظهر في قسم الدعم لدى المستخدم
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActiveUsersTab() {
  const { data, isLoading } = useQuery<{
    users: { userId: number; username: string; displayId: string | null; platform: string }[];
    total: number; mobile: number; desktop: number;
  }>({
    queryKey: ["admin-active-users"],
    queryFn: () => adminFetch<any>("/active-users"),
    refetchInterval: 5_000,
    staleTime: 2_000,
  });

  return (
    <div className="space-y-4" dir="rtl">
      <SectionTitle icon={Wifi} title="المستخدمون النشطون الآن" subtitle="يتجدد تلقائياً كل 5 ثوانٍ" />

      {/* إحصائيات النشاط */}
      <div className="grid grid-cols-3 gap-2">
        <div className="fancy-card rounded-2xl p-3 text-center border border-green-100">
          <div className="text-2xl font-black text-green-600">{data?.total ?? 0}</div>
          <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">إجمالي النشطين</div>
          <div className="w-full h-1 rounded-full bg-green-100 mt-2">
            <div className="h-1 rounded-full bg-green-500 transition-all" style={{ width: "100%" }} />
          </div>
        </div>
        <div className="fancy-card rounded-2xl p-3 text-center border border-blue-100">
          <div className="text-2xl font-black text-blue-600">{data?.mobile ?? 0}</div>
          <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">📱 جوال</div>
          <div className="w-full h-1 rounded-full bg-blue-100 mt-2">
            <div
              className="h-1 rounded-full bg-blue-500 transition-all"
              style={{ width: data?.total ? `${Math.round(((data.mobile ?? 0) / data.total) * 100)}%` : "0%" }}
            />
          </div>
        </div>
        <div className="fancy-card rounded-2xl p-3 text-center border border-purple-100">
          <div className="text-2xl font-black text-purple-600">{data?.desktop ?? 0}</div>
          <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">💻 حاسوب</div>
          <div className="w-full h-1 rounded-full bg-purple-100 mt-2">
            <div
              className="h-1 rounded-full bg-purple-500 transition-all"
              style={{ width: data?.total ? `${Math.round(((data.desktop ?? 0) / data.total) * 100)}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* مؤشر النشاط الكلي */}
      {(data?.total ?? 0) > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-green-50 border border-green-200 py-2.5 px-4">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-extrabold text-green-700">
            {data!.total} مستخدم متصل الآن
          </span>
        </div>
      )}

      {/* قائمة النشطين */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
        </div>
      ) : !data?.users?.length ? (
        <div className="text-center py-12 space-y-2">
          <Wifi className="w-10 h-10 text-pink-200 mx-auto" />
          <div className="text-pink-400 text-sm font-semibold">لا يوجد مستخدمون متصلون الآن</div>
          <div className="text-[11px] text-muted-foreground">يظهر هنا المستخدمون الذين فتحوا التطبيق</div>
        </div>
      ) : (
        <div className="space-y-2">
          {data.users.map((u) => (
            <div key={u.userId} className="fancy-card rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white font-black flex items-center justify-center text-sm uppercase shadow">
                    {u.username[0]}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-pink-900 text-sm">@{u.username}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{u.displayId ?? "—"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold",
                  u.platform === "mobile"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-purple-50 text-purple-700 border border-purple-200"
                )}>
                  {u.platform === "mobile"
                    ? <><Smartphone className="w-3 h-3" /> جوال</>
                    : <><Monitor className="w-3 h-3" /> حاسوب</>
                  }
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrdersTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { data: orders } = useListAdminOrders();
  const updateOrder = useUpdateAdminOrder();
  return (
    <div className="space-y-2">
      {(orders ?? []).map((o) => (
        <div
          key={o.id}
          className="fancy-card rounded-2xl p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-pink-900 text-sm">
                {o.productName}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                @{o.username} • #{o.id} • {new Date(o.createdAt).toLocaleString("ar-EG")}
              </div>
              <div className="text-[11px] text-pink-700 mt-1.5 bg-pink-50/60 rounded-lg px-2 py-1">
                الهدف: {o.targetInfo}
              </div>
              {o.notes && (
                <div className="text-[11px] text-rose-700 mt-1 bg-rose-50/60 rounded-lg px-2 py-1">
                  ملاحظات: {o.notes}
                </div>
              )}
            </div>
            <div className="text-left shrink-0">
              <div className="text-sm font-extrabold text-pink-600">
                {formatSDG(o.price)} ج.س
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {ORDER_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() =>
                  updateOrder.mutate(
                    { id: o.id, data: { status: s } },
                    {
                      onSuccess: () =>
                        qc.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() }),
                    },
                  )
                }
                className={cn(
                  "text-[10px] px-2 py-1 rounded-full font-bold",
                  o.status === s
                    ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white"
                    : "bg-pink-50 text-pink-700",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PubgOrdersTab() {
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-pubg-orders"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders?platform=PUBG+Mobile", { credentials: "include" });
      if (!res.ok) throw new Error("فشل");
      return res.json() as Promise<any[]>;
    },
  });

  async function updateStatus(id: number, status: string) {
    setActionLoading(id);
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      refetch();
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteOrder(id: number) {
    if (!confirm(`حذف الطلب #${id}؟`)) return;
    setActionLoading(id);
    try {
      await fetch(`/api/admin/orders/${id}`, { method: "DELETE", credentials: "include" });
      refetch();
    } finally {
      setActionLoading(null);
    }
  }

  const PUBG_STATUS_META: Record<string, { label: string; color: string }> = {
    pending:    { label: "⏳ انتظار",         color: "bg-amber-100 text-amber-800" },
    processing: { label: "🔄 جارٍ التنفيذ",   color: "bg-blue-100 text-blue-800" },
    completed:  { label: "✅ تم الشحن",        color: "bg-emerald-100 text-emerald-800" },
    rejected:   { label: "❌ فشل التنفيذ",    color: "bg-rose-100 text-rose-800" },
    failed:     { label: "❌ فشل",             color: "bg-rose-100 text-rose-800" },
    cancelled:  { label: "🚫 ملغي",           color: "bg-zinc-100 text-zinc-700" },
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-amber-100/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">🎯</div>
        <div className="font-bold text-amber-900 text-lg">لا توجد طلبات PUBG بعد</div>
        <div className="text-xs text-muted-foreground mt-2">ستظهر طلبات الشحن هنا عند وردودها من العملاء</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-sm font-bold text-amber-900">{orders.length} طلب PUBG Mobile</span>
      </div>
      {orders.map((o: any) => {
        const statusMeta = PUBG_STATUS_META[o.status] ?? { label: o.status, color: "bg-zinc-100 text-zinc-700" };
        const isProcessing = actionLoading === o.id;
        return (
          <div key={o.id} className="rounded-2xl bg-white border-2 border-amber-100 p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <div className="font-black text-amber-900 text-sm">{o.productName}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  @{o.username ?? "—"} • طلب #{o.id} • {new Date(o.createdAt).toLocaleString("ar-EG")}
                </div>
                <div className="mt-2 flex items-center gap-2 bg-amber-50 rounded-xl px-3 py-1.5 border border-amber-200">
                  <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <div className="text-[11px] font-mono font-black text-amber-900 tracking-wider">{o.targetInfo ?? "—"}</div>
                  <div className="text-[9px] text-amber-600">Player ID</div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-black text-amber-700">{formatSDG(o.finalPrice ?? o.price)}</div>
                <div className="text-[9px] text-muted-foreground font-bold">ج.س</div>
                <div className={`mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${statusMeta.color}`}>
                  {statusMeta.label}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-amber-50">
              {o.status === "pending" && (
                <button
                  onClick={() => updateStatus(o.id, "processing")}
                  disabled={isProcessing}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : "🔄"} بدء التنفيذ
                </button>
              )}
              {(o.status === "pending" || o.status === "processing") && (
                <button
                  onClick={() => updateStatus(o.id, "completed")}
                  disabled={isProcessing}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : "✅"} تم الشحن
                </button>
              )}
              {(o.status === "pending" || o.status === "processing") && (
                <button
                  onClick={() => updateStatus(o.id, "rejected")}
                  disabled={isProcessing}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-[11px] font-bold disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : "❌"} فشل التنفيذ
                </button>
              )}
              <button
                onClick={() => deleteOrder(o.id)}
                disabled={isProcessing}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-100 text-zinc-700 text-[11px] font-bold border border-zinc-200 disabled:opacity-50 mr-auto"
              >
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} حذف
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { data: products } = useListAdminProducts();
  const create = useCreateAdminProduct();
  const update = useUpdateAdminProduct();
  const del = useDeleteAdminProduct();
  const [showNew, setShowNew] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    oldPrice: "",
    quantity: "",
    category: "social_followers",
    platform: "",
    deliveryTime: "",
    badge: "",
  });

  const SUB_PLATFORMS = [
    { value: "netflix", label: "🎬 Netflix" },
    { value: "spotify", label: "🎵 Spotify" },
    { value: "youtube", label: "▶️ YouTube Premium" },
    { value: "shahid", label: "📺 شاهد VIP" },
    { value: "anghami", label: "🎶 Anghami" },
    { value: "canva", label: "🎨 Canva Pro" },
    { value: "chatgpt", label: "🤖 ChatGPT Plus" },
    { value: "other", label: "📦 أخرى" },
  ];

  const SUB_DURATIONS = ["شهر", "شهرين", "3 شهور", "6 شهور", "سنة"];

  function reset() {
    setForm({
      name: "",
      description: "",
      price: "",
      oldPrice: "",
      quantity: "",
      category: "social_followers",
      platform: "",
      deliveryTime: "",
      badge: "",
    });
  }

  const isSubscription = form.category === "app_subscriptions";
  const filteredProducts = filterCat === "all"
    ? (products ?? [])
    : (products ?? []).filter((p) => p.category === filterCat);

  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [seedingFF, setSeedingFF] = useState(false);
  const [seedFFResult, setSeedFFResult] = useState<string | null>(null);
  const [smmStatus, setSmmStatus] = useState<{ ok: boolean; totalServices?: number; breakdown?: any; error?: string } | null>(null);
  const [checkingSmm, setCheckingSmm] = useState(false);

  async function handleSmmSeed() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/admin/smm/seed", { method: "POST", credentials: "include" });
      const d = await res.json();
      if (res.ok) {
        setSeedResult(`✅ تم بنجاح — أُنشئ: ${d.created} • حُدّث: ${d.updated}`);
        qc.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
      } else {
        setSeedResult(`❌ ${d.error ?? "فشل"}`);
      }
    } catch (e: any) {
      setSeedResult(`❌ ${e.message}`);
    } finally {
      setSeeding(false);
    }
  }

  async function handleSeedFreefire() {
    setSeedingFF(true);
    setSeedFFResult(null);
    try {
      const res = await fetch("/api/admin/smm/seed-freefire", { method: "POST", credentials: "include" });
      const d = await res.json();
      if (res.ok) {
        setSeedFFResult(d.message ?? "✅ تم");
        qc.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
      } else {
        setSeedFFResult(`❌ ${d.error ?? "فشل"}`);
      }
    } catch (e: any) {
      setSeedFFResult(`❌ ${e.message}`);
    } finally {
      setSeedingFF(false);
    }
  }

  async function checkSmmConnection() {
    setCheckingSmm(true);
    try {
      const res = await fetch("/api/admin/smm/connection-status", { credentials: "include" });
      setSmmStatus(await res.json());
    } catch {
      setSmmStatus({ ok: false, error: "فشل الاتصال" });
    } finally {
      setCheckingSmm(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* ── SMM Provider Status ─────────────────────── */}
      <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3 space-y-2">
        <div className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5" /> خدمات السوشيال ميديا (SMM)
        </div>

        {/* Connection status */}
        {smmStatus && (
          <div className={`rounded-xl px-3 py-2 text-[10px] font-bold ${smmStatus.ok ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {smmStatus.ok ? (
              <>
                ✅ <strong>متصل بالمورد الخارجي morethanpanel.com</strong><br />
                إجمالي الخدمات: {smmStatus.totalServices?.toLocaleString("ar")} خدمة حقيقية<br />
                فيسبوك: {smmStatus.breakdown?.facebook} • انستغرام: {smmStatus.breakdown?.instagram} • تيك توك: {smmStatus.breakdown?.tiktok}<br />
                <span className="text-emerald-600">⚡ الطلبات تُرسل مباشرةً للمورد — ارتباط حقيقي 100%</span>
              </>
            ) : `❌ ${smmStatus.error}`}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={checkSmmConnection}
            disabled={checkingSmm}
            className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {checkingSmm ? <><Loader2 className="w-3 h-3 animate-spin" />فحص...</> : "🔌 اختبر الاتصال بالمورد"}
          </button>
          <button
            onClick={handleSmmSeed}
            disabled={seeding}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {seeding ? <><Loader2 className="w-3 h-3 animate-spin" />جاري...</> : <><Send className="w-3 h-3" />بذر SMM</>}
          </button>
        </div>
        {seedResult && (
          <div className="text-[10px] font-bold text-blue-900 bg-blue-100 rounded-lg px-2 py-1">{seedResult}</div>
        )}

        <p className="text-[9px] text-blue-600 border-t border-blue-200 pt-1">
          💡 ملاحظة: بعد بذر الخدمات، عدّل سعر كل خدمة بالجنيه السوداني من قائمة المنتجات بالضغط على زر <strong>"السعر / 1000"</strong>. السعر الخارجي بالدولار يظهر كمرجع فقط.
        </p>
      </div>

      {/* ── Free Fire Diamonds ─────────────────────── */}
      <div className="rounded-2xl bg-orange-50 border border-orange-200 p-3 space-y-2">
        <div className="text-xs font-bold text-orange-800 flex items-center gap-1.5">
          💎 فري فاير — بطاقات الماس
        </div>
        <p className="text-[10px] text-orange-700">
          أنشئ منتجَي فري فاير (110 و 220 ماسة) في المتجر. بعدها افتح <strong>إدارة الأكواد</strong> وأضف أكواد التفعيل لكل منتج. الزبون يشتري ويحصل على الكود فوراً.
        </p>
        <button
          onClick={handleSeedFreefire}
          disabled={seedingFF}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {seedingFF ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />جاري الإنشاء...</> : "💎 إنشاء منتجات فري فاير (110 و 220 ماسة)"}
        </button>
        {seedFFResult && (
          <div className="text-[10px] font-bold text-orange-900 bg-orange-100 rounded-lg px-2 py-1">{seedFFResult}</div>
        )}
        <p className="text-[9px] text-orange-600 border-t border-orange-200 pt-1">
          بعد الإنشاء اذهب لـ 🔑 <strong>إدارة الأكواد</strong> لإضافة أكواد التفعيل لكل منتج.
        </p>
      </div>
      {/* ── Category filter ── */}
      <div className="overflow-x-auto no-scrollbar -mx-0">
        <div className="flex gap-1.5 w-max text-[10px] font-bold pb-1">
          <button
            onClick={() => setFilterCat("all")}
            className={cn("px-3 py-1.5 rounded-full", filterCat === "all" ? "bg-pink-500 text-white" : "bg-white border border-pink-100 text-pink-700")}
          >
            الكل ({(products ?? []).length})
          </button>
          {CATEGORY_ORDER.map((c) => {
            const count = (products ?? []).filter((p) => p.category === c).length;
            if (!count) return null;
            return (
              <button
                key={c}
                onClick={() => setFilterCat(c)}
                className={cn("px-3 py-1.5 rounded-full whitespace-nowrap", filterCat === c ? "bg-pink-500 text-white" : "bg-white border border-pink-100 text-pink-700")}
              >
                {CATEGORY_META[c]?.name ?? c} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => setShowNew((s) => !s)}
        className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 font-bold flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> {showNew ? "إخفاء النموذج" : "➕ إضافة منتج جديد"}
      </button>

      {showNew && (
        <div className="fancy-card rounded-3xl p-4 space-y-2.5">
          {/* Category first — drives smart fields */}
          <div>
            <label className="text-[10px] text-pink-700 font-bold mb-1 block">الفئة</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value, platform: "" })}
              className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm bg-pink-50/40"
            >
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>{CATEGORY_META[c]?.name ?? c}</option>
              ))}
            </select>
          </div>

          {/* Subscription-specific banner */}
          {isSubscription && (
            <div className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white px-3 py-2 text-[10px] font-bold">
              📦 وضع الاشتراكات — اختر التطبيق والمدة لتظهر التفاصيل تلقائياً للعميل
            </div>
          )}

          {/* Platform — dropdown for subscriptions, free text for others */}
          <div>
            <label className="text-[10px] text-pink-700 font-bold mb-1 block">
              {isSubscription ? "التطبيق" : "المنصة (اختياري)"}
            </label>
            {isSubscription ? (
              <select
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm bg-pink-50/40"
              >
                <option value="">اختر التطبيق...</option>
                {SUB_PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            ) : (
              <input
                placeholder="مثال: instagram أو pubg"
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm"
              />
            )}
          </div>

          <div>
            <label className="text-[10px] text-pink-700 font-bold mb-1 block">اسم المنتج</label>
            <input
              placeholder={isSubscription ? "مثال: نتفليكس بريميوم - شهر" : "اسم المنتج"}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-[10px] text-pink-700 font-bold mb-1 block">الوصف</label>
            <textarea
              placeholder={isSubscription ? "مثال: اشتراك نتفليكس مشاركة عائلية" : "الوصف"}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* Price row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-pink-700 font-bold mb-1 block">السعر (ج.س)</label>
              <input
                placeholder="0.00"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-pink-700 font-bold mb-1 block">
                السعر القديم <span className="text-gray-400">(اختياري)</span>
              </label>
              <input
                placeholder="للتوفير %"
                type="number"
                step="0.01"
                value={form.oldPrice}
                onChange={(e) => setForm({ ...form, oldPrice: e.target.value })}
                className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Duration / delivery */}
          {isSubscription ? (
            <div>
              <label className="text-[10px] text-pink-700 font-bold mb-1 block">مدة الاشتراك</label>
              <select
                value={form.deliveryTime}
                onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm bg-pink-50/40"
              >
                <option value="">اختر المدة...</option>
                {SUB_DURATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-pink-700 font-bold mb-1 block">الكمية (اختياري)</label>
                <input
                  placeholder="مثال: 1000"
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-pink-700 font-bold mb-1 block">وقت التسليم</label>
                <input
                  placeholder="مثال: 1-2 ساعة"
                  value={form.deliveryTime}
                  onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                  className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] text-pink-700 font-bold mb-1 block">
              شارة <span className="text-gray-400">(اختياري — مثال: الأرخص، حصري، وفّر $9)</span>
            </label>
            <input
              placeholder="شارة تظهر على الكرت"
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={() => {
              const qtyNum = form.quantity ? Number(form.quantity) : undefined;
              create.mutate(
                {
                  data: {
                    name: form.name,
                    description: form.description,
                    price: form.price,
                    oldPrice: form.oldPrice || undefined,
                    quantity: isSubscription ? undefined : (qtyNum && !isNaN(qtyNum) ? qtyNum : undefined),
                    category: form.category,
                    platform: form.platform || undefined,
                    deliveryTime: form.deliveryTime || undefined,
                    badge: form.badge || undefined,
                  },
                },
                {
                  onSuccess: () => {
                    reset();
                    setShowNew(false);
                    qc.invalidateQueries({ queryKey: getListAdminProductsQueryKey() });
                  },
                },
              );
            }}
            disabled={!form.name || !form.price || !form.description}
            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white py-2.5 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> إنشاء المنتج
          </button>
        </div>
      )}

      {filteredProducts.map((p) => (
        <ProductRow
          key={p.id}
          product={p as any}
          onToggle={() =>
            update.mutate(
              { id: p.id, data: { active: !p.active } },
              {
                onSuccess: () =>
                  qc.invalidateQueries({ queryKey: getListAdminProductsQueryKey() }),
              },
            )
          }
          onDelete={() =>
            del.mutate(
              { id: p.id },
              {
                onSuccess: () =>
                  qc.invalidateQueries({ queryKey: getListAdminProductsQueryKey() }),
              },
            )
          }
          onPriceUpdate={(newPrice) =>
            update.mutate(
              { id: p.id, data: { price: newPrice } },
              {
                onSuccess: () =>
                  qc.invalidateQueries({ queryKey: getListAdminProductsQueryKey() }),
              },
            )
          }
          onDescriptionUpdate={(desc) =>
            update.mutate(
              { id: p.id, data: { description: desc } },
              {
                onSuccess: () =>
                  qc.invalidateQueries({ queryKey: getListAdminProductsQueryKey() }),
              },
            )
          }
        />
      ))}
    </div>
  );
}

function ProductRow({
  product,
  onToggle,
  onDelete,
  onPriceUpdate,
  onDescriptionUpdate,
}: {
  product: {
    id: number;
    name: string;
    description: string;
    price: string;
    category: string;
    active: boolean;
    smmServiceId?: string | null;
    smmRateUsd?: string | null;
    smmMin?: number | null;
    smmMax?: number | null;
  };
  onToggle: () => void;
  onDelete: () => void;
  onPriceUpdate: (price: string) => void;
  onDescriptionUpdate: (desc: string) => void;
}) {
  const isSMM = !!product.smmServiceId;
  const rateUsd = product.smmRateUsd ? Number(product.smmRateUsd) : null;
  const [editPrice, setEditPrice] = useState(false);
  const [editDesc, setEditDesc] = useState(false);
  const [price, setPrice] = useState(
    isSMM ? (Number(product.price) * 1000).toFixed(2) : product.price
  );
  const [desc, setDesc] = useState(product.description);

  return (
    <div className="fancy-card rounded-2xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-pink-900 text-sm leading-tight">{product.name}</div>
          <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
            {product.description}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-[9px] bg-pink-50 text-pink-700 rounded-full px-1.5 py-0.5 font-bold">
              {CATEGORY_META[product.category]?.name ?? product.category}
            </span>
            <span
              className={`text-[9px] rounded-full px-1.5 py-0.5 font-bold ${
                product.active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {product.active ? "نشط" : "موقوف"}
            </span>
            {isSMM && (
              <span className="text-[9px] bg-blue-50 text-blue-700 rounded-full px-1.5 py-0.5 font-bold">
                SMM #{product.smmServiceId}
              </span>
            )}
          </div>
        </div>
        <div className="text-left shrink-0 space-y-0.5">
          <div className="text-sm font-extrabold text-pink-600">
            {Number(product.price).toFixed(4)} ج.س
          </div>
          {rateUsd !== null && (
            <div className="text-[9px] text-blue-600 font-bold">
              المورد: ${rateUsd.toFixed(4)} USD/1000
            </div>
          )}
          {isSMM && (
            <div className="text-[9px] text-pink-700 font-bold">
              {formatSDG(Number(product.price) * 1000)} ج.س/1000
            </div>
          )}
          {isSMM && product.smmMin != null && (
            <div className="text-[9px] text-muted-foreground">
              {product.smmMin.toLocaleString("ar")} – {(product.smmMax ?? "∞").toLocaleString()}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <button
          onClick={() => { setEditPrice((e) => !e); setEditDesc(false); }}
          className="text-[10px] bg-pink-50 text-pink-700 rounded-full px-2 py-1 font-bold flex items-center gap-1"
        >
          <Edit3 className="w-3 h-3" /> {isSMM ? "السعر / 1000" : "السعر (ج.س)"}
        </button>
        <button
          onClick={() => { setEditDesc((e) => !e); setEditPrice(false); }}
          className="text-[10px] bg-violet-50 text-violet-700 rounded-full px-2 py-1 font-bold flex items-center gap-1"
        >
          <Edit3 className="w-3 h-3" /> الوصف
        </button>
        <button
          onClick={onToggle}
          className="text-[10px] bg-rose-50 text-rose-700 rounded-full px-2 py-1 font-bold"
        >
          {product.active ? "إيقاف" : "تفعيل"}
        </button>
        <button
          onClick={onDelete}
          className="text-[10px] bg-red-50 text-red-600 rounded-full px-2 py-1 font-bold flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> حذف
        </button>
      </div>

      {editPrice && (
        <div className="mt-2 space-y-1">
          {isSMM && rateUsd !== null && (
            <div className="text-[9px] text-blue-700 bg-blue-50 rounded-lg px-2 py-1 font-bold">
              سعر المورد الخارجي: ${rateUsd.toFixed(4)} USD/1000 وحدة
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                step={isSMM ? "0.01" : "0.0001"}
                placeholder={isSMM ? "السعر لكل 1000 وحدة بالجنيه" : "السعر بالجنيه السوداني"}
                className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm pr-10"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-pink-600 font-bold">
                {isSMM ? "ج.س/1000" : "ج.س"}
              </span>
            </div>
            <button
              onClick={() => {
                const finalPrice = isSMM
                  ? String((Number(price) / 1000).toFixed(6))
                  : price;
                onPriceUpdate(finalPrice);
                setEditPrice(false);
              }}
              className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold px-3 py-2"
            >
              حفظ
            </button>
          </div>
          {isSMM && price && (
            <div className="text-[9px] text-zinc-500">
              ← سيُحفظ كـ {(Number(price) / 1000).toFixed(6)} ج.س/وحدة
            </div>
          )}
        </div>
      )}

      {editDesc && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="وصف الخدمة..."
            className="w-full rounded-xl border border-violet-200 px-3 py-2 text-sm resize-none"
          />
          <button
            onClick={() => { onDescriptionUpdate(desc); setEditDesc(false); }}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold px-3 py-2 self-start"
          >
            حفظ الوصف
          </button>
        </div>
      )}
    </div>
  );
}

function TransactionsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { data: txs } = useListAdminTransactions();
  const update = useUpdateAdminTransaction();
  return (
    <div className="space-y-2">
      {(txs ?? []).map((t) => (
        <div
          key={t.id}
          className="fancy-card rounded-2xl p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-pink-900 text-sm">
                {t.type} • @{t.username}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                #{t.id} • {t.method ?? "-"} • {new Date(t.createdAt).toLocaleString("ar-EG")}
              </div>
              {t.reference && (
                <div className="text-[10px] mt-0.5 text-pink-700 truncate">
                  مرجع: {t.reference}
                </div>
              )}
            </div>
            <div className="text-left shrink-0">
              <div
                className={cn(
                  "text-sm font-extrabold",
                  Number(t.amount) < 0 ? "text-pink-600" : "text-green-600",
                )}
              >
                {Number(t.amount) >= 0 ? "+" : ""}{formatSDG(Math.abs(Number(t.amount)))} ج.س
              </div>
            </div>
          </div>
          {t.type === "deposit" && (
            <div className="mt-2 flex flex-wrap gap-1">
              {TX_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() =>
                    update.mutate(
                      { id: t.id, data: { status: s } },
                      {
                        onSuccess: () =>
                          qc.invalidateQueries({
                            queryKey: getListAdminTransactionsQueryKey(),
                          }),
                      },
                    )
                  }
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-full font-bold",
                    t.status === s
                      ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white"
                      : "bg-pink-50 text-pink-700",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const SUPPORT_STATUSES = ["open", "waiting_user", "resolved", "closed"];
const SUPPORT_PRIORITIES = ["low", "normal", "high", "urgent"];

const SUPPORT_STATUS_LABEL: Record<string, string> = {
  open: "مفتوحة",
  waiting_user: "بانتظار المستخدم",
  resolved: "تم الحل",
  closed: "مغلقة",
};
const SUPPORT_PRIORITY_LABEL: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};
const SUPPORT_STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  waiting_user: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-zinc-100 text-zinc-600",
};
const SUPPORT_PRIORITY_COLOR: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700",
  normal: "bg-pink-100 text-pink-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-pink-200 text-pink-800",
};


const ADMIN_API = (import.meta.env.BASE_URL || "/") + "api/admin";

function receiptSrc(url: string): string {
  if (!url) return "";
  if (url.startsWith("/objects/")) {
    const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
    return `${base}/api/receipts/objects/${url.slice("/objects/".length)}`;
  }
  return url;
}

async function adminFetch<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${ADMIN_API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    ...opts,
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${r.status})`);
  }
  return r.json();
}

function useAdminList<T = any>(key: string, path: string, refetchMs = 10000) {
  return useQuery({
    queryKey: [key],
    queryFn: () => adminFetch<T>(path),
    refetchInterval: refetchMs,
  });
}

function FaqTab() {
  const qc = useQueryClient();
  const { data } = useAdminList<any[]>("admin-faq", "/faq");
  const [form, setForm] = useState({ question: "", answer: "", category: "general", sortOrder: 0, active: true });
  const [editId, setEditId] = useState<number | null>(null);
  const list = data ?? [];
  const submit = useMutation({
    mutationFn: async () => {
      if (editId) return adminFetch(`/faq/${editId}`, { method: "PATCH", body: JSON.stringify(form) });
      return adminFetch(`/faq`, { method: "POST", body: JSON.stringify(form) });
    },
    onSuccess: () => {
      setForm({ question: "", answer: "", category: "general", sortOrder: 0, active: true });
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["admin-faq"] });
    },
  });
  const del = useMutation({
    mutationFn: (id: number) => adminFetch(`/faq/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-faq"] }),
  });
  return (
    <div className="space-y-3">
      <SectionTitle icon={HelpCircle} title="الأسئلة الشائعة" subtitle={`${list.length} سؤال`} />
      <div className="fancy-card rounded-3xl p-3 space-y-2">
        <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="السؤال" className={inputCls} />
        <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="الجواب" rows={3} className={inputCls} />
        <div className="grid grid-cols-3 gap-2">
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="الفئة" className={inputCls} />
          <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} placeholder="ترتيب" className={inputCls} />
          <label className="flex items-center justify-center gap-1 text-xs font-bold text-pink-700 bg-pink-50 rounded-2xl">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> نشط
          </label>
        </div>
        <button onClick={() => submit.mutate()} disabled={!form.question || !form.answer} className={btnPrimary}>
          {editId ? "تحديث" : "إضافة سؤال"}
        </button>
        {editId && (
          <button onClick={() => { setEditId(null); setForm({ question: "", answer: "", category: "general", sortOrder: 0, active: true }); }} className={btnSecondary}>
            إلغاء التحرير
          </button>
        )}
      </div>
      <div className="space-y-2">
        {list.map((f) => (
          <div key={f.id} className="fancy-card rounded-2xl p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-pink-900">{f.question}</div>
                <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{f.answer}</div>
                <div className="text-[10px] text-pink-600 mt-1">{f.category} • {f.active ? "نشط" : "مخفي"}</div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => { setEditId(f.id); setForm({ question: f.question, answer: f.answer, category: f.category, sortOrder: f.sortOrder, active: f.active }); }} className="p-2 rounded-xl bg-pink-50 text-pink-700"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => del.mutate(f.id)} className="p-2 rounded-xl bg-pink-50 text-pink-700"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusTab() {
  const qc = useQueryClient();
  const { data } = useAdminList<any[]>("admin-status", "/status-components");
  const [form, setForm] = useState({ name: "", description: "", status: "operational", sortOrder: 0 });
  const list = data ?? [];
  const create = useMutation({
    mutationFn: () => adminFetch(`/status-components`, { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { setForm({ name: "", description: "", status: "operational", sortOrder: 0 }); qc.invalidateQueries({ queryKey: ["admin-status"] }); },
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminFetch(`/status-components/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-status"] }),
  });
  const del = useMutation({
    mutationFn: (id: number) => adminFetch(`/status-components/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-status"] }),
  });
  const STATUSES = ["operational", "degraded", "outage", "maintenance"];
  return (
    <div className="space-y-3">
      <SectionTitle icon={Activity} title="حالة النظام" subtitle={`${list.length} مكون`} />
      <div className="fancy-card rounded-3xl p-3 space-y-2">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم المكون (مثل API)" className={inputCls} />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="الوصف" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} placeholder="ترتيب" className={inputCls} />
        </div>
        <button onClick={() => create.mutate()} disabled={!form.name} className={btnPrimary}>إضافة مكون</button>
      </div>
      <div className="space-y-2">
        {list.map((c) => (
          <div key={c.id} className="fancy-card rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-pink-900">{c.name}</div>
              <div className="text-[10px] text-muted-foreground">{c.description}</div>
            </div>
            <select value={c.status} onChange={(e) => update.mutate({ id: c.id, status: e.target.value })} className="text-[11px] rounded-xl border border-pink-200 px-2 py-1">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => del.mutate(c.id)} className="p-2 rounded-xl bg-pink-50 text-pink-700"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrizesTab() {
  const qc = useQueryClient();
  const { data } = useAdminList<any[]>("admin-prizes", "/prize-draws");
  const list = data ?? [];
  const [form, setForm] = useState({
    title: "", description: "", prizeName: "", prizeValue: "100", ticketsPerSpend: "10",
    bgColor: "from-amber-400 via-pink-500 to-rose-600",
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    status: "active", active: true,
  });
  const create = useMutation({
    mutationFn: () => adminFetch(`/prize-draws`, {
      method: "POST",
      body: JSON.stringify({ ...form, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString() }),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-prizes"] }),
  });
  const drawWinner = useMutation({
    mutationFn: (id: number) => adminFetch(`/prize-draws/${id}/draw-winner`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-prizes"] }),
  });
  const del = useMutation({
    mutationFn: (id: number) => adminFetch(`/prize-draws/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-prizes"] }),
  });
  return (
    <div className="space-y-3">
      <SectionTitle icon={Trophy} title="سحوبات الجوائز" subtitle={`${list.length} سحب`} />
      <div className="fancy-card rounded-3xl p-3 space-y-2">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان السحب" className={inputCls} />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="الوصف" className={inputCls} />
        <input value={form.prizeName} onChange={(e) => setForm({ ...form, prizeName: e.target.value })} placeholder="اسم الجائزة" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={form.prizeValue} onChange={(e) => setForm({ ...form, prizeValue: e.target.value })} placeholder="قيمة الجائزة (ج.س)" className={inputCls} />
          <input type="number" value={form.ticketsPerSpend} onChange={(e) => setForm({ ...form, ticketsPerSpend: e.target.value })} placeholder="ج.س لكل تذكرة" className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={inputCls} />
          <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className={inputCls} />
        </div>
        <input value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} placeholder="تدرج اللون (Tailwind)" className={inputCls} />
        <button onClick={() => create.mutate()} disabled={!form.title || !form.prizeName} className={btnPrimary}>إنشاء سحب</button>
      </div>
      <div className="space-y-2">
        {list.map((d) => (
          <div key={d.id} className={cn("rounded-2xl text-white p-3 bg-gradient-to-br", d.bgColor || "from-amber-400 to-pink-600")}>
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm">{d.title}</div>
              <div className="text-xs opacity-90">{d.prizeValue} ج.س</div>
            </div>
            <div className="text-[11px] opacity-90 mt-1">🎁 {d.prizeName} • ينتهي {new Date(d.endsAt).toLocaleDateString("ar-EG")}</div>
            <div className="text-[10px] mt-1 opacity-80">الحالة: {d.status} {d.winnerUserId ? `• فاز #${d.winnerUserId}` : ""}</div>
            <div className="flex gap-1.5 mt-2">
              {!d.winnerUserId && (
                <button onClick={() => drawWinner.mutate(d.id)} className="flex-1 rounded-xl bg-white/25 backdrop-blur text-white text-[11px] font-bold py-1.5">
                  <Trophy className="w-3 h-3 inline -mt-0.5 ml-1" /> اختر الفائز
                </button>
              )}
              <button onClick={() => del.mutate(d.id)} className="rounded-xl bg-white/20 backdrop-blur text-white text-[11px] font-bold px-3 py-1.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AchievementsTab() {
  const qc = useQueryClient();
  const { data } = useAdminList<any[]>("admin-achievements", "/achievements");
  const list = data ?? [];
  const [form, setForm] = useState({ code: "", title: "", description: "", icon: "🏆", points: 50, active: true });
  const [grant, setGrant] = useState({ achievementId: "", userId: "" });
  const create = useMutation({
    mutationFn: () => adminFetch(`/achievements`, { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => { setForm({ code: "", title: "", description: "", icon: "🏆", points: 50, active: true }); qc.invalidateQueries({ queryKey: ["admin-achievements"] }); },
  });
  const grantMut = useMutation({
    mutationFn: () => adminFetch(`/achievements/${grant.achievementId}/grant/${grant.userId}`, { method: "POST" }),
    onSuccess: () => setGrant({ achievementId: "", userId: "" }),
  });
  const del = useMutation({
    mutationFn: (id: number) => adminFetch(`/achievements/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-achievements"] }),
  });
  return (
    <div className="space-y-3">
      <SectionTitle icon={Award} title="الإنجازات والشارات" subtitle={`${list.length} إنجاز`} />
      <div className="fancy-card rounded-3xl p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="الكود" className={inputCls} />
          <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="الأيقونة (إيموجي)" className={inputCls} />
        </div>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="العنوان" className={inputCls} />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="الوصف" className={inputCls} />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} placeholder="النقاط" className={inputCls} />
          <label className="flex items-center justify-center gap-1 text-xs font-bold text-pink-700 bg-pink-50 rounded-2xl">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> نشط
          </label>
        </div>
        <button onClick={() => create.mutate()} disabled={!form.code || !form.title} className={btnPrimary}>إضافة إنجاز</button>
      </div>
      <div className="rounded-3xl bg-pink-50/40 p-3 border border-pink-100 space-y-2">
        <div className="text-xs font-bold text-pink-900">🏆 منح إنجاز يدوياً</div>
        <div className="grid grid-cols-2 gap-2">
          <input value={grant.achievementId} onChange={(e) => setGrant({ ...grant, achievementId: e.target.value })} placeholder="رقم الإنجاز" className={inputCls} />
          <input value={grant.userId} onChange={(e) => setGrant({ ...grant, userId: e.target.value })} placeholder="رقم المستخدم" className={inputCls} />
        </div>
        <button onClick={() => grantMut.mutate()} disabled={!grant.achievementId || !grant.userId} className={btnPrimary}>منح للمستخدم</button>
        {grantMut.isSuccess && <div className="text-[11px] text-green-700">✅ تم المنح بنجاح</div>}
        {grantMut.error && <div className="text-[11px] text-pink-700">{(grantMut.error as Error).message}</div>}
      </div>
      <div className="space-y-2">
        {list.map((a) => (
          <div key={a.id} className="fancy-card rounded-2xl p-3 flex items-center gap-3">
            <div className="text-2xl">{a.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-pink-900 truncate">{a.title} <span className="text-pink-500">#{a.id}</span></div>
              <div className="text-[10px] text-muted-foreground line-clamp-1">{a.description}</div>
              <div className="text-[10px] text-pink-600 mt-0.5">+{a.points} نقطة • {a.active ? "نشط" : "مخفي"}</div>
            </div>
            <button onClick={() => del.mutate(a.id)} className="p-2 rounded-xl bg-pink-50 text-pink-700"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TravelTab() {
  const qc = useQueryClient();
  const { data: dests } = useAdminList<any[]>("admin-travel", "/travel-destinations");
  const { data: bookings } = useAdminList<any[]>("admin-travel-bookings", "/travel-bookings", 8000);
  const list = dests ?? [];
  const bks = bookings ?? [];
  const [form, setForm] = useState({
    name: "", country: "", description: "", cashCost: "500", pointsCost: 5000,
    durationDays: 5, imageUrl: "", highlights: "", active: true,
  });
  const create = useMutation({
    mutationFn: () => adminFetch(`/travel-destinations`, {
      method: "POST",
      body: JSON.stringify({
        ...form,
        highlights: form.highlights.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    }),
    onSuccess: () => { setForm({ name: "", country: "", description: "", cashCost: "500", pointsCost: 5000, durationDays: 5, imageUrl: "", highlights: "", active: true }); qc.invalidateQueries({ queryKey: ["admin-travel"] }); },
  });
  const updateBooking = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => adminFetch(`/travel-bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-travel-bookings"] }),
  });
  const del = useMutation({
    mutationFn: (id: number) => adminFetch(`/travel-destinations/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-travel"] }),
  });
  return (
    <div className="space-y-3">
      <SectionTitle icon={Plane} title="السفر والوجهات" subtitle={`${list.length} وجهة • ${bks.length} حجز`} />
      <div className="fancy-card rounded-3xl p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم الوجهة" className={inputCls} />
          <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="الدولة" className={inputCls} />
        </div>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="الوصف" rows={2} className={inputCls} />
        <div className="grid grid-cols-3 gap-2">
          <input type="number" value={form.cashCost} onChange={(e) => setForm({ ...form, cashCost: e.target.value })} placeholder="السعر $" className={inputCls} />
          <input type="number" value={form.pointsCost} onChange={(e) => setForm({ ...form, pointsCost: Number(e.target.value) })} placeholder="نقاط VIP" className={inputCls} />
          <input type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })} placeholder="أيام" className={inputCls} />
        </div>
        <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="رابط صورة" className={inputCls} />
        <input value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} placeholder="أبرز المعالم (مفصول بفواصل)" className={inputCls} />
        <button onClick={() => create.mutate()} disabled={!form.name} className={btnPrimary}>إضافة وجهة</button>
      </div>
      <div className="space-y-2">
        {list.map((d) => (
          <div key={d.id} className="fancy-card rounded-2xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-pink-500 overflow-hidden">
              {d.imageUrl ? <img src={d.imageUrl} className="w-full h-full object-cover" /> : <Plane className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-pink-900 truncate">{d.name} • {d.country}</div>
              <div className="text-[10px] text-muted-foreground">{d.cashCost} ج.س • {d.pointsCost} نقطة • {d.durationDays}ي</div>
            </div>
            <button onClick={() => del.mutate(d.id)} className="p-2 rounded-xl bg-pink-50 text-pink-700"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
      <SectionTitle icon={Plane} title="الحجوزات" subtitle={`${bks.length}`} />
      <div className="space-y-2">
        {bks.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">لا توجد حجوزات</div>}
        {bks.map((b) => (
          <div key={b.id} className="fancy-card rounded-2xl p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="font-bold text-pink-900">حجز #{b.id}</div>
              <select value={b.status} onChange={(e) => updateBooking.mutate({ id: b.id, status: e.target.value })} className="text-[11px] rounded-xl border border-pink-200 px-2 py-1">
                {["pending", "confirmed", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">المستخدم #{b.userId} • الوجهة #{b.destinationId} • {b.travelers} مسافر</div>
            <div className="text-[10px] text-pink-600 mt-1">{b.totalCost} ج.س • {new Date(b.createdAt).toLocaleDateString("ar-EG")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GiftCardsTab() {
  const qc = useQueryClient();
  const { data } = useAdminList<any[]>("admin-giftcards", "/gift-cards");
  const list = data ?? [];
  const [form, setForm] = useState({ amount: "25", message: "", expiresInDays: 90, recipientUserId: "" });
  const issue = useMutation({
    mutationFn: () => adminFetch(`/gift-cards`, {
      method: "POST",
      body: JSON.stringify({
        amount: form.amount,
        message: form.message || undefined,
        expiresInDays: form.expiresInDays,
        recipientUserId: form.recipientUserId ? Number(form.recipientUserId) : undefined,
      }),
    }),
    onSuccess: () => { setForm({ amount: "25", message: "", expiresInDays: 90, recipientUserId: "" }); qc.invalidateQueries({ queryKey: ["admin-giftcards"] }); },
  });
  const del = useMutation({
    mutationFn: (id: number) => adminFetch(`/gift-cards/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-giftcards"] }),
  });
  return (
    <div className="space-y-3">
      <SectionTitle icon={Gift} title="بطاقات الهدايا" subtitle={`${list.length} بطاقة`} />
      <div className="fancy-card rounded-3xl p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="المبلغ $" className={inputCls} />
          <input type="number" value={form.expiresInDays} onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) })} placeholder="تنتهي خلال (يوم)" className={inputCls} />
        </div>
        <input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="رسالة (اختياري)" className={inputCls} />
        <input value={form.recipientUserId} onChange={(e) => setForm({ ...form, recipientUserId: e.target.value })} placeholder="رقم المستخدم المستلم (اختياري)" className={inputCls} />
        <button onClick={() => issue.mutate()} className={btnPrimary}>إصدار بطاقة جديدة</button>
        {issue.data && (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-2 text-[11px] text-green-700">
            ✅ تم: <code className="font-bold" dir="ltr">{(issue.data as any).code}</code>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {list.map((c) => (
          <div key={c.id} className="fancy-card rounded-2xl p-3 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <code className="text-xs font-bold text-pink-900 truncate" dir="ltr">{c.code}</code>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                ${c.amount} • {c.redeemedAt ? `استُخدم بواسطة #${c.redeemedByUserId}` : "غير مستخدم"}
              </div>
            </div>
            <button onClick={() => del.mutate(c.id)} className="p-2 rounded-xl bg-pink-50 text-pink-700"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

type ServiceStatus = {
  key: string;
  label: string;
  configured: boolean;
  source: "env" | "auto";
  envKeys: string[];
  hint: string;
  lastError?: string | null;
  lastSentAt?: number | null;
};

function SystemTab() {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["admin-system-status"],
    queryFn: () => adminFetch<{ services: ServiceStatus[]; note: string }>("/system/status"),
    refetchInterval: 15000,
  });
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message: string } | undefined>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function runTest(service: string, body?: Record<string, unknown>) {
    setBusy(service);
    try {
      const r = await adminFetch<{ ok: boolean; message: string }>(`/system/test/${service}`, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      });
      setTestResult((s) => ({ ...s, [service]: r }));
      refetch();
    } catch (e: any) {
      setTestResult((s) => ({ ...s, [service]: { ok: false, message: e.message } }));
    } finally {
      setBusy(null);
    }
  }

  const services = data?.services ?? [];

  return (
    <div className="space-y-3">
      <SectionTitle icon={Settings} title="الاتصالات الخارجية" subtitle="القيم تُدار من خارج الكود" />

      <div className="rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 text-white p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-2xl bg-white/20 backdrop-blur shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-sm">الإدخال خارج الموقع</div>
            <div className="text-[11px] opacity-90 mt-1 leading-relaxed">
              مفيش مكان جوّا الموقع تكتب فيه أرقام أو مفاتيح. كل القيم بتتدخل من خزنة Replit الآمنة (Secrets) برّا، والموقع بيقرأها مباشرة. الجدول التالي بيوريك حالة كل خدمة.
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {services.map((s) => {
          const r = testResult[s.key];
          const showEmailInput = s.key === "email";
          return (
            <div key={s.key} className={cn("rounded-2xl p-3 border", s.configured ? "bg-white border-pink-100" : "bg-pink-50/40 border-pink-200")}>
              <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", s.configured ? "bg-emerald-500" : "bg-pink-400")} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-pink-900">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{s.hint}</div>
                </div>
                <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", s.configured ? "bg-emerald-100 text-emerald-700" : "bg-pink-100 text-pink-700")}>
                  {s.configured ? "متصل" : "غير مضبوط"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.envKeys.map((k) => (
                  <code key={k} className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-pink-50 text-pink-700" dir="ltr">{k}</code>
                ))}
                {s.source === "auto" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700">تلقائي من Replit</span>}
              </div>
              {showEmailInput && s.configured && (
                <input
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="بريد لاستقبال رسالة الاختبار"
                  className={cn(inputCls, "mt-2 text-[11px]")}
                  dir="ltr"
                />
              )}
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => runTest(s.key, showEmailInput ? { to: testEmail } : undefined)}
                  disabled={busy === s.key || (showEmailInput && !testEmail)}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-pink-50 text-pink-700 disabled:opacity-50"
                >
                  {busy === s.key ? "جاري الاختبار..." : "اختبر الاتصال"}
                </button>
                {r && (
                  <span className={cn("text-[11px] font-bold flex items-center gap-1", r.ok ? "text-emerald-700" : "text-pink-700")}>
                    {r.ok ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />} {r.message}
                  </span>
                )}
              </div>
              {s.lastError && (
                <div className="mt-1 text-[10px] text-pink-700">آخر خطأ: {s.lastError}</div>
              )}
              {s.lastSentAt && (
                <div className="mt-1 text-[10px] text-emerald-700">آخر إرسال ناجح: {new Date(s.lastSentAt).toLocaleString("ar-EG")}</div>
              )}
            </div>
          );
        })}
        {services.length === 0 && !isFetching && (
          <div className="text-center text-xs text-muted-foreground py-6">لا توجد خدمات</div>
        )}
      </div>

      <div className="rounded-2xl bg-pink-50/60 border border-pink-100 p-3 text-[11px] text-pink-800 leading-relaxed">
        💡 لتعديل أي قيمة: افتح <b>Secrets</b> في شريط Replit الجانبي، أضف أو عدّل المفتاح، ثم أعد تشغيل سيرفر API.
      </div>
    </div>
  );
}

function NotifyTab() {
  const [form, setForm] = useState({ userId: "", title: "", body: "", url: "" });
  const send = useMutation({
    mutationFn: () => adminFetch(`/notify-user`, {
      method: "POST",
      body: JSON.stringify({
        userId: form.userId ? Number(form.userId) : null,
        title: form.title,
        body: form.body,
        url: form.url || undefined,
      }),
    }),
    onSuccess: () => setForm({ userId: "", title: "", body: "", url: "" }),
  });
  return (
    <div className="space-y-3">
      <SectionTitle icon={Bell} title="إرسال إشعار" subtitle="فردي أو عام" />
      <div className="fancy-card rounded-3xl p-3 space-y-2">
        <input value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="رقم المستخدم (فارغ = الجميع)" className={inputCls} />
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="العنوان" className={inputCls} />
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="نص الإشعار" rows={3} className={inputCls} />
        <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="رابط (اختياري) مثل /wallet" className={inputCls} />
        <button onClick={() => send.mutate()} disabled={!form.title || !form.body} className={btnPrimary}>
          <Send className="w-4 h-4 inline -mt-0.5 ml-1" /> إرسال
        </button>
        {send.isSuccess && <div className="text-[11px] text-green-700">✅ تم الإرسال بنجاح</div>}
        {send.error && <div className="text-[11px] text-pink-700">{(send.error as Error).message}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Users; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="p-2 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="font-extrabold text-pink-900 text-sm">{title}</div>
        {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400";
const btnPrimary = "w-full rounded-2xl py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-bold shadow active:scale-95 disabled:opacity-50";
const btnSecondary = "w-full rounded-2xl py-2.5 bg-pink-50 text-pink-700 text-sm font-bold";

function SettingsTab() {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: () => adminFetch<any>("/settings"),
  });
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data]);

  if (!form) {
    return <div className="text-center text-xs text-muted-foreground py-6">جاري التحميل…</div>;
  }

  function update(k: string, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
    setSavedMsg("");
  }

  async function save() {
    setSaving(true);
    setSavedMsg("");
    try {
      await adminFetch("/settings", { method: "PATCH", body: JSON.stringify(form) });
      await refetch();
      setSavedMsg("✓ حُفظت الإعدادات بنجاح");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (e: any) {
      setSavedMsg("✗ " + (e?.message || "فشل الحفظ"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <SectionTitle icon={Settings} title="إعدادات الموقع العامة" subtitle="الإحالات، الكاش باك، الصيانة، الإعلانات" />

      <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 shadow-lg">
        <div className="font-extrabold text-sm">🎁 نظام الإحالة</div>
        <div className="text-[11px] opacity-90 mt-1 leading-relaxed">
          عيّن مكافأة التسجيل (تُضاف لرصيد المُحيل فور تسجيل المُحال)، ونسبة العمولة على مشتريات المُحال،
          ونص الإشعار الذي يصل للمُحيل. يمكنك استعمال المتغيرات: <code dir="ltr">{"{name}"}</code>,
          <code dir="ltr">{"{referredName}"}</code>, <code dir="ltr">{"{amount}"}</code>, <code dir="ltr">{"{code}"}</code>.
        </div>
      </div>

      <div className={`rounded-2xl border p-3 flex items-center justify-between ${form.referralEnabled === false ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
        <div>
          <div className="font-extrabold text-sm text-pink-900">حالة نظام الإحالة</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {form.referralEnabled === false ? "موقوف — لا يحصل المُحيل على مكافأة" : "مُفعّل — مكافأة تنزل فوراً عند التسجيل"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => update("referralEnabled", !(form.referralEnabled !== false))}
          className={`relative w-14 h-8 rounded-full transition-colors ${form.referralEnabled !== false ? "bg-emerald-500" : "bg-gray-300"}`}
        >
          <span
            className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${form.referralEnabled !== false ? "right-1" : "right-7"}`}
          />
        </button>
      </div>

      <div className="fancy-card rounded-2xl p-3 space-y-3">
        <div>
          <label className="text-[11px] font-bold text-pink-900 block mb-1">مكافأة تسجيل المُحال (ج.س)</label>
          <input
            type="number" step="0.01" min="0"
            value={form.referralSignupBonus ?? ""}
            onChange={(e) => update("referralSignupBonus", e.target.value)}
            className={inputCls}
            dir="ltr"
          />
          <div className="text-[10px] text-muted-foreground mt-1">تُضاف فوراً لرصيد المُحيل عند تسجيل المُحال + إشعار push</div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-pink-900 block mb-1">نسبة عمولة المشتريات (%)</label>
          <input
            type="number" step="0.1" min="0" max="100"
            value={form.referralCommissionPct ?? ""}
            onChange={(e) => update("referralCommissionPct", e.target.value)}
            className={inputCls}
            dir="ltr"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-pink-900 block mb-1">نص إشعار الإحالة</label>
          <textarea
            rows={3}
            value={form.referralNotificationTemplate ?? ""}
            onChange={(e) => update("referralNotificationTemplate", e.target.value)}
            className={inputCls + " font-mono text-[11px]"}
          />
          <div className="text-[10px] text-muted-foreground mt-1">
            متغيرات: {"{name}"} اسم المُحيل • {"{referredName}"} اسم المُحال • {"{amount}"} المبلغ • {"{code}"} كود الإحالة
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-pink-900 block mb-1">نسبة الكاش باك (%)</label>
          <input
            type="number" step="0.1" min="0" max="100"
            value={form.cashbackPct ?? ""}
            onChange={(e) => update("cashbackPct", e.target.value)}
            className={inputCls}
            dir="ltr"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-pink-900 block mb-1">الحد الأدنى للسحب المعتاد (ج.س)</label>
          <input
            type="number" step="0.01" min="0"
            value={form.minWithdraw ?? ""}
            onChange={(e) => update("minWithdraw", e.target.value)}
            className={inputCls}
            dir="ltr"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-pink-900 block mb-1">الحد الأدنى لسحب رصيد الإحالة (ج.س)</label>
          <input
            type="number" step="1" min="0"
            value={(form as any).minReferralWithdraw ?? ""}
            onChange={(e) => update("minReferralWithdraw", e.target.value)}
            className={inputCls}
            dir="ltr"
          />
        </div>

        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 space-y-2">
          <div className="font-extrabold text-amber-800 text-xs flex items-center gap-1.5">
            💱 سعر صرف الدولار (باينانس)
          </div>
          <div className="text-[10px] text-amber-600">يُعرض لمستخدمي باينانس: كم جنيه سوداني يساوي 1 دولار أمريكي</div>
          <input
            type="number" step="1" min="1"
            value={(form as any).usdToSdg ?? "800"}
            onChange={(e) => update("usdToSdg", e.target.value)}
            className={inputCls + " font-mono"}
            dir="ltr"
            placeholder="800"
          />
          <div className="text-[10px] text-amber-700 font-semibold">
            القيمة الحالية: 1 USD = {(form as any).usdToSdg ?? "800"} ج.س
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-3 space-y-3 transition-colors ${form.maintenanceMode ? "bg-red-50 border-red-300" : "bg-white border-pink-100"}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`font-extrabold text-xs ${form.maintenanceMode ? "text-red-700" : "text-pink-900"}`}>
              🛠️ وضع الصيانة
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {form.maintenanceMode
                ? "🔴 مُفعَّل — الموقع مغلق للزوار الآن"
                : "🟢 موقوف — الموقع يعمل بشكل طبيعي"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => update("maintenanceMode", !form.maintenanceMode)}
            className={`relative w-14 h-8 rounded-full transition-colors ${form.maintenanceMode ? "bg-red-500" : "bg-gray-300"}`}
          >
            <span
              className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${form.maintenanceMode ? "right-1" : "right-7"}`}
            />
          </button>
        </div>
        {form.maintenanceMode && (
          <div className="rounded-xl bg-red-100 border border-red-200 p-2 text-[11px] text-red-700 font-medium">
            ⚠️ الموقع مغلق الآن للزوار. الأدمن فقط يستطيع الدخول عبر <span dir="ltr">/admin</span>
          </div>
        )}
        <div>
          <label className="text-[11px] font-bold text-pink-900 block mb-1">رسالة الصيانة المعروضة للزوار</label>
          <textarea
            rows={2}
            placeholder="مثال: نحن نُحدِّث المنصة، نعود قريباً! 🚀"
            value={form.maintenanceMessage ?? ""}
            onChange={(e) => update("maintenanceMessage", e.target.value)}
            className={inputCls + " text-xs"}
          />
        </div>
        <div>
          <label className="text-[11px] font-bold text-pink-900 block mb-1">شريط إعلاني (يظهر أعلى الصفحات — اتركه فارغاً للإخفاء)</label>
          <input
            placeholder="مثال: 🎉 عرض حصري اليوم فقط!"
            value={form.announcementBar ?? ""}
            onChange={(e) => update("announcementBar", e.target.value)}
            className={inputCls + " text-xs"}
          />
        </div>
      </div>

      <div className="fancy-card rounded-2xl p-3 space-y-3">
        <div className="font-extrabold text-pink-900 text-xs">💎 حدود VIP (إجمالي الإنفاق بالج.س)</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["vipBronzeMin", "برونزي"],
            ["vipSilverMin", "فضي"],
            ["vipGoldMin", "ذهبي"],
            ["vipDiamondMin", "ماسي"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="text-[10px] font-bold text-pink-900 block mb-0.5">{label}</label>
              <input
                type="number" step="1" min="0"
                value={form[key] ?? ""}
                onChange={(e) => update(key, e.target.value)}
                className={inputCls + " text-xs"}
                dir="ltr"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ═══ شاشة تحميل التطبيق ═══ */}
      <div className={`rounded-2xl border p-3 space-y-3 transition-colors ${(form as any).appInstallEnabled ? "bg-indigo-50 border-indigo-200" : "bg-white border-pink-100"}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-extrabold text-xs text-pink-900">📲 شاشة تحميل التطبيق</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {(form as any).appInstallEnabled
                ? "🟢 مُفعَّل — تظهر عند كل دخول عبر المتصفح"
                : "⚫ موقوف — لا تظهر شاشة التحميل"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => update("appInstallEnabled", !(form as any).appInstallEnabled)}
            className={`relative w-14 h-8 rounded-full transition-colors ${(form as any).appInstallEnabled ? "bg-indigo-500" : "bg-gray-300"}`}
          >
            <span
              className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${(form as any).appInstallEnabled ? "right-1" : "right-7"}`}
            />
          </button>
        </div>
        <div>
          <label className="text-[11px] font-bold text-pink-900 block mb-1">نص الوصف تحت زر التحميل</label>
          <textarea
            rows={3}
            placeholder="مثال: حمّل التطبيق لسهولة الاستخدام، وستحصل على بعض المكافآت"
            value={(form as any).appInstallDesc ?? ""}
            onChange={(e) => update("appInstallDesc", e.target.value)}
            className={inputCls + " text-xs"}
          />
          <div className="text-[10px] text-muted-foreground mt-1">يظهر هذا النص أسفل زر التحميل في شاشة ترحيب التطبيق</div>
        </div>
      </div>

      <div className="sticky bottom-2 z-10">
        <button
          onClick={save}
          disabled={saving || isFetching}
          className={btnPrimary}
        >
          {saving ? "جاري الحفظ..." : "💾 حفظ كل الإعدادات"}
        </button>
        {savedMsg && (
          <div className={cn("text-center text-xs font-bold mt-2", savedMsg.startsWith("✓") ? "text-emerald-700" : "text-pink-700")}>
            {savedMsg}
          </div>
        )}
      </div>
    </div>
  );
}

const METHOD_ICON: Record<string, string> = {
  MyCashi: "/payment/cashi.jpg",
  OCash: "/payment/ocash.jpg",
  BinancePay: "/payment/binance.jpg",
  sudanese: "/payment/sudani.jpg",
  zain: "/payment/zain.jpg",
  mtn: "/payment/mtn.jpg",
};
const METHOD_LABEL: Record<string, string> = {
  MyCashi: "ماي كاشي",
  OCash: "أوكاش",
  BinancePay: "بايننس باي",
};
const DREQ_STATUS_LABEL: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};
const DREQ_STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-pink-100 text-pink-700",
};

function DepositRequestsTab() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useAdminList<any[]>(
    "admin-deposit-requests",
    "/deposit-requests",
    8000,
  );

  const [imageModal, setImageModal] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const list = data ?? [];
  const pending = list.filter((r) => r.status === "pending");
  const done = list.filter((r) => r.status !== "pending");

  async function approve(id: number) {
    setProcessing(id);
    setMsg(null);
    try {
      await adminFetch(`/deposit-requests/${id}/approve`, { method: "POST" });
      setMsg({ type: "ok", text: "✅ تم اعتماد الشحن وإضافته للمحفظة" });
      qc.invalidateQueries({ queryKey: ["admin-deposit-requests"] });
      refetch();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "فشل الاعتماد" });
    } finally {
      setProcessing(null);
    }
  }

  async function reject(id: number) {
    setProcessing(id);
    setMsg(null);
    try {
      await adminFetch(`/deposit-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      setMsg({ type: "ok", text: "تم رفض الطلب وإشعار المستخدم" });
      setRejectId(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["admin-deposit-requests"] });
      refetch();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "فشل الرفض" });
    } finally {
      setProcessing(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={Wallet} title="طلبات الشحن" subtitle={`${pending.length} بانتظار المراجعة`} />

      {msg && (
        <div className={cn(
          "rounded-2xl text-xs font-bold p-3 flex gap-2",
          msg.type === "ok" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-pink-50 border border-pink-200 text-pink-700"
        )}>
          {msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto shrink-0"><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* Image fullscreen modal */}
      {imageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImageModal(null)}
        >
          <button
            onClick={() => setImageModal(null)}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
          >
            <XCircle className="w-5 h-5" />
          </button>
          <img
            src={imageModal}
            alt="إيصال"
            className="max-w-full max-h-full object-contain rounded-2xl"
            style={{ touchAction: "pinch-zoom" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Pending requests */}
      {pending.length === 0 && (
        <div className="fancy-card rounded-2xl p-6 text-center text-sm text-pink-400">
          لا توجد طلبات شحن بانتظار المراجعة 🎉
        </div>
      )}

      {pending.map((r) => (
        <div key={r.id} className="fancy-card rounded-2xl p-4 space-y-3 border-2 border-amber-200">
          <div className="flex items-start gap-3">
            {METHOD_ICON[r.method] && (
              <img src={METHOD_ICON[r.method]} alt={r.method} className="w-10 h-10 rounded-xl object-cover shadow shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-pink-900 text-sm">@{r.username ?? "—"}</span>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", DREQ_STATUS_COLOR[r.status])}>
                  {DREQ_STATUS_LABEL[r.status]}
                </span>
              </div>
              {r.email && <div className="text-[10px] text-muted-foreground">{r.email}</div>}
              {r.phone && <div className="text-[10px] text-muted-foreground">{r.phone}</div>}
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-pink-900">{formatSDG(r.amount)} ج.س</span>
                <span className="text-[11px] text-pink-600">{METHOD_LABEL[r.method] ?? r.method}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString("ar-EG")}</span>
              </div>
            </div>
          </div>

          {/* Receipt image */}
          {r.receiptUrl && (
            <button
              type="button"
              onClick={() => setImageModal(receiptSrc(r.receiptUrl))}
              className="relative w-full rounded-xl overflow-hidden border border-pink-100 bg-pink-50/30 group"
            >
              <img
                src={receiptSrc(r.receiptUrl)}
                alt="إيصال"
                className="w-full max-h-40 object-contain"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition">
                <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 drop-shadow transition" />
              </div>
              <div className="text-[10px] text-pink-600 font-bold py-1">اضغط لعرض الإيصال كاملاً</div>
            </button>
          )}

          {/* Reject reason form */}
          {rejectId === r.id && (
            <div className="rounded-xl bg-pink-50/60 border border-pink-200 p-3 space-y-2">
              <label className="text-xs font-bold text-pink-900 block">سبب الرفض (يُرسل للمستخدم)</label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: الإيصال غير واضح أو الحساب غير صحيح"
                className="w-full rounded-xl border border-pink-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => reject(r.id)}
                  disabled={processing === r.id}
                  className="flex-1 rounded-xl py-2 text-xs font-bold bg-pink-600 text-white active:scale-95 transition disabled:opacity-60"
                >
                  {processing === r.id ? "جارٍ..." : "تأكيد الرفض"}
                </button>
                <button
                  type="button"
                  onClick={() => { setRejectId(null); setRejectReason(""); }}
                  className="rounded-xl px-3 py-2 text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {rejectId !== r.id && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => approve(r.id)}
                disabled={processing === r.id}
                className="flex-1 rounded-xl py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow active:scale-95 transition disabled:opacity-60"
              >
                {processing === r.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "✅ قبول وشحن المحفظة"}
              </button>
              <button
                type="button"
                onClick={() => { setRejectId(r.id); setRejectReason(""); }}
                className="flex-1 rounded-xl py-2.5 text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200 active:scale-95 transition"
              >
                ❌ رفض
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Completed/Rejected history */}
      {done.length > 0 && (
        <div>
          <div className="text-xs font-bold text-pink-700 mb-2">السجل السابق ({done.length})</div>
          <div className="space-y-2">
            {done.map((r) => (
              <div key={r.id} className="fancy-card rounded-xl p-3 flex items-center gap-3">
                {METHOD_ICON[r.method] && (
                  <img src={METHOD_ICON[r.method]} alt={r.method} className="w-8 h-8 rounded-lg object-cover shadow shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-pink-900 text-xs">@{r.username ?? "—"}</span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", DREQ_STATUS_COLOR[r.status])}>
                      {DREQ_STATUS_LABEL[r.status]}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {formatSDG(r.amount)} ج.س • {METHOD_LABEL[r.method] ?? r.method} • {new Date(r.createdAt).toLocaleString("ar-EG")}
                  </div>
                  {r.rejectionReason && (
                    <div className="text-[10px] text-pink-600 mt-0.5">سبب الرفض: {r.rejectionReason}</div>
                  )}
                </div>
                {r.receiptUrl && (
                  <button onClick={() => setImageModal(r.receiptUrl)} className="shrink-0 p-1.5 rounded-lg bg-pink-50 border border-pink-100">
                    <ZoomIn className="w-4 h-4 text-pink-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const SERVICE_GROUPS = [
  {
    label: "🎮 خدمات الألعاب",
    services: [
      { slug: "pubg",           name: "PUBG Mobile" },
      { slug: "free-fire",      name: "Free Fire" },
      { slug: "cod",            name: "Call of Duty" },
      { slug: "clash-of-clans", name: "Clash of Clans" },
      { slug: "clash-royale",   name: "Clash Royale" },
      { slug: "mobile-legends", name: "Mobile Legends" },
      { slug: "genshin-impact", name: "Genshin Impact" },
      { slug: "fc-mobile",      name: "EA FC Mobile" },
      { slug: "roblox",         name: "Roblox" },
      { slug: "fortnite",       name: "Fortnite" },
      { slug: "valorant",       name: "Valorant" },
      { slug: "brawl-stars",    name: "Brawl Stars" },
      { slug: "honor-of-kings", name: "Honor of Kings" },
      { slug: "stumble-guys",   name: "Stumble Guys" },
    ],
  },
  {
    label: "📱 خدمات السوشيل ميديا",
    services: [
      { slug: "facebook",  name: "فيسبوك" },
      { slug: "instagram", name: "انستغرام" },
      { slug: "snapchat",  name: "سناب شات" },
      { slug: "twitter",   name: "تويتر / X" },
      { slug: "tiktok",    name: "تيك توك" },
    ],
  },
  {
    label: "📺 اشتراكات التطبيقات",
    services: [
      { slug: "netflix",          name: "Netflix" },
      { slug: "shahid-vip",       name: "Shahid VIP" },
      { slug: "spotify",          name: "Spotify" },
      { slug: "youtube-premium",  name: "YouTube Premium" },
      { slug: "chatgpt-plus",     name: "ChatGPT Plus" },
      { slug: "disney-plus",      name: "Disney+" },
      { slug: "apple-music",      name: "Apple Music" },
      { slug: "telegram-premium", name: "Telegram Premium" },
      { slug: "canva-pro",        name: "Canva Pro" },
      { slug: "amazon-prime",     name: "Amazon Prime" },
      { slug: "microsoft-365",    name: "Microsoft 365" },
      { slug: "anghami",          name: "Anghami" },
      { slug: "osn-plus",         name: "OSN+" },
    ],
  },
];

function PostsTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const emptyForm = { title: "", summary: "", body: "", imageUrl: "", category: "عام", tags: "", published: true, pinned: false, sortOrder: 0 };
  const [form, setForm] = useState({ ...emptyForm });
  const [imgLoading, setImgLoading] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/posts", { credentials: "include" });
      const data = await r.json();
      if (Array.isArray(data)) setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, imageUrl: reader.result as string }));
      setImgLoading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
        sortOrder: Number(form.sortOrder),
      };
      const url = editingId ? `/api/admin/posts/${editingId}` : "/api/admin/posts";
      const method = editingId ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      setForm({ ...emptyForm });
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: number) => {
    if (!confirm("حذف هذا المنشور؟")) return;
    await fetch(`/api/admin/posts/${id}`, { method: "DELETE", credentials: "include" });
    await load();
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      summary: p.summary ?? "",
      body: p.body ?? "",
      imageUrl: p.imageUrl ?? "",
      category: p.category ?? "عام",
      tags: Array.isArray(p.tags) ? p.tags.join(", ") : "",
      published: !!p.published,
      pinned: !!p.pinned,
      sortOrder: p.sortOrder ?? 0,
    });
  };

  const inputCls = "w-full rounded-2xl border border-pink-200 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300";
  const btnPrimary = "w-full rounded-2xl bg-gradient-to-br from-pink-600 to-rose-600 text-white font-extrabold py-2.5 text-sm disabled:opacity-50";

  return (
    <div className="space-y-5" dir="rtl">
      <SectionTitle icon={Newspaper} title="إدارة المنشورات" subtitle={`${posts.length} منشور`} />

      {/* Form */}
      <div className="fancy-card rounded-3xl p-4 space-y-2.5">
        <div className="font-extrabold text-pink-900 text-sm mb-1">
          {editingId ? "✏️ تعديل المنشور" : "➕ منشور جديد"}
        </div>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="عنوان المنشور *" className={inputCls} />
        <input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="ملخص قصير" className={inputCls} />
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="نص المنشور الكامل" rows={4} className={inputCls + " resize-none"} />

        {/* Image upload */}
        <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
        <div
          onClick={() => imgInputRef.current?.click()}
          className="cursor-pointer rounded-2xl overflow-hidden"
          style={{ background: form.imageUrl ? "transparent" : "rgba(253,242,248,0.8)", border: form.imageUrl ? "none" : "2px dashed #f9a8d4" }}
        >
          {form.imageUrl ? (
            <div className="relative w-full">
              <img src={form.imageUrl} alt="صورة المنشور" className="w-full object-cover rounded-2xl" style={{ maxHeight: 220 }} />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl">
                <span className="text-white font-bold text-sm">🔄 تغيير الصورة</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              {imgLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-pink-400" />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                    <Newspaper className="w-5 h-5 text-pink-500" />
                  </div>
                  <span className="text-sm font-bold text-pink-700">اضغط لرفع صورة المنشور</span>
                  <span className="text-[11px] text-pink-400">PNG، JPG، WEBP</span>
                </>
              )}
            </div>
          )}
        </div>
        {form.imageUrl && (
          <button
            onClick={() => setForm({ ...form, imageUrl: "" })}
            className="text-xs text-rose-500 font-bold underline w-full text-center"
          >
            ✕ إزالة الصورة
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="القسم (مثل: تحديثات)" className={inputCls} />
          <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="وسوم: tag1, tag2" className={inputCls} dir="ltr" />
        </div>
        <div className="flex items-center gap-4 text-sm font-bold text-pink-800">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="accent-pink-600" />
            منشور (مرئي للعملاء)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="accent-pink-600" />
            <Pin className="w-3.5 h-3.5" /> مثبّت
          </label>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving || !form.title.trim()} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : editingId ? "حفظ التعديل" : "نشر"}
          </button>
          {editingId && (
            <button onClick={() => { setForm({ ...emptyForm }); setEditingId(null); }} className="rounded-2xl border border-pink-200 px-4 py-2 text-sm text-pink-700 font-bold">
              إلغاء
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-pink-500" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-xs text-muted-foreground">لا توجد منشورات بعد</div>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="fancy-card rounded-2xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    {p.pinned && <Pin className="w-3 h-3 text-pink-600" />}
                    <span className="font-extrabold text-sm text-pink-900 truncate">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" />{p.category}</span>
                    <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{p.views}</span>
                    <span className={p.published ? "text-emerald-600 font-bold" : "text-rose-500 font-bold"}>
                      {p.published ? "✓ منشور" : "⏸ مسودة"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(p)} className="p-1.5 rounded-xl bg-pink-50 text-pink-700"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => del(p.id)} className="p-1.5 rounded-xl bg-rose-50 text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {p.summary && <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{p.summary}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const REF_WD_METHOD_LABELS: Record<string, string> = {
  okash: "أوكاش",
  mycash: "ماي كاشي",
  binance: "باينانس",
  sudanese: "رصيد سوداني",
  zain: "رصيد زين",
  mtn: "رصيد MTN",
};
const REF_WD_STATUS_LABELS: Record<string, string> = {
  pending: "⏳ قيد الانتظار",
  approved: "✅ موافق عليه",
  rejected: "❌ مرفوض",
};
const REF_WD_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 border border-amber-200 text-amber-700",
  approved: "bg-green-50 border border-green-200 text-green-700",
  rejected: "bg-red-50 border border-red-200 text-red-700",
};

function ReferralWithdrawalsTab() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-referral-withdrawals"],
    queryFn: () => adminFetch<any[]>("/referral-withdrawals"),
    refetchInterval: 12_000,
  });
  const [updating, setUpdating] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  async function updateStatus(id: number, status: string) {
    setUpdating(id);
    try {
      await adminFetch(`/referral-withdrawals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes: notes[id] ?? "" }),
      });
      qc.invalidateQueries({ queryKey: ["admin-referral-withdrawals"] });
    } finally {
      setUpdating(null);
    }
  }

  const pending = items.filter((i) => i.status === "pending");
  const others = items.filter((i) => i.status !== "pending");

  return (
    <div className="space-y-4" dir="rtl">
      <SectionTitle
        icon={CreditCard}
        title="سحب من المحفظة"
        subtitle={`${items.length} طلب إجمالاً — ${pending.length} قيد الانتظار`}
      />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center text-pink-400 py-10 text-sm font-semibold">لا توجد طلبات سحب بعد</div>
      ) : (
        <div className="space-y-3">
          {[...pending, ...others].map((item) => {
            const isMobile = ["sudanese", "zain", "mtn"].includes(item.method);
            return (
              <div key={item.id} className="fancy-card rounded-2xl p-4 space-y-3">
                {/* ── رأس البطاقة ── */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-pink-900">@{item.username}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      #{item.id} • {new Date(item.createdAt).toLocaleString("ar-EG")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-rose-600 text-sm">
                      {formatSDG(Number(item.amount))} ج.س
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold mt-0.5 inline-block",
                        REF_WD_STATUS_COLORS[item.status] ?? "bg-gray-50 text-gray-600",
                      )}
                    >
                      {REF_WD_STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>
                </div>

                {/* ── تفاصيل الطلب ── */}
                <div className="bg-pink-50/60 rounded-xl p-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-pink-700 font-semibold">طريقة الدفع</span>
                    <span className="font-bold text-pink-900">{REF_WD_METHOD_LABELS[item.method] ?? item.method}</span>
                  </div>
                  {isMobile ? (
                    <div className="flex justify-between">
                      <span className="text-pink-700 font-semibold">رقم الهاتف</span>
                      <span className="font-bold text-pink-900 font-mono" dir="ltr">{item.phoneNumber}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-pink-700 font-semibold">
                          {item.method === "binance" ? "ايدي الحساب" : "رقم الحساب"}
                        </span>
                        <span className="font-bold text-pink-900 font-mono" dir="ltr">{item.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-pink-700 font-semibold">اسم الحساب</span>
                        <span className="font-bold text-pink-900">{item.accountName}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-pink-700 font-semibold">رصيد الإحالة وقت الطلب</span>
                    <span className="font-bold text-green-700">{formatSDG(Number(item.referralBalanceSnapshot))} ج.س</span>
                  </div>
                </div>

                {/* ── ملاحظات الأدمن ── */}
                {item.status === "pending" && (
                  <input
                    placeholder="ملاحظات الأدمن (اختياري — تُرسل للمستخدم عند الرفض)"
                    value={notes[item.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="w-full rounded-xl border border-pink-200 bg-pink-50/40 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                )}
                {item.adminNotes && item.status !== "pending" && (
                  <div className="text-[11px] text-muted-foreground bg-pink-50 rounded-xl px-3 py-2">
                    ملاحظة الأدمن: {item.adminNotes}
                  </div>
                )}

                {/* ── أزرار الإجراء ── */}
                {item.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(item.id, "approved")}
                      disabled={updating === item.id}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-1"
                    >
                      {updating === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> موافقة</>
                      )}
                    </button>
                    <button
                      onClick={() => updateStatus(item.id, "rejected")}
                      disabled={updating === item.id}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs font-bold active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> رفض
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServiceMaintenanceTab() {
  const qc = useQueryClient();
  const { data: maintenance = {}, isLoading } = useQuery<Record<string, boolean>>({
    queryKey: ["admin-service-maintenance"],
    queryFn: () => adminFetch<Record<string, boolean>>("/service-maintenance"),
    refetchInterval: 15_000,
  });
  const [toggling, setToggling] = useState<string | null>(null);

  async function toggle(slug: string, current: boolean) {
    setToggling(slug);
    try {
      await adminFetch(`/service-maintenance/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenance: !current }),
      });
      qc.invalidateQueries({ queryKey: ["admin-service-maintenance"] });
    } finally {
      setToggling(null);
    }
  }

  const maintenanceCount = Object.values(maintenance).filter(Boolean).length;

  return (
    <div className="space-y-5" dir="rtl">
      <SectionTitle
        icon={Wrench}
        title="صيانة الخدمات"
        subtitle="تفعيل وضع الصيانة يُخفي الكرت عن المستخدمين ويمنع الدخول للخدمة"
      />

      {maintenanceCount > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-sm font-bold text-amber-800">
            {maintenanceCount} خدمة تحت الصيانة حالياً
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {SERVICE_GROUPS.map((group) => (
            <div key={group.label} className="rounded-2xl border border-pink-100 bg-white overflow-hidden">
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-2.5 border-b border-pink-100">
                <span className="font-extrabold text-sm text-pink-900">{group.label}</span>
              </div>
              <div className="divide-y divide-pink-50">
                {group.services.map((svc) => {
                  const isOn = maintenance[svc.slug] ?? false;
                  const isSpinning = toggling === svc.slug;
                  return (
                    <div
                      key={svc.slug}
                      className={`flex items-center justify-between px-4 py-3 transition-colors ${isOn ? "bg-red-50" : "bg-white"}`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isOn && <Wrench className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        <div>
                          <div className={`text-sm font-bold ${isOn ? "text-red-800" : "text-pink-900"}`}>
                            {svc.name}
                          </div>
                          <div className={`text-[10.5px] mt-0.5 ${isOn ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>
                            {isOn ? "🔴 تحت الصيانة — مخفية عن المستخدمين" : "🟢 تعمل بشكل طبيعي"}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isSpinning}
                        onClick={() => toggle(svc.slug, isOn)}
                        className={`relative w-12 h-6 rounded-full transition-colors shrink-0 disabled:opacity-60 ${isOn ? "bg-red-500" : "bg-gray-300"}`}
                      >
                        {isSpinning ? (
                          <Loader2 className="absolute inset-0 m-auto w-4 h-4 text-white animate-spin" />
                        ) : (
                          <span
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isOn ? "right-0.5" : "right-6"}`}
                          />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
