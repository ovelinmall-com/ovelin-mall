// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import { db, usersTable, transactionsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { emitToUser } from "../wsManager";

export type WalletField = "balance" | "cashbackBalance";

export class InsufficientFundsError extends Error {
  constructor(message = "الرصيد غير كافٍ") {
    super(message);
    this.name = "InsufficientFundsError";
  }
}

function toNum(v: string | null | undefined): number {
  return Number(v ?? 0);
}

function fmt(n: number): string {
  return Math.round(n).toFixed(2);
}

/**
 * Atomic credit/debit using Drizzle ORM's .update().returning()
 * — avoids sql.raw() whose return shape differs across Drizzle/pg versions.
 * All amounts are rounded to whole numbers (no cents).
 */
export async function adjustBalance(
  userId: number,
  field: WalletField,
  delta: number,
): Promise<number> {
  const wholeDelta = Math.round(delta);

  const setExpr =
    field === "balance"
      ? {
          balance: sql<string>`(${usersTable.balance}::numeric + ${wholeDelta}::numeric)::numeric(12,2)`,
        }
      : {
          cashbackBalance: sql<string>`(${usersTable.cashbackBalance}::numeric + ${wholeDelta}::numeric)::numeric(12,2)`,
        };

  const rows = await db
    .update(usersTable)
    .set(setExpr)
    .where(eq(usersTable.id, userId))
    .returning({
      balance: usersTable.balance,
      cashbackBalance: usersTable.cashbackBalance,
    });

  const row = rows[0];
  if (!row) throw new Error(`user ${userId} not found`);

  emitToUser(userId, "wallet_update", {
    balance: row.balance,
    cashbackBalance: row.cashbackBalance,
  });

  return toNum(field === "balance" ? row.balance : row.cashbackBalance);
}

/**
 * Atomic debit that checks sufficient funds in a single UPDATE statement.
 * Uses Drizzle ORM's .update().where().returning() — no sql.raw() needed.
 * Throws InsufficientFundsError if balance is insufficient.
 * All amounts are rounded to whole numbers (no cents).
 */
export async function safeDebit(
  userId: number,
  field: WalletField,
  amount: number,
): Promise<number> {
  if (amount <= 0) throw new Error("amount must be positive");
  const wholeAmount = Math.round(amount);

  const col =
    field === "balance" ? usersTable.balance : usersTable.cashbackBalance;

  const setExpr =
    field === "balance"
      ? {
          balance: sql<string>`(${usersTable.balance}::numeric - ${wholeAmount}::numeric)::numeric(12,2)`,
        }
      : {
          cashbackBalance: sql<string>`(${usersTable.cashbackBalance}::numeric - ${wholeAmount}::numeric)::numeric(12,2)`,
        };

  const rows = await db
    .update(usersTable)
    .set(setExpr)
    .where(
      and(
        eq(usersTable.id, userId),
        sql`${col}::numeric >= ${wholeAmount}::numeric`,
      ),
    )
    .returning({
      balance: usersTable.balance,
      cashbackBalance: usersTable.cashbackBalance,
    });

  const row = rows[0];
  if (!row) throw new InsufficientFundsError();

  emitToUser(userId, "wallet_update", {
    balance: row.balance,
    cashbackBalance: row.cashbackBalance,
  });

  return toNum(field === "balance" ? row.balance : row.cashbackBalance);
}

export async function recordTransaction(
  userId: number,
  type: string,
  amount: number,
  status: string,
  method?: string | null,
  reference?: string | null,
  meta?: any,
): Promise<number> {
  const inserted = await db
    .insert(transactionsTable)
    .values({
      userId,
      type,
      amount: fmt(amount),
      status,
      method: method ?? null,
      reference: reference ?? null,
      meta: meta == null ? null : typeof meta === "string" ? meta : JSON.stringify(meta),
    })
    .returning();
  return inserted[0]!.id;
}

export async function addToTotalSpent(userId: number, amount: number): Promise<void> {
  await db
    .update(usersTable)
    .set({
      totalSpent: sql<string>`(${usersTable.totalSpent}::numeric + ${amount.toFixed(2)}::numeric)::numeric(12,2)`,
    })
    .where(eq(usersTable.id, userId));
}

export async function getUserBalances(userId: number) {
  const rows = await db
    .select({
      balance: usersTable.balance,
      cashbackBalance: usersTable.cashbackBalance,
      totalSpent: usersTable.totalSpent,
      vipLevel: usersTable.vipLevel,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return rows[0];
}

const VIP_THRESHOLDS: Array<{ name: string; min: number }> = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 100 },
  { name: "Gold", min: 500 },
  { name: "Diamond", min: 2000 },
];

export function vipFromTotalSpent(total: number): { current: string; next?: string; nextAt?: number } {
  let current = "Bronze";
  let next: string | undefined;
  let nextAt: number | undefined;
  for (let i = 0; i < VIP_THRESHOLDS.length; i++) {
    const t = VIP_THRESHOLDS[i]!;
    if (total >= t.min) current = t.name;
    else if (next == null) {
      next = t.name;
      nextAt = t.min;
    }
  }
  return { current, next, nextAt };
}

export async function recomputeVip(userId: number): Promise<string> {
  const u = await getUserBalances(userId);
  const total = toNum(u?.totalSpent);
  const { current } = vipFromTotalSpent(total);
  if (u && u.vipLevel !== current) {
    await db.update(usersTable).set({ vipLevel: current }).where(eq(usersTable.id, userId));
  }
  return current;
}
