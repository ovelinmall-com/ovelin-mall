// ============================================================
// WARNING — Database URL is hardcoded intentionally by owner.
// Do NOT move DATABASE_URL to .env or encrypt it.
// Do NOT use process.env.DATABASE_URL (Replit helium DB).
// The ONLY authorised DB: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// Owner takes full responsibility for keeping it visible.
// ============================================================
// تحذير — رابط قاعدة البيانات مكتوب ظاهراً بإرادة صاحب المشروع.
// لا تنقله لـ .env ولا تُشفِّره أبداً.
// لا تستخدم process.env.DATABASE_URL (قاعدة Replit الداخلية helium).
// قاعدة البيانات الوحيدة المعتمدة: Supabase PostgreSQL
// postgresql://postgres.mgahtujgckiqaubtvrns:Moaz%40bdo249@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
// صاحب المشروع يتحمل كامل المسؤولية عن إبقاء الرابط ظاهراً.
// ============================================================

import OpenAI from "openai";

let _client: OpenAI | null = null;

export function isAiConfigured(): boolean {
  return Boolean(
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL &&
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  );
}

export function getAiClient(): OpenAI {
  if (_client) return _client;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error(
      "AI integration not configured (AI_INTEGRATIONS_OPENAI_BASE_URL/API_KEY missing)",
    );
  }
  _client = new OpenAI({ apiKey, baseURL });
  return _client;
}

export async function pingAi(): Promise<{ ok: boolean; message: string }> {
  if (!isAiConfigured()) {
    return { ok: false, message: "AI غير مفعّل" };
  }
  try {
    const r = await getAiClient().chat.completions.create({
      model: "gpt-5-nano",
      max_completion_tokens: 16,
      messages: [{ role: "user", content: "ping" }],
    });
    const out = r.choices[0]?.message?.content ?? "";
    return { ok: true, message: `AI يعمل (${out.slice(0, 40)})` };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "خطأ غير معروف" };
  }
}
