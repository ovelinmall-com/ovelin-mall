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

import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { showToast } from "@/components/Toast";

type Prize = { id: number; label: string; type: string; value: string; color: string; icon: string; weight: number };

export default function SpinPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [canSpin, setCanSpin] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [winner, setWinner] = useState<any | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Prize[]>("/api/spin/prizes").then(setPrizes).catch(() => { /* ignore */ });
    if (user) {
      api<{ canSpin: boolean }>("/api/spin/status").then((r) => setCanSpin(r.canSpin)).catch(() => { /* ignore */ });
    }
  }, [user]);

  useEffect(() => {
    if (!user) setLocation("/login");
  }, [user]);

  async function spin() {
    if (!canSpin || spinning || !prizes.length) return;
    setSpinning(true);
    setWinner(null);
    try {
      const res = await api<{ prize: Prize }>("/api/spin", { method: "POST" });
      const idx = prizes.findIndex((p) => p.id === res.prize.id);
      const slice = 360 / prizes.length;
      const target = 360 * 6 + (360 - (idx * slice + slice / 2));
      setAngle(target);
      setTimeout(() => {
        setWinner(res.prize);
        setSpinning(false);
        setCanSpin(false);
        showToast("🎉 ربحت: " + res.prize.label, "success");
      }, 4500);
    } catch (e: any) {
      showToast(e.message || "خطأ", "error");
      setSpinning(false);
    }
  }

  if (!prizes.length) {
    return (
      <div className="p-6 text-center text-pink-600">جاري تحميل عجلة الحظ...</div>
    );
  }

  const slice = 360 / prizes.length;

  return (
    <div className="min-h-[100dvh] pb-20">
      <div className="px-4 py-5 text-center">
        <button onClick={() => setLocation("/")} className="absolute right-4 top-4 text-pink-500 text-sm">← رجوع</button>
        <h1 className="text-2xl font-bold text-pink-700 dark:text-pink-300">🎡 عجلة الحظ اليومية</h1>
        <p className="text-sm text-pink-600/70 mt-1">دورة واحدة كل يوم - جرب حظك!</p>
      </div>

      <div className="relative mx-auto" style={{ width: 320, height: 320 }}>
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 text-3xl">▼</div>
        <div
          ref={wheelRef}
          className="w-full h-full rounded-full shadow-2xl shadow-pink-500/30 border-8 border-pink-300 overflow-hidden relative"
          style={{ transform: `rotate(${angle}deg)`, transition: spinning ? "transform 4.5s cubic-bezier(0.2,0.8,0.2,1)" : "none" }}
        >
          {prizes.map((p, i) => {
            const rotate = i * slice;
            return (
              <div
                key={p.id}
                className="absolute top-0 left-1/2 origin-bottom h-1/2 flex items-start justify-center pt-3 text-white text-xs font-bold"
                style={{
                  width: 0,
                  borderLeft: `${160 * Math.tan((slice * Math.PI) / 360)}px solid transparent`,
                  borderRight: `${160 * Math.tan((slice * Math.PI) / 360)}px solid transparent`,
                  borderBottom: `160px solid ${p.color}`,
                  transform: `translateX(-50%) rotate(${rotate + slice / 2}deg)`,
                  marginLeft: 0,
                }}
              >
                <span style={{ position: "absolute", top: 30, transform: `rotate(0deg)`, width: 80, textAlign: "center", lineHeight: 1.1 }}>
                  {p.label}
                </span>
              </div>
            );
          })}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white shadow-inner flex items-center justify-center text-3xl">🎁</div>
          </div>
        </div>
      </div>

      <div className="text-center mt-8">
        <button
          onClick={spin}
          disabled={!canSpin || spinning}
          className="px-8 py-3 rounded-full bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold shadow-lg shadow-pink-500/40 disabled:opacity-50"
        >
          {spinning ? "تدور..." : !canSpin ? "تم استخدام دورتك اليوم" : "🎰 دوّر العجلة"}
        </button>
      </div>

      {winner && (
        <div className="mt-6 mx-4 p-4 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 text-white text-center shadow-xl">
          <div className="text-4xl mb-2">🎉</div>
          <div className="font-bold text-lg">ربحت: {winner.label}</div>
          <div className="text-sm opacity-90 mt-1">تم إضافة الجائزة لحسابك</div>
        </div>
      )}

      <div className="mx-4 mt-6 p-4 rounded-xl bg-pink-50 dark:bg-zinc-900 text-xs text-pink-700 dark:text-pink-300">
        <div className="font-bold mb-2">📋 الجوائز المتاحة:</div>
        <div className="grid grid-cols-2 gap-2">
          {prizes.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
              <span>{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
