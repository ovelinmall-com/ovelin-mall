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

import { memo } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Home, Newspaper, ShoppingBag, Wallet, User, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSupportUnreadCount, getGetSupportUnreadCountQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const PAGE_CHUNKS: Record<string, () => Promise<unknown>> = {
  "/":        () => import("@/pages/home"),
  "/posts":   () => import("@/pages/posts"),
  "/orders":  () => import("@/pages/orders"),
  "/wallet":  () => import("@/pages/wallet"),
  "/account": () => import("@/pages/account"),
  "/support": () => import("@/pages/support"),
};

const DATA_PREFETCH: Record<string, (qc: ReturnType<typeof useQueryClient>, user: unknown) => void> = {
  "/wallet": (qc, user) => {
    if (!user) return;
    qc.prefetchQuery({ queryKey: ["wallet"], queryFn: () => api("/api/wallet"), staleTime: 30 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: ["transactions"], queryFn: () => api("/api/wallet/transactions"), staleTime: 30 * 60 * 1000 });
  },
  "/account": (qc, user) => {
    if (!user) return;
    qc.prefetchQuery({ queryKey: ["me"], queryFn: () => api("/api/auth/me"), staleTime: 30 * 60 * 1000 });
    qc.prefetchQuery({ queryKey: ["dashboard"], queryFn: () => api("/api/user/dashboard"), staleTime: 30 * 60 * 1000 });
  },
  "/orders": (qc, user) => {
    if (!user) return;
    qc.prefetchQuery({ queryKey: ["orders"], queryFn: () => api("/api/orders"), staleTime: 30 * 60 * 1000 });
  },
};

function preload(href: string, qc: ReturnType<typeof useQueryClient>, user: unknown) {
  PAGE_CHUNKS[href]?.().catch(() => {});
  DATA_PREFETCH[href]?.(qc, user);
}

export const BottomNav = memo(function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: unread } = useGetSupportUnreadCount({
    query: {
      queryKey: getGetSupportUnreadCountQueryKey(),
      enabled: !!user,
      // ✅ FIX: رفع من 15s → 30s لتقليل طلبات الشبكة وre-renders
      refetchInterval: 30000,
      refetchOnWindowFocus: false,
    },
  });
  const supportUnread = unread?.count ?? 0;

  const left = [
    { href: "/posts", icon: Newspaper, label: "المنشورات", badge: 0 },
    { href: "/orders", icon: ShoppingBag, label: "طلباتي", badge: 0 },
  ];
  const right = [
    { href: "/wallet", icon: Wallet, label: "المحفظة", badge: 0 },
    { href: "/account", icon: User, label: "حسابي", badge: 0 },
  ];
  const support = { href: "/support", icon: LifeBuoy, label: "الدعم", badge: supportUnread };

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  const homeActive = location === "/";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto px-3 pb-3">
        <div className="relative">
          <div className="pointer-events-none absolute -inset-px rounded-[28px] bg-gradient-to-tr from-pink-500/20 via-rose-500/10 to-fuchsia-500/20 blur-xl" />

          {/* ✅ FIX: خفّفنا backdrop-blur من 2xl → lg لتخفيف عبء الرسم */}
          <div className="relative rounded-[28px] bg-white/80 dark:bg-card/80 backdrop-blur-lg border border-white/60 ring-1 ring-pink-200/60 shadow-[0_12px_30px_-10px_rgba(190,24,93,0.35)] overflow-visible">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-pink-300/70 to-transparent" />

            <div className="relative grid grid-cols-5 items-end h-[70px] px-2">
              {left.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  onPreload={() => preload(item.href, qc, user)}
                />
              ))}

              {/* ✅ FIX: استبدلنا animate بـ CSS translate ثابت لتجنب framer-motion spring المستمر */}
              <div className="relative flex justify-center">
                <Link
                  href="/"
                  onMouseEnter={() => preload("/", qc, user)}
                  onTouchStart={() => preload("/", qc, user)}
                >
                  <motion.div
                    whileTap={{ scale: 0.92 }}
                    className="relative"
                    style={{ transform: homeActive ? "translateY(-22px)" : "translateY(-16px)", transition: "transform 0.2s ease" }}
                  >
                    <div
                      className={cn(
                        "absolute inset-0 rounded-full blur-xl transition-opacity",
                        homeActive
                          ? "bg-pink-500/70 opacity-100"
                          : "bg-pink-500/40 opacity-70",
                      )}
                    />
                    <div className="relative w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-pink-400 via-rose-500 to-fuchsia-500 shadow-[0_10px_25px_-8px_rgba(236,72,153,0.6)]">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-600 via-rose-600 to-pink-700 flex items-center justify-center text-white">
                        <Home className="w-7 h-7 drop-shadow" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
                <span
                  className={cn(
                    "absolute -bottom-0.5 text-[9.5px] font-bold transition-all duration-200",
                    homeActive ? "text-pink-700 opacity-100" : "text-pink-500 opacity-80",
                  )}
                >
                  الرئيسية
                </span>
              </div>

              {right.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  onPreload={() => preload(item.href, qc, user)}
                />
              ))}
            </div>

            <Link
              href={support.href}
              onMouseEnter={() => preload(support.href, qc, user)}
              onTouchStart={() => preload(support.href, qc, user)}
            >
              <motion.div
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "absolute -top-3 right-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-extrabold shadow-lg border transition-colors",
                  isActive(support.href)
                    ? "bg-gradient-to-br from-pink-600 to-rose-700 text-white border-white/40 shadow-[0_8px_20px_-6px_rgba(190,24,93,0.55)]"
                    : "bg-white text-pink-700 border-pink-200 shadow-[0_6px_16px_-6px_rgba(190,24,93,0.3)]",
                )}
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                {support.label}
                {support.badge > 0 && (
                  <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center border border-white">
                    {support.badge > 9 ? "9+" : support.badge}
                  </span>
                )}
              </motion.div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});

const NavItem = memo(function NavItem({
  item,
  active,
  onPreload,
}: {
  item: { href: string; icon: typeof Home; label: string; badge: number };
  active: boolean;
  onPreload?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="relative flex flex-col items-center justify-center h-full text-muted-foreground"
      onMouseEnter={onPreload}
      onTouchStart={onPreload}
    >
      <motion.div
        whileTap={{ scale: 0.9 }}
        className="flex flex-col items-center gap-0.5"
      >
        <div
          className={cn(
            "relative p-2 rounded-2xl transition-all duration-300",
            active
              ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-[0_6px_14px_-4px_rgba(236,72,153,0.5)]"
              : "text-pink-500/80",
          )}
        >
          <Icon className="w-5 h-5" />
          {item.badge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center border border-white shadow">
              {item.badge > 9 ? "9+" : item.badge}
            </span>
          )}
        </div>
        <span
          className={cn(
            "text-[9.5px] font-bold transition-opacity duration-200",
            active ? "text-pink-700 opacity-100" : "text-pink-500/70 opacity-90",
          )}
        >
          {item.label}
        </span>
      </motion.div>
      {active && (
        <motion.span
          layoutId="navDot"
          className="absolute bottom-1 w-1 h-1 rounded-full bg-pink-600"
        />
      )}
    </Link>
  );
});
