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

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Search,
  X,
  RefreshCcw,
  Repeat,
  Ban,
  Filter,
  Hourglass,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { LivePill } from "@/components/LiveDot";
import {
  useListMyOrders,
  useGetMyOrder,
  useCancelMyOrder,
  useReorderMyOrder,
  getListMyOrdersQueryKey,
  getGetMyOrderQueryKey,
  getGetWalletQueryKey,
  getGetMyDashboardQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  string,
  { label: string; icon: typeof Clock; color: string; ring: string }
> = {
  pending: {
    label: "قيد الانتظار",
    icon: Hourglass,
    color: "bg-amber-100 text-amber-700",
    ring: "ring-amber-300",
  },
  processing: {
    label: "قيد التنفيذ",
    icon: Package,
    color: "bg-blue-100 text-blue-700",
    ring: "ring-blue-300",
  },
  completed: {
    label: "مكتمل",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-700",
    ring: "ring-green-300",
  },
  cancelled: {
    label: "ملغي",
    icon: XCircle,
    color: "bg-pink-100 text-pink-700",
    ring: "ring-pink-300",
  },
  rejected: {
    label: "مرفوض",
    icon: Ban,
    color: "bg-pink-100 text-pink-700",
    ring: "ring-pink-300",
  },
  partial: {
    label: "تنفيذ جزئي",
    icon: Filter,
    color: "bg-rose-100 text-rose-700",
    ring: "ring-rose-300",
  },
};

const TABS = [
  { id: "all", label: "الكل" },
  { id: "pending", label: "قيد الانتظار" },
  { id: "processing", label: "قيد التنفيذ" },
  { id: "completed", label: "مكتمل" },
  { id: "cancelled", label: "ملغي" },
];

export default function OrdersPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const { data: orders, isLoading: ordersLoading, dataUpdatedAt } = useListMyOrders(
    undefined,
    {
      query: {
        queryKey: getListMyOrdersQueryKey(),
        enabled: !!user,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
      },
    },
  );

  const cancel = useCancelMyOrder();
  const reorder = useReorderMyOrder();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders?.length ?? 0 };
    for (const o of orders ?? []) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    let list = orders ?? [];
    if (tab !== "all") list = list.filter((o) => o.status === tab);
    const q = search.trim();
    if (q) {
      const lower = q.toLowerCase();
      list = list.filter(
        (o) =>
          String(o.id).includes(lower) ||
          o.productName.toLowerCase().includes(lower) ||
          (o.targetInfo ?? "").toLowerCase().includes(lower),
      );
    }
    return list;
  }, [orders, tab, search]);

  if (!user) return null;

  function refreshAll() {
    qc.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
    qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMyDashboardQueryKey() });
  }

  function onCancel(id: number) {
    if (!confirm("هل أنت متأكد من إلغاء هذا الطلب؟ سيتم استرداد المبلغ.")) return;
    cancel.mutate({ id }, { onSuccess: refreshAll });
  }

  function onReorder(id: number) {
    reorder.mutate(
      { id },
      {
        onSuccess: refreshAll,
        onError: (e: any) => {
          const msg =
            e?.data?.error || e?.message || "تعذر إعادة الطلب";
          alert(msg);
        },
      },
    );
  }

  return (
    <AppLayout>
      <PageHeader title="طلباتي" subtitle="تتبّع تنفيذ خدماتك لحظياً" back="/account" />

      <div className="px-5 pb-6 space-y-3">
        {/* Live status header */}
        <div className="fancy-card rounded-3xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-pink-800">
            <LivePill /> يتم التحديث تلقائياً كل 5 ثواني
          </div>
          <button
            onClick={refreshAll}
            className="rounded-xl p-1.5 text-pink-600 hover:bg-pink-50"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث برقم الطلب أو اسم المنتج..."
            className="w-full rounded-2xl border border-pink-200 bg-white pr-9 pl-9 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            const c = counts[t.id] ?? 0;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition border",
                  active
                    ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white border-transparent shadow"
                    : "bg-white border-pink-200 text-pink-700",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "mr-1.5 rounded-full text-[10px] px-1.5 py-0.5",
                    active ? "bg-white/25" : "bg-pink-100 text-pink-700",
                  )}
                >
                  {c}
                </span>
              </button>
            );
          })}
        </div>

        {ordersLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-3xl bg-pink-100/50 animate-pulse" />
            ))}
          </>
        )}

        {!ordersLoading && filtered.length === 0 && (
          <div className="text-center py-14">
            <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-pink-100 to-rose-100">
              <ShoppingBag className="w-10 h-10 text-pink-500" />
            </div>
            <div className="mt-4 font-extrabold text-pink-900">
              {search || tab !== "all" ? "لا توجد نتائج مطابقة" : "لم تقم بأي طلب بعد"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {search || tab !== "all" ? "جرّب فلتر آخر" : "ابدأ بتصفح خدماتنا الرائعة"}
            </div>
            {!search && tab === "all" && (
              <Link href="/categories">
                <button className="mt-5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold px-6 py-3 shadow-lg active:scale-95">
                  تصفح الخدمات
                </button>
              </Link>
            )}
          </div>
        )}

        {filtered.map((o, i) => {
          const meta = STATUS_META[o.status] ?? STATUS_META.pending;
          const Icon = meta.icon;
          const isPending = o.status === "pending";
          return (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="fancy-card rounded-3xl p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => setOpenId(o.id)}
                  className="min-w-0 flex-1 text-right"
                >
                  <div className="font-bold text-pink-900 text-sm leading-tight">
                    {o.productName}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 truncate">
                    الهدف: {o.targetInfo}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    #{o.id} • {new Date(o.createdAt).toLocaleString("ar-EG")}
                  </div>
                  {o.notes && (
                    <div className="text-[11px] text-pink-700 mt-1.5 bg-pink-50/60 rounded-xl px-2 py-1 line-clamp-1">
                      {o.notes}
                    </div>
                  )}
                </button>
                <div className="text-left shrink-0">
                  <div className="text-lg font-extrabold text-pink-600">
                    {o.price} ج.س
                  </div>
                  <div
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-1",
                      meta.color,
                    )}
                  >
                    <Icon className="w-3 h-3" /> {meta.label}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setOpenId(o.id)}
                  className="flex-1 rounded-2xl py-2 text-xs font-bold bg-pink-50 text-pink-700 active:scale-95"
                >
                  تفاصيل وتتبّع
                </button>
                {isPending && (
                  <button
                    disabled={cancel.isPending}
                    onClick={() => onCancel(o.id)}
                    className="rounded-2xl px-3 py-2 text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200 active:scale-95 disabled:opacity-50 flex items-center gap-1"
                  >
                    <Ban className="w-3.5 h-3.5" /> إلغاء
                  </button>
                )}
                <button
                  disabled={reorder.isPending}
                  onClick={() => onReorder(o.id)}
                  className="rounded-2xl px-3 py-2 text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white active:scale-95 disabled:opacity-50 flex items-center gap-1"
                >
                  <Repeat className="w-3.5 h-3.5" /> طلب مرة أخرى
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <OrderTimelineDrawer
        orderId={openId}
        onClose={() => setOpenId(null)}
        onCancel={onCancel}
        cancelling={cancel.isPending}
      />
    </AppLayout>
  );
}

