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

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  HelpCircle,
  ChevronDown,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  ThumbsUp,
  ThumbsDown,
  MessageSquarePlus,
  LifeBuoy,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type FaqItem = {
  id: number;
  question: string;
  answer: string;
  category: string;
};

type StatusComp = {
  id: number;
  name: string;
  description: string;
  status: "operational" | "degraded" | "down";
  uptimePct: string;
};

const TABS = [
  { id: "faq", label: "أسئلة شائعة" },
  { id: "status", label: "حالة الخدمات" },
] as const;

const CATEGORIES = [
  { id: "all", label: "الكل" },
  { id: "wallet", label: "المحفظة" },
  { id: "orders", label: "الطلبات" },
  { id: "account", label: "الحساب" },
  { id: "lounge", label: "صالة الفخامة" },
  { id: "general", label: "عام" },
];

export default function HelpPage() {
  const [tab, setTab] = useState<"faq" | "status">("faq");
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [voted, setVoted] = useState<Record<number, "up" | "down">>({});

  const sendFeedback = useMutation({
    mutationFn: (v: { id: number; helpful: boolean }) =>
      api(`/api/faq/${v.id}/feedback`, {
        method: "POST",
        body: JSON.stringify({ helpful: v.helpful }),
      }),
  });

  function vote(id: number, helpful: boolean) {
    if (voted[id]) return;
    setVoted((m) => ({ ...m, [id]: helpful ? "up" : "down" }));
    sendFeedback.mutate({ id, helpful });
  }

  const faq = useQuery<FaqItem[]>({
    queryKey: ["faq"],
    queryFn: () => api("/api/faq"),
    placeholderData: (prev) => prev,
  });
  const status = useQuery<StatusComp[]>({
    queryKey: ["status"],
    queryFn: () => api("/api/status"),
    refetchInterval: 30000,
    placeholderData: (prev) => prev,
  });

  const filtered = (faq.data ?? [])
    .filter((f) => cat === "all" || f.category === cat)
    .filter(
      (f) =>
        !search ||
        f.question.includes(search) ||
        f.answer.includes(search),
    );

  return (
    <AppLayout>
      <PageHeader title="المساعدة" subtitle="أسئلة شائعة وحالة الخدمة" back="/account" />
      <div className="px-4 space-y-3 pb-4">
        <div className="fancy-card grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-xl py-2 text-xs font-bold transition",
                  active
                    ? "bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow"
                    : "text-pink-700",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === "faq" ? (
            <motion.div
              key="faq"
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-3 text-pink-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث في الأسئلة..."
                  className="w-full rounded-2xl border border-pink-200 bg-white px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {CATEGORIES.map((c) => {
                  const active = cat === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCat(c.id)}
                      className={cn(
                        "shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-bold border",
                        active
                          ? "bg-pink-600 text-white border-transparent"
                          : "bg-white border-pink-200 text-pink-700",
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <div className="fancy-card rounded-3xl overflow-hidden">
                {filtered.map((f) => {
                  const isOpen = open === f.id;
                  return (
                    <div
                      key={f.id}
                      className="border-b border-pink-50 last:border-0"
                    >
                      <button
                        onClick={() => setOpen(isOpen ? null : f.id)}
                        className="w-full flex items-center justify-between p-4 text-right"
                      >
                        <span className="text-sm font-bold text-pink-900 flex-1 ml-2">
                          {f.question}
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-pink-500 transition",
                            isOpen ? "rotate-180" : "",
                          )}
                        />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 text-xs text-pink-700/90 leading-6">
                              {f.answer}
                            </div>
                            <div className="px-4 pb-4 flex items-center justify-between gap-2 border-t border-pink-50 pt-3">
                              <div className="text-[11px] text-pink-700/80">
                                هل كانت الإجابة مفيدة؟
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    vote(f.id, true);
                                  }}
                                  disabled={!!voted[f.id]}
                                  className={cn(
                                    "rounded-xl p-1.5 border transition",
                                    voted[f.id] === "up"
                                      ? "bg-emerald-500 text-white border-transparent"
                                      : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50",
                                  )}
                                  aria-label="مفيد"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    vote(f.id, false);
                                  }}
                                  disabled={!!voted[f.id]}
                                  className={cn(
                                    "rounded-xl p-1.5 border transition",
                                    voted[f.id] === "down"
                                      ? "bg-pink-500 text-white border-transparent"
                                      : "bg-white text-pink-600 border-pink-200 hover:bg-white",
                                  )}
                                  aria-label="غير مفيد"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {voted[f.id] === "down" && (
                              <div className="px-4 pb-4">
                                <Link
                                  href={`/support/new?subject=${encodeURIComponent("استفسار حول: " + f.question)}`}
                                >
                                  <button className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[11px] font-bold py-2 flex items-center justify-center gap-1.5">
                                    <MessageSquarePlus className="w-3.5 h-3.5" />
                                    لم أحصل على إجابتي — افتح تذكرة
                                  </button>
                                </Link>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                {!filtered.length && (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    لا توجد نتائج
                  </div>
                )}
              </div>

              {/* Always-on CTA: open a support ticket */}
              <Link href="/support/new">
                <div className="rounded-3xl p-4 bg-gradient-to-br from-pink-500 via-rose-600 to-pink-600 text-white shadow-lg active:scale-[0.98] transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur">
                      <LifeBuoy className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-extrabold text-sm">
                        لم تجد إجابتك؟
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">
                        افتح تذكرة دعم — رد فوري من AI ثم متابعة بشرية خلال دقائق
                      </div>
                    </div>
                    <MessageSquarePlus className="w-5 h-5 opacity-90" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              key="status"
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <OverallStatus items={status.data ?? []} />
              <div className="fancy-card rounded-3xl overflow-hidden">
                {status.data?.map((s) => (
                  <StatusRow key={s.id} c={s} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}

function OverallStatus({ items }: { items: StatusComp[] }) {
  const allOk = items.every((i) => i.status === "operational");
  const anyDown = items.some((i) => i.status === "down");
  return (
    <div
      className={cn(
        "rounded-3xl p-4 text-white shadow-lg",
        anyDown
          ? "bg-gradient-to-br from-pink-500 to-pink-700"
          : allOk
            ? "bg-gradient-to-br from-emerald-500 to-emerald-700"
            : "bg-gradient-to-br from-amber-500 to-amber-700",
      )}
    >
      <div className="flex items-center gap-2">
        {anyDown ? (
          <XCircle className="w-6 h-6" />
        ) : allOk ? (
          <CheckCircle2 className="w-6 h-6" />
        ) : (
          <AlertTriangle className="w-6 h-6" />
        )}
        <div>
          <div className="font-extrabold">
            {anyDown
              ? "بعض الخدمات معطّلة"
              : allOk
                ? "جميع الخدمات تعمل بشكل ممتاز"
                : "أداء متراجع في بعض الخدمات"}
          </div>
          <div className="text-[10px] opacity-90">
            تحديث {new Date().toLocaleTimeString("ar-EG")}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ c }: { c: StatusComp }) {
  const color =
    c.status === "operational"
      ? "text-emerald-600 bg-emerald-50"
      : c.status === "degraded"
        ? "text-amber-600 bg-amber-50"
        : "text-pink-600 bg-white";
  const label =
    c.status === "operational"
      ? "يعمل"
      : c.status === "degraded"
        ? "متراجع"
        : "متعطل";
  return (
    <div className="flex items-center justify-between p-4 border-b border-pink-50 last:border-0">
      <div>
        <div className="font-bold text-sm text-pink-900">{c.name}</div>
        <div className="text-[10px] text-pink-700/70">{c.description}</div>
      </div>
      <div className="text-left">
        <div
          className={cn(
            "text-[10px] font-extrabold px-2 py-1 rounded-lg",
            color,
          )}
        >
          {label}
        </div>
        <div className="text-[10px] text-pink-700/70 mt-1">
          {Number(c.uptimePct).toFixed(2)}% uptime
        </div>
      </div>
    </div>
  );
}
