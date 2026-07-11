import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRealtimeEvent } from "@/lib/realtime";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export const WALLET_BALANCE_KEY = ["wallet-balance"];

type WalletBalance = {
  balance: string;
  cashbackBalance: string;
};

/**
 * useWalletBalance — رصيد حي يتحدث فوراً عبر WebSocket
 *
 * يستخدم endpoint بسيط /api/wallet ويستمع لحدث wallet_update
 * (الذي يُرسَل من السيرفر عند كل تعديل للرصيد سواء من الأدمن أو عند الشراء)
 * فور وصول الحدث يُحدِّث الـ cache مباشرة دون انتظار إعادة الطلب.
 * كذلك يعمل polling كل 15 ثانية كضمان احتياطي.
 */
export function useWalletBalance() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery<WalletBalance>({
    queryKey: WALLET_BALANCE_KEY,
    queryFn: () => api<WalletBalance>("/api/wallet"),
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  useRealtimeEvent((ev) => {
    if (ev.event !== "wallet_update") return;
    const { balance, cashbackBalance } = ev.payload as {
      balance: string;
      cashbackBalance: string;
    };
    qc.setQueryData<WalletBalance>(WALLET_BALANCE_KEY, (old) => ({
      ...(old ?? { balance: "0", cashbackBalance: "0" }),
      balance,
      cashbackBalance,
    }));
  });

  const balance = Number(data?.balance ?? user?.balance ?? 0);
  const cashbackBalance = Number(
    data?.cashbackBalance ?? user?.cashbackBalance ?? 0,
  );

  return { balance, cashbackBalance };
}