function OrderTimelineDrawer({
  orderId,
  onClose,
  onCancel,
  cancelling,
}: {
  orderId: number | null;
  onClose: () => void;
  onCancel: (id: number) => void;
  cancelling: boolean;
}) {
  const enabled = orderId != null;
  const { data: detail } = useGetMyOrder(orderId ?? 0, {
    query: {
      queryKey: getGetMyOrderQueryKey(orderId ?? 0),
      enabled,
      refetchInterval: enabled ? 4000 : false,
    },
  });

  const meta = detail ? STATUS_META[detail.status] ?? STATUS_META.pending : STATUS_META.pending;
  const Icon = meta.icon;

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[90vh] overflow-hidden bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
          >
            <div className="px-5 py-4 border-b border-pink-100 bg-gradient-to-l from-pink-50 to-white flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">طلب #{detail?.id ?? ""}</div>
                <div className="font-extrabold text-pink-900 truncate">
                  {detail?.productName ?? "..."}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-pink-50 text-pink-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="rounded-3xl bg-gradient-to-br from-pink-500 to-rose-600 text-white p-4 shadow">
                <div className="flex items-center gap-2 text-xs opacity-95">
                  <LivePill label="مباشر" />
                  <Icon className="w-3.5 h-3.5" /> {meta.label}
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] opacity-80">السعر</div>
                    <div className="text-2xl font-black">{detail?.price ?? "—"} ج.س</div>
                  </div>
                  <div className="text-[10px] opacity-80 text-left">
                    {detail && new Date(detail.createdAt).toLocaleString("ar-EG")}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-pink-50/60 border border-pink-100 p-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-pink-700">الهدف</span>
                  <span className="font-bold text-pink-900 truncate ml-2">
                    {detail?.targetInfo}
                  </span>
                </div>
                {detail?.notes && (
                  <div className="flex justify-between">
                    <span className="text-pink-700">ملاحظاتك</span>
                    <span className="font-bold text-pink-900 truncate ml-2">
                      {detail.notes}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-extrabold text-pink-900 mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-pink-500" /> سجل الحالة
                </div>
                <div className="space-y-2">
                  {(detail?.events ?? []).map((e) => {
                    const m = STATUS_META[e.status] ?? STATUS_META.pending;
                    const I = m.icon;
                    return (
                      <div
                        key={e.id}
                        className="flex gap-3 items-start rounded-2xl bg-pink-50/40 p-3"
                      >
                        <div className={cn("p-1.5 rounded-xl", m.color)}>
                          <I className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-pink-900">
                            {m.label}
                          </div>
                          {e.message && (
                            <div className="text-[11px] text-pink-700/80 mt-0.5">
                              {e.message}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(e.createdAt).toLocaleString("ar-EG")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(detail?.events?.length ?? 0) === 0 && (
                    <div className="rounded-2xl bg-pink-50/40 p-3 text-center text-xs text-muted-foreground">
                      لا توجد تحديثات إضافية بعد
                    </div>
                  )}
                </div>
              </div>

              {detail?.status === "pending" && (
                <button
                  disabled={cancelling}
                  onClick={() => detail && onCancel(detail.id)}
                  className="w-full rounded-2xl py-3 text-sm font-bold bg-pink-100 text-pink-700 border border-pink-200 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Ban className="w-4 h-4" /> إلغاء واسترداد المبلغ
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
