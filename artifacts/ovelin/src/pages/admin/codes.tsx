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

import { useEffect, useMemo, useState } from "react";
import { formatSDG } from "@/lib/utils";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronRight,
  KeyRound,
  Plus,
  Trash2,
  Search,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  TrendingUp,
} from "lucide-react";

type Product = {
  id: number;
  name: string;
  category: string;
  platform: string | null;
  quantity: string | null;
  price: string;
  imageUrl: string | null;
  active: boolean;
};

type Stat = {
  productId: number;
  available: number;
  sold: number;
  reserved: number;
};

type CodeRow = {
  id: number;
  productId: number;
  code: string;
  status: string;
  orderId: number | null;
  soldToUserId: number | null;
  soldAt: string | null;
  createdAt: string;
  note: string | null;
};

async function fetchStats(): Promise<Stat[]> {
  const res = await fetch("/api/admin/codes/stats", { credentials: "include" });
  if (!res.ok) throw new Error("فشل تحميل الإحصائيات");
  return res.json();
}

async function fetchCodes(productId: number): Promise<CodeRow[]> {
  const res = await fetch(`/api/admin/products/${productId}/codes`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("فشل تحميل الأكواد");
  return res.json();
}

async function addCodes(productId: number, codes: string): Promise<{ added: number }> {
  const res = await fetch(`/api/admin/products/${productId}/codes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "فشل الإضافة");
  return data;
}

async function deleteCode(id: number): Promise<void> {
  const res = await fetch(`/api/admin/codes/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d?.error ?? "فشل الحذف");
  }
}

async function fetchAdminMe(): Promise<{ ok: boolean }> {
  const res = await fetch("/api/admin/stats", { credentials: "include" });
  return { ok: res.ok };
}

async function fetchAdminProducts(): Promise<Product[]> {
  const res = await fetch("/api/admin/products", { credentials: "include" });
  if (!res.ok) throw new Error("فشل تحميل المنتجات");
  return res.json();
}

