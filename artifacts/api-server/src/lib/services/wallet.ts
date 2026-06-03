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

import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

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
  return n.toFixed(2);
}

/**
 * Atomic credit/debit using a single SQL UPDATE so the operation is safe
 * under concurrent writes. Returns the new balance.
 */
export async function adjustBalance(
  userId: number,
  field: WalletField,
  delta: number,
): Promise<number> {
  const column = field === "balance" ? "balance" : "cashback_balance";
  const rows = await db.execute(
    sql.raw(
      `UPDATE users SET ${column} = (${column}::numeric + ${delta.toFixed(2)})::numeric(12,2) WHERE id = ${userId} RETURNING ${column}::text AS new_balance`,
    ),
  );
  const list = (rows as any).rows ?? rows;
  const v = list?.[0]?.new_balance ?? list?.[0]?.newBalance;
  return toNum(v);
}

/**
 * Atomic debit that checks for sufficient funds in a single statement.
 * Throws InsufficientFundsError if not enough balance.
 */
export async function safeDebit(
  userId: number,
  field: WalletField,
  amount: number,
): Promise<number> {
  if (amount <= 0) throw new Error("amount must be positive");
  const column = field === "balance" ? "balance" : "cashback_balance";
  const rows = await db.execute(
    sql.raw(
      `UPDATE users SET ${column} = (${column}::numeric - ${amount.toFixed(2)})::numeric(12,2) WHERE id = ${userId} AND ${column}::numeric >= ${amount.toFixed(2)} RETURNING ${column}::text AS new_balance`,
    ),
  );
  const list = (rows as any).rows ?? rows;
  if (!list?.[0]) throw new InsufficientFundsError();
  return toNum(list[0].new_balance ?? list[0].newBalance);
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
  await db.execute(
    sql.raw(
      `UPDATE users SET total_spent = (total_spent::numeric + ${amount.toFixed(2)})::numeric(12,2) WHERE id = ${userId}`,
    ),
  );
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
