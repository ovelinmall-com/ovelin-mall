// CallVerify — نظام التحقق بالاتصال الهاتفي
// يتصل المستخدم بالرقم الظاهر له ويتحقق تلقائياً

const CALLVERIFY_BASE = "https://skandar5288-callverify-backend.hf.space/api";
const CALLVERIFY_API_KEY = "45ad85bf-b683-4188-9aed-11424733600b";

export interface CallSession {
  sessionId: string;
  callNumber: string;
  expiresIn: number;
}

export interface CallSessionStatus {
  verified: boolean;
  expired: boolean;
  phone: string | null;
  remainingSeconds: number;
}

/** يفتح جلسة تحقق جديدة للرقم المعطى — يعيد المحاولة حتى 3 مرات */
export async function startCallSession(phone: string): Promise<CallSession> {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS  = 18_000; // 18 ثانية لكل محاولة (HuggingFace قد يكون بارداً)

  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${CALLVERIFY_BASE}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CALLVERIFY_API_KEY}`,
        },
        body: JSON.stringify({ phone }),
        signal: ac.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail ?? `CallVerify error ${res.status}`);
      }

      return res.json() as Promise<CallSession>;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        // انتظر قبل إعادة المحاولة: 1.5 ثانية، ثم 3 ثوانٍ
        await new Promise<void>((r) => setTimeout(r, attempt * 1500));
      }
    }
  }

  throw lastErr;
}

/** يستعلم عن حالة الجلسة — يُعيد الحالة فوراً (النظام يعمل بـ long-poll داخلياً) */
export async function pollCallSession(sessionId: string, signal?: AbortSignal): Promise<CallSessionStatus> {
  const res = await fetch(`${CALLVERIFY_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      "Authorization": `Bearer ${CALLVERIFY_API_KEY}`,
    },
    signal,
  });

  if (res.status === 404) {
    return { verified: false, expired: true, phone: null, remainingSeconds: 0 };
  }

  if (!res.ok) {
    throw new Error(`CallVerify poll error ${res.status}`);
  }

  return res.json() as Promise<CallSessionStatus>;
}
