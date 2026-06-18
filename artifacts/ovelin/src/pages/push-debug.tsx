import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Bell, BellOff, Database, Smartphone, Globe, Loader2,
  Send, Eye, EyeOff,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { saveOnesignalPlayerId, saveFcmToken } from "@/components/PushOptIn";

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") + "/";
const API  = `${BASE}api`;

type DebugStatus = {
  userId:   number;
  username: string | null;
  email:    string | null;
  channels: {
    onesignal: {
      count: number; configured: boolean; status: "ok" | "missing";
      diagnosis: string; lastUpdated: string | null;
      tokens: { playerId: string; shortId: string; userAgent: string | null; createdAt: string; updatedAt: string }[];
    };
    fcm: {
      count: number; configured: boolean; status: "ok" | "missing";
      diagnosis: string; lastUpdated: string | null;
      tokens: { shortToken: string; userAgent: string | null; createdAt: string; updatedAt: string }[];
    };
    vapid: {
      count: number; status: "ok" | "missing";
      subscriptions: { shortEndpoint: string; userAgent: string | null; createdAt: string }[];
    };
  };
  summary: {
    hasAnyToken: boolean;
    readyChannels: string[];
    nextStep: string;
  };
  checklist: Record<string, boolean | null>;
};

type LocalStorageState = {
  player_id_sent:    string | null;
  player_id_pending: string | null;
  fcm_token_sent:    string | null;
  fcm_token_pending: string | null;
};

function getLocalStorageState(): LocalStorageState {
  try {
    return {
      player_id_sent:    localStorage.getItem("ovelin_onesignal_player_id"),
      player_id_pending: localStorage.getItem("ovelin_pending_player_id"),
      fcm_token_sent:    localStorage.getItem("ovelin_fcm_token"),
      fcm_token_pending: localStorage.getItem("ovelin_pending_fcm_token"),
    };
  } catch {
    return { player_id_sent: null, player_id_pending: null, fcm_token_sent: null, fcm_token_pending: null };
  }
}

function StatusBadge({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> {label}
    </span>
  );
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full",
      ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", ok ? "bg-green-500" : "bg-red-500")} />
      {label}
    </span>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean | null }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-pink-50 last:border-0">
      {ok === null ? (
        <span className="w-4 h-4 rounded-full bg-gray-200 shrink-0" />
      ) : ok ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
      )}
      <span className={cn("text-xs", ok === false ? "text-red-600 font-semibold" : "text-pink-900")}>
        {label}
      </span>
    </div>
  );
}

