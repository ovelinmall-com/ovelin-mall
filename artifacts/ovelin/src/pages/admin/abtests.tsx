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

export default function AdminAbTests() {
  const [, setLocation] = useLocation();
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ key: "", description: "", variants: "A,B" });

  function load() { api<any[]>("/api/admin/abtests").then(setList).catch(() => setLocation("/admin/login")); }
  useEffect(load, []);

  async function create() {
    if (!form.key) { showToast("اكتب المفتاح", "error"); return; }
    await api("/api/admin/abtests", { method: "POST", body: JSON.stringify({ key: form.key, description: form.description, variants: form.variants.split(",").map((v) => v.trim()).filter(Boolean), active: true }) });
    showToast("تمت الإضافة", "success"); load();
    setForm({ key: "", description: "", variants: "A,B" });
  }

  return (
    <div className="min-h-[100dvh] pb-20">
      <div className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-pink-700">🧪 اختبارات A/B</h1>
        <button onClick={() => setLocation("/admin")} className="text-pink-500 text-sm">رجوع</button>
      </div>

      <div className="mx-4 bg-white dark:bg-zinc-900 rounded-2xl p-3 mb-3 space-y-2">
        <input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="مفتاح الاختبار (مثل: hero_cta)" className="w-full px-3 py-2 rounded-lg bg-pink-50 dark:bg-zinc-800 text-sm" />
        <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="الوصف" className="w-full px-3 py-2 rounded-lg bg-pink-50 dark:bg-zinc-800 text-sm" />
        <input value={form.variants} onChange={(e) => setForm({ ...form, variants: e.target.value })} placeholder="المتغيرات (مفصولة بفاصلة)" className="w-full px-3 py-2 rounded-lg bg-pink-50 dark:bg-zinc-800 text-sm" />
        <button onClick={create} className="w-full py-2 rounded-full bg-pink-500 text-white font-bold text-sm">إنشاء اختبار</button>
      </div>

      <div className="px-4 space-y-3">
        {list.map((t) => {
          const total = t.breakdown.reduce((s: number, b: any) => s + b.total, 0);
          return (
            <div key={t.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-3">
              <div className="font-bold text-sm">{t.key} {t.active && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full mr-1">نشط</span>}</div>
              <div className="text-xs text-zinc-500 mb-2">{t.description}</div>
              <div className="space-y-1">
                {t.breakdown.map((b: any) => {
                  const cr = b.total > 0 ? (b.conversions / b.total * 100).toFixed(1) : "0";
                  return (
                    <div key={b.variant} className="text-xs flex items-center gap-2">
                      <span className="font-bold w-12">{b.variant}</span>
                      <div className="flex-1 h-4 bg-pink-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500" style={{ width: `${total > 0 ? (b.total / total * 100) : 0}%` }} />
                      </div>
                      <span>{b.total} ({cr}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
