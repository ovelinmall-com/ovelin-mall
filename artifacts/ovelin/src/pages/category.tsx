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

import { useState } from "react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Tag } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useListProducts } from "@workspace/api-client-react";
import { CATEGORY_META, PLATFORM_META } from "@/lib/categoryMeta";
import { cn } from "@/lib/utils";

export default function CategoryPage() {
  const [, params] = useRoute("/category/:slug");
  const slug = params?.slug ?? "";
  const meta = CATEGORY_META[slug];
  const [platform, setPlatform] = useState<string | null>(null);
  const showPlatformTabs = slug === "social_followers";

  const { data: products, isLoading } = useListProducts({
    category: slug,
    ...(showPlatformTabs && platform ? { platform } : {}),
  });

  const platforms =
    slug === "social_followers"
      ? ["instagram", "facebook", "twitter", "youtube"]
      : [];

  return (
    <AppLayout>
      <PageHeader title={meta?.name ?? "القسم"} subtitle={meta?.tag} />

      {showPlatformTabs && (
        <div className="px-4 mb-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 w-max py-1">
            {/* "All" button */}
            <button
              onClick={() => setPlatform(null)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all",
                platform === null
                  ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md scale-105"
                  : "bg-white border border-pink-100 text-pink-600 shadow-sm",
              )}
            >
              الكل
            </button>

            {platforms.map((p) => {
              const pmeta = PLATFORM_META[p];
              if (!pmeta) return null;
              const Icon = pmeta.icon;
              const active = platform === p;
              return (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all border shadow-sm",
                    active
                      ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow-md scale-105"
                      : `${pmeta.bgColor} ${pmeta.borderColor} ${pmeta.color}`,
                  )}
                >
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5",
                      active ? "text-white" : pmeta.iconColor,
                    )}
                  />
                  {pmeta.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-5 pb-6 space-y-3">
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-3xl bg-pink-100/50 animate-pulse"
              />
            ))}
          </>
        )}

        {!isLoading && products && products.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block p-4 rounded-full bg-pink-100">
              <Tag className="w-8 h-8 text-pink-500" />
            </div>
            <div className="mt-3 font-bold text-pink-900">
              لا توجد خدمات حالياً
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              جرّب قسماً آخر أو عُد لاحقاً
            </div>
          </div>
        )}

        {(products ?? []).map((p, i) => {
          const pmeta = p.platform ? PLATFORM_META[p.platform] : null;
          const PIcon = pmeta?.icon;
          return (
            <motion.div
              key={p.id}
              transition={{ delay: i * 0.03 }}
            >
              <Link href={`/product/${p.id}`}>
                <div className="fancy-card rounded-3xl active:scale-[0.98] transition overflow-hidden">
                  {/* Top colored banner */}
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 pt-4 pb-3",
                      pmeta
                        ? `${pmeta.bgColor}`
                        : "bg-gradient-to-l from-pink-50 via-rose-50 to-pink-100",
                    )}
                  >
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md",
                        pmeta
                          ? `bg-white/70 border ${pmeta.borderColor}`
                          : "bg-white border border-pink-200",
                      )}
                    >
                      {PIcon ? (
                        <PIcon className={cn("w-7 h-7", pmeta?.iconColor)} />
                      ) : (
                        meta && <meta.icon className="w-7 h-7 text-pink-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="font-extrabold text-[14px] text-pink-950 leading-snug flex-1 line-clamp-2">
                          {p.name}
                        </div>
                        {p.badge && (
                          <span className="text-[9px] font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-full px-2 py-0.5 shrink-0 mt-0.5">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-pink-700/70 line-clamp-2 mt-1 leading-relaxed">
                        {p.description}
                      </div>
                    </div>
                  </div>

                  {/* Bottom info bar */}
                  <div className="px-4 py-3 flex items-center justify-between border-t border-pink-50">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "text-xl font-black leading-none",
                          pmeta ? pmeta.color : "text-pink-600",
                        )}
                      >
                        ${p.price}
                      </div>
                      {p.oldPrice && (
                        <div className="text-[11px] text-muted-foreground line-through">
                          ${p.oldPrice}
                        </div>
                      )}
                      {p.oldPrice && (
                        <span className="text-[9px] font-bold bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
                          خصم
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[10px] text-pink-400 font-semibold">
                        <span className="text-amber-400">★★★★★</span>
                      </div>
                      <div
                        className={cn(
                          "rounded-full px-3 py-1.5 text-[11px] font-bold flex items-center gap-1",
                          pmeta
                            ? `${pmeta.bgColor} ${pmeta.color} border ${pmeta.borderColor}`
                            : "bg-gradient-to-l from-pink-600 to-rose-600 text-white shadow-md",
                        )}
                      >
                        اطلب الآن
                        <ArrowLeft className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </AppLayout>
  );
}
