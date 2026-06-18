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
import { formatSDG } from "@/lib/utils";

type Item = { id: number; productId: number; productName: string; price: string; imageUrl: string | null; qty: number; targetInfo: string; recoveryCouponCode: string | null };

export default function CartPage() {
  const { user, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [items, setItems] = useState<Item[]>([]);
  const [coupon, setCoupon] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    api<Item[]>("/api/cart").then(setItems).catch(() => { /* ignore */ });
  }
  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    load();
  }, [user?.id]);

  // Pre-fill coupon if there's an abandoned-cart code attached
  useEffect(() => {
    const withCoupon = items.find((i) => i.recoveryCouponCode);
    if (withCoupon && !coupon) setCoupon(withCoupon.recoveryCouponCode || "");
  }, [items]);

  async function remove(id: number) {
    await api(`/api/cart/${id}`, { method: "DELETE" });
    load();
  }

  async function checkout() {
    if (!items.length) return;
    setLoading(true);
    try {
      const res = await api<{ orders: number[]; final: number }>("/api/cart/checkout", {
        method: "POST", body: JSON.stringify({ couponCode: coupon || undefined }),
      });
      showToast(`✅ تم إنشاء ${res.orders.length} طلب`, "success");
      refresh();
      setLocation("/orders");
    } catch (e: any) {
      showToast(e.message || "خطأ", "error");
    } finally { setLoading(false); }
  }

  const total = items.reduce((s, i) => s + Number(i.price) * i.qty, 0);

  return (
    <div className="min-h-[100dvh] pb-32">
      <div className="px-4 py-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-pink-700 dark:text-pink-300">🛒 سلة التسوق</h1>
        <button onClick={() => setLocation("/")} className="text-pink-500 text-sm">رجوع</button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <div className="text-5xl mb-3">🛒</div>
          سلتك فارغة
          <div className="mt-4">
            <button onClick={() => setLocation("/categories")} className="px-5 py-2 rounded-full bg-pink-500 text-white text-sm">تصفح المنتجات</button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 space-y-2">
            {items.map((it) => (
              <div key={it.id} className="fancy-card dark:bg-zinc-900 rounded-2xl p-3 flex gap-3 dark:border-pink-900/30">
                {it.imageUrl ? <img src={it.imageUrl} alt={it.productName} className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 rounded-xl bg-pink-100 flex items-center justify-center text-2xl">📦</div>}
                <div className="flex-1">
                  <div className="font-medium text-sm line-clamp-2">{it.productName}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{it.targetInfo}</div>
                  <div className="text-pink-600 font-bold mt-1">{formatSDG(it.price)} ج.س × {it.qty}</div>
                </div>
                <button onClick={() => remove(it.id)} className="text-red-500 text-lg self-start">✕</button>
              </div>
            ))}
          </div>

          <div className="px-4 mt-4">
            <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="كود خصم" className="w-full px-3 py-2.5 rounded-full bg-white dark:bg-zinc-900 border border-pink-200 dark:border-pink-900 text-sm" />
          </div>

          <div className="fancy-card fixed bottom-0 left-0 right-0 max-w-md mx-auto dark:bg-zinc-950 border-t border-pink-100 dark:border-pink-900 p-4">
            <div className="flex justify-between mb-3">
              <span className="text-sm text-zinc-600">الإجمالي</span>
              <span className="font-bold text-pink-600 text-lg">{formatSDG(total)} ج.س</span>
            </div>
            <button onClick={checkout} disabled={loading} className="w-full py-3 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold disabled:opacity-50">
              {loading ? "جاري التأكيد..." : "تأكيد الطلب"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
