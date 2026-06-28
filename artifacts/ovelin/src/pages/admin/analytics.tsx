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
import { api } from "@/lib/api";

export default function AdminAnalytics() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<any>(null);
  const [funnel, setFunnel] = useState<any>(null);

  useEffect(() => {
    const load = () => {
      api("/api/admin/analytics/summary").then(setData).catch(() => setLocation("/admin/login"));
      api("/api/admin/analytics/funnel").then(setFunnel).catch(() => { /* ignore */ });
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (!data) return <div className="p-6 text-center text-pink-600">جاري التحميل...</div>;
  const tot = data.totals || {};
  const colors = ["bg-pink-500", "bg-pink-500", "bg-pink-500", "bg-pink-500"];

  return (
    <div className="min-h-[100dvh] pb-20">
      <div className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-pink-700">📊 التحليلات</h1>
        <button onClick={() => setLocation("/admin")} className="text-pink-500 text-sm">رجوع</button>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        <Stat label="أحداث 24س" value={tot.events_24h} color="from-pink-400 to-pink-600" />
        <Stat label="جلسات 24س" value={tot.sessions_24h} color="from-pink-400 to-pink-600" />
        <Stat label="مستخدمين جدد" value={tot.new_users_24h} color="from-pink-400 to-pink-600" />
        <Stat label="طلبات 24س" value={tot.orders_24h} color="from-rose-400 to-rose-600" />
        <Stat label="إيرادات 24س" value={`${Number(tot.revenue_24h || 0).toFixed(2)}$`} color="from-pink-500 to-pink-500" />
        <Stat label="طلبات معلقة" value={tot.pending_orders} color="from-yellow-400 to-orange-500" />
        <Stat label="إيداعات معلقة" value={tot.pending_deposits} color="from-blue-400 to-cyan-500" />
        <Stat label="تذاكر مفتوحة" value={tot.open_tickets} color="from-green-400 to-emerald-500" />
      </div>

      {funnel && (
        <div className="mx-4 mt-4 bg-white dark:bg-zinc-900 rounded-2xl p-4">
          <h3 className="font-bold text-pink-700 mb-3">قمع التحويل (آخر 7 أيام)</h3>
          <Funnel label="زوار الصفحة الرئيسية" v={funnel.visitors} max={funnel.visitors} />
          <Funnel label="شاهدوا منتجاً" v={funnel.product_views} max={funnel.visitors} />
          <Funnel label="أضافوا للسلة" v={funnel.users_with_cart} max={funnel.visitors} />
          <Funnel label="أكملوا الشراء" v={funnel.buyers} max={funnel.visitors} />
        </div>
      )}

      {!!data.eventsByType?.length && (
        <div className="mx-4 mt-4 bg-white dark:bg-zinc-900 rounded-2xl p-4">
          <h3 className="font-bold text-pink-700 mb-3">أنواع الأحداث الأكثر شيوعاً</h3>
          <div className="space-y-1.5">
            {data.eventsByType.map((e: any, i: number) => (
              <div key={e.type} className="flex items-center gap-2 text-xs">
                <span className="w-32 truncate">{e.type}</span>
                <div className="flex-1 h-5 bg-white dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full ${colors[i % 4]}`} style={{ width: `${(e.count / data.eventsByType[0].count) * 100}%` }} />
                </div>
                <span className="font-bold w-10 text-left">{e.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!data.topProducts?.length && (
        <div className="mx-4 mt-4 bg-white dark:bg-zinc-900 rounded-2xl p-4">
          <h3 className="font-bold text-pink-700 mb-3">أكثر المنتجات مشاهدة</h3>
          <div className="space-y-1.5">
            {data.topProducts.map((p: any) => (
              <div key={p.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-pink-600 font-bold">{p.views || 0} 👁</span>
                <span className="text-zinc-400">{p.sales_count || 0} 🛒</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className={`rounded-2xl p-3 bg-gradient-to-br ${color} text-white`}>
      <div className="text-xs opacity-90">{label}</div>
      <div className="text-2xl font-bold mt-1">{value ?? 0}</div>
    </div>
  );
}

function Funnel({ label, v, max }: { label: string; v: number; max: number }) {
  const pct = max > 0 ? (v / max) * 100 : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1"><span>{label}</span><span className="font-bold">{v ?? 0}</span></div>
      <div className="h-3 bg-white dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-pink-500 to-pink-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
