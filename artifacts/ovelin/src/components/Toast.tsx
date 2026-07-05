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
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, Sparkles } from "lucide-react";

type Toast = {
  id: number;
  type: "success" | "error" | "info" | "celebrate";
  title: string;
  message?: string;
};

let counter = 0;
const listeners = new Set<(t: Toast) => void>();

export function toast(t: Omit<Toast, "id">) {
  const item: Toast = { ...t, id: ++counter };
  listeners.forEach((l) => l(item));
}

export function showToast(
  message: string,
  type: "success" | "error" | "info" | "celebrate" = "info",
) {
  toast({ type, title: message });
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const fn = (t: Toast) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, 4500);
    };
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const ICONS = {
    success: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    error: <AlertCircle className="w-5 h-5 text-pink-600" />,
    info: <Info className="w-5 h-5 text-pink-600" />,
    celebrate: <Sparkles className="w-5 h-5 text-amber-500" />,
  };
  const COLORS = {
    success: "border-green-200 bg-green-50",
    error: "border-pink-200 bg-white",
    info: "border-pink-200 bg-white",
    celebrate:
      "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-white",
  };

  return (
    <div className="fixed top-3 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
      <div className="w-full max-w-sm space-y-2">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ y: -30, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -30, opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className={`pointer-events-auto rounded-2xl border ${COLORS[t.type]} shadow-[0_15px_40px_-10px_rgba(190,24,93,0.35)] p-3 flex gap-3 items-start backdrop-blur`}
            >
              <div className="shrink-0 mt-0.5">{ICONS[t.type]}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-pink-900">
                  {t.title}
                </div>
                {t.message && (
                  <div className="text-[11px] text-pink-700/80 mt-0.5">
                    {t.message}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
