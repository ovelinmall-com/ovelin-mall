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

import { useState, memo } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, Inbox } from "lucide-react";
import {
  useGetUnreadCount,
  useListMyNotifications,
  useMarkAllRead,
  useMarkNotificationRead,
  getGetUnreadCountQueryKey,
  getListMyNotificationsQueryKey,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export const NotificationBell = memo(function NotificationBell({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: countData } = useGetUnreadCount({
    query: {
      queryKey: getGetUnreadCountQueryKey(),
      enabled,
      refetchInterval: 30000,
      refetchOnWindowFocus: false,
    },
  });
  const { data: list } = useListMyNotifications({
    query: {
      queryKey: getListMyNotificationsQueryKey(),
      enabled: enabled && open,
      refetchInterval: open ? 20000 : false,
    },
  });
  const markAll = useMarkAllRead();
  const markOne = useMarkNotificationRead();

  const count = countData?.count ?? 0;

  function refetchAll() {
    qc.invalidateQueries({ queryKey: getGetUnreadCountQueryKey() });
    qc.invalidateQueries({ queryKey: getListMyNotificationsQueryKey() });
  }

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9999 }}
          className="bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[85vh] overflow-hidden bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-pink-100 bg-gradient-to-l from-pink-50 to-white">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-pink-600" />
                <div className="font-extrabold text-pink-900">الإشعارات</div>
                {count > 0 && (
                  <span className="text-[10px] font-bold rounded-full bg-pink-500 text-white px-2 py-0.5">
                    {count} جديد
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(list?.length ?? 0) > 0 && count > 0 && (
                  <button
                    onClick={() =>
                      markAll.mutate(undefined, { onSuccess: refetchAll })
                    }
                    className="text-[11px] text-pink-600 font-bold rounded-xl px-2 py-1 hover:bg-pink-50 flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> قراءة الكل
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-pink-50 text-pink-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {(!list || list.length === 0) && (
                <div className="text-center py-12 px-6">
                  <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-pink-100 to-rose-100">
                    <Inbox className="w-10 h-10 text-pink-500" />
                  </div>
                  <div className="mt-4 font-bold text-pink-900">
                    لا توجد إشعارات بعد
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ستظهر هنا تحديثات طلباتك ومحفظتك لحظياً
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {list?.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead)
                        markOne.mutate(
                          { id: n.id },
                          { onSuccess: refetchAll },
                        );
                      if (n.link) {
                        setOpen(false);
                        setLocation(n.link);
                      }
                    }}
                    className={cn(
                      "w-full text-right rounded-2xl p-3 border transition active:scale-[0.99]",
                      n.isRead
                        ? "bg-white border-pink-50"
                        : "bg-pink-50/70 border-pink-200",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-1.5 shrink-0",
                          n.isRead ? "bg-transparent" : "bg-pink-500",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-extrabold text-pink-900">
                          {n.title}
                        </div>
                        <div className="text-[11px] text-pink-800/80 mt-0.5">
                          {n.message}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1.5">
                          {new Date(n.createdAt).toLocaleString("ar-EG")}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  function handleOpen() {
    setOpen(true);
    if (count > 0) {
      // Optimistic update — مسح الرقم فوراً
      qc.setQueryData(getGetUnreadCountQueryKey(), { count: 0 });
      // mark all as read في الخلفية
      markAll.mutate(undefined, { onSuccess: refetchAll });
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative p-2.5 rounded-2xl bg-white/15 backdrop-blur active:scale-95"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-pink-600"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </button>

      {createPortal(overlay, document.body)}
    </>
  );
});
