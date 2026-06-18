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

import { lazy, Suspense, useEffect, useState, useRef, useCallback } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { MotionConfig } from "framer-motion";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { ToastHost } from "@/components/Toast";
import { SplashScreen } from "@/components/SplashScreen";
import { AppInstallScreen } from "@/components/AppInstallScreen";
import { Chatbot } from "@/components/Chatbot";
import { PushOptIn } from "@/components/PushOptIn";
import { trackPageView } from "@/lib/analytics";

const Home           = lazy(() => import("@/pages/home"));
const Posts          = lazy(() => import("@/pages/posts"));
const Category       = lazy(() => import("@/pages/category"));
const Product        = lazy(() => import("@/pages/product"));
const Login          = lazy(() => import("@/pages/login"));
const Register       = lazy(() => import("@/pages/register"));
const Account        = lazy(() => import("@/pages/account"));
const Wallet         = lazy(() => import("@/pages/wallet"));
const Orders         = lazy(() => import("@/pages/orders"));
const Referrals      = lazy(() => import("@/pages/referrals"));
const CartSuccess    = lazy(() => import("@/pages/cart-success"));
const Cart           = lazy(() => import("@/pages/cart"));
const Support        = lazy(() => import("@/pages/support"));
const SupportNew     = lazy(() => import("@/pages/support-new"));
const SupportDetail  = lazy(() => import("@/pages/support-detail"));
const Lounge         = lazy(() => import("@/pages/lounge"));
const Transfers      = lazy(() => import("@/pages/transfers"));
const Security       = lazy(() => import("@/pages/security"));
const Help           = lazy(() => import("@/pages/help"));
const Notifications  = lazy(() => import("@/pages/notifications"));
const Wishlist       = lazy(() => import("@/pages/wishlist"));
const GiftCards      = lazy(() => import("@/pages/gift-cards"));
const Status         = lazy(() => import("@/pages/status"));
const Prizes         = lazy(() => import("@/pages/prizes"));
const Spin           = lazy(() => import("@/pages/spin"));
const Flash          = lazy(() => import("@/pages/flash"));
const Subscriptions  = lazy(() => import("@/pages/subscriptions"));
const Crypto         = lazy(() => import("@/pages/crypto"));
const AdminLogin     = lazy(() => import("@/pages/admin/login"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminAnalytics = lazy(() => import("@/pages/admin/analytics"));
const AdminFraud     = lazy(() => import("@/pages/admin/fraud"));
const AdminFlashSales      = lazy(() => import("@/pages/admin/flash-sales"));
const AdminSubscriptions   = lazy(() => import("@/pages/admin/subscriptions"));
const AdminSpin      = lazy(() => import("@/pages/admin/spin"));
const AdminAbTests   = lazy(() => import("@/pages/admin/abtests"));
const AdminCodes     = lazy(() => import("@/pages/admin/codes"));
const AdminSmmServices     = lazy(() => import("@/pages/admin/smm-services"));
const AdminProfits         = lazy(() => import("@/pages/admin/profits"));
const Game           = lazy(() => import("@/pages/game"));
const PubgTopup      = lazy(() => import("@/pages/pubg-topup"));
const PubgCodes      = lazy(() => import("@/pages/pubg-codes"));
const MyCodes        = lazy(() => import("@/pages/my-codes"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword  = lazy(() => import("@/pages/reset-password"));
const VerifyEmail    = lazy(() => import("@/pages/verify-email"));
const PushDebug      = lazy(() => import("@/pages/push-debug"));
const NotFound       = lazy(() => import("@/pages/not-found"));

const IDLE_TIMEOUT_MS = 7 * 60 * 1000;
const LAST_ACTIVE_KEY = "ovelin_last_active";

/* ── Falling pink stars — CSS-only, 11 stars, no JS animation ── */
const FALL_STARS = [
  { left: "7%",  size: 7,  dur: 9,   delay: 0    },
  { left: "18%", size: 5,  dur: 11,  delay: 1.8  },
  { left: "30%", size: 9,  dur: 8,   delay: 3.2  },
  { left: "43%", size: 6,  dur: 10,  delay: 0.6  },
  { left: "55%", size: 8,  dur: 12,  delay: 4.5  },
  { left: "67%", size: 5,  dur: 8.5, delay: 2.1  },
  { left: "77%", size: 10, dur: 11,  delay: 1.0  },
  { left: "88%", size: 6,  dur: 9.5, delay: 5.3  },
  { left: "24%", size: 7,  dur: 13,  delay: 6.7  },
  { left: "61%", size: 5,  dur: 10,  delay: 3.9  },
  { left: "92%", size: 8,  dur: 8,   delay: 7.1  },
] as const;

function FallingStars() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden stars-container" aria-hidden="true">
      {FALL_STARS.slice(0, 8).map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: "-20px",
            left: s.left,
            fontSize: s.size,
            color: i % 3 === 0 ? "#f9a8d4" : i % 3 === 1 ? "#ec4899" : "#fda4af",
            animation: `star-fall ${s.dur}s linear ${s.delay}s infinite`,
            userSelect: "none",
          }}
        >★</span>
      ))}
    </div>
  );
}

