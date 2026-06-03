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
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit3, X, Check, ToggleLeft, ToggleRight,
  Users, TrendingUp, DollarSign, RefreshCw, ChevronDown,
  CheckCircle2, Clock, XCircle, ArrowLeft, Package,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatSDG } from "@/lib/utils";
import { showToast } from "@/components/Toast";

type Plan = {
  id: number;
  productId: number;
  productName: string;
  productPlatform: string;
  name: string;
  description: string;
  intervalDays: number;
  price: string;
  discountPct: number;
  active: boolean;
  sortOrder: number;
};

type SubRecord = {
  id: number;
  userId: number;
  username: string;
  phone: string;
  planId: number;
  planName: string;
  productName: string;
  productPlatform: string;
  price: string;
  intervalDays: number;
  status: "active" | "cancelled" | "expired";
  autoRenew: boolean;
  targetInfo: string;
  nextBillingAt: string;
  lastBilledAt: string | null;
  createdAt: string;
  cancelledAt: string | null;
};

type Stats = {
  active: number;
  cancelled: number;
  expired: number;
  totalRevenue: string;
  activeRevenue: string;
};

type Product = { id: number; name: string; category: string; platform: string };

const EMPTY_FORM = { productId: "", name: "", description: "", intervalDays: "30", price: "", discountPct: "0", sortOrder: "0" };

const PLATFORM_EMOJI: Record<string, string> = {
  netflix: "🎬", spotify: "🎵", youtube: "▶️", openai: "🤖",
  shahid: "📺", canva: "🎨", disney: "🏰", telegram: "✈️",
  amazon: "📦", microsoft: "💻", anghami: "🎶", osn: "📡",
};

function platformEmoji(platform: string) {
  return PLATFORM_EMOJI[platform?.toLowerCase() ?? ""] ?? "📦";
}

function statusBadge(status: string) {
  if (status === "active")
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />نشط</span>;
  if (status === "cancelled")
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" />ملغي</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" />منتهي</span>;
}

