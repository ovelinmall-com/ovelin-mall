import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, ChevronDown, X } from "lucide-react";
import { ALL_COUNTRIES, type Country } from "../data/countries";

interface Props {
  selected: Country;
  onSelect: (country: Country) => void;
}

export default function CountryCodePicker({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [open]);

  const filtered = ALL_COUNTRIES.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.nameAr.includes(q) ||
      c.dialCode.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  function handleSelect(country: Country) {
    onSelect(country);
    setOpen(false);
  }

  return (
    <>
      {/* زر رمز الدولة */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 shrink-0 self-stretch px-3 rounded-r-2xl bg-pink-50/60 hover:bg-pink-100 transition active:scale-95 select-none border-l border-pink-200"
        style={{ direction: "ltr" }}
        aria-label="اختيار رمز الدولة"
      >
        <span className="text-xl leading-none">{selected.flag}</span>
        <span className="text-sm font-bold text-pink-800">+{selected.dialCode}</span>
        <ChevronDown className="w-3 h-3 text-pink-400" />
      </button>

      {/* Modal اختيار الدولة */}
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col"
              style={{ maxHeight: "88dvh" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-pink-100">
                <h3 className="text-base font-black text-pink-900">اختر رمز الدولة</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-pink-50 text-pink-400 hover:bg-pink-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* شريط البحث */}
              <div className="px-4 py-3 border-b border-pink-50">
                <div className="flex items-center gap-2 rounded-2xl border border-pink-200 bg-pink-50/50 px-3 py-2">
                  <Search className="w-4 h-4 text-pink-400 shrink-0" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث باسم الدولة أو المفتاح (+249...)"
                    className="flex-1 bg-transparent text-sm text-pink-900 placeholder:text-pink-300 focus:outline-none"
                    dir="rtl"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-pink-300 hover:text-pink-500 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* قائمة الدول */}
              <div className="overflow-y-auto flex-1 overscroll-contain">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-pink-300 text-sm">
                    لا توجد نتائج
                  </div>
                ) : (
                  filtered.map((country) => {
                    const isSelected = country.code === selected.code;
                    return (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleSelect(country)}
                        className={`w-full flex items-center gap-3 px-5 py-3.5 text-right transition active:bg-pink-50 ${
                          isSelected
                            ? "bg-pink-50 border-r-4 border-pink-500"
                            : "hover:bg-gray-50 border-r-4 border-transparent"
                        }`}
                        dir="rtl"
                      >
                        <span className="text-2xl leading-none shrink-0">{country.flag}</span>
                        <span className="flex-1 text-sm font-semibold text-gray-800 text-right">
                          {country.nameAr}
                        </span>
                        <span
                          className="text-sm font-mono font-bold text-pink-600 shrink-0"
                          style={{ direction: "ltr" }}
                        >
                          +{country.dialCode}
                        </span>
                        {isSelected && (
                          <span className="text-pink-500 text-xs font-bold shrink-0">✓</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
