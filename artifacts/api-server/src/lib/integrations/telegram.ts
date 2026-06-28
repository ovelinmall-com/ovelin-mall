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

let _lastError: string | null = null;
let _lastSentAt: number | null = null;

export function telegramConfig() {
  return {
    token: process.env.TELEGRAM_BOT_TOKEN ?? "",
    chatId: process.env.TELEGRAM_CHANNEL_ID ?? "",
  };
}

export function isTelegramConfigured(): boolean {
  const c = telegramConfig();
  return Boolean(c.token && c.chatId);
}

export async function sendTelegramMessage(
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isTelegramConfigured()) {
    return { ok: false, error: "تليجرام غير مفعّل" };
  }
  const c = telegramConfig();
  try {
    const r = await fetch(
      `https://api.telegram.org/bot${c.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: c.chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    const data = (await r.json()) as { ok?: boolean; description?: string };
    if (!r.ok || !data.ok) {
      _lastError = data.description ?? `HTTP ${r.status}`;
      return { ok: false, error: _lastError ?? undefined };
    }
    _lastError = null;
    _lastSentAt = Date.now();
    return { ok: true };
  } catch (e: any) {
    _lastError = e?.message ?? String(e);
    return { ok: false, error: _lastError ?? undefined };
  }
}

export async function pingTelegram(): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isTelegramConfigured()) {
    return { ok: false, message: "تليجرام غير مفعّل" };
  }
  const c = telegramConfig();
  try {
    const r = await fetch(`https://api.telegram.org/bot${c.token}/getMe`);
    const data = (await r.json()) as {
      ok?: boolean;
      result?: { username?: string };
      description?: string;
    };
    if (!r.ok || !data.ok) {
      return { ok: false, message: data.description ?? `HTTP ${r.status}` };
    }
    return {
      ok: true,
      message: `متصل ببوت @${data.result?.username ?? "?"}`,
    };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "فشل الاتصال" };
  }
}

export function getLastTelegramError(): string | null {
  return _lastError;
}

export function getLastTelegramSentAt(): number | null {
  return _lastSentAt;
}
