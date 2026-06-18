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
import { Link, useLocation } from "wouter";
import { api } from "@/lib/api";
import { formatSDG } from "@/lib/utils";
import { CountdownTimer } from "@/components/CountdownTimer";

type Sale = { id: number; productId: number; productName: string; price: string; imageUrl: string | null; discountPct: number; endsAt: string };

export default function FlashPage() {
  const [, setLocation] = useLocation();
  const [sales, setSales] = useState<Sale[]>([]);
  useEffect(() => {
    const load = () => api<Sale[]>("/api/flash-sales/active").then(setSales).catch(() => setSales([]));
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-[100dvh] pb-20">
      <div className="px-4 py-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-pink-700 dark:text-pink-300">⚡ العروض السريعة</h1>
        <button onClick={() => setLocation("/")} className="text-pink-500 text-sm">رجوع</button>
      </div>

      {!sales.length ? (
        <div className="text-center py-12 text-zinc-500">
          <div className="text-5xl mb-3">🌸</div>
          لا توجد عروض سريعة حالياً<br />تابعنا للحصول على آخر العروض
        </div>
      ) : (
        <div className="px-4 grid grid-cols-2 gap-3">
          {sales.map((s) => {
            const finalNum = Number(s.price) * (100 - s.discountPct) / 100;
            return (
              <Link key={s.id} href={`/product/${s.productId}`} className="fancy-card dark:bg-zinc-900 rounded-2xl overflow-hidden dark:border-pink-900/30">
                <div className="aspect-square bg-gradient-to-br from-pink-100 to-pink-50 relative">
                  {s.imageUrl ? <img src={s.imageUrl} alt={s.productName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl">🔥</div>}
                  <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">-{s.discountPct}%</div>
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm line-clamp-2 leading-tight">{s.productName}</div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-bold text-pink-600">{formatSDG(finalNum)} ج.س</span>
                    <span className="text-xs line-through text-zinc-400">{formatSDG(Number(s.price))}</span>
                  </div>
                  <div className="mt-2"><CountdownTimer endsAt={s.endsAt} /></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
