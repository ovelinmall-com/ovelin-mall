import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { isInsideApp } from "@/lib/appEnv";

export function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isInsideApp()) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed top-0 inset-x-0 z-[9999] flex items-center gap-3 px-3 py-2.5 bg-white border-b border-pink-100 shadow-md"
    >
      <img
        src={`${import.meta.env.BASE_URL}icon-192.png`}
        alt="Ovelin Mall"
        className="w-10 h-10 rounded-xl shrink-0 shadow"
      />

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-black text-gray-900 leading-tight">
          Ovelin Mall
        </div>
        <div className="text-[11px] text-gray-500 leading-tight mt-0.5 line-clamp-2">
          حمّل التطبيق لسهولة الاستخدام، وستحصل على بعض المكافآت
        </div>
      </div>

      <a
        href={`${import.meta.env.BASE_URL}ovelin-mall.apk`}
        download="ovelin-mall.apk"
        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-l from-pink-600 to-rose-600 text-white text-[12px] font-extrabold shadow-[0_2px_12px_rgba(236,72,153,0.4)] active:scale-95 transition"
      >
        <Download className="w-3.5 h-3.5" />
        تحميل
      </a>

      <button
        onClick={() => setVisible(false)}
        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 active:scale-90 transition"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
