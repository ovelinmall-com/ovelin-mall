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

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatbotRouter from "./chatbot";
import settingsRouter from "./settings";
import authRouter from "./auth";
import catalogRouter from "./catalog";
import ratingsRouter from "./ratings";
import wishlistRouter from "./wishlist";
import couponsRouter from "./coupons";
import ordersRouter from "./orders";
import walletRouter from "./wallet";
import referralsRouter from "./referrals";
import notificationsRouter from "./notifications";
import pushRouter from "./push";
import accountRouter from "./account";
import statsRouter from "./stats";
import supportRouter from "./support";
import supportExtrasRouter from "./support-extras";
import walletExtrasRouter from "./wallet-extras";
import transfersRouter from "./transfers";
import giftcardsRouter from "./giftcards";
import faqRouter from "./faq";
import codesRouter from "./codes";
import smmRouter from "./smm";
import subscriptionsRouter from "./subscriptions";

import adminLoginRouter from "./admin/login";
import adminCodesRouter from "./admin/codes";
import adminFaqRouter from "./admin/faq";
import adminSystemRouter from "./admin/system";
import adminUsersRouter from "./admin/users";
import adminOrdersRouter from "./admin/orders";
import adminProductsRouter from "./admin/products";
import adminTransactionsRouter from "./admin/transactions";
import adminSettingsRouter from "./admin/settings";
import adminCouponsRouter from "./admin/coupons";
import adminBannersRouter from "./admin/banners";
import adminAuditRouter from "./admin/audit";
import adminStatsRouter from "./admin/stats";
import adminSupportRouter from "./admin/support";
import adminSupportExtrasRouter from "./admin/support-extras";
import adminFlashSalesRouter from "./admin/flash-sales";
import adminSpinRouter from "./admin/spin";
import adminAnalyticsRouter from "./admin/analytics";
import adminAbTestsRouter from "./admin/abtests";
import adminFraudRouter from "./admin/fraud";
import adminSubscriptionPlansRouter from "./admin/subscription-plans";
import adminExtrasRouter from "./admin/extras";
import adminDepositRequestsRouter from "./admin/deposit-requests";
import adminServiceMaintenanceRouter from "./admin/service-maintenance";
import adminPostsRouter from "./admin/posts";
import adminProfitsRouter from "./admin/profits";
import postsRouter from "./posts";
import otpRouter from "./whatsapp-otp";
import referralWithdrawRouter from "./referral-withdraw";
import securityRouter from "./security";
import adminReferralWithdrawalsRouter from "./admin/referral-withdrawals";
import adminTabBadgesRouter from "./admin/tab-badges";
import receiptsRouter from "./receipts";
import callVerifyRouter from "./call-verify";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatbotRouter);
router.use(settingsRouter);
router.use(otpRouter);
router.use(authRouter);
router.use(codesRouter);
router.use(catalogRouter);
router.use(ratingsRouter);
router.use(wishlistRouter);
router.use(couponsRouter);
router.use(ordersRouter);
router.use(walletRouter);
router.use(referralsRouter);
router.use(notificationsRouter);
router.use(pushRouter);
router.use(accountRouter);
router.use(statsRouter);
router.use(supportRouter);
router.use(supportExtrasRouter);
router.use(walletExtrasRouter);
router.use(transfersRouter);
router.use(giftcardsRouter);
router.use(faqRouter);
router.use(smmRouter);
router.use(subscriptionsRouter);
router.use(postsRouter);
router.use(referralWithdrawRouter);
router.use(receiptsRouter);
router.use(securityRouter);
router.use(callVerifyRouter);

router.use(adminLoginRouter);
router.use(adminCodesRouter);
router.use(adminFaqRouter);
router.use(adminSystemRouter);
router.use(adminUsersRouter);
router.use(adminOrdersRouter);
router.use(adminProductsRouter);
router.use(adminTransactionsRouter);
router.use(adminSettingsRouter);
router.use(adminCouponsRouter);
router.use(adminBannersRouter);
router.use(adminAuditRouter);
router.use(adminStatsRouter);
router.use(adminSupportRouter);
router.use(adminSupportExtrasRouter);
router.use(adminFlashSalesRouter);
router.use(adminSpinRouter);
router.use(adminAnalyticsRouter);
router.use(adminAbTestsRouter);
router.use(adminFraudRouter);
router.use(adminSubscriptionPlansRouter);
router.use(adminExtrasRouter);
router.use(adminDepositRequestsRouter);
router.use(adminServiceMaintenanceRouter);
router.use(adminPostsRouter);
router.use(adminReferralWithdrawalsRouter);
router.use(adminTabBadgesRouter);
router.use(adminProfitsRouter);

export default router;
