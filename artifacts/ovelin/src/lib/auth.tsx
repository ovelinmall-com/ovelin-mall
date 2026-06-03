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

import React, { createContext, useContext, ReactNode } from "react";
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
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
    },
  });

  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const logoutMutation = useLogout();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore network errors — clear locally regardless
    }
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user: (user as User | undefined) || null, isLoading, isError, refresh, logout }}
    >
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
