// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// ============================================================
// ┌─────────────────────────────────────────────────────────────┐
// │ ⚠️  مفتاح API المورد ظاهر بإرادة صاحب المشروع               │
// │  API Key: 0b28edf644be7e4c28874b5e3b2a44a4                 │
// │  المورد: honestsmm.com — صاحب المشروع يتحمل المسؤولية.      │
// └─────────────────────────────────────────────────────────────┘

import { useEffect, useState } from "react";
import { formatSDG } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Users, Heart, Eye, MessageCircle, Share2,
  Edit3, Check, X, Loader2, AlertCircle, RefreshCw, Zap,
} from "lucide-react";

// ══ Types ════════════════════════════════════════════════════
type SmmProduct = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  platform: string | null;
  badge: string | null;
  smmServiceId: string | null;
  smmRateUsd: string | null;
  smmMin: number | null;
  smmMax: number | null;
  active: boolean;
};

// ══ Constants ════════════════════════════════════════════════
const PLATFORMS = [
  { id: "all",       label: "الكل",       emoji: "🌐" },
  { id: "instagram", label: "انستغرام",   emoji: "📸" },
  { id: "facebook",  label: "فيسبوك",     emoji: "👤" },
  { id: "tiktok",    label: "تيك توك",    emoji: "🎵" },
  { id: "twitter",   label: "تويتر",      emoji: "🐦" },
  { id: "youtube",   label: "يوتيوب",     emoji: "▶️" },
  { id: "snapchat",  label: "سناب شات",   emoji: "👻" },
  { id: "telegram",  label: "تيليغرام",   emoji: "✈️" },
] as const;

const BADGES = [
  { id: "all",       label: "الكل",     icon: null },
  { id: "followers", label: "متابعون",  icon: Users },
  { id: "likes",     label: "إعجابات",  icon: Heart },
  { id: "views",     label: "مشاهدات",  icon: Eye },
  { id: "comments",  label: "تعليقات",  icon: MessageCircle },
  { id: "shares",    label: "مشاركات",  icon: Share2 },
] as const;

const USD_TO_SDG = 800;
const MARKUP = 1.5;

function calcSuggestedSdg(rateUsd: string | null): number {
  if (!rateUsd) return 0;
  return (Number(rateUsd) / 1000) * USD_TO_SDG * MARKUP;
}

// ══ API helpers ══════════════════════════════════════════════
async function fetchSmmProducts(): Promise<SmmProduct[]> {
  const res = await fetch("/api/admin/smm/products", { credentials: "include" });
  if (!res.ok) throw new Error("فشل تحميل خدمات الرشق");
  return res.json();
}

async function updateProduct(id: number, body: { name?: string; description?: string; price?: string; active?: boolean }): Promise<SmmProduct> {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "فشل التحديث");
  return data;
}

async function seedSmm(clear: boolean): Promise<{ created: number; updated: number }> {
  const res = await fetch("/api/admin/smm/seed", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clear }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "فشل المزامنة");
  return data;
}

