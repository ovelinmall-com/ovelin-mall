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

// قاعدة البيانات الوحيدة المعتمدة — Neon PostgreSQL
// The ONLY authorised database — Neon PostgreSQL
const DATABASE_URL =
  "postgresql://neondb_owner:npg_ET7uaIXcGx3w@ep-snowy-cake-am98s2po-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
