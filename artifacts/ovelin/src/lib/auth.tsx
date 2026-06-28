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

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from "react";
import {
  useGetMe,
  getGetMeQueryKey,
  useLogout,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

type User = {
  id: number;
  username: string;
  email?: string | null;
  balance: string;
  cashbackBalance?: string;
  totalSpent?: string;
  vipLevel?: string;
  referralCode: string;
  referredBy?: string | null;
  createdAt: string;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isError: boolean;
  refresh: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
      // ✅ FIX: رفع من 15s → 60s لتقليل re-renders المتكررة
      // كل تحديث لـ auth context يُعيد رسم كامل شجرة التطبيق
      refetchInterval: 60000,
      refetchOnWindowFocus: false,
    },
  });

  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const logoutMutation = useLogout();

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore network errors — clear locally regardless
    }
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    setLocation("/login");
  }, [logoutMutation, queryClient, setLocation]);

  // ✅ FIX: useMemo يمنع تغيير مرجع context في كل render
  // بدونه كان كل مكوّن يستخدم useAuth() يُعاد رسمه حتى لو لم تتغير البيانات
  const value = useMemo<AuthContextType>(
    () => ({ user: (user as User | undefined) || null, isLoading, isError, refresh, logout }),
    [user, isLoading, isError, refresh, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
