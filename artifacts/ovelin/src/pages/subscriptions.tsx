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
import { useAuth } from "@/lib/auth";
import { showToast } from "@/components/Toast";

type Plan = { id: number; name: string; description: string; intervalDays: number; price: string; productName: string; imageUrl: string | null };
type Sub = { id: number; planName: string; productName: string; status: string; autoRenew: boolean; nextBillingAt: string; price: string };

export default function SubscriptionsPage() {
  const { user, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mySubs, setMySubs] = useState<Sub[]>([]);
  const [tab, setTab] = useState<"plans" | "mine">("plans");
  const [target, setTarget] = useState("");

  function load() {
    api<Plan[]>("/api/subscription-plans").then(setPlans).catch(() => { /* ignore */ });
    if (user) api<Sub[]>("/api/subscriptions/my").then(setMySubs).catch(() => { /* ignore */ });
  }
  useEffect(load, [user?.id]);

  async function subscribe(planId: number) {
    if (!user) { setLocation("/login"); return; }
    const t = (target || prompt("أدخل المعرّف/الرابط المطلوب:") || "").trim();
    if (!t) return;
    try {
      await api(`/api/subscriptions/subscribe`, { method: "POST", body: JSON.stringify({ planId, targetInfo: t }) });
      showToast("تم الاشتراك بنجاح", "success");
      refresh(); load(); setTab("mine");
    } catch (e: any) {
      showToast(e.message || "خطأ", "error");
    }
  }

  async function cancel(id: number) {
    if (!confirm("إلغاء الاشتراك؟")) return;
    await api(`/api/subscriptions/${id}/cancel`, { method: "POST" });
    showToast("تم الإلغاء", "success"); load();
  }

  async function toggleRenew(id: number) {
    await api(`/api/subscriptions/${id}/toggle-renew`, { method: "POST" });
    load();
  }

  return (
    <div className="min-h-[100dvh] pb-20">
      <div className="px-4 py-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-pink-700 dark:text-pink-300">🔁 الاشتراكات الدورية</h1>
        <button onClick={() => setLocation("/")} className="text-pink-500 text-sm">رجوع</button>
      </div>

      <div className="px-4 mb-3 flex gap-2 text-sm">
        <button onClick={() => setTab("plans")} className={`flex-1 py-2 rounded-full ${tab === "plans" ? "bg-pink-500 text-white" : "bg-white dark:bg-zinc-900"}`}>الخطط</button>
        <button onClick={() => setTab("mine")} className={`flex-1 py-2 rounded-full ${tab === "mine" ? "bg-pink-500 text-white" : "bg-white dark:bg-zinc-900"}`}>اشتراكاتي ({mySubs.length})</button>
      </div>

      {tab === "plans" && (
        <div className="px-4 space-y-3">
          {plans.length === 0 && <div className="text-center text-zinc-500 py-8">لا توجد خطط متاحة حالياً</div>}
          {plans.map((p) => (
            <div key={p.id} className="fancy-card dark:bg-zinc-900 rounded-2xl p-4 dark:border-pink-900/30">
              <div className="flex gap-3">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.productName} className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 rounded-xl bg-pink-100 flex items-center justify-center text-2xl">📦</div>}
                <div className="flex-1">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{p.productName}</div>
                  <div className="text-xs text-pink-600 mt-1">كل {p.intervalDays} يوم</div>
                </div>
                <div className="text-left">
                  <div className="font-bold text-pink-600">{Number(p.price).toFixed(2)}$</div>
                </div>
              </div>
              {p.description && <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">{p.description}</div>}
              <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="رابط/معرّف الهدف" className="w-full mt-3 px-3 py-2 rounded-lg bg-pink-50 dark:bg-zinc-800 text-sm" />
              <button onClick={() => subscribe(p.id)} className="w-full mt-2 py-2 rounded-full bg-pink-500 text-white font-bold text-sm">اشترك الآن</button>
            </div>
          ))}
        </div>
      )}

      {tab === "mine" && (
        <div className="px-4 space-y-3">
          {mySubs.length === 0 && <div className="text-center text-zinc-500 py-8">لا توجد اشتراكات</div>}
          {mySubs.map((s) => (
            <div key={s.id} className="fancy-card dark:bg-zinc-900 rounded-2xl p-4 dark:border-pink-900/30">
              <div className="flex justify-between">
                <div>
                  <div className="font-bold">{s.planName}</div>
                  <div className="text-xs text-zinc-500">{s.productName}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full h-fit ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>
                  {s.status === "active" ? "نشط" : s.status === "paused" ? "متوقف" : "ملغى"}
                </span>
              </div>
              <div className="text-xs text-zinc-600 mt-2">التجديد القادم: {new Date(s.nextBillingAt).toLocaleDateString("ar-EG")} - {Number(s.price).toFixed(2)}$</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => toggleRenew(s.id)} className="flex-1 py-1.5 rounded-full bg-pink-50 text-pink-700 text-xs font-bold">{s.autoRenew ? "إيقاف التجديد" : "تفعيل التجديد"}</button>
                {s.status === "active" && <button onClick={() => cancel(s.id)} className="flex-1 py-1.5 rounded-full bg-red-50 text-red-600 text-xs font-bold">إلغاء</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
