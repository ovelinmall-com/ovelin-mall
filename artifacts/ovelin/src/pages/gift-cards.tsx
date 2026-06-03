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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Gift, Send, Sparkles, Copy, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const API = (import.meta.env.BASE_URL || "/") + "api";

type GiftCard = {
  id: number;
  code: string;
  amount: string;
  redeemed?: boolean;
  redeemedAt?: string | null;
  expiresAt: string | null;
  message?: string | null;
  createdAt?: string;
};
type MyGiftCardsResp = { created: GiftCard[]; redeemed: GiftCard[] };

export default function GiftCardsPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"create" | "redeem">("create");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  const { data: cards } = useQuery({
    queryKey: ["my-gift-cards"],
    queryFn: async () => {
      const r = await fetch(`${API}/gift-cards/my`, { credentials: "include" });
      if (!r.ok) return { created: [], redeemed: [] } as MyGiftCardsResp;
      return (await r.json()) as MyGiftCardsResp;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/gift-cards/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount).toFixed(2), message: message.trim() || undefined }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "تعذر إنشاء البطاقة");
      }
      return r.json();
    },
    onSuccess: (d: any) => {
      setCreatedCode(d.code);
      setAmount("");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["my-gift-cards"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  const redeem = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/gift-cards/redeem`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: redeemCode.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "كود غير صالح");
      return data;
    },
    onSuccess: (d: any) => {
      setRedeemMsg({ ok: true, text: `تم استرداد $${d.amount ?? "—"} إلى رصيدك` });
      setRedeemCode("");
      qc.invalidateQueries({ queryKey: ["my-gift-cards"] });
    },
    onError: (e: Error) => setRedeemMsg({ ok: false, text: e.message }),
  });

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const created = cards?.created ?? [];
  const redeemed_list = cards?.redeemed ?? [];
  const list: GiftCard[] = [
    ...created.map((c) => ({ ...c, redeemed: !!c.redeemed })),
    ...redeemed_list.map((c) => ({ ...c, redeemed: true })),
  ];

  return (
    <AppLayout>
      <PageHeader title="بطاقات الهدايا" subtitle="أرسل و استرد رصيداً" back="/account" />

      <div className="px-5 space-y-3 pb-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 bg-gradient-to-br from-amber-400 via-pink-500 to-rose-600 text-white shadow-[0_15px_40px_-10px_rgba(190,24,93,0.5)] relative overflow-hidden"
        >
          <Gift className="absolute -top-4 -left-4 w-32 h-32 opacity-15" />
          <div className="font-extrabold text-lg mb-1">OVELIN GIFT</div>
          <div className="text-xs opacity-90">اشترِ رصيد هدية لصديق أو استخدم كود هدية أُرسل إليك</div>
        </motion.div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTab("create")}
            className={cn(
              "rounded-2xl py-2.5 text-sm font-bold transition border flex items-center justify-center gap-2",
              tab === "create"
                ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow"
                : "bg-white border-pink-200 text-pink-700",
            )}
          >
            <Send className="w-4 h-4" /> إرسال هدية
          </button>
          <button
            onClick={() => setTab("redeem")}
            className={cn(
              "rounded-2xl py-2.5 text-sm font-bold transition border flex items-center justify-center gap-2",
              tab === "redeem"
                ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow"
                : "bg-white border-pink-200 text-pink-700",
            )}
          >
            <Sparkles className="w-4 h-4" /> استرداد كود
          </button>
        </div>

        {tab === "create" ? (
          <div className="fancy-card rounded-3xl p-4 space-y-3">
            <div className="font-bold text-pink-900 text-sm">إنشاء بطاقة هدية</div>
            <div>
              <label className="text-xs text-pink-800 font-semibold">المبلغ ($)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="10.00"
              />
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {[5, 10, 25, 50, 100].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(String(a))}
                    className="rounded-xl bg-pink-50 text-pink-700 text-xs font-bold py-1.5"
                  >
                    ${a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-pink-800 font-semibold">رسالة (اختياري)</label>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={140}
                className="mt-1 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="هدية حلوة منك"
              />
            </div>

            {create.error && (
              <div className="rounded-2xl bg-pink-50 border border-pink-200 text-pink-700 text-xs p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {(create.error as Error).message}
              </div>
            )}
            {createdCode && (
              <div className="rounded-2xl bg-green-50 border border-green-200 p-3">
                <div className="text-xs text-green-700 mb-2">✅ تم إنشاء البطاقة. شارك الكود مع المستفيد:</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white rounded-xl border border-green-200 px-3 py-2 text-sm font-bold text-pink-900 truncate" dir="ltr">
                    {createdCode}
                  </code>
                  <button
                    onClick={() => copyCode(createdCode)}
                    className="rounded-xl bg-pink-600 text-white text-xs font-bold px-3 py-2 flex items-center gap-1"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "تم" : "نسخ"}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={create.isPending || !amount}
              onClick={() => create.mutate()}
              className="w-full rounded-2xl py-3 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {create.isPending ? "جارٍ الإنشاء..." : "إنشاء البطاقة"}
            </button>
            <div className="text-[10px] text-muted-foreground text-center">
              سيُخصم المبلغ من رصيدك. يمكن للمستلم استرداد الكود من نفس الصفحة.
            </div>
          </div>
        ) : (
          <div className="fancy-card rounded-3xl p-4 space-y-3">
            <div className="font-bold text-pink-900 text-sm">استرداد كود هدية</div>
            <div>
              <label className="text-xs text-pink-800 font-semibold">الكود</label>
              <input
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                className="mt-1 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 font-mono tracking-wider"
                placeholder="OVL-XXXXXXXX"
                dir="ltr"
              />
            </div>
            {redeemMsg && (
              <div className={cn(
                "rounded-2xl p-3 text-xs flex gap-2 border",
                redeemMsg.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-pink-50 border-pink-200 text-pink-700"
              )}>
                {redeemMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                {redeemMsg.text}
              </div>
            )}
            <button
              type="button"
              disabled={redeem.isPending || !redeemCode}
              onClick={() => redeem.mutate()}
              className="w-full rounded-2xl py-3 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60"
            >
              {redeem.isPending ? "جارٍ التحقق..." : "استرداد"}
            </button>
          </div>
        )}

        {/* My cards history */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 text-sm mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4 text-pink-600" /> بطاقاتي
          </div>
          {list.length === 0 ? (
            <div className="text-center py-4 text-xs text-muted-foreground">لا توجد بطاقات بعد</div>
          ) : (
            <div className="space-y-2">
              {list.map((c) => (
                <div key={c.id} className="rounded-2xl border border-pink-100 p-3 bg-pink-50/30">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-bold text-pink-900 truncate" dir="ltr">{c.code}</code>
                    <div className="text-sm font-extrabold text-pink-600 shrink-0">{c.amount} ج.س</div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <div className="text-muted-foreground">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString("ar-EG") : ""}
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded-full font-bold",
                      c.redeemedAt ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {c.redeemedAt ? "تم الاسترداد" : "غير مستخدم"}
                    </div>
                  </div>
                  {c.message && <div className="text-[11px] text-pink-700 mt-1 italic">"{c.message}"</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