export default function AdminCodes() {
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);
  const platformFilter = urlParams.get("platform") ?? "";
  const isPubgMode = platformFilter.toLowerCase().includes("pubg");
  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["admin-me-check"],
    queryFn: fetchAdminMe,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const isAdmin = !!me?.ok;

  useEffect(() => {
    if (!meLoading && !isAdmin) setLocation("/admin/login");
  }, [meLoading, isAdmin, setLocation]);

  const qc = useQueryClient();
  const { data: products = [], isLoading: prodLoading } = useQuery({
    queryKey: ["admin-products-for-codes"],
    queryFn: fetchAdminProducts,
    enabled: isAdmin,
  });

  const { data: stats = [], isLoading: statsLoading } = useQuery({
    queryKey: ["admin-codes-stats"],
    queryFn: fetchStats,
    enabled: isAdmin,
    refetchInterval: 10000,
  });

  const statsMap = useMemo(() => {
    const m = new Map<number, Stat>();
    for (const s of stats) m.set(s.productId, s);
    return m;
  }, [stats]);

  const [search, setSearch] = useState("");
  const [openProductId, setOpenProductId] = useState<number | null>(null);

  const filteredProducts = products.filter((p) => {
    if (isPubgMode) {
      if (!(p.platform ?? "").toLowerCase().includes("pubg")) return false;
    } else {
      if (p.category !== "game_cards" || !(p.platform ?? "").toLowerCase().includes("fire")) return false;
    }
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      (p.quantity ?? "").toLowerCase().includes(s)
    );
  });

  // Aggregate totals
  const totals = useMemo(() => {
    let avail = 0, sold = 0;
    for (const s of stats) {
      avail += s.available;
      sold += s.sold;
    }
    return { available: avail, sold };
  }, [stats]);

  if (!me) return null;

  const openProduct = products.find((p) => p.id === openProductId) ?? null;

  return (
    <div dir="rtl" className="min-h-[100dvh]">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-1 text-xs text-pink-700 mb-4">
          <Link href="/admin" className="active:scale-95 hover:underline">
            <ChevronRight className="w-4 h-4 inline" /> لوحة الأدمن
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-700 text-white shadow-lg">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-pink-900">
              {isPubgMode ? "أكواد PUBG Mobile" : "أكواد فري فاير"}
            </h1>
            <div className="text-xs text-pink-600">
              {isPubgMode ? "إدارة أكواد شدادات PUBG الجاهزة" : "إدارة أكواد شحن جواهر فري فاير"}
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl bg-white border border-emerald-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-emerald-700">
              <Package className="w-4 h-4" />
              <span className="text-xs font-bold">متوفر للبيع</span>
            </div>
            <div className="text-3xl font-black text-emerald-700" data-testid="text-total-available">
              {totals.available}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">عبر جميع المنتجات</div>
          </div>
          <div className="rounded-2xl bg-white border border-pink-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-pink-700">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold">تم بيعه</span>
            </div>
            <div className="text-3xl font-black text-pink-700" data-testid="text-total-sold">
              {totals.sold}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">إجمالي المبيعات</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في باقات جواهر فري فاير..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white border border-pink-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              data-testid="input-search-products"
            />
          </div>
        </div>

        {/* Products list */}
        {(prodLoading || statsLoading) && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-pink-100/50 animate-pulse" />
            ))}
          </div>
        )}

        <div className="space-y-2">
          {filteredProducts.map((p) => {
            const stat = statsMap.get(p.id) ?? { available: 0, sold: 0, reserved: 0 };
            return (
              <motion.button
                key={p.id}
                onClick={() => setOpenProductId(p.id)}
                whileTap={{ scale: 0.99 }}
                className="w-full text-right rounded-2xl bg-white border border-pink-200 hover:border-pink-400 hover:shadow-md transition p-4"
                data-testid={`button-product-${p.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white font-black flex-shrink-0">
                    {p.platform?.[0] ?? p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-pink-900 text-sm truncate">{p.name}</h3>
                      {!p.active && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                          معطل
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-pink-600 truncate">
                      {p.platform ?? "—"} • {p.quantity ?? "—"} • {formatSDG(p.price)} ج.س
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-[11px] flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        stat.available > 0
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {stat.available} متوفر
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-bold">
                      {stat.sold} مباع
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {!prodLoading && filteredProducts.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <div className="text-3xl mb-2">📭</div>
            <div>لا توجد منتجات مطابقة</div>
          </div>
        )}
      </div>

      {openProduct && (
        <CodesPanel
          product={openProduct}
          onClose={() => {
            setOpenProductId(null);
            qc.invalidateQueries({ queryKey: ["admin-codes-stats"] });
          }}
        />
      )}
    </div>
  );
}

function CodesPanel({ product, onClose }: { product: Product; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"available" | "sold" | "all">("available");
  const [bulkText, setBulkText] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["admin-codes", product.id],
    queryFn: () => fetchCodes(product.id),
  });

  const filtered = codes.filter((c) =>
    tab === "all" ? true : c.status === tab,
  );

  const addMutation = useMutation({
    mutationFn: (text: string) => addCodes(product.id, text),
    onSuccess: (data) => {
      setMsg({ type: "ok", text: `تمت إضافة ${data.added} كود بنجاح` });
      setBulkText("");
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ["admin-codes", product.id] });
      qc.invalidateQueries({ queryKey: ["admin-codes-stats"] });
      setTimeout(() => setMsg(null), 3000);
    },
    onError: (err: any) => {
      setMsg({ type: "err", text: err?.message ?? "فشل الإضافة" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCode,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-codes", product.id] });
      qc.invalidateQueries({ queryKey: ["admin-codes-stats"] });
    },
    onError: (err: any) => {
      setMsg({ type: "err", text: err?.message ?? "فشل الحذف" });
    },
  });

  const counts = {
    available: codes.filter((c) => c.status === "available").length,
    sold: codes.filter((c) => c.status === "sold").length,
    all: codes.length,
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full sm:max-w-2xl max-h-[92vh] bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col"
        dir="rtl"
        data-testid="panel-codes-manager"
      >
        {/* Header */}
        <div className="p-5 border-b border-pink-100 bg-gradient-to-l from-pink-600 to-rose-700 text-white sm:rounded-t-3xl rounded-t-3xl">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] opacity-80 tracking-widest font-bold">
                إدارة الأكواد
              </div>
              <h2 className="text-lg font-black truncate">{product.name}</h2>
              <div className="text-[11px] opacity-90">
                {product.platform ?? "—"} • {product.quantity ?? "—"}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 active:scale-95"
              data-testid="button-close-panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowAdd((s) => !s)}
            className="mt-2 w-full py-2.5 rounded-xl bg-white/20 backdrop-blur border border-white/30 font-bold text-sm flex items-center justify-center gap-2 active:scale-95"
            data-testid="button-toggle-add"
          >
            <Plus className="w-4 h-4" />
            {showAdd ? "إخفاء نموذج الإضافة" : "إضافة أكواد جديدة"}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden border-b border-pink-100 bg-pink-50/50"
          >
            <div className="p-4">
              <label className="text-xs font-bold text-pink-900 block mb-1">
                الصق الأكواد (كود في كل سطر، أو مفصولة بفاصلة)
              </label>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`FF-XXXX-AAAA-1111\nFF-XXXX-BBBB-2222\nFF-XXXX-CCCC-3333`}
                rows={6}
                className="w-full p-3 rounded-xl bg-white border border-pink-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                data-testid="textarea-bulk-codes"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-pink-200 text-pink-800 text-sm font-bold active:scale-95"
                  data-testid="button-cancel-add"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => addMutation.mutate(bulkText)}
                  disabled={!bulkText.trim() || addMutation.isPending}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-l from-pink-600 to-rose-600 text-white text-sm font-bold active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="button-submit-add"
                >
                  {addMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري الإضافة...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      إضافة
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {msg && (
          <div
            className={`mx-4 mt-3 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
              msg.type === "ok"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
            data-testid="text-status-msg"
          >
            {msg.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {msg.text}
          </div>
        )}

        {/* Tabs */}
        <div className="px-4 pt-3 flex gap-2 border-b border-pink-100">
          {(["available", "sold", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs font-bold border-b-2 transition ${
                tab === t
                  ? "border-pink-600 text-pink-700"
                  : "border-transparent text-zinc-500"
              }`}
              data-testid={`tab-${t}`}
            >
              {t === "available" ? "متوفر" : t === "sold" ? "مباع" : "الكل"}
              <span className="mr-1 text-[10px] opacity-70">({counts[t]})</span>
            </button>
          ))}
        </div>

        {/* Codes list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-pink-100/50 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              {tab === "available"
                ? "لا توجد أكواد متوفرة. أضف بعض الأكواد أعلاه."
                : tab === "sold"
                  ? "لم يتم بيع أي كود من هذا المنتج بعد."
                  : "لا توجد أكواد لهذا المنتج."}
            </div>
          )}

          {filtered.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-2 p-3 rounded-xl border ${
                c.status === "sold"
                  ? "bg-zinc-50 border-zinc-200"
                  : c.status === "reserved"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-emerald-50 border-emerald-200"
              }`}
              data-testid={`row-code-${c.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs font-bold text-zinc-800 truncate select-all">
                  {c.code}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  {c.status === "sold"
                    ? `مباع${c.soldAt ? " • " + new Date(c.soldAt).toLocaleString("ar-EG") : ""}${
                        c.orderId ? ` • طلب #${c.orderId}` : ""
                      }`
                    : c.status === "reserved"
                      ? "محجوز مؤقتاً"
                      : `أُضيف في ${new Date(c.createdAt).toLocaleDateString("ar-EG")}`}
                </div>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                  c.status === "sold"
                    ? "bg-zinc-200 text-zinc-700"
                    : c.status === "reserved"
                      ? "bg-amber-200 text-amber-800"
                      : "bg-emerald-200 text-emerald-800"
                }`}
              >
                {c.status === "sold" ? "مباع" : c.status === "reserved" ? "محجوز" : "متوفر"}
              </span>
              {c.status !== "sold" && (
                <button
                  onClick={() => {
                    if (confirm("حذف هذا الكود؟")) deleteMutation.mutate(c.id);
                  }}
                  disabled={deleteMutation.isPending}
                  className="p-1.5 rounded-lg bg-red-50 text-red-600 active:scale-95 disabled:opacity-50"
                  data-testid={`button-delete-${c.id}`}
                  aria-label="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
