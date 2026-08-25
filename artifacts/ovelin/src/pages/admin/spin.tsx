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

const COLORS = ["#ec4899", "#ec4899", "#ec4899", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

export default function AdminSpin() {
  const [, setLocation] = useLocation();
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ label: "", type: "balance", value: "1", weight: "10", color: COLORS[0], couponCode: "" });

  function load() { api<any[]>("/api/admin/spin/prizes").then(setList).catch(() => setLocation("/admin/login")); }
  useEffect(load, []);

  async function create() {
    if (!form.label) { showToast("اكتب عنوان الجائزة", "error"); return; }
    await api("/api/admin/spin/prizes", { method: "POST", body: JSON.stringify(form) });
    showToast("أضيفت", "success"); load();
    setForm({ label: "", type: "balance", value: "1", weight: "10", color: COLORS[0], couponCode: "" });
  }
  async function del(id: number) { await api(`/api/admin/spin/prizes/${id}`, { method: "DELETE" }); load(); }
  async function toggle(id: number, active: boolean) { await api(`/api/admin/spin/prizes/${id}`, { method: "PUT", body: JSON.stringify({ active: !active }) }); load(); }

  return (
    <div className="min-h-[100dvh] pb-20">
      <div className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-pink-700">🎡 جوائز عجلة الحظ</h1>
        <button onClick={() => setLocation("/admin")} className="text-pink-500 text-sm">رجوع</button>
      </div>

      <div className="mx-4 bg-white dark:bg-zinc-900 rounded-2xl p-3 mb-3 space-y-2">
        <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="اسم الجائزة" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 text-sm" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 text-sm">
          <option value="balance">رصيد محفظة</option>
          <option value="cashback">كاش باك</option>
          <option value="points">نقاط ولاء</option>
          <option value="coupon">كوبون خصم</option>
          <option value="empty">حظاً أوفر</option>
        </select>
        <div className="flex gap-2">
          <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="القيمة" className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 text-sm" />
          <input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} type="number" placeholder="الوزن" className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 text-sm" />
        </div>
        {form.type === "coupon" && <input value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value })} placeholder="كود الكوبون" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 text-sm" />}
        <div className="flex gap-1 flex-wrap">
          {COLORS.map((c) => <button key={c} onClick={() => setForm({ ...form, color: c })} className={`w-7 h-7 rounded-full border-2 ${form.color === c ? "border-zinc-900 dark:border-white" : "border-transparent"}`} style={{ background: c }} />)}
        </div>
        <button onClick={create} className="w-full py-2 rounded-full bg-pink-500 text-white font-bold text-sm">إضافة</button>
      </div>

      <div className="px-4 space-y-2">
        {list.map((p) => (
          <div key={p.id} className="bg-white dark:bg-zinc-900 rounded-xl p-3 text-xs flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full" style={{ background: p.color }} />
              <div>
                <div className="font-bold">{p.label}</div>
                <div className="text-zinc-500">{p.type} · قيمة {p.value} · وزن {p.weight}</div>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggle(p.id, p.active)} className={`px-2 py-1 rounded text-[10px] ${p.active ? "bg-green-500 text-white" : "bg-zinc-300 text-zinc-700"}`}>{p.active ? "نشط" : "موقف"}</button>
              <button onClick={() => del(p.id)} className="text-red-500">حذف</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
