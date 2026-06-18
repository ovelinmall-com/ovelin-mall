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
import { useRoute, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Clock,
  ShieldCheck,
  Zap,
  AlertCircle,
  Sparkles,
  ShoppingCart,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  useGetProduct,
  useCreateOrder,
  getGetWalletQueryKey,
  getListMyOrdersQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { formatSDG } from "@/lib/utils";
import { CATEGORY_META } from "@/lib/categoryMeta";
import { LiveViewers } from "@/components/LiveViewers";
import { Recommendations } from "@/components/Recommendations";
import { CountdownTimer } from "@/components/CountdownTimer";
import { trackProductView, track } from "@/lib/analytics";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { SubscriptionProductDetail } from "@/components/SubscriptionProductDetail";

export default function ProductPage() {
  const [, params] = useRoute("/product/:id");
  const id = parseInt(params?.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: product, isLoading } = useGetProduct(id);
  const createOrder = useCreateOrder();

  const [targetInfo, setTargetInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ price: number; discountPct: number; endsAt: string } | null>(null);
  const [dynamicPrice, setDynamicPrice] = useState<number | null>(null);
  const [addingCart, setAddingCart] = useState(false);

  const meta = product ? CATEGORY_META[product.category] : undefined;

  useEffect(() => {
    if (id) {
      trackProductView(id);
      api<any>(`/api/flash-sales/active`).then((rows) => {
        const row = (rows || []).find((r: any) => r.productId === id);
        if (row) setFlash({ price: Number(row.price) * (100 - row.discountPct) / 100, discountPct: row.discountPct, endsAt: row.endsAt });
      }).catch(() => { /* ignore */ });
      api<{ price: number | null }>(`/api/dynamic-pricing/${id}`).then((r) => {
        if (r.price != null) setDynamicPrice(r.price);
      }).catch(() => { /* ignore */ });
    }
  }, [id]);

  const effectivePrice = flash ? flash.price : (dynamicPrice ?? Number(product?.price ?? 0));

  async function addToCart() {
    if (!user) { setLocation("/login"); return; }
    if (!targetInfo.trim()) { setError("أدخل رابط أو معلومات الحساب"); return; }
    setError(null); setAddingCart(true);
    try {
      await api("/api/cart", { method: "POST", body: JSON.stringify({ productId: id, qty: 1, targetInfo: targetInfo.trim(), notes: notes.trim() || null }) });
      track("add_to_cart", { productId: id });
      showToast("✅ أضيف للسلة", "success");
    } catch (e: any) {
      setError(e?.message || "خطأ");
    } finally { setAddingCart(false); }
  }

  function submit() {
    setError(null);
    if (!user) {
      setLocation("/login");
      return;
    }
    if (!targetInfo.trim()) {
      setError("يرجى إدخال رابط أو معلومات الحساب");
      return;
    }
    createOrder.mutate(
      { data: { productId: id, targetInfo: targetInfo.trim(), notes: notes.trim() || undefined } },
      {
        onSuccess: (order) => {
          qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
          qc.invalidateQueries({ queryKey: getListMyOrdersQueryKey() });
          qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation(`/cart-success/${order.id}`);
        },
        onError: (e: unknown) => {
          const msg =
            (e as { response?: { data?: { error?: string } } })?.response?.data
              ?.error ?? "تعذر إنشاء الطلب";
          setError(msg);
        },
      },
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <PageHeader title="تفاصيل الخدمة" />
        <div className="px-5 space-y-3">
          <div className="h-40 rounded-3xl bg-pink-100/50 animate-pulse" />
          <div className="h-24 rounded-3xl bg-pink-100/50 animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <PageHeader title="غير موجود" />
        <div className="px-5 text-center py-10">
          <div className="text-pink-900 font-bold">الخدمة غير موجودة</div>
        </div>
      </AppLayout>
    );
  }

  // Subscription products get a dedicated premium page
  if (product.category === "app_subscriptions") {
    return (
      <AppLayout hideNav>
        <SubscriptionProductDetail product={product as any} />
      </AppLayout>
    );
  }

  const Icon = meta?.icon;

  return (
    <AppLayout>
      <PageHeader title={meta?.name ?? "الخدمة"} />

      <div className="px-5 space-y-4">
        {/* Hero */}
        <motion.div
          className={`relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br ${meta?.gradient ?? "from-pink-500 to-rose-600"} text-white shadow-[0_15px_40px_-10px_rgba(190,24,93,0.5)]`}
        >
          <div className="absolute -top-6 -left-6 w-32 h-32 bg-red-500/20 rounded-full blur-2xl" />
          {Icon && (
            <div className="inline-block p-3 rounded-2xl bg-white/20 backdrop-blur mb-3">
              <Icon className="w-7 h-7" />
            </div>
          )}
          <h2 className="text-xl font-extrabold leading-tight">
            {product.name}
          </h2>
          <p className="text-sm opacity-90 mt-1.5">{product.description}</p>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-[11px] opacity-80">السعر</div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-black leading-none">{formatSDG(effectivePrice)} <span className="text-base font-bold opacity-80">ج.س</span></div>
                {flash && <div className="text-sm line-through opacity-70">{formatSDG(product.price)} ج.س</div>}
              </div>
              {flash && (
                <div className="mt-1.5 inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-2 py-1">
                  <span className="text-[10px] font-bold">⚡ -{flash.discountPct}%</span>
                  <CountdownTimer endsAt={flash.endsAt} />
                </div>
              )}
            </div>
            {product.badge && (
              <div className="bg-white/20 backdrop-blur rounded-full text-xs font-bold px-3 py-1">
                {product.badge}
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <LiveViewers productId={id} />
          </div>
        </motion.div>

        {/* Specs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="fancy-card rounded-2xl p-3 text-center">
            <Clock className="w-5 h-5 text-pink-600 mx-auto" />
            <div className="text-[10px] mt-1 text-muted-foreground">التسليم</div>
            <div className="text-xs font-bold text-pink-900 mt-0.5">
              {product.deliveryTime ?? "خلال يوم"}
            </div>
          </div>
          {product.quantity ? (
            <div className="fancy-card rounded-2xl p-3 text-center">
              <Sparkles className="w-5 h-5 text-rose-600 mx-auto" />
              <div className="text-[10px] mt-1 text-muted-foreground">الكمية</div>
              <div className="text-xs font-bold text-pink-900 mt-0.5">
                {product.quantity}
              </div>
            </div>
          ) : (
            <div className="fancy-card rounded-2xl p-3 text-center">
              <Zap className="w-5 h-5 text-pink-500 mx-auto" />
              <div className="text-[10px] mt-1 text-muted-foreground">السرعة</div>
              <div className="text-xs font-bold text-pink-900 mt-0.5">سريع</div>
            </div>
          )}
          <div className="fancy-card rounded-2xl p-3 text-center">
            <ShieldCheck className="w-5 h-5 text-pink-500 mx-auto" />
            <div className="text-[10px] mt-1 text-muted-foreground">ضمان</div>
            <div className="text-xs font-bold text-pink-900 mt-0.5">100%</div>
          </div>
        </div>

        {/* Form */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 mb-3">بيانات التنفيذ</div>
          <label className="text-xs text-pink-800 font-semibold">
            رابط الحساب أو الكود
          </label>
          <input
            value={targetInfo}
            onChange={(e) => setTargetInfo(e.target.value)}
            placeholder="مثال: @ovelin أو https://..."
            className="mt-1 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          <label className="text-xs text-pink-800 font-semibold mt-3 block">
            ملاحظات (اختياري)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي تفاصيل إضافية تساعدنا"
            rows={3}
            className="mt-1 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
          />

          {error && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {!user ? (
            <Link href="/login">
              <button className="mt-4 w-full rounded-2xl py-3 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition">
                سجّل الدخول للطلب
              </button>
            </Link>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={addToCart}
                disabled={addingCart}
                className="col-span-1 rounded-2xl py-3 font-bold border-2 border-pink-500 text-pink-600 active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-1.5 text-xs"
              >
                <ShoppingCart className="w-4 h-4" /> {addingCart ? "..." : "للسلة"}
              </button>
              <button
                disabled={createOrder.isPending}
                onClick={submit}
                className="col-span-2 rounded-2xl py-3 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60"
              >
                {createOrder.isPending ? "جارٍ..." : `اطلب • ${formatSDG(effectivePrice)} ج.س`}
              </button>
            </div>
          )}
          {user && (
            <div className="text-[11px] text-center text-muted-foreground mt-2">
              سيتم خصم المبلغ من رصيدك. رصيدك:{" "}
              <span className="text-pink-600 font-bold">{formatSDG(user.balance)} ج.س</span>
            </div>
          )}
        </div>

        <Recommendations title="غالباً ما يُشترى معه" source="also-bought" productId={id} />
      </div>
    </AppLayout>
  );
}
