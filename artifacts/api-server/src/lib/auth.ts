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

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "ovelin_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  return process.env.SESSION_SECRET ?? "ovelin-dev-fallback-secret";
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${buf}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const a = Buffer.from(hash, "hex");
    const b = scryptSync(password, salt, 64);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function makeSessionToken(userId: number): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userIdStr, expiresAtStr, sig] = parts;
  if (!userIdStr || !expiresAtStr || !sig) return null;
  const payload = `${userIdStr}.${expiresAtStr}`;
  if (sign(payload) !== sig) return null;
  if (Number(expiresAtStr) < Date.now()) return null;
  return Number(userIdStr);
}

export function setSessionCookie(res: Response, userId: number): void {
  const token = makeSessionToken(userId);
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const userId = token ? verifySessionToken(token) : null;
  if (!userId) {
    res.status(401).json({ error: "غير مسموح — سجّل دخول كأدمن أولاً" });
    return;
  }
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const user = rows[0];
  if (!user || user.username !== "admin") {
    res.status(403).json({ error: "هذه الصفحة للأدمن فقط" });
    return;
  }
  (req as any).adminUser = user;
  next();
}

export async function getUserFromRequest(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  const userId = token ? verifySessionToken(token) : null;
  if (!userId) return null;
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function requireUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "غير مسجّل دخول" });
    return;
  }
  if (user.isBlocked) {
    res.status(403).json({ error: "تم حظر الحساب" });
    return;
  }
  (req as any).user = user;
  next();
}