function LocalItem({ label, value, show, onToggle }: { label: string; value: string | null; show: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-pink-50 last:border-0">
      {value ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground">{label}</div>
        {value ? (
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-pink-900 truncate">
              {show ? value : value.slice(0, 12) + "…"}
            </span>
            <button onClick={onToggle} className="shrink-0">
              {show ? <EyeOff className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-red-500 font-semibold">غير موجود ❌</span>
        )}
      </div>
    </div>
  );
}

export default function PushDebugPage() {
  const { user } = useAuth();
  const [ls, setLs] = useState<LocalStorageState>(getLocalStorageState());
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [forceLog, setForceLog] = useState<string[]>([]);

  const refreshLs = () => setLs(getLocalStorageState());

  const { data, isFetching, refetch } = useQuery<DebugStatus>({
    queryKey: ["push-debug-status"],
    queryFn: async () => {
      const r = await fetch(`${API}/push/debug-status`, { credentials: "include" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/admin/push-trace`, {
        method: "POST",
        credentials: "include",
      });
      return r.json();
    },
    onSuccess: (d) => {
      const lines = [
        `--- إرسال اختباري ---`,
        `OneSignal: ${d.trace?.channels?.onesignal?.sent ?? 0} مُرسَل، ${d.trace?.channels?.onesignal?.skipped ? "تخطّي: " + d.trace.channels.onesignal.skipReason : ""}`,
        `FCM: ${d.trace?.channels?.fcm?.sent ?? 0} مُرسَل، ${d.trace?.channels?.fcm?.skipped ? "تخطّي: " + d.trace.channels.fcm.skipReason : ""}`,
        `VAPID: ${d.trace?.channels?.vapid?.sent ?? 0} مُرسَل`,
      ];
      setForceLog(prev => [...lines, ...prev].slice(0, 20));
      refetch();
    },
  });

  const forceFlushMutation = useMutation({
    mutationFn: async () => {
      const lines: string[] = ["--- إعادة إرسال التوكنز ---"];
      const pid = ls.player_id_pending ?? ls.player_id_sent;
      const fcm = ls.fcm_token_pending ?? ls.fcm_token_sent;

      if (pid) {
        const ok = await saveOnesignalPlayerId(pid);
        lines.push(`OneSignal player_id: ${ok ? "✅ تم الحفظ" : "❌ فشل"}`);
      } else {
        lines.push("OneSignal: لا يوجد player_id في localStorage");
      }

      if (fcm) {
        const ok = await saveFcmToken(fcm);
        lines.push(`FCM token: ${ok ? "✅ تم الحفظ" : "❌ فشل"}`);
      } else {
        lines.push("FCM: لا يوجد token في localStorage");
      }

      return lines;
    },
    onSuccess: (lines) => {
      setForceLog(prev => [...lines, ...prev].slice(0, 20));
      refreshLs();
      refetch();
    },
  });

  const requestBridgeMutation = useMutation({
    mutationFn: async () => {
      const lines: string[] = ["--- طلب من Bridge ---"];
      try {
        const gn = (window as any).gonative || (window as any).median;
        if (!gn) {
          lines.push("❌ gonative/median غير متاح — هذا ليس Median APK");
          return lines;
        }
        lines.push("✅ Bridge موجود: " + Object.keys(gn).slice(0, 6).join(", "));
        if (gn.onesignal?.onesignalInfo) {
          gn.onesignal.onesignalInfo({ callback: "gonative_onesignal_info" });
          lines.push("📡 تم استدعاء gonative.onesignal.onesignalInfo");
        }
        if (gn.push?.getPermissionStatus) {
          gn.push.getPermissionStatus({ callback: "ovelin_push_permission_cb" });
          lines.push("📡 تم استدعاء gonative.push.getPermissionStatus");
        }
        if (gn.push?.requestPermission) {
          gn.push.requestPermission({ callback: "ovelin_push_permission_cb" });
          lines.push("📡 تم استدعاء gonative.push.requestPermission");
        }
      } catch (e: any) {
        lines.push("❌ خطأ: " + (e?.message ?? e));
      }
      await new Promise(r => setTimeout(r, 1500));
      refreshLs();
      return lines;
    },
    onSuccess: (lines) => {
      setForceLog(prev => [...lines, ...prev].slice(0, 20));
      refetch();
    },
  });

  useEffect(() => {
    const t = setInterval(refreshLs, 3000);
    return () => clearInterval(t);
  }, []);

  const ch = data?.channels;
  const isMedian = /GoNativeAndroid|GoNativeiOS|median/i.test(navigator.userAgent)
    || !!(window as any).gonative;

  return (
    <AppLayout>
      <PageHeader title="تشخيص الإشعارات" subtitle="دورة حياة التوكن الكاملة" back="/account" />

      <div className="px-4 space-y-3 pb-6">

        {/* ── User Info ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="fancy-card rounded-3xl p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-pink-100 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-pink-600" />
            </div>
            <div>
              <div className="font-bold text-sm text-pink-900">معلومات الجهاز والحساب</div>
              <div className="text-[10px] text-muted-foreground">
                {isMedian ? "📱 Median APK" : "🌐 متصفح / PWA"}
              </div>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono font-bold text-pink-900">{data?.userId ?? user?.id ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Username</span>
              <span className="font-mono font-bold text-pink-900">{data?.username ?? user?.username ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">إذن الإشعارات</span>
              <StatusBadge
                ok={"Notification" in window ? Notification.permission === "granted" : null}
                label={"Notification" in window ? Notification.permission : "غير مدعوم"}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Worker</span>
              <StatusBadge ok={"serviceWorker" in navigator} label={"serviceWorker" in navigator ? "مدعوم" : "غير مدعوم"} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Median Bridge</span>
              <StatusBadge ok={isMedian} label={isMedian ? "نشط" : "غير متاح"} />
            </div>
          </div>
        </motion.div>

        {/* ── LocalStorage State ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="fancy-card rounded-3xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-sm text-pink-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-pink-500" /> localStorage
            </div>
            <button onClick={refreshLs} className="text-[10px] text-pink-500 font-semibold">تحديث</button>
          </div>
          <LocalItem
            label="OneSignal player_id (مُرسَل للسيرفر)"
            value={ls.player_id_sent}
            show={!!showTokens["os_sent"]}
            onToggle={() => setShowTokens(p => ({ ...p, os_sent: !p.os_sent }))}
          />
          <LocalItem
            label="OneSignal player_id (معلّق)"
            value={ls.player_id_pending}
            show={!!showTokens["os_pend"]}
            onToggle={() => setShowTokens(p => ({ ...p, os_pend: !p.os_pend }))}
          />
          <LocalItem
            label="FCM token (مُرسَل للسيرفر)"
            value={ls.fcm_token_sent}
            show={!!showTokens["fcm_sent"]}
            onToggle={() => setShowTokens(p => ({ ...p, fcm_sent: !p.fcm_sent }))}
          />
          <LocalItem
            label="FCM token (معلّق)"
            value={ls.fcm_token_pending}
            show={!!showTokens["fcm_pend"]}
            onToggle={() => setShowTokens(p => ({ ...p, fcm_pend: !p.fcm_pend }))}
          />
        </motion.div>

        {/* ── DB Status per Channel ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="fancy-card rounded-3xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold text-sm text-pink-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-pink-500" /> التوكنز في قاعدة البيانات
            </div>
            <button
              onClick={() => refetch()}
              className="text-[10px] text-pink-500 font-semibold flex items-center gap-1"
            >
              {isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              تحديث
            </button>
          </div>

          {/* OneSignal */}
          <div className="rounded-2xl border border-pink-100 p-3 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-pink-900">🔔 OneSignal (APK)</span>
              <StatusBadge ok={ch?.onesignal.status === "ok"} label={`${ch?.onesignal.count ?? 0} Player IDs`} />
            </div>
            <div className="text-[10px] text-muted-foreground">{ch?.onesignal.diagnosis ?? "جارٍ التحميل…"}</div>
            {ch?.onesignal.lastUpdated && (
              <div className="text-[9px] text-muted-foreground mt-0.5">
                آخر تحديث: {new Date(ch.onesignal.lastUpdated).toLocaleString("ar")}
              </div>
            )}
            {ch?.onesignal.tokens.map((t, i) => (
              <div key={i} className="mt-1 text-[10px] font-mono bg-green-50 rounded-lg px-2 py-1 text-green-800">
                {t.shortId} — {t.userAgent?.slice(0, 30) ?? "—"}
              </div>
            ))}
          </div>

          {/* FCM */}
          <div className="rounded-2xl border border-pink-100 p-3 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-pink-900">🔥 FCM (Chrome)</span>
              <StatusBadge ok={ch?.fcm.status === "ok"} label={`${ch?.fcm.count ?? 0} Tokens`} />
            </div>
            <div className="text-[10px] text-muted-foreground">{ch?.fcm.diagnosis ?? "جارٍ التحميل…"}</div>
            {ch?.fcm.lastUpdated && (
              <div className="text-[9px] text-muted-foreground mt-0.5">
                آخر تحديث: {new Date(ch.fcm.lastUpdated).toLocaleString("ar")}
              </div>
            )}
            {ch?.fcm.tokens.map((t, i) => (
              <div key={i} className="mt-1 text-[10px] font-mono bg-green-50 rounded-lg px-2 py-1 text-green-800">
                {t.shortToken} — {t.userAgent?.slice(0, 30) ?? "—"}
              </div>
            ))}
          </div>

          {/* VAPID */}
          <div className="rounded-2xl border border-pink-100 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-pink-900">🌐 VAPID Web Push</span>
              <StatusBadge ok={ch?.vapid.status === "ok"} label={`${ch?.vapid.count ?? 0} Subscriptions`} />
            </div>
            {(ch?.vapid.subscriptions ?? []).slice(0, 3).map((s, i) => (
              <div key={i} className="mt-1 text-[10px] font-mono bg-green-50 rounded-lg px-2 py-1 text-green-800 truncate">
                …{s.shortEndpoint}
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Checklist ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="fancy-card rounded-3xl p-4"
        >
          <div className="font-bold text-sm text-pink-900 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-pink-500" /> قائمة التحقق الكاملة
          </div>
          <CheckRow label="Token Generated — تم توليد التوكن"            ok={data?.checklist.step1_token_generated ?? null} />
          <CheckRow label="Token Saved Locally — تم الحفظ في الجهاز"     ok={!!(ls.player_id_sent || ls.fcm_token_sent || ls.player_id_pending || ls.fcm_token_pending)} />
          <CheckRow label="Token Sent To Server — تم الإرسال للسيرفر"    ok={data?.checklist.step3_token_sent_to_server ?? null} />
          <CheckRow label="Token Saved In Database — تم الحفظ في DB"      ok={data?.checklist.step4_token_in_database ?? null} />
          <CheckRow label="Token Linked To User — مربوط بحساب skandar"   ok={data?.checklist.step5_token_linked_to_user ?? null} />
          <CheckRow label="Notification Can Send — جاهز للإرسال"         ok={data?.checklist.step6_notification_can_send ?? null} />

          {data?.summary.nextStep && (
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {data.summary.nextStep}
            </div>
          )}
        </motion.div>

        {/* ── Action Buttons ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <button
            onClick={() => requestBridgeMutation.mutate()}
            disabled={requestBridgeMutation.isPending}
            className="w-full rounded-2xl bg-pink-600 text-white font-bold text-sm py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
          >
            {requestBridgeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
            طلب من Bridge (Median APK)
          </button>

          <button
            onClick={() => forceFlushMutation.mutate()}
            disabled={forceFlushMutation.isPending}
            className="w-full rounded-2xl bg-pink-100 text-pink-700 font-bold text-sm py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
          >
            {forceFlushMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            إعادة إرسال التوكنز للسيرفر
          </button>

          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !data?.summary.hasAnyToken}
            className="w-full rounded-2xl border-2 border-pink-200 text-pink-700 font-bold text-sm py-3 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
          >
            {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            إرسال إشعار اختباري
          </button>
        </motion.div>

        {/* ── Log Output ── */}
        {forceLog.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fancy-card rounded-3xl p-4"
          >
            <div className="font-bold text-xs text-pink-900 mb-2">نتائج العملية</div>
            <div className="space-y-1">
              {forceLog.map((l, i) => (
                <div key={i} className="text-[11px] font-mono bg-gray-50 rounded-lg px-2 py-1 text-gray-700">
                  {l}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── User Agent ── */}
        <div className="text-[9px] text-muted-foreground text-center px-4 break-all">
          {navigator.userAgent}
        </div>

      </div>
    </AppLayout>
  );
}
