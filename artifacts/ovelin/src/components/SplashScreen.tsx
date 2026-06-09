import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const lines: { text: string; color: "pink" | "white" }[] = [
  { text: "أهلاً بك في", color: "white" },
  { text: "OVELIN MALL", color: "pink" },
  { text: "✦ شحن فوري ٢٤/٧ ✦", color: "white" },
  { text: "أسعار لا تُقاوم", color: "pink" },
  { text: "خدمتك أولويتنا", color: "white" },
];

const WORD_DELAY = 0.38;
const HOLD_MS = 900;

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const total = lines.length * WORD_DELAY * 1000 + HOLD_MS + 600;
    const t = setTimeout(() => setVisible(false), total);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(onDone, 700);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [visible, onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.65, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background:
              "radial-gradient(ellipse at 60% 30%, #c4026b 0%, #8b0045 45%, #3d001e 100%)",
          }}
        >
          {/* shimmer overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.08, 0.18, 0.08] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)",
            }}
          />

          {/* icon */}
          <motion.img
            src="/icon-512.png"
            alt="Ovelin"
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
            className="w-24 h-24 rounded-3xl shadow-2xl mb-8"
            style={{ boxShadow: "0 0 48px 8px rgba(233,30,140,0.55)" }}
          />

          {/* lines */}
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            {lines.map((line, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  delay: 0.3 + i * WORD_DELAY,
                  duration: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  color: line.color === "pink" ? "#ff5db8" : "#ffffff",
                  fontWeight: line.text === "OVELIN MALL" ? 900 : 700,
                  fontSize:
                    line.text === "OVELIN MALL"
                      ? "clamp(2.6rem, 10vw, 3.4rem)"
                      : "clamp(1.05rem, 4.5vw, 1.3rem)",
                  letterSpacing:
                    line.text === "OVELIN MALL" ? "0.18em" : "0.06em",
                  textShadow:
                    line.color === "pink"
                      ? "0 0 24px rgba(255,93,184,0.9), 0 2px 12px rgba(0,0,0,0.4)"
                      : "0 0 18px rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.35)",
                  lineHeight: 1.15,
                  fontFamily:
                    line.text === "OVELIN MALL"
                      ? "'Segoe UI', 'SF Pro Display', system-ui, sans-serif"
                      : "inherit",
                }}
              >
                {line.text}
              </motion.span>
            ))}
          </div>

          {/* bottom pulse dots */}
          <motion.div
            className="absolute bottom-12 flex gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: lines.length * WORD_DELAY + 0.3, duration: 0.4 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-pink-300"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  delay: i * 0.22,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