export default function AdminSubscriptions() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"plans" | "customers">("plans");

  // Plans state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState<number | null>(null);

  // Customer subs state
  const [subs, setSubs] = useState<SubRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingSub, setLoadingSub] = useState(false);

  function loadPlans() {
    api<Plan[]>("/api/admin/subscription-plans")
      .then(setPlans)
      .catch(() => setLocation("/admin/login"));
  }

  function loadProducts() {
    api<Product[]>("/api/products?category=app_subscriptions")
      .then(setProducts)
      .catch(() => {});
  }

  function loadSubs() {
    const qs = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    api<SubRecord[]>(`/api/admin/subscriptions${qs}`).then(setSubs).catch(() => {});
    api<Stats>("/api/admin/subscriptions/stats").then(setStats).catch(() => {});
  }

  useEffect(() => {
    loadPlans();
    loadProducts();
  }, []);

  useEffect(() => {
    if (tab === "customers") loadSubs();
  }, [tab, statusFilter]);

  async function savePlan() {
    if (!form.productId || !form.name || !form.price) {
      showToast("الرجاء ملء المنتج والاسم والسعر", "error");
      return;
    }
    const body = {
      productId: Number(form.productId),
      name: form.name,
      description: form.description,
      intervalDays: Number(form.intervalDays),
      price: form.price,
      discountPct: Number(form.discountPct),
      sortOrder: Number(form.sortOrder),
    };
    try {
      if (editId !== null) {
        await api(`/api/admin/subscription-plans/${editId}`, { method: "PUT", body: JSON.stringify(body) });
        showToast("تم التعديل", "success");
      } else {
        await api("/api/admin/subscription-plans", { method: "POST", body: JSON.stringify(body) });
        showToast("تمت الإضافة", "success");
      }
      setForm({ ...EMPTY_FORM });
      setEditId(null);
      setShowForm(false);
      loadPlans();
    } catch (e: any) {
      showToast(e?.message ?? "خطأ", "error");
    }
  }

  async function deletePlan(id: number) {
    if (!confirm("حذف الخطة نهائياً؟")) return;
    await api(`/api/admin/subscription-plans/${id}`, { method: "DELETE" });
    showToast("تم الحذف", "success");
    loadPlans();
  }

  async function togglePlan(id: number) {
    setLoadingToggle(id);
    try {
      const res = await api<{ active: boolean }>(`/api/admin/subscription-plans/${id}/toggle`, { method: "PATCH" });
      setPlans((prev) => prev.map((p) => p.id === id ? { ...p, active: res.active } : p));
    } catch {
      showToast("فشل التبديل", "error");
    } finally {
      setLoadingToggle(null);
    }
  }

  function startEdit(plan: Plan) {
    setForm({
      productId: String(plan.productId),
      name: plan.name,
      description: plan.description,
      intervalDays: String(plan.intervalDays),
      price: plan.price,
      discountPct: String(plan.discountPct),
      sortOrder: String(plan.sortOrder),
    });
    setEditId(plan.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function updateSubStatus(id: number, status: string) {
    setLoadingSub(true);
    try {
      await api(`/api/admin/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      showToast("تم التحديث", "success");
      loadSubs();
    } catch {
      showToast("فشل التحديث", "error");
    } finally {
      setLoadingSub(false);
    }
  }

  const activePlans = plans.filter((p) => p.active);
  const inactivePlans = plans.filter((p) => !p.active);

  return (
    <div className="min-h-[100dvh] pb-24" dir="rtl">
      {/* Header */}
      <div className="fancy-card sticky top-0 z-20 border-b border-pink-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setLocation("/admin")} className="p-1.5 rounded-full hover:bg-pink-50 text-pink-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-extrabold text-pink-800">🔁 اشتراكات التطبيقات</h1>
        </div>
        {tab === "plans" && (
          <button
            onClick={() => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm((v) => !v); }}
            className="flex items-center gap-1 bg-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-bold active:scale-95"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? "إلغاء" : "خطة جديدة"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 pb-1">
        {(["plans", "customers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-2xl text-xs font-bold transition ${
              tab === t
                ? "bg-pink-500 text-white shadow-md"
                : "bg-white border border-pink-200 text-pink-700"
            }`}
          >
            {t === "plans" ? `الخطط (${plans.length})` : `اشتراكات العملاء`}
          </button>
        ))}
      </div>

      {/* ══════════════════ PLANS TAB ══════════════════ */}
      {tab === "plans" && (
        <div className="px-4 py-3 space-y-3">

          {/* Add/Edit Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                exit={{ opacity: 0, y: -12 }}
                className="bg-white rounded-2xl border border-pink-200 p-4 shadow-sm space-y-2"
              >
                <div className="font-bold text-pink-800 text-sm mb-1">
                  {editId !== null ? "✏️ تعديل الخطة" : "➕ إضافة خطة جديدة"}
                </div>

                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-pink-50 border border-pink-200 text-sm"
                  disabled={editId !== null}
                >
                  <option value="">اختر منتج الاشتراك</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {platformEmoji(p.platform)} {p.name}
                    </option>
                  ))}
                </select>

                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="اسم الخطة (مثال: شهر واحد)"
                  className="w-full px-3 py-2 rounded-xl bg-pink-50 border border-pink-200 text-sm"
                />
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="وصف (اختياري)"
                  className="w-full px-3 py-2 rounded-xl bg-pink-50 border border-pink-200 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-pink-700 font-bold block mb-0.5">السعر (ج.س)</label>
                    <input
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      type="number"
                      step="0.01"
                      placeholder="9.99"
                      className="w-full px-3 py-2 rounded-xl bg-pink-50 border border-pink-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-pink-700 font-bold block mb-0.5">المدة (يوم)</label>
                    <input
                      value={form.intervalDays}
                      onChange={(e) => setForm({ ...form, intervalDays: e.target.value })}
                      type="number"
                      placeholder="30"
                      className="w-full px-3 py-2 rounded-xl bg-pink-50 border border-pink-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-pink-700 font-bold block mb-0.5">خصم %</label>
                    <input
                      value={form.discountPct}
                      onChange={(e) => setForm({ ...form, discountPct: e.target.value })}
                      type="number"
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-pink-50 border border-pink-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-pink-700 font-bold block mb-0.5">الترتيب</label>
                    <input
                      value={form.sortOrder}
                      onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                      type="number"
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl bg-pink-50 border border-pink-200 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={savePlan}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-l from-pink-500 to-rose-600 text-white font-bold text-sm"
                >
                  {editId !== null ? "💾 حفظ التعديلات" : "✅ إضافة الخطة"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Plans */}
          {activePlans.length > 0 && (
            <>
              <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> الخطط المفعّلة ({activePlans.length})
              </div>
              {activePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  loadingToggle={loadingToggle}
                  onEdit={startEdit}
                  onToggle={togglePlan}
                  onDelete={deletePlan}
                />
              ))}
            </>
          )}

          {/* Inactive Plans */}
          {inactivePlans.length > 0 && (
            <>
              <div className="text-[11px] font-bold text-zinc-500 flex items-center gap-1 mt-2">
                <XCircle className="w-3.5 h-3.5" /> الخطط الموقوفة ({inactivePlans.length})
              </div>
              {inactivePlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  loadingToggle={loadingToggle}
                  onEdit={startEdit}
                  onToggle={togglePlan}
                  onDelete={deletePlan}
                />
              ))}
            </>
          )}

          {plans.length === 0 && (
            <div className="text-center py-16 text-pink-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <div className="font-bold">لا توجد خطط اشتراك</div>
              <div className="text-xs opacity-70 mt-1">اضغط "خطة جديدة" لإضافة أول خطة</div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ CUSTOMERS TAB ══════════════════ */}
      {tab === "customers" && (
        <div className="px-4 py-3 space-y-3">

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-2xl p-3 text-center border border-emerald-100">
                <div className="text-2xl font-black text-emerald-600">{stats.active}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">نشط</div>
              </div>
              <div className="bg-white rounded-2xl p-3 text-center border border-red-100">
                <div className="text-2xl font-black text-red-500">{stats.cancelled}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">ملغي</div>
              </div>
              <div className="fancy-card rounded-2xl p-3 text-center">
                <div className="text-lg font-black text-pink-600">{Number(stats.activeRevenue).toFixed(0)}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">إيراد نشط (ج.س)</div>
              </div>
            </div>
          )}

          {/* Status filter */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { v: "all", label: "الكل" },
              { v: "active", label: "نشط" },
              { v: "cancelled", label: "ملغي" },
              { v: "expired", label: "منتهي" },
            ].map(({ v, label }) => (
              <button
                key={v}
                onClick={() => setStatusFilter(v)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  statusFilter === v
                    ? "bg-pink-500 text-white shadow-sm"
                    : "bg-white border border-pink-200 text-pink-700"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={loadSubs}
              className="mr-auto p-1.5 rounded-full bg-white border border-pink-200 text-pink-500"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Subscriptions list */}
          {subs.length === 0 ? (
            <div className="text-center py-16 text-pink-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <div className="font-bold">لا توجد اشتراكات</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {subs.map((sub) => (
                <motion.div
                  key={sub.id}
                  className="fancy-card rounded-2xl overflow-hidden"
                >
                  <div className="bg-gradient-to-l from-pink-50 to-rose-50 px-3 py-2 flex items-center justify-between border-b border-pink-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{platformEmoji(sub.productPlatform)}</span>
                      <div>
                        <div className="text-xs font-extrabold text-pink-900">{sub.productName}</div>
                        <div className="text-[10px] text-pink-600">{sub.planName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {statusBadge(sub.status)}
                      <span className="text-xs font-black text-pink-700">{formatSDG(sub.price)} ج.س</span>
                    </div>
                  </div>

                  <div className="px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">العميل</span>
                      <span className="font-bold text-zinc-800">{sub.username ?? `#${sub.userId}`} {sub.phone ? `· ${sub.phone}` : ""}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">معلومات الهدف</span>
                      <span className="font-mono text-xs text-pink-700 max-w-[160px] truncate text-left" dir="ltr">{sub.targetInfo || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">الفوترة القادمة</span>
                      <span className="font-bold text-zinc-700">
                        {sub.nextBillingAt ? new Date(sub.nextBillingAt).toLocaleDateString("ar-SA") : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">تاريخ الاشتراك</span>
                      <span className="text-zinc-600">{new Date(sub.createdAt).toLocaleDateString("ar-SA")}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">تجديد تلقائي</span>
                      <span className={`font-bold ${sub.autoRenew ? "text-emerald-600" : "text-red-500"}`}>
                        {sub.autoRenew ? "مفعّل" : "موقوف"}
                      </span>
                    </div>

                    {/* Actions */}
                    {sub.status === "active" && (
                      <button
                        onClick={() => updateSubStatus(sub.id, "cancelled")}
                        disabled={loadingSub}
                        className="w-full mt-1 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[11px] font-bold active:scale-95 disabled:opacity-50"
                      >
                        إلغاء الاشتراك
                      </button>
                    )}
                    {sub.status === "cancelled" && (
                      <button
                        onClick={() => updateSubStatus(sub.id, "active")}
                        disabled={loadingSub}
                        className="w-full mt-1 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold active:scale-95 disabled:opacity-50"
                      >
                        إعادة تفعيل
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  loadingToggle,
  onEdit,
  onToggle,
  onDelete,
}: {
  plan: Plan;
  loadingToggle: number | null;
  onEdit: (p: Plan) => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <motion.div
      className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${
        plan.active ? "border-pink-100" : "border-zinc-200 opacity-70"
      }`}
    >
      <div className="px-3 py-2.5 flex items-start gap-2">
        <div className="text-2xl leading-none mt-0.5">{platformEmoji(plan.productPlatform)}</div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-pink-900 text-sm leading-tight">{plan.name}</div>
          <div className="text-[11px] text-pink-600 font-medium">{plan.productName}</div>
          {plan.description && (
            <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{plan.description}</div>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] bg-pink-50 text-pink-700 rounded-full px-2 py-0.5 font-bold border border-pink-200">
              {formatSDG(plan.price)} ج.س
            </span>
            <span className="text-[10px] bg-rose-50 text-rose-700 rounded-full px-2 py-0.5 font-bold border border-rose-200">
              كل {plan.intervalDays} يوم
            </span>
            {plan.discountPct > 0 && (
              <span className="text-[10px] bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 font-bold border border-amber-200">
                خصم {plan.discountPct}%
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Toggle */}
          <button
            onClick={() => onToggle(plan.id)}
            disabled={loadingToggle === plan.id}
            title={plan.active ? "إيقاف الخطة" : "تفعيل الخطة"}
            className="text-pink-500 disabled:opacity-40"
          >
            {plan.active
              ? <ToggleRight className="w-6 h-6 text-emerald-500" />
              : <ToggleLeft className="w-6 h-6 text-zinc-400" />}
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(plan)}
              className="w-7 h-7 rounded-full bg-pink-50 border border-pink-200 text-pink-600 flex items-center justify-center active:scale-90"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(plan.id)}
              className="w-7 h-7 rounded-full bg-red-50 border border-red-200 text-red-500 flex items-center justify-center active:scale-90"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
