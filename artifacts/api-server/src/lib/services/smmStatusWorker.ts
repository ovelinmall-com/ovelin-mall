import { db, ordersTable, orderEventsTable } from "@workspace/db";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import { logger } from "../logger";
import { adjustBalance, recordTransaction } from "./wallet";

const SMM_KEY = "0b28edf644be7e4c28874b5e3b2a44a4";
const SMM_URL = "https://honestsmm.com/api/v2";

const ACTIVE_STATUSES = ["processing", "pending"] as const;

interface SmmStatusResponse {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  error?: string;
}

function mapSmmStatus(smmStatus: string): string | null {
  const s = smmStatus.toLowerCase();
  if (s === "completed") return "completed";
  if (s === "partial") return "completed";
  if (s === "canceled" || s === "cancelled") return "cancelled";
  if (s === "in progress" || s === "processing") return "processing";
  if (s === "pending") return "pending";
  return null;
}

async function pollOnce(): Promise<void> {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(
      and(
        inArray(ordersTable.status, [...ACTIVE_STATUSES]),
        isNotNull(ordersTable.deliveredCode),
      ),
    )
    .limit(50);

  if (orders.length === 0) return;

  for (const order of orders) {
    const smmOrderId = order.deliveredCode;
    if (!smmOrderId) continue;

    try {
      const body = new URLSearchParams({
        key: SMM_KEY,
        action: "status",
        order: smmOrderId,
      });
      const res = await fetch(SMM_URL, {
        method: "POST",
        body: body.toString(),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as SmmStatusResponse;
      if (data.error) continue;

      const newStatus = data.status ? mapSmmStatus(data.status) : null;
      if (!newStatus || newStatus === order.status) continue;

      await db
        .update(ordersTable)
        .set({ status: newStatus })
        .where(eq(ordersTable.id, order.id));

      let msg = `تم تحديث حالة الطلب • الحالة: ${data.status}`;
      if (newStatus === "completed") {
        msg = `✅ اكتمل الطلب بنجاح`;
        if (data.remains && data.remains !== "0") {
          msg += ` • المتبقي: ${data.remains}`;
        }
      } else if (newStatus === "cancelled") {
        msg = `❌ تم إلغاء الطلب`;
        const refund = Number(order.finalPrice);
        if (refund > 0) {
          try {
            await adjustBalance(order.userId, "balance", refund);
            await recordTransaction(
              order.userId,
              "refund",
              refund,
              "completed",
              null,
              `refund#${order.id}`,
            );
            msg += ` • تم إرجاع ${refund.toFixed(2)} ج.س إلى رصيدك`;
          } catch (e) {
            logger.warn({ err: e, orderId: order.id }, "فشل إرجاع رصيد الطلب الملغى");
          }
        }
      }

      await db.insert(orderEventsTable).values({
        orderId: order.id,
        status: newStatus,
        message: msg,
      });

      logger.info(
        { orderId: order.id, smmOrderId, from: order.status, to: newStatus },
        "SMM order status updated",
      );
    } catch (err) {
      logger.warn({ err, orderId: order.id }, "SMM status poll error");
    }
  }
}

let _handle: NodeJS.Timeout | null = null;

export function startSmmStatusWorker(intervalMs = 30_000): void {
  if (_handle) return;
  logger.info({ intervalMs }, "🔄 SMM status worker started");

  void pollOnce().catch((e) => logger.warn({ err: e }, "initial SMM poll failed"));

  _handle = setInterval(() => {
    void pollOnce().catch((e) => logger.warn({ err: e }, "SMM poll error"));
  }, intervalMs);

  _handle.unref?.();
}

export function stopSmmStatusWorker(): void {
  if (_handle) {
    clearInterval(_handle);
    _handle = null;
  }
}
