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
import { Link } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Product = { id: number; name: string; price: string; imageUrl: string | null; category: string };

export function Recommendations({ title = "موصى لك", source = "for-me", productId }: { title?: string; source?: "for-me" | "trending" | "also-bought"; productId?: number }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    let url = "/api/recommendations/trending";
    if (source === "for-me" && user) url = "/api/recommendations/for-me";
    else if (source === "also-bought" && productId) url = `/api/recommendations/also-bought/${productId}`;
    api<any>(url).then((res) => {
      setItems(Array.isArray(res) ? res : (res.products ?? []));
    }).catch(() => setItems([]));
  }, [source, productId, user?.id]);

  if (!items.length) return null;
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-pink-700 dark:text-pink-300">{title}</h3>
        <span className="text-xs text-pink-500">⚡ مدعوم بالذكاء الاصطناعي</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x">
        {items.map((p) => (
          <Link key={p.id} href={`/product/${p.id}`} className="snap-start shrink-0 w-32">
            <div className="rounded-xl overflow-hidden bg-white dark:bg-zinc-900 border border-pink-100 dark:border-pink-900/30 shadow-sm hover:shadow-md transition">
              <div className="aspect-square bg-gradient-to-br from-pink-100 to-pink-50 flex items-center justify-center">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-3xl">🎁</span>}
              </div>
              <div className="p-2">
                <div className="text-xs font-medium line-clamp-2 leading-tight">{p.name}</div>
                <div className="text-pink-600 font-bold text-sm mt-1">{Number(p.price).toFixed(2)}$</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
