// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Aiven PostgreSQL
// postgres://avnadmin:AVNS_eIjn4l31K3XBHR6TE5A@pg-3d55c6ad-dghmoaz-3d26.k.aivencloud.com:26313/defaultdb
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Aiven PostgreSQL
// postgres://avnadmin:AVNS_eIjn4l31K3XBHR6TE5A@pg-3d55c6ad-dghmoaz-3d26.k.aivencloud.com:26313/defaultdb
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import { pgTable, serial, varchar, text, integer, boolean, timestamp, numeric, uniqueIndex, jsonb } from "drizzle-orm/pg-core";

export const blockedPhonesTable = pgTable("blocked_phones", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  reason: text("reason").notNull().default("too_many_resends"),
  blockedAt: timestamp("blocked_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 160 }).unique(),
  passwordHash: text("password_hash").notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  cashbackBalance: numeric("cashback_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).notNull().default("0"),
  vipLevel: varchar("vip_level", { length: 16 }).notNull().default("Bronze"),
  referralCode: varchar("referral_code", { length: 16 }).notNull().unique(),
  referredBy: varchar("referred_by", { length: 16 }),
  isBlocked: boolean("is_blocked").notNull().default(false),
  // New luxury / account features
  avatarUrl: text("avatar_url"),
  dob: varchar("dob", { length: 10 }),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  withdrawPinHash: text("withdraw_pin_hash"),
  dailySpendLimit: numeric("daily_spend_limit", { precision: 12, scale: 2 }).notNull().default("0"),
  monthlySpendLimit: numeric("monthly_spend_limit", { precision: 12, scale: 2 }).notNull().default("0"),
  primeUntil: timestamp("prime_until", { withTimezone: true }),
  notifyEmail: boolean("notify_email").notNull().default(true),
  notifyPush: boolean("notify_push").notNull().default(true),
  notifyWhatsapp: boolean("notify_whatsapp").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  phone: varchar("phone", { length: 20 }).unique(),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  displayId: varchar("display_id", { length: 8 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  oldPrice: numeric("old_price", { precision: 12, scale: 2 }),
  category: varchar("category", { length: 64 }).notNull(),
  platform: varchar("platform", { length: 64 }),
  quantity: varchar("quantity", { length: 64 }),
  deliveryTime: varchar("delivery_time", { length: 64 }),
  imageUrl: text("image_url"),
  badge: varchar("badge", { length: 32 }),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }).notNull().default("0"),
  ratingCount: integer("rating_count").notNull().default(0),
  salesCount: integer("sales_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  smmServiceId: varchar("smm_service_id", { length: 32 }),
  smmRateUsd: numeric("smm_rate_usd", { precision: 12, scale: 6 }),
  smmMin: integer("smm_min"),
  smmMax: integer("smm_max"),
  smmType: varchar("smm_type", { length: 64 }),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  productName: text("product_name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  cashbackUsed: numeric("cashback_used", { precision: 12, scale: 2 }).notNull().default("0"),
  finalPrice: numeric("final_price", { precision: 12, scale: 2 }).notNull(),
  couponCode: varchar("coupon_code", { length: 32 }),
  targetInfo: text("target_info").notNull(),
  notes: text("notes"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  proofUrl: text("proof_url"),
  deliveredCode: text("delivered_code"),
  deliveredCodeId: integer("delivered_code_id"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productCodesTable = pgTable("product_codes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("available"),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "set null" }),
  soldToUserId: integer("sold_to_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  soldAt: timestamp("sold_at", { withTimezone: true }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: varchar("method", { length: 64 }),
  reference: text("reference"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  meta: text("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  referredUserId: integer("referred_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  earned: numeric("earned", { precision: 12, scale: 2 }).notNull().default("0"),
  signupBonus: numeric("signup_bonus", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessionsTable = pgTable("sessions", {
  id: varchar("id", { length: 128 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  userAgent: text("user_agent"),
  ip: varchar("ip", { length: 64 }),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 32 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderEventsTable = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 32 }).notNull(),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const settingsTable = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  description: text("description").notNull().default(""),
  type: varchar("type", { length: 16 }).notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull(),
  maxUses: integer("max_uses").notNull().default(0),
  usedCount: integer("used_count").notNull().default(0),
  minOrder: numeric("min_order", { precision: 12, scale: 2 }).notNull().default("0"),
  applyToCategory: varchar("apply_to_category", { length: 64 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const couponRedemptionsTable = pgTable("coupon_redemptions", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull().references(() => couponsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const ratingsTable = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  stars: integer("stars").notNull(),
  comment: text("comment").notNull().default(""),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqUserProduct: uniqueIndex("ratings_user_product_unique").on(t.userId, t.productId),
}));

export const wishlistTable = pgTable("wishlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqUserProduct: uniqueIndex("wishlist_user_product_unique").on(t.userId, t.productId),
}));

export const passwordResetsTable = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 128 }).notNull().unique(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actor: varchar("actor", { length: 64 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  entity: varchar("entity", { length: 64 }).notNull(),
  entityId: varchar("entity_id", { length: 64 }),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  category: varchar("category", { length: 32 }).notNull().default("general"),
  status: varchar("status", { length: 16 }).notNull().default("open"),
  priority: varchar("priority", { length: 16 }).notNull().default("normal"),
  rating: integer("rating"),
  ratingComment: text("rating_comment"),
  lastUserAt: timestamp("last_user_at", { withTimezone: true }).defaultNow().notNull(),
  lastAdminAt: timestamp("last_admin_at", { withTimezone: true }),
  unreadForUser: integer("unread_for_user").notNull().default(0),
  unreadForAdmin: integer("unread_for_admin").notNull().default(1),
  assignedTo: varchar("assigned_to", { length: 64 }),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  aiSummary: text("ai_summary"),
  aiSentiment: varchar("ai_sentiment", { length: 16 }),
  csat: integer("csat"),
  csatComment: text("csat_comment"),
  firstReplyAt: timestamp("first_reply_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supportMessagesTable = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTicketsTable.id, { onDelete: "cascade" }),
  sender: varchar("sender", { length: 16 }).notNull(),
  authorName: varchar("author_name", { length: 64 }).notNull(),
  body: text("body").notNull(),
  attachmentUrl: text("attachment_url"),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supportInternalNotesTable = pgTable("support_internal_notes", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTicketsTable.id, { onDelete: "cascade" }),
  authorName: varchar("author_name", { length: 64 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supportTemplatesTable = pgTable("support_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: varchar("category", { length: 32 }).notNull().default("general"),
  shortcut: varchar("shortcut", { length: 16 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supportAgentsTable = pgTable("support_agents", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const walletPotsTable = pgTable("wallet_pots", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  emoji: varchar("emoji", { length: 8 }).notNull().default("🐷"),
  color: varchar("color", { length: 48 }).notNull().default("from-pink-400 to-fuchsia-500"),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  target: numeric("target", { precision: 12, scale: 2 }).notNull().default("0"),
  autoRoundUp: boolean("auto_round_up").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const walletPotMovesTable = pgTable("wallet_pot_moves", {
  id: serial("id").primaryKey(),
  potId: integer("pot_id").notNull().references(() => walletPotsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 16 }).notNull(), // in | out
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const referralWithdrawalsTable = pgTable("referral_withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  method: varchar("method", { length: 32 }).notNull(), // okash | mycash | binance | sudanese | zain | mtn
  phoneNumber: varchar("phone_number", { length: 20 }),
  accountNumber: varchar("account_number", { length: 128 }),
  accountName: varchar("account_name", { length: 128 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  referralBalanceSnapshot: numeric("referral_balance_snapshot", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bannersTable = pgTable("banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  imageUrl: text("image_url"),
  link: text("link"),
  bgColor: text("bg_color").notNull().default("from-pink-500 via-fuchsia-500 to-rose-600"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// =====================================================================
// Luxury / Loyalty / Account features
// =====================================================================

export const loyaltyEventsTable = pgTable("loyalty_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  reason: varchar("reason", { length: 64 }).notNull(),
  refType: varchar("ref_type", { length: 32 }),
  refId: integer("ref_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const achievementsTable = pgTable("achievements", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: varchar("icon", { length: 32 }).notNull().default("trophy"),
  rewardPoints: integer("reward_points").notNull().default(0),
  rewardBalance: numeric("reward_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  tier: varchar("tier", { length: 16 }).notNull().default("bronze"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const userAchievementsTable = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  achievementId: integer("achievement_id").notNull().references(() => achievementsTable.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex("user_ach_unique").on(t.userId, t.achievementId),
}));

export const prizeDrawsTable = pgTable("prize_draws", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  prizeName: text("prize_name").notNull(),
  prizeImage: text("prize_image"),
  prizeValue: numeric("prize_value", { precision: 12, scale: 2 }).notNull().default("0"),
  ticketsPerSpend: numeric("tickets_per_spend", { precision: 12, scale: 2 }).notNull().default("10"),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  winnerUserId: integer("winner_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  bgColor: text("bg_color").notNull().default("from-amber-400 via-pink-500 to-fuchsia-600"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const prizeTicketsTable = pgTable("prize_tickets", {
  id: serial("id").primaryKey(),
  drawId: integer("draw_id").notNull().references(() => prizeDrawsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  ticketCode: varchar("ticket_code", { length: 32 }).notNull(),
  source: varchar("source", { length: 32 }).notNull().default("spend"),
  refId: integer("ref_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const primeSubscriptionsTable = pgTable("prime_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  plan: varchar("plan", { length: 16 }).notNull().default("monthly"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const transfersTable = pgTable("transfers", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  toUserId: integer("to_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  fee: numeric("fee", { precision: 12, scale: 2 }).notNull().default("0"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const giftCardsTable = pgTable("gift_cards", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  redeemedByUserId: integer("redeemed_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const monthlyGoalsTable = pgTable("monthly_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  yearMonth: varchar("year_month", { length: 7 }).notNull(),
  targetSpend: numeric("target_spend", { precision: 12, scale: 2 }).notNull(),
  rewardPoints: integer("reward_points").notNull().default(0),
  rewardBalance: numeric("reward_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  achieved: boolean("achieved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex("monthly_goal_unique").on(t.userId, t.yearMonth),
}));

export const travelDestinationsTable = pgTable("travel_destinations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: varchar("country", { length: 64 }).notNull(),
  description: text("description").notNull().default(""),
  image: text("image"),
  pointsCost: integer("points_cost").notNull(),
  cashCost: numeric("cash_cost", { precision: 12, scale: 2 }).notNull().default("0"),
  highlights: jsonb("highlights").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const travelBookingsTable = pgTable("travel_bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  destinationId: integer("destination_id").notNull().references(() => travelDestinationsTable.id),
  pointsUsed: integer("points_used").notNull(),
  travellerName: text("traveller_name").notNull(),
  contact: varchar("contact", { length: 64 }).notNull(),
  preferredDate: varchar("preferred_date", { length: 32 }),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const faqTable = pgTable("faq", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 32 }).notNull().default("general"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const statusComponentsTable = pgTable("status_components", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("operational"),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const faqFeedbackTable = pgTable("faq_feedback", {
  id: serial("id").primaryKey(),
  faqId: integer("faq_id").notNull().references(() => faqTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  helpful: boolean("helpful").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailVerificationsTable = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 128 }).notNull().unique(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const loginEventsTable = pgTable("login_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  ip: varchar("ip", { length: 64 }),
  userAgent: text("user_agent"),
  success: boolean("success").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;
export type Referral = typeof referralsTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
export type Notification = typeof notificationsTable.$inferSelect;
export type OrderEvent = typeof orderEventsTable.$inferSelect;
export type Setting = typeof settingsTable.$inferSelect;
export type Coupon = typeof couponsTable.$inferSelect;
export type CouponRedemption = typeof couponRedemptionsTable.$inferSelect;
export type Rating = typeof ratingsTable.$inferSelect;
export type Wishlist = typeof wishlistTable.$inferSelect;
export type PasswordReset = typeof passwordResetsTable.$inferSelect;
export type AuditLog = typeof auditLogTable.$inferSelect;
export type Banner = typeof bannersTable.$inferSelect;
export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type SupportMessage = typeof supportMessagesTable.$inferSelect;
export type SupportInternalNote = typeof supportInternalNotesTable.$inferSelect;
export type SupportTemplate = typeof supportTemplatesTable.$inferSelect;
export type SupportAgent = typeof supportAgentsTable.$inferSelect;
export type WalletPot = typeof walletPotsTable.$inferSelect;
export type WalletPotMove = typeof walletPotMovesTable.$inferSelect;
export type LoyaltyEvent = typeof loyaltyEventsTable.$inferSelect;
export type Achievement = typeof achievementsTable.$inferSelect;
export type UserAchievement = typeof userAchievementsTable.$inferSelect;
export type PrizeDraw = typeof prizeDrawsTable.$inferSelect;
export type PrizeTicket = typeof prizeTicketsTable.$inferSelect;
export type PrimeSubscription = typeof primeSubscriptionsTable.$inferSelect;
export type Transfer = typeof transfersTable.$inferSelect;
export type GiftCard = typeof giftCardsTable.$inferSelect;
export type MonthlyGoal = typeof monthlyGoalsTable.$inferSelect;
export type TravelDestination = typeof travelDestinationsTable.$inferSelect;
export type TravelBooking = typeof travelBookingsTable.$inferSelect;
export type Faq = typeof faqTable.$inferSelect;
export type FaqFeedback = typeof faqFeedbackTable.$inferSelect;
export type StatusComponent = typeof statusComponentsTable.$inferSelect;
export type LoginEvent = typeof loginEventsTable.$inferSelect;

// =====================================================================
// Advanced Automation Features (added in implementation wave 2026-04)
// =====================================================================

export const cartItemsTable = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  qty: integer("qty").notNull().default(1),
  targetInfo: text("target_info").notNull().default(""),
  notes: text("notes"),
  recoveryStage: integer("recovery_stage").notNull().default(0),
  recoveryCouponCode: varchar("recovery_coupon_code", { length: 32 }),
  lastRecoveryAt: timestamp("last_recovery_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex("cart_user_product_unique").on(t.userId, t.productId),
}));

export const flashSalesTable = pgTable("flash_sales", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  discountPct: integer("discount_pct").notNull().default(20),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  active: boolean("active").notNull().default(true),
  totalSold: integer("total_sold").notNull().default(0),
  maxQty: integer("max_qty").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dynamicPriceRulesTable = pgTable("dynamic_price_rules", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  minPrice: numeric("min_price", { precision: 12, scale: 2 }).notNull(),
  maxPrice: numeric("max_price", { precision: 12, scale: 2 }).notNull(),
  demandWindowHours: integer("demand_window_hours").notNull().default(24),
  surgePerSale: numeric("surge_per_sale", { precision: 6, scale: 4 }).notNull().default("0.005"),
  decayPerHour: numeric("decay_per_hour", { precision: 6, scale: 4 }).notNull().default("0.01"),
  active: boolean("active").notNull().default(true),
  lastComputedAt: timestamp("last_computed_at", { withTimezone: true }),
});

export const spinPrizesTable = pgTable("spin_prizes", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  type: varchar("type", { length: 16 }).notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull().default("0"),
  couponCode: varchar("coupon_code", { length: 32 }),
  weight: integer("weight").notNull().default(10),
  color: varchar("color", { length: 32 }).notNull().default("#ec4899"),
  icon: varchar("icon", { length: 32 }).notNull().default("gift"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const spinHistoryTable = pgTable("spin_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  prizeId: integer("prize_id").notNull().references(() => spinPrizesTable.id),
  prizeLabel: text("prize_label").notNull(),
  prizeType: varchar("prize_type", { length: 16 }).notNull(),
  prizeValue: numeric("prize_value", { precision: 12, scale: 2 }).notNull().default("0"),
  dayKey: varchar("day_key", { length: 10 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniqUserDay: uniqueIndex("spin_user_day_unique").on(t.userId, t.dayKey),
}));

export const subscriptionPlansTable = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  intervalDays: integer("interval_days").notNull().default(30),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  discountPct: integer("discount_pct").notNull().default(0),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => subscriptionPlansTable.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  autoRenew: boolean("auto_renew").notNull().default(true),
  targetInfo: text("target_info").notNull().default(""),
  nextBillingAt: timestamp("next_billing_at", { withTimezone: true }).notNull(),
  lastBilledAt: timestamp("last_billed_at", { withTimezone: true }),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
});

export const fraudFlagsTable = pgTable("fraud_flags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  ip: varchar("ip", { length: 64 }),
  reason: varchar("reason", { length: 64 }).notNull(),
  severity: integer("severity").notNull().default(1),
  details: text("details").notNull().default(""),
  resolved: boolean("resolved").notNull().default(false),
  resolvedBy: varchar("resolved_by", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const analyticsEventsTable = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 32 }).notNull(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  sessionKey: varchar("session_key", { length: 64 }),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  path: text("path"),
  referrer: text("referrer"),
  meta: jsonb("meta").$type<Record<string, any>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productViewsTable = pgTable("product_views", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  sessionKey: varchar("session_key", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const abTestsTable = pgTable("ab_tests", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  description: text("description").notNull().default(""),
  variants: jsonb("variants").$type<string[]>().notNull().default(["A", "B"]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const abAssignmentsTable = pgTable("ab_assignments", {
  id: serial("id").primaryKey(),
  testKey: varchar("test_key", { length: 64 }).notNull(),
  subjectKey: varchar("subject_key", { length: 64 }).notNull(),
  variant: varchar("variant", { length: 32 }).notNull(),
  converted: boolean("converted").notNull().default(false),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex("ab_subject_test_unique").on(t.testKey, t.subjectKey),
}));

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  sessionKey: varchar("session_key", { length: 64 }).notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const translationsTable = pgTable("translations", {
  id: serial("id").primaryKey(),
  textKey: text("text_key").notNull(),
  lang: varchar("lang", { length: 8 }).notNull(),
  translated: text("translated").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex("translations_key_lang_unique").on(t.textKey, t.lang),
}));

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const fcmTokensTable = pgTable("fcm_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type FcmToken = typeof fcmTokensTable.$inferSelect;

export const onesignalPlayersTable = pgTable("onesignal_players", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  playerId: text("player_id").notNull().unique(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export type OnesignalPlayer = typeof onesignalPlayersTable.$inferSelect;

export const installmentsTable = pgTable("installments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "set null" }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  monthlyAmount: numeric("monthly_amount", { precision: 12, scale: 2 }).notNull(),
  monthsTotal: integer("months_total").notNull(),
  monthsPaid: integer("months_paid").notNull().default(0),
  nextDueAt: timestamp("next_due_at", { withTimezone: true }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cryptoPaymentsTable = pgTable("crypto_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "set null" }),
  currency: varchar("currency", { length: 16 }).notNull(),
  network: varchar("network", { length: 32 }),
  address: text("address").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  txHash: text("tx_hash"),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const recommendationsTable = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  productIds: jsonb("product_ids").$type<number[]>().notNull().default([]),
  reason: varchar("reason", { length: 32 }).notNull().default("similar"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex("rec_user_reason_unique").on(t.userId, t.reason),
}));

export const liveViewersTable = pgTable("live_viewers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  sessionKey: varchar("session_key", { length: 64 }).notNull(),
  lastPingAt: timestamp("last_ping_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  uniq: uniqueIndex("viewer_product_session_unique").on(t.productId, t.sessionKey),
}));

export type CartItem = typeof cartItemsTable.$inferSelect;
export type FlashSale = typeof flashSalesTable.$inferSelect;
export type DynamicPriceRule = typeof dynamicPriceRulesTable.$inferSelect;
export type SpinPrize = typeof spinPrizesTable.$inferSelect;
export type SpinHistory = typeof spinHistoryTable.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlansTable.$inferSelect;
export type Subscription = typeof subscriptionsTable.$inferSelect;
export type FraudFlag = typeof fraudFlagsTable.$inferSelect;
export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type ProductView = typeof productViewsTable.$inferSelect;
export type AbTest = typeof abTestsTable.$inferSelect;
export type AbAssignment = typeof abAssignmentsTable.$inferSelect;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type Translation = typeof translationsTable.$inferSelect;
export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;
export type Installment = typeof installmentsTable.$inferSelect;
export type CryptoPayment = typeof cryptoPaymentsTable.$inferSelect;
export type Recommendation = typeof recommendationsTable.$inferSelect;
export type LiveViewer = typeof liveViewersTable.$inferSelect;

export const depositRequestsTable = pgTable("deposit_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  method: varchar("method", { length: 32 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  receiptUrl: text("receipt_url").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  transactionId: integer("transaction_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DepositRequest = typeof depositRequestsTable.$inferSelect;

export const postsTable = pgTable("site_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  summary: text("summary").notNull().default(""),
  body: text("body").notNull().default(""),
  imageUrl: text("image_url"),
  category: varchar("category", { length: 60 }).notNull().default("عام"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  published: boolean("published").notNull().default(false),
  pinned: boolean("pinned").notNull().default(false),
  views: integer("views").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Post = typeof postsTable.$inferSelect;

export const profitMarginHistoryTable = pgTable("profit_margin_history", {
  id: serial("id").primaryKey(),
  marginSdg: numeric("margin_sdg", { precision: 12, scale: 2 }).notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
});
export type ProfitMarginHistory = typeof profitMarginHistoryTable.$inferSelect;

export const postLikesTable = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("post_likes_uniq").on(t.postId, t.userId)]);
export type PostLike = typeof postLikesTable.$inferSelect;

export const postCommentsTable = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export type PostComment = typeof postCommentsTable.$inferSelect;

export const postCommentLikesTable = pgTable("post_comment_likes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => postCommentsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("post_comment_likes_uniq").on(t.commentId, t.userId)]);
export type PostCommentLike = typeof postCommentLikesTable.$inferSelect;

// ─── Free Fire Accounts ────────────────────────────────────────────────────────
export const freefireAccountsTable = pgTable("freefire_accounts", {
  id: serial("id").primaryKey(),
  accountName: text("account_name").notNull(),
  price: integer("price").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("available"), // available | reserved | sold
  coverImage: text("cover_image").notNull().default(""),
  images: jsonb("images").$type<string[]>().default([]),
  level: integer("level"),
  evoWeaponsCount: integer("evo_weapons_count"),
  skinsCount: integer("skins_count"),
  charactersCount: integer("characters_count"),
  rank: text("rank"),
  server: text("server"),
  description: text("description"),
  features: jsonb("features").$type<string[]>().default([]),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export type FreefireAccount = typeof freefireAccountsTable.$inferSelect;
