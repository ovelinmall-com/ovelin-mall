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

import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Heart, Trash2, Sparkles, ShoppingBag, Star } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";

const API = (import.meta.env.BASE_URL || "/") + "api";

type Product = {
  id: number;
  name: string;
  description: string;
  price: string;
  oldPrice: string | null;
  category: string;
  platform: string;
  imageUrl?: string | null;
  badge?: string | null;
  ratingAvg: string;
  ratingCount: number;
};

export default function WishlistPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  const { data: items } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const r = await fetch(`${API}/wishlist`, { credentials: "include" });
      if (!r.ok) return [] as Product[];
      return (await r.json()) as Product[];
    },
    enabled: !!user,
  });

  const remove = useMutation({
    mutationFn: async (productId: number) => {
      await fetch(`${API}/wishlist/${productId}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const list = items ?? [];

  return (
    <AppLayout>
      <PageHeader title="مفضلتي" subtitle={`${list.length} عنصر`} back="/account" />

      <div className="px-5 space-y-3 pb-4">
        {list.length === 0 ? (
          <div className="fancy-card rounded-3xl p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-pink-400 mb-3">
              <Heart className="w-8 h-8" />
            </div>
            <div className="font-bold text-pink-900 mb-1">مفضلتك فارغة</div>
            <div className="text-xs text-muted-foreground mb-4">احفظ الخدمات التي تعجبك للرجوع إليها لاحقاً</div>
            <Link href="/categories">
              <button className="rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold px-5 py-2.5 shadow">
                <ShoppingBag className="w-4 h-4 inline -mt-0.5 ml-1" /> تصفح الأقسام
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {list.map((p) => (
              <motion.div
                key={p.id}
                className="fancy-card rounded-3xl p-3 relative overflow-hidden"
              >
                <button
                  onClick={() => remove.mutate(p.id)}
                  className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur border border-pink-200 flex items-center justify-center text-pink-500 active:scale-90 z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <Link href={`/product/${p.id}`}>
                  <div className="aspect-square rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-pink-400 mb-2 overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="w-10 h-10" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-pink-900 line-clamp-2 leading-tight">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{p.category}</div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-sm font-extrabold text-pink-600">{p.price} ج.س</div>
                    {p.ratingCount > 0 && (
                      <div className="flex items-center gap-0.5 text-[10px] text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-400" /> {p.ratingAvg}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
