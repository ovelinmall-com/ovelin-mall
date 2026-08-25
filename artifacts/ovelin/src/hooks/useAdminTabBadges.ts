import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@/lib/realtime";
import {
  getListAdminUsersQueryKey,
  getListAdminOrdersQueryKey,
  getListAdminTransactionsQueryKey,
  getListAdminSupportTicketsQueryKey,
  getGetAdminStatsQueryKey,
} from "@workspace/api-client-react";

// ================================================================
// BADGE REGISTRY — السجل المركزي لإشعارات تيوبات الأدمن
// ================================================================

export type AdminTabBadges = {
  users: number;
  orders: number;
  pubgOrders: number;
  freefireOrders: number;
  codOrders: number;
  cocOrders: number;
  crOrders: number;
  mlOrders: number;
  giOrders: number;
  fcOrders: number;
  brawlOrders: number;
  hokOrders: number;
  sgOrders: number;
  rbOrders: number;
  transactions: number;
  depositRequests: number;
  referralWithdrawals: number;
  support: number;
  posts: number;
  giftcards: number;
  prizes: number;
};

export type BadgeEntry = {
  key: keyof AdminTabBadges;
  tabId: string;
  label: string;
  usesLocalStorage?: boolean;
};

export const BADGE_REGISTRY: BadgeEntry[] = [
  { key: "users",               tabId: "users",                label: "مستخدم جديد",        usesLocalStorage: true  },
  { key: "orders",              tabId: "orders",               label: "طلب جديد",            usesLocalStorage: true  },
  { key: "pubgOrders",          tabId: "pubg-orders",          label: "طلب PUBG جديد",       usesLocalStorage: true  },
  { key: "freefireOrders",      tabId: "freefire-orders",      label: "طلب فري فاير جديد",   usesLocalStorage: true  },
  { key: "codOrders",           tabId: "cod-orders",           label: "طلب Call of Duty جديد", usesLocalStorage: true  },
  { key: "cocOrders",           tabId: "coc-orders",           label: "طلب Clash of Clans جديد", usesLocalStorage: true  },
  { key: "crOrders",            tabId: "cr-orders",            label: "طلب Clash Royale جديد", usesLocalStorage: true  },
  { key: "mlOrders",            tabId: "ml-orders",            label: "طلب Mobile Legends جديد", usesLocalStorage: true  },
  { key: "giOrders",            tabId: "gi-orders",            label: "طلب Genshin Impact جديد", usesLocalStorage: true  },
  { key: "fcOrders",            tabId: "fc-orders",            label: "طلب EA FC Mobile جديد", usesLocalStorage: true  },
  { key: "brawlOrders",         tabId: "brawl-orders",         label: "طلب Brawl Stars جديد", usesLocalStorage: true  },
  { key: "hokOrders",           tabId: "hok-orders",           label: "طلب Honor of Kings جديد", usesLocalStorage: true  },
  { key: "sgOrders",            tabId: "sg-orders",            label: "طلب Stumble Guys جديد", usesLocalStorage: true  },
  { key: "rbOrders",            tabId: "rb-orders",            label: "طلب Roblox جديد", usesLocalStorage: true  },
  { key: "transactions",        tabId: "transactions",         label: "معاملة جديدة",        usesLocalStorage: true  },
  { key: "depositRequests",     tabId: "deposit-requests",     label: "طلب شحن جديد",        usesLocalStorage: true  },
  { key: "referralWithdrawals", tabId: "referral-withdrawals", label: "طلب سحب جديد",        usesLocalStorage: true  },
  { key: "support",             tabId: "support",              label: "رسالة غير مقروءة",    usesLocalStorage: false },
  { key: "posts",               tabId: "posts",                label: "منشور جديد",          usesLocalStorage: true  },
  { key: "giftcards",           tabId: "giftcards",            label: "بطاقة هدية جديدة",    usesLocalStorage: true  },
  { key: "prizes",              tabId: "prizes",               label: "سحب جديد",            usesLocalStorage: true  },
];

const TAB_TO_ENTRY: Record<string, BadgeEntry> = Object.fromEntries(
  BADGE_REGISTRY.map((e) => [e.tabId, e]),
);
const KEY_TO_ENTRY: Record<string, BadgeEntry> = Object.fromEntries(
  BADGE_REGISTRY.map((e) => [e.key, e]),
);
const LS_KEYS = BADGE_REGISTRY
  .filter((e) => e.usesLocalStorage)
  .map((e) => e.key);

const QUERY_KEY = ["admin-tab-badges"];
const LS = (k: string) => `ovelin_admin_tab_seen_${k}`;

const ZERO: AdminTabBadges = {
  users: 0, orders: 0, pubgOrders: 0, freefireOrders: 0, codOrders: 0, cocOrders: 0, crOrders: 0, mlOrders: 0, giOrders: 0, fcOrders: 0, brawlOrders: 0, hokOrders: 0, sgOrders: 0, rbOrders: 0,
  transactions: 0, depositRequests: 0, referralWithdrawals: 0, support: 0,
  posts: 0, giftcards: 0, prizes: 0,
};

