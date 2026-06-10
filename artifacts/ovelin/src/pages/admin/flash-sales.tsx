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
import { showToast } from "@/components/Toast";

export default function AdminFlashSales() {
  const [, setLocation] = useLocation();
  const [list, setList] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState("");
  const [discountPct, setDiscount] = useState("20");
  const [duration, setDuration] = useState("60");

  function load() {
    api<any[]>("/api/admin/flash-sales").then(setList).catch(() => setLocation("/admin/login"));
    api<any[]>("/api/products").then(setProducts).catch(() => { /* ignore */ });
  }
  useEffect(load, []);

  async function create() {
    if (!productId) return;
    try {
      await api("/api/admin/flash-sales", { method: "POST", body: JSON.stringify({ productId: Number(productId), discountPct: Number(discountPct), durationMinutes: Number(duration) }) });
      showToast("تم إنشاء العرض", "success"); load();
    } catch (e: any) { showToast(e.message, "error"); }
  }
  async function del(id: number) {
    await api(`/api/admin/flash-sales/${id}`, { method: "DELETE" }); load();
  }

  return (
    <div className="min-h-[100dvh] pb-20">
      <div className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-pink-700">⚡ العروض السريعة</h1>
        <button onClick={() => setLocation("/admin")} className="text-pink-500 text-sm">رجوع</button>
      </div>

      <div className="mx-4 bg-white dark:bg-zinc-900 rounded-2xl p-3 mb-3 space-y-2">
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-pink-50 dark:bg-zinc-800 text-sm">
          <option value="">اختر منتج</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input value={discountPct} onChange={(e) => setDiscount(e.target.value)} type="number" placeholder="الخصم %" className="flex-1 px-3 py-2 rounded-lg bg-pink-50 dark:bg-zinc-800 text-sm" />
          <input value={duration} onChange={(e) => setDuration(e.target.value)} type="number" placeholder="المدة (د)" className="flex-1 px-3 py-2 rounded-lg bg-pink-50 dark:bg-zinc-800 text-sm" />
        </div>
        <button onClick={create} className="w-full py-2 rounded-full bg-pink-500 text-white font-bold text-sm">إنشاء</button>
      </div>

      <div className="px-4 space-y-2">
        {list.map((s) => (
          <div key={s.id} className="bg-white dark:bg-zinc-900 rounded-xl p-3 text-xs flex justify-between items-center">
            <div>
              <div className="font-bold">{s.productName}</div>
              <div className="text-zinc-500">خصم {s.discount_pct}% · ينتهي {new Date(s.ends_at).toLocaleString("ar-EG")}</div>
              <div className={`mt-1 inline-block px-2 py-0.5 rounded-full ${s.active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>{s.active ? "نشط" : "منتهي"}</div>
            </div>
            {s.active && <button onClick={() => del(s.id)} className="text-red-500">إيقاف</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
