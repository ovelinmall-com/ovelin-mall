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
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  KeyRound,
  Copy,
  CheckCircle2,
  Sparkles,
  Search,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { formatSDG } from "@/lib/utils";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

type MyCode = {
  id: number;
  code: string;
  soldAt: string | null;
  orderId: number | null;
  productId: number;
  productName: string | null;
  productImage: string | null;
  productPlatform: string | null;
  productQuantity: string | null;
  price: string | null;
};

async function fetchMyCodes(): Promise<MyCode[]> {
  const res = await fetch("/api/my-codes", { credentials: "include" });
  if (!res.ok) throw new Error("فشل تحميل الأكواد");
  return res.json();
}

export default function MyCodes() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading: meLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false, refetchOnWindowFocus: false },
  });
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!meLoading && !me) setLocation("/login");
  }, [meLoading, me, setLocation]);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["my-codes"],
    queryFn: fetchMyCodes,
    enabled: !!me,
  });

  function copy(c: MyCode) {
    navigator.clipboard.writeText(c.code);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = codes.filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      c.code.toLowerCase().includes(s) ||
      (c.productName ?? "").toLowerCase().includes(s) ||
      (c.productPlatform ?? "").toLowerCase().includes(s)
    );
  });

  if (!me) return null;

  return (
    <AppLayout>
      <div className="relative overflow-hidden bg-gradient-to-br from-pink-600 via-rose-600 to-pink-800 text-white">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 12, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-16 -right-16 w-64 h-64 bg-red-500/15 rounded-full blur-3xl"
        />

        <div className="relative px-5 pt-5 pb-8">
          <div className="flex items-center gap-1 text-xs opacity-80 mb-4">
            <Link href="/account" className="active:scale-95">
              <ChevronRight className="w-4 h-4 inline" /> حسابي
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/15 backdrop-blur shadow-lg">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] tracking-[0.2em] opacity-80 font-bold">
                OVELIN MALL
              </div>
              <h1 className="text-2xl font-black">أكوادي</h1>
              <div className="text-xs opacity-90 mt-0.5">
                {codes.length} {codes.length === 1 ? "كود" : "كود"} في خزينتك
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 min-h-[60vh]">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في الأكواد أو المنتجات..."
            className="w-full pr-10 pl-4 py-3 rounded-2xl bg-white border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            data-testid="input-search-codes"
          />
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-pink-100/50 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-pink-600">
            <div className="text-5xl mb-3">🔐</div>
            <div className="font-bold text-pink-900">لا توجد أكواد بعد</div>
            <div className="text-xs opacity-80 mt-1 mb-4">
              اشترِ أول باقة من المتجر وستظهر أكوادك هنا
            </div>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-2xl bg-gradient-to-l from-pink-600 to-rose-600 text-white font-bold text-sm shadow-md active:scale-95"
            >
              تصفح المتجر
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              transition={{ delay: i * 0.04 }}
              className="relative overflow-hidden rounded-2xl bg-white border-2 border-pink-200 shadow-sm"
              data-testid={`card-code-${c.id}`}
            >
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-teal-500 to-emerald-700" />

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-pink-900 text-sm truncate">
                      {c.productName ?? "منتج محذوف"}
                    </h3>
                    <div className="text-[11px] text-pink-600 mt-0.5">
                      {c.productQuantity ?? "—"}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-emerald-700">
                      {c.price ? formatSDG(c.price) : "—"} ج.س
                    </div>
                    <div className="text-[10px] text-pink-500 mt-0.5">
                      {c.soldAt ? new Date(c.soldAt).toLocaleDateString("ar-EG") : "—"}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50 border border-dashed border-emerald-300 p-3 mt-2">
                  <div className="text-[9px] text-emerald-700 font-bold tracking-widest text-center mb-1">
                    ★ كود التفعيل ★
                  </div>
                  <div
                    className="font-mono text-center text-sm font-bold text-emerald-900 break-all select-all"
                    data-testid={`text-code-${c.id}`}
                  >
                    {c.code}
                  </div>
                </div>

                <button
                  onClick={() => copy(c)}
                  className="w-full mt-2.5 py-2 rounded-xl bg-gradient-to-l from-emerald-500 to-teal-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95"
                  data-testid={`button-copy-${c.id}`}
                >
                  <AnimatePresence mode="wait">
                    {copiedId === c.id ? (
                      <motion.span
                        key="copied"
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> تم النسخ
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" /> نسخ الكود
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              <div
                className="h-1.5 w-full"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, transparent 0 6px, rgba(244,114,182,0.4) 6px 12px)",
                }}
              />
            </motion.div>
          ))}
        </div>

        {filtered.length > 0 && (
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 border border-pink-200 text-center">
            <Sparkles className="w-5 h-5 mx-auto text-pink-600 mb-1" />
            <div className="text-xs text-pink-800 font-bold">
              جميع أكوادك محفوظة بأمان — يمكنك العودة لاستعراضها في أي وقت
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
