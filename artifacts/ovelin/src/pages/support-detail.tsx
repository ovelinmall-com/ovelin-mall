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

import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Send,
  LifeBuoy,
  CheckCircle2,
  Lock,
  Crown,
  Sparkles,
  Paperclip,
  Star,
  Bot,
  X,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useGetSupportTicket,
  useAddSupportMessage,
  useCloseSupportTicket,
  getGetSupportTicketQueryKey,
  getListMySupportTicketsQueryKey,
  getGetSupportUnreadCountQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  open: "مفتوحة",
  waiting_user: "بانتظار ردك",
  resolved: "تم الحل",
  closed: "مغلقة",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  waiting_user: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-zinc-100 text-zinc-600",
};

export default function SupportDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/support/:id");
  const id = params ? parseInt(params.id, 10) : NaN;
  const { user, isLoading } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const [showCsat, setShowCsat] = useState(false);
  const [csatScore, setCsatScore] = useState(0);
  const [csatComment, setCsatComment] = useState("");
  const [csatSent, setCsatSent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [isLoading, user, setLocation]);

  const { data, isError } = useGetSupportTicket(id, {
    query: {
      queryKey: getGetSupportTicketQueryKey(id),
      enabled: !!user && !Number.isNaN(id),
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  });

  const send = useAddSupportMessage();
  const close = useCloseSupportTicket();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [data?.messages?.length]);

  if (!user) return null;

  if (isError) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-pink-700">التذكرة غير موجودة</div>
      </AppLayout>
    );
  }

  const ticket = data?.ticket;
  const messages = data?.messages ?? [];
  const closed = ticket?.status === "closed";

  function submit() {
    const text = body.trim();
    if (!text) return;
    send.mutate(
      { id, data: { body: text } },
      {
        onSuccess: () => {
          setBody("");
          qc.invalidateQueries({ queryKey: getGetSupportTicketQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListMySupportTicketsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetSupportUnreadCountQueryKey() });
        },
      },
    );
  }

  function closeTicket() {
    if (!confirm("هل تريد إغلاق هذه التذكرة؟")) return;
    close.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSupportTicketQueryKey(id) });
          qc.invalidateQueries({ queryKey: getListMySupportTicketsQueryKey() });
          setShowCsat(true);
        },
      },
    );
  }

  async function attach(file: File) {
    if (file.size > 1_200_000) {
      alert("حجم الملف يجب أن يكون أقل من 1 ميجا");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      await api(`/api/support/tickets/${id}/attach`, {
        method: "POST",
        body: JSON.stringify({ dataUrl, caption: body.trim() || undefined }),
      });
      setBody("");
      qc.invalidateQueries({ queryKey: getGetSupportTicketQueryKey(id) });
    } catch (e: any) {
      alert(e?.message ?? "فشل رفع الملف");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submitCsat() {
    if (!csatScore) return;
    try {
      await api(`/api/support/tickets/${id}/csat`, {
        method: "POST",
        body: JSON.stringify({ score: csatScore, comment: csatComment }),
      });
      setCsatSent(true);
      setTimeout(() => setShowCsat(false), 1400);
    } catch (e: any) {
      alert(e?.message ?? "فشل");
    }
  }

  return (
    <AppLayout hideFooter>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-600 to-pink-600" />
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-pink-300/40 rounded-full blur-3xl" />
        <div className="relative px-4 pt-6 pb-5 text-white">
          <div className="flex items-center gap-3">
            <Link href="/support">
              <button className="p-2 rounded-2xl bg-white/15 backdrop-blur active:scale-95">
                <ChevronRight className="w-5 h-5" />
              </button>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] opacity-80 flex items-center gap-1">
                <LifeBuoy className="w-3.5 h-3.5" /> تذكرة #{id}
              </div>
              <div className="text-base font-extrabold truncate">
                {ticket?.subject ?? "..."}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[10px] font-extrabold rounded-full px-2 py-0.5",
                    STATUS_COLOR[ticket?.status ?? "open"] ?? "bg-zinc-100 text-zinc-700",
                  )}
                >
                  {STATUS_LABEL[ticket?.status ?? "open"] ?? ticket?.status}
                </span>
              </div>
            </div>
            {!closed && (
              <button
                onClick={closeTicket}
                className="rounded-2xl bg-white/15 backdrop-blur px-2.5 py-2 text-[11px] font-bold active:scale-95"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="px-3 py-3 space-y-2.5 min-h-[55vh] max-h-[calc(100vh-300px)] overflow-y-auto"
      >
        {messages.map((m, i) => {
          const mine = m.sender === "user";
          const isAi = (m as any).isAiGenerated;
          const att = (m as any).attachmentUrl as string | null | undefined;
          return (
            <motion.div
              key={m.id}
              transition={{ delay: i * 0.02 }}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[78%] rounded-3xl px-4 py-2.5 shadow-sm",
                  mine
                    ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-tr-md"
                    : isAi
                      ? "bg-gradient-to-br from-rose-50 to-rose-50 border border-rose-200 text-rose-900 rounded-tl-md"
                      : "bg-white border border-pink-100 text-pink-900 rounded-tl-md",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-1 text-[10px] font-extrabold mb-0.5",
                    mine ? "text-pink-100" : isAi ? "text-rose-600" : "text-pink-500",
                  )}
                >
                  {!mine && (isAi ? <Bot className="w-3 h-3" /> : <Crown className="w-3 h-3" />)}
                  {m.authorName}
                  {isAi && <span className="ml-1 px-1 py-0.5 rounded bg-rose-200 text-rose-800 text-[8px]">AI</span>}
                </div>
                {att && att.startsWith("data:image/") && (
                  <a href={att} target="_blank" rel="noopener" className="block mb-1.5">
                    <img src={att} alt="مرفق" className="rounded-lg max-h-48 object-contain" />
                  </a>
                )}
                {att && !att.startsWith("data:image/") && (
                  <a href={att} target="_blank" rel="noopener" className="block mb-1.5 text-[11px] underline">
                    📎 تنزيل المرفق
                  </a>
                )}
                <div className="text-[13px] whitespace-pre-wrap leading-snug">{m.body}</div>
                <div
                  className={cn(
                    "text-[9.5px] mt-1 text-left",
                    mine ? "text-pink-100/80" : isAi ? "text-rose-400" : "text-pink-400",
                  )}
                >
                  {new Date(m.createdAt).toLocaleString("ar-EG")}
                </div>
              </div>
            </motion.div>
          );
        })}

        {messages.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-10">
            <Sparkles className="w-5 h-5 mx-auto text-pink-300 mb-2" />
            في انتظار الرسائل...
          </div>
        )}

        {ticket?.status === "resolved" && (
          <div className="rounded-2xl bg-emerald-50 text-emerald-800 text-[12px] font-bold p-2.5 flex flex-col items-center gap-2">
            <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> تم حل التذكرة من قبل فريق الدعم</div>
            {!(ticket as any)?.csat && (
              <button onClick={() => setShowCsat(true)} className="text-[11px] font-extrabold underline">
                ⭐ قيّم تجربتك
              </button>
            )}
            {(ticket as any)?.csat ? (
              <div className="text-[11px]">تقييمك: {"★".repeat((ticket as any).csat)}{"☆".repeat(5 - (ticket as any).csat)}</div>
            ) : null}
          </div>
        )}
        {closed && (
          <div className="rounded-2xl bg-zinc-100 text-zinc-700 text-[12px] font-bold p-2.5 flex flex-col items-center gap-2">
            <div className="flex items-center gap-1"><Lock className="w-4 h-4" /> هذه التذكرة مغلقة</div>
            {!(ticket as any)?.csat && (
              <button onClick={() => setShowCsat(true)} className="text-[11px] font-extrabold text-pink-600 underline">
                ⭐ قيّم تجربتك
              </button>
            )}
          </div>
        )}
      </div>

      <div className="sticky bottom-[88px] left-0 right-0 px-3 pb-2">
        <div className="fancy-card rounded-3xl p-2 flex items-end gap-2">
          <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) attach(f); }} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={closed || uploading}
            className="p-3 rounded-2xl bg-pink-50 text-pink-600 disabled:opacity-50"
            title="إرفاق ملف"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
          </button>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            disabled={closed || send.isPending}
            rows={1}
            placeholder={closed ? "التذكرة مغلقة" : "اكتب ردك..."}
            className="flex-1 resize-none bg-pink-50/40 rounded-2xl px-3 py-2.5 text-sm focus:outline-none disabled:opacity-50 max-h-32"
          />
          <button
            onClick={submit}
            disabled={closed || send.isPending || !body.trim()}
            className="p-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showCsat && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCsat(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="font-extrabold text-pink-900">قيّم تجربتك مع الدعم</div>
              <button onClick={() => setShowCsat(false)}><X className="w-5 h-5 text-pink-400" /></button>
            </div>
            {csatSent ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <div className="font-extrabold text-emerald-700">شكراً لك!</div>
              </div>
            ) : (
              <>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setCsatScore(s)}>
                      <Star className={cn("w-9 h-9", s <= csatScore ? "fill-amber-400 text-amber-400" : "text-zinc-300")} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={csatComment}
                  onChange={(e) => setCsatComment(e.target.value)}
                  rows={3}
                  placeholder="ملاحظتك (اختياري)"
                  className="w-full bg-pink-50 rounded-2xl px-3 py-2 text-[13px] focus:outline-none"
                />
                <button
                  onClick={submitCsat}
                  disabled={!csatScore}
                  className="w-full py-3 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white font-extrabold disabled:opacity-50"
                >
                  إرسال التقييم
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
