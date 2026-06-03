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
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Ticket, Sparkles, Crown, Clock, Gift } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { LivePill } from "@/components/LiveDot";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const API = (import.meta.env.BASE_URL || "/") + "api";

type Draw = {
  id: number;
  title: string;
  description: string;
  prizeName: string;
  prizeImage?: string | null;
  prizeValue: string;
  ticketsPerSpend: string;
  endsAt: string;
  bgColor: string;
  totalTickets?: number;
  totalParticipants?: number;
};
type MyDrawSummary = { drawId: number; prizeName: string; myTickets: number; totalTickets: number; chance: number; endsAt: string };

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "انتهى";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}ي ${h}س`;
  if (h > 0) return `${h}س ${m}د`;
  return `${m}د`;
}

export default function PrizesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: draws } = useQuery({
    queryKey: ["prize-draws"],
    queryFn: async () => {
      const r = await fetch(`${API}/prize-draws`);
      if (!r.ok) return [] as Draw[];
      return (await r.json()) as Draw[];
    },
    refetchInterval: 30000,
  });

  const { data: myDraws } = useQuery({
    queryKey: ["my-draw-summary"],
    queryFn: async () => {
      const r = await fetch(`${API}/prize-draws/my-tickets`, { credentials: "include" });
      if (!r.ok) return [] as MyDrawSummary[];
      return (await r.json()) as MyDrawSummary[];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const list = draws ?? [];
  const summary = myDraws ?? [];
  const totalMyTickets = summary.reduce((s, d) => s + d.myTickets, 0);

  return (
    <AppLayout>
      <PageHeader title="سحوبات الجوائز" subtitle="فرص للفوز كل شهر" back="/account" />

      <div className="px-5 space-y-3 pb-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 bg-gradient-to-br from-amber-400 via-pink-500 to-rose-600 text-white shadow-[0_15px_40px_-10px_rgba(190,24,93,0.5)] relative overflow-hidden"
        >
          <Trophy className="absolute -top-4 -left-4 w-32 h-32 opacity-15" />
          <div className="font-extrabold text-lg mb-1 flex items-center gap-2">
            🎁 OVELIN PRIZES <LivePill />
          </div>
          <div className="text-xs opacity-90 mb-3">كل ${draws?.[0]?.ticketsPerSpend ?? "10"} إنفاق = تذكرة سحب مجانية. عضو PRIME = تذاكر مضاعفة!</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/20">
              <div className="text-[10px] opacity-80">تذاكري</div>
              <div className="text-lg font-black">{totalMyTickets}</div>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur p-2.5 text-center border border-white/20">
              <div className="text-[10px] opacity-80">سحوبات نشطة</div>
              <div className="text-lg font-black">{list.length}</div>
            </div>
          </div>
        </motion.div>

        {/* Active draws */}
        <div className="font-bold text-pink-900 text-sm mt-1">السحوبات النشطة</div>
        {list.length === 0 ? (
          <div className="fancy-card rounded-3xl p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-pink-400 mb-3">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="font-bold text-pink-900 mb-1">لا توجد سحوبات الآن</div>
            <div className="text-xs text-muted-foreground">ترقّب سحوبات قريبة قادمة</div>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((d) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-3xl p-4 text-white relative overflow-hidden bg-gradient-to-br shadow-md",
                  d.bgColor || "from-amber-400 via-pink-500 to-rose-600"
                )}
              >
                <Sparkles className="absolute -top-2 -left-2 w-20 h-20 opacity-15" />
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-lg">{d.title}</div>
                    <div className="text-[11px] opacity-90 mt-0.5 line-clamp-2">{d.description}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] opacity-80">القيمة</div>
                    <div className="font-extrabold">{d.prizeValue} ج.س</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur rounded-xl px-2 py-1">
                    <Clock className="w-3.5 h-3.5" /> {timeLeft(d.endsAt)}
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur rounded-xl px-2 py-1">
                    <Ticket className="w-3.5 h-3.5" /> {d.totalTickets ?? 0} تذكرة
                  </div>
                  <div className="flex items-center gap-1 bg-white/20 backdrop-blur rounded-xl px-2 py-1">
                    <Crown className="w-3.5 h-3.5" /> {d.totalParticipants ?? 0} مشارك
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* My chances per draw */}
        {user && (
          <div className="fancy-card rounded-3xl p-4 mt-2">
            <div className="font-bold text-pink-900 text-sm mb-3 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-pink-600" /> فرصي للفوز
            </div>
            {totalMyTickets === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                لا توجد تذاكر بعد. تسوّق لتربح تذاكر مجانية!{" "}
                <Link href="/categories" className="text-pink-600 font-bold">تسوّق الآن</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {summary.map((s) => (
                  <div key={s.drawId} className="rounded-2xl border border-pink-100 p-3 bg-pink-50/30">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-bold text-pink-900 truncate">{s.prizeName}</div>
                      <div className="text-xs font-extrabold text-pink-600">{s.chance.toFixed(2)}%</div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>تذاكري: <b className="text-pink-700">{s.myTickets}</b> من {s.totalTickets}</span>
                      <span>{timeLeft(s.endsAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!user && (
          <button
            onClick={() => setLocation("/login")}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-bold py-3 shadow-md flex items-center justify-center gap-2"
          >
            <Gift className="w-4 h-4" /> سجّل الآن وابدأ تجميع التذاكر
          </button>
        )}
      </div>
    </AppLayout>
  );
}
