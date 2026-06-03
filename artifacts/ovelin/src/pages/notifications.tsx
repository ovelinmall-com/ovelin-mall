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

import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Inbox, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const API = (import.meta.env.BASE_URL || "/") + "api";

type Notif = {
  id: number;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  const { data: notifs } = useQuery({
    queryKey: ["notifications-page"],
    queryFn: async () => {
      const r = await fetch(`${API}/notifications`, { credentials: "include" });
      if (!r.ok) return [];
      return (await r.json()) as Notif[];
    },
    enabled: !!user,
    refetchInterval: 8000,
  });

  const readAll = useMutation({
    mutationFn: async () => {
      await fetch(`${API}/notifications/read-all`, { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-page"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const readOne = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${API}/notifications/${id}/read`, { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-page"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const list = notifs ?? [];
  const unread = list.filter((n) => !n.read).length;

  return (
    <AppLayout>
      <PageHeader title="الإشعارات" subtitle={`${unread} غير مقروء`} back="/account" />

      <div className="px-5 space-y-3 pb-4">
        {unread > 0 && (
          <button
            onClick={() => readAll.mutate()}
            disabled={readAll.isPending}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold py-2.5 text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
          >
            <CheckCheck className="w-4 h-4" /> تعليم الكل كمقروء
          </button>
        )}

        {list.length === 0 ? (
          <div className="fancy-card rounded-3xl p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-pink-400 mb-3">
              <Inbox className="w-8 h-8" />
            </div>
            <div className="font-bold text-pink-900 mb-1">لا توجد إشعارات</div>
            <div className="text-xs text-muted-foreground">سنخبرك بكل ما يخص حسابك هنا</div>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((n) => {
              const Inner = (
                <motion.div
                  className={cn(
                    "rounded-2xl p-4 border flex gap-3 active:scale-[0.99] transition",
                    n.read ? "bg-white border-pink-100" : "bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200",
                  )}
                  onClick={() => !n.read && readOne.mutate(n.id)}
                >
                  <div className={cn(
                    "shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center",
                    n.read ? "bg-pink-50 text-pink-400" : "bg-gradient-to-br from-pink-500 to-rose-600 text-white",
                  )}>
                    {n.read ? <Bell className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <div className="font-bold text-sm text-pink-900 truncate">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>
                    <div className="text-[10px] text-pink-500 mt-1">
                      {new Date(n.createdAt).toLocaleString("ar-EG")}
                    </div>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-pink-600 self-start mt-2" />}
                </motion.div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link}>{Inner}</Link>
              ) : (
                <div key={n.id}>{Inner}</div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
