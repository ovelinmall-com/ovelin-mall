import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const API = "/api";

interface PeriodResult {
  label: string;
  marginSdg: number;
  startAt: string | null;
  endAt: string | null;
  orderCount: number;
  profitSdg: number;
}

interface ReferralStats {
  count: number;
  totalEarned: number;
  totalBonus: number;
  totalPaid: number;
}

interface Snapshot {
  periods: PeriodResult[];
  totalOrders: number;
  totalProfit: number;
  currentMarginSdg: number;
  referrals: ReferralStats;
  calculatedAt: string;
}

interface ProfitsResp {
  hasSnapshot: boolean;
  snapshot: Snapshot | null;
  snapshotAt: string | null;
  nextAllowedAt: string;
  remainingMs: number;
  canSnapshot: boolean;
}

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function useCountdown(nextAllowedAt: string | null) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!nextAllowedAt) { setRemaining(0); return; }
    const tick = () => {
      const ms = Math.max(0, new Date(nextAllowedAt).getTime() - Date.now());
      setRemaining(ms);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextAllowedAt]);

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const total = 12 * 60 * 60 * 1000;
  const progress = remaining > 0 ? ((total - remaining) / total) * 100 : 100;

  return { remaining, h, m, s, progress };
}

export default function AdminProfits() {
  const [, setLocation] = useLocation();
  const [data, setData] = useState<ProfitsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapping, setSnapping] = useState(false);
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

  const takeSnapshot = async () => {
    setSnapping(true);
    try {
      const r = await fetch(`${API}/admin/profits/snapshot`, {
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
      setSnapping(false);
    }
  };

  const { remaining, h, m, s, progress } = useCountdown(data?.nextAllowedAt ?? null);
  const canSnap = data?.canSnapshot ?? false;

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

        {/* Loading skeleton */}
        {loading && (
          <div style={{ color: "#ffffff40", textAlign: "center", padding: "60px 0", fontSize: 14 }}>
            ⏳ جاري التحميل…
          </div>
        )}

        {!loading && data && (
          <>
            {/* 12-hour gate card */}
            <div
              style={{
                background: "linear-gradient(135deg,#1a1830,#0f1a10)",
                border: canSnap ? "1px solid #22c55e55" : "1px solid #f4c84230",
                borderRadius: 20,
                padding: 20,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* glow */}
              <div
                style={{
                  position: "absolute",
                  top: -60,
                  right: -60,
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  background: canSnap ? "radial-gradient(circle,#22c55e22,transparent)" : "radial-gradient(circle,#f4c84218,transparent)",
                  pointerEvents: "none",
                }}
              />

              {canSnap ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 6 }}>✅</div>
                  <div style={{ color: "#86efac", fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                    جاهز لعرض الأرباح
                  </div>
                  <button
                    onClick={takeSnapshot}
                    disabled={snapping}
                    style={{
                      background: snapping
                        ? "#1a2e1a"
                        : "linear-gradient(135deg,#16a34a,#15803d)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 14,
                      padding: "12px 32px",
                      fontSize: 15,
                      fontWeight: 800,
                      cursor: snapping ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      opacity: snapping ? 0.6 : 1,
                    }}
                  >
                    {snapping ? "⏳ جاري الحساب…" : "📊 احسب أرباحي الآن"}
                  </button>
                </div>
              ) : (
                <>
                  <div
                    style={{ color: "#f4c842", fontSize: 13, fontWeight: 700, marginBottom: 12 }}
                  >
                    ⏳ الوقت المتبقي حتى التحديث التالي
                  </div>

                  {/* Timer */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
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
                        <div
                          style={{
                            fontSize: 26,
                            fontWeight: 900,
                            color: "#f4c842",
                            lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {val}
                        </div>
                        <div style={{ fontSize: 10, color: "#ffffff50", marginTop: 3 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div
                    style={{
                      height: 6,
                      borderRadius: 99,
                      background: "#ffffff10",
                      overflow: "hidden",
                    }}
                  >
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
                    يُتاح التحديث مرة واحدة كل 12 ساعة
                  </div>
                </>
              )}
            </div>

            {/* Total profit card */}
            {data.hasSnapshot && data.snapshot && (
              <>
                <div
                  style={{
                    background: "linear-gradient(135deg,#1c1400,#291d00)",
                    border: "1px solid #f4c84250",
                    borderRadius: 20,
                    padding: 24,
                    textAlign: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* shimmer glow */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "radial-gradient(ellipse at 50% 0%,#f4c84212 0%,transparent 70%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div style={{ fontSize: 12, color: "#f4c84280", fontWeight: 600, marginBottom: 6 }}>
                    إجمالي الأرباح
                  </div>
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 900,
                      color: "#f4c842",
                      letterSpacing: "-0.5px",
                      lineHeight: 1,
                    }}
                  >
                    {fmt(data.snapshot.totalProfit)}
                  </div>
                  <div style={{ fontSize: 16, color: "#f4c84290", fontWeight: 700, marginTop: 4 }}>
                    ج.س
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 24,
                      marginTop: 16,
                      borderTop: "1px solid #f4c84215",
                      paddingTop: 14,
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                        {fmt(data.snapshot.totalOrders)}
                      </div>
                      <div style={{ fontSize: 11, color: "#ffffff50", marginTop: 2 }}>طلب منفّذ</div>
                    </div>
                    <div style={{ width: 1, background: "#f4c84215" }} />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                        {fmt(data.snapshot.currentMarginSdg)}
                      </div>
                      <div style={{ fontSize: 11, color: "#ffffff50", marginTop: 2 }}>هامش الربح الحالي (ج.س)</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 10, color: "#ffffff25", marginTop: 12 }}>
                    آخر حساب: {new Date(data.snapshot.calculatedAt).toLocaleString("ar-SD")}
                  </div>
                </div>

                {/* Referral card */}
                {data.snapshot.referrals && (
                  <div
                    style={{
                      background: "linear-gradient(135deg,#0d1a1f,#0a1f1a)",
                      border: "1px solid #22d3ee40",
                      borderRadius: 20,
                      padding: 18,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: -50,
                        left: -50,
                        width: 140,
                        height: 140,
                        borderRadius: "50%",
                        background: "radial-gradient(circle,#22d3ee14,transparent)",
                        pointerEvents: "none",
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: 20 }}>🤝</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#22d3ee" }}>إحصائيات الإحالات</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { label: "عدد الإحالات", val: fmt(data.snapshot.referrals.count), unit: "إحالة", color: "#22d3ee" },
                        { label: "عمولات مدفوعة", val: fmt(data.snapshot.referrals.totalEarned), unit: "ج.س", color: "#a78bfa" },
                        { label: "بونص تسجيل", val: fmt(data.snapshot.referrals.totalBonus), unit: "ج.س", color: "#34d399" },
                      ].map(({ label, val, unit, color }) => (
                        <div
                          key={label}
                          style={{
                            flex: 1,
                            background: "#ffffff06",
                            borderRadius: 12,
                            padding: "10px 8px",
                            textAlign: "center",
                          }}
                        >
                          <div style={{ fontSize: 18, fontWeight: 900, color }}>{val}</div>
                          <div style={{ fontSize: 9, color: "#ffffff40", marginTop: 2 }}>{unit}</div>
                          <div style={{ fontSize: 9, color: "#ffffff30", marginTop: 3 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: "1px solid #22d3ee15",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "#ffffff40" }}>إجمالي ما صُرف للإحالات</span>
                      <span style={{ fontSize: 15, fontWeight: 900, color: "#22d3ee" }}>
                        {fmt(data.snapshot.referrals.totalPaid)} <span style={{ fontSize: 11 }}>ج.س</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Periods breakdown */}
                {data.snapshot.periods.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#ffffff50",
                        marginBottom: 10,
                        paddingRight: 4,
                      }}
                    >
                      تفاصيل الفترات
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {data.snapshot.periods.map((p, i) => (
                        <div
                          key={i}
                          onClick={() => setExpanded(expanded === i ? null : i)}
                          style={{
                            background: "#13111e",
                            border: "1px solid #ffffff10",
                            borderRadius: 16,
                            padding: "14px 16px",
                            cursor: "pointer",
                            transition: "all 0.15s",
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
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#fff",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {p.label}
                              </div>
                              <div style={{ fontSize: 11, color: "#ffffff40", marginTop: 1 }}>
                                {fmt(p.orderCount)} طلب × {fmt(p.marginSdg)},00 ج.س
                              </div>
                            </div>
                            <div style={{ textAlign: "left", flexShrink: 0 }}>
                              <div
                                style={{
                                  fontSize: 16,
                                  fontWeight: 900,
                                  color: "#f4c842",
                                }}
                              >
                                {fmt(p.profitSdg)}
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
                              <Row label="عدد الطلبات المنفّذة" val={`${fmt(p.orderCount)} طلب`} />
                              <Row label="هامش الربح للفترة" val={`${fmt(p.marginSdg)},00 ج.س`} />
                              <Row label="إجمالي ربح الفترة" val={`${fmt(p.profitSdg)} ج.س`} gold />
                              {p.startAt && (
                                <Row
                                  label="من"
                                  val={new Date(p.startAt).toLocaleDateString("ar-SD")}
                                />
                              )}
                              {p.endAt && (
                                <Row
                                  label="حتى"
                                  val={new Date(p.endAt).toLocaleDateString("ar-SD")}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* No snapshot yet */}
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
                  لم يتم حساب الأرباح بعد.
                  <br />
                  اضغط «احسب أرباحي الآن» للبدء.
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
}: {
  label: string;
  val: string;
  gold?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "#ffffff40" }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: gold ? "#f4c842" : "#fff",
        }}
      >
        {val}
      </span>
    </div>
  );
}
