import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
// FIX #5: useRealtimeEvent instead of useRealtime — avoids re-render on every online-count update
import { useRealtimeEvent } from "@/lib/realtime";

export type BadgeCounts = {
  orders: number;
  wallet: number;
  support: number;
  referrals: number;
};

const BADGE_KEY = ["badge-counts"];

export function useBadgeCounts(): BadgeCounts {
  const { user } = useAuth();
  const qc = useQueryClient();

  // FIX #5: استمع فقط لأحداث badge_update — لا state update عند تغيّر online count
  useRealtimeEvent((ev) => {
    if (ev.event === "badge_update") {
      qc.invalidateQueries({ queryKey: BADGE_KEY });
    }
  });

  const { data } = useQuery<BadgeCounts>({
    queryKey: BADGE_KEY,
    queryFn: () => api<BadgeCounts>("/api/notifications/badge-counts"),
    enabled: !!user,
    refetchInterval: 60_000,       // WebSocket يُحدَّث فورياً — polling backup كل دقيقة فقط
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 55_000,
    placeholderData: { orders: 0, wallet: 0, support: 0, referrals: 0 },
  });
  return data ?? { orders: 0, wallet: 0, support: 0, referrals: 0 };
}

export function useBadgeCountsInvalidator() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: BADGE_KEY });
}

export function useMarkSectionRead() {
  const qc = useQueryClient();
  return async (section: "orders" | "wallet" | "support" | "referrals") => {
    // Optimistic update — مسح الرقم فوراً قبل انتهاء الـ API call
    qc.setQueryData<BadgeCounts>(BADGE_KEY, (old) => {
      if (!old) return old;
      return { ...old, [section]: 0 };
    });
    try {
      await api("/api/notifications/mark-section-read", {
        method: "POST",
        body: JSON.stringify({ section }),
      });
    } catch {
      // non-fatal
    } finally {
      qc.invalidateQueries({ queryKey: BADGE_KEY });
    }
  };
}
