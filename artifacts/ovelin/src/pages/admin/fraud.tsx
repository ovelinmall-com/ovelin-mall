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

type Flag = { id: number; userId: number | null; username: string | null; ip: string | null; reason: string; severity: number; details: string; resolved: boolean; createdAt: string };

export default function AdminFraud() {
  const [, setLocation] = useLocation();
  const [flags, setFlags] = useState<Flag[]>([]);

  function load() {
    api<Flag[]>("/api/admin/fraud").then(setFlags).catch(() => setLocation("/admin/login"));
  }
  useEffect(load, []);

  async function resolve(id: number) { await api(`/api/admin/fraud/${id}/resolve`, { method: "POST" }); showToast("تم", "success"); load(); }
  async function block(id: number) { if (!confirm("حظر المستخدم؟")) return; await api(`/api/admin/fraud/${id}/block-user`, { method: "POST" }); showToast("تم الحظر", "success"); load(); }

  return (
    <div className="min-h-[100dvh] pb-20">
      <div className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-pink-700">🛡️ كشف الاحتيال</h1>
        <button onClick={() => setLocation("/admin")} className="text-pink-500 text-sm">رجوع</button>
      </div>

      <div className="px-4 space-y-2">
        {flags.length === 0 && <div className="text-center text-zinc-500 py-8">لا توجد إنذارات</div>}
        {flags.map((f) => (
          <div key={f.id} className={`rounded-xl p-3 border ${f.resolved ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-200" : f.severity >= 3 ? "bg-red-50 dark:bg-red-900/20 border-red-200" : f.severity >= 2 ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200" : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200"}`}>
            <div className="flex justify-between items-start text-xs">
              <div>
                <div className="font-bold">
                  {"⚠️".repeat(f.severity)} {f.reason}
                </div>
                <div className="text-zinc-600 mt-0.5">
                  {f.username && `@${f.username} · `}{f.ip && `IP ${f.ip}`}
                </div>
                <div className="text-zinc-500 mt-1">{f.details}</div>
                <div className="text-zinc-400 text-[10px] mt-1">{new Date(f.createdAt).toLocaleString("ar-EG")}</div>
              </div>
              {!f.resolved && (
                <div className="flex flex-col gap-1">
                  <button onClick={() => resolve(f.id)} className="px-2 py-1 rounded bg-green-500 text-white text-[10px]">حل</button>
                  {f.userId && <button onClick={() => block(f.id)} className="px-2 py-1 rounded bg-red-500 text-white text-[10px]">حظر</button>}
                </div>
              )}
              {f.resolved && <span className="text-green-600 text-xs">✓ تم</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