// ══ Main component ═══════════════════════════════════════════
export default function AdminSmmServices() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["admin-me-check-smm"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      return { ok: res.ok };
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  const isAdmin = !!me?.ok;

  useEffect(() => {
    if (!meLoading && !isAdmin) setLocation("/admin/login");
  }, [meLoading, isAdmin, setLocation]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-smm-products"],
    queryFn: fetchSmmProducts,
    enabled: isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Parameters<typeof updateProduct>[1] }) =>
      updateProduct(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-smm-products"] }),
  });

  const seedMutation = useMutation({
    mutationFn: (clear: boolean) => seedSmm(clear),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-smm-products"] }),
  });

  // ── Filters ────────────────────────────────────────────────
  const [platFilter, setPlatFilter] = useState<string>("all");
  const [badgeFilter, setBadgeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // ── Edit state ─────────────────────────────────────────────
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  // editPriceDigits = digits only, represents price per 1000 units in SDG
  const [editPriceDigits, setEditPriceDigits] = useState("");
  const [editError, setEditError] = useState("");

  // Format digits as SDG: "1000" → "1,000,00"
  function formatSdgInput(digits: string): string {
    const n = parseInt(digits || "0") || 0;
    return n.toLocaleString("en-US") + ",00";
  }

  function handlePriceInput(raw: string) {
    // Keep only digits
    const digits = raw.replace(/\D/g, "");
    setEditPriceDigits(digits);
  }

  // ── Seed modal ─────────────────────────────────────────────
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedResult, setSeedResult] = useState<{ created: number; updated: number } | null>(null);

  // ── Filter products ────────────────────────────────────────
  const filtered = products.filter((p) => {
    if (platFilter !== "all" && p.platform !== platFilter) return false;
    if (badgeFilter !== "all" && p.badge !== badgeFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.description ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Platform badge counts ──────────────────────────────────
  const platCounts = Object.fromEntries(
    PLATFORMS.map((pl) => [
      pl.id,
      pl.id === "all" ? products.length : products.filter((p) => p.platform === pl.id).length,
    ]),
  );

  function startEdit(p: SmmProduct) {
    setEditId(p.id);
    setEditName(p.name);
    setEditDesc(p.description ?? "");
    // Convert per-unit price → per-1000 price as integer digits
    const per1000 = Math.round(Number(p.price) * 1000);
    setEditPriceDigits(per1000 > 0 ? per1000.toString() : "");
    setEditError("");
  }

  async function saveEdit(p: SmmProduct) {
    const per1000 = parseInt(editPriceDigits || "0");
    if (!per1000 || per1000 <= 0) { setEditError("أدخل سعراً صحيحاً أكبر من صفر"); return; }
    const perUnit = (per1000 / 1000).toFixed(6);
    try {
      await updateMutation.mutateAsync({
        id: p.id,
        body: { name: editName.trim() || p.name, description: editDesc.trim(), price: perUnit },
      });
      setEditId(null);
    } catch (err: any) { setEditError(err?.message ?? "فشل"); }
  }

  async function handleSeed(clear: boolean) {
    try {
      const result = await seedMutation.mutateAsync(clear);
      setSeedResult(result);
    } catch {}
  }

  if (!me) return null;

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-gradient-to-br from-pink-50 via-white to-rose-50">
      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* ── Breadcrumb ─────────────────────────────────────── */}
        <div className="flex items-center gap-1 text-xs text-pink-700 mb-5">
          <Link href="/admin" className="hover:underline active:scale-95 flex items-center gap-0.5">
            <ChevronRight className="w-3.5 h-3.5" /> لوحة الأدمن
          </Link>
          <span className="opacity-50">›</span>
          <span className="font-bold">خدمات الرشق</span>
        </div>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-700 text-white shadow-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-pink-900">خدمات الرشق الاجتماعي</h1>
              <div className="text-xs text-pink-600 flex items-center gap-1">
                <span className="font-mono text-[10px] bg-pink-100 px-1.5 py-0.5 rounded-md">
                  honestsmm.com
                </span>
                <span className="opacity-60">• {products.length} خدمة</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setSeedResult(null); setShowSeedModal(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-l from-purple-600 to-pink-700 text-white text-xs font-bold shadow active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            مزامنة المورد
          </button>
        </div>

        {/* ── API key notice ──────────────────────────────────── */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 mb-5 flex items-start gap-2 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <span className="font-bold">⚠️ مفتاح API المورد ظاهر بإرادة صاحب المشروع: </span>
            <span className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">0b28edf644be7e4c28874b5e3b2a44a4</span>
            <span className="mr-1 opacity-70"> — صاحب المشروع يتحمل كامل المسؤولية.</span>
          </div>
        </div>

        {/* ── Platform tabs ───────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 pb-1">
          {PLATFORMS.map((pl) => (
            <button
              key={pl.id}
              onClick={() => setPlatFilter(pl.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition border ${
                platFilter === pl.id
                  ? "bg-gradient-to-l from-purple-600 to-pink-700 text-white border-transparent shadow-md"
                  : "bg-white border-pink-200 text-pink-700 hover:border-pink-400"
              }`}
            >
              <span>{pl.emoji}</span>
              <span>{pl.label}</span>
              {platCounts[pl.id] > 0 && (
                <span className={`text-[9px] font-black px-1 py-0.5 rounded-md ${platFilter === pl.id ? "bg-white/20" : "bg-pink-100 text-pink-600"}`}>
                  {platCounts[pl.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Badge type filter ───────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
          {BADGES.map((b) => {
            const Icon = b.icon;
            const cnt = b.id === "all"
              ? (platFilter === "all" ? products.length : products.filter((p) => p.platform === platFilter).length)
              : products.filter((p) => (platFilter === "all" || p.platform === platFilter) && p.badge === b.id).length;
            return (
              <button
                key={b.id}
                onClick={() => setBadgeFilter(b.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
                  badgeFilter === b.id
                    ? "bg-pink-600 text-white shadow-md shadow-pink-200"
                    : "bg-white border border-pink-200 text-pink-700"
                }`}
              >
                {Icon && <Icon className="w-3 h-3" />}
                {b.label}
                <span className={`text-[9px] ${badgeFilter === b.id ? "opacity-80" : "text-pink-400"}`}>({cnt})</span>
              </button>
            );
          })}
        </div>

        {/* ── Search ─────────────────────────────────────────── */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في الخدمات..."
          className="w-full mb-4 rounded-2xl border border-pink-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-pink-500 shadow-sm"
        />

        {/* ── Stats row ──────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-2 mb-5">
          {BADGES.slice(1).map((b) => {
            const Icon = b.icon!;
            const cnt = products.filter((p) =>
              (platFilter === "all" || p.platform === platFilter) && p.badge === b.id
            ).length;
            return (
              <button key={b.id} onClick={() => setBadgeFilter(b.id === badgeFilter ? "all" : b.id)}
                className="rounded-2xl bg-white border border-pink-100 shadow-sm p-2.5 text-center hover:border-pink-300 transition active:scale-95"
              >
                <Icon className="w-4 h-4 mx-auto text-pink-500 mb-1" />
                <div className="font-black text-pink-900 text-sm">{cnt}</div>
                <div className="text-[9px] text-pink-500">{b.label}</div>
              </button>
            );
          })}
        </div>

        {/* ── Pricing guide ──────────────────────────────────── */}
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-3 mb-4 text-xs text-blue-800 flex items-start gap-2">
          <Zap className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
          <span>
            <b>السعر / وحدة بالج.س</b> — المستخدم يشتري بالوحدة والواجهة تعرض لكل 1000. مثال: 0.002 ج.س/وحدة → 2 ج.س / 1000.
          </span>
        </div>

        {/* ── Loading ─────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-pink-100/50 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Empty ───────────────────────────────────────────── */}
        {!isLoading && products.length === 0 && (
          <div className="text-center py-16 text-zinc-500">
            <div className="text-4xl mb-2">📭</div>
            <div className="font-bold">لا توجد خدمات</div>
            <div className="text-xs mt-1 opacity-70">اضغط "مزامنة المورد" لجلب الخدمات</div>
          </div>
        )}

        {!isLoading && products.length > 0 && filtered.length === 0 && (
          <div className="text-center py-10 text-zinc-500">
            <div className="text-3xl mb-2">🔍</div>
            <div className="font-bold text-sm">لا توجد نتائج</div>
          </div>
        )}

        {/* ── Product cards ───────────────────────────────────── */}
        <div className="space-y-3">
          {filtered.map((p, i) => {
            const isEditing = editId === p.id;
            const rateUsd = Number(p.smmRateUsd ?? 0);
            const suggestedSdg = calcSuggestedSdg(p.smmRateUsd);
            const currentUnit = Number(p.price);
            const currentPer1000 = currentUnit * 1000;
            const platInfo = PLATFORMS.find((pl) => pl.id === p.platform);
            const badgeInfo = BADGES.find((b) => b.id === p.badge);

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="rounded-2xl bg-white border border-pink-100 shadow-sm overflow-hidden"
              >
                {isEditing ? (
                  /* ── Edit mode ──────────────────────────────── */
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Edit3 className="w-4 h-4 text-pink-600" />
                      <span className="font-bold text-pink-900 text-sm">تعديل الخدمة</span>
                      <span className="text-[10px] text-zinc-400 mr-auto font-mono">#{p.smmServiceId}</span>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 block mb-1">اسم الخدمة</label>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-xl border border-pink-200 bg-pink-50/40 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 block mb-1">وصف الخدمة</label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-pink-200 bg-pink-50/40 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 resize-none"
                      />
                    </div>

                    {/* Price reference */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-blue-50 border border-blue-200 p-2.5 text-center">
                        <div className="text-[9px] font-bold text-blue-700 mb-0.5">سعر المورد (USD / 1000)</div>
                        <div className="font-black text-blue-800">${rateUsd.toFixed(4)}</div>
                      </div>
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-center">
                        <div className="text-[9px] font-bold text-emerald-700 mb-0.5">مقترح (ج.س / 1000)</div>
                        <div className="font-black text-emerald-800">{formatSdgInput(Math.round(suggestedSdg * 1000).toString())}</div>
                      </div>
                    </div>

                    {/* Price input */}
                    <div>
                      <label className="text-[10px] font-bold text-zinc-500 block mb-1">
                        السعر بالج.س / 1000 وحدة (يدفعه العميل)
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-pink-300 bg-pink-50/40 px-3 py-2 focus-within:border-pink-500">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatSdgInput(editPriceDigits)}
                          onChange={(e) => handlePriceInput(e.target.value)}
                          className="flex-1 bg-transparent text-sm font-bold text-pink-900 focus:outline-none text-right"
                          placeholder="0,00"
                        />
                        <span className="text-xs text-zinc-500 shrink-0">ج.س / 1000</span>
                      </div>
                      {editPriceDigits && (
                        <div className="text-[10px] text-zinc-500 mt-1">
                          سعر الوحدة الواحدة: {(parseInt(editPriceDigits) / 1000).toFixed(4)} ج.س
                        </div>
                      )}
                    </div>

                    {editError && (
                      <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {editError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => setEditId(null)}
                        className="flex-1 py-2 rounded-xl border border-pink-200 text-pink-700 text-sm font-bold active:scale-95"
                      >
                        إلغاء
                      </button>
                      <button onClick={() => saveEdit(p)} disabled={updateMutation.isPending}
                        className="flex-[2] py-2 rounded-xl bg-gradient-to-l from-pink-600 to-rose-700 text-white text-sm font-bold shadow active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {updateMutation.isPending
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                          : <><Check className="w-4 h-4" /> حفظ</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ──────────────────────────────── */
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Platform emoji */}
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 border border-pink-200 flex items-center justify-center text-xl shrink-0">
                        {platInfo?.emoji ?? "🌐"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          {platInfo && (
                            <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded-full border border-purple-200">
                              {platInfo.label}
                            </span>
                          )}
                          {badgeInfo && badgeInfo.id !== "all" && (
                            <span className="text-[9px] bg-pink-50 text-pink-700 font-bold px-1.5 py-0.5 rounded-full border border-pink-200 flex items-center gap-0.5">
                              {badgeInfo.icon && <badgeInfo.icon className="w-2.5 h-2.5" />}
                              {badgeInfo.label}
                            </span>
                          )}
                          <span className="text-[9px] text-zinc-400 font-mono">#{p.smmServiceId}</span>
                        </div>
                        <div className="font-bold text-pink-900 text-sm leading-tight line-clamp-2">{p.name}</div>
                        {p.description && (
                          <div className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{p.description}</div>
                        )}
                        <div className="text-[9px] text-zinc-400 mt-1">
                          أدنى: {(p.smmMin ?? 0).toLocaleString("ar")} • أقصى: {(p.smmMax ?? 0).toLocaleString("ar")}
                        </div>
                      </div>

                      <button onClick={() => startEdit(p)}
                        className="p-2 rounded-xl bg-pink-50 border border-pink-200 text-pink-700 active:scale-90 hover:bg-pink-100 shrink-0"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price grid */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-2 text-center">
                        <div className="text-[8px] text-blue-600 font-bold mb-0.5">سعر المورد USD/1000</div>
                        <div className="font-black text-blue-800 text-xs">${rateUsd.toFixed(4)}</div>
                      </div>
                      <div className="rounded-xl bg-rose-50 border border-rose-100 p-2 text-center">
                        <div className="text-[8px] text-rose-600 font-bold mb-0.5">سعر البيع ج.س/1000</div>
                        <div className="font-black text-rose-800 text-xs">{Math.round(currentPer1000).toLocaleString("en-US")},00</div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Seed modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showSeedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4"
            onClick={() => { if (!seedMutation.isPending) setShowSeedModal(false); }}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              className="bg-white rounded-3xl w-full max-w-md p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="font-black text-pink-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-pink-600" />
                  مزامنة خدمات المورد
                </div>
                <button onClick={() => setShowSeedModal(false)} disabled={seedMutation.isPending}>
                  <X className="w-5 h-5 text-pink-400" />
                </button>
              </div>

              <div className="text-xs text-zinc-600 leading-relaxed bg-pink-50 rounded-2xl p-3 border border-pink-100">
                ستجلب الخدمات من <b>honestsmm.com</b> وتُخزّنها في قاعدة البيانات للعرض للمستخدمين.
                <br />يغطي: انستغرام، فيسبوك، تيك توك، تويتر، يوتيوب، سناب، واتساب، تيليغرام
                <br />أنواع: متابعون، إعجابات، مشاهدات، تعليقات، مشاركات
              </div>

              {seedResult && (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>✅ أُنشئ: <b>{seedResult.created}</b> • حُدّث: <b>{seedResult.updated}</b></span>
                </div>
              )}

              {seedMutation.isError && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {(seedMutation.error as any)?.message ?? "فشل المزامنة"}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSeed(false)}
                  disabled={seedMutation.isPending}
                  className="py-3 rounded-2xl bg-gradient-to-l from-purple-600 to-pink-700 text-white font-bold text-sm shadow active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {seedMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري...</>
                    : <><RefreshCw className="w-4 h-4" /> تحديث</>}
                </button>
                <button
                  onClick={() => { if (confirm("سيحذف كل الخدمات الموجودة ويعيد الجلب. متأكد؟")) handleSeed(true); }}
                  disabled={seedMutation.isPending}
                  className="py-3 rounded-2xl border-2 border-red-300 text-red-700 font-bold text-sm active:scale-95 disabled:opacity-50"
                >
                  إعادة بناء كاملة
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
