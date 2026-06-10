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
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Smartphone,
  KeyRound,
  Activity,
  Trash2,
  Bell,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { toast } from "@/components/Toast";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  current: boolean;
};

type LoginEvent = {
  id: number;
  event: string;
  ip: string | null;
  userAgent: string | null;
  ok: boolean;
  createdAt: string;
};

type Prefs = {
  hasPin: boolean;
  dailySpendLimit: string | null;
  monthlySpendLimit: string | null;
  notifyOrders: boolean;
  notifyPromos: boolean;
  notifyDeposits: boolean;
};

export default function SecurityPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  const sessions = useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn: () => api("/api/sessions"),
    enabled: !!user,
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
  });
  const loginHistory = useQuery<LoginEvent[]>({
    queryKey: ["login-history"],
    queryFn: () => api("/api/login-history"),
    enabled: !!user,
    placeholderData: (prev) => prev,
  });
  const prefs = useQuery<Prefs>({
    queryKey: ["prefs"],
    queryFn: () => api("/api/preferences"),
    enabled: !!user,
    placeholderData: (prev) => prev,
  });

  const revokeSession = useMutation({
    mutationFn: (id: string) =>
      api(`/api/sessions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ type: "success", title: "تم إنهاء الجلسة" });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const setPin = useMutation({
    mutationFn: (pin: string) =>
      api("/api/security/pin", {
        method: "POST",
        body: JSON.stringify({ pin }),
      }),
    onSuccess: () => {
      toast({ type: "success", title: "🔒 تم حفظ رقم PIN" });
      setNewPin("");
      qc.invalidateQueries({ queryKey: ["prefs"] });
    },
  });
  const disablePin = useMutation({
    mutationFn: () => api("/api/security/pin", { method: "DELETE" }),
    onSuccess: () => {
      toast({ type: "info", title: "تم تعطيل PIN" });
      qc.invalidateQueries({ queryKey: ["prefs"] });
    },
  });

  const setLimits = useMutation({
    mutationFn: (data: { daily?: string; monthly?: string }) =>
      api("/api/security/limits", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ type: "success", title: "تم تحديث الحدود" });
      qc.invalidateQueries({ queryKey: ["prefs"] });
    },
  });

  const setNotify = useMutation({
    mutationFn: (data: Partial<Prefs>) =>
      api("/api/preferences", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prefs"] });
    },
  });

  const [newPin, setNewPin] = useState("");
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");

  useEffect(() => {
    if (prefs.data) {
      setDaily(prefs.data.dailySpendLimit ?? "");
      setMonthly(prefs.data.monthlySpendLimit ?? "");
    }
  }, [prefs.data]);

  if (!user) return null;

  return (
    <AppLayout>
      <PageHeader title="الأمان" subtitle="حماية حسابك" back="/account" />
      <div className="px-4 space-y-3 pb-4">
        {/* PIN */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 flex items-center gap-1.5 mb-2">
            <KeyRound className="w-4 h-4 text-pink-500" />
            رقم PIN للسحب
            {prefs.data?.hasPin && (
              <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-extrabold">
                مفعّل
              </span>
            )}
          </div>
          <div className="text-[11px] text-pink-700/80 mb-2">
            يطلب منك تأكيد PIN عند كل سحب
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              minLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="أدخل 4-6 أرقام"
              className="flex-1 rounded-2xl border border-pink-200 bg-pink-50/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              dir="ltr"
            />
            <button
              onClick={() => newPin.length >= 4 && setPin.mutate(newPin)}
              disabled={newPin.length < 4 || setPin.isPending}
              className="rounded-2xl px-4 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-bold disabled:opacity-60"
            >
              حفظ
            </button>
          </div>
          {prefs.data?.hasPin && (
            <button
              onClick={() => disablePin.mutate()}
              className="mt-2 text-[11px] text-pink-600 font-bold"
            >
              تعطيل PIN
            </button>
          )}
        </div>

        {/* Spending limits */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            حدود الإنفاق
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-pink-800 font-semibold">
                يومياً ($)
              </label>
              <input
                value={daily}
                onChange={(e) => setDaily(e.target.value)}
                type="number"
                placeholder="بدون"
                className="mt-1 w-full rounded-xl border border-pink-200 bg-pink-50/40 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] text-pink-800 font-semibold">
                شهرياً ($)
              </label>
              <input
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                type="number"
                placeholder="بدون"
                className="mt-1 w-full rounded-xl border border-pink-200 bg-pink-50/40 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            onClick={() =>
              setLimits.mutate({
                daily: daily.trim() || undefined,
                monthly: monthly.trim() || undefined,
              })
            }
            className="mt-3 w-full rounded-2xl py-2 bg-pink-100 text-pink-700 text-xs font-bold"
          >
            حفظ الحدود
          </button>
        </div>

        {/* Notifications */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 flex items-center gap-1.5 mb-3">
            <Bell className="w-4 h-4 text-pink-500" />
            الإشعارات
          </div>
          {[
            { key: "notifyOrders", label: "تحديثات الطلبات" },
            { key: "notifyPromos", label: "العروض والترويجات" },
            { key: "notifyDeposits", label: "حركة المحفظة" },
          ].map((row) => {
            const value = (prefs.data?.[row.key as keyof Prefs] as boolean) ?? true;
            return (
              <label
                key={row.key}
                className="flex items-center justify-between py-2 cursor-pointer"
              >
                <span className="text-sm text-pink-900">{row.label}</span>
                <button
                  onClick={() =>
                    setNotify.mutate({ [row.key]: !value } as Partial<Prefs>)
                  }
                  className={cn(
                    "relative w-11 h-6 rounded-full transition",
                    value ? "bg-pink-500" : "bg-pink-100",
                  )}
                >
                  <motion.span
                    animate={{ x: value ? 22 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
                  />
                </button>
              </label>
            );
          })}
        </div>

        {/* Active sessions */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 flex items-center gap-1.5 mb-3">
            <Smartphone className="w-4 h-4 text-pink-500" />
            الجلسات النشطة
          </div>
          <div className="space-y-2">
            {sessions.data?.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "rounded-2xl p-3 border flex items-start justify-between gap-2",
                  s.current
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-pink-50/30 border-pink-100",
                )}
              >
                <div className="text-xs min-w-0">
                  <div className="font-bold text-pink-900 flex items-center gap-1.5">
                    {s.userAgent
                      ? extractDevice(s.userAgent)
                      : "جلسة غير معروفة"}
                    {s.current && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 rounded-md">
                        الحالية
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-pink-700/70 truncate mt-0.5">
                    IP: {s.ip ?? "—"} • آخر نشاط:{" "}
                    {s.lastSeenAt
                      ? new Date(s.lastSeenAt).toLocaleString("ar-EG")
                      : "—"}
                  </div>
                </div>
                {!s.current && (
                  <button
                    onClick={() => revokeSession.mutate(s.id)}
                    className="shrink-0 p-1.5 rounded-xl bg-pink-100 text-pink-600"
                    aria-label="إنهاء"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Login history */}
        <div className="fancy-card rounded-3xl p-4">
          <div className="font-bold text-pink-900 flex items-center gap-1.5 mb-3">
            <Activity className="w-4 h-4 text-pink-500" />
            سجل الدخول
          </div>
          <div className="space-y-1.5">
            {loginHistory.data?.slice(0, 10).map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between text-xs py-1.5 border-b border-pink-50 last:border-0"
              >
                <div>
                  <span
                    className={cn(
                      "font-bold",
                      e.ok ? "text-emerald-700" : "text-pink-600",
                    )}
                  >
                    {e.event === "login"
                      ? "تسجيل دخول"
                      : e.event === "register"
                        ? "تسجيل جديد"
                        : "تسجيل خروج"}
                  </span>
                  <span className="text-[10px] text-pink-700/70 ml-2">
                    {e.ip ?? "—"}
                  </span>
                </div>
                <div className="text-[10px] text-pink-700/70">
                  {new Date(e.createdAt).toLocaleString("ar-EG")}
                </div>
              </div>
            ))}
            {!loginHistory.data?.length && (
              <div className="text-center text-xs text-muted-foreground py-3">
                لا يوجد سجل
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function extractDevice(ua: string): string {
  if (/iPhone/i.test(ua)) return "📱 iPhone";
  if (/iPad/i.test(ua)) return "📱 iPad";
  if (/Android/i.test(ua)) return "📱 Android";
  if (/Mac/i.test(ua)) return "💻 Mac";
  if (/Windows/i.test(ua)) return "💻 Windows";
  if (/Linux/i.test(ua)) return "💻 Linux";
  return "💻 جهاز";
}
