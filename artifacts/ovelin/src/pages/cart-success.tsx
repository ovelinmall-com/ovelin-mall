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

import { useState, useMemo } from "react";
import { Link, useRoute } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, Package, ArrowLeft, Copy, Star } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2 + Math.random() * 1.8,
        color: ["#f9a8d4", "#fb7185", "#fbbf24", "#fde68a", "#f472b6", "#e879f9", "#fff"][i % 7],
        size: 5 + Math.random() * 7,
        round: Math.random() > 0.5,
      })),
    [],
  );
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -40, opacity: 1, rotate: 0 }}
          animate={{ y: 900, opacity: [1, 1, 0.6, 0], rotate: 600 }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? "50%" : 2,
          }}
        />
      ))}
    </div>
  );
}

export default function CartSuccess() {
  const [, params] = useRoute("/cart-success/:orderId");
  const orderId = params?.orderId;
  const [copied, setCopied] = useState(false);

  function copyOrderId() {
    if (orderId) navigator.clipboard.writeText(`#${orderId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <AppLayout hideNav hideFooter>
      <Confetti />
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
        {/* Animated ✓ circle with pink glow */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="relative mb-6"
        >
          <motion.div
            animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-[-12px] bg-pink-400/40 blur-2xl rounded-full"
          />
          <div className="relative p-5 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-[0_0_50px_rgba(236,72,153,0.65)]">
            <CheckCircle2 className="w-16 h-16" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-3xl font-black text-pink-900"
        >
          تم استلام طلبك! 🎉
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-2 text-pink-700/80 text-sm leading-relaxed"
        >
          سنبدأ بتنفيذ طلبك خلال دقائق.
          <br />
          ستتلقى إشعاراً عند التسليم.
        </motion.p>

        {/* Order number card with monospace + copy */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, type: "spring" }}
          className="fancy-card mt-6 rounded-3xl p-4 w-full max-w-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-100 text-pink-600">
              <Package className="w-5 h-5" />
            </div>
            <div className="text-right flex-1">
              <div className="text-[11px] text-muted-foreground">رقم الطلب</div>
              <div className="font-mono font-extrabold text-pink-900 text-2xl tracking-widest leading-tight">
                #{orderId}
              </div>
            </div>
            <button
              onClick={copyOrderId}
              className={`p-2.5 rounded-xl transition active:scale-90 ${
                copied
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-pink-100 text-pink-600 hover:bg-pink-200"
              }`}
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Loyalty line */}
          <div className="mt-3 pt-3 border-t border-pink-100 flex items-center justify-center gap-1.5 text-[11px] text-pink-700">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
            <span>ربحت نقاط ولاء بهذا الطلب — تحقق من حسابك!</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-5 flex flex-col gap-2.5 w-full max-w-xs"
        >
          <Link href="/orders">
            <button className="w-full rounded-2xl py-3.5 font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_4px_20px_rgba(236,72,153,0.4)] active:scale-95 transition flex items-center justify-center gap-2">
              تتبع طلبك <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <Link href="/">
            <button className="w-full rounded-2xl py-3.5 font-bold bg-white border-2 border-pink-200 text-pink-700 active:scale-95 transition">
              طلب جديد
            </button>
          </Link>
        </motion.div>
      </div>
    </AppLayout>
  );
}
