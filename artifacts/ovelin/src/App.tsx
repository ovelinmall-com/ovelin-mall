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

import { lazy, Suspense, useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { MotionConfig } from "framer-motion";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { ToastHost } from "@/components/Toast";
import { SplashScreen } from "@/components/SplashScreen";
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
const Game           = lazy(() => import("@/pages/game"));
const PubgTopup      = lazy(() => import("@/pages/pubg-topup"));
const PubgCodes      = lazy(() => import("@/pages/pubg-codes"));
const MyCodes        = lazy(() => import("@/pages/my-codes"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword  = lazy(() => import("@/pages/reset-password"));
const VerifyEmail    = lazy(() => import("@/pages/verify-email"));
const NotFound       = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 60 * 1000,   // حل ٤: رفع من 5 → 30 دقيقة (بيانات الكاش تظهر فوراً)
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "ovelin-cache-v1",
  throttleTime: 200,               // كتابة الكاش أسرع (كان 1000ms)
});

function PageTracker() {
  const [location] = useLocation();
  useEffect(() => { trackPageView(location); }, [location]);
  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location]);
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
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const [splashDone, setSplashDone] = useState(false);
  return (
    <MotionConfig>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000 }}
      >
        <WouterRouter base={base}>
          <I18nProvider>
            <AuthProvider>
              {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
              <PageTracker />
              <ScrollToTop />
              <EagerPreloader />
              <div className="app-bg min-h-[100dvh] w-full">
                <div className="max-w-md mx-auto min-h-[100dvh] relative shadow-[0_0_60px_-10px_rgba(190,24,93,0.3)] overflow-x-hidden">
                  <Router />
                  <ToastHost />
                  <Chatbot />
                </div>
              </div>
            </AuthProvider>
          </I18nProvider>
        </WouterRouter>
      </PersistQueryClientProvider>
    </MotionConfig>
  );
}

export default App;