// ════════════════════════════════════════════════════════════════
// خريطة شاملة: كل badge_update → قائمة queries تتجدد فوراً
//
// الإصلاح الجوهري: كل حدث يؤثر على رصيد المستخدم يجدّد
// قائمة المستخدمين أيضاً حتى يرى الأدمن الرصيد المحدَّث
// في نفس اللحظة بدون الحاجة لتسجيل الخروج وإعادة الدخول.
// ════════════════════════════════════════════════════════════════
const DATA_QUERY_KEYS_MAP: Partial<Record<keyof AdminTabBadges, ReadonlyArray<readonly unknown[]>>> = {
  users: [
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  orders: [
    getListAdminOrdersQueryKey(),
    getListAdminUsersQueryKey(),     // ← رصيد المستخدم ينقص عند الطلب
    getGetAdminStatsQueryKey(),
  ],
  pubgOrders: [
    ["admin-pubg-orders"],
    getListAdminUsersQueryKey(),     // ← رصيد المستخدم ينقص
    getGetAdminStatsQueryKey(),
  ],
  freefireOrders: [
    ["admin-freefire-orders"],
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  codOrders: [
    ["admin-cod-orders"],
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  cocOrders: [
    ["admin-coc-orders"],
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  crOrders: [
    ["admin-cr-orders"],
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  mlOrders: [
    ["admin-ml-orders"],
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  giOrders: [
    ["admin-gi-orders"],
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  fcOrders: [
    ["admin-fc-orders"],
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  brawlOrders: [
    ["admin-brawl-orders"],
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  hokOrders: [
    ["admin-hok-orders"],
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  sgOrders: [
    ["admin-sg-orders"],
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  rbOrders: [
    ["admin-rb-orders"],
    getListAdminUsersQueryKey(),
    getGetAdminStatsQueryKey(),
  ],
  transactions: [
    getListAdminTransactionsQueryKey(),
    getListAdminUsersQueryKey(),     // ← رصيد المستخدم يتغير
    getGetAdminStatsQueryKey(),
  ],
  depositRequests: [
    ["admin-deposit-requests"],
    getListAdminUsersQueryKey(),     // ← رصيد يزيد بعد الاعتماد
    getGetAdminStatsQueryKey(),
  ],
  referralWithdrawals: [
    ["admin-referral-withdrawals"],
    getListAdminUsersQueryKey(),     // ← رصيد إحالة يتغير
    getGetAdminStatsQueryKey(),
  ],
  support: [
    getListAdminSupportTicketsQueryKey(),
  ],
  giftcards: [
    ["admin-giftcards"],
    getGetAdminStatsQueryKey(),
  ],
  prizes: [
    ["admin-prizes"],
    getGetAdminStatsQueryKey(),
  ],
  // posts: يستخدم useState/fetch محلي — يُعاد تحميله من الخادم عند فتح التيوب
};

// ════════════════════════════════════════════════════════════════
// تهيئة الـ lastSeen عند أول تشغيل — أي مفتاح غير مُعيَّن يُضبَط
// على الوقت الحالي حتى لا يعدّ السيرفر كل السجلات التاريخية
// ════════════════════════════════════════════════════════════════
function ensureInitialized(): void {
  const now = new Date().toISOString();
  for (const k of LS_KEYS) {
    if (!localStorage.getItem(LS(k))) {
      localStorage.setItem(LS(k), now);
    }
  }
}

function readLastSeen(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of LS_KEYS) {
    const v = localStorage.getItem(LS(k));
    if (v) out[k] = v;
  }
  return out;
}

async function fetchBadges(): Promise<AdminTabBadges> {
  ensureInitialized();
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

  // ════════════════════════════════════════════════════════════════
  // معالج أحداث WebSocket — يُحدِّث الأرقام والبيانات فوراً
  //
  // عند وصول admin:badge_update:
  //   1. نرفع عداد الإشعار في الـ UI فوراً
  //   2. نجدد جميع البيانات المرتبطة بهذا الحدث
  //      (بما فيها قائمة المستخدمين إن تأثر الرصيد)
  // ════════════════════════════════════════════════════════════════
  useRealtime((ev) => {
    if (ev.event !== "admin:badge_update") return;

    const entry = KEY_TO_ENTRY[ev.payload?.tab as string]
      ?? TAB_TO_ENTRY[ev.payload?.tab as string];
    if (!entry) return;

    // 1) رفع عداد الإشعار فوراً (بدون invalidate لتجنب التضارب مع الـ optimistic update)
    qc.setQueryData<AdminTabBadges>(QUERY_KEY, (old) => {
      if (!old) return old;
      return { ...old, [entry.key]: (old[entry.key] ?? 0) + 1 };
    });

    // 2) تجديد جميع البيانات المرتبطة (فعّال حتى لو لم يكن التيوب مفتوحاً)
    const keys = DATA_QUERY_KEYS_MAP[entry.key];
    if (keys) {
      for (const key of keys) {
        qc.invalidateQueries({ queryKey: key as unknown[] });
      }
    }
  });

  const badges: AdminTabBadges = data ?? ZERO;

  function getBadge(tabId: string): number {
    const entry = TAB_TO_ENTRY[tabId];
    if (!entry) return 0;
    return badges[entry.key] ?? 0;
  }

  function getBadgeLabel(tabId: string): string {
    return TAB_TO_ENTRY[tabId]?.label ?? "";
  }

  function markSeen(tabId: string) {
    const entry = TAB_TO_ENTRY[tabId];
    if (!entry) return;

    // تصفير العداد فوراً في الـ UI
    qc.setQueryData<AdminTabBadges>(QUERY_KEY, (old) => {
      if (!old) return old;
      return { ...old, [entry.key]: 0 };
    });

    if (!entry.usesLocalStorage) {
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

    // تجديد البيانات عند فتح التيوب — ضمان عرض أحدث المعلومات
    const keys = DATA_QUERY_KEYS_MAP[entry.key];
    if (keys) {
      for (const key of keys) {
        qc.invalidateQueries({ queryKey: key as unknown[] });
      }
    }
  }

  return { badges, getBadge, getBadgeLabel, markSeen };
}
