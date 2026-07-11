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

/**
 * يفتح جلسة تحقق جديدة للرقم المعطى.
 * يعيد المحاولة تلقائياً ٣ مرات في حال كانت خدمة HuggingFace نائمة.
 */
export async function startCallSession(phone: string): Promise<CallSession> {
  const MAX_RETRIES = 3;
  let lastError: Error = new Error("خدمة التحقق غير متاحة");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 22_000);

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

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { detail?: string };
        throw new Error(err.detail ?? `CallVerify error ${res.status}`);
      }

      return await res.json() as CallSession;
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error(String(err));

      if (e.name === "AbortError") {
        lastError = new Error("خدمة التحقق بطيئة الاستجابة");
      } else {
        lastError = e;
      }

      // لا تعيد المحاولة إن كان الخطأ من الـ server (4xx)
      if (e.message.includes("CallVerify error 4")) break;

      if (attempt < MAX_RETRIES) {
        // انتظر قبل المحاولة التالية (2s, 4s)
        await new Promise<void>((r) => setTimeout(r, 2_000 * attempt));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

/** يستعلم عن حالة الجلسة */
export async function pollCallSession(sessionId: string, signal?: AbortSignal): Promise<CallSessionStatus> {
  const res = await fetch(`${CALLVERIFY_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { "Authorization": `Bearer ${CALLVERIFY_API_KEY}` },
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
