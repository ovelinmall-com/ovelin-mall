import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const API = "/api";

interface PeriodResult {
  label: string;
  marginSdg: number;
  orderCount: number;
  quantityTotal: number;
  profitSdg: number;
}

interface Snapshot {
  from: string;
  to: string;
  periods: PeriodResult[];
  totalOrders: number;
  grossProfit: number;
  referralCost: number;
  referralCount: number;
  netProfit: number;
  isLoss: boolean;
  currentMarginSdg: number;
  calculatedAt: string;
}

interface ProfitsResp {
  hasSnapshot: boolean;
  snapshot: Snapshot | null;
  cycleStartAt: string;
  cycleEndAt: string;
  remainingMs: number;
  canReveal: boolean;
}

function fmt(n: number | null | undefined, decimals = 0) {
  if (n == null || isNaN(n)) return "0";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function useCountdown(cycleEndAt: string | null) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!cycleEndAt) { setRemaining(0); return; }
    const tick = () => {
      const ms = Math.max(0, new Date(cycleEndAt).getTime() - Date.now());
      setRemaining(ms);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cycleEndAt]);

  const total = 24 * 60 * 60 * 1000;
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const progress = remaining > 0 ? ((total - remaining) / total) * 100 : 100;

  return { remaining, h, m, s, progress };
}

