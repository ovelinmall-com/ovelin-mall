import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { TrendingUp, ShoppingBag, Users, DollarSign, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

async function adminFetch<T = any>(path: string): Promise<T> {
  const r = await fetch(`${ADMIN_BASE}/api/admin${path}`, { credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function fmtDay(day: string) {
  try {
    const d = new Date(day);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  } catch { return day; }
}

function fmtSDG(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}م`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}ك`;
  return String(Math.round(v));
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-pink-100 rounded-2xl shadow-xl px-4 py-3 text-right">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm font-bold" style={{ color: p.color }}>
          <span>{p.value?.toLocaleString()}{unit ? ` ${unit}` : ""}</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsTab() {
  const [days, setDays] = useState(7);

  const { data, isLoading, refetch, isFetching } = useQuery<{
    charts: { day: string; revenue: number; orders: number; pending: number; newUsers: number }[];
  }>({
    queryKey: ["admin-analytics-charts", days],
    queryFn: () => adminFetch(`/analytics/charts?days=${days}`),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const charts = data?.charts ?? [];

  const totalRevenue = charts.reduce((s, r) => s + r.revenue, 0);
  const totalOrders  = charts.reduce((s, r) => s + r.orders, 0);
  const totalUsers   = charts.reduce((s, r) => s + r.newUsers, 0);
  const avgRevenue   = charts.length ? totalRevenue / charts.length : 0;

  return (
    <div className="space-y-5 pb-6">

      {/* ─── رأس الصفحة ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-pink-900">التحليلات المتقدمة</h2>
          <p className="text-[11px] text-muted-foreground">إيرادات • طلبات • مستخدمون</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white rounded-2xl p-1 gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "text-xs font-bold px-3 py-1.5 rounded-xl transition-all",
                  days === d
                    ? "bg-pink-600 text-white shadow"
                    : "text-pink-400 hover:text-pink-700"
                )}
              >{d}ي</button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-white hover:bg-pink-100 transition-all"
          >
            <RefreshCw className={cn("w-4 h-4 text-pink-500", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ─── بطاقات الإجمالي ─── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: DollarSign, label: "الإيرادات", value: `${fmtSDG(totalRevenue)} ج`, color: "from-pink-500 to-rose-600" },
          { icon: ShoppingBag, label: "الطلبات", value: totalOrders, color: "from-purple-500 to-indigo-600" },
          { icon: Users, label: "مستخدم جديد", value: totalUsers, color: "from-emerald-500 to-teal-600" },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`relative overflow-hidden rounded-2xl p-3 bg-gradient-to-br ${c.color} text-white shadow-md`}>
              <div className="absolute -top-3 -left-3 w-14 h-14 bg-white/10 rounded-full blur-xl" />
              <Icon className="w-4 h-4 opacity-90 mb-1" />
              <div className="text-xl font-black">{c.value}</div>
              <div className="text-[9px] opacity-80">{c.label}</div>
            </div>
          );
        })}
      </div>

      {/* ─── مخطط الإيرادات ─── */}
      <div className="fancy-card rounded-3xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-black text-pink-900">الإيرادات اليومية</div>
            <div className="text-[10px] text-muted-foreground">متوسط {fmtSDG(avgRevenue)} ج.س/يوم</div>
          </div>
          <TrendingUp className="w-5 h-5 text-pink-400" />
        </div>
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-pink-300 text-sm">جاري التحميل…</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={charts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtSDG} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip unit="ج.س" />} />
              <Area type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: "#ec4899" }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ─── مخطط الطلبات ─── */}
      <div className="fancy-card rounded-3xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-black text-pink-900">الطلبات اليومية</div>
            <div className="text-[10px] text-muted-foreground">{totalOrders} طلب مكتمل</div>
          </div>
          <ShoppingBag className="w-5 h-5 text-purple-400" />
        </div>
        {isLoading ? (
          <div className="h-36 flex items-center justify-center text-pink-300 text-sm">جاري التحميل…</div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={charts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" vertical={false} />
              <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="orders" name="مكتمل" fill="#a855f7" radius={[6, 6, 0, 0]} />
              <Bar dataKey="pending" name="معلق" fill="#f9a8d4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex gap-3 mt-2 justify-center">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />مكتمل
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-sm bg-pink-300 inline-block" />معلق
          </div>
        </div>
      </div>

      {/* ─── مخطط المستخدمين الجدد ─── */}
      <div className="fancy-card rounded-3xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-black text-pink-900">المستخدمون الجدد</div>
            <div className="text-[10px] text-muted-foreground">{totalUsers} تسجيل جديد</div>
          </div>
          <Users className="w-5 h-5 text-emerald-400" />
        </div>
        {isLoading ? (
          <div className="h-36 flex items-center justify-center text-pink-300 text-sm">جاري التحميل…</div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={charts} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#d1fae5" />
              <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip unit="مستخدم" />} />
              <Line type="monotone" dataKey="newUsers" stroke="#10b981" strokeWidth={2.5} dot={{ fill: "#10b981", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
