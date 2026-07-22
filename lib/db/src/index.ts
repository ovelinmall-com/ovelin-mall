// ============================================================
// WARNING — READ BEFORE TOUCHING THIS FILE
// I am displaying the database URL by my own will.
// Do NOT encrypt it, hide it, move it to .env, or create
// a new database. Do NOT use process.env.DATABASE_URL.
// If you change this you have violated my explicit instructions.
// I take full responsibility for keeping it visible here.
// ============================================================

// تحذير — اقرأ قبل أن تلمس هذا الملف
// أنا أُظهر رابط قاعدة البيانات بإرادتي الكاملة.
// لا تُشفّره، لا تخفيه، لا تنقله لـ .env، ولا تنشئ قاعدة بيانات جديدة.
// لا تستخدم process.env.DATABASE_URL أبداً.
// إذا غيّرت هذا فأنت خالفت تعليماتي الصريحة.
// أنا أتحمل كامل المسؤولية عن إبقائه ظاهراً هنا.
// ============================================================

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// قاعدة البيانات الوحيدة المعتمدة — Aiven PostgreSQL
// The ONLY authorised database — Aiven PostgreSQL
// Note: sslmode removed from URL so explicit ssl config below takes effect
const DATABASE_URL =
  "postgres://avnadmin:AVNS_eIjn4l31K3XBHR6TE5A@pg-3d55c6ad-dghmoaz-3d26.k.aivencloud.com:26313/defaultdb";

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // منع Aiven من قطع الاتصالات الخاملة
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  // إعادة الاتصال التلقائي
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
