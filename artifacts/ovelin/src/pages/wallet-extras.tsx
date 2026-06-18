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

import { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, PiggyBank, Send, QrCode, Sparkles, FileText,
  Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, Loader2, X, RefreshCcw,
  Bitcoin, DollarSign, ChevronDown, ChevronUp, Lightbulb, Search,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatSDG } from "@/lib/utils";

const PIE_COLORS = ["#ec4899", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#06b6d4", "#84cc16"];
const POT_COLORS = [
  { id: "from-pink-400 to-rose-500", label: "وردي", swatch: "bg-gradient-to-br from-pink-400 to-rose-500" },
  { id: "from-pink-400 to-indigo-500", label: "بنفسجي", swatch: "bg-gradient-to-br from-pink-400 to-indigo-500" },
  { id: "from-amber-400 to-orange-500", label: "ذهبي", swatch: "bg-gradient-to-br from-amber-400 to-orange-500" },
  { id: "from-emerald-400 to-teal-500", label: "أخضر", swatch: "bg-gradient-to-br from-emerald-400 to-teal-500" },
  { id: "from-sky-400 to-blue-500", label: "أزرق", swatch: "bg-gradient-to-br from-sky-400 to-blue-500" },
  { id: "from-pink-400 to-red-500", label: "أحمر", swatch: "bg-gradient-to-br from-pink-400 to-red-500" },
];
const POT_EMOJIS = ["🐷", "✈️", "🎁", "📱", "👜", "🚗", "🏠", "💍", "🎓", "💎"];

type Ticker = { usdtSar: number; usdtUsd: number; btcUsd: number; ethUsd: number; updatedAt: string; source: string };
type Pot = { id: number; name: string; emoji: string; color: string; balance: string; target: string };
type Analytics = {
  daily: { day: string; inflow: number; outflow: number }[];
  byCategory: { category: string; total: number; count: number }[];
  byType: { type: string; total: number; count: number }[];
  totals: { inflow: number; outflow: number; net: number; balance: number; cashback: number; totalSpent: number };
  percentages: { savingsRate: number; cashbackRate: number; spendRatio: number };
};

export default function WalletExtras() {
  return (
    <div className="space-y-6 mt-6">
      <CurrencyTicker />
      <WalletAnalytics />
      <AiInsights />
      <WalletPots />
      <P2PSendQR />
      <PdfStatement />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Currency ticker
// ─────────────────────────────────────────────────────────────────
function CurrencyTicker() {
  const [t, setT] = useState<Ticker | null>(null);
  const load = async () => {
    try { setT(await api<Ticker>("/api/wallet/ticker")); } catch {}
  };
  useEffect(() => {
    load();
    const i = setInterval(load, 60000);
    return () => clearInterval(i);
  }, []);
  if (!t) return null;
  const items = [
    { label: "USDT/SAR", value: t.usdtSar.toFixed(2), icon: <DollarSign className="w-3.5 h-3.5" />, accent: "text-emerald-600" },
    { label: "USDT/USD", value: t.usdtUsd.toFixed(2), icon: <DollarSign className="w-3.5 h-3.5" />, accent: "text-emerald-600" },
    { label: "BTC/USD", value: "$" + Math.round(t.btcUsd).toLocaleString(), icon: <Bitcoin className="w-3.5 h-3.5" />, accent: "text-amber-600" },
    { label: "ETH/USD", value: "$" + Math.round(t.ethUsd).toLocaleString(), icon: <Bitcoin className="w-3.5 h-3.5" />, accent: "text-indigo-600" },
  ];
  return (
    <div className="fancy-card rounded-3xl overflow-hidden">
      <div className="px-4 py-2 flex items-center justify-between bg-gradient-to-l from-pink-50 to-rose-50">
        <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-pink-900">
          <RefreshCcw className="w-3.5 h-3.5 text-pink-500" />
          أسعار العملات لحظياً
        </div>
        <div className="text-[9px] text-pink-500">{t.source}</div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-pink-100" dir="ltr">
        {items.map((it) => (
          <div key={it.label} className="px-2 py-2.5 text-center">
            <div className={`flex items-center justify-center gap-0.5 text-[9px] font-bold ${it.accent}`}>
              {it.icon}{it.label}
            </div>
            <div className="font-extrabold text-[12px] text-pink-900 mt-0.5">{it.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Analytics with charts
// ─────────────────────────────────────────────────────────────────
function WalletAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const load = async (d: number) => {
    setLoading(true);
    try { setData(await api<Analytics>(`/api/wallet/analytics?days=${d}`)); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(days); }, [days]);

  const pie = useMemo(() => (data?.byCategory ?? []).filter((x) => x.total > 0).slice(0, 8), [data]);
  const bars = useMemo(() => (data?.daily ?? []).map((d) => ({
    day: d.day.slice(5),
    inflow: Number(d.inflow.toFixed(2)),
    outflow: Number(d.outflow.toFixed(2)),
  })), [data]);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-white to-pink-50/30 border border-pink-100 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="font-extrabold text-pink-900 text-sm">إحصائيات المحفظة</div>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                days === d ? "bg-pink-600 text-white" : "bg-pink-100 text-pink-700"
              }`}
            >{d}ي</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6 text-pink-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <PercentBox label="الادخار" value={data.percentages.savingsRate} accent="from-emerald-400 to-green-500" icon="💰" />
            <PercentBox label="نسبة الإنفاق" value={data.percentages.spendRatio} accent="from-pink-400 to-rose-500" icon="🛍️" />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-2">
              <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> داخل</div>
              <div className="font-extrabold text-emerald-900 text-base">{formatSDG(data.totals.inflow)} ج.س</div>
            </div>
            <div className="rounded-2xl bg-pink-50 border border-pink-200 p-2">
              <div className="text-[10px] font-bold text-pink-700 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> خارج</div>
              <div className="font-extrabold text-pink-900 text-base">{formatSDG(data.totals.outflow)} ج.س</div>
            </div>
          </div>

          {bars.length > 1 && (
            <div className="fancy-card rounded-2xl p-2 mb-3">
              <div className="text-[10px] font-bold text-pink-700 mb-1 px-1">حركة يومية ({days} يوم)</div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={bars}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} width={28} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                  <Bar dataKey="inflow" fill="#10b981" name="داخل" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="outflow" fill="#ec4899" name="خارج" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {pie.length > 0 ? (
            <div className="fancy-card rounded-2xl p-2">
              <div className="text-[10px] font-bold text-pink-700 mb-1 px-1">إنفاقك حسب الفئة</div>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [`${formatSDG(Number(v))} ج.س`, ""]}
                    contentStyle={{ fontSize: 11, borderRadius: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-[11px] text-muted-foreground py-2">لا توجد طلبات بعد لرسم الفئات</div>
          )}
        </>
      )}
    </div>
  );
}

function PercentBox({ label, value, accent, icon }: { label: string; value: number; accent: string; icon: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="fancy-card rounded-2xl p-2 text-center">
      <div className="text-[16px]">{icon}</div>
      <div className="text-[9px] font-bold text-pink-600">{label}</div>
      <div className="font-extrabold text-pink-900 text-sm">{value.toFixed(1)}%</div>
      <div className="h-1.5 bg-pink-100 rounded-full overflow-hidden mt-1">
        <div className={`h-full rounded-full bg-gradient-to-r ${accent}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  AI insights
// ─────────────────────────────────────────────────────────────────
function AiInsights() {
  const [data, setData] = useState<{ aiEnabled: boolean; tips: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { setData(await api("/api/wallet/insights")); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="rounded-3xl bg-gradient-to-br from-rose-500 to-pink-500 p-0.5 shadow-lg">
      <div className="rounded-[22px] bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-pink-900 text-sm">نصائح OVELIN MALL</div>
              <div className="text-[9px] text-pink-500">{data?.aiEnabled ? "مدعوم بالذكاء الاصطناعي" : "نصائح ذكية"}</div>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="text-pink-600 disabled:opacity-50 p-1.5 rounded-lg hover:bg-pink-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          </button>
        </div>
        <div className="space-y-1.5">
          {(data?.tips ?? []).map((t, i) => (
            <div key={i} className="text-[12px] text-pink-900 leading-relaxed bg-pink-50/60 rounded-xl p-2.5 border border-pink-100">
              {t}
            </div>
          ))}
          {(!data?.tips || data.tips.length === 0) && !loading && (
            <div className="text-center text-[11px] text-muted-foreground py-3 flex items-center justify-center gap-1">
              <Lightbulb className="w-3 h-3" /> ابدأ بالشحن أو الطلب لتظهر النصائح
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Wallet pots (sub-wallets)
// ─────────────────────────────────────────────────────────────────
function WalletPots() {
  const [pots, setPots] = useState<Pot[]>([]);
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [active, setActive] = useState<Pot | null>(null);

  const load = async () => {
    try { setPots(await api("/api/wallet/pots")); } catch {}
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="fancy-card rounded-3xl p-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center">
            <PiggyBank className="w-4 h-4" />
          </div>
          <div className="text-right">
            <div className="font-extrabold text-pink-900 text-sm">جيوب الادخار</div>
            <div className="text-[10px] text-pink-500">{pots.length > 0 ? `${pots.length} جيب نشط` : "وفّر لأهدافك"}</div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-pink-400" /> : <ChevronDown className="w-4 h-4 text-pink-400" />}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {pots.length === 0 && (
            <div className="text-center text-[11px] text-muted-foreground py-3">لا توجد جيوب — أنشئ أول جيب ادخار 🎯</div>
          )}
          {pots.map((p) => {
            const bal = Number(p.balance);
            const tgt = Number(p.target);
            const pct = tgt > 0 ? Math.min(100, (bal / tgt) * 100) : 0;
            return (
              <button
                key={p.id}
                onClick={() => setActive(p)}
                className={`w-full text-right rounded-2xl p-3 bg-gradient-to-br ${p.color} text-white shadow active:scale-[0.99]`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">{p.emoji}</div>
                    <div>
                      <div className="font-extrabold text-sm">{p.name}</div>
                      {tgt > 0 && (
                        <div className="text-[10px] opacity-90">الهدف: {formatSDG(tgt)} ج.س</div>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-base">{formatSDG(bal)} ج.س</div>
                    {tgt > 0 && (
                      <div className="text-[10px] opacity-90">{pct.toFixed(0)}%</div>
                    )}
                  </div>
                </div>
                {tgt > 0 && (
                  <div className="h-1.5 bg-white/30 rounded-full overflow-hidden mt-2">
                    <div className="h-full bg-white" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </button>
            );
          })}
          <button
            onClick={() => setShowCreate(true)}
            className="w-full rounded-2xl border-2 border-dashed border-pink-300 text-pink-600 font-bold py-3 flex items-center justify-center gap-1 text-[12px] hover:bg-pink-50"
          >
            <Plus className="w-4 h-4" /> جيب جديد
          </button>
        </div>
      )}

      {showCreate && (
        <CreatePotModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
      {active && (
        <PotActionsModal
          pot={active}
          onClose={() => setActive(null)}
          onChange={() => { setActive(null); load(); }}
        />
      )}
    </div>
  );
}

function CreatePotModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🐷");
  const [color, setColor] = useState(POT_COLORS[0]!.id);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      await api("/api/wallet/pots", { method: "POST", body: JSON.stringify({ name: name.trim(), emoji, color, target: Number(target) || 0 }) });
      onCreated();
    } catch (e: any) { setErr(e?.message ?? "فشل"); }
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-extrabold text-pink-900">جيب جديد</div>
          <button onClick={onClose}><X className="w-5 h-5 text-pink-400" /></button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الجيب (مثل: سفر الصيف)" className="w-full bg-pink-50 rounded-2xl px-3 py-2.5 text-[13px] focus:outline-none" />
        <input value={target} onChange={(e) => setTarget(e.target.value)} type="number" inputMode="decimal" placeholder="الهدف بالدولار (اختياري)" className="w-full bg-pink-50 rounded-2xl px-3 py-2.5 text-[13px] focus:outline-none" />
        <div>
          <div className="text-[10px] font-bold text-pink-700 mb-1">الإيموجي</div>
          <div className="flex flex-wrap gap-1">
            {POT_EMOJIS.map((e) => (
              <button key={e} onClick={() => setEmoji(e)} className={`w-9 h-9 rounded-xl text-lg ${emoji === e ? "bg-pink-600 ring-2 ring-pink-300" : "bg-pink-50"}`}>{e}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-pink-700 mb-1">اللون</div>
          <div className="flex flex-wrap gap-1.5">
            {POT_COLORS.map((c) => (
              <button key={c.id} onClick={() => setColor(c.id)} className={`w-8 h-8 rounded-xl ${c.swatch} ${color === c.id ? "ring-2 ring-pink-900" : ""}`} title={c.label} />
            ))}
          </div>
        </div>
        {err && <div className="text-[11px] text-pink-600 font-bold">{err}</div>}
        <button onClick={submit} disabled={busy || !name.trim()} className="w-full py-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white font-extrabold disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "إنشاء"}
        </button>
      </div>
    </div>
  );
}

function PotActionsModal({ pot, onClose, onChange }: { pot: Pot; onClose: () => void; onChange: () => void }) {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    const a = Number(amount);
    if (!a || a <= 0) return;
    setBusy(true); setErr(null);
    try {
      await api(`/api/wallet/pots/${pot.id}/${tab}`, { method: "POST", body: JSON.stringify({ amount: a }) });
      onChange();
    } catch (e: any) { setErr(e?.message ?? "فشل"); }
    setBusy(false);
  };
  const del = async () => {
    if (!confirm("سيتم إغلاق الجيب وإرجاع رصيده للمحفظة. متأكد؟")) return;
    setBusy(true);
    try {
      await api(`/api/wallet/pots/${pot.id}`, { method: "DELETE" });
      onChange();
    } catch (e: any) { setErr(e?.message ?? "فشل"); }
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{pot.emoji}</span>
            <div>
              <div className="font-extrabold text-pink-900">{pot.name}</div>
              <div className="text-[11px] text-pink-600">رصيد الجيب: {formatSDG(pot.balance)} ج.س</div>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-pink-400" /></button>
        </div>
        <div className="flex gap-1 bg-pink-50 rounded-xl p-1">
          <button onClick={() => setTab("deposit")} className={`flex-1 py-2 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1 ${tab === "deposit" ? "bg-white shadow text-pink-700" : "text-pink-500"}`}>
            <ArrowDownToLine className="w-3.5 h-3.5" /> إيداع
          </button>
          <button onClick={() => setTab("withdraw")} className={`flex-1 py-2 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1 ${tab === "withdraw" ? "bg-white shadow text-pink-700" : "text-pink-500"}`}>
            <ArrowUpFromLine className="w-3.5 h-3.5" /> سحب
          </button>
        </div>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" placeholder="أدخل المبلغ" dir="ltr" className="w-full bg-pink-50 rounded-2xl px-3 py-2.5 text-[13px] focus:outline-none text-left font-extrabold" />
        {err && <div className="text-[11px] text-pink-600 font-bold">{err}</div>}
        <button onClick={go} disabled={busy || !amount} className="w-full py-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white font-extrabold disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : tab === "deposit" ? "إيداع" : "سحب"}
        </button>
        <button onClick={del} className="w-full py-2 text-[11px] text-pink-600 font-bold flex items-center justify-center gap-1">
          <Trash2 className="w-3 h-3" /> إغلاق الجيب
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  P2P send + QR
// ─────────────────────────────────────────────────────────────────
function P2PSendQR() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"send" | "receive">("send");
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState<{ id: number; username: string; avatarUrl?: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const lookup = async () => {
    if (!username.trim()) return;
    setSearching(true); setErr(null); setTarget(null);
    try {
      const u = await api(`/api/wallet/lookup/${encodeURIComponent(username.trim())}`);
      setTarget(u as any);
    } catch (e: any) { setErr(e?.message ?? "غير موجود"); }
    setSearching(false);
  };
  const send = async () => {
    if (!target || !amount) return;
    setBusy(true); setErr(null); setOk(null);
    try {
      await api("/api/wallet/transfer", { method: "POST", body: JSON.stringify({ toUsername: target.username, amount: Number(amount), note: note || undefined }) });
      setOk(`تم تحويل ${formatSDG(Number(amount))} ج.س إلى @${target.username}`);
      setUsername(""); setAmount(""); setNote(""); setTarget(null);
    } catch (e: any) { setErr(e?.message ?? "فشل التحويل"); }
    setBusy(false);
  };

  // QR receive payload (just username — receiver info)
  const myUser = user?.username ?? "";
  const qrPayload = `ovelin:pay?to=${encodeURIComponent(myUser)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(qrPayload)}`;

  return (
    <div className="fancy-card rounded-3xl p-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center">
            <Send className="w-4 h-4" />
          </div>
          <div className="text-right">
            <div className="font-extrabold text-pink-900 text-sm">تحويل بين المستخدمين / QR</div>
            <div className="text-[10px] text-pink-500">أرسل أو استقبل بضغطة</div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-pink-400" /> : <ChevronDown className="w-4 h-4 text-pink-400" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-1 bg-pink-50 rounded-xl p-1">
            <button onClick={() => setTab("send")} className={`flex-1 py-2 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1 ${tab === "send" ? "bg-white shadow text-pink-700" : "text-pink-500"}`}>
              <Send className="w-3.5 h-3.5" /> إرسال
            </button>
            <button onClick={() => setTab("receive")} className={`flex-1 py-2 rounded-lg text-[12px] font-bold flex items-center justify-center gap-1 ${tab === "receive" ? "bg-white shadow text-pink-700" : "text-pink-500"}`}>
              <QrCode className="w-3.5 h-3.5" /> استقبال QR
            </button>
          </div>

          {tab === "send" ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="اسم المستخدم" className="flex-1 bg-pink-50 rounded-2xl px-3 py-2.5 text-[13px] focus:outline-none" />
                <button onClick={lookup} disabled={searching || !username.trim()} className="px-3 rounded-2xl bg-pink-100 text-pink-700 font-bold disabled:opacity-50">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              {target && (
                <div className="rounded-2xl bg-gradient-to-l from-emerald-50 to-teal-50 border border-emerald-200 p-2 flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-extrabold">{target.username[0]?.toUpperCase()}</div>
                  <div className="flex-1">
                    <div className="font-extrabold text-emerald-800 text-[13px]">@{target.username}</div>
                    <div className="text-[10px] text-emerald-600">جاهز للاستقبال</div>
                  </div>
                </div>
              )}
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" inputMode="decimal" placeholder="أدخل المبلغ" dir="ltr" className="w-full bg-pink-50 rounded-2xl px-3 py-2.5 text-[13px] focus:outline-none text-left font-extrabold" />
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="w-full bg-pink-50 rounded-2xl px-3 py-2.5 text-[12px] focus:outline-none" />
              {err && <div className="text-[11px] text-pink-600 font-bold">{err}</div>}
              {ok && <div className="text-[11px] text-emerald-600 font-bold bg-emerald-50 rounded-xl p-2 text-center">{ok}</div>}
              <button onClick={send} disabled={busy || !target || !amount} className="w-full py-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "تحويل الآن"}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <div className="rounded-2xl bg-white border-2 border-pink-200 p-3 inline-block">
                <img src={qrUrl} alt="QR" className="w-48 h-48" />
              </div>
              <div className="text-[12px] text-pink-700 font-bold">@{myUser}</div>
              <div className="text-[10px] text-pink-500">اطلب من المرسل مسح هذا الرمز</div>
              <button
                onClick={async () => { await navigator.clipboard.writeText(qrPayload); setOk("تم نسخ رابط الدفع"); }}
                className="text-[11px] font-bold text-pink-600 underline"
              >
                نسخ رابط الدفع
              </button>
              {ok && <div className="text-[11px] text-emerald-600 font-bold">{ok}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  PDF statement (window.print)
// ─────────────────────────────────────────────────────────────────
function PdfStatement() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const generate = async () => {
    setLoading(true);
    try {
      const r = await api(`/api/wallet/statement?from=${from}&to=${to}`);
      setData(r);
    } catch {}
    setLoading(false);
  };
  const print = () => {
    if (!data) return;
    const rows = (data.transactions ?? []).map((t: any) => `
      <tr>
        <td>${new Date(t.createdAt).toLocaleString("ar-EG")}</td>
        <td>${t.type}</td>
        <td>${t.status}</td>
        <td style="text-align:left; color:${Number(t.amount) >= 0 ? "#059669" : "#dc2626"}">${Math.floor(Math.abs(Number(t.amount))).toLocaleString("en-US")},00 ج.س</td>
        <td>${(t.description ?? "").replace(/</g, "&lt;")}</td>
      </tr>`).join("");
    const html = `
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>كشف حساب OVELIN MALL — ${data.user?.username}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 24px; color: #1f2937; }
          .h { display:flex; justify-content:space-between; border-bottom:3px solid #ec4899; padding-bottom:12px; margin-bottom:16px; }
          .brand { font-size:28px; font-weight:900; color:#ec4899; }
          .sub { color:#6b7280; font-size:12px; }
          .totals { display:flex; gap:12px; margin-bottom:16px; }
          .box { flex:1; background:#fdf2f8; border:1px solid #fbcfe8; border-radius:12px; padding:10px; }
          .box .lbl { font-size:11px; color:#9d174d; font-weight:700; }
          .box .val { font-size:20px; font-weight:900; color:#831843; }
          table { width:100%; border-collapse:collapse; font-size:11px; }
          th,td { border-bottom:1px solid #fce7f3; padding:6px 8px; text-align:right; }
          th { background:#fdf2f8; font-weight:800; color:#9d174d; }
          .footer { margin-top:24px; font-size:10px; color:#9ca3af; text-align:center; }
        </style>
      </head>
      <body>
        <div class="h">
          <div>
            <div class="brand">OVELIN MALL</div>
            <div class="sub">كشف حساب • @${data.user?.username}</div>
          </div>
          <div style="text-align:left">
            <div class="sub">من ${from}</div>
            <div class="sub">إلى ${to}</div>
            <div class="sub">صدر: ${new Date().toLocaleString("ar-EG")}</div>
          </div>
        </div>
        <div class="totals">
          <div class="box"><div class="lbl">إجمالي داخل</div><div class="val">${Math.floor(data.totals.inflow).toLocaleString("en-US")},00 ج.س</div></div>
          <div class="box"><div class="lbl">إجمالي خارج</div><div class="val">${Math.floor(data.totals.outflow).toLocaleString("en-US")},00 ج.س</div></div>
          <div class="box"><div class="lbl">الصافي</div><div class="val">${Math.floor(data.totals.net).toLocaleString("en-US")},00 ج.س</div></div>
        </div>
        <table>
          <thead><tr><th>التاريخ</th><th>النوع</th><th>الحالة</th><th>المبلغ</th><th>الوصف</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:24px">لا معاملات في هذه الفترة</td></tr>'}</tbody>
        </table>
        <div class="footer">OVELIN MALL • كشف رسمي • هذا المستند مولّد آلياً</div>
      </body>
      </html>
    `;
    // iframe مخفي بدل window.open — لا يكسر وضع TWA
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      }, 400);
    }
  };
  return (
    <div className="fancy-card rounded-3xl p-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 text-white flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div className="text-right">
            <div className="font-extrabold text-pink-900 text-sm">كشف حساب PDF</div>
            <div className="text-[10px] text-pink-500">حمّل كشفك الرسمي</div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-pink-400" /> : <ChevronDown className="w-4 h-4 text-pink-400" />}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] font-bold text-pink-700 mb-1">من</div>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full bg-pink-50 rounded-xl px-2 py-2 text-[12px] focus:outline-none" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-pink-700 mb-1">إلى</div>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full bg-pink-50 rounded-xl px-2 py-2 text-[12px] focus:outline-none" />
            </div>
          </div>
          <button onClick={generate} disabled={loading} className="w-full py-2.5 rounded-2xl bg-pink-100 text-pink-700 font-extrabold text-[12px] disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "احسب الكشف"}
          </button>
          {data && (
            <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-[9px] text-emerald-600 font-bold">داخل</div><div className="font-extrabold text-emerald-700 text-[13px]">{formatSDG(data.totals.inflow)} ج.س</div></div>
                <div><div className="text-[9px] text-pink-600 font-bold">خارج</div><div className="font-extrabold text-pink-700 text-[13px]">{formatSDG(data.totals.outflow)} ج.س</div></div>
                <div><div className="text-[9px] text-pink-600 font-bold">الصافي</div><div className="font-extrabold text-pink-700 text-[13px]">{formatSDG(data.totals.net)} ج.س</div></div>
              </div>
              <div className="text-[10px] text-pink-700">{data.transactions.length} معاملة في الفترة المحددة</div>
              <button onClick={print} className="w-full py-2.5 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-extrabold text-[12px]">
                طباعة / حفظ PDF
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
