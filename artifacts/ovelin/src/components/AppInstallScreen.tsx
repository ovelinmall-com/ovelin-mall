import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronLeft } from "lucide-react";
import { isInsideApp } from "@/lib/appEnv";

interface PublicSettings {
  appInstallEnabled?: boolean;
  appInstallDesc?: string;
}

async function fetchPublicSettings(): Promise<PublicSettings> {
  const res = await fetch(`${import.meta.env.BASE_URL}api/settings/public-rich`);
  if (!res.ok) return {};
  return res.json();
}

export function AppInstallScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const [desc, setDesc] = useState("حمّل التطبيق لسهولة الاستخدام، وستحصل على بعض المكافآت");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // داخل APK/TWA أو PWA — لا نعرض شاشة التثبيت
    if (isInsideApp()) {
      setChecked(true);
      onDone();
      return;
    }

    fetchPublicSettings()
      .then((s) => {
        if (s.appInstallEnabled) {
          if (s.appInstallDesc) setDesc(s.appInstallDesc);
          setVisible(true);
        } else {
          onDone();
        }
      })
      .catch(() => onDone())
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return null;

  function dismiss() {
    setVisible(false);
    setTimeout(onDone, 500);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="app-install"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-between"
          style={{
            background:
              "radial-gradient(ellipse at 55% 25%, #b5005e 0%, #78003e 45%, #2e0018 100%)",
          }}
        >
          {/* shimmer */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.06, 0.16, 0.06] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 65%)",
            }}
          />

          {/* top area */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 text-center">
            {/* icon */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative mb-6"
            >
              <div
                className="absolute inset-0 rounded-3xl blur-2xl"
                style={{ background: "rgba(233,30,140,0.55)", transform: "scale(1.3)" }}
              />
              <img
                src={`${import.meta.env.BASE_URL}icon-512.png`}
                alt="Ovelin Mall"
                className="relative w-28 h-28 rounded-3xl shadow-2xl"
              />
            </motion.div>

            {/* title */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div
                className="text-[11px] tracking-[0.25em] font-semibold mb-2"
                style={{ color: "rgba(255,180,220,0.85)" }}
              >
                PREMIUM
              </div>
              <div
                className="font-black mb-1"
                style={{
                  fontSize: "clamp(2.4rem, 9vw, 3rem)",
                  letterSpacing: "0.15em",
                  color: "#ff5db8",
                  textShadow: "0 0 30px rgba(255,93,184,0.9), 0 2px 14px rgba(0,0,0,0.4)",
                  fontFamily: "'Segoe UI', system-ui, sans-serif",
                }}
              >
                OVELIN MALL
              </div>
              <div
                className="text-base font-bold mt-1"
                style={{ color: "rgba(255,255,255,0.85)" }}
              >
                المتجر الرقمي الأول في السودان
              </div>
            </motion.div>

            {/* desc */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-5 text-sm leading-relaxed max-w-xs"
              style={{ color: "rgba(255,200,235,0.9)" }}
            >
              {desc}
            </motion.p>
          </div>

          {/* bottom buttons */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full px-6 pb-12 flex flex-col items-center gap-4"
          >
            <a
              href={`${import.meta.env.BASE_URL}ovelin-mall.apk`}
              download="ovelin-mall.apk"
              className="w-full max-w-xs flex items-center justify-center gap-2.5 py-4 rounded-3xl font-extrabold text-base shadow-2xl active:scale-95 transition"
              style={{
                background: "linear-gradient(135deg, #ff3fa0 0%, #c4005f 100%)",
                color: "#fff",
                boxShadow: "0 12px 40px -8px rgba(255,0,120,0.7)",
              }}
            >
              <Download className="w-5 h-5" />
              تحميل التطبيق
            </a>

            <button
              onClick={dismiss}
              className="flex items-center gap-1 text-sm font-semibold active:scale-95 transition"
              style={{ color: "rgba(255,180,220,0.7)" }}
            >
              متابعة عبر المتصفح
              <ChevronLeft className="w-4 h-4" />
            </button>
          </motion.div>

          {/* pulse dots */}
          <motion.div
            className="absolute bottom-5 flex gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "rgba(255,150,210,0.6)" }}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.22 }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
