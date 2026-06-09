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

import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useListCategories } from "@workspace/api-client-react";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categoryMeta";

export default function Categories() {
  const { data: categories } = useListCategories();
  const sorted = [...(categories ?? [])].sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.slug) - CATEGORY_ORDER.indexOf(b.slug),
  );

  return (
    <AppLayout>
      <PageHeader
        title="جميع الأقسام"
        subtitle="اختر القسم الذي يناسبك"
      />
      <div className="px-5 pt-2 pb-6 space-y-4">
        {sorted.map((cat, i) => {
          const meta = CATEGORY_META[cat.slug];
          if (!meta) return null;
          const Icon = meta.icon;
          return (
            <motion.div
              key={cat.slug}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href={`/category/${cat.slug}`}>
                <div className="group relative overflow-hidden rounded-3xl h-48 shadow-[0_15px_40px_-12px_rgba(190,24,93,0.55)] ring-1 ring-pink-200/60 active:scale-[0.98] transition">
                  <img
                    src={meta.image}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-l from-pink-950/85 via-pink-900/55 to-pink-900/10" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-25 mix-blend-overlay`} />

                  <div className="relative h-full flex items-center gap-4 p-5 text-white">
                    <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 shadow-lg">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-base drop-shadow-lg">{cat.name}</div>
                      <div className="text-[11px] opacity-90 mt-0.5 line-clamp-2">
                        {cat.description}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 px-2 py-0.5 text-[10px] font-bold">
                        {cat.productCount} خدمة • {meta.tag}
                      </div>
                    </div>
                    <div className="rounded-full bg-white/95 text-pink-700 p-2 shadow-md">
                      <ArrowLeft className="w-4 h-4" />
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
