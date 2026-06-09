import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@/lib/realtime";

// ================================================================
// BADGE REGISTRY — السجل المركزي لإشعارات تيوبات الأدمن
//
// لإضافة تيوب جديد في المستقبل:
//   1. أضف مفتاحاً جديداً في AdminTabBadges
//   2. أضف سطراً واحداً في BADGE_REGISTRY بالأسفل
//   3. أضف الاستعلام المقابل في tab-badges.ts بالباك-إند
// ================================================================

export type AdminTabBadges = {
  users: number;
  orders: number;
  pubgOrders: number;
  transactions: number;
  depositRequests: number;
  referralWithdrawals: number;
  support: number;
  posts: number;
  giftcards: number;
  prizes: number;
};

export type BadgeEntry = {
  /** مفتاح الـ API (camelCase) */
  key: keyof AdminTabBadges;
  /** معرّف التيوب في الـ UI */
  tabId: string;
  /** نص الإشعار — بالعربي، بدون إيموجي */
  label: string;
  /** هل يُخزَّن lastSeen في localStorage؟ (false فقط لـ support) */
  usesLocalStorage?: boolean;
};

/**
 * السجل المركزي — كل تيوب وبيانات إشعاره.
 * لإضافة تيوب جديد: سطر واحد هنا + استعلام في الباك-إند.
 */
export const BADGE_REGISTRY: BadgeEntry[] = [
  { key: "users",               tabId: "users",                label: "مستخدم جديد",        usesLocalStorage: true  },
  { key: "orders",              tabId: "orders",               label: "طلب جديد",            usesLocalStorage: true  },
  { key: "pubgOrders",          tabId: "pubg-orders",          label: "طلب PUBG جديد",       usesLocalStorage: true  },
  { key: "transactions",        tabId: "transactions",         label: "معاملة جديدة",        usesLocalStorage: true  },
  { key: "depositRequests",     tabId: "deposit-requests",     label: "طلب شحن جديد",        usesLocalStorage: true  },
  { key: "referralWithdrawals", tabId: "referral-withdrawals", label: "طلب سحب جديد",        usesLocalStorage: true  },
  { key: "support",             tabId: "support",              label: "رسالة غير مقروءة",    usesLocalStorage: false },
  { key: "posts",               tabId: "posts",                label: "منشور جديد",          usesLocalStorage: true  },
  { key: "giftcards",           tabId: "giftcards",            label: "بطاقة هدية جديدة",    usesLocalStorage: true  },
  { key: "prizes",              tabId: "prizes",               label: "سحب جديد",            usesLocalStorage: true  },
];

// ── مساعِدات مشتقة من السجل (لا تُعدَّل يدوياً) ──────────────────
const TAB_TO_ENTRY: Record<string, BadgeEntry> = Object.fromEntries(
  BADGE_REGISTRY.map((e) => [e.tabId, e]),
);
const KEY_TO_ENTRY: Record<string, BadgeEntry> = Object.fromEntries(
  BADGE_REGISTRY.map((e) => [e.key, e]),
);
// مفاتيح localStorage-tracked
const LS_KEYS = BADGE_REGISTRY
  .filter((e) => e.usesLocalStorage)
  .map((e) => e.key);

const QUERY_KEY = ["admin-tab-badges"];
const LS = (k: string) => `ovelin_admin_tab_seen_${k}`;

const ZERO: AdminTabBadges = {
  users: 0,
  orders: 0,
  pubgOrders: 0,
  transactions: 0,
  depositRequests: 0,
  referralWithdrawals: 0,
  support: 0,
  posts: 0,
  giftcards: 0,
  prizes: 0,
};

function readLastSeen(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of LS_KEYS) {
    const v = localStorage.getItem(LS(k));
    if (v) out[k] = v;
  }
  return out;
}

async function fetchBadges(): Promise<AdminTabBadges> {
  const lastSeen = readLastSeen();
  const r = await fetch("/api/admin/tab-badges", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lastSeen }),
  });
  if (!r.ok) throw new Error("فشل جلب الأرقام");
  return r.json();
}

export function useAdminTabBadges() {
  const qc = useQueryClient();

  const { data } = useQuery<AdminTabBadges>({
    queryKey: QUERY_KEY,
    queryFn: fetchBadges,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: ZERO,
    retry: false,
  });

  // استمع لأحداث WebSocket — رفع الرقم فوراً عند وصول حدث جديد
  useRealtime((ev) => {
    if (ev.event !== "admin:badge_update") return;
    const entry = KEY_TO_ENTRY[ev.payload?.tab as string]
      ?? TAB_TO_ENTRY[ev.payload?.tab as string];
    if (!entry) return;

    qc.setQueryData<AdminTabBadges>(QUERY_KEY, (old) => {
      if (!old) return old;
      return { ...old, [entry.key]: (old[entry.key] ?? 0) + 1 };
    });
    qc.invalidateQueries({ queryKey: QUERY_KEY });
  });

  const badges: AdminTabBadges = data ?? ZERO;

  /** عدد الإشعارات للتيوب */
  function getBadge(tabId: string): number {
    const entry = TAB_TO_ENTRY[tabId];
    if (!entry) return 0;
    return badges[entry.key] ?? 0;
  }

  /** نص الإشعار للتيوب (بدون إيموجي) */
  function getBadgeLabel(tabId: string): string {
    return TAB_TO_ENTRY[tabId]?.label ?? "";
  }

  /** ضع علامة "تمّت المشاهدة" على التيوب عند فتحه */
  function markSeen(tabId: string) {
    const entry = TAB_TO_ENTRY[tabId];
    if (!entry) return;

    qc.setQueryData<AdminTabBadges>(QUERY_KEY, (old) => {
      if (!old) return old;
      return { ...old, [entry.key]: 0 };
    });

    if (!entry.usesLocalStorage) {
      // support: أرسل طلب للسيرفر لتصفير الرسائل
      fetch("/api/admin/support/mark-all-read", {
        method: "POST",
        credentials: "include",
      })
        .then(() => qc.invalidateQueries({ queryKey: QUERY_KEY }))
        .catch(() => qc.invalidateQueries({ queryKey: QUERY_KEY }));
    } else {
      localStorage.setItem(LS(entry.key), new Date().toISOString());
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    }
  }

  return { badges, getBadge, getBadgeLabel, markSeen };
}
