// ================================================================
// useAppIconBadge — يضبط رقم أيقونة التطبيق (APK/PWA badge)
//
// المنطق:
//   أدمن  → مجموع badges التيوبات (مع احترام lastSeen من localStorage)
//   مستخدم→ مجموع الإشعارات غير المقروءة الممرَّرة من BottomNav
//   navigator.setAppBadge(total)  ← يظهر الرقم على الأيقونة
//   navigator.clearAppBadge()     ← يُزيل الرقم إذا = 0
// ================================================================

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useRealtimeEvent } from "@/lib/realtime";

const ADMIN_EMAIL = "skandarabdoalatif@gmail.com";
const ADMIN_BADGE_QUERY_KEY = ["admin-icon-badge-total"];

// ── نفس مفاتيح localStorage المستخدمة في useAdminTabBadges ──────
const LS_PREFIX = "ovelin_admin_tab_seen_";
const LS_KEYS = [
  "users", "orders", "pubgOrders", "transactions",
  "depositRequests", "referralWithdrawals",
  "posts", "giftcards", "prizes",
] as const;

function lsKey(k: string) { return `${LS_PREFIX}${k}`; }

function ensureInitialized(): void {
  const now = new Date().toISOString();
  for (const k of LS_KEYS) {
    if (!localStorage.getItem(lsKey(k))) localStorage.setItem(lsKey(k), now);
  }
}

function readLastSeen(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of LS_KEYS) {
    const v = localStorage.getItem(lsKey(k));
    if (v) out[k] = v;
  }
  return out;
}

async function fetchAdminBadgeTotal(): Promise<number> {
  try {
    ensureInitialized();
    const lastSeen = readLastSeen();
    const r = await fetch("/api/admin/tab-badges", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastSeen }),
    });
    if (!r.ok) return 0;
    const data = await r.json() as Record<string, number>;
    return Object.values(data).reduce((sum, v) => sum + (v ?? 0), 0);
  } catch {
    return 0;
  }
}

/**
 * استدعِ هذا الـ hook في BottomNav
 * @param userBadgeTotal مجموع إشعارات المستخدم (orders + wallet + supportUnread + referrals)
 */
export function useAppIconBadge(userBadgeTotal: number) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data: adminTotal = 0 } = useQuery<number>({
    queryKey: ADMIN_BADGE_QUERY_KEY,
    queryFn: fetchAdminBadgeTotal,
    enabled: isAdmin,
    refetchInterval: isAdmin ? 30_000 : false,
    refetchOnWindowFocus: isAdmin,
    refetchOnMount: isAdmin,
    retry: false,
    staleTime: 0,
    placeholderData: 0,
  });

  // تحديث فوري عند وصول حدث badge_update للأدمن عبر WebSocket
  useRealtimeEvent((ev) => {
    if (!isAdmin) return;
    if (ev.event === "admin:badge_update") {
      qc.setQueryData<number>(ADMIN_BADGE_QUERY_KEY, (old) => (old ?? 0) + 1);
    }
  });

  // الأدمن: إشعارات التيوبات فقط — المستخدم: إشعاراته فقط
  const total = isAdmin ? adminTotal : userBadgeTotal;

  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    if (total > 0) {
      (navigator as Navigator & { setAppBadge: (n: number) => Promise<void> })
        .setAppBadge(total)
        .catch(() => {});
    } else {
      if ("clearAppBadge" in navigator) {
        (navigator as Navigator & { clearAppBadge: () => Promise<void> })
          .clearAppBadge()
          .catch(() => {});
      }
    }
  }, [total]);
}