function BackExitHandler({ onShowExitToast }: { onShowExitToast: () => void }) {
  const [location] = useLocation();
  const lastBackRef = useRef<number>(0);
  const guardedRef = useRef(false);

  useEffect(() => {
    if (location !== "/") { guardedRef.current = false; return; }
    if (!guardedRef.current) {
      window.history.pushState({ ovelin_guard: true }, "");
      guardedRef.current = true;
    }
    const handlePop = () => {
      const now = Date.now();
      if (now - lastBackRef.current < 2000) {
        guardedRef.current = false;
        window.history.back();
        return;
      }
      lastBackRef.current = now;
      window.history.pushState({ ovelin_guard: true }, "");
      onShowExitToast();
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [location, onShowExitToast]);

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      // refetchOnMount: false → لا إعادة طلب عند التنقل إذا البيانات لم تنته صلاحيتها
      refetchOnMount: false,
      staleTime: 30 * 60 * 1000,   // 30 دقيقة — البيانات تبقى طازجة
      gcTime: 24 * 60 * 60 * 1000, // 24 ساعة في الذاكرة
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "ovelin-cache-v2",          // v2 — تجاهل الكاش القديم عند أول تشغيل
  throttleTime: 1000,              // كتابة كل ثانية بدلاً من 200ms (تخفيف الضغط على localStorage)
});

function PageTracker() {
  const [location] = useLocation();
  useEffect(() => { trackPageView(location); }, [location]);
  return null;
}

// تمرير للأعلى فقط عند التنقل للأمام، لا عند الرجوع
function ScrollToTop() {
  const [location] = useLocation();
  const prevRef = useRef<string>("");
  useEffect(() => {
    // إذا تغيّر المسار وليس عبر popstate (أي تنقل للأمام) → اذهب للأعلى
    const handlePop = () => { prevRef.current = "__back__"; };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);
  useEffect(() => {
    if (prevRef.current === "__back__") {
      prevRef.current = location;
      return; // الرجوع — لا تتحرك
    }
    prevRef.current = location;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
  return null;
}

// حل ٣: تحميل الصفحات الأساسية مبكراً في الخلفية بعد ثانيتين
function EagerPreloader() {
  useEffect(() => {
    const t = setTimeout(() => {
      [
        import("@/pages/home"),
        import("@/pages/wallet"),
        import("@/pages/orders"),
        import("@/pages/account"),
        import("@/pages/posts"),
      ].forEach(p => p.catch(() => {}));
    }, 2000);
    return () => clearTimeout(t);
  }, []);
  return null;
}


const PageFallback = () => (
  <div className="min-h-[60dvh] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-pink-400 border-t-transparent animate-spin" />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/posts" component={Posts} />
      <Route path="/category/:slug" component={Category} />
      <Route path="/product/:id" component={Product} />
      <Route path="/cart" component={Cart} />
      <Route path="/cart-success/:orderId" component={CartSuccess} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/account" component={Account} />
      <Route path="/my-codes" component={MyCodes} />
      <Route path="/game/:slug" component={Game} />
      <Route path="/pubg-topup" component={PubgTopup} />
      <Route path="/pubg-codes" component={PubgCodes} />
      <Route path="/wallet" component={Wallet} />
      <Route path="/orders" component={Orders} />
      <Route path="/referrals" component={Referrals} />
      <Route path="/support" component={Support} />
      <Route path="/support/new" component={SupportNew} />
      <Route path="/support/:id" component={SupportDetail} />
      <Route path="/lounge" component={Lounge} />
      <Route path="/transfers" component={Transfers} />
      <Route path="/security" component={Security} />
      <Route path="/help" component={Help} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/wishlist" component={Wishlist} />
      <Route path="/gift-cards" component={GiftCards} />
      <Route path="/status" component={Status} />
      <Route path="/prizes" component={Prizes} />
      <Route path="/spin" component={Spin} />
      <Route path="/flash" component={Flash} />
      <Route path="/subscriptions" component={Subscriptions} />
      <Route path="/crypto" component={Crypto} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/admin/fraud" component={AdminFraud} />
      <Route path="/admin/flash-sales" component={AdminFlashSales} />
      <Route path="/admin/subscriptions" component={AdminSubscriptions} />
      <Route path="/admin/spin" component={AdminSpin} />
      <Route path="/admin/abtests" component={AdminAbTests} />
      <Route path="/admin/codes" component={AdminCodes} />
      <Route path="/admin/smm-services" component={AdminSmmServices} />
      <Route path="/admin/profits" component={AdminProfits} />
      <Route path="/push-debug" component={PushDebug} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const [splashDone, setSplashDone] = useState(false);
  const [installDone, setInstallDone] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIX #6: Throttle localStorage writes — was called on EVERY click/touchstart (main thread jank)
  const lastSaveRef = useRef(0);

  const handleShowExitToast = useCallback(() => {
    setShowExitToast(true);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => setShowExitToast(false), 2000);
  }, []);

  useEffect(() => {
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastSaveRef.current < 60_000) return; // FIX #6: max once per minute
      lastSaveRef.current = now;
      try { localStorage.setItem(LAST_ACTIVE_KEY, String(now)); } catch { /* ignore */ }
    };
    window.addEventListener("click", updateActivity, { passive: true });
    window.addEventListener("touchstart", updateActivity, { passive: true });
    return () => {
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("touchstart", updateActivity);
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); } catch { /* ignore */ }
      } else {
        try {
          const last = Number(localStorage.getItem(LAST_ACTIVE_KEY) || "0");
          if (last > 0 && Date.now() - last > IDLE_TIMEOUT_MS) {
            setSplashDone(false);
            setInstallDone(false);
          }
        } catch { /* ignore */ }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  return (
    // FIX #14: reducedMotion="user" respects device Low Power Mode & accessibility settings
    // type:"tween" avoids spring physics calculation on every animation (faster on low-end CPUs)
    <MotionConfig reducedMotion="user" transition={{ type: "tween", duration: 0.18 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
      >
        <WouterRouter base={base}>
          <I18nProvider>
            <AuthProvider>
              {/* 1) شاشة الترحيب */}
              {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
              {/* 2) شاشة تحميل التطبيق (تظهر بعد السبلاش في كل زيارة عبر المتصفح) */}
              {splashDone && !installDone && (
                <AppInstallScreen onDone={() => setInstallDone(true)} />
              )}
              <PageTracker />
              <ScrollToTop />
              <EagerPreloader />
              <BackExitHandler onShowExitToast={handleShowExitToast} />
              <PushOptIn />
              <div className="app-bg min-h-[100dvh] w-full">
                <div className="max-w-md mx-auto min-h-[100dvh] relative shadow-[0_0_60px_-10px_rgba(190,24,93,0.3)] overflow-x-hidden">
                  <FallingStars />
                  <Router />
                  <ToastHost />
                  <Chatbot />
                </div>
              </div>
              {showExitToast && (
                <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999] bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl pointer-events-none">
                  اضغط مرة أخرى للخروج
                </div>
              )}
            </AuthProvider>
          </I18nProvider>
        </WouterRouter>
      </PersistQueryClientProvider>
    </MotionConfig>
  );
}

export default App;
