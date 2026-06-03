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

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Wrench, Activity } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { LivePill } from "@/components/LiveDot";
import { cn } from "@/lib/utils";

const API = (import.meta.env.BASE_URL || "/") + "api";

type StatusComponent = {
  id: number;
  name: string;
  status: "operational" | "degraded" | "outage" | "maintenance";
  description: string;
  updatedAt: string;
};
type StatusResp = {
  overall: "operational" | "degraded" | "outage";
  components: StatusComponent[];
};

const STATUS_META = {
  operational: { label: "يعمل", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2, dot: "bg-green-500" },
  degraded: { label: "بطء أداء", color: "text-amber-600 bg-amber-50 border-amber-200", icon: AlertTriangle, dot: "bg-amber-500" },
  outage: { label: "متوقف", color: "text-pink-600 bg-pink-50 border-pink-200", icon: XCircle, dot: "bg-pink-500" },
  maintenance: { label: "صيانة", color: "text-blue-600 bg-blue-50 border-blue-200", icon: Wrench, dot: "bg-blue-500" },
};

export default function StatusPage() {
  const { data } = useQuery({
    queryKey: ["status"],
    queryFn: async () => {
      const r = await fetch(`${API}/status`);
      if (!r.ok) return { overall: "operational", components: [] } as StatusResp;
      return (await r.json()) as StatusResp;
    },
    refetchInterval: 15000,
  });

  const overall = data?.overall ?? "operational";
  const components = data?.components ?? [];
  const overallMeta = STATUS_META[overall as keyof typeof STATUS_META] ?? STATUS_META.operational;

  return (
    <AppLayout>
      <PageHeader title="حالة الخدمة" subtitle="الوضع التشغيلي مباشر" back="/account" />

      <div className="px-5 space-y-3 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-3xl p-5 border-2 shadow-sm flex items-center gap-3",
            overallMeta.color
          )}
        >
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white", overallMeta.dot)}>
            <overallMeta.icon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold">
              {overall === "operational" && "كل الأنظمة تعمل بشكل مثالي"}
              {overall === "degraded" && "بعض الخدمات تعاني من بطء"}
              {overall === "outage" && "هناك انقطاع في إحدى الخدمات"}
            </div>
            <div className="text-xs opacity-80 mt-0.5 flex items-center gap-2">
              تحديث مباشر <LivePill />
            </div>
          </div>
        </motion.div>

        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 text-sm mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-pink-600" /> مكونات النظام
          </div>
          <div className="space-y-2">
            {components.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground">جارِ التحميل...</div>
            )}
            {components.map((c) => {
              const meta = STATUS_META[c.status as keyof typeof STATUS_META] ?? STATUS_META.operational;
              const Icon = meta.icon;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl border border-pink-100 p-3 flex items-center gap-3"
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", meta.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-pink-900 truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1">{c.description}</div>
                  </div>
                  <div className={cn("text-[10px] font-bold px-2 py-1 rounded-lg shrink-0", meta.color)}>
                    {meta.label}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="text-center text-[10px] text-muted-foreground">
          يتم تحديث الحالة كل 15 ثانية تلقائياً
        </div>
      </div>
    </AppLayout>
  );
}
