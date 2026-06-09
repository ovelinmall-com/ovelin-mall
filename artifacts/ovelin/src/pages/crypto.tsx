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
import { useAuth } from "@/lib/auth";
import { showToast } from "@/components/Toast";

type Currency = { code: string; label: string; icon: string };
type CryptoPay = { id: number; currency: string; network: string; address: string; amount: string; status: string; txHash: string | null };

export default function CryptoPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [my, setMy] = useState<CryptoPay[]>([]);
  const [currency, setCurrency] = useState("USDT");
  const [amount, setAmount] = useState("10");
  const [pending, setPending] = useState<CryptoPay | null>(null);
  const [tx, setTx] = useState("");

  useEffect(() => {
    api<Currency[]>("/api/crypto/currencies").then(setCurrencies);
    if (user) api<CryptoPay[]>("/api/crypto/my").then(setMy);
  }, [user?.id]);

  useEffect(() => { if (!user) setLocation("/login"); }, [user]);

  async function create() {
    try {
      const r = await api<CryptoPay>("/api/crypto/create", {
        method: "POST", body: JSON.stringify({ currency, amount: Number(amount) }),
      });
      setPending(r);
      api<CryptoPay[]>("/api/crypto/my").then(setMy);
    } catch (e: any) { showToast(e.message, "error"); }
  }

  async function submit() {
    if (!pending || !tx.trim()) return;
    await api(`/api/crypto/${pending.id}/submit-tx`, { method: "POST", body: JSON.stringify({ txHash: tx.trim() }) });
    showToast("تم إرسال الرقم المرجعي للمراجعة", "success");
    setPending(null); setTx("");
    api<CryptoPay[]>("/api/crypto/my").then(setMy);
  }

  return (
    <div className="min-h-[100dvh] pb-20">
      <div className="px-4 py-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-pink-700 dark:text-pink-300">💎 شحن بالعملات الرقمية</h1>
        <button onClick={() => setLocation("/wallet")} className="text-pink-500 text-sm">رجوع</button>
      </div>

      {!pending && (
        <div className="px-4 space-y-3">
          <div className="fancy-card dark:bg-zinc-900 rounded-2xl p-4 dark:border-pink-900/30">
            <label className="text-xs text-zinc-600 mb-1 block">العملة</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-pink-50 dark:bg-zinc-800">
              {currencies.map((c) => <option key={c.code} value={c.code}>{c.icon} {c.label}</option>)}
            </select>
            <label className="text-xs text-zinc-600 mt-3 mb-1 block">المبلغ</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" className="w-full px-3 py-2 rounded-lg bg-pink-50 dark:bg-zinc-800" />
            <button onClick={create} className="w-full mt-3 py-2.5 rounded-full bg-pink-500 text-white font-bold">إنشاء طلب شحن</button>
          </div>
        </div>
      )}

      {pending && (
        <div className="px-4 space-y-3">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-pink-200 dark:border-pink-900/40">
            <div className="text-sm text-zinc-700 dark:text-zinc-300 mb-2">أرسل المبلغ إلى العنوان التالي:</div>
            <div className="bg-pink-50 dark:bg-zinc-800 rounded-lg p-3 break-all text-xs font-mono">{pending.address}</div>
            <button onClick={() => navigator.clipboard.writeText(pending.address).then(() => showToast("نسخ العنوان", "success"))} className="mt-2 text-pink-600 text-xs">📋 نسخ العنوان</button>
            <div className="mt-3 text-xs text-zinc-600">الشبكة: <b>{pending.network}</b> · المبلغ: <b>{pending.amount} {pending.currency}</b></div>
            <input value={tx} onChange={(e) => setTx(e.target.value)} placeholder="رقم العملية (TX Hash)" className="w-full mt-3 px-3 py-2 rounded-lg bg-pink-50 dark:bg-zinc-800 text-sm" />
            <button onClick={submit} className="w-full mt-2 py-2 rounded-full bg-pink-500 text-white font-bold text-sm">إرسال للمراجعة</button>
          </div>
        </div>
      )}

      <div className="px-4 mt-6">
        <h3 className="text-sm font-bold text-pink-700 mb-2">سجل المعاملات</h3>
        {my.length === 0 ? <div className="text-xs text-zinc-500 text-center py-4">لا توجد معاملات</div> : (
          <div className="space-y-2">
            {my.map((m) => (
              <div key={m.id} className="fancy-card dark:bg-zinc-900 rounded-xl p-3 text-xs dark:border-pink-900/30">
                <div className="flex justify-between">
                  <span>{m.amount} {m.currency}</span>
                  <span className={`px-2 py-0.5 rounded-full ${m.status === "confirmed" ? "bg-green-100 text-green-700" : m.status === "rejected" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-700"}`}>
                    {m.status === "confirmed" ? "مؤكد" : m.status === "rejected" ? "مرفوض" : m.status === "submitted" ? "قيد المراجعة" : "بانتظار الدفع"}
                  </span>
                </div>
                {m.txHash && <div className="mt-1 font-mono text-[10px] truncate">{m.txHash}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
