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

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Gift,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import { cn } from "@/lib/utils";

type Transfer = {
  id: number;
  fromUserId: number;
  toUserId: number;
  amount: string;
  message: string | null;
  createdAt: string;
  fromUsername: string;
  toUsername: string;
};

type GiftCard = {
  id: number;
  code: string;
  amount: string;
  message: string | null;
  createdAt: string;
  redeemedAt: string | null;
  status: "active" | "redeemed" | "expired";
};

const TABS = [
  { id: "send", label: "تحويل", icon: Send },
  { id: "history", label: "السجل", icon: ArrowDownLeft },
  { id: "giftcard", label: "بطاقات", icon: Gift },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function TransfersPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("send");

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  const transfers = useQuery<Transfer[]>({
    queryKey: ["transfers"],
    queryFn: () => api("/api/transfers"),
    enabled: !!user,
    refetchInterval: 8000,
    placeholderData: (prev) => prev,
  });
  const giftCards = useQuery<GiftCard[]>({
    queryKey: ["my-giftcards"],
    queryFn: () => api("/api/giftcards/my"),
    enabled: !!user,
    placeholderData: (prev) => prev,
  });

  // Send transfer state
  const [toUsername, setToUsername] = useState("");
  const [tAmount, setTAmount] = useState("");
  const [tMessage, setTMessage] = useState("");
  const sendTransfer = useMutation({
    mutationFn: () =>
      api("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          toUsername: toUsername.trim(),
          amount: Number(tAmount).toFixed(2),
          message: tMessage.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      toast({ type: "success", title: "✅ تم التحويل بنجاح" });
      setToUsername("");
      setTAmount("");
      setTMessage("");
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: Error) =>
      toast({ type: "error", title: "فشل التحويل", message: e.message }),
  });

  // Gift card state
  const [gAmount, setGAmount] = useState("");
  const [gMessage, setGMessage] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const createGift = useMutation({
    mutationFn: () =>
      api("/api/giftcards", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(gAmount).toFixed(2),
          message: gMessage.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      toast({ type: "celebrate", title: "🎁 تم إنشاء بطاقة الهدية!" });
      setGAmount("");
      setGMessage("");
      qc.invalidateQueries({ queryKey: ["my-giftcards"] });
    },
    onError: (e: Error) =>
      toast({ type: "error", title: "خطأ", message: e.message }),
  });
  const redeemGift = useMutation({
    mutationFn: () =>
      api("/api/giftcards/redeem", {
        method: "POST",
        body: JSON.stringify({ code: redeemCode.trim() }),
      }),
    onSuccess: (data: any) => {
      toast({
        type: "celebrate",
        title: `🎁 تم استلام $${data.amount}`,
      });
      setRedeemCode("");
      qc.invalidateQueries({ queryKey: ["my-giftcards"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: Error) =>
      toast({ type: "error", title: "كود غير صالح", message: e.message }),
  });

  if (!user) return null;

  return (
    <AppLayout>
      <PageHeader title="التحويلات والهدايا" subtitle="أرسل لأصدقائك" back="/account" />
      <div className="px-4 space-y-3 pb-4">
        {/* Tabs */}
        <div className="fancy-card grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5",
                  active
                    ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow"
                    : "text-pink-700 hover:bg-pink-50",
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === "send" && (
            <motion.div
              key="send"
              exit={{ opacity: 0, y: -8 }}
              className="fancy-card rounded-3xl p-4 space-y-3"
            >
              <div className="font-bold text-pink-900 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-pink-500" />
                تحويل لمستخدم
              </div>
              <div>
                <label className="text-xs text-pink-800 font-semibold">
                  اسم المستخدم المستلم
                </label>
                <input
                  value={toUsername}
                  onChange={(e) => setToUsername(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="username"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-pink-800 font-semibold">
                  المبلغ ($)
                </label>
                <input
                  value={tAmount}
                  onChange={(e) => setTAmount(e.target.value)}
                  type="number"
                  min="0.5"
                  step="0.01"
                  className="mt-1 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="10.00"
                />
              </div>
              <div>
                <label className="text-xs text-pink-800 font-semibold">
                  رسالة (اختياري)
                </label>
                <input
                  value={tMessage}
                  onChange={(e) => setTMessage(e.target.value)}
                  maxLength={120}
                  className="mt-1 w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="هدية لك ❤️"
                />
              </div>
              <button
                onClick={() => sendTransfer.mutate()}
                disabled={
                  sendTransfer.isPending ||
                  !toUsername.trim() ||
                  Number(tAmount) < 0.5
                }
                className="w-full rounded-2xl py-3 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg active:scale-95 transition disabled:opacity-60"
              >
                {sendTransfer.isPending ? "جارٍ التحويل..." : "إرسال"}
              </button>
            </motion.div>
          )}

          {tab === "history" && (
            <motion.div
              key="hist"
              exit={{ opacity: 0, y: -8 }}
              className="fancy-card rounded-3xl p-4"
            >
              <div className="font-bold text-pink-900 mb-3">سجل التحويلات</div>
              {!transfers.data?.length && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  لا توجد تحويلات بعد
                </div>
              )}
              <div className="space-y-2">
                {transfers.data?.map((t) => {
                  const sent = t.fromUserId === user.id;
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-2xl bg-pink-50/40 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "p-2 rounded-xl",
                            sent
                              ? "bg-pink-100 text-pink-600"
                              : "bg-emerald-100 text-emerald-600",
                          )}
                        >
                          {sent ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-pink-900">
                            {sent
                              ? `إلى ${t.toUsername}`
                              : `من ${t.fromUsername}`}
                          </div>
                          {t.message && (
                            <div className="text-[10px] text-pink-700/70 truncate max-w-[160px]">
                              "{t.message}"
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(t.createdAt).toLocaleString("ar-EG")}
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "text-sm font-extrabold",
                          sent ? "text-pink-600" : "text-emerald-600",
                        )}
                      >
                        {sent ? "-" : "+"}${Number(t.amount).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab === "giftcard" && (
            <motion.div
              key="gift"
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              <div className="rounded-3xl bg-gradient-to-br from-pink-500 via-rose-600 to-pink-600 text-white p-4 shadow-lg">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> استرد كود هدية
                </div>
                <div className="flex gap-2 mt-3">
                  <input
                    value={redeemCode}
                    onChange={(e) =>
                      setRedeemCode(e.target.value.toUpperCase())
                    }
                    placeholder="OVELIN-XXXX-XXXX"
                    className="flex-1 rounded-xl bg-white/20 backdrop-blur border-0 text-white placeholder-white/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/40"
                    dir="ltr"
                  />
                  <button
                    onClick={() => redeemGift.mutate()}
                    disabled={redeemGift.isPending || !redeemCode.trim()}
                    className="rounded-xl bg-white text-pink-600 px-3 text-xs font-extrabold disabled:opacity-60"
                  >
                    استرد
                  </button>
                </div>
              </div>

              <div className="fancy-card rounded-3xl p-4 space-y-3">
                <div className="font-bold text-pink-900 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-pink-500" />
                  أنشئ بطاقة هدية
                </div>
                <input
                  value={gAmount}
                  onChange={(e) => setGAmount(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="0.01"
                  placeholder="المبلغ ($)"
                  dir="ltr"
                  className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <input
                  value={gMessage}
                  onChange={(e) => setGMessage(e.target.value)}
                  placeholder="رسالة لطيفة (اختياري)"
                  maxLength={100}
                  className="w-full rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button
                  onClick={() => createGift.mutate()}
                  disabled={createGift.isPending || Number(gAmount) < 1}
                  className="w-full rounded-2xl py-3 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow disabled:opacity-60"
                >
                  {createGift.isPending ? "جارٍ الإنشاء..." : "إنشاء البطاقة"}
                </button>
              </div>

              <div className="fancy-card rounded-3xl p-4">
                <div className="font-bold text-pink-900 mb-3">بطاقاتي</div>
                {!giftCards.data?.length && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    لم تنشئ أي بطاقة بعد
                  </div>
                )}
                <div className="space-y-2">
                  {giftCards.data?.map((g) => (
                    <GiftCardRow key={g.id} g={g} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}

function GiftCardRow({ g }: { g: GiftCard }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(g.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div
      className={cn(
        "rounded-2xl p-3 border",
        g.status === "redeemed"
          ? "bg-pink-50/30 border-pink-100 opacity-70"
          : "bg-gradient-to-br from-amber-50 to-pink-50 border-amber-200",
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-black text-pink-900">{g.amount} ج.س</div>
          <code dir="ltr" className="text-[10px] text-pink-700">
            {g.code}
          </code>
        </div>
        <div className="text-left">
          <button
            onClick={copy}
            className="rounded-xl bg-white border border-pink-200 px-2 py-1.5 text-[10px] font-bold text-pink-700 flex items-center gap-1"
          >
            {copied ? (
              <CheckCircle2 className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copied ? "تم" : "نسخ"}
          </button>
          <div
            className={cn(
              "text-[9px] font-extrabold mt-1",
              g.status === "redeemed" ? "text-pink-500" : "text-emerald-600",
            )}
          >
            {g.status === "redeemed" ? "مُستلمة" : "متاحة"}
          </div>
        </div>
      </div>
      {g.message && (
        <div className="text-[10px] text-pink-700/80 mt-1">"{g.message}"</div>
      )}
    </div>
  );
}
