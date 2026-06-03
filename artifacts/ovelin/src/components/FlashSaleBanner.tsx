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

import { memo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatSDG } from "@/lib/utils";
import { CountdownTimer } from "./CountdownTimer";

type Sale = { id: number; productId: number; productName: string; price: string; imageUrl: string | null; discountPct: number; endsAt: string };

// ✅ FIX: استبدلنا useState + useEffect + setInterval اليدوي بـ React Query
// React Query يوفر: caching تلقائي + deduplication + لا تكرار للطلبات
// كان قبلاً يُطلق نسختين مستقلتين من polling في كل مكوّن مثبَّت
export const FlashSaleBanner = memo(function FlashSaleBanner() {
  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ["flash-sales-active"],
    queryFn: () => api<Sale[]>("/api/flash-sales/active"),
    staleTime: 60_000,
    // ✅ FIX: رفع من 30s → 60s لتقليل طلبات الشبكة
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  if (!sales.length) return null;

  return (
    <div className="mx-4 my-3 rounded-2xl overflow-hidden bg-gradient-to-r from-pink-500 via-pink-600 to-pink-600 text-white shadow-lg shadow-pink-500/30">
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="font-bold text-sm">عرض سريع - خصم {sales[0].discountPct}%!</span>
        </div>
        <CountdownTimer endsAt={sales[0].endsAt} />
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 pb-3 pt-1 snap-x">
        {sales.slice(0, 6).map((s) => {
          const finalNum = Number(s.price) * (100 - s.discountPct) / 100;
          return (
            <Link key={s.id} href={`/product/${s.productId}`} className="snap-start shrink-0 w-28 bg-white/10 backdrop-blur rounded-xl overflow-hidden">
              <div className="aspect-square bg-white/10 flex items-center justify-center">
                {s.imageUrl ? <img src={s.imageUrl} alt={s.productName} className="w-full h-full object-cover" loading="lazy" /> : <span className="text-3xl">🔥</span>}
              </div>
              <div className="p-2">
                <div className="text-[10px] line-clamp-2 leading-tight">{s.productName}</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-bold text-xs">{formatSDG(finalNum)} ج.س</span>
                  <span className="text-[9px] line-through opacity-70">{formatSDG(Number(s.price))}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
});