export default function AdminProfits() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<ProfitsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch(`${API}/admin/profits`, { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      const d: ProfitsResp = await r.json();
      setData(d);
      setError("");
    } catch (e: any) {
      setError(e?.message ?? "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    pollRef.current = setInterval(fetch_, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetch_]);

  const revealProfits = async () => {
    setRevealing(true);
    try {
      const r = await fetch(`${API}/admin/profits/reveal`, {
        method: "POST",
        credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "فشل");
      await fetch_();
      setError("");
    } catch (e: any) {
      setError(e?.message ?? "فشل");
    } finally {
      setRevealing(false);
    }
  };

  const clearSnapshot = async () => {
    setClearing(true);
    try {
      const r = await fetch(`${API}/admin/profits/clear`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error("فشل المسح");
      await fetch_();
      setError("");
    } catch (e: any) {
      setError(e?.message ?? "فشل");
    } finally {
      setClearing(false);
    }
  };

  const { h, m, s, progress } = useCountdown(data?.cycleEndAt ?? null);
  const canReveal = data?.canReveal ?? false;
  const snap = data?.snapshot ?? null;

  return (
    <div
      className="min-h-screen pb-28"
      style={{
        background: "linear-gradient(145deg,#0b0b12 0%,#12101c 60%,#0f1a10 100%)",
        fontFamily: "Cairo, sans-serif",
        direction: "rtl",
      }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
        style={{ background: "rgba(11,11,18,0.85)", backdropFilter: "blur(14px)" }}
      >
        <button
          onClick={() => setLocation("/admin")}
          className="text-white/60 hover:text-white transition-colors"
          style={{ fontSize: 20 }}
        >
          ←
        </button>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#f4c842" }}>💰 أرباحي</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={fetch_}
          className="text-white/40 hover:text-white/80 transition-colors text-xs"
        >
          🔄
        </button>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 max-w-xl mx-auto">

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#2a0e0e",
              border: "1px solid #7f1d1d",
              color: "#fca5a5",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div style={{ color: "#ffffff40", textAlign: "center", padding: "60px 0", fontSize: 14 }}>
            ⏳ جاري التحميل…
          </div>
        )}

        {!loading && data && (
          <>
            {/* بطاقة عداد الدورة */}
            <div
              style={{
                background: "linear-gradient(135deg,#1a1830,#0f1a10)",
                border: canReveal ? "1px solid #22c55e55" : "1px solid #f4c84230",
                borderRadius: 20,
                padding: 20,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -60,
                  right: -60,
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  background: canReveal
                    ? "radial-gradient(circle,#22c55e22,transparent)"
                    : "radial-gradient(circle,#f4c84218,transparent)",
                  pointerEvents: "none",
                }}
              />

              {canReveal ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 6 }}>✅</div>
                  <div style={{ color: "#86efac", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                    الدورة انتهت — جاهز لكشف الأرباح
                  </div>
                  <div style={{ color: "#ffffff40", fontSize: 11, marginBottom: 14 }}>
                    الدورة الجديدة تبدأ فور الضغط
                  </div>
                  <button
                    onClick={revealProfits}
                    disabled={revealing}
                    style={{
                      background: revealing ? "#1a2e1a" : "linear-gradient(135deg,#16a34a,#15803d)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 14,
                      padding: "12px 32px",
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: revealing ? "not-allowed" : "pointer",
                      opacity: revealing ? 0.6 : 1,
                    }}
                  >
                    {revealing ? "⏳ جاري الحساب…" : "📊 اكشف أرباحي"}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ color: "#f4c842", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
                    ⏳ الوقت المتبقي حتى كشف الأرباح
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 16 }}>
                    {[
                      { val: String(h).padStart(2, "0"), lbl: "ساعة" },
                      { val: String(m).padStart(2, "0"), lbl: "دقيقة" },
                      { val: String(s).padStart(2, "0"), lbl: "ثانية" },
                    ].map(({ val, lbl }) => (
                      <div
                        key={lbl}
                        style={{
                          background: "#1a1830",
                          border: "1px solid #f4c84230",
                          borderRadius: 12,
                          padding: "10px 16px",
                          textAlign: "center",
                          minWidth: 60,
                        }}
                      >
                        <div style={{ fontSize: 26, fontWeight: 900, color: "#f4c842", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                          {val}
                        </div>
                        <div style={{ fontSize: 10, color: "#ffffff50", marginTop: 3 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: "#ffffff10", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${progress}%`,
                        borderRadius: 99,
                        background: "linear-gradient(90deg,#f4c842,#f97316)",
                        transition: "width 1s linear",
                      }}
                    />
                  </div>
                  <div style={{ color: "#ffffff30", fontSize: 11, marginTop: 8, textAlign: "center" }}>
                    يُكشف الربح كل 24 ساعة — الدورة الجديدة تبدأ تلقائياً بعد انتهاء القديمة
                  </div>
                </>
              )}
            </div>

            {/* بطاقة النتائج */}
            {data.hasSnapshot && snap && (
              <>
                {/* فترة الحساب */}
                <div style={{ textAlign: "center", color: "#ffffff30", fontSize: 11 }}>
                  📅 من {new Date(snap.from).toLocaleString("ar-SD")} → {new Date(snap.to).toLocaleString("ar-SD")}
                </div>

                {/* بطاقة الربح الإجمالي والصافي */}
                <div
                  style={{
                    background: snap.isLoss
                      ? "linear-gradient(135deg,#1a0a0a,#2a0e0e)"
                      : "linear-gradient(135deg,#1c1400,#291d00)",
                    border: snap.isLoss ? "1px solid #ef444450" : "1px solid #f4c84250",
                    borderRadius: 20,
                    padding: 24,
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: snap.isLoss
                        ? "radial-gradient(ellipse at 50% 0%,#ef444412 0%,transparent 70%)"
                        : "radial-gradient(ellipse at 50% 0%,#f4c84212 0%,transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />

                  {/* الربح الإجمالي (قبل الإحالات) */}
                  <div style={{ fontSize: 11, color: "#ffffff40", marginBottom: 4 }}>الربح الإجمالي من الطلبات</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#f4c842", lineHeight: 1 }}>
                    {fmt(snap.grossProfit, 2)}
                    <span style={{ fontSize: 14, color: "#f4c84280", marginRight: 4 }}>ج.س</span>
                  </div>

                  {/* خصم الإحالات */}
                  {snap.referralCost > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: 12,
                        background: "#ffffff08",
                        borderRadius: 10,
                        padding: "8px 14px",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "#ffffff50" }}>
                        🤝 خصم إحالات ({snap.referralCount} إحالة)
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#f87171" }}>
                        − {fmt(snap.referralCost, 2)} ج.س
                      </span>
                    </div>
                  )}

                  {/* خط فاصل */}
                  <div
                    style={{
                      height: 1,
                      background: snap.isLoss ? "#ef444420" : "#f4c84220",
                      margin: "14px 0",
                    }}
                  />

                  {/* الربح الصافي */}
                  <div style={{ fontSize: 11, color: snap.isLoss ? "#fca5a5" : "#86efac", fontWeight: 700, marginBottom: 4 }}>
                    {snap.isLoss ? "⚠️ صافي الخسارة" : "✅ صافي الربح"}
                  </div>
                  <div
                    style={{
                      fontSize: 44,
                      fontWeight: 900,
                      color: snap.isLoss ? "#ef4444" : "#22c55e",
                      letterSpacing: "-0.5px",
                      lineHeight: 1,
                    }}
                  >
                    {snap.isLoss ? "" : "+"}{fmt(snap.netProfit, 2)}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: snap.isLoss ? "#ef444490" : "#22c55e90" }}>
                    ج.س
                  </div>

                  {/* عدد الطلبات والهامش */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 24,
                      marginTop: 16,
                      borderTop: snap.isLoss ? "1px solid #ef444415" : "1px solid #f4c84215",
                      paddingTop: 14,
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{fmt(snap.totalOrders)}</div>
                      <div style={{ fontSize: 11, color: "#ffffff50", marginTop: 2 }}>طلب منفّذ</div>
                    </div>
                    <div style={{ width: 1, background: "#ffffff10" }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{fmt(snap.currentMarginSdg)}</div>
                      <div style={{ fontSize: 11, color: "#ffffff50", marginTop: 2 }}>هامش / 1000 ج.س</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 10, color: "#ffffff25", marginTop: 12 }}>
                    آخر حساب: {new Date(snap.calculatedAt).toLocaleString("ar-SD")}
                  </div>
                </div>

                {/* بطاقة الخسارة التفصيلية */}
                {snap.isLoss && (
                  <div
                    style={{
                      background: "#1a0a0a",
                      border: "1px solid #ef444430",
                      borderRadius: 16,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#ef4444", marginBottom: 10 }}>
                      🔴 تفاصيل الخسارة
                    </div>
                    <Row label="إجمالي الربح من الطلبات" val={`${fmt(snap.grossProfit, 2)} ج.س`} />
                    <Row label="تكاليف الإحالات المدفوعة" val={`${fmt(snap.referralCost, 2)} ج.س`} red />
                    <Row
                      label="سبب الخسارة"
                      val={`تكاليف الإحالات (${fmt(snap.referralCost, 2)}) أكبر من الربح (${fmt(snap.grossProfit, 2)})`}
                      small
                    />
                    <Row label="صافي الخسارة" val={`${fmt(Math.abs(snap.netProfit), 2)} ج.س`} red />
                  </div>
                )}

                {/* تفاصيل الفترات */}
                {snap.periods.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#ffffff50", marginBottom: 10, paddingRight: 4 }}>
                      تفاصيل الفترات
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {snap.periods.map((p, i) => (
                        <div
                          key={i}
                          onClick={() => setExpanded(expanded === i ? null : i)}
                          style={{
                            background: "#13111e",
                            border: "1px solid #ffffff10",
                            borderRadius: 16,
                            padding: "14px 16px",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: "linear-gradient(135deg,#1c1400,#291d00)",
                                border: "1px solid #f4c84230",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 16,
                                flexShrink: 0,
                              }}
                            >
                              📦
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.label}
                              </div>
                              <div style={{ fontSize: 11, color: "#ffffff40", marginTop: 1 }}>
                                {fmt(p.orderCount)} طلب · {fmt(p.quantityTotal)} وحدة
                              </div>
                            </div>
                            <div style={{ textAlign: "left", flexShrink: 0 }}>
                              <div style={{ fontSize: 16, fontWeight: 900, color: "#f4c842" }}>
                                {fmt(p.profitSdg, 2)}
                              </div>
                              <div style={{ fontSize: 10, color: "#f4c84260" }}>ج.س</div>
                            </div>
                            <div
                              style={{
                                color: "#ffffff30",
                                fontSize: 12,
                                transition: "transform 0.2s",
                                transform: expanded === i ? "rotate(90deg)" : "rotate(0deg)",
                                flexShrink: 0,
                              }}
                            >
                              ◀
                            </div>
                          </div>

                          {expanded === i && (
                            <div
                              style={{
                                marginTop: 12,
                                paddingTop: 12,
                                borderTop: "1px solid #ffffff08",
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              <Row label="عدد الطلبات" val={`${fmt(p.orderCount)} طلب`} />
                              <Row label="إجمالي الوحدات" val={`${fmt(p.quantityTotal)} وحدة`} />
                              <Row label="الهامش لكل 1000" val={`${fmt(p.marginSdg, 2)} ج.س`} />
                              <Row
                                label="حساب الربح"
                                val={`(${fmt(p.marginSdg, 2)} ÷ 1000) × ${fmt(p.quantityTotal)}`}
                                small
                              />
                              <Row label="إجمالي ربح الفترة" val={`${fmt(p.profitSdg, 2)} ج.س`} gold />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* زر المسح */}
                <div
                  style={{
                    background: "#13111e",
                    border: "1px solid #ffffff10",
                    borderRadius: 16,
                    padding: 16,
                    textAlign: "center",
                  }}
                >
                  <div style={{ color: "#ffffff40", fontSize: 12, marginBottom: 10 }}>
                    بعد الاطلاع على النتائج، احذف البيانات القديمة لتجنب الخلط
                  </div>
                  <button
                    onClick={clearSnapshot}
                    disabled={clearing}
                    style={{
                      background: clearing ? "#1a1830" : "#1f1a2e",
                      border: "1px solid #7c3aed40",
                      color: clearing ? "#ffffff40" : "#a78bfa",
                      borderRadius: 12,
                      padding: "10px 24px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: clearing ? "not-allowed" : "pointer",
                    }}
                  >
                    {clearing ? "⏳ جاري المسح…" : "🗑️ مسح البيانات القديمة"}
                  </button>
                </div>
              </>
            )}

            {/* لا يوجد snapshot بعد */}
            {!data.hasSnapshot && (
              <div
                style={{
                  background: "#13111e",
                  border: "1px solid #ffffff08",
                  borderRadius: 20,
                  padding: 32,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
                <div style={{ color: "#ffffff60", fontSize: 14 }}>
                  {canReveal
                    ? "الدورة انتهت — اضغط «اكشف أرباحي» لعرض النتائج"
                    : "الدورة جارية — انتظر انتهاء العداد لكشف الأرباح"}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  val,
  gold,
  red,
  small,
}: {
  label: string;
  val: string;
  gold?: boolean;
  red?: boolean;
  small?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
      <span style={{ fontSize: 12, color: "#ffffff40", flexShrink: 0 }}>{label}</span>
      <span
        style={{
          fontSize: small ? 11 : 13,
          fontWeight: 700,
          color: gold ? "#f4c842" : red ? "#ef4444" : "#fff",
          textAlign: "left",
          wordBreak: "break-word",
        }}
      >
        {val}
      </span>
    </div>
  );
}
