// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Tag, ChevronLeft } from "lucide-react";
import { useListProducts } from "@workspace/api-client-react";
import { formatSDG } from "@/lib/utils";

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  // FIX #1: RAF ref to throttle scroll listener — was causing setState on every scroll pixel
  const rafRef = useRef<number | null>(null);

  const debounced = useDebounce(query.trim(), 280);
  const shouldSearch = debounced.length >= 1;

  const { data: results, isFetching } = useListProducts(
    shouldSearch ? { search: debounced } : {},
    {
      query: {
        enabled: shouldSearch && focused,
        staleTime: 10_000,
        refetchOnWindowFocus: false,
        queryKey: [],
      },
    },
  );

  const open = focused && query.trim().length >= 1;

  const updatePos = useCallback(() => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: r.bottom + window.scrollY + 6,
      left: r.left + window.scrollX,
      width: r.width,
    });
  }, []);

  // FIX #1: Throttle with requestAnimationFrame — was firing setState on every scroll event
  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      updatePos();
    });
  }, [updatePos]);

  useEffect(() => {
    if (open) {
      updatePos();
      window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
      window.addEventListener("resize", updatePos, { passive: true });
    }
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePos);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [open, updatePos, handleScroll]);

  function handleSelect(id: number) {
    setQuery("");
    setFocused(false);
    setLocation(`/product/${id}`);
  }

  function clear() {
    setQuery("");
    inputRef.current?.focus();
  }

  const shown = (results ?? []).slice(0, 8);

  const dropdown = open && dropdownPos ? createPortal(
    <>
      <div
        className="fixed inset-0 z-[9990]"
        onClick={() => setFocused(false)}
      />
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15 }}
        style={{
          position: "absolute",
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          zIndex: 9991,
        }}
        className="bg-white rounded-3xl shadow-[0_20px_50px_-10px_rgba(190,24,93,0.35)] border border-pink-100 overflow-hidden"
      >
        {isFetching && !results && (
          <div className="px-4 py-4 text-center">
            <div className="inline-block w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isFetching && shown.length === 0 && (
          <div className="px-4 py-5 text-center">
            <Tag className="w-6 h-6 text-pink-300 mx-auto mb-1" />
            <div className="text-xs text-pink-400 font-semibold">لا توجد نتائج لـ «{debounced}»</div>
          </div>
        )}

        {shown.length > 0 && (
          <div className="divide-y divide-pink-50">
            {shown.map((p) => (
              <button
                key={p.id}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(p.id); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-right hover:bg-pink-50/70 active:bg-pink-100 transition"
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-9 h-9 rounded-xl object-cover shrink-0 border border-pink-100"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-pink-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-extrabold text-pink-900 truncate">{p.name}</div>
                  {p.description && (
                    <div className="text-[10px] text-pink-500 truncate mt-0.5">{p.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] font-black text-pink-700">{formatSDG(Number(p.price))}</span>
                  <ChevronLeft className="w-3.5 h-3.5 text-pink-400" />
                </div>
              </button>
            ))}

            {(results?.length ?? 0) > 8 && (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFocused(false);
                  setLocation(`/categories?q=${encodeURIComponent(debounced)}`);
                }}
                className="w-full px-4 py-3 text-center text-[11px] font-bold text-pink-600 hover:bg-pink-50 transition"
              >
                عرض جميع النتائج ({results!.length})
              </button>
            )}
          </div>
        )}
      </motion.div>
    </>,
    document.body,
  ) : null;

  return (
    <div ref={containerRef} className="relative">
      {/* FIX #9: Replaced blur-lg (GPU filter) with box-shadow — same visual, no compositing layer */}
      <div className="absolute inset-0 rounded-2xl shadow-[0_0_18px_4px_rgba(236,72,153,0.18)]" />
      <div className="fancy-card relative flex items-center gap-2.5 rounded-2xl px-3.5 py-3 shadow-[0_15px_35px_-10px_rgba(190,24,93,0.35)]">
        <div className="p-1.5 rounded-xl bg-gradient-to-br from-pink-600 to-rose-700 text-white shrink-0">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="ابحث عن أي خدمة..."
          dir="rtl"
          className="flex-1 bg-transparent text-right text-[13px] font-semibold text-pink-800 placeholder-pink-400 outline-none min-w-0"
        />
        <AnimatePresence>
          {query.length > 0 && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={clear}
              className="p-1 rounded-full bg-pink-100 text-pink-500 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
        {query.length === 0 && (
          <div className="text-[10px] font-bold text-pink-700 bg-pink-100 rounded-full px-2 py-0.5 shrink-0">
            +500
          </div>
        )}
      </div>

      <AnimatePresence>{dropdown}</AnimatePresence>
    </div>
  );
}
