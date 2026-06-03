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

import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Send, LifeBuoy, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useCreateSupportTicket,
  getListMySupportTicketsQueryKey,
  getGetSupportUnreadCountQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "general", label: "استفسار عام" },
  { id: "order", label: "طلب أو متابعة" },
  { id: "wallet", label: "محفظة / إيداع / سحب" },
  { id: "technical", label: "مشكلة تقنية" },
  { id: "complaint", label: "شكوى" },
  { id: "other", label: "أخرى" },
];

export default function SupportNewPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  const createTicket = useCreateSupportTicket();

  if (!user) return null;

  function submit() {
    setError(null);
    if (subject.trim().length < 3) {
      setError("الموضوع قصير جداً");
      return;
    }
    if (message.trim().length < 2) {
      setError("اكتب رسالة على الأقل");
      return;
    }
    createTicket.mutate(
      { data: { subject: subject.trim(), category, message: message.trim() } },
      {
        onSuccess: (resp) => {
          qc.invalidateQueries({ queryKey: getListMySupportTicketsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetSupportUnreadCountQueryKey() });
          setLocation(`/support/${resp.id}`);
        },
        onError: (err: unknown) => {
          const e = err as { response?: { data?: { error?: string } } };
          setError(e?.response?.data?.error ?? "تعذر إنشاء التذكرة");
        },
      },
    );
  }

  return (
    <AppLayout>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-600 to-pink-600" />
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-pink-300/40 rounded-full blur-3xl" />
        <div className="relative px-5 pt-7 pb-8 text-white">
          <div className="flex items-center gap-3">
            <Link href="/support">
              <button className="p-2 rounded-2xl bg-white/15 backdrop-blur active:scale-95">
                <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <div className="text-xs opacity-80">تذكرة دعم جديدة</div>
              <div className="text-xl font-extrabold flex items-center gap-2">
                <LifeBuoy className="w-5 h-5" /> راسل فريق OVELIN
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-3 pb-6">
        <div className="fancy-card rounded-3xl p-4">
          <div className="text-[12px] font-bold text-pink-900 mb-1.5">الموضوع</div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            placeholder="مثال: استفسار عن حالة الطلب #123"
            className="w-full rounded-2xl border border-pink-100 bg-pink-50/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          />

          <div className="text-[12px] font-bold text-pink-900 mt-3 mb-1.5">القسم</div>
          <div className="grid grid-cols-2 gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "rounded-2xl px-3 py-2 text-[11px] font-bold border transition",
                  category === c.id
                    ? "bg-pink-600 text-white border-pink-600 shadow"
                    : "bg-white text-pink-800 border-pink-100",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="text-[12px] font-bold text-pink-900 mt-3 mb-1.5">الرسالة</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={4000}
            rows={6}
            placeholder="اشرح المشكلة أو الاستفسار بالتفصيل..."
            className="w-full rounded-2xl border border-pink-100 bg-pink-50/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 resize-none"
          />
          <div className="text-[10px] text-muted-foreground text-right mt-1">
            {message.length}/4000
          </div>

          {error && (
            <div className="mt-2 text-[12px] font-bold text-pink-600 bg-pink-50 rounded-xl p-2">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={createTicket.isPending}
            className="mt-3 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3 font-extrabold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {createTicket.isPending ? "جارٍ الإرسال..." : "إرسال التذكرة"}
          </button>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 p-4 text-[12px] text-pink-900 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-pink-500 mt-0.5 shrink-0" />
          <span>
            ضع رقم الطلب أو رقم المعاملة في رسالتك لتسريع الرد. سنتواصل معك خلال
            دقائق وستصلك إشعارات بكل رد.
          </span>
        </div>
      </div>
    </AppLayout>
  );
}
