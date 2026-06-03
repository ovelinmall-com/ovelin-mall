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
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X, Check, AlertCircle } from "lucide-react";
import { useChangePassword } from "@workspace/api-client-react";

export function ChangePasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const change = useChangePassword();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (next.length < 4) return setErr("كلمة المرور قصيرة (4 أحرف على الأقل)");
    if (next !== confirm) return setErr("تأكيد كلمة المرور غير مطابق");
    change.mutate(
      { data: { currentPassword: current, newPassword: next } },
      {
        onSuccess: () => {
          setDone(true);
          setCurrent("");
          setNext("");
          setConfirm("");
          setTimeout(() => {
            setDone(false);
            onClose();
          }, 1400);
        },
        onError: (e: any) => {
          const msg =
            e?.data?.error || e?.message || "تعذر تغيير كلمة المرور";
          setErr(String(msg));
        },
      },
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.form
            onSubmit={submit}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-pink-100 text-pink-600">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="font-extrabold text-pink-900">
                  تغيير كلمة المرور
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-pink-50 text-pink-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                placeholder="كلمة المرور الحالية"
                className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                placeholder="كلمة المرور الجديدة"
                className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="تأكيد كلمة المرور الجديدة"
                className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
              {err && (
                <div className="rounded-xl bg-pink-50 border border-pink-200 text-pink-700 text-xs p-2.5 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{err}</div>
                </div>
              )}
              {done && (
                <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs p-2.5 flex gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>تم تغيير كلمة المرور بنجاح</div>
                </div>
              )}
              <button
                type="submit"
                disabled={change.isPending}
                className="w-full rounded-2xl py-3 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 disabled:opacity-60"
              >
                {change.isPending ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
